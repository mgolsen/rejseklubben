-- Rejseklubben: allow the current browser to log its participant out.
--
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to rerun. It does not change codes, scores, proposals or current logins.

begin;

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
    raise exception 'Telefonen har ingen gyldig session. Genindlæs siden.';
  end if;

  update public.players as p
  set
    claimed_user_id = null,
    claimed_at = null
  where p.claimed_user_id = caller_id
  returning p.id, p.display_name
  into released_player_id, released_player_name;

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

revoke execute on function public.release_player()
  from public, anon, authenticated;
grant execute on function public.release_player()
  to authenticated;

commit;
