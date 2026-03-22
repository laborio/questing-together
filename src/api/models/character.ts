import type { PlayerId } from '@/types/player';

type Character = {
  id: string;
  roomId: string;
  playerId: PlayerId;
  name: string;
  level: number;
  gold: number;
  exp: number;
  hp: number;
  hpMax: number;
  tauntTurnsLeft: number;
  abilityCooldownLeft: number;
  healCooldownLeft: number;
};

export type { Character };
