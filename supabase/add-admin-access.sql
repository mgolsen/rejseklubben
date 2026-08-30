-- Rejseklubben: protected administrator adjustments for Emil, Martin and Morten.
--
-- Run once in Supabase Dashboard -> SQL Editor -> New query before publishing
-- the matching streger.js and streger.html changes. Safe to rerun.
-- Existing scores, codes, proposals, votes and logins are preserved.

begin;

alter table public.players
  add column if not exists is_admin boolean not null default false;

-- These are the three requested administrator accounts. Matching is
-- case-insensitive so rerunning this remains predictable.
update public.players
set is_admin = lower(trim(display_name)) in ('emil', 'martin', 'morten');

grant select (is_admin) on table public.players to anon, authenticated;

create table if not exists public.game_admin_adjustments (
  id bigint generated always as identity primary key,
  target_id uuid not null references public.players (id),
  admin_id uuid not null references public.players (id),
  delta smallint not null check (delta between -3 and 3 and delta <> 0),
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

create index if not exists game_admin_adjustments_target_idx
  on public.game_admin_adjustments (target_id, created_at desc);

alter table public.game_admin_adjustments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'game_admin_adjustments'
      and policyname = 'game_admin_adjustments_are_publicly_visible'
  ) then
    create policy game_admin_adjustments_are_publicly_visible
      on public.game_admin_adjustments
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

grant select on table public.game_admin_adjustments to anon, authenticated;
revoke insert, update, delete on table public.game_admin_adjustments
  from public, anon, authenticated;

-- Add administrator adjustments to the chronological score ledger. Negative
-- events are applied at their actual time and a score can never go below zero.
create or replace view public.game_leaderboard
with (security_invoker = true)
as
with recursive score_events as (
  select
    s.target_id as player_id,
    s.amount::integer as delta,
    s.approved_at as event_at,
    0 as event_kind,
    s.id as event_id
  from public.game_proposal_status as s
  where s.proposal_type = 'penalty'
    and s.status = 'approved'

  union all

  select
    s.proposed_by as player_id,
    s.amount::integer as delta,
    s.deadline as event_at,
    0 as event_kind,
    s.id as event_id
  from public.game_proposal_status as s
  where s.proposal_type = 'penalty'
    and s.status = 'failed'

  union all

  select
    s.target_id as player_id,
    -1 as delta,
    s.approved_at as event_at,
    0 as event_kind,
    s.id as event_id
  from public.game_proposal_status as s
  where s.proposal_type = 'pardon'
    and s.status = 'approved'

  union all

  select
    a.target_id as player_id,
    a.delta::integer,
    a.created_at as event_at,
    1 as event_kind,
    a.id as event_id
  from public.game_admin_adjustments as a
),
numbered_events as (
  select
    e.*,
    row_number() over (
      partition by e.player_id
      order by e.event_at, e.event_kind, e.event_id
    ) as event_number
  from score_events as e
),
running_scores as (
  select
    e.player_id,
    e.event_number,
    greatest(e.delta, 0)::integer as total
  from numbered_events as e
  where e.event_number = 1

  union all

  select
    e.player_id,
    e.event_number,
    greatest(r.total + e.delta, 0)::integer as total
  from running_scores as r
  join numbered_events as e
    on e.player_id = r.player_id
   and e.event_number = r.event_number + 1
),
latest_scores as (
  select distinct on (r.player_id)
    r.player_id,
    r.total
  from running_scores as r
  order by r.player_id, r.event_number desc
)
select
  p.id,
  p.display_name,
  coalesce(s.total, 0)::integer as total
from public.players as p
left join latest_scores as s on s.player_id = p.id
where p.is_active;

grant select on table public.game_leaderboard to anon, authenticated;

create or replace function public.admin_adjust_streger(
  p_target_id uuid,
  p_delta smallint,
  p_reason text
)
returns public.game_admin_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_claimed_player_id();
  cleaned_reason text := trim(p_reason);
  current_total integer;
  created_adjustment public.game_admin_adjustments;
begin
  if actor_id is null then
    raise exception 'Telefonen er ikke logget ind som en deltager.';
  end if;

  if not exists (
    select 1
    from public.players
    where id = actor_id
      and is_active
      and is_admin
  ) then
    raise exception 'Kun administratorer kan rette regnskabet.';
  end if;

  if not exists (
    select 1
    from public.players
    where id = p_target_id
      and is_active
  ) then
    raise exception 'Den valgte deltager findes ikke.';
  end if;

  if p_delta is null or p_delta = 0 or p_delta not between -3 and 3 then
    raise exception 'Rettelsen skal være mellem minus 3 og plus 3 streger.';
  end if;

  if cleaned_reason is null or char_length(cleaned_reason) not between 3 and 500 then
    raise exception 'Begrundelsen skal være mellem 3 og 500 tegn.';
  end if;

  select l.total
  into current_total
  from public.game_leaderboard as l
  where l.id = p_target_id;

  if current_total + p_delta < 0 then
    raise exception 'En deltager kan ikke få færre end 0 streger.';
  end if;

  insert into public.game_admin_adjustments (
    target_id,
    admin_id,
    delta,
    reason
  )
  values (
    p_target_id,
    actor_id,
    p_delta,
    cleaned_reason
  )
  returning * into created_adjustment;

  return created_adjustment;
end;
$$;

revoke execute on function public.admin_adjust_streger(uuid, smallint, text)
  from public, anon, authenticated;
grant execute on function public.admin_adjust_streger(uuid, smallint, text)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_admin_adjustments'
  ) then
    alter publication supabase_realtime
      add table public.game_admin_adjustments;
  end if;
end
$$;

commit;

notify pgrst, 'reload schema';

select display_name as administrator
from public.players
where is_admin
order by display_name;
