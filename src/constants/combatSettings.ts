export const COMBAT = {
  // Player
  baseHp: 250,
  baseEnergy: 3,

  // Deck
  openingHandSize: 4,
  combatPoolTargetSize: 20,

  // Empowerment
  empowerThreshold: 3,
  convergenceRequiredTraits: 2,

  // Card upgrades
  upgradeEnergyThreshold: 10,

  // Defense traits guaranteed in opening hand
  guaranteedDefenseTraits: ['guard', 'nature'] as readonly string[],

  // Rewards
  rewardSpecializationBase: 1,
  rewardSpecializationGrowth: 0.45,
  rewardDominantTraitBonus: 1.15,
  rewardCardChoiceCount: 3,
  rewardUpgradeChoiceCount: 3,
} as const;
