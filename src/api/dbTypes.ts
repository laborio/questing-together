import type { Database } from '@/api/database.types';

// Table row types
type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomPlayerRow = Database['public']['Tables']['room_players']['Row'];
type CharacterRow = Database['public']['Tables']['characters']['Row'];
type EnemyRow = Database['public']['Tables']['enemies']['Row'];
type AdventureScreenRow = Database['public']['Tables']['adventure_screens']['Row'];
type CombatTurnRow = Database['public']['Tables']['combat_turns']['Row'];
type PlayerTurnStateRow = Database['public']['Tables']['player_turn_state']['Row'];

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
  EnemyRow,
  ListAvailableRoomsReturn,
  ListMyRoomsReturn,
  PeekRoomReturn,
  PhaseType,
  PlayerId,
  PlayerTurnStateRow,
  RoleId,
  RoomPlayerRow,
  RoomRow,
  RoomStatus,
  ScreenType,
};
