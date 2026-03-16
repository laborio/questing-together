import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import paperTexture from '@/assets/images/T_Background_Paper.png';
import { Stack, TiledBackground } from '@/components';
import { colors } from '@/constants/colors';
import { DecisionProvider } from '@/contexts/DecisionContext';
import { useGame } from '@/contexts/GameContext';
import { PartyEmoteOverlay } from '@/features/emote/PartyEmoteOverlay';
import { StatusOverlay } from '@/features/party/StatusOverlay';
import StoryHeader from '@/features/story/components/header/StoryHeader';
import SceneFeedCard from '@/features/story/components/scene/SceneFeedCard';
import DecisionPanelCard from '@/features/story/DecisionPanelCard';
import type {
  ActionState,
  CombatData,
  SceneState,
  TimedData,
  VoteState,
} from '@/features/story/types/types';

export default function StoryScreen() {
  const game = useGame();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [resolvedHeaderHeight, setResolvedHeaderHeight] = useState(0);
  const rs = game.roomStory;

  const scene: SceneState = useMemo(
    () => ({
      isEnding: Boolean(rs.currentScene.isEnding),
      isCombat: rs.isCombatScene,
      isTimed: rs.isTimedScene,
      phaseLabel: rs.phaseLabel,
      statusText: rs.phaseStatusText,
    }),
    [
      rs.currentScene.isEnding,
      rs.isCombatScene,
      rs.isTimedScene,
      rs.phaseLabel,
      rs.phaseStatusText,
    ],
  );

  const actionState: ActionState = useMemo(
    () => ({
      items: rs.availableActions,
      localSelectedId: rs.localSelectedActionId,
      canAct: rs.canAct,
      allowSkip: rs.allowSkip,
      onTake: rs.takeAction,
      onSkip: rs.skipAction,
    }),
    [
      rs.availableActions,
      rs.localSelectedActionId,
      rs.canAct,
      rs.allowSkip,
      rs.takeAction,
      rs.skipAction,
    ],
  );

  const voteState: VoteState = useMemo(
    () => ({
      visibleOptions: rs.visibleOptions,
      hiddenOptionCount: rs.hiddenOptionCount,
      riskyUnlockedOptionIds: rs.riskyUnlockedOptionIds,
      optionIntentByOptionId: rs.optionIntentByOptionId,
      localSelected: rs.localSelectedOption,
      localConfirmed: rs.localConfirmedOption,
      voteCounts: rs.voteCounts,
      confirmedCount: rs.confirmedVoteCount,
      expectedPlayerCount: rs.expectedPlayerCount,
      resolved: rs.resolvedOption,
      resolutionMode: rs.resolutionMode,
      localHasContinued: rs.localHasContinued,
      continuedCount: rs.continuedCount,
      isStoryEnded: rs.isStoryEnded,
      canVote: rs.canVote,
      lockReason: rs.voteLockReason,
      onSelect: rs.selectOption,
      onConfirm: rs.confirmOption,
      onContinue: rs.continueToNextScene,
    }),
    [
      rs.visibleOptions,
      rs.hiddenOptionCount,
      rs.riskyUnlockedOptionIds,
      rs.optionIntentByOptionId,
      rs.localSelectedOption,
      rs.localConfirmedOption,
      rs.voteCounts,
      rs.confirmedVoteCount,
      rs.expectedPlayerCount,
      rs.resolvedOption,
      rs.resolutionMode,
      rs.localHasContinued,
      rs.continuedCount,
      rs.isStoryEnded,
      rs.canVote,
      rs.voteLockReason,
      rs.selectOption,
      rs.confirmOption,
      rs.continueToNextScene,
    ],
  );

  const combatData: CombatData = useMemo(
    () => ({ state: rs.combatState, log: rs.combatLog }),
    [rs.combatState, rs.combatLog],
  );

  const timedData: TimedData = useMemo(
    () => ({
      endsAt: rs.timedEndsAt,
      durationSeconds: rs.timedDurationSeconds,
      statusText: rs.timedStatusText,
      allowEarly: rs.timedAllowEarly,
      waitingText: rs.timedWaitingText,
      onFinish: () => rs.finishTimedScene(true),
    }),
    [
      rs.timedEndsAt,
      rs.timedDurationSeconds,
      rs.timedStatusText,
      rs.timedAllowEarly,
      rs.timedWaitingText,
      rs.finishTimedScene,
    ],
  );

  if (!game.room || !game.isStoryView) {
    return <Redirect href="/(game)/lobby" />;
  }

  const headerHeight = Math.round(Math.min(160, Math.max(90, windowWidth * (100 / 420))));
  const headerVerticalPadding = 10;
  const headerMinHeight = headerHeight + insets.top;
  const storyHeaderInsetTop = Math.max(headerMinHeight, resolvedHeaderHeight) + 16;

  return (
    <DecisionProvider
      scene={scene}
      actions={actionState}
      vote={voteState}
      combat={combatData}
      timed={timedData}
      onResetStory={rs.resetStory}
      canResetStory={game.isHost}
      embedded
    >
      <Stack flex={1} style={{ backgroundColor: colors.backgroundPaper }}>
        <TiledBackground source={paperTexture} />
        <StoryHeader
          headerMinHeight={headerMinHeight}
          headerVerticalPadding={headerVerticalPadding}
          insets={insets}
          partyHp={rs.partyHp}
          partyHpMax={rs.partyHpMax}
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
            paddingTop: storyHeaderInsetTop,
            paddingBottom: 140 + insets.bottom,
            flexGrow: 1,
          }}
        >
          <Stack flex={1} style={{ width: '100%' }}>
            <SceneFeedCard
              fullBleed
              sceneId={rs.currentScene.id}
              sceneTitle={rs.currentScene.journalTitle ?? rs.currentScene.title}
              persistenceScopeKey={game.roomId}
              storyInstanceKey={rs.storyInstanceKey}
              journalEntries={rs.journalEntries}
              sceneHistory={rs.sceneHistory}
              footer={<DecisionPanelCard />}
            />
          </Stack>
        </ScrollView>

        {game.showStatusPanel ? (
          <StatusOverlay
            bottomInset={insets.bottom}
            roomCode={game.room?.code ?? null}
            roomError={game.roomConnection.roomError}
            storyError={rs.storyError}
            players={game.roomConnection.players}
            localRole={game.localRole}
            partyStatusRows={game.partyStatusRows}
            isHost={game.isHost}
            isBusy={game.roomConnection.isBusy}
            onResetStory={() => void rs.resetStory()}
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
      </Stack>
    </DecisionProvider>
  );
}
