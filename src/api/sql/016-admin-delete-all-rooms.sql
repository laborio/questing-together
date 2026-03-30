-- Admin: delete all rooms regardless of ownership
-- Run this in Supabase SQL Editor.

begin;

drop function if exists public.admin_delete_all_rooms();
create or replace function public.admin_delete_all_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.player_combat_state where id is not null;
  delete from public.enemy_combat_state where id is not null;
  delete from public.combat_turns where id is not null;
  delete from public.player_turn_state where id is not null;
  delete from public.enemies where id is not null;
  delete from public.adventure_screens where id is not null;
  delete from public.characters where id is not null;
  delete from public.room_players where id is not null;
  delete from public.rooms where id is not null;
end;
$$;

grant execute on function public.admin_delete_all_rooms() to authenticated;

commit;
