/**
 * Enemy templates and encounter definitions.
 * Enemies have intent patterns, HP/strength scaling per fight.
 */

// ─── Enemy intent types ─────────────────────────────────────────
// Intent values in patterns map to actions:
// 0 = attack, 1 = defend (gain block), 2 = buff (gain strength),
// 3 = heavy attack, 4 = multi-attack, 5 = debuff player,
// 6 = charge up (next attack stronger), 7 = special

type EnemyTemplate = {
  id: string;
  name: string;
  baseHp: number;
  baseStrength: number;
  icon: string;
  scalingPerFight: number;
  strengthScaling: number;
  intentPattern: number[];
};

type EncounterEnemy = {
  templateId: string;
  hpMult?: number;
};

type Encounter = {
  description: string;
  isBoss?: boolean;
  enemies: EncounterEnemy[];
};

// ─── Enemy templates ────────────────────────────────────────────

const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: 'hollow-scout',
    name: 'Hollow Scout',
    baseHp: 66,
    baseStrength: 1,
    icon: '👻',
    scalingPerFight: 1.22,
    strengthScaling: 0.6,
    intentPattern: [0, 2, 0, 3, 0, 4],
  },
  {
    id: 'bone-guardian',
    name: 'Bone Guardian',
    baseHp: 90,
    baseStrength: 1,
    icon: '💀',
    scalingPerFight: 1.26,
    strengthScaling: 0.6,
    intentPattern: [2, 0, 3, 1, 2, 0],
  },
  {
    id: 'plague-rat',
    name: 'Plague Rat',
    baseHp: 45,
    baseStrength: 0,
    icon: '🐀',
    scalingPerFight: 1.15,
    strengthScaling: 0.3,
    intentPattern: [0, 4, 0, 6, 0, 4],
  },
  {
    id: 'shadow-fiend',
    name: 'Shadow Fiend',
    baseHp: 70,
    baseStrength: 1,
    icon: '👁️',
    scalingPerFight: 1.3,
    strengthScaling: 0.5,
    intentPattern: [4, 0, 7, 0, 1, 4],
  },
  {
    id: 'iron-golem',
    name: 'Iron Golem',
    baseHp: 120,
    baseStrength: 2,
    icon: '🗿',
    scalingPerFight: 1.2,
    strengthScaling: 1,
    intentPattern: [2, 3, 0, 2, 1, 5],
  },
  {
    id: 'dread-warden',
    name: 'Dread Warden',
    baseHp: 200,
    baseStrength: 2,
    icon: '⚔️',
    scalingPerFight: 1.15,
    strengthScaling: 1,
    intentPattern: [0, 2, 1, 3, 0, 4, 6, 0, 5, 7, 2, 1],
  },
  {
    id: 'chaos-wyrm',
    name: 'Chaos Wyrm',
    baseHp: 280,
    baseStrength: 3,
    icon: '🐉',
    scalingPerFight: 1,
    strengthScaling: 0,
    intentPattern: [5, 3, 6, 1, 0, 7, 3, 5, 1, 6],
  },
  {
    id: 'pine-wolf',
    name: 'Pine Wolf',
    baseHp: 70,
    baseStrength: 1,
    icon: '🐺',
    scalingPerFight: 1.16,
    strengthScaling: 0.6,
    intentPattern: [0, 6, 4, 0, 5, 3],
  },
  {
    id: 'road-blackguard',
    name: 'Road Blackguard',
    baseHp: 92,
    baseStrength: 2,
    icon: '🪖',
    scalingPerFight: 1.12,
    strengthScaling: 0.8,
    intentPattern: [0, 5, 2, 1, 0, 6],
  },
  {
    id: 'reed-stalker',
    name: 'Reed Stalker',
    baseHp: 104,
    baseStrength: 2,
    icon: '🪶',
    scalingPerFight: 1.12,
    strengthScaling: 0.7,
    intentPattern: [4, 0, 6, 1, 5, 0],
  },
  {
    id: 'totem-warden',
    name: 'Totem Warden',
    baseHp: 128,
    baseStrength: 2,
    icon: '🗿',
    scalingPerFight: 1.08,
    strengthScaling: 0.8,
    intentPattern: [2, 5, 1, 0, 6, 4],
  },
  {
    id: 'crossroad-reaver',
    name: 'Crossroad Reaver',
    baseHp: 122,
    baseStrength: 2,
    icon: '🪓',
    scalingPerFight: 1.14,
    strengthScaling: 0.9,
    intentPattern: [0, 6, 2, 1, 0, 4],
  },
  {
    id: 'bridge-keeper-drog',
    name: 'Bridge Keeper Drog',
    baseHp: 188,
    baseStrength: 3,
    icon: '⛓️',
    scalingPerFight: 1.1,
    strengthScaling: 1,
    intentPattern: [2, 0, 5, 1, 3, 0, 6],
  },
  {
    id: 'ogre-lord',
    name: 'Ogre Lord',
    baseHp: 305,
    baseStrength: 4,
    icon: '👹',
    scalingPerFight: 1.02,
    strengthScaling: 0.6,
    intentPattern: [3, 0, 5, 1, 6, 0, 7, 2],
  },
];

const ENEMY_TEMPLATE_BY_ID: Record<string, EnemyTemplate> = Object.fromEntries(
  ENEMY_TEMPLATES.map((t) => [t.id, t]),
);

// ─── Encounters ─────────────────────────────────────────────────

const ENCOUNTERS: Encounter[] = [
  {
    description: 'A lone scout blocks your path.',
    enemies: [{ templateId: 'hollow-scout' }],
  },
  {
    description: 'A skeletal guardian awakens.',
    enemies: [{ templateId: 'bone-guardian' }],
  },
  {
    description: 'A swarm of rats ambushes you!',
    enemies: [{ templateId: 'plague-rat' }, { templateId: 'plague-rat' }],
  },
  {
    description: 'Dark forces converge.',
    enemies: [{ templateId: 'shadow-fiend' }, { templateId: 'iron-golem', hpMult: 0.8 }],
  },
  {
    description: 'The final guardian emerges.',
    isBoss: true,
    enemies: [{ templateId: 'chaos-wyrm' }],
  },
];

const getEnemyTemplate = (id: string): EnemyTemplate | undefined => ENEMY_TEMPLATE_BY_ID[id];

export type { Encounter, EncounterEnemy, EnemyTemplate };
export { ENCOUNTERS, ENEMY_TEMPLATE_BY_ID, ENEMY_TEMPLATES, getEnemyTemplate };
