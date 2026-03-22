-- Adventure loop: screens, phases, blocs
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Enums
-- ----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'screen_type') then
    create type public.screen_type as enum (
      'combat', 'narrative_choice', 'puzzle', 'shop', 'boss_fight', 'rest'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'phase_type') then
    create type public.phase_type as enum ('early', 'core', 'resolve');
  end if;
end
$$;

-- ----------------------------
-- Adventure screens table
-- ----------------------------
create table if not exists public.adventure_screens (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  bloc int not null,
  phase public.phase_type not null,
  position int not null,
  screen_type public.screen_type not null,
  config_json jsonb not null default '{}'::jsonb,
  is_completed boolean not null default false,
  result_json jsonb default null,
  created_at timestamptz not null default now(),
  unique (room_id, position)
);

create index if not exists idx_adventure_screens_room on public.adventure_screens(room_id);

-- ----------------------------
-- Add columns to rooms
-- ----------------------------
alter table public.rooms add column if not exists current_screen_position int not null default 0;
alter table public.rooms add column if not exists current_bloc int not null default 1;

-- ----------------------------
-- Add screen_id to enemies
-- ----------------------------
alter table public.enemies add column if not exists screen_id uuid references public.adventure_screens(id) on delete cascade;

-- ----------------------------
-- RLS for adventure_screens
-- ----------------------------
alter table public.adventure_screens enable row level security;

drop policy if exists adventure_screens_select_member on public.adventure_screens;
create policy adventure_screens_select_member
on public.adventure_screens
for select
to authenticated
using (public.is_room_member(room_id));

grant select on public.adventure_screens to authenticated;

-- ----------------------------
-- Realtime
-- ----------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'adventure_screens'
  ) then
    execute 'alter publication supabase_realtime add table public.adventure_screens';
  end if;
end
$$;

-- ----------------------------
-- Helper: random int in range
-- ----------------------------
create or replace function public.random_int(p_min int, p_max int)
returns int
language sql
as $$
  select p_min + floor(random() * (p_max - p_min + 1))::int;
$$;

-- ----------------------------
-- Helper: pick random screen type for core phase
-- weights: combat=3, narrative_choice=2, puzzle=1
-- ----------------------------
create or replace function public.random_core_screen_type()
returns public.screen_type
language plpgsql
as $$
declare
  v_roll int;
begin
  v_roll := public.random_int(1, 6);
  if v_roll <= 3 then return 'combat'; end if;
  if v_roll <= 5 then return 'narrative_choice'; end if;
  return 'puzzle';
end;
$$;

