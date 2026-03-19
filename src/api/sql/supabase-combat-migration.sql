-- Combat system: HP on characters + 3 combat RPCs
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Add HP + taunt to characters
-- ----------------------------
alter table public.characters add column if not exists hp int not null default 50;
alter table public.characters add column if not exists hp_max int not null default 50;
alter table public.characters add column if not exists taunt_turns_left int not null default 0;

-- ----------------------------
-- Helper: check level up after XP gain
-- ----------------------------
create or replace function public.combat_check_level_up(p_char_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_char record;
  v_xp_needed int;
  v_new_level int;
  v_new_hp_max int;
  v_role_id public.role_id;
  v_base_hp int;
begin
  select c.level, c.exp, c.hp, c.hp_max, c.player_id, c.room_id
  into v_char
  from public.characters c where c.id = p_char_id;

  -- Get role for base HP
  select rp.role_id into v_role_id
  from public.room_players rp
  where rp.room_id = v_char.room_id and rp.player_id = v_char.player_id;

  -- Base HP per role: warrior=60, ranger=50, sage=40
  v_base_hp := case v_role_id
    when 'warrior' then 60
    when 'ranger' then 50
    when 'sage' then 40
    else 50
  end;

  -- Level up loop: XP needed = level * 100
  v_new_level := v_char.level;
  loop
    v_xp_needed := v_new_level * 100;
    exit when v_char.exp < v_xp_needed;
    v_new_level := v_new_level + 1;
  end loop;

  if v_new_level > v_char.level then
    v_new_hp_max := v_base_hp + (v_new_level - 1) * 10;
    update public.characters
    set level = v_new_level,
        hp_max = v_new_hp_max,
        hp = least(hp + (v_new_hp_max - hp_max), v_new_hp_max)
    where id = p_char_id;
  end if;
end;
$$;

-- ----------------------------
-- RPC: combat_attack
-- ----------------------------
create or replace function public.combat_attack(
  p_room_id uuid,
  p_enemy_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_char_id uuid;
  v_char_hp int;
  v_char_level int;
  v_attack_damage int;
  v_enemy_hp int;
  v_enemy_attack int;
  v_enemy_level int;
  v_enemy_dead boolean;
  v_killed boolean := false;
  v_xp_gained int := 0;
  v_gold_gained int := 0;
  v_counter_target uuid;
  v_counter_damage int := 0;
  v_taunter_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get caller's player_id
  select rp.player_id into v_player_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  -- Get caller's character
  select c.id, c.hp, c.level into v_char_id, v_char_hp, v_char_level
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  -- Base 3 + 1 per level
  v_attack_damage := 3 + (v_char_level - 1);

  -- Get enemy
  select e.hp, e.attack, e.level, e.is_dead
  into v_enemy_hp, v_enemy_attack, v_enemy_level, v_enemy_dead
  from public.enemies e
  where e.id = p_enemy_id and e.room_id = p_room_id;

  if v_enemy_dead then
    raise exception 'Enemy is already dead';
  end if;

  -- Deal scaled damage to enemy
  update public.enemies
  set hp = greatest(0, hp - v_attack_damage)
  where id = p_enemy_id;

  -- Check if killed
  if v_enemy_hp - v_attack_damage <= 0 then
    update public.enemies set is_dead = true where id = p_enemy_id;
    v_killed := true;
    v_xp_gained := v_enemy_level * 10;
    v_gold_gained := v_enemy_level * 5;

    update public.characters
    set exp = exp + v_xp_gained,
        gold = gold + v_gold_gained
    where id = v_char_id;

    perform public.combat_check_level_up(v_char_id);
  end if;

  -- Counter-attack (only if enemy still alive)
  if not v_killed then
    -- Check for taunt
    select c.id into v_taunter_id
    from public.characters c
    where c.room_id = p_room_id and c.taunt_turns_left > 0 and c.hp > 0
    limit 1;

    v_counter_target := coalesce(v_taunter_id, v_char_id);
    v_counter_damage := v_enemy_attack;

    update public.characters
    set hp = greatest(0, hp - v_counter_damage)
    where id = v_counter_target;
  end if;

  -- Decrement taunt on taunter
  update public.characters
  set taunt_turns_left = greatest(0, taunt_turns_left - 1)
  where room_id = p_room_id and taunt_turns_left > 0;

  return jsonb_build_object(
    'enemyDamage', v_attack_damage,
    'counterDamage', v_counter_damage,
    'enemyKilled', v_killed,
    'xpGained', v_xp_gained,
    'goldGained', v_gold_gained
  );
end;
$$;

grant execute on function public.combat_attack(uuid, uuid) to authenticated;

-- ----------------------------
-- RPC: combat_ability
-- ----------------------------
create or replace function public.combat_ability(
  p_room_id uuid,
  p_enemy_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_role_id public.role_id;
  v_char_id uuid;
  v_char_hp int;
  v_damage int := 0;
  v_total_xp int := 0;
  v_total_gold int := 0;
  v_kills int := 0;
  v_enemy_record record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select rp.player_id, rp.role_id into v_player_id, v_role_id
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = v_user_id;

  if v_player_id is null then
    raise exception 'Not a room member';
  end if;

  if v_role_id is null then
    raise exception 'No role assigned';
  end if;

  select c.id, c.hp into v_char_id, v_char_hp
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  -- WARRIOR: Taunt 3 turns
  if v_role_id = 'warrior' then
    update public.characters
    set taunt_turns_left = 3
    where id = v_char_id;

    return jsonb_build_object('ability', 'taunt', 'tauntTurns', 3);
  end if;

  -- SAGE: Fireball 20 damage to single target
  if v_role_id = 'sage' then
    if p_enemy_id is null then
      raise exception 'Select a target';
    end if;

    select e.level, e.hp, e.is_dead into v_enemy_record
    from public.enemies e
    where e.id = p_enemy_id and e.room_id = p_room_id;

    if v_enemy_record.is_dead then
      raise exception 'Enemy is already dead';
    end if;

    v_damage := 6;
    update public.enemies set hp = greatest(0, hp - v_damage) where id = p_enemy_id;

    if v_enemy_record.hp - v_damage <= 0 then
      update public.enemies set is_dead = true where id = p_enemy_id;
      v_kills := 1;
      v_total_xp := v_enemy_record.level * 10;
      v_total_gold := v_enemy_record.level * 5;
      update public.characters
      set exp = exp + v_total_xp, gold = gold + v_total_gold
      where id = v_char_id;
      perform public.combat_check_level_up(v_char_id);
    end if;

    return jsonb_build_object(
      'ability', 'fireball', 'damage', v_damage,
      'kills', v_kills, 'xpGained', v_total_xp, 'goldGained', v_total_gold
    );
  end if;

  -- RANGER: Arrows 7 damage to ALL alive enemies
  if v_role_id = 'ranger' then
    v_damage := 3;

    for v_enemy_record in
      select e.id, e.hp, e.level
      from public.enemies e
      where e.room_id = p_room_id and e.is_dead = false
    loop
      update public.enemies set hp = greatest(0, hp - v_damage) where id = v_enemy_record.id;

      if v_enemy_record.hp - v_damage <= 0 then
        update public.enemies set is_dead = true where id = v_enemy_record.id;
        v_kills := v_kills + 1;
        v_total_xp := v_total_xp + v_enemy_record.level * 10;
        v_total_gold := v_total_gold + v_enemy_record.level * 5;
      end if;
    end loop;

    if v_total_xp > 0 or v_total_gold > 0 then
      update public.characters
      set exp = exp + v_total_xp, gold = gold + v_total_gold
      where id = v_char_id;
      perform public.combat_check_level_up(v_char_id);
    end if;

    return jsonb_build_object(
      'ability', 'arrows', 'damagePerEnemy', v_damage,
      'kills', v_kills, 'xpGained', v_total_xp, 'goldGained', v_total_gold
    );
  end if;

  raise exception 'Unknown role';
end;
$$;

grant execute on function public.combat_ability(uuid, uuid) to authenticated;

-- ----------------------------
-- RPC: combat_heal
-- ----------------------------
create or replace function public.combat_heal(
  p_room_id uuid,
  p_target_player_id public.player_id default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_char_hp int;
  v_target_player_id public.player_id;
  v_target_hp int;
  v_target_hp_max int;
  v_healed int;
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

  select c.hp into v_char_hp
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  v_target_player_id := coalesce(p_target_player_id, v_player_id);

  select c.hp, c.hp_max into v_target_hp, v_target_hp_max
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_target_player_id;

  if v_target_hp is null then
    raise exception 'Target not found';
  end if;

  v_healed := least(10, v_target_hp_max - v_target_hp);

  update public.characters
  set hp = least(hp_max, hp + 10)
  where room_id = p_room_id and player_id = v_target_player_id;

  return jsonb_build_object(
    'targetPlayerId', v_target_player_id,
    'hpRestored', v_healed,
    'newHp', least(v_target_hp + 10, v_target_hp_max)
  );
end;
$$;

grant execute on function public.combat_heal(uuid, public.player_id) to authenticated;

commit;
