/**
 * Enemy templates by biome and phase.
 * Add new enemies here — seed_enemies_for_screen picks from these.
 * `nameKey` maps to `enemies.<key>` in locale files.
 */

export type EnemyTemplate = {
  nameKey: string;
  hpMultiplier: number;
  attackMultiplier: number;
};

export type BossTemplate = {
  nameKey: string;
  hpMultiplier: number;
  attackMultiplier: number;
  introKey: string;
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
      { nameKey: 'loup_noir', hpMultiplier: 1, attackMultiplier: 1 },
      { nameKey: 'rat_geant', hpMultiplier: 0.8, attackMultiplier: 0.7 },
      { nameKey: 'chauve_souris', hpMultiplier: 0.6, attackMultiplier: 0.5 },
    ],
    core: [
      { nameKey: 'araignee_geante', hpMultiplier: 1.2, attackMultiplier: 1 },
      { nameKey: 'goule', hpMultiplier: 1, attackMultiplier: 1.1 },
      { nameKey: 'goule_massive', hpMultiplier: 1.5, attackMultiplier: 1.3 },
      { nameKey: 'spectre', hpMultiplier: 0.8, attackMultiplier: 1.4 },
      { nameKey: 'troll', hpMultiplier: 2, attackMultiplier: 0.9 },
    ],
    bosses: [
      {
        nameKey: 'forest_guardian',
        hpMultiplier: 3,
        attackMultiplier: 1.5,
        introKey: 'forest_guardian',
      },
      {
        nameKey: 'spider_queen',
        hpMultiplier: 2.5,
        attackMultiplier: 1.8,
        introKey: 'spider_queen',
      },
    ],
    finalBoss: {
      nameKey: 'elder_treant',
      hpMultiplier: 4,
      attackMultiplier: 2,
      introKey: 'elder_treant',
    },
  },
  sunken_sewers: {
    early: [
      { nameKey: 'rat_geant', hpMultiplier: 0.8, attackMultiplier: 0.7 },
      { nameKey: 'slime', hpMultiplier: 1, attackMultiplier: 0.5 },
    ],
    core: [
      { nameKey: 'bandit', hpMultiplier: 1, attackMultiplier: 1.1 },
      { nameKey: 'gobelin', hpMultiplier: 0.9, attackMultiplier: 1 },
      { nameKey: 'ogre', hpMultiplier: 1.8, attackMultiplier: 1.2 },
      { nameKey: 'ombre_errante', hpMultiplier: 0.7, attackMultiplier: 1.5 },
    ],
    bosses: [
      {
        nameKey: 'sewer_king',
        hpMultiplier: 3,
        attackMultiplier: 1.5,
        introKey: 'sewer_king',
      },
    ],
    finalBoss: {
      nameKey: 'the_abomination',
      hpMultiplier: 4,
      attackMultiplier: 2,
      introKey: 'the_abomination',
    },
  },
  ruined_fortress: {
    early: [
      { nameKey: 'squelette', hpMultiplier: 0.9, attackMultiplier: 0.8 },
      { nameKey: 'squelette_archer', hpMultiplier: 0.7, attackMultiplier: 1.2 },
    ],
    core: [
      { nameKey: 'squelette', hpMultiplier: 1, attackMultiplier: 1 },
      { nameKey: 'squelette_archer', hpMultiplier: 0.8, attackMultiplier: 1.3 },
      { nameKey: 'spectre', hpMultiplier: 0.8, attackMultiplier: 1.4 },
      { nameKey: 'goule_massive', hpMultiplier: 1.5, attackMultiplier: 1.1 },
    ],
    bosses: [
      {
        nameKey: 'death_knight',
        hpMultiplier: 3,
        attackMultiplier: 1.6,
        introKey: 'death_knight',
      },
    ],
    finalBoss: {
      nameKey: 'lich_commander',
      hpMultiplier: 4.5,
      attackMultiplier: 2.2,
      introKey: 'lich_commander',
    },
  },
};
