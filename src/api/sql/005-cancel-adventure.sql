-- Cancel adventure RPC: revert room back to lobby (host only)
-- Run this in Supabase SQL Editor.

begin;

create or replace function public.cancel_adventure(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_room_status public.room_status;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.host_user_id, r.status
  into v_host_id, v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_host_id is null then
    raise exception 'Room not found';
  end if;

  if v_host_id <> v_user_id then
    raise exception 'Only host can cancel adventure';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure is not in progress';
  end if;

  update public.rooms
  set status = 'lobby'
  where id = p_room_id;

  return true;
end;
$$;

grant execute on function public.cancel_adventure(uuid) to authenticated;

commit;
