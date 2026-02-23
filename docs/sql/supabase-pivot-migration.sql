-- Questing Together pivot migration (roles + action loop)
--
-- Safe rollout:
-- 1) Deploy latest client.
-- 2) Run this migration.

begin;

create extension if not exists pgcrypto;

-- ----------------------------
-- Legacy cleanup
-- ----------------------------
alter table if exists public.rooms drop column if exists scene_id;
alter table if exists public.rooms drop column if exists resolved_option;
alter table if exists public.rooms drop column if exists pending_next_scene_id;
alter table if exists public.rooms drop column if exists is_story_ended;
alter table if exists public.rooms drop column if exists previous_scene_summary;
alter table if exists public.rooms drop column if exists first_vote_at;

alter table if exists public.room_players drop column if exists role_id;
alter table if exists public.room_players drop column if exists ap_points;
alter table if exists public.room_players drop column if exists ap_last_updated_at;

drop table if exists public.room_votes;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_votes'
  ) then
    execute 'alter publication supabase_realtime drop table public.room_votes';
  end if;
end
$$;

drop function if exists public.story_select_curse(uuid, public.curse_id);
drop function if exists public.story_mark_evidence(uuid, text, text, boolean);
drop function if exists public.story_is_valid_evidence(text, text);
drop function if exists public.story_required_evidence_for_option(text, text);

-- ----------------------------
-- Roles
-- ----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_id') then
    create type public.role_id as enum ('sage', 'warrior', 'ranger');
  end if;
end
$$;

alter table if exists public.room_players drop column if exists curse_id;
alter table if exists public.room_players add column if not exists role_id public.role_id;
alter table if exists public.room_players add column if not exists display_name text;
alter table public.room_players drop constraint if exists room_players_display_name_format;
alter table public.room_players
  add constraint room_players_display_name_format
  check (display_name is null or display_name ~ '^[^\\s]+$');
alter table if exists public.room_messages add column if not exists scene_id text;

drop index if exists uq_room_players_room_curse;
create unique index if not exists uq_room_players_room_role
on public.room_players (room_id, role_id)
where role_id is not null;
create index if not exists idx_room_messages_room_scene_player_created
on public.room_messages(room_id, scene_id, player_id, created_at desc);

-- ----------------------------
-- Room RPCs (refresh for pivot schema)
-- ----------------------------
create or replace function public.create_room(p_player_id public.player_id default 'p1')
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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
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

  insert into public.room_players (room_id, player_id, user_id)
  values (v_room_id, p_player_id, v_user_id);

  return query select v_room_id, v_code;
end;
$$;

