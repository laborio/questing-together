import { Redirect } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import paperTexture from '@/assets/images/T_Background_Paper.png';
import { TiledBackground } from '@/components';
import { useGame } from '@/contexts/GameContext';
import { LobbyView } from '@/features/lobby/LobbyView';
import type { RoleId } from '@/types/player';

export default function LobbyScreen() {
  const game = useGame();
  const insets = useSafeAreaInsets();

  if (!game.room) return null;

  if (game.isStoryView) {
    return <Redirect href="/(game)/story" />;
  }

  if (!game.roomStory.isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#f4ead7',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TiledBackground source={paperTexture} />
        <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>
          Syncing room state...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4ead7' }}>
      <TiledBackground source={paperTexture} />
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          gap: 14,
          paddingTop: 12 + insets.top,
          paddingBottom: 96 + insets.bottom,
          flexGrow: 1,
        }}
      >
        {game.roomConnection.roomError ? (
          <Text style={{ fontSize: 13, color: '#f3b3a4' }}>
            Room error: {game.roomConnection.roomError}
          </Text>
        ) : null}
        {game.roomStory.storyError ? (
          <Text style={{ fontSize: 13, color: '#f3b3a4' }}>
            Story sync error: {game.roomStory.storyError}
          </Text>
        ) : null}

        {game.isLobby ? (
          <LobbyView
            localPlayerId={game.localPlayerId}
            localDisplayName={game.localDisplayName}
            roomCode={game.room?.code ?? null}
            targetPlayerCount={game.room.target_player_count}
            players={game.roomConnection.players.map((p) => ({
              playerId: p.player_id,
              roleId: p.role_id,
              displayName: p.display_name,
            }))}
            isHost={game.isHost}
            isBusy={game.roomConnection.isBusy}
            onSetDisplayName={(name) => void game.roomConnection.setDisplayName(name)}
            onSelectRole={(roleId: RoleId) => void game.roomConnection.selectRole(roleId)}
            onSetTargetPlayerCount={(c) => void game.roomConnection.setTargetPlayerCount(c)}
            onStartAdventure={() => void game.roomConnection.startAdventure()}
            onLeaveRoom={() => void game.roomConnection.leaveRoom()}
          />
        ) : !game.localPlayerId ? (
          <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>
            Syncing your player slot...
          </Text>
        ) : !game.isAdventureStarted || !game.localRole ? (
          <>
            <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>
              {!game.isAdventureStarted
                ? 'Waiting for adventure to start...'
                : 'This room is in progress but your role is not assigned.'}
            </Text>
            <View style={{ marginTop: -4, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable
                disabled={game.roomConnection.isBusy}
                onPress={() => void game.roomConnection.leaveRoom()}
                style={[
                  {
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#b35b4a',
                    backgroundColor: '#f1d0c6',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  },
                  game.roomConnection.isBusy && { opacity: 0.5 },
                ]}
              >
                <Text style={{ color: '#6b2f25', fontSize: 12, fontWeight: '700' }}>
                  {game.roomConnection.isBusy ? 'Leaving...' : 'Leave Room'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
