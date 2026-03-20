-- Playtest: create a room with a single screen for testing
-- Run this in Supabase SQL Editor.

begin;

create or replace function public.create_playtest(
  p_screen_type public.screen_type,
  p_bloc int default 1,
  p_display_name text default 'Tester',
  p_role_id public.role_id default 'warrior'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_screen_id uuid;
  v_base_level int;
  v_config jsonb;
  v_attempts int := 0;
  v_trimmed_name text;
  v_base_hp int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_trimmed_name := trim(coalesce(p_display_name, 'Tester'));
  v_base_level := 1 + (p_bloc - 1) * 3;

  -- Generate room code
  loop
    v_code := public.generate_room_code(6);
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Could not generate a unique room code';
    end if;
  end loop;

  -- Create room in_progress directly
  insert into public.rooms (code, host_user_id, status, current_screen_position, current_bloc)
  values (v_code, v_user_id, 'in_progress', 0, p_bloc)
  returning id into v_room_id;

  -- Create player
  insert into public.room_players (room_id, player_id, user_id, role_id, display_name)
  values (v_room_id, 'p1', v_user_id, p_role_id, v_trimmed_name);

  -- Create character with role-based HP
  v_base_hp := case p_role_id
    when 'warrior' then 60
    when 'ranger' then 50
    when 'sage' then 40
    else 50
  end;

  insert into public.characters (room_id, player_id, name, level, gold, exp, hp, hp_max)
  values (v_room_id, 'p1', v_trimmed_name, 1, 50, 0, v_base_hp, v_base_hp);

  -- Build screen config based on type
  if p_screen_type in ('combat', 'boss_fight') then
    v_config := jsonb_build_object(
      'enemyCount', case when p_screen_type = 'boss_fight' then 1 else public.random_int(2, 4) end,
      'levelRange', jsonb_build_array(v_base_level, v_base_level + 2),
      'isBoss', p_screen_type = 'boss_fight',
      'bossName', case when p_screen_type = 'boss_fight' then 'Test Boss Lv.' || (v_base_level + 4) else null end
    );
  elsif p_screen_type = 'narrative_choice' then
    v_config := jsonb_build_object(
      'prompt', 'A mysterious figure approaches... [PLAYTEST]',
      'options', jsonb_build_array(
        jsonb_build_object('id', 'a', 'text', 'Help them', 'effect', jsonb_build_object('expDelta', 15)),
        jsonb_build_object('id', 'b', 'text', 'Ignore them', 'effect', jsonb_build_object('goldDelta', 10)),
        jsonb_build_object('id', 'c', 'text', 'Rob them', 'effect', jsonb_build_object('goldDelta', 30, 'hpDelta', -10))
      )
    );
  elsif p_screen_type = 'shop' then
    v_config := jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('id', 'potion', 'name', 'Health Potion', 'cost', 20, 'effect', jsonb_build_object('hpDelta', 30)),
        jsonb_build_object('id', 'scroll', 'name', 'Scroll of Wisdom', 'cost', 25, 'effect', jsonb_build_object('expDelta', 30)),
        jsonb_build_object('id', 'elixir', 'name', 'Power Elixir', 'cost', 50, 'effect', jsonb_build_object('hpDelta', 20, 'expDelta', 40))
      )
    );
  elsif p_screen_type = 'rest' then
    v_config := jsonb_build_object('hpRestorePercent', 50);
  elsif p_screen_type = 'puzzle' then
    v_config := jsonb_build_object(
      'puzzleId', 'test_riddle',
      'timeLimit', 30,
      'reward', jsonb_build_object('expDelta', 25, 'goldDelta', 15),
      'penalty', jsonb_build_object('hpDelta', -15)
    );
  else
    v_config := '{}'::jsonb;
  end if;

  -- Create single adventure screen
  insert into public.adventure_screens (room_id, bloc, phase, position, screen_type, config_json)
  values (v_room_id, p_bloc, 'core', 0, p_screen_type, v_config)
  returning id into v_screen_id;

  -- Seed enemies if combat/boss
  if p_screen_type in ('combat', 'boss_fight') then
    perform public.seed_enemies_for_screen(v_room_id, v_screen_id);
  end if;

  return v_room_id;
end;
$$;

grant execute on function public.create_playtest(public.screen_type, int, text, public.role_id) to authenticated;

commit;
