import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PartyChatOverlay } from '@/components/chat/party-chat-overlay';
import { DecisionPanelCard } from '@/components/story/decision-panel-card';
import { PartyTopBar } from '@/components/story/party-top-bar';
import { PartyStatusCard } from '@/components/story/party-status-card';
import { RoleOnboardingCard } from '@/components/story/role-onboarding-card';
import { RoomConnectionCard } from '@/components/story/room-connection-card';
import { SceneFeedCard } from '@/components/story/scene-feed-card';
import { playerNameById, roles } from '@/src/game/constants';
import { usePartyChat } from '@/src/game/hooks/use-party-chat';
import { useRoomStory } from '@/src/game/hooks/use-room-story';
import { PlayerId, RoleId } from '@/src/game/types';
import { useAnonymousAuth } from '@/src/online/hooks/use-anonymous-auth';
import { useRoomConnection } from '@/src/online/hooks/use-room-connection';

const paperTexture = require('../assets/images/T_Background_Paper.png');
const headerTexture = require('../assets/images/T_Background_Header.png');
const headerBorderTexture = require('../assets/images/T_HeaderBorder.png');

function TiledBackground({ source }: { source: number }) {
  const { width, height } = useWindowDimensions();
  const tileWidth = Math.min(512, Math.max(1, Math.floor(width)));
  const tileHeight = Math.max(1, Math.floor(tileWidth * 1.5));
  const columns = Math.ceil(width / tileWidth) + 1;
  const rows = Math.ceil(height / tileHeight) + 1;
  const tileCount = columns * rows;

  return (
    <View pointerEvents="none" style={styles.tiledBackground}>
      {Array.from({ length: tileCount }).map((_, index) => (
        <Image
          key={`tile-${index}`}
          source={source}
          style={{ width: tileWidth, height: tileHeight }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

export default function IndexScreen() {
  const auth = useAnonymousAuth();
  const roomConnection = useRoomConnection();
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [resolvedHeaderHeight, setResolvedHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const headerHeight = Math.round(Math.min(160, Math.max(90, windowWidth * (100 / 420))));
  const headerVerticalPadding = 10;
  const headerMinHeight = headerHeight + insets.top;
  const storyHeaderInsetTop = Math.max(headerMinHeight, resolvedHeaderHeight) + 16;

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

  const playerDisplayNameById = useMemo(() => {
    const mapping: Partial<Record<PlayerId, string>> = { ...playerNameById };
    roomConnection.players.forEach((player) => {
      if (player.display_name) {
        mapping[player.player_id] = player.display_name;
      }
    });
    return mapping;
  }, [roomConnection.players]);

  const playerRoleById = useMemo(() => {
    const mapping: Partial<Record<PlayerId, RoleId | null>> = {};
    roomConnection.players.forEach((player) => {
      mapping[player.player_id] = player.role_id ?? null;
    });
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

  const partyChat = usePartyChat({
    localPlayerId: localPlayerId ?? 'p1',
    roomId,
    currentSceneId: roomStory.isReady && isAdventureStarted && localRole ? roomStory.currentScene.id : null,
    currentSceneTitle: roomStory.isReady && isAdventureStarted && localRole ? roomStory.currentScene.title : null,
  });

  const isLobby = room?.status === 'lobby';
  const localDisplayName =
    localPlayerId && playerDisplayNameById[localPlayerId] ? playerDisplayNameById[localPlayerId] : localPlayerId
      ? playerNameById[localPlayerId]
      : 'Adventurer';

  const isStoryView = Boolean(!isLobby && isAdventureStarted && localRole);

  const partyStatusRows = useMemo(
    () =>
      roomConnection.players.map((player) => {
        const name = player.display_name ?? playerNameById[player.player_id];
        const role = player.role_id ? roles.find((role) => role.id === player.role_id)?.label ?? player.role_id : 'Role: waiting';
        let status = isAdventureStarted ? 'In scene' : player.role_id ? 'Ready' : 'Waiting';
        let tone: 'ready' | 'waiting' | 'neutral' | 'offline' = isAdventureStarted ? 'neutral' : player.role_id ? 'ready' : 'waiting';

        if (!player.is_connected) {
          status = 'Disconnected';
          tone = 'offline';
        } else if (isAdventureStarted && roomStory.resolvedOption && !roomStory.isStoryEnded) {
          const hasContinued = Boolean(roomStory.continuedByPlayerId[player.player_id]);
          status = hasContinued ? 'Ready for next scene' : 'Waiting for next scene';
          tone = hasContinued ? 'ready' : 'waiting';
        }

        return {
          id: player.player_id,
          name,
          role,
          status,
          tone,
        };
      }),
    [isAdventureStarted, roomConnection.players, roomStory.continuedByPlayerId, roomStory.isStoryEnded, roomStory.resolvedOption]
  );

  const mainScroll = (
    <ScrollView
      scrollEnabled={!isTitleScreen}
      bounces={!isTitleScreen}
      contentContainerStyle={[
        styles.content,
        !isStoryView && { paddingTop: 12 + insets.top, paddingBottom: 96 + insets.bottom },
        isTitleScreen && styles.titleScreenContent,
        isTitleScreen && { minHeight: windowHeight },
        isStoryView && styles.storyContent,
        isStoryView && { paddingTop: storyHeaderInsetTop, paddingBottom: 140 + insets.bottom },
      ]}
    >
      {!isStoryView && !isTitleScreen && !isLobby ? <Text style={styles.title}>Questing Together</Text> : null}

      {localPlayerId ? (
        <>
          {!isStoryView && !isTitleScreen && !isLobby ? <Text style={styles.subtitle}>Signed in as {localDisplayName}</Text> : null}
        </>
      ) : null}

      {!auth.isAuthReady ? (
        <Text style={styles.loadingText}>Signing in...</Text>
      ) : auth.authError ? (
        <Text style={styles.errorText}>Auth error: {auth.authError}</Text>
      ) : !room ? (
        <RoomConnectionCard
          isBusy={roomConnection.isBusy}
          errorText={roomConnection.roomError}
          onCreateRoom={() => {
            void roomConnection.createRoom();
          }}
          onJoinRoom={(code) => {
            void roomConnection.joinRoom(code);
          }}
        />
      ) : !roomStory.isReady ? (
        <>
          <Text style={styles.loadingText}>Syncing room state...</Text>
        </>
      ) : (
        <>
          {isLobby || !isAdventureStarted ? (
            <>
              {roomConnection.roomError ? <Text style={styles.errorText}>Room error: {roomConnection.roomError}</Text> : null}
              {roomStory.storyError ? <Text style={styles.errorText}>Story sync error: {roomStory.storyError}</Text> : null}
            </>
          ) : null}

          {isLobby ? (
            <>
              <View style={styles.lobbyPaperSurface}>
                <Text style={[styles.title, styles.lobbyPaperTitle]}>{"À l'Aventure Compagnons"}</Text>
                {localPlayerId ? (
                  <Text style={[styles.subtitle, styles.lobbyPaperSubtitle]}>Signed in as {localDisplayName}</Text>
                ) : null}
                {room?.code ? <Text style={styles.roomCodeLobby}>Room code: {room.code}</Text> : null}
                {localPlayerId ? (
                  <RoleOnboardingCard
                    localPlayerId={localPlayerId}
                    players={roomConnection.players.map((player) => ({
                      playerId: player.player_id,
                      roleId: player.role_id,
                      displayName: player.display_name,
                    }))}
                    isHost={isHost}
                    isBusy={roomConnection.isBusy}
                    onSetDisplayName={(name) => void roomConnection.setDisplayName(name)}
                    onSelectRole={(roleId: RoleId) => {
                      void roomConnection.selectRole(roleId);
                    }}
                    onStartAdventure={() => {
                      void roomConnection.startAdventure();
                    }}
                  />
                ) : (
                  <Text style={styles.loadingText}>Syncing your player slot...</Text>
                )}
                <View style={styles.roomControls}>
                  <Pressable
                    disabled={roomConnection.isBusy}
                    onPress={() => void roomConnection.leaveRoom()}
                    style={[styles.leaveRoomButton, roomConnection.isBusy && styles.leaveRoomButtonDisabled]}>
                    <Text style={styles.leaveRoomButtonText}>{roomConnection.isBusy ? 'Leaving...' : 'Leave Room'}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : !localPlayerId ? (
            <Text style={styles.loadingText}>Syncing your player slot...</Text>
          ) : !isAdventureStarted || !localRole ? (
            <>
              <Text style={styles.loadingText}>
                {!isAdventureStarted
                  ? 'Waiting for adventure to start...'
                  : 'This room is in progress but your role is not assigned.'}
              </Text>
              <View style={styles.roomControls}>
                <Pressable
                  disabled={roomConnection.isBusy}
                  onPress={() => void roomConnection.leaveRoom()}
                  style={[styles.leaveRoomButton, roomConnection.isBusy && styles.leaveRoomButtonDisabled]}>
                  <Text style={styles.leaveRoomButtonText}>{roomConnection.isBusy ? 'Leaving...' : 'Leave Room'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.storyWide}>
                <SceneFeedCard
                  fullBleed
                  sceneId={roomStory.currentScene.id}
                  sceneTitle={roomStory.currentScene.title}
                  journalEntries={roomStory.journalEntries}
                  sceneHistory={roomStory.sceneHistory}
                  footer={
                    <DecisionPanelCard
                      embedded
                      isCombatScene={roomStory.isCombatScene}
                      isTimedScene={roomStory.isTimedScene}
                      combatState={roomStory.combatState}
                      combatLog={roomStory.combatLog}
                      phaseLabel={roomStory.phaseLabel}
                      statusText={roomStory.phaseStatusText}
                      actions={roomStory.availableActions}
                      localSelectedActionId={roomStory.localSelectedActionId}
                      canAct={roomStory.canAct}
                      allowSkip={roomStory.allowSkip}
                      onTakeAction={roomStory.takeAction}
                      onSkipAction={roomStory.skipAction}
                      visibleOptions={roomStory.visibleOptions}
                      hiddenOptionCount={roomStory.hiddenOptionCount}
                      riskyUnlockedOptionIds={roomStory.riskyUnlockedOptionIds}
                      localConfirmedOption={roomStory.localConfirmedOption}
                      voteCounts={roomStory.voteCounts}
                      confirmedVoteCount={roomStory.confirmedVoteCount}
                      expectedPlayerCount={roomStory.expectedPlayerCount}
                      resolvedOption={roomStory.resolvedOption}
                      resolutionMode={roomStory.resolutionMode}
                      localHasContinued={roomStory.localHasContinued}
                      continuedCount={roomStory.continuedCount}
                      isStoryEnded={roomStory.isStoryEnded}
                      canVote={roomStory.canVote}
                      voteLockReason={roomStory.voteLockReason}
                      timedEndsAt={roomStory.timedEndsAt}
                      timedStatusText={roomStory.timedStatusText}
                      timedAllowEarly={roomStory.timedAllowEarly}
                      onConfirmOption={roomStory.confirmOption}
                      onContinueToNextScene={roomStory.continueToNextScene}
                      onFinishTimedScene={() => roomStory.finishTimedScene(true)}
                      onResetStory={roomStory.resetStory}
                      canResetStory={isHost}
                    />
                  }
                />
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );

  const storyHeaderOverlay = isStoryView ? (
    <View
      onLayout={(event) => {
        const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
        setResolvedHeaderHeight((previous) => (Math.abs(previous - measuredHeight) > 1 ? measuredHeight : previous));
      }}
      style={[
        styles.storyHeader,
        {
          minHeight: headerMinHeight,
        },
      ]}>
      <Image source={headerTexture} style={styles.storyHeaderBg} resizeMode="stretch" />
      <Image source={headerBorderTexture} style={styles.storyHeaderBorder} resizeMode="stretch" />
      <View
        style={[
          styles.storyHeaderContent,
          {
            paddingHorizontal: 18,
            paddingTop: headerVerticalPadding + insets.top,
            paddingBottom: headerVerticalPadding,
          },
        ]}>
        <View style={styles.headerControlsRow}>
          <Pressable style={styles.dotsButton} onPress={() => setShowStatusPanel((value) => !value)}>
            <Text style={styles.dotsButtonText}>...</Text>
            {hasTechAlert ? <View style={styles.dotsAlert} /> : null}
          </Pressable>
        </View>
        <PartyTopBar
          partyHp={roomStory.partyHp}
          partyHpMax={roomStory.partyHpMax}
          rows={partyStatusRows}
          variant="overlay"
        />
      </View>
    </View>
  ) : null;

  const statusOverlayBottom = 24 + insets.bottom;
  const statusOverlay =
    isStoryView && showStatusPanel ? (
      <View style={[styles.roomStatusOverlay, { bottom: statusOverlayBottom }]}>
        <ScrollView style={styles.roomStatusScroll} contentContainerStyle={styles.roomStatusScrollContent}>
          {roomConnection.roomError ? <Text style={styles.errorText}>Room error: {roomConnection.roomError}</Text> : null}
          {roomStory.storyError ? <Text style={styles.errorText}>Story sync error: {roomStory.storyError}</Text> : null}
          {room?.code ? <Text style={[styles.roomBanner, styles.roomBannerOverlay]}>Room code: {room.code}</Text> : null}
          {roomConnection.players.length ? (
            <Text style={[styles.roomPlayersLine, styles.roomPlayersLineOverlay]}>
              Players: {roomConnection.players.map((player) => player.display_name || player.player_id).join(', ')}
            </Text>
          ) : null}
          {localRole ? (
            <Text style={[styles.characterLine, styles.characterLineOverlay]}>
              You are {roles.find((role) => role.id === localRole)?.label ?? localRole}.
            </Text>
          ) : null}
          <PartyStatusCard title="Party Status" rows={partyStatusRows} variant="parchment" />
          <View style={styles.roomControls}>
            {isHost ? (
              <Pressable onPress={() => void roomStory.resetStory()} style={styles.resetStoryButton}>
                <Text style={styles.resetStoryButtonText}>Restart Adventure</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={roomConnection.isBusy}
              onPress={() => void roomConnection.leaveRoom()}
              style={[styles.leaveRoomButton, roomConnection.isBusy && styles.leaveRoomButtonDisabled]}>
              <Text style={styles.leaveRoomButtonText}>{roomConnection.isBusy ? 'Leaving...' : 'Leave Room'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {isStoryView || isLobby ? (
        <View style={styles.storyBackground}>
          <TiledBackground source={paperTexture} />
          {isStoryView ? storyHeaderOverlay : null}
          {mainScroll}
          {isStoryView ? statusOverlay : null}
        </View>
      ) : (
        <>
          {mainScroll}
        </>
      )}

      {localPlayerId && room && localRole ? (
        <PartyChatOverlay
          isOpen={partyChat.isChatOpen}
          unreadCount={partyChat.chatUnreadCount}
          localPlayerId={localPlayerId}
          messages={partyChat.messages}
          chatError={partyChat.chatError}
          chatInput={partyChat.chatInput}
          inputLength={partyChat.inputLength}
          canSend={partyChat.canSend}
          maxMessagesPerScene={partyChat.maxMessagesPerScene}
          messagesUsedThisScene={partyChat.messagesUsedThisScene}
          messagesRemainingThisScene={partyChat.messagesRemainingThisScene}
          maxCharactersPerMessage={partyChat.maxCharactersPerMessage}
          playerLabelById={playerDisplayNameById}
          onOpen={partyChat.openChat}
          onClose={partyChat.closeChat}
          onInputChange={partyChat.setChatInput}
          onSend={partyChat.sendChatMessage}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e140d',
  },
  storyBackground: {
    flex: 1,
    backgroundColor: '#f4ead7',
  },
  tiledBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 1,
  },
  content: {
    padding: 12,
    gap: 14,
    paddingBottom: 96,
    flexGrow: 1,
  },
  titleScreenContent: {
    padding: 0,
    gap: 0,
    justifyContent: 'center',
    flexGrow: 1,
  },
  storyWide: {
    gap: 0,
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
  },
  storyContent: {
    padding: 0,
    gap: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4ead7',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#d0c0a6',
    fontFamily: 'Besley',
  },
  subtitle: {
    marginTop: -2,
    fontSize: 13,
    color: '#e3c792',
    fontWeight: '600',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  roomCodeLobby: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b3420',
    fontFamily: 'Besley',
  },
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
  lobbyPaperTitle: {
    color: '#4b3420',
  },
  lobbyPaperSubtitle: {
    color: '#6b4a2a',
  },
  errorText: {
    fontSize: 13,
    color: '#f3b3a4',
  },
  techPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9a87a',
    backgroundColor: '#f0e2c9',
    padding: 8,
    gap: 8,
  },
  techToggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b48a54',
    backgroundColor: '#e9d3ae',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  techToggleText: {
    color: '#f4ead7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  techBody: {
    gap: 8,
  },
  storyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    backgroundColor: '#2a1d14',
    zIndex: 5,
  },
  storyHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  storyHeaderBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -16,
    height: 18,
  },
  storyHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerControlsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  dotsButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 27, 19, 0.55)',
  },
  dotsButtonText: {
    color: '#f4ead7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -1,
  },
  dotsAlert: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#f3b3a4',
  },
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
  roomBanner: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f4ead7',
  },
  roomBannerOverlay: {
    color: '#4b3420',
  },
  roomPlayersLine: {
    marginTop: -6,
    fontSize: 12,
    color: '#e9dcc6',
  },
  roomPlayersLineOverlay: {
    color: '#6f4e2e',
  },
  characterLine: {
    marginTop: -6,
    fontSize: 12,
    color: '#f4ead7',
    fontWeight: '700',
  },
  characterLineOverlay: {
    color: '#6b4a2a',
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
