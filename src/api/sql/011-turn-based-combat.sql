-- Turn-based combat system
-- Replaces free-action + counter-attack model with phased turns.
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- New tables
-- ----------------------------

create table if not exists public.combat_turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  screen_id uuid not null references public.adventure_screens(id) on delete cascade,
  turn_number int not null default 1,
  phase text not null default 'player', -- 'player' | 'enemy' | 'resolved'
  created_at timestamptz not null default now(),
  unique (room_id, screen_id)
);

create table if not exists public.player_turn_state (
  id uuid primary key default gen_random_uuid(),
  combat_turn_id uuid not null references public.combat_turns(id) on delete cascade,
  player_id public.player_id not null,
  actions_remaining int not null default 3,
  has_ended_turn boolean not null default false,
  unique (combat_turn_id, player_id)
);

-- ----------------------------
-- Add cooldown columns to characters
-- ----------------------------
alter table public.characters add column if not exists ability_cooldown_left int not null default 0;
alter table public.characters add column if not exists heal_cooldown_left int not null default 0;

-- ----------------------------
-- RLS
-- ----------------------------
alter table public.combat_turns enable row level security;
alter table public.player_turn_state enable row level security;

drop policy if exists combat_turns_select on public.combat_turns;
create policy combat_turns_select on public.combat_turns
  for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists player_turn_state_select on public.player_turn_state;
create policy player_turn_state_select on public.player_turn_state
  for select to authenticated
  using (exists (
    select 1 from public.combat_turns ct
    where ct.id = combat_turn_id and public.is_room_member(ct.room_id)
  ));

grant select on public.combat_turns to authenticated;
grant select on public.player_turn_state to authenticated;

-- ----------------------------
-- Realtime
-- ----------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_turns'
  ) then
    execute 'alter publication supabase_realtime add table public.combat_turns';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'player_turn_state'
  ) then
    execute 'alter publication supabase_realtime add table public.player_turn_state';
  end if;
end
$$;

-- ----------------------------
-- RPC: combat_init_turn
-- Creates turn state for a combat screen
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
begin
  -- Don't re-init
  if exists (select 1 from public.combat_turns where room_id = p_room_id and screen_id = p_screen_id) then
    return;
  end if;

  insert into public.combat_turns (room_id, screen_id, turn_number, phase)
  values (p_room_id, p_screen_id, 1, 'player')
  returning id into v_turn_id;

  for v_player in
    select rp.player_id
    from public.room_players rp
    where rp.room_id = p_room_id
  loop
    insert into public.player_turn_state (combat_turn_id, player_id, actions_remaining, has_ended_turn)
    values (v_turn_id, v_player.player_id, 3, false);
  end loop;

  -- Reset cooldowns
  update public.characters
  set ability_cooldown_left = 0, heal_cooldown_left = 0
  where room_id = p_room_id;
end;
$$;

grant execute on function public.combat_init_turn(uuid, uuid) to authenticated;

-- ----------------------------
-- Update seed_enemies_for_screen to also init turn
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

  -- Init turn state for this combat screen
  perform public.combat_init_turn(p_room_id, p_screen_id);

  return v_enemy_count;
end;
$$;

-- ----------------------------
-- RPC: combat_attack (rewritten — no counter-attack)
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
  v_enemy_level int;
  v_enemy_dead boolean;
  v_killed boolean := false;
  v_xp_gained int := 0;
  v_gold_gained int := 0;
  v_turn_id uuid;
  v_actions int;
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

  -- Check turn state: must be player phase with actions remaining
  select ct.id into v_turn_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  select pts.actions_remaining into v_actions
  from public.player_turn_state pts
  where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id;

  if v_actions is null or v_actions <= 0 then
    raise exception 'No actions remaining';
  end if;

  -- Check not ended turn
  if exists (
    select 1 from public.player_turn_state pts
    where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id and pts.has_ended_turn = true
  ) then
    raise exception 'Turn already ended';
  end if;

  -- Get character
  select c.id, c.hp, c.level into v_char_id, v_char_hp, v_char_level
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  v_attack_damage := 3 + (v_char_level - 1);

  -- Get enemy
  select e.hp, e.level, e.is_dead
  into v_enemy_hp, v_enemy_level, v_enemy_dead
  from public.enemies e
  where e.id = p_enemy_id and e.room_id = p_room_id;

  if v_enemy_dead then
    raise exception 'Enemy is already dead';
  end if;

  -- Deal damage
  update public.enemies
  set hp = greatest(0, hp - v_attack_damage)
  where id = p_enemy_id;

  if v_enemy_hp - v_attack_damage <= 0 then
    update public.enemies set is_dead = true where id = p_enemy_id;
    v_killed := true;
    v_xp_gained := v_enemy_level * 10;
    v_gold_gained := v_enemy_level * 5;

    update public.characters
    set exp = exp + v_xp_gained, gold = gold + v_gold_gained
    where id = v_char_id;

    perform public.combat_check_level_up(v_char_id);
  end if;

  -- Decrement actions
  update public.player_turn_state
  set actions_remaining = actions_remaining - 1
  where combat_turn_id = v_turn_id and player_id = v_player_id;

  return jsonb_build_object(
    'enemyDamage', v_attack_damage,
    'enemyKilled', v_killed,
    'xpGained', v_xp_gained,
    'goldGained', v_gold_gained
  );
