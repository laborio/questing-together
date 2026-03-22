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
        const r = result as { attacks: { enemyId: string; damage: number }[] };
        const attacks = r.attacks.map((a) => ({
          enemyId: a.enemyId,
          damage: a.damage,
          direction: getDirectionForEnemy(a.enemyId),
        }));
        playEnemyPhase(attacks, localHp);
      }
    });
  }, [isHost, turnPhase, localHp, combatEnemyPhase, playEnemyPhase, getDirectionForEnemy]);
};

export default useCombatTurnPhase;