create or replace function public.join_room(p_code text, p_player_id public.player_id)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.id
  into v_room_id
  from public.rooms r
  where r.code = upper(trim(p_code))
    and r.status <> 'finished';

  if v_room_id is null then
    raise exception 'Room not found';
  end if;

  if exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and rp.user_id = v_user_id
  ) then
    return v_room_id;
  end if;

  if exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room_id
      and rp.player_id = p_player_id
  ) then
    raise exception 'Player slot % is already taken in this room', p_player_id;
  end if;

  insert into public.room_players (room_id, player_id, user_id)
  values (v_room_id, p_player_id, v_user_id);

  return v_room_id;
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_removed int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  get diagnostics v_removed = row_count;

  if v_removed > 0 then
    delete from public.rooms r
    where r.id = p_room_id
      and not exists (
        select 1 from public.room_players rp2 where rp2.room_id = r.id
      );
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.send_room_message(
  p_room_id uuid,
  p_scene_id text,
  p_text text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_reset_at timestamptz;
  v_message_count int;
  v_message_id bigint;
  v_trimmed_text text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  v_trimmed_text := regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g');
  if v_trimmed_text = '' then
    raise exception 'Message cannot be empty';
  end if;

  if char_length(v_trimmed_text) > 30 then
    raise exception 'Message exceeds 30 characters';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id is distinct from v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  select coalesce(max(re.created_at), '-infinity'::timestamptz)
  into v_reset_at
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'story_reset';

  select count(*)
  into v_message_count
  from public.room_messages rm
  where rm.room_id = p_room_id
    and rm.scene_id = p_scene_id
    and rm.kind = 'player'
    and rm.player_id = v_player_id
    and rm.created_at > v_reset_at;

  if v_message_count >= 4 then
    raise exception 'Mind-bond message limit reached for this scene';
  end if;

  insert into public.room_messages (room_id, scene_id, kind, player_id, text)
  values (p_room_id, p_scene_id, 'player', v_player_id, v_trimmed_text)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

-- ----------------------------
-- Story helper functions
-- ----------------------------
create or replace function public.story_next_scene_id(p_scene_id text)
returns text
language sql
immutable
as $$
  select case p_scene_id
    when 's1_courtyard_gate' then 's2_audience'
    when 's2_audience' then 's3_legendarium'
    when 's3_legendarium' then 's3_rest_wayhouse'
    when 's3_rest_wayhouse' then 's4_reliquary'
    when 's4_reliquary' then 's5_council'
    when 's5_council' then 'ending_reconciliation'
    else null
  end;
$$;

create or replace function public.story_last_reset_id(p_room_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(re.id), 0)
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'story_reset';
$$;

create or replace function public.story_current_scene_id(p_room_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_current_scene_id text := 's1_courtyard_gate';
  v_start_scene_id text;
  v_next_scene_id text;
  v_reset_id bigint;
  rec record;
begin
  v_reset_id := public.story_last_reset_id(p_room_id);
  select re.payload_json->>'startSceneId'
  into v_start_scene_id
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'story_reset'
  order by re.id desc
  limit 1;

  if v_start_scene_id is not null and v_start_scene_id <> '' then
    v_current_scene_id := v_start_scene_id;
  end if;

  for rec in
    select re.payload_json->>'sceneId' as scene_id,
           re.payload_json->>'nextSceneId' as next_scene_id
    from public.room_events re
    where re.room_id = p_room_id
      and re.id > v_reset_id
      and re.type = 'scene_advance'
    order by re.id asc
  loop
    if rec.scene_id = v_current_scene_id then
      v_next_scene_id := rec.next_scene_id;
      if v_next_scene_id is null then
        v_next_scene_id := public.story_next_scene_id(v_current_scene_id);
      end if;
      if v_next_scene_id is not null then
        v_current_scene_id := v_next_scene_id;
      end if;
    end if;
  end loop;

  return v_current_scene_id;
end;
$$;

-- ----------------------------
-- Story RPCs (server-authoritative)
-- ----------------------------
create or replace function public.story_select_role(
  p_room_id uuid,
  p_role_id public.role_id
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_status public.room_status;
  v_local_player_id public.player_id;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'lobby' then
    raise exception 'Role selection is only available in lobby';
  end if;

  select rp.player_id
  into v_local_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_local_player_id is null then
    raise exception 'Not a room member';
  end if;

  if exists (
    select 1
    from public.room_players rp
    where rp.room_id = p_room_id
      and rp.role_id = p_role_id
      and rp.user_id <> v_user_id
  ) then
    raise exception 'Role already taken';
  end if;

  update public.room_players rp
  set role_id = p_role_id
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  return true;
end;
$$;

create or replace function public.story_set_display_name(
  p_room_id uuid,
  p_display_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_status public.room_status;
  v_trimmed text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  v_trimmed := trim(coalesce(p_display_name, ''));
  if v_trimmed = '' then
    raise exception 'Name cannot be empty';
  end if;
  if v_trimmed ~ '\\s' then
    raise exception 'Name cannot contain spaces';
  end if;
  if char_length(v_trimmed) > 20 then
    raise exception 'Name must be 20 characters or fewer';
  end if;

  update public.room_players
  set display_name = v_trimmed,
      updated_at = now()
  where room_id = p_room_id
    and user_id = v_user_id;

  return true;
end;
$$;

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
  v_player_count int;
  v_assigned_count int;
  v_unique_roles int;
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

  select count(*),
         count(*) filter (where rp.role_id is not null),
         count(distinct rp.role_id)
  into v_player_count, v_assigned_count, v_unique_roles
  from public.room_players rp
  where rp.room_id = p_room_id;

  if v_player_count <> 3 then
    raise exception 'Adventure requires exactly 3 players';
  end if;

  if v_assigned_count <> 3 or v_unique_roles <> 3 then
    raise exception 'All 3 roles must be uniquely assigned before start';
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

create or replace function public.story_take_action(
  p_room_id uuid,
  p_scene_id text,
  p_step_id text,
  p_action_id text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_action_count int;
  v_event_id bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  if p_action_id = 'no_reaction' then
    if not exists (
      select 1
      from public.room_events re
      where re.room_id = p_room_id
        and re.type = 'scene_action'
        and re.payload_json->>'sceneId' = p_scene_id
        and re.payload_json->>'stepId' = p_step_id
    ) then
      raise exception 'Cannot skip before any action is taken';
    end if;
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_action'
      and re.payload_json->>'sceneId' = p_scene_id
      and re.payload_json->>'stepId' = p_step_id
      and re.payload_json->>'playerId' = v_player_id::text
  ) then
    return null;
  end if;

  select count(distinct re.payload_json->>'playerId')
  into v_action_count
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_action'
    and re.payload_json->>'sceneId' = p_scene_id
    and re.payload_json->>'stepId' = p_step_id;

  if v_action_count >= 3 then
    raise exception 'Scene step already complete';
  end if;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'scene_action',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'stepId', p_step_id,
      'actionId', p_action_id,
      'playerId', v_player_id::text
    )
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.story_confirm_option(
  p_room_id uuid,
  p_scene_id text,
  p_step_id text,
  p_option_id text,
  p_next_scene_id text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_confirm_event_id bigint;
  v_action_count int := 0;
  v_vote_count int := 0;
  v_top_count int := 0;
  v_tied_options text[];
  v_resolved_option text;
  v_resolved_next_scene_id text;
  v_resolution_mode text := 'majority';
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  if p_option_id not in ('A', 'B', 'C') then
    raise exception 'Invalid option';
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_resolve'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    return null;
  end if;

  select count(distinct re.payload_json->>'playerId')
  into v_action_count
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_action'
    and re.payload_json->>'sceneId' = p_scene_id
    and re.payload_json->>'stepId' = p_step_id;

  if v_action_count < 3 then
    raise exception 'Waiting for all reactions before voting';
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'option_confirm'
      and re.payload_json->>'sceneId' = p_scene_id
      and re.payload_json->>'playerId' = v_player_id::text
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'option_confirm'
      and re.payload_json->>'sceneId' = p_scene_id
      and re.payload_json->>'optionId' = p_option_id
      and coalesce(re.payload_json->>'nextSceneId', '') <> coalesce(p_next_scene_id, '')
  ) then
    raise exception 'Mismatched next scene for option';
  end if;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'option_confirm',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'optionId', p_option_id,
      'playerId', v_player_id::text,
      'nextSceneId', p_next_scene_id
    )
  )
  returning id into v_confirm_event_id;

  select count(*)
  into v_vote_count
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'option_confirm'
    and re.payload_json->>'sceneId' = p_scene_id;

  if v_vote_count = 3 and not exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_resolve'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    with option_counts as (
      select re.payload_json->>'optionId' as option_id, count(*) as vote_count
      from public.room_events re
      where re.room_id = p_room_id
        and re.type = 'option_confirm'
        and re.payload_json->>'sceneId' = p_scene_id
      group by re.payload_json->>'optionId'
    )
    select max(oc.vote_count) into v_top_count from option_counts oc;

    with option_counts as (
      select re.payload_json->>'optionId' as option_id, count(*) as vote_count
      from public.room_events re
      where re.room_id = p_room_id
        and re.type = 'option_confirm'
        and re.payload_json->>'sceneId' = p_scene_id
      group by re.payload_json->>'optionId'
    )
    select array_agg(oc.option_id order by oc.option_id) into v_tied_options
    from option_counts oc
    where oc.vote_count = v_top_count;

    if coalesce(array_length(v_tied_options, 1), 0) = 0 then
      raise exception 'Could not resolve votes';
    elsif array_length(v_tied_options, 1) = 1 then
      v_resolved_option := v_tied_options[1];
      v_resolution_mode := 'majority';
    else
      v_resolved_option := v_tied_options[1 + floor(random() * array_length(v_tied_options, 1))::int];
      v_resolution_mode := 'random';
    end if;

    select re.payload_json->>'nextSceneId'
    into v_resolved_next_scene_id
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'option_confirm'
      and re.payload_json->>'sceneId' = p_scene_id
      and re.payload_json->>'optionId' = v_resolved_option
    order by re.id desc
    limit 1;

    insert into public.room_events (room_id, actor_user_id, type, payload_json)
    values (
      p_room_id,
      v_user_id,
      'scene_resolve',
      jsonb_build_object(
        'sceneId', p_scene_id,
        'optionId', v_resolved_option,
        'mode', v_resolution_mode,
        'nextSceneId', v_resolved_next_scene_id
      )
    );
  end if;

  return v_confirm_event_id;
