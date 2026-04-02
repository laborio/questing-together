import { Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import type { PlayerTurnState } from '@/types/combatTurn';

type CombatTurnBannerProps = {
  turnPhase: string;
  turnNumber: number;
  playerTurnStates: PlayerTurnState[];
};

const CombatTurnBanner = ({ turnPhase, turnNumber }: CombatTurnBannerProps) => {
  if (turnPhase === 'enemy') {
    return (
      <Stack
        align="center"
        style={{
          paddingVertical: 6,
          marginHorizontal: 12,
          borderRadius: 6,
          backgroundColor: `${colors.combatDamage}15`,
          borderWidth: 1,
          borderColor: `${colors.combatDamage}22`,
        }}
      >
        <Typography variant="caption" bold style={{ color: colors.combatDamage, letterSpacing: 1 }}>
          Enemy Phase
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      justify="center"
      align="center"
      style={{
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginHorizontal: 12,
      }}
    >
      <Typography
        variant="caption"
        bold
        style={{ color: colors.intentConfirmedBorder, letterSpacing: 0.5 }}
      >
        Turn {turnNumber}
      </Typography>
    </Stack>
  );
};

export default CombatTurnBanner;
