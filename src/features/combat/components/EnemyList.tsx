import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import skeletor from '@/assets/images/skeletor.png';
import { CircularHealthBar, Portrait, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useTranslation } from '@/contexts/I18nContext';
import FloatingDamage from '@/features/combat/components/FloatingDamage';
import useDyingEnemies from '@/features/combat/hooks/useDyingEnemies';
import { getEnemyTemplate } from '@/features/gameConfig';

const VISIBLE_COUNT = 3;
const DEATH_ANIM_MS = 600;
const RING_SIZE = 80;
const PORTRAIT_SIZE = 72;

type FloatingText = {
  id: number;
  text: string;
  color: string;
  target: 'enemy' | 'player';
};

type EnemyData = {
  id: string;
  name: string;
  hp: number;
  hpMax: number;
  isDead: boolean;
  position: number;
  templateId?: string;
  intentIndex?: number;
};

const INTENT_DISPLAY: Record<number, { icon: string; label: string; color: string }> = {
  0: { icon: '⚔️', label: 'Attack', color: colors.combatDamage },
  1: { icon: '🛡️', label: 'Defend', color: '#5b9bd5' },
  2: { icon: '💪', label: 'Buff', color: colors.combatAbilityBuff },
  3: { icon: '💥', label: 'Heavy', color: colors.combatDamage },
  4: { icon: '⚔️⚔️', label: 'Multi', color: colors.combatDamage },
  5: { icon: '🩸', label: 'Debuff', color: '#b35b4a' },
  6: { icon: '🔥', label: 'Charge', color: colors.combatAbilityBuff },
  7: { icon: '✨', label: 'Special', color: colors.intentConfirmedBorder },
};

type EnemyListProps = {
  enemies: EnemyData[];
  selectedEnemyId: string | null;
  onSelectEnemy: (id: string) => void;
  enemyShake: SharedValue<number>;
  enemyFlash: SharedValue<number>;
  enemyLungeX: SharedValue<number>;
  enemyLungeY: SharedValue<number>;
  attackingEnemyId: string | null;
  onEnemyLayout: (enemyId: string, x: number, y: number) => void;
  floatingTexts: FloatingText[];
};

