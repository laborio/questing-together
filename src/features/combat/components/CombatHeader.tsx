import { Pressable, View } from 'react-native';
import type { Character } from '@/api/models/character';
import { AnimatedBarFill, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';

type CombatHeaderProps = {
  character: Character | null;
  onFlee: () => void;
};

const CombatHeader = ({ character, onFlee }: CombatHeaderProps) => {
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: `${colors.backgroundCombatCard}ee`,
        borderBottomWidth: 1,
        borderBottomColor: `${colors.intentConfirmedBorder}22`,
      }}
    >
      {/* Level badge */}
      <Stack
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor: `${colors.intentConfirmedBorder}18`,
          borderWidth: 1,
          borderColor: `${colors.intentConfirmedBorder}33`,
        }}
      >
        <Typography
          variant="bodySm"
          style={{ color: colors.intentConfirmedBorder, fontWeight: '700' }}
        >
          Lv.{level}
        </Typography>
      </Stack>

      {/* Experience bar */}
      <Stack flex={1} gap={2}>
        <View
          style={{
            height: 5,
            borderRadius: 999,
            backgroundColor: `${colors.combatHealthBarBg}88`,
            overflow: 'hidden',
          }}
        >
          <AnimatedBarFill
            percent={expPercent}
            style={{
              height: '100%',
              backgroundColor: colors.intentConfirmedBorder,
              borderRadius: 999,
            }}
          />
        </View>
        <Typography
          variant="micro"
          style={{ color: colors.combatHealthValue, textAlign: 'center', fontSize: 8 }}
        >
          {exp} / {expMax} XP
        </Typography>
      </Stack>

      {/* Gold badge */}
      <Stack
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor: `${colors.intentConfirmedBorder}18`,
          borderWidth: 1,
          borderColor: `${colors.intentConfirmedBorder}33`,
        }}
      >
        <Typography
          variant="bodySm"
          style={{ color: colors.intentConfirmedBorder, fontWeight: '700' }}
        >
          {gold} g.
        </Typography>
      </Stack>

      {/* Flee button */}
      <Pressable
        onPress={onFlee}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor: `${colors.combatDamage}22`,
          borderWidth: 1,
          borderColor: `${colors.combatDamage}33`,
        }}
      >
        <Typography variant="bodySm" style={{ color: colors.riskyBadgeText, fontWeight: '700' }}>
          🏃
        </Typography>
      </Pressable>
    </Stack>
  );
};

export default CombatHeader;
