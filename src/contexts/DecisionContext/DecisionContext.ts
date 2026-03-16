import { createContext, useContext } from 'react';
import type {
  ActionState,
  CombatData,
  SceneState,
  TimedData,
  VoteState,
} from '@/features/story/types/types';
import type { OptionId } from '@/types/story';

export type TabId = 'actions' | 'decisions';

export type DecisionContextValue = {
  scene: SceneState;
  actions: ActionState;
  vote: VoteState;
  combat: CombatData;
  timed: TimedData;
  activeTab: TabId;
  draftOptionId: OptionId | null;
  onResetStory: () => void;
  canResetStory: boolean;
  embedded: boolean;
  setActiveTab: (tab: TabId) => void;
  handleSelectOption: (optionId: OptionId) => void;
};

export const DecisionContext = createContext<DecisionContextValue | null>(null);

export function useDecision(): DecisionContextValue {
  const ctx = useContext(DecisionContext);

  if (!ctx) throw new Error('useDecision must be used within DecisionProvider');

  return ctx;
}
