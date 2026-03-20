/**
 * Enemy templates by biome and phase.
 * Add new enemies here — seed_enemies_for_screen picks from these.
 */

export type EnemyTemplate = {
  name: string;
  hpMultiplier: number;
  attackMultiplier: number;
};

export type BossTemplate = {
  name: string;
  hpMultiplier: number;
  attackMultiplier: number;
  intro: string;
};

type BiomeEnemies = {
  early: EnemyTemplate[];
  core: EnemyTemplate[];
  bosses: BossTemplate[];
  finalBoss: BossTemplate;
};

export const ENEMIES_BY_BIOME: Record<string, BiomeEnemies> = {
  cursed_forest: {
    early: [
      { name: 'Loup Noir', hpMultiplier: 1, attackMultiplier: 1 },
      { name: 'Rat Géant', hpMultiplier: 0.8, attackMultiplier: 0.7 },
      { name: 'Chauve-souris', hpMultiplier: 0.6, attackMultiplier: 0.5 },
    ],
    core: [
      { name: 'Araignée Géante', hpMultiplier: 1.2, attackMultiplier: 1 },
      { name: 'Goule', hpMultiplier: 1, attackMultiplier: 1.1 },
      { name: 'Goule Massive', hpMultiplier: 1.5, attackMultiplier: 1.3 },
      { name: 'Spectre', hpMultiplier: 0.8, attackMultiplier: 1.4 },
      { name: 'Troll', hpMultiplier: 2, attackMultiplier: 0.9 },
    ],
    bosses: [
      {
        name: 'Forest Guardian',
        hpMultiplier: 3,
        attackMultiplier: 1.5,
        intro: 'The twisted guardian blocks your path.',
      },
      {
        name: 'Spider Queen',
        hpMultiplier: 2.5,
        attackMultiplier: 1.8,
        intro: 'Silk threads descend from above. She is here.',
      },
    ],
    finalBoss: {
      name: 'Elder Treant',
      hpMultiplier: 4,
      attackMultiplier: 2,
      intro: 'The ancient tree awakens with a terrible roar.',
    },
  },
  sunken_sewers: {
    early: [
      { name: 'Rat Géant', hpMultiplier: 0.8, attackMultiplier: 0.7 },
      { name: 'Slime', hpMultiplier: 1, attackMultiplier: 0.5 },
    ],
    core: [
      { name: 'Bandit', hpMultiplier: 1, attackMultiplier: 1.1 },
      { name: 'Gobelin', hpMultiplier: 0.9, attackMultiplier: 1 },
      { name: 'Ogre', hpMultiplier: 1.8, attackMultiplier: 1.2 },
      { name: 'Ombre Errante', hpMultiplier: 0.7, attackMultiplier: 1.5 },
    ],
    bosses: [
      {
        name: 'Sewer King',
        hpMultiplier: 3,
        attackMultiplier: 1.5,
        intro: 'The lord of filth rises from the muck.',
      },
    ],
    finalBoss: {
      name: 'The Abomination',
      hpMultiplier: 4,
      attackMultiplier: 2,
      intro: 'Flesh and metal fused by dark magic.',
    },
  },
  ruined_fortress: {
    early: [
      { name: 'Squelette', hpMultiplier: 0.9, attackMultiplier: 0.8 },
      { name: 'Squelette Archer', hpMultiplier: 0.7, attackMultiplier: 1.2 },
    ],
    core: [
      { name: 'Squelette', hpMultiplier: 1, attackMultiplier: 1 },
      { name: 'Squelette Archer', hpMultiplier: 0.8, attackMultiplier: 1.3 },
      { name: 'Spectre', hpMultiplier: 0.8, attackMultiplier: 1.4 },
      { name: 'Goule Massive', hpMultiplier: 1.5, attackMultiplier: 1.1 },
    ],
    bosses: [
      {
        name: 'Death Knight',
        hpMultiplier: 3,
        attackMultiplier: 1.6,
        intro: 'A blade of black flame ignites.',
      },
    ],
    finalBoss: {
      name: 'Lich Commander',
      hpMultiplier: 4.5,
      attackMultiplier: 2.2,
      intro: 'The dead answer his call.',
    },
  },
};
