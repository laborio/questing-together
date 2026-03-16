import { ActionSubText, Stack, TexturedButton, Typography } from '@/components';
import { colors } from '@/constants/colors';
import type { ActionState } from '@/features/story/types/types';
import {
  formatHpLabel,
  getActionOpacity,
  getActionVariant,
} from '@/features/story/utils/decisionHelpers';

const EmbeddedActionButtons = ({ actions }: { actions: ActionState }) => {
  return (
    <Stack gap={10} align="center">
      {actions.items.map((action) => {
        const isSelected = action.id === actions.localSelectedId;
        const isDisabled = !actions.canAct || Boolean(action.isDisabled);
        const hpLabel = formatHpLabel(action.hpDelta);

        return (
          <TexturedButton
            key={action.id}
            variant={getActionVariant(isSelected)}
            disabled={isDisabled}
            onPress={() => actions.onTake(action.id)}
            style={{ maxWidth: 360, opacity: getActionOpacity(isDisabled, isSelected) }}
          >
            <Typography variant="body" style={{ color: colors.textPrimary, textAlign: 'center' }}>
              {action.text}
            </Typography>
            <ActionSubText hpLabel={hpLabel} effectText={action.effectText} />
          </TexturedButton>
        );
      })}
      {actions.allowSkip ? (
        <TexturedButton
          disabled={!actions.canAct}
          onPress={actions.onSkip}
          label="Hold back (no reaction)"
          style={{ maxWidth: 360 }}
        />
      ) : null}
    </Stack>
  );
};

export default EmbeddedActionButtons;