const DyingPortrait = ({ nameKey }: { nameKey: string }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const { t } = useTranslation();

  useEffect(() => {
    translateY.value = withTiming(40, { duration: DEATH_ANIM_MS });
    opacity.value = withTiming(0, { duration: DEATH_ANIM_MS });
  }, [translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const displayName = t(`enemies.${nameKey}` as 'enemies.goule') || nameKey;

  return (
    <Animated.View style={[style, { alignItems: 'center' }]}>
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Portrait source={skeletor} size={PORTRAIT_SIZE} hideName />
      </View>
      <Typography variant="fine" style={{ color: colors.combatDamage }}>
        {displayName}
      </Typography>
    </Animated.View>
  );
};

const EnemyList = ({
  enemies: enemiesProp,
  selectedEnemyId,
  onSelectEnemy,
  enemyShake,
  enemyFlash,
  enemyLungeX,
  enemyLungeY,
  attackingEnemyId,
  onEnemyLayout,
  floatingTexts,
}: EnemyListProps) => {
  const { t } = useTranslation();
  const { dyingEnemies, aliveEnemies } = useDyingEnemies(enemiesProp);

  const frontEnemies = aliveEnemies.slice(0, VISIBLE_COUNT);
  const backEnemies = aliveEnemies.slice(VISIBLE_COUNT);

  const firstAliveId = aliveEnemies[0]?.id ?? null;
  const effectiveSelected = selectedEnemyId ?? firstAliveId;

  const enemyFloats = floatingTexts.filter((ft) => ft.target === 'enemy');

  const translateName = (nameKey: string) => {
    const translated = t(`enemies.${nameKey}` as 'enemies.goule');
    return translated.startsWith('enemies.') ? nameKey : translated || nameKey;
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enemyShake.value }],
  }));

  const lungeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enemyLungeX.value }, { translateY: enemyLungeY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: enemyFlash.value,
  }));

  return (
    <Stack gap={8}>
      {/* Back row — queued enemies */}
      {backEnemies.length > 0 ? (
        <Stack direction="row" justify="center" gap={-8} style={{ opacity: 0.3 }}>
          {backEnemies.map((enemy) => (
            <View key={enemy.id} style={{ alignItems: 'center' }}>
              <Portrait source={skeletor} size={44} hideName />
            </View>
          ))}
        </Stack>
      ) : null}

      {/* Front row — active enemies */}
      <Stack
        direction="row"
        justify="space-evenly"
        style={{
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {frontEnemies.map((enemy) => {
          const isSelected = enemy.id === effectiveSelected;
          const isAttacking = enemy.id === attackingEnemyId;
          const hpPercent = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;

          return (
            <Pressable
              key={enemy.id}
              onPress={() => onSelectEnemy(enemy.id)}
              onLayout={(e) => {
                const { x, y, width } = e.nativeEvent.layout;
                onEnemyLayout(enemy.id, x + width / 2, y);
              }}
            >
              <Stack align="center" gap={3} style={{ position: 'relative' }}>
                {/* HP above portrait */}
                <Typography
                  variant="micro"
                  style={{
                    color: hpPercent <= 0.25 ? colors.combatDamage : colors.combatHealthValue,
                    fontWeight: '700',
                  }}
                >
                  {enemy.hp}/{enemy.hpMax}
                </Typography>

                <Animated.View
                  style={isAttacking ? lungeStyle : isSelected ? shakeStyle : undefined}
                >
                  <View
                    style={{
                      width: RING_SIZE,
                      height: RING_SIZE,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularHealthBar hp={enemy.hp} hpMax={enemy.hpMax} size={RING_SIZE} />
                    <Portrait
                      source={skeletor}
                      size={PORTRAIT_SIZE}
                      highlighted={isSelected}
                      highlightColor={isSelected ? colors.combatDamage : colors.tabBorder}
                      hideName
                    />
                    {isSelected ? (
                      <Animated.View
                        style={[
                          {
                            position: 'absolute',
                            width: PORTRAIT_SIZE,
                            height: PORTRAIT_SIZE,
                            borderRadius: PORTRAIT_SIZE / 2,
                            backgroundColor: colors.combatDamage,
                          },
                          flashStyle,
                        ]}
                        pointerEvents="none"
                      />
                    ) : null}
                  </View>
                </Animated.View>

                {/* Enemy name */}
                <Typography
                  variant="fine"
                  style={{
                    color: isSelected ? colors.combatDamage : colors.combatWaiting,
                    fontWeight: isSelected ? '700' : '400',
                  }}
                >
                  {translateName(enemy.name)}
                </Typography>

                {/* Intent display */}
                {(() => {
                  const template = enemy.templateId
                    ? getEnemyTemplate(enemy.templateId)
                    : undefined;
                  const intentCode =
                    template && enemy.intentIndex !== undefined
                      ? template.intentPattern[enemy.intentIndex % template.intentPattern.length]
                      : undefined;
                  const intent = intentCode !== undefined ? INTENT_DISPLAY[intentCode] : undefined;
                  return intent ? (
                    <Stack
                      direction="row"
                      gap={3}
                      align="center"
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 8,
                        backgroundColor: `${intent.color}15`,
                        borderWidth: 1,
                        borderColor: `${intent.color}22`,
                      }}
                    >
                      <Typography variant="micro" style={{ fontSize: 10 }}>
                        {intent.icon}
                      </Typography>
                      <Typography
                        variant="micro"
                        style={{ color: intent.color, fontWeight: '700', fontSize: 8 }}
                      >
                        {intent.label}
                      </Typography>
                    </Stack>
                  ) : null;
                })()}

                {/* Selected indicator */}
                {isSelected ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.combatDamage,
                      marginTop: 2,
                      shadowColor: colors.combatDamage,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                    }}
                  />
                ) : null}

                {isSelected
                  ? enemyFloats.map((f) => (
                      <FloatingDamage key={f.id} text={f.text} color={f.color} />
                    ))
                  : null}
              </Stack>
            </Pressable>
          );
        })}

        {dyingEnemies.map((enemy) => (
          <DyingPortrait key={`dying-${enemy.id}`} nameKey={enemy.nameKey} />
        ))}
      </Stack>
    </Stack>
  );
};

export default EnemyList;
