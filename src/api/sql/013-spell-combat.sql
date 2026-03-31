-- Deckbuilder combat system
-- Replaces role-based spell system with universal card pool, energy, block, status effects.
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Card definitions (server-side reference)
-- ----------------------------

drop table if exists public.spell_definitions cascade;

create table if not exists public.card_definitions (
  id text primary key,
  name text not null,
  cost int not null default 1,
  trait text not null,
  description text not null default '',
  upgrade_threshold int not null default 3,
  upgrade_name text not null default '',
  upgrade_description text not null default '',
  -- Base values
  base_damage int,
  base_block int,
  base_heal int,
  base_burn int,
  -- Upgraded values
  upgraded_damage int,
  upgraded_block int,
  upgraded_heal int,
  upgraded_burn int,
  -- Flags
  is_aoe boolean not null default false,
  is_rare boolean not null default false,
  is_signature boolean not null default false,
  is_starter boolean not null default false
);

-- Seed starter deck (15 cards)
insert into public.card_definitions (id, name, cost, trait, description, upgrade_threshold, upgrade_name, upgrade_description, base_damage, upgraded_damage, base_burn, upgraded_burn, base_block, upgraded_block, base_heal, upgraded_heal, is_aoe, is_rare, is_signature, is_starter) values
  -- Fire starters
  ('ember-slash', 'Ember Slash', 1, 'fire', 'Deal 8 damage.', 3, 'Ember Slash+', 'Deal 11 damage. +1 Fire charge.', 8, 11, null, null, null, null, null, null, false, false, false, true),
  ('scorch', 'Scorch', 1, 'fire', 'Deal 5 damage. Burn 5.', 3, 'Scorch+', 'Deal 8 damage. Burn 8.', 5, 8, 5, 8, null, null, null, null, false, false, false, true),
  ('wildfire', 'Wildfire', 2, 'fire', 'Deal 12 damage to all.', 3, 'Wildfire+', 'Deal 16 damage to all.', 12, 16, null, null, null, null, null, null, true, false, false, true),
  -- Guard starters
  ('guard-stance', 'Guard Stance', 1, 'guard', 'Gain 7 Block.', 3, 'Guard Stance+', 'Gain 10 Block. Deal 2 damage.', null, 2, null, null, 7, 10, null, null, false, false, false, true),
  ('fortify', 'Fortify', 2, 'guard', 'Gain 12 Block. Block persists.', 3, 'Fortify+', 'Gain 16 Block. Block persists.', null, null, null, null, 12, 16, null, null, false, false, false, true),
  ('shield-bash', 'Shield Bash', 1, 'guard', 'Gain 4 Block. Deal 4 damage.', 3, 'Shield Bash+', 'Gain 6 Block. Deal 6 damage.', 4, 6, null, null, 4, 6, null, null, false, false, false, true),
  -- Shadow starters
  ('shadow-mark', 'Shadow Mark', 1, 'shadow', 'Apply Vulnerable (2 turns).', 3, 'Deep Mark', 'Apply Vulnerable (3 turns). Deal 4 damage.', 0, 4, null, null, null, null, null, null, false, false, false, true),
  ('nick', 'Nick', 0, 'shadow', 'Deal 2 damage. Weaken 1 turn.', 3, 'Nick+', 'Deal 4 damage. Weaken 1 turn. Vuln 1 turn.', 2, 4, null, null, null, null, null, null, false, false, false, true),
  ('ambush', 'Ambush', 2, 'shadow', 'Deal 10 damage. +5 if Vulnerable.', 3, 'Ambush+', 'Deal 13 damage. +8 if Vulnerable.', 10, 13, null, null, null, null, null, null, false, false, false, true),
  -- Storm starters
  ('zap', 'Zap', 0, 'storm', 'Deal 2 damage.', 3, 'Zap+', 'Deal 4 damage. +1 energy if chained.', 2, 4, null, null, null, null, null, null, false, false, false, true),
  ('arc-bolt', 'Arc Bolt', 2, 'storm', 'Deal 9 damage. +1 energy next turn.', 3, 'Arc Bolt+', 'Deal 13 damage. +1 energy next turn.', 9, 13, null, null, null, null, null, null, false, false, false, true),
  -- Nature starters
  ('sprout', 'Sprout', 0, 'nature', 'Heal 2 HP.', 3, 'Sprout+', 'Heal 4 HP. +1 Regen.', null, null, null, null, null, null, 2, 4, false, false, false, true),
  ('vine-lash', 'Vine Lash', 1, 'nature', 'Deal 3 damage. Heal 5 HP.', 3, 'Vine Lash+', 'Deal 6 damage. Heal 8 HP.', 3, 6, null, null, null, null, 5, 8, false, false, false, true),
  -- Neutral starters
  ('focus', 'Focus', 1, 'neutral', 'Transform into random card of chosen trait.', 99, 'Focus+', 'Transform into random card. Costs 0.', 0, 0, null, null, null, null, null, null, false, false, false, true),
  ('haymaker', 'Haymaker', 3, 'neutral', 'Deal 18 damage.', 3, 'Haymaker+', 'Deal 24 damage.', 18, 24, null, null, null, null, null, null, false, false, false, true)
