-- Reset combat state when restarting adventure
-- Run this in Supabase SQL Editor.

begin;

create or replace function public.reset_combat(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_char record;
  v_base_hp int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  -- Reset each character with role-based HP
  for v_char in
    select c.id, rp.role_id
    from public.characters c
    join public.room_players rp on rp.room_id = c.room_id and rp.player_id = c.player_id
    where c.room_id = p_room_id
  loop
    v_base_hp := case v_char.role_id
      when 'warrior' then 60
      when 'ranger' then 50
      when 'sage' then 40
      else 50
    end;

    update public.characters
    set hp = v_base_hp,
        hp_max = v_base_hp,
        level = 1,
        gold = 0,
        exp = 0,
        taunt_turns_left = 0
    where id = v_char.id;
  end loop;

  -- Delete old enemies so seed_enemies creates fresh ones
  delete from public.enemies
  where room_id = p_room_id;

  return true;
end;
$$;

grant execute on function public.reset_combat(uuid) to authenticated;

commit;
