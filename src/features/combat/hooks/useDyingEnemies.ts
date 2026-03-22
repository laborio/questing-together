import { useEffect, useRef, useState } from 'react';
import type { Enemy } from '@/api/models/enemy';

const DEATH_ANIM_MS = 600;

type DyingEnemy = { id: string; nameKey: string };

const useDyingEnemies = (allEnemies: Enemy[]) => {
  const prevAliveIdsRef = useRef<Set<string>>(new Set());
  const [dyingEnemies, setDyingEnemies] = useState<DyingEnemy[]>([]);

  const aliveEnemies = allEnemies.filter((e) => !e.isDead);

  useEffect(() => {
    const currentAliveIds = new Set(aliveEnemies.map((e) => e.id));
    const prevIds = prevAliveIdsRef.current;

    const newlyDead = allEnemies.filter((e) => e.isDead && prevIds.has(e.id));
    if (newlyDead.length > 0) {
      setDyingEnemies((prev) => [
        ...prev,
        ...newlyDead.map((e) => ({ id: e.id, nameKey: e.name })),
      ]);

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

  return { dyingEnemies, aliveEnemies };
};

export default useDyingEnemies;