on conflict (id) do nothing;

-- Seed reward pool
insert into public.card_definitions (id, name, cost, trait, description, upgrade_threshold, upgrade_name, upgrade_description, base_damage, upgraded_damage, base_burn, upgraded_burn, base_block, upgraded_block, base_heal, upgraded_heal, is_aoe, is_rare, is_signature, is_starter) values
  ('flame-burst', 'Flame Burst', 2, 'fire', 'Deal 14 damage.', 2, 'Inferno Burst', 'Deal 20 damage.', 14, 20, null, null, null, null, null, null, false, false, false, false),
  ('eruption', 'Eruption', 3, 'fire', 'Deal 22 damage to all.', 2, 'Cataclysm', 'Deal 30 damage to all.', 22, 30, null, null, null, null, null, null, true, true, false, false),
  ('kindle', 'Kindle', 0, 'fire', 'Deal 3 damage.', 3, 'Kindle+', 'Deal 5 damage. +1 Fire charge.', 3, 5, null, null, null, null, null, null, false, false, false, false),
  ('infernal-nova', 'Infernal Nova', 2, 'fire', 'Deal 30 damage.', 99, 'Infernal Nova', 'Deal 30 damage.', 30, null, null, null, null, null, null, null, false, true, true, false),
  ('immolate', 'Immolate', 2, 'fire', 'Deal 6 damage. Burn 10.', 2, 'Immolate+', 'Deal 10 damage. Burn 15.', 6, 10, 10, 15, null, null, null, null, false, false, false, false),
  ('sear', 'Sear', 0, 'fire', 'Burn 4.', 3, 'Sear+', 'Burn 7.', null, null, 4, 7, null, null, null, null, false, false, false, false),
  ('counter-guard', 'Counter Guard', 2, 'guard', 'Gain 8 Block. If hit, deal 6 back.', 2, 'Iron Counter', 'Gain 12 Block. If hit, deal 10 back.', 6, 10, null, null, 8, 12, null, null, false, false, false, false),
  ('bulwark', 'Bulwark', 3, 'guard', 'Gain 18 Block. +2 Thorns.', 2, 'Great Bulwark', 'Gain 25 Block. +4 Thorns.', 2, 4, null, null, 18, 25, null, null, false, true, false, false),
  ('brace', 'Brace', 0, 'guard', 'Gain 3 Block.', 3, 'Brace+', 'Gain 5 Block.', null, null, null, null, 3, 5, null, null, false, false, false, false),
  ('poison-edge', 'Poison Edge', 1, 'shadow', 'Deal 4 damage. Weaken 2 turns.', 3, 'Venom Edge', 'Deal 7 damage. Weaken 3 turns.', 4, 7, null, null, null, null, null, null, false, false, false, false),
  ('backstab', 'Backstab', 2, 'shadow', 'Deal 10 damage. +5 if Vulnerable.', 2, 'Assassinate', 'Deal 14 damage. +8 if Vulnerable.', 10, 14, null, null, null, null, null, null, false, false, false, false),
  ('death-sentence', 'Death Sentence', 3, 'shadow', 'Deal 8 dmg. Execute below 25%.', 2, 'Execution', 'Deal 12 dmg. Execute below 30%.', 8, 12, null, null, null, null, null, null, false, true, false, false),
  ('chain-spark', 'Chain Spark', 1, 'storm', 'Deal 5 dmg. +1 energy if chained.', 3, 'Chain Lightning', 'Deal 8 dmg. +1 energy. +1 Storm charge.', 5, 8, null, null, null, null, null, null, false, false, false, false),
  ('tempest-flow', 'Tempest Flow', 2, 'storm', '+1 energy next turn.', 3, 'Tempest Surge', '+2 energy next turn.', 0, 0, null, null, null, null, null, null, false, false, false, false),
  ('thunderstrike', 'Thunderstrike', 3, 'storm', 'Deal 16 damage. +1 energy next turn.', 2, 'Thunderstrike+', 'Deal 22 damage. +2 energy.', 16, 22, null, null, null, null, null, null, false, true, false, false),
  ('static-field', 'Static Field', 1, 'storm', 'Deal 3 damage. Free reroll.', 3, 'Static Field+', 'Deal 6 damage. Free reroll.', 3, 6, null, null, null, null, null, null, false, false, false, false),
  ('mend', 'Mend', 1, 'nature', 'Heal 6 HP.', 3, 'Mend+', 'Heal 10 HP. +1 Regen.', null, null, null, null, null, null, 6, 10, false, false, false, false),
  ('bramble-wall', 'Bramble Wall', 1, 'nature', 'Gain 5 Block + 2 Thorns.', 3, 'Bramble Wall+', 'Gain 8 Block + 3 Thorns.', 2, 3, null, null, 5, 8, null, null, false, false, false, false),
  ('regrowth', 'Regrowth', 2, 'nature', '3 Regen for 3 turns.', 2, 'Regrowth+', '5 Regen for 3 turns.', null, null, null, null, null, null, 3, 5, false, false, false, false),
  ('natures-wrath', 'Natures Wrath', 3, 'nature', 'Deal 12 dmg. Heal equal.', 2, 'Natures Fury', 'Deal 18 dmg. Heal equal.', 12, 18, null, null, null, null, null, null, false, true, false, false)
