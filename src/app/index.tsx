import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import paperTexture from '@/assets/images/T_Background_Paper.png';
import TiledBackground from '@/components/Layout/TiledBackground';
import { PartyEmoteOverlay } from '@/features/emote/PartyEmoteOverlay';
import { LobbyView } from '@/features/lobby/LobbyView';
import { RoomConnectionCard } from '@/features/lobby/RoomConnectionCard';
import { StatusOverlay } from '@/features/party/StatusOverlay';
import { DecisionPanelCard } from '@/features/story/DecisionPanelCard';
import { SceneFeedCard } from '@/features/story/SceneFeedCard';
import { StoryHeader } from '@/features/story/StoryHeader';
import { useGameState } from '@/hooks/useGameState';
import type { RoleId } from '@/types/player';

export default function IndexScreen() {
  const game = useGameState();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [resolvedHeaderHeight, setResolvedHeaderHeight] = useState(0);

  const headerHeight = Math.round(Math.min(160, Math.max(90, windowWidth * (100 / 420))));
  const headerVerticalPadding = 10;
  const headerMinHeight = headerHeight + insets.top;
  const storyHeaderInsetTop = Math.max(headerMinHeight, resolvedHeaderHeight) + 16;

  const mainScroll = (
    <ScrollView
      scrollEnabled={!game.isTitleScreen}
      bounces={!game.isTitleScreen}
      contentContainerStyle={[
        { padding: 12, gap: 14, paddingBottom: 96, flexGrow: 1 },
        !game.isStoryView && {
          paddingTop: 12 + insets.top,
          paddingBottom: 96 + insets.bottom,
        },
        game.isTitleScreen && {
          padding: 0,
          gap: 0,
          justifyContent: 'center' as const,
          flexGrow: 1,
        },
        game.isTitleScreen && { minHeight: windowHeight },
        game.isStoryView && { padding: 0, gap: 0 },
        game.isStoryView && {
          paddingTop: storyHeaderInsetTop,
          paddingBottom: 140 + insets.bottom,
        },
      ]}
    >
      {!game.auth.isAuthReady ? (
        <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>Signing in...</Text>
      ) : game.auth.authError ? (
        <Text style={{ fontSize: 13, color: '#f3b3a4' }}>Auth error: {game.auth.authError}</Text>
      ) : !game.room ? (
        <RoomConnectionCard
          isBusy={game.roomConnection.isBusy}
          errorText={game.roomConnection.roomError}
          onCreateRoom={() => void game.roomConnection.createRoom()}
          onJoinRoom={(code) => void game.roomConnection.joinRoom(code)}
        />
      ) : !game.roomStory.isReady ? (
        <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>
          Syncing room state...
        </Text>
      ) : (
        <>
          {(game.isLobby || !game.isAdventureStarted) && (
            <>
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
            </>
          )}

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
          ) : (
            <View style={{ gap: 0, flex: 1, width: '100%', paddingHorizontal: 0 }}>
              <SceneFeedCard
                fullBleed
                sceneId={game.roomStory.currentScene.id}
                sceneTitle={
                  game.roomStory.currentScene.journalTitle ?? game.roomStory.currentScene.title
                }
                persistenceScopeKey={game.roomId}
                storyInstanceKey={game.roomStory.storyInstanceKey}
                journalEntries={game.roomStory.journalEntries}
                sceneHistory={game.roomStory.sceneHistory}
                footer={
                  <DecisionPanelCard
                    embedded
                    isEndingScene={Boolean(game.roomStory.currentScene.isEnding)}
                    isCombatScene={game.roomStory.isCombatScene}
                    isTimedScene={game.roomStory.isTimedScene}
                    combatState={game.roomStory.combatState}
                    combatLog={game.roomStory.combatLog}
                    phaseLabel={game.roomStory.phaseLabel}
                    statusText={game.roomStory.phaseStatusText}
                    actions={game.roomStory.availableActions}
                    localSelectedActionId={game.roomStory.localSelectedActionId}
                    canAct={game.roomStory.canAct}
                    allowSkip={game.roomStory.allowSkip}
                    onTakeAction={game.roomStory.takeAction}
                    onSkipAction={game.roomStory.skipAction}
                    visibleOptions={game.roomStory.visibleOptions}
                    hiddenOptionCount={game.roomStory.hiddenOptionCount}
                    riskyUnlockedOptionIds={game.roomStory.riskyUnlockedOptionIds}
                    optionIntentByOptionId={game.roomStory.optionIntentByOptionId}
                    localSelectedOption={game.roomStory.localSelectedOption}
                    localConfirmedOption={game.roomStory.localConfirmedOption}
                    voteCounts={game.roomStory.voteCounts}
                    confirmedVoteCount={game.roomStory.confirmedVoteCount}
                    expectedPlayerCount={game.roomStory.expectedPlayerCount}
                    resolvedOption={game.roomStory.resolvedOption}
                    resolutionMode={game.roomStory.resolutionMode}
                    localHasContinued={game.roomStory.localHasContinued}
                    continuedCount={game.roomStory.continuedCount}
                    isStoryEnded={game.roomStory.isStoryEnded}
                    canVote={game.roomStory.canVote}
                    voteLockReason={game.roomStory.voteLockReason}
                    timedEndsAt={game.roomStory.timedEndsAt}
                    timedDurationSeconds={game.roomStory.timedDurationSeconds}
                    timedStatusText={game.roomStory.timedStatusText}
                    timedAllowEarly={game.roomStory.timedAllowEarly}
                    timedWaitingText={game.roomStory.timedWaitingText}
                    onSelectOption={game.roomStory.selectOption}
                    onConfirmOption={game.roomStory.confirmOption}
                    onContinueToNextScene={game.roomStory.continueToNextScene}
                    onFinishTimedScene={() => game.roomStory.finishTimedScene(true)}
                    onResetStory={game.roomStory.resetStory}
                    canResetStory={game.isHost}
                  />
                }
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#1e140d' }}>
      {game.isStoryView || game.isLobby ? (
        <View style={{ flex: 1, backgroundColor: '#f4ead7' }}>
          <TiledBackground source={paperTexture} />
          {game.isStoryView ? (
            <StoryHeader
              headerMinHeight={headerMinHeight}
              headerVerticalPadding={headerVerticalPadding}
              insets={insets}
              partyHp={game.roomStory.partyHp}
              partyHpMax={game.roomStory.partyHpMax}
              partyStatusRows={game.partyStatusRows}
              hasTechAlert={game.hasTechAlert}
              onToggleStatusPanel={() => game.setShowStatusPanel((v) => !v)}
              onLayout={(event) => {
                const measured = Math.ceil(event.nativeEvent.layout.height);
                setResolvedHeaderHeight((prev) =>
                  Math.abs(prev - measured) > 1 ? measured : prev,
                );
              }}
            />
          ) : null}
          {mainScroll}
          {game.isStoryView && game.showStatusPanel ? (
            <StatusOverlay
              bottomInset={insets.bottom}
              roomCode={game.room?.code ?? null}
              roomError={game.roomConnection.roomError}
              storyError={game.roomStory.storyError}
              players={game.roomConnection.players}
              localRole={game.localRole}
              partyStatusRows={game.partyStatusRows}
              isHost={game.isHost}
              isBusy={game.roomConnection.isBusy}
              onResetStory={() => void game.roomStory.resetStory()}
              onLeaveRoom={() => void game.roomConnection.leaveRoom()}
            />
          ) : null}
        </View>
      ) : (
        mainScroll
      )}

      {game.isStoryView && game.localPlayerId && game.room && game.localRole ? (
        <PartyEmoteOverlay
          playerLabelById={game.playerDisplayNameById}
          playerRoleById={game.playerRoleById}
          visibleEmotes={game.partyEmotes.visibleEmotes}
          errorText={game.partyEmotes.emoteError}
          onClearVisibleEmote={game.partyEmotes.clearVisibleEmote}
          onSendEmote={game.partyEmotes.sendEmote}
        />
      ) : null}
    </View>
  );
}
