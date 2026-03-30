import type { PlayerId } from '@/types/player';

// ─── Player combat state ────────────────────────────────────────

type DeckCardInstance = {
  cardId: string;
  upgraded: boolean;
  usageCount: number;
};

type PlayerCombatState = {
  id: string;
  roomId: string;
  screenId: string;
  playerId: PlayerId;
  identityId: string;

  // Deck zones
  drawPile: DeckCardInstance[];
  hand: DeckCardInstance[];
  discardPile: DeckCardInstance[];

  // Resources
  energy: number;
  maxEnergy: number;
  block: number;

  // Trait charges (empowerment)
  traitCharges: Record<string, number>;
  attuneCharges: number;
  attuneTargetTrait: string | null;

  // Status effects
  burn: number;
  vulnerable: number;
  weakened: number;
  thorns: number;
  regen: number;

  // Bonuses
  startingBlock: number;
  freeReroll: boolean;
};

// ─── Enemy combat state ─────────────────────────────────────────

type EnemyCombatState = {
  id: string;
  roomId: string;
  screenId: string;
  templateId: string;
  name: string;
  icon: string;
  hp: number;
  hpMax: number;
  strength: number;
  block: number;
  intentIndex: number;
  isDead: boolean;

  // Status effects on enemy
  burn: number;
  vulnerable: number;
  weakened: number;
};

export type { DeckCardInstance, EnemyCombatState, PlayerCombatState };
