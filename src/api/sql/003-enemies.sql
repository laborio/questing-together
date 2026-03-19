-- Enemies table + auto-seed on adventure start
-- Run this in Supabase SQL Editor.

begin;

-- ----------------------------
-- Enemies table
-- ----------------------------
create table if not exists public.enemies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  position int not null,
  name text not null,
  level int not null default 1,
  hp int not null,
  hp_max int not null,
  attack int not null default 3,
  is_dead boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, position)
);

create index if not exists idx_enemies_room on public.enemies(room_id);

-- ----------------------------
-- RLS
-- ----------------------------
alter table public.enemies enable row level security;

drop policy if exists enemies_select_member on public.enemies;
create policy enemies_select_member
on public.enemies
for select
to authenticated
using (public.is_room_member(room_id));

grant select on public.enemies to authenticated;

-- ----------------------------
-- Realtime
-- ----------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enemies'
  ) then
    execute 'alter publication supabase_realtime add table public.enemies';
  end if;
end
$$;

-- ----------------------------
-- seed_enemies: generate 30 enemies for a room
-- ----------------------------
create or replace function public.seed_enemies(p_room_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing int;
  v_names text[] := array[
    'Goule', 'Goule Massive', 'Squelette', 'Squelette Archer',
    'Loup Noir', 'Araignée Géante', 'Bandit', 'Spectre',
    'Ogre', 'Gobelin', 'Rat Géant', 'Chauve-souris',
    'Slime', 'Troll', 'Ombre Errante'
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

  if not public.is_room_member(p_room_id) then
    raise exception 'Not a room member';
  end if;

  -- Don't re-seed if enemies already exist
  select count(*) into v_existing
  from public.enemies
  where room_id = p_room_id;

  if v_existing > 0 then
    return v_existing;
  end if;

  for i in 0..29 loop
    v_name := v_names[1 + floor(random() * array_length(v_names, 1))::int];
    v_level := 1 + floor(i / 3.0)::int + floor(random() * 2)::int;
    v_hp := v_level * 8 + floor(random() * v_level * 4)::int;
    v_attack := v_level * 2 + floor(random() * v_level)::int;

    insert into public.enemies (room_id, position, name, level, hp, hp_max, attack)
    values (p_room_id, i, v_name || ' (Lv.' || v_level || ')', v_level, v_hp, v_hp, v_attack);
  end loop;

  return 30;
end;
$$;

grant execute on function public.seed_enemies(uuid) to authenticated;

commit;
