-- List rooms + delete room
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- RPC: list_my_rooms (rooms the user is in)
-- ----------------------------
drop function if exists public.list_my_rooms();
create or replace function public.list_my_rooms()
returns table(
  room_id uuid,
  room_code text,
  room_status public.room_status,
  player_count int,
  is_host boolean,
  host_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select
      r.id as room_id,
      r.code as room_code,
      r.status as room_status,
      (select count(*)::int from public.room_players rp2 where rp2.room_id = r.id) as player_count,
      r.host_user_id = v_user_id as is_host,
      coalesce(
        (select rp3.display_name from public.room_players rp3 where rp3.room_id = r.id and rp3.user_id = r.host_user_id limit 1),
        'Unknown'
      ) as host_name,
      r.created_at
    from public.rooms r
    join public.room_players rp on rp.room_id = r.id and rp.user_id = v_user_id
    where r.status <> 'finished'
    order by r.created_at desc
    limit 10;
end;
$$;

grant execute on function public.list_my_rooms() to authenticated;

-- ----------------------------
-- RPC: list_available_rooms (rooms open to join, not full, user not already in)
-- ----------------------------
drop function if exists public.list_available_rooms();
create or replace function public.list_available_rooms()
returns table(
  room_id uuid,
  room_code text,
  room_status public.room_status,
  player_count int,
  host_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select
      r.id as room_id,
      r.code as room_code,
      r.status as room_status,
      (select count(*)::int from public.room_players rp2 where rp2.room_id = r.id) as player_count,
      coalesce(
        (select rp3.display_name from public.room_players rp3 where rp3.room_id = r.id and rp3.user_id = r.host_user_id limit 1),
        'Unknown'
      ) as host_name,
      r.created_at
    from public.rooms r
    where r.status <> 'finished'
      and (select count(*) from public.room_players rp2 where rp2.room_id = r.id) < 3
      and not exists (
        select 1 from public.room_players rp4 where rp4.room_id = r.id and rp4.user_id = v_user_id
      )
    order by r.created_at desc
    limit 20;
end;
$$;

grant execute on function public.list_available_rooms() to authenticated;

-- ----------------------------
-- RPC: delete_room (host only)
-- ----------------------------
create or replace function public.delete_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.host_user_id into v_host_id
  from public.rooms r
  where r.id = p_room_id;

  if v_host_id is null then
    raise exception 'Room not found';
  end if;

  if v_host_id <> v_user_id then
    raise exception 'Only host can delete room';
  end if;

  delete from public.rooms where id = p_room_id;

  return true;
end;
$$;

grant execute on function public.delete_room(uuid) to authenticated;

commit;