on conflict (id) do nothing;

-- ----------------------------
-- Player combat state (deckbuilder)
-- ----------------------------

drop table if exists public.spell_combat_state cascade;

create table if not exists public.player_combat_state (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  screen_id uuid not null,
  player_id public.player_id not null,
  identity_id text not null default 'fire',

  -- Deck zones (JSONB arrays of {cardId, upgraded, usageCount})
  draw_pile jsonb not null default '[]'::jsonb,
  hand jsonb not null default '[]'::jsonb,
  discard_pile jsonb not null default '[]'::jsonb,

  -- Resources
  energy int not null default 3,
  max_energy int not null default 3,
  block int not null default 0,

  -- Trait charges
  trait_charges jsonb not null default '{"fire":0,"guard":0,"shadow":0,"storm":0,"nature":0}'::jsonb,
  attune_charges int not null default 1,
  attune_target_trait text default null,

  -- Status effects
  burn int not null default 0,
  vulnerable int not null default 0,
  weakened int not null default 0,
  thorns int not null default 0,
  regen int not null default 0,

  -- Persistent bonuses
  starting_block int not null default 0,
  free_reroll boolean not null default false,

  unique (room_id, screen_id, player_id)
);

-- ----------------------------
-- Enemy combat state
-- ----------------------------

create table if not exists public.enemy_combat_state (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  screen_id uuid not null,
  template_id text not null,
  name text not null,
  icon text not null default '',
  position int not null default 0,
  hp int not null,
  hp_max int not null,
  strength int not null default 0,
  block int not null default 0,
  intent_index int not null default 0,
  is_dead boolean not null default false,
  -- Status effects
  burn int not null default 0,
  vulnerable int not null default 0,
  weakened int not null default 0
);

-- ----------------------------
-- RLS
-- ----------------------------
alter table public.player_combat_state enable row level security;
alter table public.enemy_combat_state enable row level security;

drop policy if exists player_combat_state_select on public.player_combat_state;
create policy player_combat_state_select on public.player_combat_state
  for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists enemy_combat_state_select on public.enemy_combat_state;
create policy enemy_combat_state_select on public.enemy_combat_state
  for select to authenticated
  using (public.is_room_member(room_id));

grant select on public.player_combat_state to authenticated;
grant select on public.enemy_combat_state to authenticated;

-- ----------------------------
-- Realtime
-- ----------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'player_combat_state'
  ) then
    execute 'alter publication supabase_realtime add table public.player_combat_state';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'enemy_combat_state'
  ) then
    execute 'alter publication supabase_realtime add table public.enemy_combat_state';
  end if;
end
$$;

-- ----------------------------
-- Helper: shuffle and draw hand from draw pile
-- ----------------------------
create or replace function public._draw_hand(
  p_draw_pile jsonb,
  p_discard_pile jsonb,
  p_hand_size int default 5
)
returns jsonb  -- returns {draw_pile, hand}
language plpgsql
as $$
declare
  v_pile jsonb;
  v_hand jsonb := '[]'::jsonb;
  v_card jsonb;
  i int;
begin
  v_pile := p_draw_pile;

  -- If draw pile too small, shuffle discard back in
  if jsonb_array_length(v_pile) < p_hand_size then
    v_pile := v_pile || p_discard_pile;
  end if;

  -- Shuffle: extract to array, randomize, re-pack
  -- Simple approach: pick random elements
  for i in 1..least(p_hand_size, jsonb_array_length(v_pile)) loop
    declare
      v_idx int := floor(random() * jsonb_array_length(v_pile))::int;
    begin
      v_card := v_pile->v_idx;
      v_hand := v_hand || jsonb_build_array(v_card);
      v_pile := v_pile - v_idx;
    end;
  end loop;

  return jsonb_build_object('drawPile', v_pile, 'hand', v_hand);
end;
$$;

