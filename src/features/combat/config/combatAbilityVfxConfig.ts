import type { RoleId } from '@/types/player';

type ProjectileAbilityVfxConfig = {
  kind: 'projectile';
  travelAssetId: string;
  impactAssetId: string;
};

type SequenceAbilityVfxConfig = {
  kind: 'sequence';
  sequenceId: string;
};

type ImpactAbilityVfxConfig = {
  kind: 'impact';
  impactAssetId: string;
};

export type CombatAbilityVfxConfig =
  | ProjectileAbilityVfxConfig
  | SequenceAbilityVfxConfig
  | ImpactAbilityVfxConfig;

export const combatAbilityVfxConfig: Partial<Record<RoleId, CombatAbilityVfxConfig>> = {
  sage: {
    kind: 'sequence',
    sequenceId: 'fireball-cast',
  },
  ranger: {
    kind: 'impact',
    impactAssetId: 'frostbolt-impact',
  },
};
