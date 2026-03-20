-- Apply screen effects (HP/gold/XP changes) to a character
-- Run this in Supabase SQL Editor.

begin;

create or replace function public.apply_screen_effect(
  p_room_id uuid,
  p_hp_delta int default 0,
  p_gold_delta int default 0,
  p_exp_delta int default 0
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
  v_hp int;
  v_hp_max int;
  v_gold int;
  v_new_hp int;
  v_new_gold int;
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

  select c.id, c.hp, c.hp_max, c.gold
  into v_char_id, v_hp, v_hp_max, v_gold
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  v_new_hp := greatest(0, least(v_hp_max, v_hp + p_hp_delta));
  v_new_gold := greatest(0, v_gold + p_gold_delta);

  update public.characters
  set hp = v_new_hp,
      gold = v_new_gold,
      exp = exp + greatest(0, p_exp_delta)
  where id = v_char_id;

  -- Check level up
  perform public.combat_check_level_up(v_char_id);

  return jsonb_build_object(
    'newHp', v_new_hp,
    'newGold', v_new_gold,
    'hpDelta', v_new_hp - v_hp,
    'goldDelta', v_new_gold - v_gold,
    'expDelta', p_exp_delta
  );
end;
$$;

grant execute on function public.apply_screen_effect(uuid, int, int, int) to authenticated;

-- Purchase shop item (deduct gold, apply effect)
create or replace function public.shop_purchase(
  p_room_id uuid,
  p_item_cost int,
  p_hp_delta int default 0,
  p_exp_delta int default 0
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
  v_gold int;
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

  select c.id, c.gold into v_char_id, v_gold
  from public.characters c
  where c.room_id = p_room_id and c.player_id = v_player_id;

  if v_gold < p_item_cost then
    raise exception 'Not enough gold';
  end if;

  return public.apply_screen_effect(p_room_id, p_hp_delta, -p_item_cost, p_exp_delta);
end;
$$;

grant execute on function public.shop_purchase(uuid, int, int, int) to authenticated;

-- Rest: restore HP by percentage for all characters in room
create or replace function public.rest_heal(
  p_room_id uuid,
  p_restore_percent int default 50
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_healed int := 0;
  v_char record;
  v_restore int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  for v_char in
    select c.id, c.hp, c.hp_max
    from public.characters c
    where c.room_id = p_room_id and c.hp > 0
  loop
    v_restore := greatest(1, (v_char.hp_max * p_restore_percent) / 100);
    update public.characters
    set hp = least(hp_max, hp + v_restore)
    where id = v_char.id;
    v_healed := v_healed + 1;
  end loop;

  return v_healed;
end;
$$;

grant execute on function public.rest_heal(uuid, int) to authenticated;

commit;
