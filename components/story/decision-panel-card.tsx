import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { CombatStatusCard } from '@/components/story/combat-status-card';
import { SceneActionsCard } from '@/components/story/scene-actions-card';
import { SceneOptionsCard } from '@/components/story/scene-options-card';
import { TimedStatusCard } from '@/components/story/timed-status-card';
import { OptionId, SceneOption } from '@/src/story/story';

const buttonTexture = require('../../assets/images/T_Button.png');
const buttonTextureSelected = require('../../assets/images/T_Button_Selected.png');
const buttonTextureDisabled = require('../../assets/images/T_Button_Disabled.png');

type SceneActionChoice = {
  id: string;
  text: string;
  isDisabled?: boolean;
  hpDelta?: number;
  effectText?: string;
};

type DecisionPanelCardProps = {
  isEndingScene?: boolean;
  isCombatScene: boolean;
  isTimedScene: boolean;
  combatState: {
    partyHp: number;
    partyHpMax: number;
    enemyHp: number;
    enemyHpMax: number;
    enemyName: string;
    round: number;
    outcome: 'victory' | 'defeat' | 'escape' | null;
    allowRun: boolean;
  } | null;
  combatLog: Array<{ id: string; text: string }>;
  phaseLabel: string;
  statusText: string;
  actions: SceneActionChoice[];
  localSelectedActionId: string | null;
  canAct: boolean;
  allowSkip: boolean;
  onTakeAction: (actionId: string) => void;
  onSkipAction: () => void;
  visibleOptions: SceneOption[];
  hiddenOptionCount: number;
  riskyUnlockedOptionIds: Set<OptionId>;
  localConfirmedOption: OptionId | null;
  voteCounts: Record<OptionId, number>;
  confirmedVoteCount: number;
  expectedPlayerCount: number;
  resolvedOption: OptionId | null;
  resolutionMode: 'majority' | 'random' | 'combat' | 'timed' | null;
  localHasContinued: boolean;
  continuedCount: number;
  isStoryEnded: boolean;
  canVote: boolean;
  voteLockReason: string | null;
  timedEndsAt: string | null;
  timedStatusText: string | null;
  timedAllowEarly: boolean;
  timedWaitingText: string | null;
  onConfirmOption: (optionId: OptionId) => void;
  onContinueToNextScene: () => void;
  onFinishTimedScene: () => void;
  onResetStory: () => void;
  canResetStory?: boolean;
  embedded?: boolean;
};

type TabId = 'actions' | 'decisions';

