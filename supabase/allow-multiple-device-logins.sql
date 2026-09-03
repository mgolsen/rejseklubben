-- Rejseklubben: allow each participant to stay logged in on multiple devices.
--
-- Prerequisites:
--   * supabase/add-personal-codes.sql
--   * supabase/add-logout.sql
--
-- Run this once in Supabase Dashboard -> SQL Editor -> New query.
-- It preserves all existing participant codes, scores, proposals, votes and logins.
-- It is safe to rerun.

begin;

-- One anonymous Supabase user represents one browser profile. A browser can be
-- attached to only one participant, while a participant can have any number of
-- browser profiles.
create table if not exists public.player_device_sessions (
  device_user_id uuid primary key references auth.users (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create index if not exists player_device_sessions_player_idx
  on public.player_device_sessions (player_id);

alter table public.player_device_sessions enable row level security;

-- Session bindings are private implementation details. They are accessed only
-- through the security-definer functions below.
revoke all on table public.player_device_sessions from anon, authenticated;

-- Preserve every login made under the earlier one-device-per-participant model.
insert into public.player_device_sessions (device_user_id, player_id, claimed_at)
select
  p.claimed_user_id,
  p.id,
  coalesce(p.claimed_at, now())
from public.players as p
where p.claimed_user_id is not null
on conflict (device_user_id) do update
set
  player_id = excluded.player_id,
  claimed_at = excluded.claimed_at;

-- Resolve the participant attached to the current browser session.
create or replace function public.get_claimed_player()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.player_device_sessions as s
  join public.players as p on p.id = s.player_id
  where s.device_user_id = (select auth.uid())
    and p.is_active
  limit 1;
$$;

-- Attach the current browser session to a participant. Incorrect codes remain
-- limited to five attempts per 15-minute window for each anonymous session.
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
  attempt_count smallint;
  blocked_until_value timestamptz;
begin
  if caller_id is null then
    raise exception 'Enheden har ingen gyldig session. Genindlæs siden.';
  end if;

  select p.id, p.display_name
  into existing_player_id, existing_player_name
  from public.player_device_sessions as s
  join public.players as p on p.id = s.player_id
  where s.device_user_id = caller_id
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
      'message', 'Denne enhed er allerede logget ind som ' || existing_player_name || '. Log først ud.'
    );
  end if;

  select p.display_name, p.claim_code_hash
  into target_name, target_hash
  from public.players as p
  where p.id = p_player_id
    and p.is_active;

  if target_name is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'player_not_found',
      'message', 'Deltageren findes ikke.'
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
        'message', 'Forkert kode. Enheden er nu låst i 15 minutter.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_code',
      'message', 'Forkert personlig kode. Forsøg tilbage: ' || (5 - attempt_count)::text || '.'
    );
  end if;

  insert into public.player_device_sessions (device_user_id, player_id, claimed_at)
  values (caller_id, p_player_id, now())
  on conflict (device_user_id) do update
  set
    player_id = excluded.player_id,
    claimed_at = excluded.claimed_at;

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

-- Log out only the current browser. Other devices belonging to the same
-- participant remain logged in.
create or replace function public.release_player()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  released_player_id uuid;
  released_player_name text;
begin
  if caller_id is null then
    raise exception 'Enheden har ingen gyldig session. Genindlæs siden.';
  end if;

  delete from public.player_device_sessions as s
  where s.device_user_id = caller_id
  returning s.player_id
  into released_player_id;

  if released_player_id is not null then
    select p.display_name
    into released_player_name
    from public.players as p
    where p.id = released_player_id;
  end if;

  delete from public.player_claim_attempts
  where device_user_id = caller_id;

  return jsonb_build_object(
    'ok', true,
    'player', case
      when released_player_id is null then null
      else jsonb_build_object(
        'id', released_player_id,
        'display_name', released_player_name
      )
    end
  );
end;
$$;

-- Internal identity helper used by voting, proposal and admin functions.
create or replace function public.current_claimed_player_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.player_device_sessions as s
  join public.players as p on p.id = s.player_id
  where s.device_user_id = (select auth.uid())
    and p.is_active
  limit 1;
$$;

-- The legacy columns are retained for compatibility with earlier migration
-- files, but all live identity lookups now use player_device_sessions.
update public.players
set
  claimed_user_id = null,
  claimed_at = null
where claimed_user_id is not null
   or claimed_at is not null;

revoke execute on function public.current_claimed_player_id()
  from public, anon, authenticated;
revoke execute on function public.get_claimed_player()
  from public, anon;
revoke execute on function public.claim_player(uuid, text)
  from public, anon;
revoke execute on function public.release_player()
  from public, anon;

grant execute on function public.get_claimed_player() to authenticated;
grant execute on function public.claim_player(uuid, text) to authenticated;
grant execute on function public.release_player() to authenticated;

commit;

-- Verification: one row per logged-in browser. Re-running this file does not
-- alter these rows or participant codes.
select
  p.display_name,
  count(*)::integer as logged_in_devices
from public.player_device_sessions as s
join public.players as p on p.id = s.player_id
group by p.id, p.display_name
order by p.display_name;
