import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EnemyCard, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import FloatingDamage from '@/features/combat/components/FloatingDamage';

const VISIBLE_COUNT = 3;
const DEATH_ANIM_MS = 600;

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
  floatingTexts: FloatingText[];
};

const DyingEnemy = ({
  nameKey,
  level,
  hpMax,
}: {
  nameKey: string;
  level: number;
  hpMax: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shake = useSharedValue(0);
  const { t } = useTranslation();

  useEffect(() => {
    shake.value = withSequence(
      withTiming(6, { duration: 40 }),
      withTiming(-6, { duration: 40 }),
      withTiming(4, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    translateY.value = withTiming(80, { duration: DEATH_ANIM_MS });
    opacity.value = withTiming(0, { duration: DEATH_ANIM_MS });
  }, [translateY, opacity, shake]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const displayName = t(`enemies.${nameKey}` as 'enemies.goule') || nameKey;

  return (
    <Animated.View style={style}>
      <EnemyCard name={displayName} level={level} hp={0} hpMax={hpMax} />
    </Animated.View>
  );
};

const EnemyList = ({
  selectedEnemyId,
  onSelectEnemy,
  enemyShake,
  enemyFlash,
  floatingTexts,
}: EnemyListProps) => {
  const { roomConnection } = useGame();
  const { t } = useTranslation();
  const prevAliveIdsRef = useRef<Set<string>>(new Set());
  const [dyingEnemies, setDyingEnemies] = useState<
    { id: string; nameKey: string; level: number; hpMax: number }[]
  >([]);

  const allEnemies = roomConnection.enemies;
  const aliveEnemies = allEnemies.filter((e) => !e.isDead);
  const killCount = allEnemies.filter((e) => e.isDead).length;

  // Detect newly dead enemies
  useEffect(() => {
    const currentAliveIds = new Set(aliveEnemies.map((e) => e.id));
    const prevIds = prevAliveIdsRef.current;

    const newlyDead = allEnemies.filter((e) => e.isDead && prevIds.has(e.id));
    if (newlyDead.length > 0) {
      setDyingEnemies((prev) => [
        ...prev,
        ...newlyDead.map((e) => ({ id: e.id, nameKey: e.name, level: e.level, hpMax: e.hpMax })),
      ]);

      // Remove dying enemies after animation
      const start = performance.now();
      const poll = () => {
        if (performance.now() - start >= DEATH_ANIM_MS) {
          setDyingEnemies((prev) => prev.filter((d) => !newlyDead.some((nd) => nd.id === d.id)));
        } else {
          requestAnimationFrame(poll);
        }
      };
      requestAnimationFrame(poll);
    }

    prevAliveIdsRef.current = currentAliveIds;
  }, [aliveEnemies, allEnemies]);

  const visibleEnemies = aliveEnemies.slice(0, VISIBLE_COUNT).reverse();
  const previewEnemy = aliveEnemies[VISIBLE_COUNT] ?? null;

  const firstAliveId = aliveEnemies[0]?.id ?? null;
  const effectiveSelected = selectedEnemyId ?? firstAliveId;

  const enemyFloats = floatingTexts.filter((ft) => ft.target === 'enemy');

  const translateName = (nameKey: string) => t(`enemies.${nameKey}` as 'enemies.goule') || nameKey;

  return (
    <Stack gap={4}>
      <Stack direction="row" justify="space-between" align="center">
        <Typography variant="sectionTitle" style={{ color: colors.combatTitle, fontWeight: '700' }}>
          {t('combat.title')}
        </Typography>
        <Typography variant="caption" style={{ color: colors.combatRound, fontWeight: '700' }}>
          ! {t('combat.enemiesKilled', { count: killCount })}
        </Typography>
      </Stack>

      {previewEnemy ? <EnemyCard name="????" level={0} hp={0} hpMax={1} preview /> : null}

      {visibleEnemies.map((enemy) => {
        const isSelected = enemy.id === effectiveSelected;

        return (
          <View key={enemy.id} style={{ position: 'relative' }}>
            <EnemyCard
              name={translateName(enemy.name)}
              level={enemy.level}
              hp={enemy.hp}
              hpMax={enemy.hpMax}
              selected={isSelected}
              shake={isSelected ? enemyShake : undefined}
              flash={isSelected ? enemyFlash : undefined}
              onPress={() => onSelectEnemy(enemy.id)}
            />
            {isSelected
              ? enemyFloats.map((f) => <FloatingDamage key={f.id} text={f.text} color={f.color} />)
              : null}
          </View>
        );
      })}

      {dyingEnemies.map((enemy) => (
        <View
          key={`dying-${enemy.id}`}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          pointerEvents="none"
        >
          <DyingEnemy nameKey={enemy.nameKey} level={enemy.level} hpMax={enemy.hpMax} />
        </View>
      ))}
    </Stack>
  );
};

export default EnemyList;
