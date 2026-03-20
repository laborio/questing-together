-- Characters table + name/role at join time + relaxed start adventure
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Characters table
-- ----------------------------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id public.player_id not null,
  name text not null,
  level int not null default 1,
  gold int not null default 0,
  exp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, player_id)
);

create index if not exists idx_characters_room on public.characters(room_id);

drop trigger if exists trg_characters_updated_at on public.characters;
create trigger trg_characters_updated_at
before update on public.characters
for each row
execute function public.set_updated_at();

-- ----------------------------
-- RLS for characters
-- ----------------------------
alter table public.characters enable row level security;

drop policy if exists characters_select_member on public.characters;
create policy characters_select_member
on public.characters
for select
to authenticated
using (public.is_room_member(room_id));

grant select on public.characters to authenticated;

-- ----------------------------
-- Realtime publication
-- ----------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'characters'
  ) then
    execute 'alter publication supabase_realtime add table public.characters';
  end if;
end
$$;

-- ----------------------------
-- peek_room: fetch taken roles without joining
-- ----------------------------
create or replace function public.peek_room(p_code text)
returns table(
  room_id uuid,
  room_status public.room_status,
  player_count int,
  taken_roles public.role_id[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_room_status public.room_status;
  v_player_count int;
  v_taken_roles public.role_id[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select r.id, r.status
  into v_room_id, v_room_status
  from public.rooms r
  where r.code = upper(trim(p_code))
    and r.status <> 'finished';

  if v_room_id is null then
    raise exception 'Room not found';
  end if;

  select count(*), coalesce(array_agg(rp.role_id) filter (where rp.role_id is not null), '{}')
  into v_player_count, v_taken_roles
  from public.room_players rp
  where rp.room_id = v_room_id;

  if v_player_count >= 3 then
    raise exception 'Room is full (max 3 players)';
  end if;

  return query select v_room_id, v_room_status, v_player_count, v_taken_roles;
end;
$$;

grant execute on function public.peek_room(text) to authenticated;

-- ----------------------------
-- create_room: requires display_name + role_id, seeds character
-- ----------------------------
drop function if exists public.create_room(public.player_id);
create or replace function public.create_room(
  p_player_id public.player_id default null,
  p_display_name text default null,
  p_role_id public.role_id default null
)
returns table(room_id uuid, room_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_attempts int := 0;
  v_assigned_player_id public.player_id := 'p1';
  v_trimmed_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_trimmed_name := trim(coalesce(p_display_name, ''));
  if v_trimmed_name = '' then
    raise exception 'Name is required';
  end if;
  if v_trimmed_name ~ '[[:space:]]' then
    raise exception 'Name cannot contain spaces';
  end if;
  if char_length(v_trimmed_name) > 20 then
    raise exception 'Name must be 20 characters or fewer';
  end if;

  if p_role_id is null then
    raise exception 'Role is required';
  end if;

  loop
    v_code := public.generate_room_code(6);
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Could not generate a unique room code';
    end if;
  end loop;

  insert into public.rooms (code, host_user_id, status)
  values (v_code, v_user_id, 'lobby')
  returning id into v_room_id;

  insert into public.room_players (room_id, player_id, user_id, role_id, display_name)
  values (v_room_id, v_assigned_player_id, v_user_id, p_role_id, v_trimmed_name);

  insert into public.characters (room_id, player_id, name, level, gold, exp, hp, hp_max)
  values (
    v_room_id, v_assigned_player_id, v_trimmed_name, 1, 0, 0,
    case p_role_id when 'warrior' then 60 when 'ranger' then 50 when 'sage' then 40 else 50 end,
    case p_role_id when 'warrior' then 60 when 'ranger' then 50 when 'sage' then 40 else 50 end
  );

  return query select v_room_id, v_code;
end;
$$;

-- ----------------------------
-- join_room: requires display_name + role_id, seeds character, hard cap 3
-- ----------------------------
drop function if exists public.join_room(text, public.player_id);
create or replace function public.join_room(
  p_code text,
  p_player_id public.player_id default null,
  p_display_name text default null,
  p_role_id public.role_id default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_joined_player_count int := 0;
  v_assigned_player_id public.player_id;
  v_trimmed_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_trimmed_name := trim(coalesce(p_display_name, ''));
  if v_trimmed_name = '' then
    raise exception 'Name is required';
  end if;
  if v_trimmed_name ~ '[[:space:]]' then
    raise exception 'Name cannot contain spaces';
  end if;
  if char_length(v_trimmed_name) > 20 then
    raise exception 'Name must be 20 characters or fewer';
  end if;

  if p_role_id is null then
    raise exception 'Role is required';
  end if;

  select r.id
  into v_room_id
  from public.rooms r
  where r.code = upper(trim(p_code))
    and r.status <> 'finished'
  for update;

  if v_room_id is null then
    raise exception 'Room not found';
  end if;

  -- Already in room? Just return
  if exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and rp.user_id = v_user_id
  ) then
    return v_room_id;
  end if;

  -- Hard cap: 3 players max
  select count(*)
  into v_joined_player_count
  from public.room_players rp
  where rp.room_id = v_room_id;

  if v_joined_player_count >= 3 then
    raise exception 'Room is full (max 3 players)';
  end if;

  -- Check name not taken
  if exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and lower(rp.display_name) = lower(v_trimmed_name)
  ) then
    raise exception 'Name is already taken in this room';
  end if;

  -- Check role not taken
  if exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and rp.role_id = p_role_id
  ) then
    raise exception 'Role is already taken in this room';
  end if;

  select slot.player_id
  into v_assigned_player_id
  from (
    values ('p1'::public.player_id), ('p2'::public.player_id), ('p3'::public.player_id)
  ) as slot(player_id)
  where not exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and rp.player_id = slot.player_id
  )
  order by case slot.player_id
    when 'p1'::public.player_id then 1
    when 'p2'::public.player_id then 2
    else 3
  end
  limit 1;

  if v_assigned_player_id is null then
    raise exception 'Room is full';
  end if;

  insert into public.room_players (room_id, player_id, user_id, role_id, display_name)
  values (v_room_id, v_assigned_player_id, v_user_id, p_role_id, v_trimmed_name);

  insert into public.characters (room_id, player_id, name, level, gold, exp, hp, hp_max)
  values (
    v_room_id, v_assigned_player_id, v_trimmed_name, 1, 0, 0,
    case p_role_id when 'warrior' then 60 when 'ranger' then 50 when 'sage' then 40 else 50 end,
    case p_role_id when 'warrior' then 60 when 'ranger' then 50 when 'sage' then 40 else 50 end
  );

  return v_room_id;
end;
$$;

-- ----------------------------
-- Relax story_start_adventure: host only needs own role
-- ----------------------------
create or replace function public.story_start_adventure(
  p_room_id uuid,
  p_start_scene_id text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_room_status public.room_status;
  v_host_role public.role_id;
  v_event_id bigint;
  v_start_scene_id text := coalesce(nullif(p_start_scene_id, ''), 's1_courtyard_gate');
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
    raise exception 'Only host can start adventure';
  end if;

  if v_room_status <> 'lobby' then
    raise exception 'Adventure already started';
  end if;

  select rp.role_id
  into v_host_role
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_host_role is null then
    raise exception 'You must pick a role before starting';
  end if;

  update public.rooms
  set status = 'in_progress'
  where id = p_room_id;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'story_reset',
    jsonb_build_object('startSceneId', v_start_scene_id)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- ----------------------------
-- cancel_adventure: revert room back to lobby (host only)
-- ----------------------------
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
