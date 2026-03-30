import type { ConvergenceEffect, TraitMeta } from '@/features/gameConfig/cardTypes';

const TRAITS: TraitMeta[] = [
  { id: 'fire', name: 'Fire', icon: '🔥', color: '#ff6b35' },
  { id: 'guard', name: 'Guard', icon: '🛡️', color: '#5b9bd5' },
  { id: 'shadow', name: 'Shadow', icon: '🌑', color: '#7e57c2' },
  { id: 'storm', name: 'Storm', icon: '⚡', color: '#ffc107' },
  { id: 'nature', name: 'Nature', icon: '🌿', color: '#66bb6a' },
  { id: 'neutral', name: 'Neutral', icon: '⚪', color: '#9e9e9e' },
];

const TRAIT_MAP: Record<string, TraitMeta> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

const CONVERGENCE_BY_TRAIT: Record<string, ConvergenceEffect> = {
  fire: { trait: 'fire', base: { damage: 16 }, scalePerUpgradeRank: 0.08 },
  guard: { trait: 'guard', base: { block: 14, persistBlock: true }, scalePerUpgradeRank: 0.08 },
  shadow: { trait: 'shadow', base: { vulnerable: 2, weakened: 2 }, scalePerUpgradeRank: 0.08 },
  storm: { trait: 'storm', base: { energy: 2 }, scalePerUpgradeRank: 0.08 },
  nature: { trait: 'nature', base: { heal: 12 }, scalePerUpgradeRank: 0.08 },
};

const CONVERGENCE_COUNT_MULTIPLIERS: Record<string, number> = {
  twoTraits: 1,
  threeTraits: 1.5,
  fourTraits: 2,
  fiveTraits: 2.5,
};

const getConvergenceMultiplier = (empoweredCount: number): number => {
  if (empoweredCount >= 5) return CONVERGENCE_COUNT_MULTIPLIERS.fiveTraits;
  if (empoweredCount >= 4) return CONVERGENCE_COUNT_MULTIPLIERS.fourTraits;
  if (empoweredCount >= 3) return CONVERGENCE_COUNT_MULTIPLIERS.threeTraits;
  return CONVERGENCE_COUNT_MULTIPLIERS.twoTraits;
};

export {
  CONVERGENCE_BY_TRAIT,
  CONVERGENCE_COUNT_MULTIPLIERS,
  getConvergenceMultiplier,
  TRAIT_MAP,
  TRAITS,
};
