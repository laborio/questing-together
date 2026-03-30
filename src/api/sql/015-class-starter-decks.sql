-- Class-specific starter decks
-- Each class (warrior/sage/ranger) gets a unique 15-card starter deck.
-- Run this in Supabase SQL Editor.

begin;

-- Add starter_role column to card_definitions
alter table public.card_definitions add column if not exists starter_role public.role_id default null;

-- Remove old universal starters
delete from public.card_definitions where is_starter = true;

-- ═══════════════════════════════════════════════════
-- WARRIOR STARTER (15 cards) — Guard/Nature tank
-- ═══════════════════════════════════════════════════

insert into public.card_definitions (id, name, cost, trait, description, upgrade_threshold, upgrade_name, upgrade_description, base_damage, upgraded_damage, base_block, upgraded_block, base_heal, upgraded_heal, base_burn, upgraded_burn, is_aoe, is_starter, starter_role) values
  ('w-guard-stance', 'Guard Stance', 1, 'guard', 'Gain 7 Block.', 3, 'Guard Stance+', 'Gain 10 Block. Deal 2 damage.', null, 2, 7, 10, null, null, null, null, false, true, 'warrior'),
  ('w-fortify', 'Fortify', 2, 'guard', 'Gain 12 Block. Persists.', 3, 'Fortify+', 'Gain 16 Block. Persists.', null, null, 12, 16, null, null, null, null, false, true, 'warrior'),
  ('w-shield-bash', 'Shield Bash', 1, 'guard', 'Gain 4 Block. Deal 4 damage.', 3, 'Shield Bash+', 'Gain 6 Block. Deal 6 damage.', 4, 6, 4, 6, null, null, null, null, false, true, 'warrior'),
  ('w-iron-wall', 'Iron Wall', 2, 'guard', 'Gain 10 Block. +2 Thorns.', 3, 'Iron Wall+', 'Gain 14 Block. +3 Thorns.', null, null, 10, 14, null, null, null, null, false, true, 'warrior'),
  ('w-brace', 'Brace', 0, 'guard', 'Gain 3 Block.', 3, 'Brace+', 'Gain 5 Block.', null, null, 3, 5, null, null, null, null, false, true, 'warrior'),
  ('w-cleave', 'Cleave', 1, 'fire', 'Deal 6 damage.', 3, 'Cleave+', 'Deal 9 damage.', 6, 9, null, null, null, null, null, null, false, true, 'warrior'),
  ('w-reckless-swing', 'Reckless Swing', 2, 'fire', 'Deal 14 damage.', 3, 'Reckless Swing+', 'Deal 18 damage.', 14, 18, null, null, null, null, null, null, false, true, 'warrior'),
  ('w-war-cry', 'War Cry', 2, 'fire', 'Deal 8 damage to all.', 3, 'War Cry+', 'Deal 12 damage to all.', 8, 12, null, null, null, null, null, null, true, true, 'warrior'),
  ('w-battle-mend', 'Battle Mend', 1, 'nature', 'Heal 6 HP.', 3, 'Battle Mend+', 'Heal 10 HP.', null, null, null, null, 6, 10, null, null, false, true, 'warrior'),
  ('w-second-wind', 'Second Wind', 0, 'nature', 'Heal 3 HP.', 3, 'Second Wind+', 'Heal 5 HP. +1 Regen.', null, null, null, null, 3, 5, null, null, false, true, 'warrior'),
  ('w-vine-armor', 'Vine Armor', 1, 'nature', 'Gain 5 Block. Heal 3 HP.', 3, 'Vine Armor+', 'Gain 7 Block. Heal 5 HP.', null, null, 5, 7, 3, 5, null, null, false, true, 'warrior'),
  ('w-provoke', 'Provoke', 0, 'shadow', 'Deal 2 damage. Weaken 1.', 3, 'Provoke+', 'Deal 4 damage. Weaken 1.', 2, 4, null, null, null, null, null, null, false, true, 'warrior'),
  ('w-battle-shout', 'Battle Shout', 0, 'storm', 'Deal 2 damage.', 3, 'Battle Shout+', 'Deal 4 damage. +1 energy if chained.', 2, 4, null, null, null, null, null, null, false, true, 'warrior'),
  ('w-haymaker', 'Haymaker', 3, 'neutral', 'Deal 18 damage.', 3, 'Haymaker+', 'Deal 24 damage.', 18, 24, null, null, null, null, null, null, false, true, 'warrior'),
  ('w-focus', 'Focus', 1, 'neutral', 'Transform into random card.', 99, 'Focus+', 'Transform. Costs 0.', null, null, null, null, null, null, null, null, false, true, 'warrior')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════
