import type { RoleId } from '@/types/player';

type Trait = 'fire' | 'guard' | 'shadow' | 'storm' | 'nature' | 'neutral';

type TraitMeta = {
  id: Trait;
  name: string;
  icon: string;
  color: string;
};

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
  };
  scalePerUpgradeRank: number;
};

export type { Card, ConvergenceEffect, Trait, TraitMeta };