end;
$$;

create or replace function public.story_resolve_combat(
  p_room_id uuid,
  p_scene_id text,
  p_option_id text,
  p_next_scene_id text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_event_id bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_resolve'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    return null;
  end if;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'scene_resolve',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'optionId', p_option_id,
      'mode', 'combat',
      'nextSceneId', p_next_scene_id
    )
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.story_start_timer(
  p_room_id uuid,
  p_scene_id text,
  p_step_id text,
  p_duration_seconds int
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_action_count int := 0;
  v_event_id bigint;
  v_end_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Invalid timer duration';
  end if;

  select count(distinct re.payload_json->>'playerId')
  into v_action_count
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_action'
    and re.payload_json->>'sceneId' = p_scene_id
    and re.payload_json->>'stepId' = p_step_id;

  if v_action_count < 3 then
    raise exception 'Waiting for all reactions before starting timer';
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_timer_started'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    return null;
  end if;

  v_end_at := now() + make_interval(secs => p_duration_seconds);

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'scene_timer_started',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'stepId', p_step_id,
      'endAt', v_end_at,
      'durationSeconds', p_duration_seconds
    )
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.story_resolve_timed_scene(
  p_room_id uuid,
  p_scene_id text,
  p_option_id text,
  p_next_scene_id text,
  p_force boolean
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_event_id bigint;
  v_end_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status
  into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id
  into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  if exists (
    select 1
    from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_advance'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    return null;
  end if;

  select (re.payload_json->>'endAt')::timestamptz
  into v_end_at
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_timer_started'
    and re.payload_json->>'sceneId' = p_scene_id
  order by re.id desc
  limit 1;

  if v_end_at is null then
    raise exception 'Timer not started';
  end if;

  if now() < v_end_at and not coalesce(p_force, false) then
    raise exception 'Timer not complete';
  end if;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'scene_advance',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'optionId', p_option_id,
      'nextSceneId', p_next_scene_id
    )
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.story_continue_scene(
  p_room_id uuid,
  p_scene_id text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_room_status public.room_status;
  v_current_scene_id text;
  v_continue_event_id bigint;
  v_continue_count int := 0;
  v_resolved_option text;
  v_next_scene_id text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.status into v_room_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_room_status is null then
    raise exception 'Room not found';
  end if;

  if v_room_status <> 'in_progress' then
    raise exception 'Adventure not started';
  end if;

  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  v_current_scene_id := public.story_current_scene_id(p_room_id);
  if p_scene_id <> v_current_scene_id then
    raise exception 'Scene is no longer active';
  end if;

  select re.payload_json->>'optionId'
  into v_resolved_option
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_resolve'
    and re.payload_json->>'sceneId' = p_scene_id
  order by re.id desc
  limit 1;

  if v_resolved_option is null then
    raise exception 'Scene vote is not resolved yet';
  end if;

  select re.payload_json->>'nextSceneId'
  into v_next_scene_id
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_resolve'
    and re.payload_json->>'sceneId' = p_scene_id
  order by re.id desc
  limit 1;

  if exists (
    select 1 from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_continue'
      and re.payload_json->>'sceneId' = p_scene_id
      and re.payload_json->>'playerId' = v_player_id::text
  ) then
    return null;
  end if;

  insert into public.room_events (room_id, actor_user_id, type, payload_json)
  values (
    p_room_id,
    v_user_id,
    'scene_continue',
    jsonb_build_object(
      'sceneId', p_scene_id,
      'playerId', v_player_id::text
    )
  )
  returning id into v_continue_event_id;

  select count(distinct re.payload_json->>'playerId')
  into v_continue_count
  from public.room_events re
  where re.room_id = p_room_id
    and re.type = 'scene_continue'
    and re.payload_json->>'sceneId' = p_scene_id;

  if v_next_scene_id is null then
    return v_continue_event_id;
  end if;

  if v_continue_count = 3 and not exists (
    select 1 from public.room_events re
    where re.room_id = p_room_id
      and re.type = 'scene_advance'
      and re.payload_json->>'sceneId' = p_scene_id
  ) then
    insert into public.room_events (room_id, actor_user_id, type, payload_json)
    values (
      p_room_id,
      v_user_id,
      'scene_advance',
      jsonb_build_object(
        'sceneId', p_scene_id,
        'optionId', v_resolved_option,
        'nextSceneId', v_next_scene_id
      )
    );
  end if;

  return v_continue_event_id;
end;
$$;

create or replace function public.story_reset(
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
  v_event_id bigint;
  v_start_scene_id text := coalesce(nullif(p_start_scene_id, ''), 's1_courtyard_gate');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

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

grant execute on function public.story_select_role(uuid, public.role_id) to authenticated;
grant execute on function public.story_set_display_name(uuid, text) to authenticated;
grant execute on function public.story_start_adventure(uuid, text) to authenticated;
grant execute on function public.story_take_action(uuid, text, text, text) to authenticated;
grant execute on function public.story_confirm_option(uuid, text, text, text, text) to authenticated;
grant execute on function public.story_resolve_combat(uuid, text, text, text) to authenticated;
grant execute on function public.story_start_timer(uuid, text, text, int) to authenticated;
grant execute on function public.story_resolve_timed_scene(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.story_continue_scene(uuid, text) to authenticated;
grant execute on function public.story_reset(uuid, text) to authenticated;
grant execute on function public.create_room(public.player_id) to authenticated;
grant execute on function public.join_room(text, public.player_id) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.send_room_message(uuid, text, text) to authenticated;

-- ----------------------------
-- Lock down direct room_events writes
-- ----------------------------
drop policy if exists room_messages_insert_self_player on public.room_messages;
revoke insert on public.room_messages from authenticated;
drop policy if exists room_events_insert_member on public.room_events;
grant select on public.room_events to authenticated;
revoke insert on public.room_events from authenticated;
revoke update on public.room_players from authenticated;

-- ----------------------------
-- Drop legacy enum types only when unreferenced
-- ----------------------------
do $$
begin
  if exists (select 1 from pg_type where typname = 'curse_id') and not exists (
    select 1 from pg_depend d join pg_type t on t.oid = d.refobjid
    where t.typname = 'curse_id' and d.deptype = 'n'
  ) then
    execute 'drop type public.curse_id';
  end if;

  if exists (select 1 from pg_type where typname = 'scene_id') and not exists (
    select 1 from pg_depend d join pg_type t on t.oid = d.refobjid
    where t.typname = 'scene_id' and d.deptype = 'n'
  ) then
    execute 'drop type public.scene_id';
  end if;

  if exists (select 1 from pg_type where typname = 'option_id') and not exists (
    select 1 from pg_depend d join pg_type t on t.oid = d.refobjid
    where t.typname = 'option_id' and d.deptype = 'n'
  ) then
    execute 'drop type public.option_id';
  end if;
end
$$;

commit;