end;
$$;

-- ----------------------------
-- RPC: combat_ability (rewritten — no counter-attack)
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
  v_turn_id uuid;
  v_actions int;
  v_cooldown int;
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

  -- Check turn state
  select ct.id into v_turn_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  select pts.actions_remaining into v_actions
  from public.player_turn_state pts
  where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id;

  if v_actions is null or v_actions <= 0 then
    raise exception 'No actions remaining';
  end if;

  if exists (
    select 1 from public.player_turn_state pts
    where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id and pts.has_ended_turn = true
  ) then
    raise exception 'Turn already ended';
  end if;

  select c.id, c.hp, c.ability_cooldown_left into v_char_id, v_char_hp, v_cooldown
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  if v_cooldown > 0 then
    raise exception 'Ability on cooldown (%s turns left)', v_cooldown;
  end if;

  -- WARRIOR: Taunt
  if v_role_id = 'warrior' then
    update public.characters
    set taunt_turns_left = 5, ability_cooldown_left = 3
    where id = v_char_id;

    update public.player_turn_state
    set actions_remaining = actions_remaining - 1
    where combat_turn_id = v_turn_id and player_id = v_player_id;

    return jsonb_build_object('ability', 'taunt', 'tauntTurns', 5);
  end if;

  -- SAGE: Fireball 6 damage single target
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

    update public.characters set ability_cooldown_left = 3 where id = v_char_id;

    update public.player_turn_state
    set actions_remaining = actions_remaining - 1
    where combat_turn_id = v_turn_id and player_id = v_player_id;

    return jsonb_build_object(
      'ability', 'fireball', 'damage', v_damage,
      'kills', v_kills, 'xpGained', v_total_xp, 'goldGained', v_total_gold
    );
  end if;

  -- RANGER: Arrows 3 damage AoE
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

    update public.characters set ability_cooldown_left = 3 where id = v_char_id;

    update public.player_turn_state
    set actions_remaining = actions_remaining - 1
    where combat_turn_id = v_turn_id and player_id = v_player_id;

    return jsonb_build_object(
      'ability', 'arrows', 'damagePerEnemy', v_damage,
      'kills', v_kills, 'xpGained', v_total_xp, 'goldGained', v_total_gold
    );
  end if;

  raise exception 'Unknown role';
end;
$$;

-- ----------------------------
-- RPC: combat_heal (rewritten — no counter-attack)
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
  v_turn_id uuid;
  v_actions int;
  v_cooldown int;
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

  -- Check turn state
  select ct.id into v_turn_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  select pts.actions_remaining into v_actions
  from public.player_turn_state pts
  where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id;

  if v_actions is null or v_actions <= 0 then
    raise exception 'No actions remaining';
  end if;

  if exists (
    select 1 from public.player_turn_state pts
    where pts.combat_turn_id = v_turn_id and pts.player_id = v_player_id and pts.has_ended_turn = true
  ) then
    raise exception 'Turn already ended';
  end if;

  select c.hp, c.heal_cooldown_left into v_char_hp, v_cooldown
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_char_hp <= 0 then
    raise exception 'Your character is dead';
  end if;

  if v_cooldown > 0 then
    raise exception 'Heal on cooldown (%s turns left)', v_cooldown;
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

  -- Set cooldown
  update public.characters
  set heal_cooldown_left = 2
  where room_id = p_room_id and player_id = v_player_id;

  -- Decrement actions
  update public.player_turn_state
  set actions_remaining = actions_remaining - 1
  where combat_turn_id = v_turn_id and player_id = v_player_id;

  return jsonb_build_object(
    'targetPlayerId', v_target_player_id,
    'hpRestored', v_healed,
    'newHp', least(v_target_hp + 10, v_target_hp_max)
  );
end;
$$;

