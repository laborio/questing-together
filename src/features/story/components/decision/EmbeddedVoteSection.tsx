import { Stack, TexturedButton, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { ChoiceIntentPortraits } from '@/features/party/ChoiceIntentPortraits';
import type { VoteState } from '@/features/story/types/types';
import { getOptionOpacity, getOptionVariant } from '@/features/story/utils/decisionHelpers';
import type { OptionId } from '@/types/story';

type EmbeddedVoteSectionProps = {
  vote: VoteState;
  draftOptionId: OptionId | null;
};

function VoteStatusText({ text }: { text: string }) {
  return (
    <Typography
      variant="caption"
      style={{ textAlign: 'center', color: colors.combatHealthValueEmbedded, fontStyle: 'italic' }}
    >
      {text}
    </Typography>
  );
}

function ConfirmOrWaitingStatus({
  vote,
  draftOptionId,
}: {
  vote: VoteState;
  draftOptionId: OptionId | null;
}) {
  if (vote.resolved) {
    return (
      <VoteStatusText
        text={`Advancing when party confirmations are synced (${vote.continuedCount}/${vote.expectedPlayerCount}).`}
      />
    );
  }

  if (vote.localConfirmed) {
    return <VoteStatusText text="Vote locked. Waiting for other players to confirm." />;
  }

  return (
    <TexturedButton
      variant="selected"
      disabled={!draftOptionId || !vote.canVote}
      onPress={() => draftOptionId && vote.onConfirm(draftOptionId)}
      label="Confirm choice"
      style={{ maxWidth: 360 }}
    />
  );
}

const EmbeddedVoteSection = ({ vote, draftOptionId }: EmbeddedVoteSectionProps) => {
  return (
    <>
      <Stack style={{ height: 18 }} />
      <Typography
        variant="bodyLg"
        style={{ color: colors.combatTitleEmbedded, textAlign: 'center', fontWeight: '600' }}
      >
        Vote for the party&apos;s next move.
      </Typography>

      {!vote.canVote ? <VoteStatusText text={vote.lockReason ?? 'Voting locked.'} /> : null}

      <Stack gap={10} align="center">
        {vote.visibleOptions.map((option) => {
          const isSelected = option.id === draftOptionId;
          const isResolved = vote.resolved === option.id;
          const isDisabled =
            Boolean(vote.resolved) || Boolean(vote.localConfirmed) || !vote.canVote;
          const isLockedSelected =
            Boolean(vote.localConfirmed) && vote.localConfirmed === option.id;

          return (
            <TexturedButton
              key={option.id}
              variant={getOptionVariant(isSelected, isResolved)}
              disabled={isDisabled}
              onPress={() => vote.onSelect(option.id)}
              style={{
                maxWidth: 360,
                opacity: getOptionOpacity(isDisabled, isResolved, isLockedSelected),
              }}
            >
              <Typography variant="body" style={{ color: colors.textPrimary, textAlign: 'center' }}>
                {option.text}
              </Typography>
              <ChoiceIntentPortraits
                players={vote.optionIntentByOptionId[option.id] ?? []}
                size="compact"
                placement="topRight"
              />
            </TexturedButton>
          );
        })}
        {Array.from({ length: vote.hiddenOptionCount }).map((_, index) => (
          <TexturedButton key={`hidden-${index}`} disabled label="????" style={{ maxWidth: 360 }} />
        ))}
      </Stack>

      <Typography
        variant="caption"
        style={{ textAlign: 'center', color: colors.combatHealthValueEmbedded }}
      >
        Confirmed votes: {vote.confirmedCount}/{vote.expectedPlayerCount}
      </Typography>

      <ConfirmOrWaitingStatus vote={vote} draftOptionId={draftOptionId} />
    </>
  );
};

export default EmbeddedVoteSection;
