-- 017: Remove Attune mechanic, change hand size to 4
-- Attune columns kept in schema (default 0) but no longer used in logic.

-- Update _draw_hand default to 4
create or replace function public._draw_hand(
  p_draw_pile jsonb,
  p_discard_pile jsonb,
  p_hand_size int default 4
)
returns jsonb
language plpgsql
as $$
declare
  v_pile jsonb;
  v_hand jsonb := '[]'::jsonb;
  v_idx int;
  v_card jsonb;
  i int;
begin
  v_pile := p_draw_pile;

  if jsonb_array_length(v_pile) < p_hand_size then
    v_pile := public._shuffle_jsonb_array(v_pile || p_discard_pile);
  end if;

  for i in 1..least(p_hand_size, jsonb_array_length(v_pile)) loop
    v_idx := floor(random() * jsonb_array_length(v_pile))::int;
    v_card := v_pile->v_idx;
    v_hand := v_hand || jsonb_build_array(v_card);
    v_pile := v_pile - v_idx;
  end loop;

  return jsonb_build_object('hand', v_hand, 'drawPile', v_pile);
end;
$$;

-- Recreate combat_play_card WITHOUT attune params
create or replace function public.combat_play_card(
  p_room_id uuid,
  p_hand_index int,
  p_target_enemy_idx int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_turn_id uuid;
  v_screen_id uuid;
  v_pcs record;
  v_card_instance jsonb;
  v_card_id text;
  v_card record;
  v_is_upgraded boolean;
  v_damage int;
  v_block_val int;
  v_heal_val int;
  v_burn_val int;
  v_trait text;
  v_current_charge int;
  v_is_amplified boolean;
  v_new_hand jsonb;
  v_new_discard jsonb;
  v_new_charges jsonb;
  v_new_energy int;
  v_total_damage int := 0;
  v_enemy record;
  v_target_enemy record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Player not in room';
  end if;

  -- Get current combat turn
  select ct.id, ct.screen_id into v_turn_id, v_screen_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player'
  order by ct.turn_number desc limit 1;

  if v_turn_id is null then
    raise exception 'No active player phase';
  end if;

  -- Check player hasn't ended turn
  perform 1 from public.player_turn_state pts
  where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id and pts.has_ended_turn = false;
  if not found then
    raise exception 'Already ended turn';
  end if;

  -- Get player combat state
  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;

  if v_pcs is null then
    raise exception 'No combat state found';
  end if;

  -- Get card from hand
  v_card_instance := v_pcs.hand->p_hand_index;
  if v_card_instance is null then
    raise exception 'Invalid hand index';
  end if;

  v_card_id := v_card_instance->>'cardId';
  v_is_upgraded := coalesce((v_card_instance->>'upgraded')::boolean, false);

  -- Get card definition
  select * into v_card from public.card_definitions where id = v_card_id;
  if v_card is null then
    raise exception 'Card not found: %', v_card_id;
  end if;

  -- Check energy
  if v_pcs.energy < v_card.cost then
    raise exception 'Not enough energy (have %, need %)', v_pcs.energy, v_card.cost;
  end if;

  -- Determine trait to charge (no attune — always the card's own trait)
  v_trait := v_card.trait;

  -- Check empowerment
  v_current_charge := coalesce((v_pcs.trait_charges->>v_trait)::int, 0);
  v_is_amplified := v_current_charge >= 3;

  -- Resolve values
  if v_is_upgraded then
    v_damage := coalesce(v_card.upgraded_damage, v_card.base_damage, 0);
    v_block_val := coalesce(v_card.upgraded_block, v_card.base_block, 0);
    v_heal_val := coalesce(v_card.upgraded_heal, v_card.base_heal, 0);
    v_burn_val := coalesce(v_card.upgraded_burn, v_card.base_burn, 0);
  else
    v_damage := coalesce(v_card.base_damage, 0);
    v_block_val := coalesce(v_card.base_block, 0);
    v_heal_val := coalesce(v_card.base_heal, 0);
    v_burn_val := coalesce(v_card.base_burn, 0);
  end if;

  -- Amplify if empowered (+50%)
  if v_is_amplified then
    v_damage := ceil(v_damage * 1.5);
    v_block_val := ceil(v_block_val * 1.5);
    v_heal_val := ceil(v_heal_val * 1.5);
    v_burn_val := ceil(v_burn_val * 1.5);
  end if;

  -- Apply weakened (-25% damage)
  if v_pcs.weakened > 0 and v_damage > 0 then
    v_damage := ceil(v_damage * 0.75);
  end if;

  -- Apply block to self
  if v_block_val > 0 then
    update public.player_combat_state
    set block = block + v_block_val
    where id = v_pcs.id;
  end if;

  -- Apply heal to self
  if v_heal_val > 0 then
    update public.characters
    set hp = least(hp_max, hp + v_heal_val)
    where room_id = p_room_id and player_id = v_player_id;
  end if;

  -- Apply damage to enemy/enemies
  if v_damage > 0 then
    if coalesce(v_card.is_aoe, false) then
      for v_enemy in
        select * from public.enemy_combat_state
        where room_id = p_room_id and screen_id = v_screen_id and is_dead = false
        order by position
      loop
        declare
          v_actual_dmg int;
          v_vuln_mult numeric := 1;
        begin
          if v_enemy.vulnerable > 0 then v_vuln_mult := 1.5; end if;
          v_actual_dmg := ceil(v_damage * v_vuln_mult);
          if v_enemy.block > 0 then
            if v_enemy.block >= v_actual_dmg then
              update public.enemy_combat_state set block = block - v_actual_dmg where id = v_enemy.id;
              v_actual_dmg := 0;
            else
              v_actual_dmg := v_actual_dmg - v_enemy.block;
              update public.enemy_combat_state set block = 0 where id = v_enemy.id;
            end if;
          end if;
          if v_actual_dmg > 0 then
            update public.enemy_combat_state
            set hp = greatest(0, hp - v_actual_dmg),
                is_dead = (hp - v_actual_dmg <= 0)
            where id = v_enemy.id;
          end if;
          v_total_damage := v_total_damage + v_actual_dmg;
        end;
      end loop;
    else
      -- Single target
      select * into v_target_enemy
      from (
        select *, row_number() over (order by position) - 1 as idx
        from public.enemy_combat_state
        where room_id = p_room_id and screen_id = v_screen_id and is_dead = false
      ) sub
      where sub.idx = coalesce(p_target_enemy_idx, 0);

      if v_target_enemy is not null then
        declare
          v_actual_dmg int;
          v_vuln_mult numeric := 1;
        begin
          if v_target_enemy.vulnerable > 0 then v_vuln_mult := 1.5; end if;
          v_actual_dmg := ceil(v_damage * v_vuln_mult);
          if v_target_enemy.block > 0 then
            if v_target_enemy.block >= v_actual_dmg then
              update public.enemy_combat_state set block = block - v_actual_dmg where id = v_target_enemy.id;
              v_actual_dmg := 0;
            else
              v_actual_dmg := v_actual_dmg - v_target_enemy.block;
              update public.enemy_combat_state set block = 0 where id = v_target_enemy.id;
            end if;
          end if;
          if v_actual_dmg > 0 then
            update public.enemy_combat_state
            set hp = greatest(0, hp - v_actual_dmg),
                is_dead = (hp - v_actual_dmg <= 0)
            where id = v_target_enemy.id;
          end if;
          v_total_damage := v_actual_dmg;
        end;
      end if;
    end if;
  end if;

  -- Apply burn to enemy
  if v_burn_val > 0 then
    if coalesce(v_card.is_aoe, false) then
      update public.enemy_combat_state
      set burn = burn + v_burn_val
      where room_id = p_room_id and screen_id = v_screen_id and is_dead = false;
    else
      select * into v_target_enemy
      from (
        select *, row_number() over (order by position) - 1 as idx
        from public.enemy_combat_state
        where room_id = p_room_id and screen_id = v_screen_id and is_dead = false
      ) sub
      where sub.idx = coalesce(p_target_enemy_idx, 0);
      if v_target_enemy is not null then
        update public.enemy_combat_state
        set burn = burn + v_burn_val
        where id = v_target_enemy.id;
      end if;
    end if;
  end if;

  -- Update hand: remove played card, increment usageCount
  v_new_hand := v_pcs.hand - p_hand_index;
  v_card_instance := jsonb_set(v_card_instance, '{usageCount}',
    to_jsonb(coalesce((v_card_instance->>'usageCount')::int, 0) + 1)
  );
  -- Check auto-upgrade
  if not v_is_upgraded and (v_card_instance->>'usageCount')::int >= v_card.upgrade_threshold then
    v_card_instance := jsonb_set(v_card_instance, '{upgraded}', 'true'::jsonb);
  end if;
  v_new_discard := v_pcs.discard_pile || jsonb_build_array(v_card_instance);

  -- Update trait charges (no attune — always charge the card's own trait)
  v_new_charges := v_pcs.trait_charges;

  if v_is_amplified then
    -- Reset the card's own trait to 0
    v_new_charges := jsonb_set(v_new_charges, array[v_trait], '0'::jsonb);
  else
    v_new_charges := jsonb_set(v_new_charges, array[v_trait],
      to_jsonb(coalesce((v_new_charges->>v_trait)::int, 0) + 1));
  end if;

  v_new_energy := v_pcs.energy - v_card.cost;

  -- Save state
  update public.player_combat_state
  set hand = v_new_hand,
      discard_pile = v_new_discard,
      energy = v_new_energy,
      trait_charges = v_new_charges
  where id = v_pcs.id;

  return jsonb_build_object(
    'cardId', v_card_id,
    'cardName', v_card.name,
    'trait', v_trait,
    'damage', v_total_damage,
    'block', v_block_val,
    'heal', v_heal_val,
    'burn', v_burn_val,
    'wasAmplified', v_is_amplified,
    'energyLeft', v_new_energy,
    'traitCharged', v_trait,
    'newTraitCharges', v_new_charges
  );
end;
$$;

-- Drop old 5-param signature and grant new 3-param signature
drop function if exists public.combat_play_card(uuid, int, int, boolean, text);
grant execute on function public.combat_play_card(uuid, int, int) to authenticated;

-- Set attune_charges default to 0 on the table
alter table public.player_combat_state alter column attune_charges set default 0;

-- Recreate combat_reroll_hand: draw 4 cards instead of 5
create or replace function public.combat_reroll_hand(
  p_room_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_screen_id uuid;
  v_pcs record;
  v_draw_result jsonb;
begin
  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id
  limit 1;
  if v_player_id is null then
    raise exception 'Player not in room';
  end if;

  select as2.id into v_screen_id
  from public.adventure_screens as2
  join public.rooms r on r.id = as2.room_id
  where as2.room_id = p_room_id
    and as2.position = r.current_screen_position
  limit 1;

  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;
  if v_pcs is null then
    raise exception 'No combat state';
  end if;

  v_draw_result := public._draw_hand(
    v_pcs.draw_pile || v_pcs.hand,
    v_pcs.discard_pile,
    4
  );

  update public.player_combat_state
  set draw_pile = v_draw_result->'drawPile',
      hand = v_draw_result->'hand',
      discard_pile = '[]'::jsonb
  where id = v_pcs.id;
end;
$$;

grant execute on function public.combat_reroll_hand(uuid) to authenticated;

-- Recreate combat_init_turn: draw 4 cards, attune_charges = 0
create or replace function public.combat_init_turn(
  p_room_id uuid,
  p_screen_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turn_id uuid;
  v_player record;
  v_starter_cards jsonb;
  v_draw_result jsonb;
begin
  if exists (select 1 from public.combat_turns where room_id = p_room_id and screen_id = p_screen_id) then
    return;
  end if;

  insert into public.combat_turns (room_id, screen_id, turn_number, phase)
  values (p_room_id, p_screen_id, 1, 'player')
  returning id into v_turn_id;

  for v_player in
    select rp.player_id, rp.role_id
    from public.room_players rp
    where rp.room_id = p_room_id
  loop
    insert into public.player_turn_state (combat_turn_id, player_id, actions_remaining, has_ended_turn)
    values (v_turn_id, v_player.player_id, 0, false);

    -- Build starter deck for this player's role
    select jsonb_agg(
      jsonb_build_object('cardId', cd.id, 'upgraded', false, 'usageCount', 0)
    ) into v_starter_cards
    from public.card_definitions cd
    where cd.is_starter = true and cd.starter_role = v_player.role_id;

    -- Fallback: if no role-specific cards, use all starters
    if v_starter_cards is null or jsonb_array_length(v_starter_cards) = 0 then
      select jsonb_agg(
        jsonb_build_object('cardId', cd.id, 'upgraded', false, 'usageCount', 0)
      ) into v_starter_cards
      from public.card_definitions cd
      where cd.is_starter = true;
    end if;

    v_draw_result := public._draw_hand(v_starter_cards, '[]'::jsonb, 4);

    insert into public.player_combat_state (
      room_id, screen_id, player_id, identity_id,
      draw_pile, hand, discard_pile,
      energy, max_energy, block,
      trait_charges, attune_charges
    ) values (
      p_room_id, p_screen_id, v_player.player_id, 'fire',
      v_draw_result->'drawPile', v_draw_result->'hand', '[]'::jsonb,
      3, 3, 0,
      '{"fire":0,"guard":0,"shadow":0,"storm":0,"nature":0}'::jsonb,
      0
    )
    on conflict (room_id, screen_id, player_id) do nothing;
  end loop;

  update public.characters set taunt_turns_left = 0 where room_id = p_room_id;
end;
$$;

grant execute on function public.combat_init_turn(uuid, uuid) to authenticated;

-- Recreate combat_enemy_phase: draw 4 cards, remove attune_target_trait reset
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
          select c.hp into v_player_hp
          from public.characters c
          where c.room_id = p_room_id and c.player_id = v_pcs.player_id;

          for v_hit in 1..v_intent_hits loop
            if v_player_hp <= 0 then exit; end if;

            v_raw_damage := floor((v_intent_value + v_enemy.strength) * v_weakenMult)::int;

            if v_pcs.vulnerable > 0 then
              v_raw_damage := (v_raw_damage * 3) / 2;
            end if;

            v_actual_damage := v_raw_damage;
            if v_current_block > 0 then
              v_blocked := least(v_current_block, v_actual_damage);
              v_actual_damage := v_actual_damage - v_blocked;
              v_current_block := v_current_block - v_blocked;
            end if;

            if v_actual_damage > 0 then
              v_actual_damage := least(v_actual_damage, v_player_hp);
              update public.characters
              set hp = greatest(0, hp - v_actual_damage)
              where room_id = p_room_id and player_id = v_pcs.player_id;
              v_player_hp := v_player_hp - v_actual_damage;
            end if;

            v_total_dmg := v_total_dmg + v_actual_damage;

            if v_pcs.thorns > 0 and v_raw_damage > 0 then
              update public.enemy_combat_state
              set hp = greatest(0, hp - v_pcs.thorns)
              where id = v_enemy.id;
              if (select hp from public.enemy_combat_state where id = v_enemy.id) <= 0 then
                update public.enemy_combat_state set is_dead = true where id = v_enemy.id;
              end if;
            end if;
          end loop;

          update public.player_combat_state set block = v_current_block where id = v_pcs.id;

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
      update public.player_combat_state
      set weakened = weakened + v_intent_value
      where room_id = p_room_id and screen_id = v_screen_id;
      v_attacks := v_attacks || jsonb_build_object('enemyId', v_enemy.id, 'type', 'debuff', 'value', v_intent_value);
    end if;

    update public.enemy_combat_state
    set intent_index = intent_index + 1
    where id = v_enemy.id;

    if not exists (
      select 1 from public.characters c where c.room_id = p_room_id and c.hp > 0
    ) then
      v_party_wiped := true;
      exit;
    end if;

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
      thorns = 0
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

  -- New turn: reset energy, block, draw new hand of 4
  for v_pcs in
    select pcs.id, pcs.draw_pile, pcs.hand, pcs.discard_pile, pcs.max_energy, pcs.starting_block
    from public.player_combat_state pcs
    where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id
  loop
    declare
      v_new_discard jsonb := v_pcs.discard_pile || v_pcs.hand;
      v_draw_result jsonb;
    begin
      v_draw_result := public._draw_hand(v_pcs.draw_pile, v_new_discard, 4);
      update public.player_combat_state
      set energy = v_pcs.max_energy,
          block = v_pcs.starting_block,
          hand = v_draw_result->'hand',
          draw_pile = v_draw_result->'drawPile',
          discard_pile = '[]'::jsonb
      where id = v_pcs.id;
    end;
  end loop;

  return jsonb_build_object('partyWiped', false, 'victory', false, 'turnNumber', v_turn_number + 1, 'attacks', v_attacks);
end;
$$;

grant execute on function public.combat_enemy_phase(uuid) to authenticated;