-- SAGE STARTER (15 cards) — Fire/Storm damage dealer
-- ═══════════════════════════════════════════════════

insert into public.card_definitions (id, name, cost, trait, description, upgrade_threshold, upgrade_name, upgrade_description, base_damage, upgraded_damage, base_block, upgraded_block, base_heal, upgraded_heal, base_burn, upgraded_burn, is_aoe, is_starter, starter_role) values
  ('s-fireball', 'Fireball', 1, 'fire', 'Deal 8 damage.', 3, 'Fireball+', 'Deal 11 damage. +1 Fire charge.', 8, 11, null, null, null, null, null, null, false, true, 'sage'),
  ('s-scorch', 'Scorch', 1, 'fire', 'Deal 5 damage. Burn 5.', 3, 'Scorch+', 'Deal 8 damage. Burn 8.', 5, 8, null, null, null, null, 5, 8, false, true, 'sage'),
  ('s-wildfire', 'Wildfire', 2, 'fire', 'Deal 12 damage to all.', 3, 'Wildfire+', 'Deal 16 damage to all.', 12, 16, null, null, null, null, null, null, true, true, 'sage'),
  ('s-ignite', 'Ignite', 0, 'fire', 'Deal 3 damage.', 3, 'Ignite+', 'Deal 5 damage. Burn 3.', 3, 5, null, null, null, null, null, 3, false, true, 'sage'),
  ('s-flame-lance', 'Flame Lance', 2, 'fire', 'Deal 10 damage. Burn 4.', 3, 'Flame Lance+', 'Deal 14 damage. Burn 6.', 10, 14, null, null, null, null, 4, 6, false, true, 'sage'),
  ('s-zap', 'Zap', 0, 'storm', 'Deal 2 damage.', 3, 'Zap+', 'Deal 4 damage. +1 energy if chained.', 2, 4, null, null, null, null, null, null, false, true, 'sage'),
  ('s-arc-bolt', 'Arc Bolt', 2, 'storm', 'Deal 9 damage. +1 energy.', 3, 'Arc Bolt+', 'Deal 13 damage. +1 energy.', 9, 13, null, null, null, null, null, null, false, true, 'sage'),
  ('s-chain-spark', 'Chain Spark', 1, 'storm', 'Deal 5 damage. +1 energy if chained.', 3, 'Chain Lightning', 'Deal 8 damage. +1 energy.', 5, 8, null, null, null, null, null, null, false, true, 'sage'),
  ('s-static-field', 'Static Field', 1, 'storm', 'Deal 3 damage to all.', 3, 'Static Field+', 'Deal 6 damage to all.', 3, 6, null, null, null, null, null, null, true, true, 'sage'),
  ('s-ice-shield', 'Ice Shield', 1, 'nature', 'Heal 6 HP.', 3, 'Ice Shield+', 'Heal 10 HP.', null, null, null, null, 6, 10, null, null, false, true, 'sage'),
  ('s-mana-bloom', 'Mana Bloom', 0, 'nature', 'Heal 2 HP.', 3, 'Mana Bloom+', 'Heal 4 HP. +1 Regen.', null, null, null, null, 2, 4, null, null, false, true, 'sage'),
  ('s-arcane-ward', 'Arcane Ward', 0, 'guard', 'Gain 3 Block.', 3, 'Arcane Ward+', 'Gain 5 Block.', null, null, 3, 5, null, null, null, null, false, true, 'sage'),
  ('s-hex', 'Hex', 1, 'shadow', 'Deal 3 damage. Vuln 2 turns.', 3, 'Hex+', 'Deal 5 damage. Vuln 3 turns.', 3, 5, null, null, null, null, null, null, false, true, 'sage'),
  ('s-haymaker', 'Haymaker', 3, 'neutral', 'Deal 18 damage.', 3, 'Haymaker+', 'Deal 24 damage.', 18, 24, null, null, null, null, null, null, false, true, 'sage'),
  ('s-focus', 'Focus', 1, 'neutral', 'Transform into random card.', 99, 'Focus+', 'Transform. Costs 0.', null, null, null, null, null, null, null, null, false, true, 'sage')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════
-- RANGER STARTER (15 cards) — Shadow/Nature debuff
-- ═══════════════════════════════════════════════════

