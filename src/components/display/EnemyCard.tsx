import { Pressable, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import AnimatedBarFill from '@/components/display/AnimatedBarFill';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type EnemyCardProps = {
  name: string;
  level: number;
  hp: number;
  hpMax: number;
  selected?: boolean;
  preview?: boolean;
  shake?: SharedValue<number>;
  flash?: SharedValue<number>;
  onPress?: () => void;
};

const EnemyCard = ({
  name,
  level,
  hp,
  hpMax,
  selected = false,
  preview = false,
  shake,
  flash,
  onPress,
}: EnemyCardProps) => {
  const percent = Math.max(0, Math.min(1, hp / Math.max(1, hpMax)));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake?.value ?? 0 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash?.value ?? 0,
  }));

  if (preview) {
    return (
      <Stack
        align="center"
        justify="center"
        style={{
          padding: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.tabBorder,
          backgroundColor: colors.backgroundCombatCard,
          opacity: 0.35,
        }}
      >
        <Typography
          variant="caption"
          style={{
            color: colors.combatTitle,
            fontWeight: '600',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {name}
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Animated.View style={selected ? shakeStyle : undefined}>
      <Stack
        gap={4}
        style={{
          padding: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: selected ? colors.combatEnemyFill : colors.tabBorder,
          backgroundColor: selected ? colors.combatEnemySelectedBg : colors.backgroundCombatCard,
          overflow: 'hidden',
        }}
      >
        <Stack direction="row" justify="space-between" align="center">
          <Typography
            variant="caption"
            style={{ color: colors.combatTitle, fontWeight: '600', fontSize: 13 }}
          >
            {name}
          </Typography>
          <Stack direction="row" gap={6} align="center">
            <Typography variant="fine" style={{ color: colors.combatHealthValue, fontSize: 10 }}>
              {hp}/{hpMax}
            </Typography>
            <Typography variant="fine" style={{ color: colors.combatWaiting, fontSize: 10 }}>
              Lv.{level}
            </Typography>
          </Stack>
        </Stack>

        <View
          style={{
            height: 4,
            borderRadius: 999,
            backgroundColor: colors.combatHealthBarBg,
            overflow: 'hidden',
          }}
        >
          <AnimatedBarFill
            percent={percent}
            style={{ height: '100%', backgroundColor: colors.combatEnemyFill }}
          />
        </View>

        {/* Red flash overlay */}
        {selected ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.combatDamage,
                borderRadius: 8,
              },
              flashStyle,
            ]}
            pointerEvents="none"
          />
        ) : null}
      </Stack>
    </Animated.View>
  );

  if (!onPress) return content;

  return <Pressable onPress={onPress}>{content}</Pressable>;
};

export default EnemyCard;