export function DecisionPanelCard({
  isEndingScene = false,
  isCombatScene,
  isTimedScene,
  combatState,
  combatLog,
  phaseLabel,
  statusText,
  actions,
  localSelectedActionId,
  canAct,
  allowSkip,
  onTakeAction,
  onSkipAction,
  visibleOptions,
  hiddenOptionCount,
  riskyUnlockedOptionIds,
  localConfirmedOption,
  voteCounts,
  confirmedVoteCount,
  expectedPlayerCount,
  resolvedOption,
  resolutionMode,
  localHasContinued,
  continuedCount,
  isStoryEnded,
  canVote,
  voteLockReason,
  timedEndsAt,
  timedStatusText,
  timedAllowEarly,
  timedWaitingText,
  onConfirmOption,
  onContinueToNextScene,
  onFinishTimedScene,
  onResetStory,
  canResetStory = true,
  embedded = false,
}: DecisionPanelCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('actions');
  const [draftOptionId, setDraftOptionId] = useState<OptionId | null>(null);

  useEffect(() => {
    if (resolvedOption) {
      setDraftOptionId(null);
      return;
    }

    if (localConfirmedOption) {
      setDraftOptionId(localConfirmedOption);
      return;
    }

    if (draftOptionId && !visibleOptions.some((option) => option.id === draftOptionId)) {
      setDraftOptionId(null);
    }
  }, [draftOptionId, localConfirmedOption, resolvedOption, visibleOptions]);

  useEffect(() => {
    if (isTimedScene) {
      setActiveTab('actions');
      return;
    }
    if (localConfirmedOption || resolvedOption || isStoryEnded) {
      setActiveTab('decisions');
    }
  }, [isStoryEnded, isTimedScene, localConfirmedOption, resolvedOption]);

  const endingContent = (
    <View style={styles.endingWrap}>
      <Text style={styles.endingText}>Fin.</Text>
      {canResetStory ? (
        <Pressable onPress={onResetStory} style={styles.textureButton}>
          <ImageBackground
            source={buttonTextureSelected}
            style={styles.textureBg}
            imageStyle={styles.textureImage}
            resizeMode="stretch"
          >
            <Text style={styles.textureText}>Recommencer l&apos;aventure</Text>
          </ImageBackground>
        </Pressable>
      ) : (
        <Text style={styles.waitingText}>En attente de l&apos;hote pour recommencer.</Text>
      )}
    </View>
  );

  if (embedded) {
    if (isEndingScene) {
      return <View style={styles.journalCard}>{endingContent}</View>;
    }
    return (
      <View style={styles.journalCard}>
        <Text style={styles.journalPrompt}>What do you do?</Text>
        <View style={styles.buttonStack}>
          {actions.map((action) => {
            const isSelectedAction = action.id === localSelectedActionId;
            const isDisabled = !canAct || action.isDisabled;
            const hpDelta = typeof action.hpDelta === 'number' && Number.isFinite(action.hpDelta) ? action.hpDelta : 0;
            const hasHpDelta = hpDelta !== 0;
            const hpLabel = hasHpDelta ? `HP ${hpDelta > 0 ? '+' : ''}${hpDelta}` : null;
            return (
              <Pressable
                key={action.id}
                disabled={isDisabled}
                onPress={() => onTakeAction(action.id)}
                style={[styles.textureButton, isSelectedAction && styles.textureButtonSelected, isDisabled && !isSelectedAction && styles.textureButtonDisabled]}>
                <ImageBackground
                  source={isSelectedAction ? buttonTextureSelected : isDisabled ? buttonTextureDisabled : buttonTexture}
                  style={styles.textureBg}
                  imageStyle={styles.textureImage}
                  resizeMode="stretch"
                >
                  <Text style={styles.textureText}>{action.text}</Text>
                  {hpLabel || action.effectText ? (
                    <Text style={styles.textureSubText}>
                      {hpLabel}
                      {hpLabel && action.effectText ? ' · ' : ''}
                      {action.effectText ?? ''}
                    </Text>
                  ) : null}
                </ImageBackground>
              </Pressable>
            );
          })}
          {allowSkip ? (
            <Pressable
              disabled={!canAct}
              onPress={onSkipAction}
              style={[styles.textureButton, !canAct && styles.textureButtonDisabled]}>
              <ImageBackground
                source={!canAct ? buttonTextureDisabled : buttonTexture}
                style={styles.textureBg}
                imageStyle={styles.textureImage}
                resizeMode="stretch"
              >
                <Text style={styles.textureText}>Hold back (no reaction)</Text>
              </ImageBackground>
            </Pressable>
          ) : null}
        </View>

        {isCombatScene ? null : isTimedScene ? (
          <>
            <View style={styles.promptSpacer} />
            <TimedStatusCard
              label={phaseLabel}
              endAt={timedEndsAt}
              statusText={timedWaitingText ?? 'Le groupe attend....'}
              statusStyle="journal"
              timePrefix="Temps restant"
              showTime={false}
              showFinishButton={false}
              allowEarly={timedAllowEarly}
              onFinishEarly={onFinishTimedScene}
              embedded
            />
          </>
        ) : (
          <>
            <View style={styles.promptSpacer} />
            <Text style={styles.journalPrompt}>What does your party decide?</Text>

            {!canVote ? <Text style={styles.voteLockedText}>{voteLockReason ?? 'Voting locked.'}</Text> : null}

            <View style={styles.buttonStack}>
              {visibleOptions.map((option) => {
                const isSelected = option.id === draftOptionId;
                const isResolved = resolvedOption === option.id;
                const isDisabled = Boolean(resolvedOption) || Boolean(localConfirmedOption) || !canVote;

                return (
                  <Pressable
                    key={option.id}
                    disabled={isDisabled}
                    onPress={() => setDraftOptionId(option.id)}
                    style={[
                      styles.textureButton,
                      isSelected && styles.textureButtonSelected,
                      isResolved && styles.textureButtonResolved,
                      isDisabled && !isResolved && styles.textureButtonDisabled,
                    ]}>
                    <ImageBackground
                      source={isDisabled ? buttonTextureDisabled : isSelected || isResolved ? buttonTextureSelected : buttonTexture}
                      style={styles.textureBg}
                      imageStyle={styles.textureImage}
                      resizeMode="stretch"
                    >
                      <Text style={styles.textureText}>{option.text}</Text>
                    </ImageBackground>
                  </Pressable>
                );
              })}
              {Array.from({ length: hiddenOptionCount }).map((_, index) => (
                <View key={`hidden-${index}`} style={[styles.textureButton, styles.textureButtonDisabled]}>
                  <ImageBackground
                    source={buttonTextureDisabled}
                    style={styles.textureBg}
                    imageStyle={styles.textureImage}
                    resizeMode="stretch"
                  >
                    <Text style={styles.textureText}>????</Text>
                  </ImageBackground>
                </View>
              ))}
            </View>

            <Text style={styles.confirmedVotesText}>
              Confirmed votes: {confirmedVoteCount}/{expectedPlayerCount}
            </Text>

            {resolvedOption ? (
              <Text style={styles.waitingText}>
                Advancing when party confirmations are synced ({continuedCount}/{expectedPlayerCount}).
              </Text>
            ) : localConfirmedOption ? (
              <Text style={styles.waitingText}>Vote locked. Waiting for other players to confirm.</Text>
            ) : (
              <Pressable
                disabled={!draftOptionId || !canVote}
                onPress={() => draftOptionId && onConfirmOption(draftOptionId)}
                style={[styles.textureButton, (!draftOptionId || !canVote) && styles.textureButtonDisabled]}>
                <ImageBackground
                  source={!draftOptionId || !canVote ? buttonTextureDisabled : buttonTextureSelected}
                  style={styles.textureBg}
                  imageStyle={styles.textureImage}
                  resizeMode="stretch"
                >
                  <Text style={styles.textureText}>Confirm choice</Text>
                </ImageBackground>
              </Pressable>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={styles.sectionTitle}>Decision Panel</Text> : null}

      {!isTimedScene && !isEndingScene ? (
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab('actions')}
            style={[styles.tabButton, activeTab === 'actions' && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, activeTab === 'actions' && styles.tabButtonTextActive]}>Actions</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('decisions')}
            style={[styles.tabButton, activeTab === 'decisions' && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, activeTab === 'decisions' && styles.tabButtonTextActive]}>
              {isCombatScene ? 'Combat' : 'Decisions'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.content}>
        {isEndingScene ? (
          endingContent
        ) : isTimedScene ? (
          <>
          <SceneActionsCard
            phaseLabel={phaseLabel}
            statusText={statusText}
            actions={actions}
            localSelectedActionId={localSelectedActionId}
            canAct={canAct}
            allowSkip={allowSkip}
            onTakeAction={onTakeAction}
            onSkip={onSkipAction}
            embedded={embedded}
          />
          <TimedStatusCard
            label={phaseLabel}
            endAt={timedEndsAt}
            statusText={timedStatusText ?? statusText}
            showTime={false}
            showFinishButton={false}
            allowEarly={timedAllowEarly}
            onFinishEarly={onFinishTimedScene}
            embedded={embedded}
          />
        </>
      ) : activeTab === 'actions' ? (
        <SceneActionsCard
          phaseLabel={phaseLabel}
          statusText={statusText}
          actions={actions}
          localSelectedActionId={localSelectedActionId}
          canAct={canAct}
          allowSkip={allowSkip}
          onTakeAction={onTakeAction}
          onSkip={onSkipAction}
          embedded={embedded}
        />
      ) : isCombatScene ? (
        combatState ? (
          <CombatStatusCard
            combatState={combatState}
            combatLog={combatLog}
            resolvedOption={resolvedOption}
            embedded={embedded}
          />
        ) : (
          <Text style={styles.loadingText}>Loading combat...</Text>
        )
      ) : (
        <SceneOptionsCard
            visibleOptions={visibleOptions}
            hiddenOptionCount={hiddenOptionCount}
            riskyUnlockedOptionIds={riskyUnlockedOptionIds}
            localConfirmedOption={localConfirmedOption}
            voteCounts={voteCounts}
            confirmedVoteCount={confirmedVoteCount}
            expectedPlayerCount={expectedPlayerCount}
            resolvedOption={resolvedOption}
            resolutionMode={resolutionMode}
            localHasContinued={localHasContinued}
            continuedCount={continuedCount}
            isStoryEnded={isStoryEnded}
          canVote={canVote}
          voteLockReason={voteLockReason}
          onConfirmOption={onConfirmOption}
          onContinueToNextScene={onContinueToNextScene}
          onResetStory={onResetStory}
          canResetStory={canResetStory}
          embedded={embedded}
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  embeddedCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f3e8d0',
    fontFamily: 'Besley',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a5c3a',
    backgroundColor: '#2a1d14',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderColor: '#c9a87a',
    backgroundColor: '#5a3a22',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d3c2a4',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  tabButtonTextActive: {
    color: '#f7f0df',
  },
  content: {
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#d3c2a4',
    fontFamily: 'Besley',
  },
  journalCard: {
    gap: 14,
    paddingTop: 6,
  },
  endingWrap: {
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  endingText: {
    fontSize: 24,
    color: '#47332a',
    textAlign: 'center',
    fontFamily: 'Besley',
    fontWeight: '700',
  },
  journalPrompt: {
    fontSize: 16,
    color: '#47332a',
    textAlign: 'center',
    fontFamily: 'Besley',
    fontWeight: '600',
  },
  promptSpacer: {
    height: 18,
  },
  buttonStack: {
    gap: 10,
    alignItems: 'center',
  },
  textureButton: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  textureButtonDisabled: {
    opacity: 0.7,
  },
  textureButtonSelected: {
    opacity: 1,
  },
  textureButtonResolved: {
    opacity: 0.95,
  },
  textureBg: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textureImage: {
    borderRadius: 10,
  },
  textureText: {
    color: '#f8f1e2',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  textureSubText: {
    marginTop: 4,
    color: '#f0d6a7',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  confirmedVotesText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6E5043',
    fontFamily: 'Besley',
  },
  voteLockedText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6E5043',
    fontStyle: 'italic',
    fontFamily: 'BesleyItalic',
  },
  waitingText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6E5043',
    fontStyle: 'italic',
    fontFamily: 'BesleyItalic',
  },
});