-- ----------------------------
-- RPC: combat_init_turn (deckbuilder version)
-- ----------------------------
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
  -- Check if turn already exists (first init vs late joiner)
  select id into v_turn_id
  from public.combat_turns
  where room_id = p_room_id and screen_id = p_screen_id
  limit 1;

  if v_turn_id is null then
    insert into public.combat_turns (room_id, screen_id, turn_number, phase)
    values (p_room_id, p_screen_id, 1, 'player')
    returning id into v_turn_id;
  end if;

  -- Build starter deck as JSONB array
  select jsonb_agg(
    jsonb_build_object('cardId', cd.id, 'upgraded', false, 'usageCount', 0)
  ) into v_starter_cards
  from public.card_definitions cd
  where cd.is_starter = true;

  for v_player in
    select rp.player_id
    from public.room_players rp
    where rp.room_id = p_room_id
  loop
    -- Create turn state if missing
    insert into public.player_turn_state (combat_turn_id, player_id, actions_remaining, has_ended_turn)
    values (v_turn_id, v_player.player_id, 0, false)
    on conflict do nothing;

    -- Draw opening hand from starter deck
    v_draw_result := public._draw_hand(v_starter_cards, '[]'::jsonb, 5);

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
      1
    )
    on conflict (room_id, screen_id, player_id) do nothing;
  end loop;

  -- Reset taunt
  update public.characters
  set taunt_turns_left = 0
  where room_id = p_room_id;
end;
$$;

grant execute on function public.combat_init_turn(uuid, uuid) to authenticated;

-- ----------------------------
-- RPC: combat_reroll_hand
-- Shuffle hand back into draw pile and draw a fresh hand
-- ----------------------------
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
  -- Find player
  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id
  limit 1;
  if v_player_id is null then
    raise exception 'Player not in room';
  end if;

  -- Get current screen
  select as2.id into v_screen_id
  from public.adventure_screens as2
  join public.rooms r on r.id = as2.room_id
  where as2.room_id = p_room_id
    and as2.position = r.current_screen_position
  limit 1;

  -- Get combat state
  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;
  if v_pcs is null then
    raise exception 'No combat state';
  end if;

  -- Shuffle hand back into draw pile, then draw fresh hand
  v_draw_result := public._draw_hand(
    v_pcs.draw_pile || v_pcs.hand,
    v_pcs.discard_pile,
    5
  );

  update public.player_combat_state
  set draw_pile = v_draw_result->'drawPile',
      hand = v_draw_result->'hand',
      discard_pile = '[]'::jsonb
  where id = v_pcs.id;
end;
$$;

grant execute on function public.combat_reroll_hand(uuid) to authenticated;

