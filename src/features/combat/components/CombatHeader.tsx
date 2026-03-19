import { View } from 'react-native';
import type { Character } from '@/api/models/character';
import { AnimatedBarFill, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';

type CombatHeaderProps = {
  character: Character | null;
};

const badgeStyle = {
  backgroundColor: colors.actionActiveBg,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: colors.tabBorder,
} as const;

const badgeText = {
  color: colors.intentConfirmedBorder,
  fontWeight: '700' as const,
  fontSize: 13,
};

const CombatHeader = ({ character }: CombatHeaderProps) => {
  const level = character?.level ?? 1;
  const gold = character?.gold ?? 0;
  const exp = character?.exp ?? 0;
  const expMax = level * 100;
  const expPercent = Math.max(0, Math.min(1, exp / Math.max(1, expMax)));

  return (
    <Stack
      direction="row"
      gap={8}
      align="center"
      style={{
        padding: 12,
        backgroundColor: colors.backgroundCombatCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.tabBorder,
      }}
    >
      <Stack style={badgeStyle}>
        <Typography variant="caption" style={badgeText}>
          Lv.{level}
        </Typography>
      </Stack>

      <Stack flex={1} gap={2}>
        <View
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor: colors.combatHealthBarBg,
            overflow: 'hidden',
          }}
        >
          <AnimatedBarFill
            percent={expPercent}
            style={{ height: '100%', backgroundColor: colors.intentConfirmedBorder }}
          />
        </View>
        <Typography
          variant="fine"
          style={{ color: colors.combatHealthValue, fontSize: 10, textAlign: 'center' }}
        >
          Experience: {exp} / {expMax}
        </Typography>
      </Stack>

      <Stack style={badgeStyle}>
        <Typography variant="caption" style={badgeText}>
          {gold} g.
        </Typography>
      </Stack>
    </Stack>
  );
};

export default CombatHeader;
