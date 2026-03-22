import type { PlayerId } from '@/types/player';

type CombatTurnPhase = 'player' | 'enemy' | 'resolved';

type CombatTurn = {
  id: string;
  roomId: string;
  screenId: string;
  turnNumber: number;
  phase: CombatTurnPhase;
};

type PlayerTurnState = {
  id: string;
  combatTurnId: string;
  playerId: PlayerId;
  actionsRemaining: number;
  hasEndedTurn: boolean;
};

export type { CombatTurn, CombatTurnPhase, PlayerTurnState };
