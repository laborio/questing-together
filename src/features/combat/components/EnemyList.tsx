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

const DyingEnemy = ({ name, level, hpMax }: { name: string; level: number; hpMax: number }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shake = useSharedValue(0);

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

  return (
    <Animated.View style={style}>
      <EnemyCard name={name} level={level} hp={0} hpMax={hpMax} />
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
  const prevAliveIdsRef = useRef<Set<string>>(new Set());
  const [dyingEnemies, setDyingEnemies] = useState<
    { id: string; name: string; level: number; hpMax: number }[]
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
        ...newlyDead.map((e) => ({ id: e.id, name: e.name, level: e.level, hpMax: e.hpMax })),
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

  const enemyFloats = floatingTexts.filter((t) => t.target === 'enemy');

  return (
    <Stack gap={4}>
      <Stack direction="row" justify="space-between" align="center">
        <Typography
          variant="body"
          style={{ color: colors.combatTitle, fontWeight: '700', fontSize: 17 }}
        >
          Combat
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.combatRound, fontWeight: '700', fontSize: 12 }}
        >
          ! {killCount} ennemis tués
        </Typography>
      </Stack>

      {previewEnemy ? <EnemyCard name="????" level={0} hp={0} hpMax={1} preview /> : null}

      {visibleEnemies.map((enemy) => {
        const isSelected = enemy.id === effectiveSelected;

        return (
          <View key={enemy.id} style={{ position: 'relative' }}>
            <EnemyCard
              name={enemy.name}
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
          <DyingEnemy name={enemy.name} level={enemy.level} hpMax={enemy.hpMax} />
        </View>
      ))}
    </Stack>
  );
};

export default EnemyList;
