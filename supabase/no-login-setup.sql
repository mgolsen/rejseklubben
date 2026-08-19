-- Rejseklubben: simplified honor-system setup (no participant logins)
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- This adds new game tables and leaves the earlier login-based tables untouched.

begin;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique
    check (char_length(trim(display_name)) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.game_streger (
  id bigint generated always as identity primary key,
  target_id uuid not null references public.players (id),
  proposed_by uuid not null references public.players (id),
  description text not null check (char_length(trim(description)) between 3 and 500),
  amount smallint not null default 1 check (amount between 1 and 3),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'withdrawn')),
  approved_by uuid references public.players (id),
  approved_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  constraint game_proposer_cannot_be_target check (proposed_by <> target_id),
  constraint valid_game_streg_state check (
    (
      status = 'pending'
      and approved_by is null
      and approved_at is null
      and withdrawn_at is null
    )
    or
    (
      status = 'approved'
      and approved_by is not null
      and approved_at is not null
      and withdrawn_at is null
      and approved_by <> proposed_by
      and approved_by <> target_id
    )
    or
    (
      status = 'withdrawn'
      and approved_by is null
      and approved_at is null
      and withdrawn_at is not null
    )
  )
);

create index game_streger_status_created_idx
  on public.game_streger (status, created_at desc);
create index game_streger_target_status_idx
  on public.game_streger (target_id, status);

-- The three names already present on the trip website.
insert into public.players (display_name)
values ('Emil'), ('Martin'), ('Morten');

create function public.submit_streg(
  p_actor_id uuid,
  p_target_id uuid,
  p_description text
)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_description text := trim(p_description);
  created_streg public.game_streger;
begin
  if not exists (
    select 1 from public.players
    where id = p_actor_id and is_active
  ) then
    raise exception 'Vælg først, hvem du er.';
  end if;

  if p_actor_id = p_target_id then
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

  insert into public.game_streger (target_id, proposed_by, description)
  values (p_target_id, p_actor_id, cleaned_description)
  returning * into created_streg;

  return created_streg;
end;
$$;

create function public.second_streg(
  p_actor_id uuid,
  p_streg_id bigint
)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_streg public.game_streger;
begin
  if not exists (
    select 1 from public.players
    where id = p_actor_id and is_active
  ) then
    raise exception 'Vælg først, hvem du er.';
  end if;

  update public.game_streger
  set
    status = 'approved',
    approved_by = p_actor_id,
    approved_at = now()
  where id = p_streg_id
    and status = 'pending'
    and proposed_by <> p_actor_id
    and target_id <> p_actor_id
  returning * into approved_streg;

  if approved_streg.id is null then
    raise exception 'Stregen kan ikke godkendes af dig, eller den er allerede afgjort.';
  end if;

  return approved_streg;
end;
$$;

create function public.retract_streg(
  p_actor_id uuid,
  p_streg_id bigint
)
returns public.game_streger
language plpgsql
security definer
set search_path = ''
as $$
declare
  withdrawn_streg public.game_streger;
begin
  if not exists (
    select 1 from public.players
    where id = p_actor_id and is_active
  ) then
    raise exception 'Vælg først, hvem du er.';
  end if;

  update public.game_streger
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where id = p_streg_id
    and status = 'pending'
    and proposed_by = p_actor_id
  returning * into withdrawn_streg;

  if withdrawn_streg.id is null then
    raise exception 'Kun forslagsstilleren kan trække en ventende streg tilbage.';
  end if;

  return withdrawn_streg;
end;
$$;

create view public.game_leaderboard
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

alter table public.players enable row level security;
alter table public.game_streger enable row level security;

create policy players_are_publicly_visible
  on public.players
  for select
  to anon, authenticated
  using (is_active);

create policy game_streger_are_publicly_visible
  on public.game_streger
  for select
  to anon, authenticated
  using (true);

-- There are deliberately no direct INSERT, UPDATE, or DELETE policies.
-- Changes are possible only through the functions above, which enforce the rules.
grant select on table public.players to anon, authenticated;
grant select on table public.game_streger to anon, authenticated;
grant select on table public.game_leaderboard to anon, authenticated;

grant execute on function public.submit_streg(uuid, uuid, text) to anon, authenticated;
grant execute on function public.second_streg(uuid, bigint) to anon, authenticated;
grant execute on function public.retract_streg(uuid, bigint) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_streger'
  ) then
    alter publication supabase_realtime add table public.game_streger;
  end if;
end
$$;

commit;
