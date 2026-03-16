import type { ChoiceIntentPortraitPlayer } from '@/features/party/ChoiceIntentPortraits';
import type { OptionId, SceneOption } from '@/types/story';

export type SceneActionChoice = {
  id: string;
  text: string;
  isDisabled?: boolean;
  hpDelta?: number;
  effectText?: string;
};

export type SceneState = {
  isEnding: boolean;
  isCombat: boolean;
  isTimed: boolean;
  phaseLabel: string;
  statusText: string;
};

export type ActionState = {
  items: SceneActionChoice[];
  localSelectedId: string | null;
  canAct: boolean;
  allowSkip: boolean;
  onTake: (actionId: string) => void;
  onSkip: () => void;
};

export type VoteState = {
  visibleOptions: SceneOption[];
  hiddenOptionCount: number;
  riskyUnlockedOptionIds: Set<OptionId>;
  optionIntentByOptionId: Record<OptionId, ChoiceIntentPortraitPlayer[]>;
  localSelected: OptionId | null;
  localConfirmed: OptionId | null;
  voteCounts: Record<OptionId, number>;
  confirmedCount: number;
  expectedPlayerCount: number;
  resolved: OptionId | null;
  resolutionMode: 'majority' | 'random' | 'combat' | 'timed' | null;
  localHasContinued: boolean;
  continuedCount: number;
  isStoryEnded: boolean;
  canVote: boolean;
  lockReason: string | null;
  onSelect: (optionId: OptionId) => void;
  onConfirm: (optionId: OptionId) => void;
  onContinue: () => void;
};

export type CombatData = {
  state: {
    partyHp: number;
    partyHpMax: number;
    enemyHp: number;
    enemyHpMax: number;
    enemyName: string;
    round: number;
    outcome: 'victory' | 'defeat' | 'escape' | null;
    allowRun: boolean;
  } | null;
  log: { id: string; text: string }[];
};

export type TimedData = {
  endsAt: string | null;
  durationSeconds: number | null;
  statusText: string | null;
  allowEarly: boolean;
  waitingText: string | null;
  onFinish: () => void;
};
