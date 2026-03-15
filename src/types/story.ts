import type { RoleId } from '@/types/player';

export type SceneId = string;
export type OptionId = 'A' | 'B' | 'C';
export type ActionId = string;
export type SceneMode = 'story' | 'combat' | 'timed';

export type TagSet = {
  global?: string[];
  scene?: string[];
};

export type TagCondition = {
  all?: string[];
  any?: string[];
  none?: string[];
};

export type TagRoute = {
  ifGlobal?: TagCondition;
  ifScene?: TagCondition;
  ifActions?: TagCondition;
  to: SceneId | null;
};

export type SceneEvidence = {
  id: string;
  label: string;
  description: string;
};

export type SceneOption = {
  id: OptionId;
  text: string;
  defaultVisible?: boolean;
  isRisky?: boolean;
  tagsAdded?: TagSet;
  next: TagRoute[];
};

export type SceneUnlockRule = {
  optionId: OptionId;
  evidenceIds: string[];
};

export type SceneOutcome = {
  text: string;
  hpDelta?: number;
};

export type DialogueLine = {
  speaker: string;
  text: string;
  aside?: string;
  narration?: string;
};

export type SceneAction = {
  id: ActionId;
  role: RoleId | 'any';
  text: string;
  buttonText?: string;
  stage?: string;
  narration?: string;
};

export type CombatActionEffect = {
  damage?: number;
  block?: number;
  enemyAttackDelta?: number;
  run?: boolean;
};

export type CombatAction = {
  id: ActionId;
  role: RoleId | 'any';
  text: string;
  effect: CombatActionEffect;
};

export type CombatConfig = {
  partyHp: number;
  actions: CombatAction[];
};

export type CombatSceneConfig = {
  enemyName: string;
  enemyHp: number;
  enemyAttack: number;
  allowRun?: boolean;
};

export type TimedSceneConfig = {
  kind: 'rest' | 'travel' | 'wait';
  durationSeconds: number;
  allowEarly?: boolean;
  statusText?: string;
  restWaitingText?: string;
};

export type SceneActionOutcome = {
  narration: string;
  dialogue?: DialogueLine[];
  evidenceIds?: string[];
  unlockOptionIds?: OptionId[];
  disableActionIds?: ActionId[];
  tagsAdded?: TagSet;
  hpDelta?: number;
};

export type SceneStep = {
  id: string;
  actions: SceneAction[];
  outcomes: Record<ActionId, SceneActionOutcome>;
};

export type Scene = {
  id: SceneId;
  title: string;
  journalTitle?: string;
  intermissionText?: string;
  canonicalTruth: string;
  intro: string;
  introDialogue?: DialogueLine[];
  introByPreviousOption?: Partial<Record<OptionId, string>>;
  mode?: SceneMode;
  combat?: CombatSceneConfig;
  timed?: TimedSceneConfig;
  evidence: SceneEvidence[];
  steps: SceneStep[];
  options: SceneOption[];
  unlockRules: SceneUnlockRule[];
  outcomeByOption: Record<OptionId, SceneOutcome>;
  isEnding?: boolean;
  meta?: Record<string, unknown>;
};

export type StoryData = {
  version: number;
  startSceneId: SceneId;
  scenes: Scene[];
  combat?: CombatConfig;
  meta?: Record<string, unknown>;
};
