-- Allow each incident to be worth 1, 2, or 3 streger.
-- Existing incidents remain worth 1 streg.
-- Run in Supabase Dashboard -> SQL Editor -> New query before publishing the
-- matching streger.js and streger.html changes.

begin;

alter table public.game_streger
  add column if not exists amount smallint;

update public.game_streger
set amount = 1
where amount is null;

alter table public.game_streger
  alter column amount set default 1,
  alter column amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_streger_amount_between_1_and_3'
      and conrelid = 'public.game_streger'::regclass
  ) then
    alter table public.game_streger
      add constraint game_streger_amount_between_1_and_3
      check (amount between 1 and 3);
  end if;
end
$$;

create or replace view public.game_leaderboard
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  coalesce(
    sum(s.amount) filter (where s.status = 'approved'),
    0
  )::integer as total
from public.players as p
left join public.game_streger as s on s.target_id = p.id
where p.is_active
group by p.id, p.display_name;

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

  insert into public.game_streger (
    target_id,
    proposed_by,
    description,
    amount
  )
  values (
    p_target_id,
    actor_id,
    cleaned_description,
    p_amount
  )
  returning * into created_streg;

  return created_streg;
end;
$$;

-- Keep the deployed two-argument frontend working during the migration. It
-- continues to create incidents worth exactly 1 streg.
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

revoke execute on function public.device_submit_streg(uuid, text, smallint)
  from public, anon;
grant execute on function public.device_submit_streg(uuid, text, smallint)
  to authenticated;

commit;
