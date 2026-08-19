-- Add the remaining Stuttgart 2026 participants without changing existing
-- participants, personal codes, or phone bindings.
--
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- The final result contains codes only for participants added by this run.
-- Save those codes privately; the database keeps only their hashes.

begin;

create extension if not exists pgcrypto with schema extensions;

drop table if exists pg_temp.requested_trip_members;
drop table if exists pg_temp.newly_added_players;
drop table if exists pg_temp.used_player_codes;
drop table if exists pg_temp.new_player_codes;

create temporary table requested_trip_members (
  display_name text primary key
) on commit preserve rows;

insert into requested_trip_members (display_name)
values
  ('Adam B'),
  ('Anders Kjær Dybdahl'),
  ('Anders Petersen Høiby'),
  ('Andreas Borchsenius Westh'),
  ('Casper Thomsen'),
  ('Christian Bartels'),
  ('David Skjoldborg Pedersen'),
  ('Mark Rif Torbensen'),
  ('René Juhl'),
  ('Søren Dahl'),
  ('Steven Kjeld Christensen'),
  ('Thomas Greniman');

create temporary table newly_added_players (
  player_id uuid primary key,
  display_name text not null
) on commit preserve rows;

with inserted_players as (
  insert into public.players (display_name)
  select requested.display_name
  from requested_trip_members as requested
  on conflict (display_name) do nothing
  returning id, display_name
)
insert into newly_added_players (player_id, display_name)
select inserted.id, inserted.display_name
from inserted_players as inserted;

-- Recover the two-digit values used by existing hashes inside this temporary
-- transaction only, so new participants never receive an existing code.
create temporary table used_player_codes (
  code text primary key
) on commit preserve rows;

do $$
declare
  existing_player record;
  candidate integer;
  candidate_code text;
begin
  if exists (select 1 from pg_temp.newly_added_players) then
    for existing_player in
      select claim_code_hash
      from public.players
      where claim_code_hash is not null
        and id not in (select player_id from pg_temp.newly_added_players)
    loop
      for candidate in 0..99 loop
        candidate_code := lpad(candidate::text, 2, '0');
        if extensions.crypt(candidate_code, existing_player.claim_code_hash)
          = existing_player.claim_code_hash then
          insert into pg_temp.used_player_codes (code)
          values (candidate_code)
          on conflict (code) do nothing;
          exit;
        end if;
      end loop;
    end loop;
  end if;
end
$$;

create temporary table new_player_codes (
  player_id uuid primary key,
  code text not null unique
) on commit preserve rows;

with numbered_players as (
  select
    player_id,
    row_number() over (order by player_id) as row_number
  from newly_added_players
),
available_codes as (
  select
    lpad(generated.code::text, 2, '0') as code,
    row_number() over (order by random()) as row_number
  from generate_series(0, 99) as generated(code)
  where lpad(generated.code::text, 2, '0') not in (
    select used.code from used_player_codes as used
  )
)
insert into new_player_codes (player_id, code)
select players.player_id, codes.code
from numbered_players as players
join available_codes as codes using (row_number);

do $$
begin
  if (select count(*) from pg_temp.newly_added_players)
    <> (select count(*) from pg_temp.new_player_codes) then
    raise exception 'Der er ikke nok ledige tocifrede koder til alle nye deltagere.';
  end if;
end
$$;

update public.players as players
set claim_code_hash = extensions.crypt(codes.code, extensions.gen_salt('bf', 10))
from new_player_codes as codes
where players.id = codes.player_id;

commit;

-- This is the only time the new plaintext codes are displayed.
select players.display_name, codes.code as personal_code
from new_player_codes as codes
join public.players as players on players.id = codes.player_id
order by players.display_name;
