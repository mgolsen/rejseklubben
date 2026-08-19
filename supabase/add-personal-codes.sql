-- Rejseklubben: bind each participant to one browser using a personal code.
-- Prerequisite: supabase/no-login-setup.sql has already been run.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- It can be rerun later to rotate all codes and clear all phone bindings.
-- The final result contains the generated personal codes. Save them privately.

begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.players
  add column if not exists claim_code_hash text,
  add column if not exists claimed_user_id uuid,
  add column if not exists claimed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_claimed_user_fkey'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_claimed_user_fkey
      foreign key (claimed_user_id)
      references auth.users (id)
      on delete set null;
  end if;
end
$$;

create unique index if not exists players_one_device_per_player_idx
  on public.players (claimed_user_id)
  where claimed_user_id is not null;

create table if not exists public.player_claim_attempts (
  device_user_id uuid primary key references auth.users (id) on delete cascade,
  attempts smallint not null default 0,
  window_started timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.player_claim_attempts enable row level security;

-- Existing table-level SELECT would expose newly added hash/binding columns.
-- Replace it with safe, explicit column access for the name picker.
revoke select on table public.players from anon, authenticated;
grant select (id, display_name, is_active, created_at)
  on table public.players to anon, authenticated;

-- Resolve the participant bound to the current browser session.
create or replace function public.get_claimed_player()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.players as p
  where p.claimed_user_id = (select auth.uid())
    and p.is_active
  limit 1;
$$;

-- Claim a participant once. Invalid codes are limited to five attempts per
-- 15-minute window for each anonymous browser session.
create or replace function public.claim_player(
  p_player_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_player_id uuid;
  existing_player_name text;
  target_name text;
  target_hash text;
  target_claimed_user uuid;
  attempt_count smallint;
  blocked_until_value timestamptz;
begin
  if caller_id is null then
    raise exception 'Telefonen har ingen gyldig session. Genindlæs siden.';
  end if;

  select p.id, p.display_name
  into existing_player_id, existing_player_name
  from public.players as p
  where p.claimed_user_id = caller_id
    and p.is_active
  limit 1;

  if existing_player_id is not null then
    if existing_player_id = p_player_id then
      return jsonb_build_object(
        'ok', true,
        'player', jsonb_build_object(
          'id', existing_player_id,
          'display_name', existing_player_name
        )
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'error', 'device_already_bound',
      'message', 'Denne telefon er allerede bundet til ' || existing_player_name || '.'
    );
  end if;

  select p.display_name, p.claim_code_hash, p.claimed_user_id
  into target_name, target_hash, target_claimed_user
  from public.players as p
  where p.id = p_player_id
    and p.is_active
  for update;

  if target_name is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'player_not_found',
      'message', 'Deltageren findes ikke.'
    );
  end if;

  if target_claimed_user is not null and target_claimed_user <> caller_id then
    return jsonb_build_object(
      'ok', false,
      'error', 'player_already_claimed',
      'message', target_name || ' er allerede knyttet til en anden telefon. Kontakt en arrangør ved telefonskift.'
    );
  end if;

  select a.attempts, a.blocked_until
  into attempt_count, blocked_until_value
  from public.player_claim_attempts as a
  where a.device_user_id = caller_id
  for update;

  if blocked_until_value is not null and blocked_until_value > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'temporarily_blocked',
      'message', 'For mange forkerte forsøg. Vent 15 minutter og prøv igen.'
    );
  end if;

  if target_hash is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'code_not_configured',
      'message', 'Der er endnu ikke lavet en personlig kode til denne deltager.'
    );
  end if;

  if p_code is null or trim(p_code) !~ '^[0-9]{2}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_code_format',
      'message', 'Koden skal bestå af to cifre.'
    );
  end if;

  if extensions.crypt(trim(p_code), target_hash) <> target_hash then
    insert into public.player_claim_attempts as a (
      device_user_id,
      attempts,
      window_started,
      blocked_until
    )
    values (
      caller_id,
      1,
      now(),
      null
    )
    on conflict (device_user_id) do update
    set
      attempts = case
        when a.window_started < now() - interval '15 minutes' then 1
        else a.attempts + 1
      end,
      window_started = case
        when a.window_started < now() - interval '15 minutes' then now()
        else a.window_started
      end,
      blocked_until = case
        when (
          case
            when a.window_started < now() - interval '15 minutes' then 1
            else a.attempts + 1
          end
        ) >= 5 then now() + interval '15 minutes'
        else null
      end
    returning attempts, blocked_until
    into attempt_count, blocked_until_value;

    if blocked_until_value is not null then
      return jsonb_build_object(
        'ok', false,
        'error', 'temporarily_blocked',
        'message', 'Forkert kode. Telefonen er nu låst i 15 minutter.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_code',
      'message', 'Forkert personlig kode. Forsøg tilbage: ' || (5 - attempt_count)::text || '.'
    );
  end if;

  update public.players
  set
    claimed_user_id = caller_id,
    claimed_at = now()
  where id = p_player_id;

  delete from public.player_claim_attempts
  where device_user_id = caller_id;

  return jsonb_build_object(
    'ok', true,
    'player', jsonb_build_object(
      'id', p_player_id,
      'display_name', target_name
    )
  );
end;
$$;

