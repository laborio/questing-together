import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import paperTexture from '@/assets/images/T_Background_Paper.png';
import { TiledBackground } from '@/components';
import { useGame } from '@/contexts/GameContext';
import { PartyEmoteOverlay } from '@/features/emote/PartyEmoteOverlay';
import { StatusOverlay } from '@/features/party/StatusOverlay';
import { DecisionPanelCard } from '@/features/story/DecisionPanelCard';
import { SceneFeedCard } from '@/features/story/SceneFeedCard';
import { StoryHeader } from '@/features/story/StoryHeader';

export default function StoryScreen() {
  const game = useGame();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [resolvedHeaderHeight, setResolvedHeaderHeight] = useState(0);

  if (!game.room || !game.isStoryView) {
    return <Redirect href="/(game)/lobby" />;
  }

  const headerHeight = Math.round(Math.min(160, Math.max(90, windowWidth * (100 / 420))));
  const headerVerticalPadding = 10;
  const headerMinHeight = headerHeight + insets.top;
  const storyHeaderInsetTop = Math.max(headerMinHeight, resolvedHeaderHeight) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: '#f4ead7' }}>
      <TiledBackground source={paperTexture} />
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
          setResolvedHeaderHeight((prev) => (Math.abs(prev - measured) > 1 ? measured : prev));
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: 0,
          gap: 0,
          paddingTop: storyHeaderInsetTop,
          paddingBottom: 140 + insets.bottom,
          flexGrow: 1,
        }}
      >
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
      </ScrollView>

      {game.showStatusPanel ? (
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

      {game.localPlayerId && game.localRole ? (
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
