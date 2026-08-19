-- Add group voting, two-minute deadlines, backfire, and pardons.
--
-- Rules introduced by this migration:
--   * A proposal for 1, 2, or 3 streger needs 2, 4, or 8 votes.
--   * Voting is open for two minutes.
--   * A penalty that misses its threshold is charged to the proposer instead.
--   * A pardon needs 8 votes and removes one streg, never taking a score below 0.
--   * The proposer and the affected participant cannot vote on the proposal.
--
-- Existing approved/withdrawn history is preserved. Any proposal that was still
-- pending before this migration is withdrawn without changing anybody's score,
-- because it was created under the old rules.
--
-- Run once in Supabase Dashboard -> SQL Editor -> New query before publishing
-- the matching streger.js and streger.html changes.

begin;

alter table public.game_streger
  add column if not exists proposal_type text not null default 'penalty',
  add column if not exists required_votes smallint,
  add column if not exists deadline timestamptz;

-- Do not retroactively punish the proposer of an old, still-pending case.
update public.game_streger
set
  status = 'withdrawn',
  withdrawn_at = now()
where status = 'pending'
  and required_votes is null;

update public.game_streger
set required_votes = case
  when status = 'approved' then 1
  when amount = 1 then 2
  when amount = 2 then 4
  else 8
end
where required_votes is null;

update public.game_streger
set deadline = created_at + interval '2 minutes'
where deadline is null;

alter table public.game_streger
  alter column required_votes set not null,
  alter column deadline set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_streger_proposal_type_valid'
      and conrelid = 'public.game_streger'::regclass
  ) then
    alter table public.game_streger
      add constraint game_streger_proposal_type_valid
      check (proposal_type in ('penalty', 'pardon'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_streger_required_votes_valid'
      and conrelid = 'public.game_streger'::regclass
  ) then
    alter table public.game_streger
      add constraint game_streger_required_votes_valid
      check (required_votes in (1, 2, 4, 8));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_streger_pardon_amount_is_one'
      and conrelid = 'public.game_streger'::regclass
  ) then
    alter table public.game_streger
      add constraint game_streger_pardon_amount_is_one
      check (proposal_type = 'penalty' or amount = 1);
  end if;
end
$$;

create table public.game_streg_votes (
  id bigint generated always as identity primary key,
  streg_id bigint not null references public.game_streger (id) on delete cascade,
  voter_id uuid not null references public.players (id),
  created_at timestamptz not null default now(),
  constraint game_streg_votes_one_vote_per_player unique (streg_id, voter_id)
);

create index game_streg_votes_streg_idx
  on public.game_streg_votes (streg_id);

alter table public.game_streg_votes enable row level security;

create policy game_streg_votes_are_publicly_visible
  on public.game_streg_votes
  for select
  to anon, authenticated
  using (true);

grant select on table public.game_streg_votes to anon, authenticated;

-- This view derives "failed" from the deadline. The underlying row remains
-- pending so no background job is required to close it at exactly two minutes.
create view public.game_proposal_status
with (security_invoker = true)
as
select
  s.id,
  s.target_id,
  s.proposed_by,
  s.description,
  s.amount,
  s.proposal_type,
  s.required_votes,
  s.deadline,
  coalesce(v.vote_count, 0)::integer as vote_count,
  case
    when s.status = 'approved' then 'approved'
    when s.status = 'withdrawn' then 'withdrawn'
    when now() > s.deadline then 'failed'
    else 'open'
  end as status,
  s.approved_by,
  s.approved_at,
  s.withdrawn_at,
  s.created_at
from public.game_streger as s
left join (
  select streg_id, count(*)::integer as vote_count
  from public.game_streg_votes
  group by streg_id
) as v on v.streg_id = s.id;

grant select on table public.game_proposal_status to anon, authenticated;

