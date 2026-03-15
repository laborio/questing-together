import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RoleOnboardingCard } from '@/features/lobby/RoleOnboardingCard';
import type { PlayerId, RoleId } from '@/types/player';

type LobbyViewProps = {
  localPlayerId: PlayerId | null;
  localDisplayName: string;
  roomCode: string | null;
  targetPlayerCount: number;
  players: Array<{ playerId: PlayerId; roleId: RoleId | null; displayName: string | null }>;
  isHost: boolean;
  isBusy: boolean;
  onSetDisplayName: (name: string) => void;
  onSelectRole: (roleId: RoleId) => void;
  onSetTargetPlayerCount: (count: number) => void;
  onStartAdventure: () => void;
  onLeaveRoom: () => void;
};

export function LobbyView({
  localPlayerId,
  localDisplayName,
  roomCode,
  targetPlayerCount,
  players,
  isHost,
  isBusy,
  onSetDisplayName,
  onSelectRole,
  onSetTargetPlayerCount,
  onStartAdventure,
  onLeaveRoom,
}: LobbyViewProps) {
  return (
    <View style={styles.lobbyPaperSurface}>
      <Text style={styles.title}>{"À l'Aventure Compagnons"}</Text>
      {localPlayerId ? <Text style={styles.subtitle}>Signed in as {localDisplayName}</Text> : null}
      {roomCode ? <Text style={styles.roomCode}>Room code: {roomCode}</Text> : null}
      {localPlayerId ? (
        <RoleOnboardingCard
          localPlayerId={localPlayerId}
          players={players}
          targetPlayerCount={targetPlayerCount}
          isHost={isHost}
          isBusy={isBusy}
          onSetDisplayName={onSetDisplayName}
          onSelectRole={onSelectRole}
          onSetTargetPlayerCount={onSetTargetPlayerCount}
          onStartAdventure={onStartAdventure}
        />
      ) : (
        <Text style={styles.loadingText}>Syncing your player slot...</Text>
      )}
      <View style={styles.roomControls}>
        <Pressable
          disabled={isBusy}
          onPress={onLeaveRoom}
          style={[styles.leaveRoomButton, isBusy && styles.leaveRoomButtonDisabled]}
        >
          <Text style={styles.leaveRoomButtonText}>{isBusy ? 'Leaving...' : 'Leave Room'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lobbyPaperSurface: {
    marginHorizontal: -12,
    marginTop: -2,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#f4ead700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4b3420',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: -2,
    fontSize: 13,
    color: '#6b4a2a',
    fontWeight: '600',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  roomCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b3420',
    fontFamily: 'Besley',
  },
  loadingText: {
    fontSize: 14,
    color: '#d0c0a6',
    fontFamily: 'Besley',
  },
  roomControls: {
    marginTop: -4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  leaveRoomButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b35b4a',
    backgroundColor: '#f1d0c6',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  leaveRoomButtonDisabled: {
    opacity: 0.5,
  },
  leaveRoomButtonText: {
    color: '#6b2f25',
    fontSize: 12,
    fontWeight: '700',
  },
});
