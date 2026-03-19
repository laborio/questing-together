import type { Enemy } from '@/api/models/enemy';

export function getEffectiveEnemyId(
  enemies: Enemy[],
  selectedEnemyId: string | null,
): string | null {
  const aliveEnemies = enemies.filter((e) => !e.isDead);
  const selectedIsAlive = aliveEnemies.some((e) => e.id === selectedEnemyId);
  return selectedIsAlive ? selectedEnemyId : (aliveEnemies[0]?.id ?? null);
}