-- ----------------------------
-- RPC: combat_play_card
-- Play a card from hand, spending energy, applying effects
-- ----------------------------
create or replace function public.combat_play_card(
  p_room_id uuid,
  p_hand_index int,
  p_target_enemy_idx int default null,
  p_use_attune boolean default false,
  p_attune_trait text default null
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
  v_trait_to_charge text;
  v_current_charge int;
  v_is_amplified boolean;
  v_new_hand jsonb;
  v_new_discard jsonb;
  v_new_charges jsonb;
  v_new_attune int;
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
    raise exception 'Not a room member';
  end if;

  select ct.id, ct.screen_id into v_turn_id, v_screen_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  -- Get player combat state
  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;

  if v_pcs is null then
    raise exception 'Combat state not found';
  end if;

  -- Validate hand index
  if p_hand_index < 0 or p_hand_index >= jsonb_array_length(v_pcs.hand) then
    raise exception 'Invalid hand index';
  end if;

  v_card_instance := v_pcs.hand->p_hand_index;
  v_card_id := v_card_instance->>'cardId';
  v_is_upgraded := coalesce((v_card_instance->>'upgraded')::boolean, false);

  -- Lookup card definition
  select * into v_card from public.card_definitions where id = v_card_id;
  if v_card is null then
    raise exception 'Card not found: %', v_card_id;
  end if;

  -- Check energy
  if v_pcs.energy < v_card.cost then
    raise exception 'Not enough energy (have %, need %)', v_pcs.energy, v_card.cost;
  end if;

  -- Determine trait to charge
  v_trait := v_card.trait;
  if p_use_attune and p_attune_trait is not null and v_pcs.attune_charges > 0 then
    v_trait_to_charge := p_attune_trait;
  else
    v_trait_to_charge := v_trait;
  end if;

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

  -- Amplified: +50% to all values
  if v_is_amplified then
    v_damage := (v_damage * 3) / 2;
    v_block_val := (v_block_val * 3) / 2;
    v_heal_val := (v_heal_val * 3) / 2;
    v_burn_val := (v_burn_val * 3) / 2;
  end if;

  -- Apply damage
  if v_damage > 0 then
    if v_card.is_aoe then
      -- AoE: hit all alive enemies
      for v_enemy in
        select ecs.id, ecs.hp, ecs.block, ecs.vulnerable
        from public.enemy_combat_state ecs
        where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
      loop
        declare
          v_effective_dmg int := v_damage;
          v_remaining int;
        begin
          -- Vulnerable: +50% damage
          if v_enemy.vulnerable > 0 then
            v_effective_dmg := (v_effective_dmg * 3) / 2;
          end if;
          -- Apply against block first
          v_remaining := v_effective_dmg;
          if v_enemy.block > 0 then
            if v_enemy.block >= v_remaining then
              update public.enemy_combat_state set block = block - v_remaining where id = v_enemy.id;
              v_remaining := 0;
            else
              v_remaining := v_remaining - v_enemy.block;
              update public.enemy_combat_state set block = 0 where id = v_enemy.id;
            end if;
          end if;
          if v_remaining > 0 then
            update public.enemy_combat_state set hp = greatest(0, hp - v_remaining) where id = v_enemy.id;
            if v_enemy.hp - v_remaining <= 0 then
              update public.enemy_combat_state set is_dead = true where id = v_enemy.id;
            end if;
          end if;
          v_total_damage := v_total_damage + v_effective_dmg;
        end;
      end loop;
    elsif p_target_enemy_idx is not null then
      -- Single target
      select ecs.id, ecs.hp, ecs.block, ecs.vulnerable into v_target_enemy
      from public.enemy_combat_state ecs
      where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
      order by ecs.position asc
      offset p_target_enemy_idx limit 1;

      if v_target_enemy.id is not null then
        declare
          v_effective_dmg int := v_damage;
          v_remaining int;
        begin
          if v_target_enemy.vulnerable > 0 then
            v_effective_dmg := (v_effective_dmg * 3) / 2;
          end if;
          v_remaining := v_effective_dmg;
          if v_target_enemy.block > 0 then
            if v_target_enemy.block >= v_remaining then
              update public.enemy_combat_state set block = block - v_remaining where id = v_target_enemy.id;
              v_remaining := 0;
            else
              v_remaining := v_remaining - v_target_enemy.block;
              update public.enemy_combat_state set block = 0 where id = v_target_enemy.id;
            end if;
          end if;
          if v_remaining > 0 then
            update public.enemy_combat_state set hp = greatest(0, hp - v_remaining) where id = v_target_enemy.id;
            if v_target_enemy.hp - v_remaining <= 0 then
              update public.enemy_combat_state set is_dead = true where id = v_target_enemy.id;
            end if;
          end if;
          v_total_damage := v_effective_dmg;
        end;
      end if;
    end if;
  end if;

  -- Apply block to player
  if v_block_val > 0 then
    update public.player_combat_state
    set block = block + v_block_val
    where id = v_pcs.id;
  end if;

  -- Apply heal to player
  if v_heal_val > 0 then
    update public.characters
    set hp = least(hp_max, hp + v_heal_val)
    where room_id = p_room_id and player_id = v_player_id;
  end if;

  -- Apply burn to target enemy
  if v_burn_val > 0 and p_target_enemy_idx is not null then
    update public.enemy_combat_state
    set burn = burn + v_burn_val
    where id = v_target_enemy.id;
  end if;

  -- Move card from hand to discard
  v_new_hand := v_pcs.hand - p_hand_index;
  -- Increment usage count on the card instance
  v_card_instance := jsonb_set(v_card_instance, '{usageCount}',
    to_jsonb(coalesce((v_card_instance->>'usageCount')::int, 0) + 1)
  );
  -- Check auto-upgrade
  if not v_is_upgraded and (v_card_instance->>'usageCount')::int >= v_card.upgrade_threshold then
    v_card_instance := jsonb_set(v_card_instance, '{upgraded}', 'true'::jsonb);
  end if;
  v_new_discard := v_pcs.discard_pile || jsonb_build_array(v_card_instance);

  -- Update trait charges
  v_new_charges := v_pcs.trait_charges;
  v_new_attune := v_pcs.attune_charges;

  if p_use_attune and p_attune_trait is not null and v_pcs.attune_charges > 0 then
    v_new_attune := v_new_attune - 1;
  end if;

  if v_is_amplified then
    -- Reset the card's own trait to 0, grant +1 attune
    v_new_charges := jsonb_set(v_new_charges, array[v_trait], '0'::jsonb);
    v_new_attune := least(2, v_new_attune + 1);
    -- Still charge the target trait
    if v_trait_to_charge <> v_trait then
      v_new_charges := jsonb_set(v_new_charges, array[v_trait_to_charge],
        to_jsonb(coalesce((v_new_charges->>v_trait_to_charge)::int, 0) + 1));
    end if;
  else
    v_new_charges := jsonb_set(v_new_charges, array[v_trait_to_charge],
      to_jsonb(coalesce((v_new_charges->>v_trait_to_charge)::int, 0) + 1));
  end if;

  v_new_energy := v_pcs.energy - v_card.cost;

  -- Save state
  update public.player_combat_state
  set hand = v_new_hand,
      discard_pile = v_new_discard,
      energy = v_new_energy,
      trait_charges = v_new_charges,
      attune_charges = v_new_attune,
      attune_target_trait = null
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
    'traitCharged', v_trait_to_charge,
    'newTraitCharges', v_new_charges,
    'newAttuneCharges', v_new_attune
  );
