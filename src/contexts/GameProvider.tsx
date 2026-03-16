import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useAnonymousAuth } from '@/api/hooks/use-anonymous-auth';
import { useRoomConnection } from '@/api/hooks/use-room-connection';
import { playerNameById } from '@/constants/constants';
import { GameContext } from '@/contexts/GameContext';
import { usePartyEmotes } from '@/hooks/usePartyEmotes';
import { useRoomStory } from '@/hooks/useRoomStory';
import type { PlayerId, RoleId } from '@/types/player';
import { buildPartyStatusRows, type PartyStatusRow } from '@/utils/buildPartyStatusRows';

const GameProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAnonymousAuth();
  const roomConnection = useRoomConnection();
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  const room = roomConnection.room;
  const roomId = room?.id ?? null;
  const isTitleScreen = !room;

  const localPlayerRow = useMemo(() => {
    if (!auth.user?.id) return null;
    return roomConnection.players.find((player) => player.user_id === auth.user?.id) ?? null;
  }, [auth.user?.id, roomConnection.players]);

  const localPlayerId = localPlayerRow?.player_id ?? null;
  const localRole = localPlayerRow?.role_id ?? null;
  const isAdventureStarted = room?.status === 'in_progress';
  const isHost = Boolean(auth.user?.id && room?.host_user_id === auth.user.id);
  const isLobby = room?.status === 'lobby';
  const isStoryView = Boolean(!isLobby && isAdventureStarted && localRole);

  const playerDisplayNameById = useMemo(() => {
    const mapping: Partial<Record<PlayerId, string>> = { ...playerNameById };
    for (const player of roomConnection.players) {
      if (player.display_name) {
        mapping[player.player_id] = player.display_name;
      }
    }
    return mapping;
  }, [roomConnection.players]);

  const playerRoleById = useMemo(() => {
    const mapping: Partial<Record<PlayerId, RoleId | null>> = {};
    for (const player of roomConnection.players) {
      mapping[player.player_id] = player.role_id ?? null;
    }
    return mapping;
  }, [roomConnection.players]);

  const roomStory = useRoomStory({
    roomId,
    localPlayerId: localPlayerId ?? 'p1',
    localRole,
    isHost,
    playerCount: roomConnection.players.length,
    playerDisplayNameById,
    playerRoleById,
  });

  const hasTechAlert = Boolean(roomConnection.roomError || roomStory.storyError);

  const partyEmotes = usePartyEmotes({
    localPlayerId: localPlayerId ?? 'p1',
    roomId,
    currentSceneId:
      roomStory.isReady && isAdventureStarted && localRole ? roomStory.currentScene.id : null,
  });

  const localDisplayName =
    localPlayerId && playerDisplayNameById[localPlayerId]
      ? playerDisplayNameById[localPlayerId]
      : localPlayerId
        ? playerNameById[localPlayerId]
        : 'Adventurer';

  const partyStatusRows: PartyStatusRow[] = useMemo(
    () =>
      buildPartyStatusRows({
        players: roomConnection.players,
        isAdventureStarted,
        resolvedOption: roomStory.resolvedOption,
        isStoryEnded: roomStory.isStoryEnded,
        continuedByPlayerId: roomStory.continuedByPlayerId,
      }),
    [
      isAdventureStarted,
      roomConnection.players,
      roomStory.continuedByPlayerId,
      roomStory.isStoryEnded,
      roomStory.resolvedOption,
    ],
  );

  const value = useMemo(
    () => ({
      auth,
      roomConnection,
      room,
      roomId,
      localPlayerId,
      localRole,
      localDisplayName,
      isHost,
      isTitleScreen,
      isLobby,
      isStoryView,
      isAdventureStarted,
      hasTechAlert,
      playerDisplayNameById,
      playerRoleById,
      partyStatusRows,
      roomStory,
      partyEmotes,
      showStatusPanel,
      setShowStatusPanel,
    }),
    [
      auth,
      roomConnection,
      room,
      roomId,
      localPlayerId,
      localRole,
      localDisplayName,
      isHost,
      isTitleScreen,
      isLobby,
      isStoryView,
      isAdventureStarted,
      hasTechAlert,
      playerDisplayNameById,
      playerRoleById,
      partyStatusRows,
      roomStory,
      partyEmotes,
      showStatusPanel,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export { GameProvider };
