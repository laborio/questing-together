import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionId, SceneOption } from '@/src/story/story';

type SceneOptionsCardProps = {
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
  onConfirmOption: (optionId: OptionId) => void;
  onContinueToNextScene: () => void;
  onResetStory: () => void;
  embedded?: boolean;
};

export function SceneOptionsCard({
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
  onConfirmOption,
  onContinueToNextScene,
  onResetStory,
  embedded = false,
}: SceneOptionsCardProps) {
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

  const selectedOptionLabel = useMemo(() => {
    if (!draftOptionId) return '...';
    const found = visibleOptions.find((option) => option.id === draftOptionId);
    return found ? `${found.id}. ${found.text}` : '...';
  }, [draftOptionId, visibleOptions]);

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={styles.sectionTitle}>Decisions</Text> : null}

      {isStoryEnded ? (
        <>
          <Text style={styles.endTitle}>Story complete</Text>
          <Text style={styles.endText}>All five scenes are finished. You can reset to replay.</Text>
          <Pressable onPress={onResetStory} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset Story</Text>
          </Pressable>
        </>
      ) : (
        <>
          {!canVote ? <Text style={styles.voteLockedText}>{voteLockReason ?? 'Voting locked.'}</Text> : null}
          {hiddenOptionCount > 0 ? (
            <Text style={styles.hiddenText}>{hiddenOptionCount} option(s) remain hidden until reactions unlock them.</Text>
          ) : (
            <Text style={styles.hiddenText}>All options are now revealed.</Text>
          )}

          <Text style={styles.promptText}>What do you do?</Text>

          <View style={styles.optionsList}>
            {visibleOptions.map((option) => {
              const isSelected = option.id === draftOptionId;
              const isResolved = resolvedOption === option.id;
              const isRisky = riskyUnlockedOptionIds.has(option.id);
              const isDisabled = Boolean(resolvedOption) || Boolean(localConfirmedOption) || !canVote;

              return (
                <Pressable
                  key={option.id}
                  disabled={isDisabled}
                  onPress={() => setDraftOptionId(option.id)}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                    isResolved && styles.optionButtonResolved,
                    isDisabled && !isResolved && styles.optionButtonDisabled,
                  ]}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionId}>{option.id}</Text>
                    {isRisky ? <Text style={styles.riskyBadge}>Risky</Text> : null}
                  </View>
                  <Text style={styles.optionText}>{option.text}</Text>
                  <Text style={styles.voteCountText}>Votes: {voteCounts[option.id]}</Text>
                </Pressable>
              );
            })}
            {Array.from({ length: hiddenOptionCount }).map((_, index) => (
              <View key={`hidden-${index}`} style={[styles.optionButton, styles.hiddenOptionPlaceholder]}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionId}>?</Text>
                </View>
                <Text style={styles.hiddenOptionText}>????</Text>
              </View>
            ))}
          </View>

          <Text style={styles.selectedText}>Selected: {selectedOptionLabel}</Text>
          <Text style={styles.voteSummaryText}>
            Confirmed votes: {confirmedVoteCount}/{expectedPlayerCount}
          </Text>

          {resolvedOption ? (
            <>
              <Text style={styles.resolvedText}>
                Resolved: Option {resolvedOption} (
                {resolutionMode === 'random'
                  ? 'tie -> random'
                  : resolutionMode === 'combat'
                    ? 'combat'
                    : resolutionMode === 'timed'
                      ? 'timed'
                    : 'majority'}
                )
              </Text>
              {localHasContinued ? (
                <Text style={styles.waitingText}>
                  Waiting for party to continue ({continuedCount}/{expectedPlayerCount}).
                </Text>
              ) : (
                <Pressable onPress={onContinueToNextScene} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Meet your party at the next scene</Text>
                </Pressable>
              )}
            </>
          ) : localConfirmedOption ? (
            <Text style={styles.waitingText}>Vote locked. Waiting for other players to confirm.</Text>
          ) : (
            <Pressable
              disabled={!draftOptionId || !canVote}
              onPress={() => draftOptionId && onConfirmOption(draftOptionId)}
              style={[styles.confirmButton, (!draftOptionId || !canVote) && styles.confirmButtonDisabled]}>
              <Text style={styles.confirmButtonText}>Confirm Choice</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  embeddedCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3e8d0',
    fontFamily: 'Besley',
  },
  hiddenText: {
    fontSize: 12,
    color: '#d3c2a4',
    lineHeight: 18,
    fontFamily: 'Besley',
  },
  voteLockedText: {
    fontSize: 12,
    color: '#f0b872',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  promptText: {
    fontSize: 14,
    color: '#f4ead7',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Besley',
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a5c3a',
    backgroundColor: '#3b2a1d',
    padding: 12,
    gap: 5,
  },
  optionButtonSelected: {
    borderColor: '#d2a869',
    backgroundColor: '#4b3624',
  },
  optionButtonResolved: {
    borderColor: '#8ac27a',
    backgroundColor: '#2f3a26',
  },
  optionButtonDisabled: {
    opacity: 0.55,
  },
  hiddenOptionPlaceholder: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionId: {
    fontSize: 11,
    color: '#f0d6a7',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  riskyBadge: {
    fontSize: 10,
    color: '#f7d2c9',
    backgroundColor: '#6a2a1c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  optionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#f3e8d0',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  voteCountText: {
    fontSize: 11,
    color: '#d2b88f',
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  hiddenOptionText: {
    fontSize: 13,
    letterSpacing: 1,
    lineHeight: 18,
    color: '#d3c2a4',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  selectedText: {
    fontSize: 12,
    color: '#e2d4ba',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  voteSummaryText: {
    fontSize: 12,
    color: '#c9b69a',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  confirmButton: {
    borderRadius: 10,
    backgroundColor: '#6b4428',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a57a4a',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#f7f0df',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  waitingText: {
    fontSize: 12,
    color: '#d3c2a4',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  resolvedText: {
    fontSize: 13,
    color: '#9ad18b',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  endTitle: {
    fontSize: 16,
    color: '#f3e8d0',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  endText: {
    fontSize: 13,
    color: '#d3c2a4',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  resetButton: {
    borderRadius: 10,
    backgroundColor: '#3b2a1d',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7a5c3a',
  },
  resetButtonText: {
    color: '#f3e8d0',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
});