end;
$$;

grant execute on function public.combat_play_card(uuid, int, int, boolean, text) to authenticated;

-- ----------------------------
-- RPC: combat_use_convergence (deckbuilder version)
-- ----------------------------
create or replace function public.combat_use_convergence(
  p_room_id uuid,
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
  v_empowered_count int := 0;
  v_trait text;
  v_new_charges jsonb;
  v_multiplier numeric;
  v_total_damage int := 0;
  v_total_block int := 0;
  v_total_heal int := 0;
  v_energy_gained int := 0;
  v_vuln_applied int := 0;
  v_weak_applied int := 0;
  v_enemy record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id;

  select ct.id, ct.screen_id into v_turn_id, v_screen_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  select * into v_pcs
  from public.player_combat_state
  where room_id = p_room_id and screen_id = v_screen_id and player_id = v_player_id;

  -- Count and reset empowered traits
  v_new_charges := v_pcs.trait_charges;
  for v_trait in select key from jsonb_each_text(v_pcs.trait_charges) where value::int >= 3
  loop
    v_empowered_count := v_empowered_count + 1;
    v_new_charges := jsonb_set(v_new_charges, array[v_trait], '0'::jsonb);

    -- Apply convergence effect per trait
    -- Fire: damage
    if v_trait = 'fire' then
      v_total_damage := v_total_damage + 16;
    -- Guard: block (persistent)
    elsif v_trait = 'guard' then
      v_total_block := v_total_block + 14;
    -- Shadow: vulnerable + weakened
    elsif v_trait = 'shadow' then
      v_vuln_applied := v_vuln_applied + 2;
      v_weak_applied := v_weak_applied + 2;
    -- Storm: energy
    elsif v_trait = 'storm' then
      v_energy_gained := v_energy_gained + 2;
    -- Nature: heal
    elsif v_trait = 'nature' then
      v_total_heal := v_total_heal + 12;
    end if;
  end loop;

  if v_empowered_count < 2 then
    raise exception 'Need at least 2 empowered traits';
  end if;

  -- Apply multiplier based on count
  v_multiplier := case
    when v_empowered_count >= 5 then 2.5
    when v_empowered_count >= 4 then 2.0
    when v_empowered_count >= 3 then 1.5
    else 1.0
  end;

  v_total_damage := floor(v_total_damage * v_multiplier)::int;
  v_total_block := floor(v_total_block * v_multiplier)::int;
  v_total_heal := floor(v_total_heal * v_multiplier)::int;

  -- Apply damage to all enemies
  if v_total_damage > 0 then
    for v_enemy in
      select ecs.id, ecs.hp, ecs.block from public.enemy_combat_state ecs
      where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
    loop
      declare v_remaining int := v_total_damage;
      begin
        if v_enemy.block > 0 then
          if v_enemy.block >= v_remaining then
            update public.enemy_combat_state set block = block - v_remaining where id = v_enemy.id;
            v_remaining := 0;
          else
            v_remaining := v_remaining - v_enemy.block;
            update public.enemy_combat_state set block = 0 where id = v_enemy.id;
          end if;
        end if;
        if v_remaining > 0 then
          update public.enemy_combat_state set hp = greatest(0, hp - v_remaining) where id = v_enemy.id;
          if v_enemy.hp - v_remaining <= 0 then
            update public.enemy_combat_state set is_dead = true where id = v_enemy.id;
          end if;
        end if;
      end;
    end loop;
  end if;

  -- Apply block
  if v_total_block > 0 then
    update public.player_combat_state set block = block + v_total_block where id = v_pcs.id;
  end if;

  -- Apply heal
  if v_total_heal > 0 then
    update public.characters set hp = least(hp_max, hp + v_total_heal)
    where room_id = p_room_id and player_id = v_player_id;
  end if;

  -- Apply energy
  if v_energy_gained > 0 then
    update public.player_combat_state set energy = energy + v_energy_gained where id = v_pcs.id;
  end if;

  -- Apply debuffs to all enemies
  if v_vuln_applied > 0 or v_weak_applied > 0 then
    update public.enemy_combat_state
    set vulnerable = vulnerable + v_vuln_applied,
        weakened = weakened + v_weak_applied
    where room_id = p_room_id and screen_id = v_screen_id and is_dead = false;
  end if;

  -- Save charges
  update public.player_combat_state
  set trait_charges = v_new_charges
  where id = v_pcs.id;

  -- Free action: does NOT consume energy

  return jsonb_build_object(
    'empoweredCount', v_empowered_count,
    'multiplier', v_multiplier,
    'damage', v_total_damage,
    'block', v_total_block,
    'heal', v_total_heal,
    'energy', v_energy_gained,
    'vulnerable', v_vuln_applied,
    'weakened', v_weak_applied,
    'newTraitCharges', v_new_charges
  );
end;
$$;

grant execute on function public.combat_use_convergence(uuid, int) to authenticated;

-- ----------------------------
-- RPC: combat_enemy_phase (deckbuilder version)
-- Enemies act based on intent pattern, then new turn starts
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
  v_player record;
  v_attacks jsonb := '[]'::jsonb;
  v_party_wiped boolean := false;
  v_intent int;
  v_base_damage int;
  v_effective_damage int;
  v_pcs record;
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

  -- Process burn DOT on enemies (start of enemy phase)
  update public.enemy_combat_state
  set hp = greatest(0, hp - burn),
      burn = greatest(0, burn - 1)
  where room_id = p_room_id and screen_id = v_screen_id and is_dead = false and burn > 0;

  -- Check for deaths from burn
  update public.enemy_combat_state
  set is_dead = true
  where room_id = p_room_id and screen_id = v_screen_id and hp <= 0 and is_dead = false;

  -- Reset enemy block each turn
  update public.enemy_combat_state
  set block = 0
  where room_id = p_room_id and screen_id = v_screen_id;

  -- Each alive enemy acts based on intent
  for v_enemy in
    select ecs.id, ecs.name, ecs.strength, ecs.intent_index, ecs.template_id, ecs.weakened
    from public.enemy_combat_state ecs
    where ecs.room_id = p_room_id and ecs.screen_id = v_screen_id and ecs.is_dead = false
    order by ecs.position asc
  loop
    -- Get intent from pattern (cycles)
    declare
      v_pattern int[];
      v_pattern_len int;
    begin
      -- Lookup intent pattern from card_definitions... actually from enemy template
      -- For now, use a simple attack pattern based on intent_index
      -- Intent: 0=attack, 1=defend, 2=buff, 3=heavy, 4=multi, 5=debuff, 6=charge, 7=special
      v_intent := v_enemy.intent_index;

      -- Base damage = 6 + strength (simplified)
      v_base_damage := 6 + v_enemy.strength;
      if v_enemy.weakened > 0 then
        v_base_damage := (v_base_damage * 3) / 4;  -- 25% reduction when weakened
      end if;

      if v_intent = 0 then
        -- Normal attack
        v_effective_damage := v_base_damage;
      elsif v_intent = 1 then
        -- Defend: gain block
        update public.enemy_combat_state
        set block = block + 6 + v_enemy.strength
        where id = v_enemy.id;
        v_effective_damage := 0;
      elsif v_intent = 2 then
        -- Buff: gain strength
        update public.enemy_combat_state
        set strength = strength + 1
        where id = v_enemy.id;
        v_effective_damage := 0;
      elsif v_intent = 3 then
        -- Heavy attack
        v_effective_damage := v_base_damage + 4;
      elsif v_intent = 4 then
        -- Multi attack (x2 at 60%)
        v_effective_damage := (v_base_damage * 6) / 5;
      elsif v_intent = 5 then
        -- Debuff: apply vulnerable to all players
        update public.player_combat_state
        set vulnerable = vulnerable + 1
        where room_id = p_room_id and screen_id = v_screen_id;
        v_effective_damage := v_base_damage / 2;
      elsif v_intent = 6 then
        -- Charge: gain strength + small attack
        update public.enemy_combat_state
        set strength = strength + 2
        where id = v_enemy.id;
        v_effective_damage := v_base_damage / 2;
      elsif v_intent = 7 then
        -- Special: heavy + debuff
        v_effective_damage := v_base_damage + 6;
        update public.player_combat_state
        set weakened = weakened + 1
        where room_id = p_room_id and screen_id = v_screen_id;
      else
        v_effective_damage := v_base_damage;
      end if;

      -- Apply damage to all alive players (through block)
      if v_effective_damage > 0 then
        for v_pcs in
          select pcs.id, pcs.player_id, pcs.block, pcs.vulnerable
          from public.player_combat_state pcs
          join public.characters c on c.room_id = p_room_id and c.player_id = pcs.player_id
          where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id and c.hp > 0
        loop
          declare
            v_final_dmg int := v_effective_damage;
            v_remaining int;
          begin
            -- Player vulnerable: +50% damage taken
            if v_pcs.vulnerable > 0 then
              v_final_dmg := (v_final_dmg * 3) / 2;
            end if;

            -- Apply against player block
            v_remaining := v_final_dmg;
            if v_pcs.block > 0 then
              if v_pcs.block >= v_remaining then
                update public.player_combat_state set block = block - v_remaining where id = v_pcs.id;
                v_remaining := 0;
              else
                v_remaining := v_remaining - v_pcs.block;
                update public.player_combat_state set block = 0 where id = v_pcs.id;
              end if;
            end if;

            -- Remaining damage hits HP
            if v_remaining > 0 then
              update public.characters
              set hp = greatest(0, hp - v_remaining)
              where room_id = p_room_id and player_id = v_pcs.player_id;
            end if;

            v_attacks := v_attacks || jsonb_build_object(
              'enemyId', v_enemy.id,
              'enemyName', v_enemy.name,
              'targetPlayerId', v_pcs.player_id,
              'damage', v_final_dmg,
              'blocked', greatest(0, v_final_dmg - v_remaining),
              'intent', v_intent
            );
          end;
        end loop;
      else
        v_attacks := v_attacks || jsonb_build_object(
          'enemyId', v_enemy.id,
          'enemyName', v_enemy.name,
          'intent', v_intent,
          'damage', 0
        );
      end if;

      -- Advance intent index (cycle through pattern)
      update public.enemy_combat_state
      set intent_index = intent_index + 1
      where id = v_enemy.id;
    end;
  end loop;

  -- Decrement player status effects
  update public.player_combat_state
  set vulnerable = greatest(0, vulnerable - 1),
      weakened = greatest(0, weakened - 1)
  where room_id = p_room_id and screen_id = v_screen_id;

  -- Decrement enemy status effects
  update public.enemy_combat_state
  set vulnerable = greatest(0, vulnerable - 1),
      weakened = greatest(0, weakened - 1)
  where room_id = p_room_id and screen_id = v_screen_id;

  -- Apply regen to players
  for v_pcs in
    select pcs.player_id, pcs.regen
    from public.player_combat_state pcs
    where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id and pcs.regen > 0
  loop
    update public.characters
    set hp = least(hp_max, hp + v_pcs.regen)
    where room_id = p_room_id and player_id = v_pcs.player_id;
  end loop;

  -- Check party wipe
  select not exists (
    select 1 from public.characters c where c.room_id = p_room_id and c.hp > 0
  ) into v_party_wiped;

  if v_party_wiped then
    update public.combat_turns set phase = 'resolved' where id = v_turn_id;
    return jsonb_build_object('partyWiped', true, 'turnNumber', v_turn_number, 'attacks', v_attacks);
  end if;

  -- Next turn
  update public.combat_turns
  set turn_number = v_turn_number + 1, phase = 'player'
  where id = v_turn_id;

  update public.player_turn_state
  set actions_remaining = 0, has_ended_turn = false
  where combat_turn_id = v_turn_id;

  -- Reset player block (doesn't persist by default), restore energy, draw new hand
  for v_pcs in
    select pcs.id, pcs.draw_pile, pcs.hand, pcs.discard_pile, pcs.max_energy, pcs.starting_block
    from public.player_combat_state pcs
    where pcs.room_id = p_room_id and pcs.screen_id = v_screen_id
  loop
    declare
      v_new_discard jsonb := v_pcs.discard_pile || v_pcs.hand;  -- hand goes to discard
      v_draw_result jsonb;
    begin
      v_draw_result := public._draw_hand(v_pcs.draw_pile, v_new_discard, 5);

      update public.player_combat_state
      set energy = v_pcs.max_energy,
          block = v_pcs.starting_block,  -- reset block (starting_block from bonuses)
          hand = v_draw_result->'hand',
          draw_pile = v_draw_result->'drawPile',
          discard_pile = '[]'::jsonb,
          attune_target_trait = null
      where id = v_pcs.id;
    end;
  end loop;

  return jsonb_build_object('partyWiped', false, 'turnNumber', v_turn_number + 1, 'attacks', v_attacks);
end;
$$;

grant execute on function public.combat_enemy_phase(uuid) to authenticated;

-- ----------------------------
-- Update reset_combat
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
  update public.characters
  set taunt_turns_left = 0
  where room_id = p_room_id;
end;
$$;

-- ----------------------------
-- Drop old RPCs and tables
-- ----------------------------
drop function if exists public.combat_cast_spell(uuid, text, int, uuid, public.player_id, boolean, text);
drop function if exists public.combat_attack(uuid, uuid);
drop function if exists public.combat_ability(uuid, uuid);
drop function if exists public.combat_heal(uuid, public.player_id);
drop table if exists public.spell_definitions cascade;

-- Remove old cooldown columns if they still exist
alter table public.characters drop column if exists ability_cooldown_left;
alter table public.characters drop column if exists heal_cooldown_left;

commit;
