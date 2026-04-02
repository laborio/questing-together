import type { RoleId } from '@/types/player';

type Trait =
  // Warrior schools
  | 'rage'
  | 'iron'
  | 'blood'
  | 'thunder'
  // Sage schools
  | 'fire'
  | 'frost'
  | 'storm'
  | 'arcane'
  // Ranger schools
  | 'shadow'
  | 'nature'
  | 'precision'
  | 'venom'
  // Neutral
  | 'neutral';

type TraitMeta = {
  id: Trait;
  name: string;
  icon: string;
  color: string;
};

type CardVfxTarget = 'self' | 'self_to_target' | 'target';

type Card = {
  id: string;
  name: string;
  cost: number;
  trait: Trait;
  description: string;
  upgraded: false;
  upgradeThreshold: number;
  upgradeName: string;
  upgradeDescription: string;
  baseDamage?: number;
  baseBlock?: number;
  baseHeal?: number;
  baseBurn?: number;
  upgradedDamage?: number;
  upgradedBlock?: number;
  upgradedHeal?: number;
  upgradedBurn?: number;
  isAoe?: boolean;
  isRare?: boolean;
  isSignature?: boolean;
  starterRole?: RoleId;
  vfxSequenceId?: string;
  vfxEffectId?: string;
  vfxTarget?: CardVfxTarget;
};

type ConvergenceEffect = {
  trait: Trait;
  base: {
    damage?: number;
    block?: number;
    persistBlock?: boolean;
    heal?: number;
    energy?: number;
    vulnerable?: number;
    weakened?: number;
    burn?: number;
  };
  scalePerUpgradeRank: number;
};

export type { Card, CardVfxTarget, ConvergenceEffect, Trait, TraitMeta };
