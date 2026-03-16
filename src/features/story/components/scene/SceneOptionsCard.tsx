import { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { ChoiceIntentPortraits } from '@/features/party/ChoiceIntentPortraits';
import type { VoteState } from '@/features/story/types/types';
import type { OptionId } from '@/types/story';

type SceneOptionsCardProps = {
  vote: VoteState;
  onResetStory: () => void;
  canResetStory?: boolean;
  embedded?: boolean;
};

function getResolutionLabel(mode: 'majority' | 'random' | 'combat' | 'timed' | null): string {
  if (mode === 'random') return 'tie -> random';
  if (mode === 'combat') return 'combat';
  if (mode === 'timed') return 'timed';
  return 'majority';
}

const SceneOptionsCard = ({
  vote,
  onResetStory,
  canResetStory = true,
  embedded = false,
}: SceneOptionsCardProps) => {
  const [draftOptionId, setDraftOptionId] = useState<OptionId | null>(null);

  useEffect(() => {
    if (vote.resolved) {
      setDraftOptionId(null);
      return;
    }

    if (vote.localConfirmed) {
      setDraftOptionId(vote.localConfirmed);
      return;
    }

    if (vote.localSelected) {
      setDraftOptionId(vote.localSelected);
      return;
    }

    if (draftOptionId && !vote.visibleOptions.some((option) => option.id === draftOptionId)) {
      setDraftOptionId(null);
    }
  }, [draftOptionId, vote.localConfirmed, vote.localSelected, vote.resolved, vote.visibleOptions]);

  const selectedOptionLabel = useMemo(() => {
    if (!draftOptionId) return '...';
    const found = vote.visibleOptions.find((option) => option.id === draftOptionId);
    return found ? `${found.id}. ${found.text}` : '...';
  }, [draftOptionId, vote.visibleOptions]);

  function renderEndedContent() {
    return (
      <>
        <Typography variant="bodyLg" style={{ color: colors.textStatus, fontWeight: '700' }}>
          Story complete
        </Typography>
        <Typography variant="bodySm" style={{ color: colors.textRole }}>
          {canResetStory
            ? 'All five scenes are finished. Host can restart from Scene 1 for everyone.'
            : 'All five scenes are finished. Waiting for host to restart the adventure.'}
        </Typography>
        {canResetStory ? (
          <Pressable
            onPress={onResetStory}
            style={{
              borderRadius: 10,
              backgroundColor: colors.textParchmentDark,
              paddingVertical: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.tabBorder,
            }}
          >
            <Typography variant="bodySm" style={{ color: colors.textStatus, fontWeight: '700' }}>
              Restart Adventure
            </Typography>
          </Pressable>
        ) : null}
      </>
    );
  }

  function renderResolvedSection() {
    if (!vote.resolved) return null;

    return (
      <>
        <Typography variant="bodySm" style={{ color: colors.combatOutcome, fontWeight: '700' }}>
          Resolved: Option {vote.resolved} ({getResolutionLabel(vote.resolutionMode)})
        </Typography>
        <Typography variant="caption" style={{ color: colors.textRole }}>
          Advancing when party confirmations are synced ({vote.continuedCount}/
          {vote.expectedPlayerCount}).
        </Typography>
      </>
    );
  }

  function renderConfirmSection() {
    if (vote.resolved) return renderResolvedSection();

    if (vote.localConfirmed) {
      return (
        <Typography variant="caption" style={{ color: colors.textRole }}>
          Vote locked. Waiting for other players to confirm.
        </Typography>
      );
    }

    return (
      <Pressable
        disabled={!draftOptionId || !vote.canVote}
        onPress={() => draftOptionId && vote.onConfirm(draftOptionId)}
        style={[
          {
            borderRadius: 10,
            backgroundColor: colors.confirmBg,
            paddingVertical: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.confirmBorder,
          },
          (!draftOptionId || !vote.canVote) && { opacity: 0.5 },
        ]}
      >
        <Typography variant="bodySm" style={{ color: colors.tabActiveText, fontWeight: '700' }}>
          Confirm Choice
        </Typography>
      </Pressable>
    );
  }

  function renderActiveContent() {
    return (
      <>
        {!vote.canVote ? (
          <Typography variant="caption" style={{ color: colors.warningText, fontWeight: '700' }}>
            {vote.lockReason ?? 'Voting locked.'}
          </Typography>
        ) : null}
        {vote.hiddenOptionCount > 0 ? (
          <Typography variant="caption" style={{ color: colors.textRole, lineHeight: 18 }}>
            {vote.hiddenOptionCount} option(s) remain hidden until reactions unlock them.
          </Typography>
        ) : (
          <Typography variant="caption" style={{ color: colors.textRole, lineHeight: 18 }}>
            All options are now revealed.
          </Typography>
        )}

        <Typography
          variant="body"
          style={{
            color: colors.textParchment,
            fontWeight: '700',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Vote for the party&apos;s next move.
        </Typography>

        <Stack gap={8}>
          {vote.visibleOptions.map((option) => {
            const isSelected = option.id === draftOptionId;
            const isResolved = vote.resolved === option.id;
            const isRisky = vote.riskyUnlockedOptionIds.has(option.id);
            const isDisabled =
              Boolean(vote.resolved) || Boolean(vote.localConfirmed) || !vote.canVote;
            const isLockedSelected =
              Boolean(vote.localConfirmed) && vote.localConfirmed === option.id;

            return (
              <Pressable
                key={option.id}
                disabled={isDisabled}
                onPress={() => {
                  setDraftOptionId(option.id);
                  vote.onSelect(option.id);
                }}
                style={[
                  {
                    position: 'relative',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.tabBorder,
                    backgroundColor: colors.textParchmentDark,
                    padding: 12,
                    gap: 5,
                    overflow: 'visible',
                  },
                  isSelected && {
                    borderColor: colors.optionSelectedBorder,
                    backgroundColor: colors.optionSelectedBg,
                  },
                  isResolved && {
                    borderColor: colors.optionResolvedBorder,
                    backgroundColor: colors.statusReady,
                  },
                  isDisabled && !isResolved && !isLockedSelected && { opacity: 0.55 },
                ]}
              >
                <Stack direction="row" justify="space-between" align="center">
                  <Typography
                    variant="captionSm"
                    style={{
                      color: colors.textSubAction,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    {option.id}
                  </Typography>
                  {isRisky ? (
                    <Typography
                      variant="fine"
                      style={{
                        color: colors.riskyBadgeText,
                        backgroundColor: colors.riskyBadgeBg,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 999,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      }}
                    >
                      Risky
                    </Typography>
                  ) : null}
                </Stack>
                <Typography variant="bodySm" style={{ lineHeight: 18, color: colors.textStatus }}>
                  {option.text}
                </Typography>
                <ChoiceIntentPortraits
                  players={vote.optionIntentByOptionId[option.id] ?? []}
                  placement="bottomRight"
                />
                <Typography
                  variant="captionSm"
                  style={{
                    color: colors.textSubAction,
                    textTransform: 'uppercase',
                    fontWeight: '700',
                  }}
                >
                  Votes: {vote.voteCounts[option.id]}
                </Typography>
              </Pressable>
            );
          })}
          {Array.from({ length: vote.hiddenOptionCount }).map((_, index) => (
            <Stack
              key={`hidden-${index}`}
              style={{
                position: 'relative',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.tabBorder,
                backgroundColor: colors.textParchmentDark,
                padding: 12,
                gap: 5,
                overflow: 'visible',
                borderStyle: 'dashed',
                opacity: 0.8,
              }}
            >
              <Stack direction="row" justify="space-between" align="center">
                <Typography
                  variant="captionSm"
                  style={{
                    color: colors.textSubAction,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  ?
                </Typography>
              </Stack>
              <Typography
                variant="bodySm"
                style={{
                  letterSpacing: 1,
                  lineHeight: 18,
                  color: colors.textRole,
                  fontWeight: '700',
                }}
              >
                ????
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Typography variant="caption" style={{ color: colors.textSelected }}>
          Selected: {selectedOptionLabel}
        </Typography>
        <Typography variant="caption" style={{ color: colors.textVoteSummary }}>
          Confirmed votes: {vote.confirmedCount}/{vote.expectedPlayerCount}
        </Typography>

        {renderConfirmSection()}
      </>
    );
  }

  return (
    <Stack
      gap={8}
      style={[
        {
          backgroundColor: colors.backgroundCombatCard,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.borderCard,
        },
        embedded && {
          backgroundColor: 'transparent',
          borderWidth: 0,
          padding: 0,
        },
      ]}
    >
      {!embedded ? (
        <Typography
          variant="subheading"
          style={{
            color: colors.textStatus,
            fontWeight: '700',
            textAlign: undefined,
          }}
        >
          Decisions
        </Typography>
      ) : null}

      {vote.isStoryEnded ? renderEndedContent() : renderActiveContent()}
    </Stack>
  );
};

export default SceneOptionsCard;
