import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import skeletor from '@/assets/images/skeletor.png';
import { CircularHealthBar, Portrait, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import FloatingDamage from '@/features/combat/components/FloatingDamage';
import useDyingEnemies from '@/features/combat/hooks/useDyingEnemies';
import { measureViewCenter } from '@/features/combat/utils/measureViewCenter';

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

type EnemyListProps = {
  selectedEnemyId: string | null;
  onSelectEnemy: (id: string) => void;
  enemyShake: SharedValue<number>;
  enemyFlash: SharedValue<number>;
  enemyLungeX: SharedValue<number>;
  enemyLungeY: SharedValue<number>;
  attackingEnemyId: string | null;
  onEnemyLayout: (enemyId: string, x: number, y: number) => void;
  floatingTexts: FloatingText[];
  onSelectedAnchorChange?: (point: { x: number; y: number } | null) => void;
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
  selectedEnemyId,
  onSelectEnemy,
  enemyShake,
  enemyFlash,
  enemyLungeX,
  enemyLungeY,
  attackingEnemyId,
  onEnemyLayout,
  floatingTexts,
  onSelectedAnchorChange,
}: EnemyListProps) => {
  const { roomConnection } = useGame();
  const { t } = useTranslation();
  const selectedEnemyRef = useRef<View>(null);

  const allEnemies = roomConnection.enemies;
  const { dyingEnemies, aliveEnemies } = useDyingEnemies(allEnemies);
  const killCount = allEnemies.filter((e) => e.isDead).length;

  const frontEnemies = aliveEnemies.slice(0, VISIBLE_COUNT);
  const backEnemies = aliveEnemies.slice(VISIBLE_COUNT);

  const firstAliveId = aliveEnemies[0]?.id ?? null;
  const effectiveSelected = selectedEnemyId ?? firstAliveId;

  const enemyFloats = floatingTexts.filter((ft) => ft.target === 'enemy');

  const translateName = (nameKey: string) => t(`enemies.${nameKey}` as 'enemies.goule') || nameKey;

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enemyShake.value }],
  }));

  const lungeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enemyLungeX.value }, { translateY: enemyLungeY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: enemyFlash.value,
  }));

  // VFX anchor tracking
  useEffect(() => {
    if (!effectiveSelected) {
      onSelectedAnchorChange?.(null);
      return;
    }

    requestAnimationFrame(() => {
      measureViewCenter(selectedEnemyRef, (point) => {
        onSelectedAnchorChange?.(point);
      });
    });
  }, [effectiveSelected, onSelectedAnchorChange]);

  return (
    <Stack gap={8}>
      <Stack direction="row" justify="space-between" align="center">
        <Typography variant="sectionTitle" style={{ color: colors.combatTitle, fontWeight: '700' }}>
          {t('combat.title')}
        </Typography>
        <Typography variant="caption" style={{ color: colors.combatRound, fontWeight: '700' }}>
          {t('combat.enemiesKilled', { count: killCount })}
        </Typography>
      </Stack>

      {/* Back row — queued enemies */}
      {backEnemies.length > 0 ? (
        <Stack direction="row" justify="center" gap={-8} style={{ opacity: 0.35 }}>
          {backEnemies.map((enemy) => (
            <View key={enemy.id} style={{ alignItems: 'center' }}>
              <Portrait source={skeletor} size={48} hideName />
            </View>
          ))}
        </Stack>
      ) : null}

      {/* Front row — active enemies */}
      <Stack direction="row" justify="space-evenly" style={{ paddingVertical: 4 }}>
        {frontEnemies.map((enemy) => {
          const isSelected = enemy.id === effectiveSelected;
          const isAttacking = enemy.id === attackingEnemyId;

          return (
            <Pressable
              key={enemy.id}
              ref={isSelected ? selectedEnemyRef : undefined}
              onPress={() => onSelectEnemy(enemy.id)}
              onLayout={(e) => {
                const { x, y, width } = e.nativeEvent.layout;
                onEnemyLayout(enemy.id, x + width / 2, y);
                if (isSelected) {
                  measureViewCenter(selectedEnemyRef, (point) => {
                    onSelectedAnchorChange?.(point);
                  });
                }
              }}
            >
              <Stack align="center" gap={2} style={{ position: 'relative' }}>
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
                <Typography
                  variant="fine"
                  style={{
                    color: isSelected ? colors.combatDamage : colors.combatWaiting,
                    fontWeight: isSelected ? '700' : '400',
                  }}
                >
                  {translateName(enemy.name)}
                </Typography>
                <Typography variant="micro" style={{ color: colors.combatHealthValue }}>
                  {enemy.hp}/{enemy.hpMax}
                </Typography>
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
