import type { PlayerId, RoleId } from '@/types/player';

type RoomPlayer = {
  player_id: PlayerId;
  role_id: RoleId | null;
};

type CombatPlayer = {
  playerId: PlayerId;
  roleId: RoleId;
  displayName: string;
};

export function buildCombatPlayers(
  players: RoomPlayer[],
  displayNameById: Partial<Record<PlayerId, string>>,
): CombatPlayer[] {
  return players
    .filter((p) => p.role_id)
    .map((p) => ({
      playerId: p.player_id,
      roleId: p.role_id as NonNullable<typeof p.role_id>,
      displayName: displayNameById[p.player_id] ?? p.player_id,
    }));
}
