-- Bot allies for playtest mode
-- Bots auto-play during combat using AI logic
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Add is_bot column to room_players
-- ----------------------------
alter table public.room_players add column if not exists is_bot boolean not null default false;

-- Allow multiple players with same user_id (bots share host's user_id)
alter table public.room_players drop constraint if exists room_players_room_id_user_id_key;

-- ----------------------------
-- Update create_playtest to support bots
-- ----------------------------
drop function if exists public.create_playtest(public.screen_type, int, text, public.role_id, int);
create or replace function public.create_playtest(
  p_screen_type public.screen_type,
  p_bloc int default 1,
  p_display_name text default 'Tester',
  p_role_id public.role_id default 'warrior',
  p_enemy_count int default null,
  p_bot_count int default 0
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
  v_bot_roles public.role_id[] := array['warrior', 'sage', 'ranger'];
  v_bot_role public.role_id;
  v_bot_hp int;
  v_bot_names text[] := array['Aldric', 'Lyra', 'Thorne'];
  v_bot_player_ids public.player_id[] := array['p2', 'p3'];
  v_bot_index int;
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

  -- Create room
  insert into public.rooms (code, host_user_id, status, current_screen_position, current_bloc)
  values (v_code, v_user_id, 'in_progress', 0, p_bloc)
  returning id into v_room_id;

  -- Create human player
  insert into public.room_players (room_id, player_id, user_id, role_id, display_name, is_bot)
  values (v_room_id, 'p1', v_user_id, p_role_id, v_trimmed_name, false);

  v_base_hp := case p_role_id
    when 'warrior' then 60
    when 'ranger' then 50
    when 'sage' then 40
    else 50
  end;

  insert into public.characters (room_id, player_id, name, level, gold, exp, hp, hp_max)
  values (v_room_id, 'p1', v_trimmed_name, 1, 50, 0, v_base_hp, v_base_hp);

  -- Create bot players
  for v_bot_index in 1..least(p_bot_count, 2) loop
    -- Pick a role not already taken
    v_bot_role := null;
    for i in 1..array_length(v_bot_roles, 1) loop
      if v_bot_roles[i] <> p_role_id then
        -- Check not already used by another bot
        if not exists (
          select 1 from public.room_players rp
          where rp.room_id = v_room_id and rp.role_id = v_bot_roles[i]
        ) then
          v_bot_role := v_bot_roles[i];
          exit;
        end if;
      end if;
    end loop;

    if v_bot_role is null then
      v_bot_role := 'warrior'; -- fallback
    end if;

    v_bot_hp := case v_bot_role
      when 'warrior' then 60
      when 'ranger' then 50
      when 'sage' then 40
      else 50
    end;

    insert into public.room_players (room_id, player_id, user_id, role_id, display_name, is_bot)
    values (v_room_id, v_bot_player_ids[v_bot_index], v_user_id, v_bot_role, v_bot_names[v_bot_index], true);

    insert into public.characters (room_id, player_id, name, level, gold, exp, hp, hp_max)
    values (v_room_id, v_bot_player_ids[v_bot_index], v_bot_names[v_bot_index], 1, 50, 0, v_bot_hp, v_bot_hp);
  end loop;

  -- Build screen config
  if p_screen_type in ('combat', 'boss_fight') then
    v_config := jsonb_build_object(
      'enemyCount', coalesce(p_enemy_count, case when p_screen_type = 'boss_fight' then 1 else public.random_int(2, 4) end),
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

  -- Create adventure screen
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

grant execute on function public.create_playtest(public.screen_type, int, text, public.role_id, int, int) to authenticated;

-- ----------------------------
-- RPC: combat_bot_turn
-- Executes all actions for a bot player using AI logic
-- Can only be called by the host for bot players
-- ----------------------------
create or replace function public.combat_bot_turn(
  p_room_id uuid,
  p_bot_player_id public.player_id
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_is_bot boolean;
  v_turn_id uuid;
  v_bot_char record;
  v_bot_role public.role_id;
  v_actions_left int;
  v_target_enemy_id uuid;
  v_target_enemy_hp int;
  v_heal_target public.player_id;
  v_ally record;
  v_action_log jsonb := '[]'::jsonb;
  v_action text;
  v_result jsonb;
  v_hp_threshold numeric;
  v_enemy record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify host
  select r.host_user_id into v_host_id
  from public.rooms r where r.id = p_room_id;

  if v_host_id <> v_user_id then
    raise exception 'Only host can run bot turns';
  end if;

  -- Verify is bot
  select rp.is_bot, rp.role_id into v_is_bot, v_bot_role
  from public.room_players rp
  where rp.room_id = p_room_id and rp.player_id = p_bot_player_id;

  if not v_is_bot then
    raise exception 'Player is not a bot';
  end if;

  -- Get turn state
  select ct.id into v_turn_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  -- Get bot character
  select c.id, c.hp, c.hp_max, c.level, c.ability_cooldown_left, c.heal_cooldown_left
  into v_bot_char
  from public.characters c
  where c.room_id = p_room_id and c.player_id = p_bot_player_id;

  if v_bot_char.hp <= 0 then
    -- Dead bot: just end turn
    update public.player_turn_state
    set has_ended_turn = true
    where combat_turn_id = v_turn_id and player_id = p_bot_player_id;
    return jsonb_build_object('actions', v_action_log, 'dead', true);
  end if;

  -- Get actions remaining
  select pts.actions_remaining into v_actions_left
  from public.player_turn_state pts
  where pts.combat_turn_id = v_turn_id and pts.player_id = p_bot_player_id;

  -- Execute AI actions
  while v_actions_left > 0 loop
    -- Refresh bot state
    select c.hp, c.hp_max, c.ability_cooldown_left, c.heal_cooldown_left
    into v_bot_char.hp, v_bot_char.hp_max, v_bot_char.ability_cooldown_left, v_bot_char.heal_cooldown_left
    from public.characters c
    where c.room_id = p_room_id and c.player_id = p_bot_player_id;

    v_hp_threshold := v_bot_char.hp_max * 0.6;
    v_action := 'attack'; -- default

    -- Priority 1: Use ability if off cooldown
    if v_bot_char.ability_cooldown_left = 0 then
      v_action := 'ability';
    -- Priority 2: Self-heal if HP < 60%
    elsif v_bot_char.hp < v_hp_threshold and v_bot_char.heal_cooldown_left = 0 then
      v_action := 'heal_self';
    else
      -- Priority 3: Heal ally if their HP < 60% and lower than bot's HP
      v_heal_target := null;
      for v_ally in
        select c.player_id, c.hp, c.hp_max
        from public.characters c
        where c.room_id = p_room_id and c.hp > 0 and c.player_id <> p_bot_player_id
        order by c.hp asc
        limit 1
      loop
        if v_ally.hp < (v_ally.hp_max * 0.6) and v_ally.hp < v_bot_char.hp and v_bot_char.heal_cooldown_left = 0 then
          v_heal_target := v_ally.player_id;
          v_action := 'heal_ally';
        end if;
      end loop;
    end if;

    -- Find target enemy: lowest HP among front 3 alive
    v_target_enemy_id := null;
    select e.id into v_target_enemy_id
    from (
      select e2.id, e2.hp
      from public.enemies e2
      where e2.room_id = p_room_id and e2.is_dead = false
      order by e2.position asc
      limit 3
    ) e
    order by e.hp asc
    limit 1;

    -- No alive enemies? Skip combat actions
    if v_target_enemy_id is null and v_action in ('attack', 'ability') then
      -- Still allow heal actions, skip attack/ability
      if v_action in ('heal_self', 'heal_ally') then
        null; -- continue to heal
      else
        exit;
      end if;
    end if;

    -- Execute action
    if v_action = 'ability' then
      -- Warrior: taunt (no target needed), Sage: fireball, Ranger: arrows
      if v_bot_role = 'warrior' then
        update public.characters
        set taunt_turns_left = 5, ability_cooldown_left = 3
        where room_id = p_room_id and player_id = p_bot_player_id;
        v_result := jsonb_build_object('action', 'ability', 'ability', 'taunt');
      elsif v_bot_role = 'sage' then
        -- Fireball on target (skip if dead)
        if v_target_enemy_id is not null and not (select is_dead from public.enemies where id = v_target_enemy_id) then
          update public.enemies set hp = greatest(0, hp - 6) where id = v_target_enemy_id;
          if (select hp from public.enemies where id = v_target_enemy_id) <= 0 then
            update public.enemies set is_dead = true where id = v_target_enemy_id;
          end if;
        end if;
        update public.characters set ability_cooldown_left = 3
        where room_id = p_room_id and player_id = p_bot_player_id;
        v_result := jsonb_build_object('action', 'ability', 'ability', 'fireball', 'damage', 6);
      elsif v_bot_role = 'ranger' then
        -- Arrows AoE on all alive enemies
        for v_enemy in
          select e.id, e.hp from public.enemies e
          where e.room_id = p_room_id and e.is_dead = false
        loop
          update public.enemies set hp = greatest(0, hp - 3) where id = v_enemy.id;
          if v_enemy.hp - 3 <= 0 then
            update public.enemies set is_dead = true where id = v_enemy.id;
          end if;
        end loop;
        update public.characters set ability_cooldown_left = 3
        where room_id = p_room_id and player_id = p_bot_player_id;
        v_result := jsonb_build_object('action', 'ability', 'ability', 'arrows', 'damage', 3);
      end if;

    elsif v_action = 'heal_self' then
      update public.characters
      set hp = least(hp_max, hp + 10), heal_cooldown_left = 2
      where room_id = p_room_id and player_id = p_bot_player_id;
      v_result := jsonb_build_object('action', 'heal', 'target', p_bot_player_id);

    elsif v_action = 'heal_ally' then
      update public.characters
      set hp = least(hp_max, hp + 10)
      where room_id = p_room_id and player_id = v_heal_target;
      update public.characters
      set heal_cooldown_left = 2
      where room_id = p_room_id and player_id = p_bot_player_id;
      v_result := jsonb_build_object('action', 'heal', 'target', v_heal_target);

    else
      -- Attack: base 3 + (level-1), skip if target dead
      declare
        v_atk_dmg int := 3 + (v_bot_char.level - 1);
      begin
        if v_target_enemy_id is not null and not (select is_dead from public.enemies where id = v_target_enemy_id) then
          update public.enemies set hp = greatest(0, hp - v_atk_dmg) where id = v_target_enemy_id;
          if (select hp from public.enemies where id = v_target_enemy_id) <= 0 then
            update public.enemies set is_dead = true where id = v_target_enemy_id;
          end if;
          v_result := jsonb_build_object('action', 'attack', 'damage', v_atk_dmg, 'targetId', v_target_enemy_id);
        else
          v_result := jsonb_build_object('action', 'skip');
        end if;
      end;
    end if;

    -- Decrement actions
    update public.player_turn_state
    set actions_remaining = actions_remaining - 1
    where combat_turn_id = v_turn_id and player_id = p_bot_player_id;

    v_actions_left := v_actions_left - 1;
    v_action_log := v_action_log || v_result;
  end loop;

  -- End bot turn
  update public.player_turn_state
  set has_ended_turn = true
  where combat_turn_id = v_turn_id and player_id = p_bot_player_id;

  -- Check if all players have ended (to trigger enemy phase)
  if not exists (
    select 1
    from public.player_turn_state pts
    join public.characters c on c.room_id = p_room_id and c.player_id = pts.player_id
    where pts.combat_turn_id = v_turn_id and pts.has_ended_turn = false and c.hp > 0
  ) then
    update public.combat_turns set phase = 'enemy' where id = v_turn_id;
  end if;

  return jsonb_build_object('actions', v_action_log);
end;
$$;

grant execute on function public.combat_bot_turn(uuid, public.player_id) to authenticated;

commit;