-- ----------------------------
-- RPC: combat_end_turn
-- Player signals end of their turn
-- ----------------------------
create or replace function public.combat_end_turn(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_id public.player_id;
  v_turn_id uuid;
  v_all_ended boolean;
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

  select ct.id into v_turn_id
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'player';

  if v_turn_id is null then
    raise exception 'Not in player phase';
  end if;

  -- Mark this player as ended
  update public.player_turn_state
  set has_ended_turn = true
  where combat_turn_id = v_turn_id and player_id = v_player_id;

  -- Check if all alive players have ended
  select not exists (
    select 1
    from public.player_turn_state pts
    join public.characters c on c.room_id = p_room_id and c.player_id = pts.player_id
    where pts.combat_turn_id = v_turn_id
      and pts.has_ended_turn = false
      and c.hp > 0
  ) into v_all_ended;

  if v_all_ended then
    update public.combat_turns
    set phase = 'enemy'
    where id = v_turn_id;
  end if;

  return jsonb_build_object('allReady', v_all_ended);
end;
$$;

grant execute on function public.combat_end_turn(uuid) to authenticated;

-- ----------------------------
-- RPC: combat_enemy_phase
-- All enemies attack all players, then start next turn
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
  v_turn_number int;
  v_enemy record;
  v_char record;
  v_taunter_id uuid;
  v_damage int;
  v_attacks jsonb := '[]'::jsonb;
  v_party_wiped boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Must be enemy phase
  select ct.id, ct.turn_number into v_turn_id, v_turn_number
  from public.combat_turns ct
  where ct.room_id = p_room_id and ct.phase = 'enemy';

  if v_turn_id is null then
    raise exception 'Not in enemy phase';
  end if;

  -- Find taunter
  select c.id into v_taunter_id
  from public.characters c
  where c.room_id = p_room_id and c.taunt_turns_left > 0 and c.hp > 0
  limit 1;

  -- Each alive enemy attacks
  for v_enemy in
    select e.id, e.name, e.attack
    from public.enemies e
    where e.room_id = p_room_id and e.is_dead = false
  loop
    if v_taunter_id is not null then
      -- All damage redirected to taunter with 60% reduction
      v_damage := greatest(1, (v_enemy.attack * 4) / 10);
      update public.characters
      set hp = greatest(0, hp - v_damage)
      where id = v_taunter_id;

      v_attacks := v_attacks || jsonb_build_object(
        'enemyId', v_enemy.id,
        'enemyName', v_enemy.name,
        'targetType', 'taunter',
        'damage', v_damage
      );
    else
      -- Attack all alive players
      for v_char in
        select c.id, c.player_id
        from public.characters c
        where c.room_id = p_room_id and c.hp > 0
      loop
        v_damage := v_enemy.attack;
        update public.characters
        set hp = greatest(0, hp - v_damage)
        where id = v_char.id;

        v_attacks := v_attacks || jsonb_build_object(
          'enemyId', v_enemy.id,
          'enemyName', v_enemy.name,
          'targetPlayerId', v_char.player_id,
          'damage', v_damage
        );
      end loop;
    end if;
  end loop;

  -- Decrement taunt (once per turn)
  update public.characters
  set taunt_turns_left = greatest(0, taunt_turns_left - 1)
  where room_id = p_room_id and taunt_turns_left > 0;

  -- Decrement cooldowns (once per turn)
  update public.characters
  set ability_cooldown_left = greatest(0, ability_cooldown_left - 1),
      heal_cooldown_left = greatest(0, heal_cooldown_left - 1)
  where room_id = p_room_id;

  -- Check party wipe
  select not exists (
    select 1 from public.characters c
    where c.room_id = p_room_id and c.hp > 0
  ) into v_party_wiped;

  if v_party_wiped then
    update public.combat_turns
    set phase = 'resolved'
    where id = v_turn_id;

    return jsonb_build_object(
      'partyWiped', true,
      'turnNumber', v_turn_number,
      'attacks', v_attacks
    );
  end if;

  -- Next turn: increment turn, reset to player phase, reset actions
  update public.combat_turns
  set turn_number = v_turn_number + 1, phase = 'player'
  where id = v_turn_id;

  update public.player_turn_state
  set actions_remaining = 3, has_ended_turn = false
  where combat_turn_id = v_turn_id;

  return jsonb_build_object(
    'partyWiped', false,
    'turnNumber', v_turn_number + 1,
    'attacks', v_attacks
  );
end;
$$;

grant execute on function public.combat_enemy_phase(uuid) to authenticated;

-- ----------------------------
-- Update reset_combat to clean up turn state
-- ----------------------------
drop function if exists public.reset_combat(uuid);
create or replace function public.reset_combat(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.combat_turns where room_id = p_room_id;
  delete from public.enemies where room_id = p_room_id;
  update public.characters
  set ability_cooldown_left = 0, heal_cooldown_left = 0, taunt_turns_left = 0
  where room_id = p_room_id;
end;
$$;

commit;
