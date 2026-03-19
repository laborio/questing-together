import { EnemyCard, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';

const VISIBLE_COUNT = 3;

type EnemyListProps = {
  selectedEnemyId: string | null;
  onSelectEnemy: (id: string) => void;
};

const EnemyList = ({ selectedEnemyId, onSelectEnemy }: EnemyListProps) => {
  const { roomConnection } = useGame();

  const allEnemies = roomConnection.enemies;
  const aliveEnemies = allEnemies.filter((e) => !e.isDead);
  const killCount = allEnemies.filter((e) => e.isDead).length;

  const visibleEnemies = aliveEnemies.slice(0, VISIBLE_COUNT).reverse();
  const previewEnemy = aliveEnemies[VISIBLE_COUNT] ?? null;

  const firstAliveId = aliveEnemies[0]?.id ?? null;
  const effectiveSelected = selectedEnemyId ?? firstAliveId;

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

      {visibleEnemies.map((enemy) => (
        <EnemyCard
          key={enemy.id}
          name={enemy.name}
          level={enemy.level}
          hp={enemy.hp}
          hpMax={enemy.hpMax}
          selected={enemy.id === effectiveSelected}
          onPress={() => onSelectEnemy(enemy.id)}
        />
      ))}
    </Stack>
  );
};

export default EnemyList;
