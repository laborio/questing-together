import { StatBar, Typography } from '@/components/display';
import { Card, Stack } from '@/components/layout';
import { colors } from '@/constants/colors';
import type { OptionId } from '@/types/story';

type CombatRoundLog = {
  id: string;
  text: string;
};

type CombatState = {
  partyHp: number;
  partyHpMax: number;
  enemyHp: number;
  enemyHpMax: number;
  enemyName: string;
  round: number;
  outcome: 'victory' | 'defeat' | 'escape' | null;
  allowRun: boolean;
};

type CombatStatusCardProps = {
  combatState: CombatState;
  combatLog: CombatRoundLog[];
  resolvedOption: OptionId | null;
  showResolutionStatus?: boolean;
  embedded?: boolean;
};

const variantColors = {
  default: {
    title: colors.combatTitle,
    round: colors.combatRound,
    outcome: colors.combatOutcome,
    healthLabel: colors.combatHealthLabel,
    healthValue: colors.combatHealthValue,
    log: colors.combatLog,
    waiting: colors.combatWaiting,
  },
  embedded: {
    title: colors.combatTitleEmbedded,
    round: colors.combatRoundEmbedded,
    outcome: colors.combatOutcomeEmbedded,
    healthLabel: colors.combatHealthLabelEmbedded,
    healthValue: colors.combatHealthValueEmbedded,
    log: colors.combatLogEmbedded,
    waiting: colors.combatWaitingEmbedded,
  },
} as const;

const CombatStatusCard = ({
  combatState,
  combatLog,
  resolvedOption,
  showResolutionStatus = true,
  embedded = false,
}: CombatStatusCardProps) => {
  const outcomeLabel = combatState.outcome ? combatState.outcome.toUpperCase() : null;
  const c = variantColors[embedded ? 'embedded' : 'default'];

  const getResolutionText = () => {
    if (!showResolutionStatus) return null;
    if (resolvedOption) return 'Moving to the next scene...';
    if (combatState.outcome) return 'Resolving combat outcome...';
    return null;
  };

  const resolutionText = getResolutionText();

  return (
    <Card embedded={embedded} backgroundColor={colors.backgroundCombatCard}>
      {!embedded ? (
        <Typography variant="body" style={{ fontSize: 17, fontWeight: '700', color: c.title }}>
          Combat Status
        </Typography>
      ) : null}

      <Stack direction="row" justify="space-between" align="center">
        <Typography variant="caption" style={{ fontSize: 13, fontWeight: '700', color: c.round }}>
          Round {combatState.round}
        </Typography>
        {outcomeLabel ? (
          <Typography
            variant="caption"
            style={{ fontSize: 12, fontWeight: '700', color: c.outcome }}
          >
            {outcomeLabel}
          </Typography>
        ) : null}
      </Stack>

      <StatBar
        label="Party HP"
        current={combatState.partyHp}
        max={combatState.partyHpMax}
        fillColor={colors.combatHealthFill}
        trackColor={colors.combatHealthBarBg}
        labelColor={c.healthLabel}
        valueColor={c.healthValue}
      />

      <StatBar
        label={combatState.enemyName}
        current={combatState.enemyHp}
        max={combatState.enemyHpMax}
        fillColor={colors.combatEnemyFill}
        trackColor={colors.combatHealthBarBg}
        labelColor={c.healthLabel}
        valueColor={c.healthValue}
      />

      {combatLog.length > 0 ? (
        <Stack gap={4}>
          {combatLog.slice(-4).map((entry) => (
            <Typography key={entry.id} variant="body" style={{ fontSize: 12, color: c.log }}>
              {entry.text}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography variant="body" style={{ fontSize: 12, color: c.log }}>
          No rounds resolved yet.
        </Typography>
      )}

      {resolutionText ? (
        <Typography
          variant="body"
          style={{ fontSize: 12, color: c.waiting, fontFamily: 'BesleyItalic' }}
        >
          {resolutionText}
        </Typography>
      ) : null}
    </Card>
  );
};

export default CombatStatusCard;
