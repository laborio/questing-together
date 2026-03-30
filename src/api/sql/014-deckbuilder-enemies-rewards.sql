-- Deckbuilder: enemy templates, seed function, intent system, bot AI, rewards
-- Run this in Supabase SQL Editor AFTER 013-spell-combat.sql.

begin;

-- ----------------------------
-- Enemy template definitions (server-side)
-- ----------------------------

create table if not exists public.enemy_templates (
  id text primary key,
  name text not null,
  base_hp int not null,
  base_strength int not null default 0,
  icon text not null default '',
  scaling_per_fight numeric not null default 1.2,
  strength_scaling numeric not null default 0.5,
  intent_pattern int[] not null default '{0,2,0,3,0,4}'
);

insert into public.enemy_templates (id, name, base_hp, base_strength, icon, scaling_per_fight, strength_scaling, intent_pattern) values
  ('hollow-scout', 'Hollow Scout', 66, 1, '👻', 1.22, 0.6, '{0,2,0,3,0,4}'),
  ('bone-guardian', 'Bone Guardian', 90, 1, '💀', 1.26, 0.6, '{2,0,3,1,2,0}'),
  ('plague-rat', 'Plague Rat', 45, 0, '🐀', 1.15, 0.3, '{0,4,0,6,0,4}'),
  ('shadow-fiend', 'Shadow Fiend', 70, 1, '👁️', 1.3, 0.5, '{4,0,7,0,1,4}'),
  ('iron-golem', 'Iron Golem', 120, 2, '🗿', 1.2, 1.0, '{2,3,0,2,1,5}'),
  ('dread-warden', 'Dread Warden', 200, 2, '⚔️', 1.15, 1.0, '{0,2,1,3,0,4,6,0,5,7,2,1}'),
  ('chaos-wyrm', 'Chaos Wyrm', 280, 3, '🐉', 1.0, 0.0, '{5,3,6,1,0,7,3,5,1,6}'),
  ('pine-wolf', 'Pine Wolf', 70, 1, '🐺', 1.16, 0.6, '{0,6,4,0,5,3}'),
  ('road-blackguard', 'Road Blackguard', 92, 2, '🪖', 1.12, 0.8, '{0,5,2,1,0,6}'),
  ('reed-stalker', 'Reed Stalker', 104, 2, '🪶', 1.12, 0.7, '{4,0,6,1,5,0}'),
  ('totem-warden', 'Totem Warden', 128, 2, '🗿', 1.08, 0.8, '{2,5,1,0,6,4}'),
  ('crossroad-reaver', 'Crossroad Reaver', 122, 2, '🪓', 1.14, 0.9, '{0,6,2,1,0,4}'),
  ('bridge-keeper-drog', 'Bridge Keeper Drog', 188, 3, '⛓️', 1.1, 1.0, '{2,0,5,1,3,0,6}'),
  ('ogre-lord', 'Ogre Lord', 305, 4, '👹', 1.02, 0.6, '{3,0,5,1,6,0,7,2}')
on conflict (id) do nothing;

