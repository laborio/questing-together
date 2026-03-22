export type ScreenType = 'combat' | 'narrative_choice' | 'puzzle' | 'shop' | 'boss_fight' | 'rest';
export type PhaseType = 'early' | 'core' | 'resolve';

export type ScreenEffect = {
  hpDelta?: number;
  goldDelta?: number;
  expDelta?: number;
};

export type CombatScreenConfig = {
  enemyCount: number;
  levelRange: [number, number];
  isBoss: boolean;
  bossName?: string;
};

export type ChoiceScreenConfig = {
  prompt: string;
  options: { id: string; text: string; effect: ScreenEffect }[];
};

export type ShopScreenConfig = {
  items: { id: string; name: string; cost: number; effect: ScreenEffect }[];
};

export type RestScreenConfig = {
  hpRestorePercent: number;
};

export type PuzzleScreenConfig = {
  puzzleId: string;
  timeLimit?: number;
  reward: ScreenEffect;
  penalty: ScreenEffect;
};

export type ScreenConfig =
  | CombatScreenConfig
  | ChoiceScreenConfig
  | ShopScreenConfig
  | RestScreenConfig
  | PuzzleScreenConfig;

export type AdventureScreen = {
  id: string;
  roomId: string;
  bloc: number;
  phase: PhaseType;
  position: number;
  screenType: ScreenType;
  config: ScreenConfig;
  isCompleted: boolean;
  resultJson: Record<string, unknown> | null;
};
