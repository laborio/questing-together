import { ActionButton, Stack } from '@/components';
import { COMBAT } from '@/constants/combatSettings';
import { useGame } from '@/contexts/GameContext';

type CombatActionGridProps = {
  onAttack: () => void;
  onAbility: () => void;
  onHeal: () => void;
  onEndTurn: () => void;
  actionsRemaining: number;
  abilityCooldown: number;
  healCooldown: number;
  disabled?: boolean;
};

const CombatActionGrid = ({
  onAttack,
  onAbility,
  onHeal,
  onEndTurn,
  actionsRemaining,
  abilityCooldown,
  healCooldown,
  disabled = false,
}: CombatActionGridProps) => {
  const { localRole } = useGame();

  const ability = localRole ? COMBAT.abilities[localRole] : null;
  const noActions = actionsRemaining <= 0;

  return (
    <Stack gap={8}>
      <Stack direction="row" gap={8}>
        <ActionButton
          label="Attack"
          icon="⚔️"
          subtitle={`${COMBAT.attackDamage} Damage`}
          disabled={disabled || noActions}
          onPress={onAttack}
        />

        <ActionButton
          label={ability?.label ?? 'Ability'}
          icon={ability?.icon ?? '✨'}
          subtitle={ability?.subtitle ?? ''}
          disabled={disabled || noActions || abilityCooldown > 0}
          cooldownText={abilityCooldown > 0 ? `cd: ${abilityCooldown}t` : undefined}
          onPress={onAbility}
        />
      </Stack>

      <Stack direction="row" gap={8}>
        <ActionButton
          label="Heal"
          icon="💚"
          subtitle={`Heal ${COMBAT.healAmount} HP`}
          disabled={disabled || noActions || healCooldown > 0}
          cooldownText={healCooldown > 0 ? `cd: ${healCooldown}t` : undefined}
          onPress={onHeal}
        />

        <ActionButton
          label="End Turn"
          icon="⏭️"
          subtitle={`${actionsRemaining} actions left`}
          onPress={onEndTurn}
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
};

export default CombatActionGrid;
