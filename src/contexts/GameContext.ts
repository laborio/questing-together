import { createContext, type Dispatch, type SetStateAction, useContext } from 'react';
import type { useAnonymousAuth } from '@/api/hooks/use-anonymous-auth';
import type { useRoomConnection } from '@/api/hooks/use-room-connection';
import type { usePartyEmotes } from '@/hooks/usePartyEmotes';
import type { useRoomStory } from '@/hooks/useRoomStory';
import type { PlayerId, RoleId } from '@/types/player';
import type { PartyStatusRow } from '@/utils/buildPartyStatusRows';

type GameStateValue = {
  auth: ReturnType<typeof useAnonymousAuth>;
  roomConnection: ReturnType<typeof useRoomConnection>;
  room: ReturnType<typeof useRoomConnection>['room'];
  roomId: string | null;
  localPlayerId: PlayerId | null;
  localRole: RoleId | null;
  localDisplayName: string;
  isHost: boolean;
  isTitleScreen: boolean;
  isLobby: boolean;
  isStoryView: boolean;
  isAdventureStarted: boolean;
  hasTechAlert: boolean;
  playerDisplayNameById: Partial<Record<PlayerId, string>>;
  playerRoleById: Partial<Record<PlayerId, RoleId | null>>;
  partyStatusRows: PartyStatusRow[];
  roomStory: ReturnType<typeof useRoomStory>;
  partyEmotes: ReturnType<typeof usePartyEmotes>;
  showStatusPanel: boolean;
  setShowStatusPanel: Dispatch<SetStateAction<boolean>>;
};

const GameContext = createContext<GameStateValue | null>(null);

const useGame = (): GameStateValue => {
  const ctx = useContext(GameContext);

  if (!ctx) throw new Error('useGame must be used within GameProvider');

  return ctx;
};

export type { GameStateValue };
export { GameContext, useGame };