insert into public.card_definitions (id, name, cost, trait, description, upgrade_threshold, upgrade_name, upgrade_description, base_damage, upgraded_damage, base_block, upgraded_block, base_heal, upgraded_heal, base_burn, upgraded_burn, is_aoe, is_starter, starter_role) values
  ('r-shadow-mark', 'Shadow Mark', 1, 'shadow', 'Apply Vulnerable 2 turns.', 3, 'Deep Mark', 'Vuln 3 turns. Deal 4 damage.', 0, 4, null, null, null, null, null, null, false, true, 'ranger'),
  ('r-ambush', 'Ambush', 2, 'shadow', 'Deal 10 damage. +5 if Vuln.', 3, 'Ambush+', 'Deal 13 damage. +8 if Vuln.', 10, 13, null, null, null, null, null, null, false, true, 'ranger'),
  ('r-poison-arrow', 'Poison Arrow', 1, 'shadow', 'Deal 4 damage. Burn 4.', 3, 'Venom Arrow', 'Deal 7 damage. Burn 6.', 4, 7, null, null, null, null, 4, 6, false, true, 'ranger'),
  ('r-nick', 'Nick', 0, 'shadow', 'Deal 2 damage. Weaken 1.', 3, 'Nick+', 'Deal 4 damage. Weaken 1. Vuln 1.', 2, 4, null, null, null, null, null, null, false, true, 'ranger'),
  ('r-smoke-bomb', 'Smoke Bomb', 1, 'shadow', 'Gain 5 Block. Weaken 1.', 3, 'Smoke Bomb+', 'Gain 7 Block. Weaken 2.', null, null, 5, 7, null, null, null, null, false, true, 'ranger'),
  ('r-vine-lash', 'Vine Lash', 1, 'nature', 'Deal 3 damage. Heal 5 HP.', 3, 'Vine Lash+', 'Deal 6 damage. Heal 8 HP.', 3, 6, null, null, 5, 8, null, null, false, true, 'ranger'),
  ('r-regrowth', 'Regrowth', 1, 'nature', 'Heal 6 HP.', 3, 'Regrowth+', 'Heal 10 HP. +1 Regen.', null, null, null, null, 6, 10, null, null, false, true, 'ranger'),
  ('r-thorn-burst', 'Thorn Burst', 1, 'nature', 'Deal 3 damage to all.', 3, 'Thorn Burst+', 'Deal 6 damage to all.', 3, 6, null, null, null, null, null, null, true, true, 'ranger'),
  ('r-sprout', 'Sprout', 0, 'nature', 'Heal 2 HP.', 3, 'Sprout+', 'Heal 4 HP. +1 Regen.', null, null, null, null, 2, 4, null, null, false, true, 'ranger'),
  ('r-flame-arrow', 'Flame Arrow', 1, 'fire', 'Deal 6 damage. Burn 3.', 3, 'Flame Arrow+', 'Deal 8 damage. Burn 5.', 6, 8, null, null, null, null, 3, 5, false, true, 'ranger'),
  ('r-volley', 'Volley', 2, 'fire', 'Deal 8 damage to all.', 3, 'Volley+', 'Deal 12 damage to all.', 8, 12, null, null, null, null, null, null, true, true, 'ranger'),
  ('r-dodge', 'Dodge', 0, 'guard', 'Gain 3 Block.', 3, 'Dodge+', 'Gain 5 Block.', null, null, 3, 5, null, null, null, null, false, true, 'ranger'),
  ('r-quick-shot', 'Quick Shot', 0, 'storm', 'Deal 2 damage.', 3, 'Quick Shot+', 'Deal 4 damage. +1 energy if chained.', 2, 4, null, null, null, null, null, null, false, true, 'ranger'),
  ('r-snipe', 'Snipe', 3, 'neutral', 'Deal 20 damage.', 3, 'Snipe+', 'Deal 26 damage.', 20, 26, null, null, null, null, null, null, false, true, 'ranger'),
  ('r-focus', 'Focus', 1, 'neutral', 'Transform into random card.', 99, 'Focus+', 'Transform. Costs 0.', null, null, null, null, null, null, null, null, false, true, 'ranger')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════
-- Update combat_init_turn to use role-specific starter deck
-- ═══════════════════════════════════════════════════

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

  update public.characters set taunt_turns_left = 0 where room_id = p_room_id;
end;
$$;

grant execute on function public.combat_init_turn(uuid, uuid) to authenticated;

commit;
