import { playerNameById, roles } from '@/constants/constants';
import type { PlayerId, RoleId } from '@/types/player';

export type PartyStatusRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: 'ready' | 'waiting' | 'neutral' | 'offline';
};

export function buildPartyStatusRows(params: {
  players: Array<{
    player_id: PlayerId;
    role_id: RoleId | null;
    display_name: string | null;
    is_connected: boolean;
  }>;
  isAdventureStarted: boolean;
  resolvedOption: unknown;
  isStoryEnded: boolean;
  continuedByPlayerId: Partial<Record<PlayerId, boolean>>;
}): PartyStatusRow[] {
  const { players, isAdventureStarted, resolvedOption, isStoryEnded, continuedByPlayerId } = params;

  return players.map((player) => {
    const name = player.display_name ?? playerNameById[player.player_id];
    const role = player.role_id
      ? (roles.find((r) => r.id === player.role_id)?.label ?? player.role_id)
      : 'Role: waiting';
    let status = isAdventureStarted ? 'In scene' : player.role_id ? 'Ready' : 'Waiting';
    let tone: PartyStatusRow['tone'] = isAdventureStarted
      ? 'neutral'
      : player.role_id
        ? 'ready'
        : 'waiting';

    if (!player.is_connected) {
      status = 'Disconnected';
      tone = 'offline';
    } else if (isAdventureStarted && resolvedOption && !isStoryEnded) {
      const hasContinued = Boolean(continuedByPlayerId[player.player_id]);
      status = hasContinued ? 'Ready for next scene' : 'Waiting for next scene';
      tone = hasContinued ? 'ready' : 'waiting';
    }

    return { id: player.player_id, name, role, status, tone };
  });
}