-- ----------------------------
-- Rewrite: seed_enemies_for_screen
-- Now spawns into enemy_combat_state with template scaling
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
  v_is_boss boolean;
  v_boss_name text;
  v_existing int;
  v_fight_number int;
  v_template_id text;
  v_template record;
  v_hp int;
  v_strength int;
  v_hp_mult numeric;
  v_template_ids text[];
  i int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Don't re-seed
  select count(*) into v_existing
  from public.enemy_combat_state
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

  v_enemy_count := coalesce((v_config->>'enemyCount')::int, 2);
  v_is_boss := coalesce((v_config->>'isBoss')::boolean, false);
  v_boss_name := v_config->>'bossName';
  v_fight_number := greatest(1, v_bloc);

  -- Pick template IDs based on boss/normal
  v_template_ids := '{}';
  if v_is_boss then
    -- Boss encounters use heavier templates
    v_template_ids := array['dread-warden', 'chaos-wyrm', 'bridge-keeper-drog', 'ogre-lord'];
  else
    -- Normal encounters pick from standard pool
    v_template_ids := array['hollow-scout', 'bone-guardian', 'plague-rat', 'shadow-fiend', 'iron-golem',
                            'pine-wolf', 'road-blackguard', 'reed-stalker', 'totem-warden', 'crossroad-reaver'];
  end if;

  for i in 0..v_enemy_count - 1 loop
    -- Pick random template
    v_template_id := v_template_ids[1 + floor(random() * array_length(v_template_ids, 1))::int];

    -- Override with boss name if boss
    if v_is_boss and v_boss_name is not null then
      -- Use the first boss template but with the specified name
      v_template_id := v_template_ids[1 + floor(random() * array_length(v_template_ids, 1))::int];
    end if;

    -- Lookup template
    select * into v_template from public.enemy_templates where id = v_template_id;

    if v_template is null then
      -- Fallback
      select * into v_template from public.enemy_templates limit 1;
    end if;

    -- Scale HP: baseHp * scalingPerFight^(fightNumber-1)
    v_hp_mult := power(v_template.scaling_per_fight, v_fight_number - 1);
    v_hp := floor(v_template.base_hp * v_hp_mult)::int;

    -- Scale strength: baseStrength + strengthScaling * (fightNumber-1)
    v_strength := floor(v_template.base_strength + v_template.strength_scaling * (v_fight_number - 1))::int;

    -- Boss name override
    insert into public.enemy_combat_state (
      room_id, screen_id, template_id, name, icon, position,
      hp, hp_max, strength, block, intent_index, is_dead
    ) values (
      p_room_id, p_screen_id, v_template.id,
      case when v_is_boss and v_boss_name is not null and i = 0 then v_boss_name else v_template.name end,
      v_template.icon, i,
      v_hp, v_hp, v_strength, 0, 0, false
    );
  end loop;

  -- Init combat turn
  perform public.combat_init_turn(p_room_id, p_screen_id);

  return v_enemy_count;
end;
$$;

-- ----------------------------
-- Intent definitions (server-side reference)
-- Maps intent index → type, base_value, hits
-- ----------------------------
-- 0=attack(10), 1=heavy_attack(20), 2=defend(14), 3=buff(+3str),
-- 4=debuff(2 weak), 5=charge_attack(32), 6=multi_hit(5x4), 7=lifesteal(10)

-- ----------------------------
-- Rewrite: combat_enemy_phase with full intent system
-- ----------------------------