-- ----------------------------
-- RPC: generate_adventure
-- Creates the full sequence of screens for a room
-- ----------------------------
create or replace function public.generate_adventure(p_room_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing int;
  v_position int := 0;
  v_bloc int;
  v_total_blocs int := 3;
  v_screen_count int;
  v_base_level int;
  v_screen_type public.screen_type;
  v_config jsonb;
  i int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  -- Don't re-generate
  select count(*) into v_existing
  from public.adventure_screens
  where room_id = p_room_id;

  if v_existing > 0 then
    return v_existing;
  end if;

  for v_bloc in 1..v_total_blocs loop
    v_base_level := 1 + (v_bloc - 1) * 3;

    -- EARLY phase (bloc 1 only)
    if v_bloc = 1 then
      v_screen_count := public.random_int(1, 2);
      for i in 1..v_screen_count loop
        insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
        values (
          p_room_id, v_bloc, 'early', v_position, 'narrative_choice',
          jsonb_build_object(
            'prompt', 'You arrive at a crossroads...',
            'options', jsonb_build_array(
              jsonb_build_object('id', 'a', 'text', 'Take the safe path', 'effect', jsonb_build_object('hpDelta', 10)),
              jsonb_build_object('id', 'b', 'text', 'Take the risky path', 'effect', jsonb_build_object('goldDelta', 20))
            )
          )
        );
        v_position := v_position + 1;
      end loop;
    end if;

    -- CORE phase
    v_screen_count := public.random_int(5, 6);
    for i in 1..v_screen_count loop
      v_screen_type := public.random_core_screen_type();

      if v_screen_type = 'combat' then
        v_config := jsonb_build_object(
          'enemyCount', public.random_int(2, 4),
          'levelRange', jsonb_build_array(v_base_level, v_base_level + 2),
          'isBoss', false
        );
      elsif v_screen_type = 'narrative_choice' then
        v_config := jsonb_build_object(
          'prompt', 'A mysterious figure approaches...',
          'options', jsonb_build_array(
            jsonb_build_object('id', 'a', 'text', 'Help them', 'effect', jsonb_build_object('expDelta', 15)),
            jsonb_build_object('id', 'b', 'text', 'Ignore them', 'effect', jsonb_build_object('goldDelta', 10)),
            jsonb_build_object('id', 'c', 'text', 'Rob them', 'effect', jsonb_build_object('goldDelta', 30, 'hpDelta', -10))
          )
        );
      else
        -- puzzle
        v_config := jsonb_build_object(
          'puzzleId', 'riddle_' || v_bloc || '_' || i,
          'timeLimit', 30,
          'reward', jsonb_build_object('expDelta', 20, 'goldDelta', 15),
          'penalty', jsonb_build_object('hpDelta', -15)
        );
      end if;

      insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
      values (p_room_id, v_bloc, 'core', v_position, v_screen_type, v_config);
      v_position := v_position + 1;
    end loop;

    -- RESOLVE phase
    if v_bloc = v_total_blocs then
      -- Final boss only
      insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
      values (
        p_room_id, v_bloc, 'resolve', v_position, 'boss_fight',
        jsonb_build_object(
          'enemyCount', 1,
          'levelRange', jsonb_build_array(v_base_level + 4, v_base_level + 4),
          'isBoss', true,
          'bossName', 'lich_commander'
        )
      );
      v_position := v_position + 1;
    else
      -- Boss fight
      insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
      values (
        p_room_id, v_bloc, 'resolve', v_position, 'boss_fight',
        jsonb_build_object(
          'enemyCount', 1,
          'levelRange', jsonb_build_array(v_base_level + 4, v_base_level + 4),
          'isBoss', true,
          'bossName', 'forest_guardian'
        )
      );
      v_position := v_position + 1;

      -- Shop
      insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
      values (
        p_room_id, v_bloc, 'resolve', v_position, 'shop',
        jsonb_build_object(
          'items', jsonb_build_array(
            jsonb_build_object('id', 'potion_medium', 'name', 'potion_medium', 'cost', 20, 'effect', jsonb_build_object('hpDelta', 30)),
            jsonb_build_object('id', 'elixir', 'name', 'elixir', 'cost', 40, 'effect', jsonb_build_object('expDelta', 50))
          )
        )
      );
      v_position := v_position + 1;

      -- Rest
      insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
      values (
        p_room_id, v_bloc, 'resolve', v_position, 'rest',
        jsonb_build_object('hpRestorePercent', 50)
      );
      v_position := v_position + 1;
    end if;

  end loop;

  -- Set room to first screen
  update public.rooms
  set current_screen_position = 0, current_bloc = 1
  where id = p_room_id;

  return v_position;
end;
$$;

grant execute on function public.generate_adventure(uuid) to authenticated;

-- ----------------------------
-- RPC: seed_enemies_for_screen
-- Seeds enemies for a specific combat/boss screen
-- ----------------------------
create or replace function public.seed_enemies_for_screen(
  p_room_id uuid,
  p_screen_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb;
  v_screen_type public.screen_type;
  v_bloc int;
  v_enemy_count int;
  v_level_min int;
  v_level_max int;
  v_is_boss boolean;
  v_boss_name text;
  v_existing int;
  v_names text[] := array[
    'goule', 'goule_massive', 'squelette', 'squelette_archer',
    'loup_noir', 'araignee_geante', 'bandit', 'spectre',
    'ogre', 'gobelin', 'rat_geant', 'chauve_souris',
    'slime', 'troll', 'ombre_errante'
  ];
  v_name text;
  v_level int;
  v_hp int;
  v_attack int;
  i int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Don't re-seed
  select count(*) into v_existing
  from public.enemies
  where room_id = p_room_id and screen_id = p_screen_id;

  if v_existing > 0 then
    return v_existing;
  end if;

  select s.config_json, s.screen_type, s.bloc
  into v_config, v_screen_type, v_bloc
  from public.adventure_screens s
  where s.id = p_screen_id and s.room_id = p_room_id;

  if v_config is null then
    raise exception 'Screen not found';
  end if;

  v_enemy_count := coalesce((v_config->>'enemyCount')::int, 3);
  v_level_min := coalesce((v_config->'levelRange'->>0)::int, 1);
  v_level_max := coalesce((v_config->'levelRange'->>1)::int, 3);
  v_is_boss := coalesce((v_config->>'isBoss')::boolean, false);
  v_boss_name := v_config->>'bossName';

  for i in 0..v_enemy_count - 1 loop
    if v_is_boss then
      v_name := coalesce(v_boss_name, 'Boss');
      v_level := v_level_max;
      v_hp := v_level * 8 * 3;
      v_attack := v_level * 2 + floor(v_level * 1.5)::int;
    else
      v_name := v_names[1 + floor(random() * array_length(v_names, 1))::int];
      v_level := public.random_int(v_level_min, v_level_max);
      v_hp := v_level * 8 + floor(random() * v_level * 4)::int;
      v_attack := v_level * 2 + floor(random() * v_level)::int;
    end if;

    insert into public.enemies (room_id, screen_id, position, name, level, hp, hp_max, attack)
    values (p_room_id, p_screen_id, i, v_name, v_level, v_hp, v_hp, v_attack);
  end loop;

  return v_enemy_count;
end;
$$;

grant execute on function public.seed_enemies_for_screen(uuid, uuid) to authenticated;

-- ----------------------------
-- RPC: advance_screen
-- Marks current screen completed, moves to next
-- ----------------------------
create or replace function public.advance_screen(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_current_pos int;
  v_current_screen_id uuid;
  v_next_screen record;
  v_total_screens int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.host_user_id, r.current_screen_position
  into v_host_id, v_current_pos
  from public.rooms r
  where r.id = p_room_id
  for update;

  if v_host_id is null then
    raise exception 'Room not found';
  end if;

  if v_host_id <> v_user_id then
    raise exception 'Only host can advance';
  end if;

  -- Mark current screen completed
  update public.adventure_screens
  set is_completed = true
  where room_id = p_room_id and position = v_current_pos
  returning id into v_current_screen_id;

  -- Check if there's a next screen
  select count(*) into v_total_screens
  from public.adventure_screens
  where room_id = p_room_id;

  if v_current_pos + 1 >= v_total_screens then
    -- Adventure complete
    update public.rooms
    set status = 'finished'
    where id = p_room_id;

    return jsonb_build_object('finished', true);
  end if;

  -- Advance to next screen
  update public.rooms
  set current_screen_position = v_current_pos + 1,
      current_bloc = coalesce(
        (select s.bloc from public.adventure_screens s where s.room_id = p_room_id and s.position = v_current_pos + 1),
        current_bloc
      )
  where id = p_room_id;

  -- Get next screen info
  select s.id, s.screen_type, s.config_json, s.bloc, s.phase, s.position
  into v_next_screen
  from public.adventure_screens s
  where s.room_id = p_room_id and s.position = v_current_pos + 1;

  -- Clean up old enemies before seeding new ones
  delete from public.enemies where room_id = p_room_id and screen_id = v_current_screen_id;

  -- Auto-seed enemies if next screen is combat or boss
  if v_next_screen.screen_type in ('combat', 'boss_fight') then
    perform public.seed_enemies_for_screen(p_room_id, v_next_screen.id);
  end if;

  return jsonb_build_object(
    'finished', false,
    'screenId', v_next_screen.id,
    'screenType', v_next_screen.screen_type,
    'bloc', v_next_screen.bloc,
    'phase', v_next_screen.phase,
    'position', v_next_screen.position
  );
end;
$$;

grant execute on function public.advance_screen(uuid) to authenticated;

-- Fix unique constraint: per screen, not per room
alter table public.enemies drop constraint if exists enemies_room_id_position_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enemies_room_screen_position_key'
  ) then
    alter table public.enemies add constraint enemies_room_screen_position_key unique (room_id, screen_id, position);
  end if;
end
$$;

commit;
