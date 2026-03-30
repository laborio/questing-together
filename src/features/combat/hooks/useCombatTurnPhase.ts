import { useEffect, useRef } from 'react';

type LungeDirection = { x: number; y: number };
type EnemyAttackInfo = { enemyId: string; damage: number; direction: LungeDirection };

type UseCombatTurnPhaseParams = {
  isHost: boolean;
  turnPhase: string;
  localHp: number;
  combatEnemyPhase: () => Promise<unknown>;
  playEnemyPhase: (attacks: EnemyAttackInfo[], currentHp: number) => void;
  getDirectionForEnemy: (enemyId: string) => LungeDirection;
};

const useCombatTurnPhase = ({
  isHost,
  turnPhase,
  localHp,
  combatEnemyPhase,
  playEnemyPhase,
  getDirectionForEnemy,
}: UseCombatTurnPhaseParams) => {
  const enemyPhaseTriggeredRef = useRef(false);

  useEffect(() => {
    if (turnPhase !== 'enemy') {
      enemyPhaseTriggeredRef.current = false;
    }
  }, [turnPhase]);

  useEffect(() => {
    if (!isHost || turnPhase !== 'enemy' || enemyPhaseTriggeredRef.current) return;
    enemyPhaseTriggeredRef.current = true;
    void combatEnemyPhase().then((result) => {
      if (result) {
        const r = result as { attacks: { enemyId: string; damage?: number; type?: string }[] };
        // Filter to only damage-dealing attacks and ensure damage is a number
        const attacks = (r.attacks ?? [])
          .filter((a) => a.enemyId && (a.damage ?? 0) > 0)
          .map((a) => ({
            enemyId: a.enemyId,
            damage: a.damage ?? 0,
            direction: getDirectionForEnemy(a.enemyId),
          }));
        playEnemyPhase(attacks, localHp);
      }
    });
  }, [isHost, turnPhase, localHp, combatEnemyPhase, playEnemyPhase, getDirectionForEnemy]);
};

export default useCombatTurnPhase;
