import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { roles } from '@/constants/constants';
import PartyStatusCard from '@/features/party/PartyStatusCard';
import type { PlayerId, RoleId } from '@/types/player';
import type { PartyStatusRow } from '@/utils/buildPartyStatusRows';

type StatusOverlayProps = {
  bottomInset: number;
  roomCode: string | null;
  roomError: string | null;
  storyError: string | null;
  players: Array<{ display_name: string | null; player_id: PlayerId }>;
  localRole: RoleId | null;
  partyStatusRows: PartyStatusRow[];
  isHost: boolean;
  isBusy: boolean;
  onResetStory: () => void;
  onLeaveRoom: () => void;
};

export function StatusOverlay({
  bottomInset,
  roomCode,
  roomError,
  storyError,
  players,
  localRole,
  partyStatusRows,
  isHost,
  isBusy,
  onResetStory,
  onLeaveRoom,
}: StatusOverlayProps) {
  return (
    <View style={[styles.roomStatusOverlay, { bottom: 24 + bottomInset }]}>
      <ScrollView
        style={styles.roomStatusScroll}
        contentContainerStyle={styles.roomStatusScrollContent}
      >
        {roomError ? <Text style={styles.errorText}>Room error: {roomError}</Text> : null}
        {storyError ? <Text style={styles.errorText}>Story sync error: {storyError}</Text> : null}
        {roomCode ? <Text style={styles.roomBanner}>Room code: {roomCode}</Text> : null}
        {players.length ? (
          <Text style={styles.roomPlayersLine}>
            Players: {players.map((p) => p.display_name || p.player_id).join(', ')}
          </Text>
        ) : null}
        {localRole ? (
          <Text style={styles.characterLine}>
            You are {roles.find((r) => r.id === localRole)?.label ?? localRole}.
          </Text>
        ) : null}
        <PartyStatusCard title="Party Status" rows={partyStatusRows} variant="parchment" />
        <View style={styles.roomControls}>
          {isHost ? (
            <Pressable onPress={onResetStory} style={styles.resetStoryButton}>
              <Text style={styles.resetStoryButtonText}>Restart Adventure</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={onLeaveRoom}
            style={[styles.leaveRoomButton, isBusy && styles.leaveRoomButtonDisabled]}
          >
            <Text style={styles.leaveRoomButtonText}>{isBusy ? 'Leaving...' : 'Leave Room'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  roomStatusOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c9a87a',
    backgroundColor: 'rgba(244, 234, 215, 0.98)',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  roomStatusScroll: {
    maxHeight: 280,
  },
  roomStatusScrollContent: {
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#f3b3a4',
  },
  roomBanner: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b3420',
  },
  roomPlayersLine: {
    marginTop: -6,
    fontSize: 12,
    color: '#6f4e2e',
  },
  characterLine: {
    marginTop: -6,
    fontSize: 12,
    color: '#6b4a2a',
    fontWeight: '700',
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
  resetStoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8a6a3a',
    backgroundColor: '#f2e3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resetStoryButtonText: {
    color: '#5a4028',
    fontSize: 12,
    fontWeight: '700',
  },
});