create or replace function public.current_claimed_player_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.players as p
  where p.claimed_user_id = (select auth.uid())
    and p.is_active
  limit 1;
$$;

create or replace function public.device_submit_streg(
  p_target_id uuid,
  p_description text,
  p_amount smallint
)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_claimed_player_id();
  cleaned_description text := trim(p_description);
  created_streg public.game_streger;
begin
  if actor_id is null then
    raise exception 'Denne telefon er ikke bundet til en deltager.';
  end if;

  if actor_id = p_target_id then
    raise exception 'Du kan ikke foreslå en streg til dig selv.';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_target_id and is_active
  ) then
    raise exception 'Den valgte deltager findes ikke.';
  end if;

  if char_length(cleaned_description) not between 3 and 500 then
    raise exception 'Beskrivelsen skal være mellem 3 og 500 tegn.';
  end if;

  if p_amount is null or p_amount not between 1 and 3 then
    raise exception 'En hændelse skal være 1, 2 eller 3 streger værd.';
  end if;

  insert into public.game_streger (target_id, proposed_by, description, amount)
  values (p_target_id, actor_id, cleaned_description, p_amount)
  returning * into created_streg;

  return created_streg;
end;
$$;

create or replace function public.device_submit_streg(
  p_target_id uuid,
  p_description text
)
returns public.game_streger
language sql
security definer
set search_path = ''
as $$
  select public.device_submit_streg(
    p_target_id,
    p_description,
    1::smallint
  );
$$;

create or replace function public.device_second_streg(p_streg_id bigint)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_claimed_player_id();
  approved_streg public.game_streger;
begin
  if actor_id is null then
    raise exception 'Denne telefon er ikke bundet til en deltager.';
  end if;

  update public.game_streger
  set
    status = 'approved',
    approved_by = actor_id,
    approved_at = now()
  where id = p_streg_id
    and status = 'pending'
    and proposed_by <> actor_id
    and target_id <> actor_id
  returning * into approved_streg;

  if approved_streg.id is null then
    raise exception 'Stregen kan ikke godkendes af dig, eller den er allerede afgjort.';
  end if;

  return approved_streg;
end;
$$;

create or replace function public.device_retract_streg(p_streg_id bigint)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_claimed_player_id();
  withdrawn_streg public.game_streger;
begin
  if actor_id is null then
    raise exception 'Denne telefon er ikke bundet til en deltager.';
  end if;

  update public.game_streger
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where id = p_streg_id
    and status = 'pending'
    and proposed_by = actor_id
  returning * into withdrawn_streg;

  if withdrawn_streg.id is null then
    raise exception 'Kun forslagsstilleren kan trække en ventende streg tilbage.';
  end if;

  return withdrawn_streg;
end;
$$;

-- Disable the original honor-system write functions that accepted a claimed
-- actor ID from the browser.
revoke execute on function public.submit_streg(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.second_streg(uuid, bigint)
  from public, anon, authenticated;
revoke execute on function public.retract_streg(uuid, bigint)
  from public, anon, authenticated;

-- Internal identity helper is callable only by the security-definer functions.
revoke execute on function public.current_claimed_player_id()
  from public, anon, authenticated;

revoke execute on function public.get_claimed_player()
  from public, anon;
revoke execute on function public.claim_player(uuid, text)
  from public, anon;
revoke execute on function public.device_submit_streg(uuid, text)
  from public, anon;
revoke execute on function public.device_submit_streg(uuid, text, smallint)
  from public, anon;
revoke execute on function public.device_second_streg(bigint)
  from public, anon;
revoke execute on function public.device_retract_streg(bigint)
  from public, anon;

grant execute on function public.get_claimed_player() to authenticated;
grant execute on function public.claim_player(uuid, text) to authenticated;
grant execute on function public.device_submit_streg(uuid, text) to authenticated;
grant execute on function public.device_submit_streg(uuid, text, smallint) to authenticated;
grant execute on function public.device_second_streg(bigint) to authenticated;
grant execute on function public.device_retract_streg(bigint) to authenticated;

-- Generate unique two-digit codes without storing them in plaintext permanently.
do $$
begin
  if (select count(*) from public.players where is_active) > 100 then
    raise exception 'Der kan højst genereres 100 unikke tocifrede koder.';
  end if;
end
$$;

drop table if exists pg_temp.generated_player_codes;

create temporary table generated_player_codes (
  player_id uuid primary key,
  code text not null
) on commit preserve rows;

with numbered_players as (
  select
    p.id,
    row_number() over (order by p.id) as row_number
  from public.players as p
  where p.is_active
),
shuffled_codes as (
  select
    generated.code,
    row_number() over (order by random()) as row_number
  from generate_series(0, 99) as generated(code)
)
insert into generated_player_codes (player_id, code)
select p.id, lpad(c.code::text, 2, '0')
from numbered_players as p
join shuffled_codes as c using (row_number);

update public.players as p
set
  claim_code_hash = extensions.crypt(c.code, extensions.gen_salt('bf', 10)),
  claimed_user_id = null,
  claimed_at = null
from generated_player_codes as c
where p.id = c.player_id;

commit;

-- This is the only time the plaintext personal codes are displayed.
select p.display_name, c.code as personal_code
from generated_player_codes as c
join public.players as p on p.id = c.player_id
order by p.display_name;
