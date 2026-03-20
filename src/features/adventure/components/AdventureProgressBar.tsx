import { View } from 'react-native';
import { Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import type { PhaseType, ScreenType } from '@/types/adventure';

type AdventureProgressBarProps = {
  position: number;
  bloc: number;
  phase: PhaseType;
  screenType: ScreenType;
};

const PHASE_LABELS: Record<PhaseType, string> = {
  early: 'Early',
  core: 'Core',
  resolve: 'Resolve',
};

const SCREEN_ICONS: Record<ScreenType, string> = {
  combat: '⚔️',
  boss_fight: '🐉',
  narrative_choice: '📜',
  puzzle: '🧩',
  shop: '🛒',
  rest: '🏕️',
};

const AdventureProgressBar = ({ position, bloc, phase, screenType }: AdventureProgressBarProps) => {
  return (
    <Stack
      direction="row"
      align="center"
      justify="space-between"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.backgroundCombatCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.tabBorder,
      }}
    >
      <Stack direction="row" gap={6} align="center">
        <View
          style={{
            backgroundColor: colors.actionActiveBg,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: colors.tabBorder,
          }}
        >
          <Typography variant="micro" style={{ color: colors.intentConfirmedBorder }}>
            Bloc {bloc}
          </Typography>
        </View>
        <Typography variant="small" style={{ color: colors.combatWaiting }}>
          {PHASE_LABELS[phase]}
        </Typography>
      </Stack>

      <Stack direction="row" gap={4} align="center">
        <Typography variant="body1" style={{ color: colors.textPrimary }}>
          {SCREEN_ICONS[screenType]}
        </Typography>
        <Typography variant="small" style={{ color: colors.combatWaiting }}>
          #{position + 1}
        </Typography>
      </Stack>
    </Stack>
  );
};

export default AdventureProgressBar;
