-- Rejseklubben: increase the voting window from 2 to 30 minutes.
--
-- Prerequisite: supabase/add-group-voting-and-pardons.sql
--
-- Run this once in Supabase Dashboard -> SQL Editor -> New query.
-- It preserves all proposals, votes and scores. Existing pending proposals are
-- recalculated from their original creation time. It is safe to rerun.

begin;

-- The status view derives open/failed from the deadline, so changing the
-- deadline immediately applies the new rule without rewriting proposal status.
update public.game_streger
set deadline = created_at + interval '30 minutes'
where status = 'pending';

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
    raise exception 'Denne enhed er ikke bundet til en deltager.';
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
    now() + interval '30 minutes'
  )
  returning * into created_streg;

  return created_streg;
end;
$$;

create or replace function public.device_submit_pardon(
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
    raise exception 'Denne enhed er ikke bundet til en deltager.';
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
    now() + interval '30 minutes'
  )
  returning * into created_streg;

  return created_streg;
end;
$$;

revoke execute on function public.device_submit_streg(uuid, text, smallint)
  from public, anon;
revoke execute on function public.device_submit_pardon(uuid, text)
  from public, anon;

grant execute on function public.device_submit_streg(uuid, text, smallint)
  to authenticated;
grant execute on function public.device_submit_pardon(uuid, text)
  to authenticated;

commit;

notify pgrst, 'reload schema';

-- Verification: pending proposals display their new deadline and duration.
select
  id,
  proposal_type,
  created_at,
  deadline,
  deadline - created_at as voting_window
from public.game_streger
where status = 'pending'
order by created_at desc;
