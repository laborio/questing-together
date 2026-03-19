import { Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useDecision } from '@/contexts/DecisionContext';
import CombatStatusCard from '@/features/combat/components/CombatStatusCard';
import EndingContent from '@/features/story/components/decision/EndingContent';
import SceneActionsCard from '@/features/story/components/scene/SceneActionsCard';
import SceneOptionsCard from '@/features/story/components/scene/SceneOptionsCard';
import TimedStatusCard from '@/features/timed/TimedStatusCard';

const FullPanelContent = () => {
  const ctx = useDecision();

  if (ctx.scene.isEnding) {
    return (
      <EndingContent
        canResetStory={ctx.canResetStory}
        onResetStory={ctx.onResetStory}
        embedded={ctx.embedded}
      />
    );
  }

  if (ctx.scene.isTimed) {
    return (
      <>
        {!ctx.timed.endsAt ? (
          <Typography
            variant="caption"
            style={{
              textAlign: 'center',
              color: colors.combatHealthValueEmbedded,
              fontStyle: 'italic',
            }}
          >
            {ctx.scene.statusText}
          </Typography>
        ) : null}
        <SceneActionsCard
          phaseLabel={ctx.scene.phaseLabel}
          statusText={ctx.scene.statusText}
          actions={ctx.actions.items}
          localSelectedActionId={ctx.actions.localSelectedId}
          canAct={ctx.actions.canAct}
          allowSkip={ctx.actions.allowSkip}
          onTakeAction={ctx.actions.onTake}
          onSkip={ctx.actions.onSkip}
          embedded={ctx.embedded}
        />
        {ctx.timed.endsAt ? (
          <TimedStatusCard
            label={ctx.scene.phaseLabel}
            endAt={ctx.timed.endsAt}
            durationSeconds={ctx.timed.durationSeconds}
            statusText={ctx.timed.statusText ?? ctx.scene.statusText}
            timePrefix="Temps restant"
            showTime
            showFinishButton
            allowEarly={ctx.timed.allowEarly}
            onFinishEarly={ctx.timed.onFinish}
            embedded={ctx.embedded}
          />
        ) : null}
      </>
    );
  }

  if (ctx.activeTab === 'actions') {
    return (
      <SceneActionsCard
        phaseLabel={ctx.scene.phaseLabel}
        statusText={ctx.scene.statusText}
        actions={ctx.actions.items}
        localSelectedActionId={ctx.actions.localSelectedId}
        canAct={ctx.actions.canAct}
        allowSkip={ctx.actions.allowSkip}
        onTakeAction={ctx.actions.onTake}
        onSkip={ctx.actions.onSkip}
        embedded={ctx.embedded}
      />
    );
  }

  if (ctx.scene.isCombat) {
    if (!ctx.combat.state) {
      return (
        <Typography variant="caption" style={{ color: colors.textRole }}>
          Loading combat...
        </Typography>
      );
    }
    return (
      <CombatStatusCard
        combatState={ctx.combat.state}
        combatLog={ctx.combat.log}
        resolvedOption={ctx.vote.resolved}
        embedded={ctx.embedded}
      />
    );
  }

  return (
    <SceneOptionsCard
      vote={{ ...ctx.vote, onSelect: ctx.handleSelectOption }}
      onResetStory={ctx.onResetStory}
      canResetStory={ctx.canResetStory}
      embedded={ctx.embedded}
    />
  );
};

export default FullPanelContent;
