export const ADVENTURE = {
  blocs: {
    first: {
      early: { min: 1, max: 1 },
      core: { min: 2, max: 3 },
      resolve: 2,
    },
    middle: {
      core: { min: 2, max: 3 },
      resolve: 2,
    },
    final: {
      core: { min: 2, max: 3 },
      resolve: 1,
    },
  },

  scaling: {
    baseLevelPerBloc: 3,
    enemiesPerCombat: { min: 2, max: 4 },
    bossLevelBonus: 4,
    bossHpMultiplier: 3,
    bossAttackMultiplier: 1.5,
  },

  screenWeights: {
    core: {
      combat: 3,
      narrative_choice: 2,
      puzzle: 1,
    },
  },

  rest: {
    hpRestorePercent: 50,
  },

  totalBlocs: 3,
} as const;