create or replace function public.combat_enemy_phase(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_turn_id uuid;
  v_screen_id uuid;
  v_turn_number int;
  v_enemy record;
  v_template record;
  v_pcs record;
  v_attacks jsonb := '[]'::jsonb;
  v_party_wiped boolean := false;
  v_intent_idx int;
  v_intent_type text;
  v_intent_value int;
  v_intent_hits int;
  v_weakenMult numeric;
  v_raw_damage int;
  v_actual_damage int;
  v_blocked int;
  v_pattern int[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select ct.id, ct.screen_id, ct.turn_number into v_turn_id, v_screen_id, v_turn_number
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'enemy';

  if v_turn_id is null then
    raise exception 'Not in enemy phase';
  end if;

  -- Process burn DOT on enemies
  for v_enemy in
    select ecs.id, ecs.hp, ecs.burn from public.enemy_combat_state ecs
    where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false and ecs.burn > 0
  loop
    update public.enemy_combat_state
    set hp = greatest(0, hp - v_enemy.burn), burn = greatest(0, burn - 1)
    where id = v_enemy.id;
    if v_enemy.hp - v_enemy.burn <= 0 then
      update public.enemy_combat_state set is_dead = true where id = v_enemy.id;
    end if;
    v_attacks := v_attacks || jsonb_build_object('enemyId', v_enemy.id, 'type', 'burn', 'damage', v_enemy.burn);
  end loop;

  -- Reset enemy block
  update public.enemy_combat_state set block = 0
  where room_id = p_room_id and screen_id = v_screen_id and is_dead = false;

  -- Each alive enemy acts based on intent pattern
  for v_enemy in
    select ecs.* from public.enemy_combat_state ecs
    where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
    order by ecs.position asc
  loop
    -- Get intent pattern from template
    select et.intent_pattern into v_pattern
    from public.enemy_templates et where et.id = v_enemy.template_id;

    if v_pattern is null then
      v_pattern := '{0,2,0,3,0,4}';
    end if;

    -- Current intent from pattern (cycling)
    v_intent_idx := v_pattern[1 + (v_enemy.intent_index % array_length(v_pattern, 1))];

    -- Map intent index to type/value
    -- 0=attack(10), 1=heavy(20), 2=defend(14), 3=buff(3), 4=debuff(2), 5=charge(32), 6=multi(5x4), 7=lifesteal(10)
    v_intent_hits := 1;
    case v_intent_idx
      when 0 then v_intent_type := 'attack'; v_intent_value := 10;
      when 1 then v_intent_type := 'heavy_attack'; v_intent_value := 20;
      when 2 then v_intent_type := 'defend'; v_intent_value := 14;
      when 3 then v_intent_type := 'buff'; v_intent_value := 3;
      when 4 then v_intent_type := 'debuff'; v_intent_value := 2;
      when 5 then v_intent_type := 'charge_attack'; v_intent_value := 32;
      when 6 then v_intent_type := 'multi_hit'; v_intent_value := 5; v_intent_hits := 4;
      when 7 then v_intent_type := 'lifesteal'; v_intent_value := 10;
      else v_intent_type := 'attack'; v_intent_value := 10;
    end case;

    v_weakenMult := case when v_enemy.weakened > 0 then 0.75 else 1.0 end;

    -- Execute intent
    if v_intent_type in ('attack', 'heavy_attack', 'charge_attack', 'multi_hit', 'lifesteal') then
      -- Damage-dealing intents: apply to all alive players
      for v_pcs in
        select pcs.id, pcs.player_id, pcs.block, pcs.vulnerable, pcs.thorns
        from public.player_combat_state pcs
        join public.characters c on c.room_id = p_room_id and c.player_id = pcs.player_id
        where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id and c.hp > 0
      loop
        declare
          v_hit int;
          v_total_dmg int := 0;
          v_current_block int := v_pcs.block;
          v_player_hp int;
        begin
          -- Get current HP for break check
          select c.hp into v_player_hp
          from public.characters c
          where c.room_id = p_room_id and c.player_id = v_pcs.player_id;

          for v_hit in 1..v_intent_hits loop
            -- Skip if player already dead
            if v_player_hp <= 0 then exit; end if;

            v_raw_damage := floor((v_intent_value + v_enemy.strength) * v_weakenMult)::int;

            -- Vulnerable player: +50% damage taken
            if v_pcs.vulnerable > 0 then
              v_raw_damage := (v_raw_damage * 3) / 2;
            end if;

            -- Apply through block
            v_actual_damage := v_raw_damage;
            if v_current_block > 0 then
              v_blocked := least(v_current_block, v_actual_damage);
              v_actual_damage := v_actual_damage - v_blocked;
              v_current_block := v_current_block - v_blocked;
            end if;

            -- Apply HP damage (clamp to 0)
            if v_actual_damage > 0 then
              -- Don't deal more than remaining HP
              v_actual_damage := least(v_actual_damage, v_player_hp);
              update public.characters
              set hp = greatest(0, hp - v_actual_damage)
              where room_id = p_room_id and player_id = v_pcs.player_id;
              v_player_hp := v_player_hp - v_actual_damage;
            end if;

            v_total_dmg := v_total_dmg + v_actual_damage;

            -- Thorns: reflect damage back to enemy
            if v_pcs.thorns > 0 and v_raw_damage > 0 then
              update public.enemy_combat_state
              set hp = greatest(0, hp - v_pcs.thorns)
              where id = v_enemy.id;
              if (select hp from public.enemy_combat_state where id = v_enemy.id) <= 0 then
                update public.enemy_combat_state set is_dead = true where id = v_enemy.id;
              end if;
            end if;
          end loop;

          -- Update block
          update public.player_combat_state set block = v_current_block where id = v_pcs.id;

          -- Lifesteal: heal enemy for 50% of damage dealt
          if v_intent_type = 'lifesteal' and v_total_dmg > 0 then
            update public.enemy_combat_state
            set hp = least(hp_max, hp + (v_total_dmg / 2))
            where id = v_enemy.id;
          end if;

          v_attacks := v_attacks || jsonb_build_object(
            'enemyId', v_enemy.id, 'enemyName', v_enemy.name,
            'targetPlayerId', v_pcs.player_id,
            'type', v_intent_type,
            'damage', v_total_dmg,
            'hits', v_intent_hits
          );
        end;
      end loop;

    elsif v_intent_type = 'defend' then
      update public.enemy_combat_state
      set block = block + v_intent_value
      where id = v_enemy.id;
      v_attacks := v_attacks || jsonb_build_object('enemyId', v_enemy.id, 'type', 'defend', 'value', v_intent_value);

    elsif v_intent_type = 'buff' then
      update public.enemy_combat_state
      set strength = strength + v_intent_value
      where id = v_enemy.id;
      v_attacks := v_attacks || jsonb_build_object('enemyId', v_enemy.id, 'type', 'buff', 'value', v_intent_value);

    elsif v_intent_type = 'debuff' then
      -- Apply weakened to all players
      update public.player_combat_state
      set weakened = weakened + v_intent_value
      where room_id = p_room_id and screen_id = v_screen_id;
      v_attacks := v_attacks || jsonb_build_object('enemyId', v_enemy.id, 'type', 'debuff', 'value', v_intent_value);
    end if;

    -- Advance intent index
    update public.enemy_combat_state
    set intent_index = intent_index + 1
    where id = v_enemy.id;

    -- Early exit if party wiped after this enemy's turn
    if not exists (
      select 1 from public.characters c where c.room_id = p_room_id and c.hp > 0
    ) then
      v_party_wiped := true;
      exit;  -- Break out of enemy loop
    end if;

    -- Strength escalation: +1 every 4 turns
    if v_turn_number > 0 and v_turn_number % 4 = 0 then
      update public.enemy_combat_state
      set strength = strength + 1
      where id = v_enemy.id;
    end if;
  end loop;

  -- Decrement player status effects
  update public.player_combat_state
  set vulnerable = greatest(0, vulnerable - 1),
      weakened = greatest(0, weakened - 1),
      thorns = 0  -- thorns reset each turn
  where room_id = p_room_id and screen_id = v_screen_id;

  -- Decrement enemy status effects
  update public.enemy_combat_state
  set vulnerable = greatest(0, vulnerable - 1),
      weakened = greatest(0, weakened - 1)
  where room_id = p_room_id and screen_id = v_screen_id and is_dead = false;

  -- Apply regen to players
  for v_pcs in
    select pcs.player_id, pcs.regen from public.player_combat_state pcs
    where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id and pcs.regen > 0
  loop
    update public.characters
    set hp = least(hp_max, hp + v_pcs.regen)
    where room_id = p_room_id and player_id = v_pcs.player_id;
    -- Regen decrements
    update public.player_combat_state
    set regen = greatest(0, regen - 1)
    where room_id = p_room_id and screen_id = v_screen_id and player_id = v_pcs.player_id;
  end loop;

  -- Check party wipe
  select not exists (
    select 1 from public.characters c where c.room_id = p_room_id and c.hp > 0
  ) into v_party_wiped;

  if v_party_wiped then
    update public.combat_turns set phase = 'resolved' where id = v_turn_id;
    return jsonb_build_object('partyWiped', true, 'turnNumber', v_turn_number, 'attacks', v_attacks);
  end if;

  -- Check all enemies dead → victory
  if not exists (
    select 1 from public.enemy_combat_state
    where room_id = p_room_id and screen_id = v_screen_id and is_dead = false
  ) then
    update public.combat_turns set phase = 'resolved' where id = v_turn_id;
    return jsonb_build_object('partyWiped', false, 'victory', true, 'turnNumber', v_turn_number, 'attacks', v_attacks);
  end if;

  -- Next turn
  update public.combat_turns
  set turn_number = v_turn_number + 1, phase = 'player'
  where id = v_turn_id;

  update public.player_turn_state
  set actions_remaining = 0, has_ended_turn = false
  where combat_turn_id = v_turn_id;

  -- New turn: reset energy, block, draw new hand
  for v_pcs in
    select pcs.id, pcs.draw_pile, pcs.hand, pcs.discard_pile, pcs.max_energy, pcs.starting_block
    from public.player_combat_state pcs
    where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id
  loop
    declare
      v_new_discard jsonb := v_pcs.discard_pile || v_pcs.hand;
      v_draw_result jsonb;
    begin
      v_draw_result := public._draw_hand(v_pcs.draw_pile, v_new_discard, 5);
      update public.player_combat_state
      set energy = v_pcs.max_energy,
          block = v_pcs.starting_block,
          hand = v_draw_result->'hand',
          draw_pile = v_draw_result->'drawPile',
          discard_pile = '[]'::jsonb,
          attune_target_trait = null
      where id = v_pcs.id;
    end;
  end loop;

  return jsonb_build_object('partyWiped', false, 'victory', false, 'turnNumber', v_turn_number + 1, 'attacks', v_attacks);
end;
$$;

grant execute on function public.combat_enemy_phase(uuid) to authenticated;

-- ----------------------------
-- RPC: combat_bot_turn (deckbuilder version)
-- Bot plays cards from hand using simple AI priority
-- ----------------------------

drop function if exists public.combat_bot_turn(uuid, public.player_id);
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
  v_screen_id uuid;
  v_pcs record;
  v_bot_hp int;
  v_bot_hp_max int;
  v_action_log jsonb := '[]'::jsonb;
  v_best_idx int;
  v_best_priority int;
  v_card_instance jsonb;
  v_card record;
  v_card_idx int;
  v_target_enemy_idx int;
  v_result jsonb;
  v_iteration int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.host_user_id into v_host_id from public.rooms r where r.id = p_room_id;
  if v_host_id <> v_user_id then
    raise exception 'Only host can run bot turns';
  end if;

  select rp.is_bot into v_is_bot
  from public.room_players rp
  where rp.room_id = p_room_id and rp.player_id = p_bot_player_id;

  if not v_is_bot then
    raise exception 'Player is not a bot';
  end if;

  select ct.id, ct.screen_id into v_turn_id, v_screen_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  select c.hp, c.hp_max into v_bot_hp, v_bot_hp_max
  from public.characters c
  where c.room_id = p_room_id and c.player_id = p_bot_player_id;

  if v_bot_hp <= 0 then
    update public.player_turn_state set has_ended_turn = true
    where combat_turn_id = v_turn_id and player_id = p_bot_player_id;
    return jsonb_build_object('actions', v_action_log, 'dead', true);
  end if;

  -- Find lowest HP alive enemy
  select ecs.position into v_target_enemy_idx
  from public.enemy_combat_state ecs
  where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
  order by ecs.hp asc limit 1;

  -- Play cards while we have energy
  loop
    v_iteration := v_iteration + 1;
    if v_iteration > 10 then exit; end if;  -- Safety limit

    -- Refresh state
    select * into v_pcs from public.player_combat_state
    where room_id = p_room_id and screen_id = v_screen_id and player_id = p_bot_player_id;

    if jsonb_array_length(v_pcs.hand) = 0 then exit; end if;

    -- Pick best affordable card
    v_best_idx := -1;
    v_best_priority := -1;

    for v_card_idx in 0..jsonb_array_length(v_pcs.hand) - 1 loop
      v_card_instance := v_pcs.hand->v_card_idx;
      select * into v_card from public.card_definitions where id = v_card_instance->>'cardId';

      if v_card is null or v_card.cost > v_pcs.energy then continue; end if;

      declare v_priority int := 0;
      begin
        -- Low HP? Prioritize block/heal
        if v_bot_hp < v_bot_hp_max * 0.4 then
          if v_card.base_block is not null and v_card.base_block > 0 then
            v_priority := 90 + coalesce(v_card.base_block, 0);
          elsif v_card.base_heal is not null and v_card.base_heal > 0 then
            v_priority := 85 + coalesce(v_card.base_heal, 0);
          end if;
        end if;

        -- Damage cards
        if v_priority = 0 and v_card.base_damage is not null and v_card.base_damage > 0 then
          v_priority := 50 + coalesce(v_card.base_damage, 0);
        end if;

        -- Burn
        if v_priority = 0 and v_card.base_burn is not null and v_card.base_burn > 0 then
          v_priority := 40 + coalesce(v_card.base_burn, 0);
        end if;

        -- Block as fallback
        if v_priority = 0 and v_card.base_block is not null and v_card.base_block > 0 then
          v_priority := 30 + coalesce(v_card.base_block, 0);
        end if;

        -- Anything else
        if v_priority = 0 then v_priority := 10; end if;

        if v_priority > v_best_priority then
          v_best_priority := v_priority;
          v_best_idx := v_card_idx;
        end if;
      end;
    end loop;

    if v_best_idx < 0 then exit; end if;  -- No affordable cards

    -- Play the card via the RPC (simplified: inline the effect)
    v_card_instance := v_pcs.hand->v_best_idx;
    select * into v_card from public.card_definitions where id = v_card_instance->>'cardId';

    declare
      v_dmg int := coalesce(v_card.base_damage, 0);
      v_blk int := coalesce(v_card.base_block, 0);
      v_hl int := coalesce(v_card.base_heal, 0);
      v_brn int := coalesce(v_card.base_burn, 0);
      v_new_hand jsonb;
      v_new_discard jsonb;
      v_ci jsonb := v_card_instance;
    begin
      -- Apply damage to target enemy
      if v_dmg > 0 and v_target_enemy_idx is not null then
        declare
          v_target_id uuid;
        begin
          select ecs.id into v_target_id
          from public.enemy_combat_state ecs
          where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
          order by ecs.hp asc limit 1;

          if v_target_id is not null then
            if v_card.is_aoe then
              update public.enemy_combat_state
              set hp = greatest(0, hp - v_dmg)
              where room_id = p_room_id and screen_id = v_screen_id and is_dead = false;
              update public.enemy_combat_state set is_dead = true
              where room_id = p_room_id and screen_id = v_screen_id and hp <= 0 and is_dead = false;
            else
              update public.enemy_combat_state set hp = greatest(0, hp - v_dmg) where id = v_target_id;
              if (select hp from public.enemy_combat_state where id = v_target_id) <= 0 then
                update public.enemy_combat_state set is_dead = true where id = v_target_id;
              end if;
            end if;
          end if;
        end;
      end if;

      -- Apply block
      if v_blk > 0 then
        update public.player_combat_state set block = block + v_blk where id = v_pcs.id;
      end if;

      -- Apply heal
      if v_hl > 0 then
        update public.characters set hp = least(hp_max, hp + v_hl)
        where room_id = p_room_id and player_id = p_bot_player_id;
        v_bot_hp := least(v_bot_hp_max, v_bot_hp + v_hl);
      end if;

      -- Apply burn to lowest HP enemy
      if v_brn > 0 then
        update public.enemy_combat_state
        set burn = burn + v_brn
        where id = (
          select ecs2.id from public.enemy_combat_state ecs2
          where ecs2.room_id = p_room_id and ecs2.screen_id = v_screen_id and ecs2.is_dead = false
          order by ecs2.hp asc limit 1
        );
      end if;

      -- Move card to discard
      v_new_hand := v_pcs.hand - v_best_idx;
      v_ci := jsonb_set(v_ci, '{usageCount}', to_jsonb(coalesce((v_ci->>'usageCount')::int, 0) + 1));
      v_new_discard := v_pcs.discard_pile || jsonb_build_array(v_ci);

      -- Update trait charges
      declare
        v_trait text := v_card.trait;
        v_charges jsonb := v_pcs.trait_charges;
      begin
        v_charges := jsonb_set(v_charges, array[v_trait],
          to_jsonb(least(4, coalesce((v_charges->>v_trait)::int, 0) + 1)));
        update public.player_combat_state
        set hand = v_new_hand,
            discard_pile = v_new_discard,
            energy = energy - v_card.cost,
            trait_charges = v_charges
        where id = v_pcs.id;
      end;

      v_action_log := v_action_log || jsonb_build_object(
        'action', 'spell',
        'spellId', v_card.id,
        'spellName', v_card.name,
        'damage', v_dmg,
        'block', v_blk,
        'heal', v_hl
      );
    end;
  end loop;

  -- End bot turn
  update public.player_turn_state
  set has_ended_turn = true
  where combat_turn_id = v_turn_id and player_id = p_bot_player_id;

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

-- ----------------------------
-- RPC: combat_generate_rewards
-- Generate post-combat reward choices
-- ----------------------------

create or replace function public.combat_generate_rewards(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_choices jsonb := '[]'::jsonb;
  v_upgrade_choices jsonb := '[]'::jsonb;
  v_card record;
begin
  -- Pick 3 random reward cards
  for v_card in
    select cd.id, cd.name, cd.trait, cd.description, cd.cost, cd.is_rare
    from public.card_definitions cd
    where cd.is_starter = false
    order by random()
    limit 3
  loop
    v_card_choices := v_card_choices || jsonb_build_object(
      'type', 'add_card',
      'cardId', v_card.id,
      'name', v_card.name,
      'trait', v_card.trait,
      'description', v_card.description,
      'cost', v_card.cost,
      'isRare', v_card.is_rare
    );
  end loop;

  -- Pick 3 random upgradeable cards from player's deck
  -- (simplified: just pick from starter deck)
  for v_card in
    select cd.id, cd.name, cd.upgrade_name, cd.upgrade_description
    from public.card_definitions cd
    where cd.upgrade_threshold < 99
    order by random()
    limit 3
  loop
    v_upgrade_choices := v_upgrade_choices || jsonb_build_object(
      'type', 'upgrade_card',
      'cardId', v_card.id,
      'name', v_card.name,
      'upgradeName', v_card.upgrade_name,
      'upgradeDescription', v_card.upgrade_description
    );
  end loop;

  return jsonb_build_object(
    'cardChoices', v_card_choices,
    'upgradeChoices', v_upgrade_choices,
    'bonusChoices', jsonb_build_array(
      jsonb_build_object('type', 'bonus', 'id', 'max-hp-10', 'name', '+10 Max HP', 'icon', '❤️'),
      jsonb_build_object('type', 'bonus', 'id', 'heal-15', 'name', 'Heal 15 HP', 'icon', '🧪'),
      jsonb_build_object('type', 'bonus', 'id', 'max-energy-1', 'name', '+1 Max Energy', 'icon', '⚡')
    )
  );
end;
$$;

grant execute on function public.combat_generate_rewards(uuid) to authenticated;

-- ----------------------------
-- RPC: combat_select_reward
-- Apply a chosen reward
-- ----------------------------

create or replace function public.combat_select_reward(
  p_room_id uuid,
  p_reward_type text,  -- 'add_card', 'upgrade_card', 'bonus'
  p_reward_id text     -- card_id or bonus_id
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_screen_id uuid;
  v_pcs record;
  v_card record;
  v_new_card jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id;

  select ct.screen_id into v_screen_id
  from public.combat_turns ct
  where ct.room_id = p_room_id;

  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;

  if p_reward_type = 'add_card' then
    -- Add card to player's deck (draw pile + discard)
    select * into v_card from public.card_definitions where id = p_reward_id;
    if v_card is null then
      raise exception 'Card not found';
    end if;
    v_new_card := jsonb_build_object('cardId', p_reward_id, 'upgraded', false, 'usageCount', 0);
    update public.player_combat_state
    set discard_pile = discard_pile || jsonb_build_array(v_new_card)
    where id = v_pcs.id;
    return jsonb_build_object('applied', true, 'type', 'add_card', 'cardId', p_reward_id);

  elsif p_reward_type = 'upgrade_card' then
    -- Find and upgrade the card in deck zones
    declare
      v_zone text;
      v_zones text[] := array['draw_pile', 'hand', 'discard_pile'];
      v_arr jsonb;
      v_i int;
      v_found boolean := false;
    begin
      for v_zone in select unnest(v_zones) loop
        v_arr := case v_zone
          when 'draw_pile' then v_pcs.draw_pile
          when 'hand' then v_pcs.hand
          else v_pcs.discard_pile
        end;
        for v_i in 0..jsonb_array_length(v_arr) - 1 loop
          if (v_arr->v_i->>'cardId') = p_reward_id and not coalesce((v_arr->v_i->>'upgraded')::boolean, false) then
            v_arr := jsonb_set(v_arr, array[v_i::text, 'upgraded'], 'true'::jsonb);
            v_found := true;
            exit;
          end if;
        end loop;
        if v_found then
          execute format(
            'update public.player_combat_state set %I = $1 where id = $2',
            v_zone
          ) using v_arr, v_pcs.id;
          exit;
        end if;
      end loop;
    end;
    return jsonb_build_object('applied', true, 'type', 'upgrade_card', 'cardId', p_reward_id);

  elsif p_reward_type = 'bonus' then
    if p_reward_id = 'max-hp-10' then
      update public.characters set hp_max = hp_max + 10, hp = hp + 10
      where room_id = p_room_id and player_id = v_player_id;
    elsif p_reward_id = 'max-hp-20' then
      update public.characters set hp_max = hp_max + 20, hp = hp + 20
      where room_id = p_room_id and player_id = v_player_id;
    elsif p_reward_id = 'heal-15' then
      update public.characters set hp = least(hp_max, hp + 15)
      where room_id = p_room_id and player_id = v_player_id;
    elsif p_reward_id = 'heal-30' then
      update public.characters set hp = least(hp_max, hp + 30)
      where room_id = p_room_id and player_id = v_player_id;
    elsif p_reward_id = 'max-energy-1' then
      update public.player_combat_state
      set max_energy = max_energy + 1
      where id = v_pcs.id;
    elsif p_reward_id = 'starting-block-5' then
      update public.player_combat_state
      set starting_block = starting_block + 5
      where id = v_pcs.id;
    elsif p_reward_id = 'starting-block-10' then
      update public.player_combat_state
      set starting_block = starting_block + 10
      where id = v_pcs.id;
    elsif p_reward_id = 'free-first-reroll' then
      update public.player_combat_state
      set free_reroll = true
      where id = v_pcs.id;
    end if;
    return jsonb_build_object('applied', true, 'type', 'bonus', 'bonusId', p_reward_id);
  end if;

  raise exception 'Unknown reward type: %', p_reward_type;
end;
$$;

grant execute on function public.combat_select_reward(uuid, text, text) to authenticated;

-- ----------------------------
-- Update reset_combat to clean enemy_combat_state
-- ----------------------------
drop function if exists public.reset_combat(uuid);
create or replace function public.reset_combat(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.player_combat_state where room_id = p_room_id;
  delete from public.enemy_combat_state where room_id = p_room_id;
  delete from public.combat_turns where room_id = p_room_id;
  delete from public.enemies where room_id = p_room_id;
  update public.characters set taunt_turns_left = 0 where room_id = p_room_id;
end;
$$;

commit;
