import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import {
  DecisionContext,
  type DecisionContextValue,
  type TabId,
} from '@/contexts/DecisionContext/DecisionContext';
import type {
  ActionState,
  CombatData,
  SceneState,
  TimedData,
  VoteState,
} from '@/features/story/types/types';
import type { OptionId } from '@/types/story';

type DecisionProviderProps = {
  scene: SceneState;
  actions: ActionState;
  vote: VoteState;
  combat: CombatData;
  timed: TimedData;
  onResetStory: () => void;
  canResetStory: boolean;
  embedded: boolean;
  children: ReactNode;
};

export function DecisionProvider({
  scene,
  actions,
  vote,
  combat,
  timed,
  onResetStory,
  canResetStory,
  embedded,
  children,
}: DecisionProviderProps) {
  const [userTab, setUserTab] = useState<TabId>('actions');
  const [pendingDraft, setPendingDraft] = useState<OptionId | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    LayoutAnimation.configureNext({
      duration: 420,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, []);

  const activeTab = useMemo<TabId>(() => {
    if (scene.isTimed) return 'actions';
    if (vote.localConfirmed || vote.resolved || vote.isStoryEnded) return 'decisions';
    return userTab;
  }, [scene.isTimed, vote.localConfirmed, vote.resolved, vote.isStoryEnded, userTab]);

  const draftOptionId = useMemo<OptionId | null>(() => {
    if (vote.resolved) return null;
    if (vote.localConfirmed) return vote.localConfirmed;
    if (vote.localSelected) return vote.localSelected;
    if (pendingDraft && vote.visibleOptions.some((o) => o.id === pendingDraft)) {
      return pendingDraft;
    }
    return null;
  }, [vote.resolved, vote.localConfirmed, vote.localSelected, vote.visibleOptions, pendingDraft]);

  const handleSelectOption = useCallback(
    (optionId: OptionId) => {
      setPendingDraft(optionId);
      vote.onSelect(optionId);
    },
    [vote.onSelect],
  );

  const value = useMemo<DecisionContextValue>(
    () => ({
      scene,
      actions,
      vote,
      combat,
      timed,
      activeTab,
      draftOptionId,
      onResetStory,
      canResetStory,
      embedded,
      setActiveTab: setUserTab,
      handleSelectOption,
    }),
    [
      scene,
      actions,
      vote,
      combat,
      timed,
      activeTab,
      draftOptionId,
      onResetStory,
      canResetStory,
      embedded,
      handleSelectOption,
    ],
  );

  return <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>;
}
