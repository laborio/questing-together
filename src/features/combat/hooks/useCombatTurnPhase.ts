import { useEffect, useRef } from 'react';

type UseCombatTurnPhaseParams = {
  isHost: boolean;
  turnPhase: string;
  combatEnemyPhase: () => Promise<unknown>;
  playEnemyPhase: (totalDamage: number, direction: { x: number; y: number }) => void;
  getLungeToPlayer: () => { x: number; y: number };
};

const useCombatTurnPhase = ({
  isHost,
  turnPhase,
  combatEnemyPhase,
  playEnemyPhase,
  getLungeToPlayer,
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
        const r = result as { attacks: { damage: number }[] };
        const totalDamage = r.attacks.reduce((sum, a) => sum + a.damage, 0);
        playEnemyPhase(totalDamage, getLungeToPlayer());
      }
    });
  }, [isHost, turnPhase, combatEnemyPhase, playEnemyPhase, getLungeToPlayer]);
};

export default useCombatTurnPhase;
