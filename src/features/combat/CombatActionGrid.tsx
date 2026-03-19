import { useState } from 'react';
import { ActionButton, Stack } from '@/components';
import { COMBAT } from '@/constants/combatSettings';
import { useGame } from '@/contexts/GameContext';

type CombatActionGridProps = {
  onAttack: () => void;
  onAbility: () => void;
  onHeal: () => void;
  disabled?: boolean;
};

const CombatActionGrid = ({
  onAttack,
  onAbility,
  onHeal,
  disabled = false,
}: CombatActionGridProps) => {
  const { localRole, roomConnection } = useGame();
  const [abilityCooldown, setAbilityCooldown] = useState(0);
  const [healCooldown, setHealCooldown] = useState(0);

  const ability = localRole ? COMBAT.abilities[localRole] : null;

  const handleAttack = () => {
    onAttack();
    setAbilityCooldown((c) => Math.max(0, c - 1));
    setHealCooldown((c) => Math.max(0, c - 1));
  };

  const handleAbility = () => {
    if (abilityCooldown > 0) return;
    onAbility();
    setAbilityCooldown(COMBAT.abilityCooldown);
    setHealCooldown((c) => Math.max(0, c - 1));
  };

  const handleHeal = () => {
    if (healCooldown > 0) return;
    onHeal();
    setHealCooldown(COMBAT.healCooldown);
    setAbilityCooldown((c) => Math.max(0, c - 1));
  };

  const handleLeave = () => {
    void roomConnection.cancelAdventure();
  };

  return (
    <Stack gap={8}>
      <Stack direction="row" gap={8}>
        <ActionButton
          label="Attack"
          icon="⚔️"
          subtitle={`${COMBAT.attackDamage} Damage`}
          disabled={disabled}
          onPress={handleAttack}
        />

        <ActionButton
          label={ability?.label ?? 'Ability'}
          icon={ability?.icon ?? '✨'}
          subtitle={ability?.subtitle ?? ''}
          disabled={disabled || abilityCooldown > 0}
          cooldownText={
            abilityCooldown > 0
              ? `cd: ${COMBAT.abilityCooldown - abilityCooldown}/${COMBAT.abilityCooldown}`
              : undefined
          }
          onPress={handleAbility}
        />
      </Stack>

      <Stack direction="row" gap={8}>
        <ActionButton
          label="Heal"
          icon="💚"
          subtitle={`Heal ${COMBAT.healAmount} HP`}
          disabled={disabled || healCooldown > 0}
          cooldownText={
            healCooldown > 0
              ? `cd: ${COMBAT.healCooldown - healCooldown}/${COMBAT.healCooldown}`
              : undefined
          }
          onPress={handleHeal}
        />

        <ActionButton
          label="Run away"
          icon="🏃"
          subtitle="Leave Room"
          variant="danger"
          disabled={roomConnection.isBusy}
          onPress={handleLeave}
        />
      </Stack>
    </Stack>
  );
};

export default CombatActionGrid;