-- Penalties count against the target when approved and against the proposer
-- when they fail. An approved pardon subtracts one. The recursive running total
-- applies events chronologically, so a pardon at zero cannot be saved up to
-- cancel a future penalty and a participant's score is never negative.
create or replace view public.game_leaderboard
with (security_invoker = true)
as
with recursive score_events as (
  select
    s.target_id as player_id,
    s.amount::integer as delta,
    s.approved_at as event_at,
    s.id as proposal_id
  from public.game_proposal_status as s
  where s.proposal_type = 'penalty'
    and s.status = 'approved'

  union all

  select
    s.proposed_by as player_id,
    s.amount::integer as delta,
    s.deadline as event_at,
    s.id as proposal_id
  from public.game_proposal_status as s
  where s.proposal_type = 'penalty'
    and s.status = 'failed'

  union all

  select
    s.target_id as player_id,
    -1 as delta,
    s.approved_at as event_at,
    s.id as proposal_id
  from public.game_proposal_status as s
  where s.proposal_type = 'pardon'
    and s.status = 'approved'
),
numbered_events as (
  select
    e.*,
    row_number() over (
      partition by e.player_id
      order by e.event_at, e.proposal_id
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
  votes_needed smallint;
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

  votes_needed := case p_amount when 1 then 2 when 2 then 4 else 8 end;

  insert into public.game_streger (
    target_id,
    proposed_by,
    description,
    amount,
    proposal_type,
    required_votes,
    deadline
  )
  values (
    p_target_id,
    actor_id,
    cleaned_description,
    p_amount,
    'penalty',
    votes_needed,
    now() + interval '2 minutes'
  )
  returning * into created_streg;

  return created_streg;
end;
$$;

-- Keep older deployed clients working while GitHub Pages refreshes.
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

create function public.device_submit_pardon(
  p_target_id uuid,
  p_description text
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
    raise exception 'Du kan ikke foreslå en benådning til dig selv.';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_target_id and is_active
  ) then
    raise exception 'Den valgte deltager findes ikke.';
  end if;

  if char_length(cleaned_description) not between 3 and 500 then
    raise exception 'Begrundelsen skal være mellem 3 og 500 tegn.';
  end if;

  insert into public.game_streger (
    target_id,
    proposed_by,
    description,
    amount,
    proposal_type,
    required_votes,
    deadline
  )
  values (
    p_target_id,
    actor_id,
    cleaned_description,
    1,
    'pardon',
    8,
    now() + interval '2 minutes'
  )
  returning * into created_streg;

  return created_streg;
end;
$$;

create function public.device_vote_streg(p_streg_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_claimed_player_id();
  proposal public.game_streger;
  current_vote_count integer;
  final_status text := 'open';
begin
  if actor_id is null then
    raise exception 'Denne telefon er ikke bundet til en deltager.';
  end if;

  select *
  into proposal
  from public.game_streger
  where id = p_streg_id
  for update;

  if proposal.id is null then
    raise exception 'Forslaget findes ikke.';
  end if;

  if proposal.status <> 'pending' then
    raise exception 'Forslaget er allerede afgjort.';
  end if;

  if now() > proposal.deadline then
    raise exception 'Afstemningen er slut.';
  end if;

  if actor_id = proposal.proposed_by or actor_id = proposal.target_id then
    raise exception 'Forslagsstilleren og den berørte deltager kan ikke stemme.';
  end if;

  if exists (
    select 1
    from public.game_streg_votes
    where streg_id = p_streg_id
      and voter_id = actor_id
  ) then
    raise exception 'Du har allerede stemt om dette forslag.';
  end if;

  insert into public.game_streg_votes (streg_id, voter_id)
  values (p_streg_id, actor_id);

  select count(*)::integer
  into current_vote_count
  from public.game_streg_votes
  where streg_id = p_streg_id;

  if current_vote_count >= proposal.required_votes then
    update public.game_streger
    set
      status = 'approved',
      approved_by = actor_id,
      approved_at = now()
    where id = p_streg_id;
    final_status := 'approved';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', final_status,
    'vote_count', current_vote_count,
    'required_votes', proposal.required_votes
  );
end;
$$;

-- Backward-compatible name used by the previously deployed interface.
create or replace function public.device_second_streg(p_streg_id bigint)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_streg public.game_streger;
begin
  perform public.device_vote_streg(p_streg_id);

  select *
  into result_streg
  from public.game_streger
  where id = p_streg_id;

  return result_streg;
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

  update public.game_streger as s
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where s.id = p_streg_id
    and s.status = 'pending'
    and s.deadline >= now()
    and s.proposed_by = actor_id
    and not exists (
      select 1
      from public.game_streg_votes as v
      where v.streg_id = s.id
    )
  returning s.* into withdrawn_streg;

  if withdrawn_streg.id is null then
    raise exception 'Forslaget kan kun trækkes tilbage af forslagsstilleren, før nogen har stemt.';
  end if;

  return withdrawn_streg;
end;
$$;

revoke execute on function public.device_submit_streg(uuid, text)
  from public, anon;
revoke execute on function public.device_submit_streg(uuid, text, smallint)
  from public, anon;
revoke execute on function public.device_submit_pardon(uuid, text)
  from public, anon;
revoke execute on function public.device_vote_streg(bigint)
  from public, anon;
revoke execute on function public.device_second_streg(bigint)
  from public, anon;
revoke execute on function public.device_retract_streg(bigint)
  from public, anon;

grant execute on function public.device_submit_streg(uuid, text)
  to authenticated;
grant execute on function public.device_submit_streg(uuid, text, smallint)
  to authenticated;
grant execute on function public.device_submit_pardon(uuid, text)
  to authenticated;
grant execute on function public.device_vote_streg(bigint)
  to authenticated;
grant execute on function public.device_second_streg(bigint)
  to authenticated;
grant execute on function public.device_retract_streg(bigint)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_streg_votes'
  ) then
    alter publication supabase_realtime add table public.game_streg_votes;
  end if;
end
$$;

commit;

notify pgrst, 'reload schema';

select
  'Group voting and pardons are ready' as result,
  count(*) filter (where status = 'approved') as preserved_approved_proposals,
  count(*) filter (where status = 'open') as open_proposals
from public.game_proposal_status;
