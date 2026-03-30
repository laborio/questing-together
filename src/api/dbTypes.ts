import type { Database } from '@/api/database.types';

// Table row types
type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomPlayerRow = Database['public']['Tables']['room_players']['Row'];
type CharacterRow = Database['public']['Tables']['characters']['Row'];
type EnemyRow = Database['public']['Tables']['enemies']['Row'];
type AdventureScreenRow = Database['public']['Tables']['adventure_screens']['Row'];
type CombatTurnRow = Database['public']['Tables']['combat_turns']['Row'];
type PlayerTurnStateRow = Database['public']['Tables']['player_turn_state']['Row'];

// Player combat state — manual type since database.types.ts won't have it until regenerated
type PlayerCombatStateRow = {
  id: string;
  room_id: string;
  screen_id: string;
  player_id: PlayerId;
  identity_id: string;
  draw_pile: unknown[];
  hand: unknown[];
  discard_pile: unknown[];
  energy: number;
  max_energy: number;
  block: number;
  trait_charges: Record<string, number>;
  attune_charges: number;
  attune_target_trait: string | null;
  burn: number;
  vulnerable: number;
  weakened: number;
  thorns: number;
  regen: number;
  starting_block: number;
  free_reroll: boolean;
};

type EnemyCombatStateRow = {
  id: string;
  room_id: string;
  screen_id: string;
  template_id: string;
  name: string;
  icon: string;
  position: number;
  hp: number;
  hp_max: number;
  strength: number;
  block: number;
  intent_index: number;
  is_dead: boolean;
  burn: number;
  vulnerable: number;
  weakened: number;
};

// Enum types
type PlayerId = Database['public']['Enums']['player_id'];
type RoleId = Database['public']['Enums']['role_id'];
type RoomStatus = Database['public']['Enums']['room_status'];
type ScreenType = Database['public']['Enums']['screen_type'];
type PhaseType = Database['public']['Enums']['phase_type'];

// RPC return types
type ListMyRoomsReturn = Database['public']['Functions']['list_my_rooms']['Returns'][number];
type ListAvailableRoomsReturn =
  Database['public']['Functions']['list_available_rooms']['Returns'][number];
type PeekRoomReturn = Database['public']['Functions']['peek_room']['Returns'][number];

export type {
  AdventureScreenRow,
  CharacterRow,
  CombatTurnRow,
  EnemyCombatStateRow,
  EnemyRow,
  ListAvailableRoomsReturn,
  ListMyRoomsReturn,
  PeekRoomReturn,
  PhaseType,
  PlayerCombatStateRow,
  PlayerId,
  PlayerTurnStateRow,
  RoleId,
  RoomPlayerRow,
  RoomRow,
  RoomStatus,
  ScreenType,
};
