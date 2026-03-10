type RoleId = 'warrior' | 'sage' | 'ranger';
type OptionId = 'A' | 'B' | 'C';

type TagCondition = {
  all?: string[];
  any?: string[];
  none?: string[];
};

type CombatAction = {
  id: string;
  role: RoleId | 'any';
  text: string;
  effect: {
    damage?: number;
    block?: number;
    enemyAttackDelta?: number;
    run?: boolean;
  };
  ifGlobal?: TagCondition;
  modifiers?: {
    ifGlobal?: TagCondition;
    damageDelta?: number;
    blockDelta?: number;
    enemyAttackDelta?: number;
    run?: boolean;
  }[];
};

type SceneAction = {
  id: string;
  role: RoleId | 'any';
  text: string;
  buttonText?: string;
  durationSeconds?: number;
  ifGlobal?: TagCondition;
};

type Scene = {
  id: string;
  title: string;
  journalTitle?: string;
  canonicalTruth: string;
  intro: string;
  roleClues?: Partial<Record<RoleId, string>>;
  mode?: 'story' | 'combat' | 'timed';
  combat?: {
    enemyName: string;
    enemyHp: number;
    enemyAttack: number;
    enemyAttackIntervalSeconds?: number;
    allowRun?: boolean;
  };
  timed?: {
    kind: 'rest' | 'travel' | 'wait';
    durationSeconds: number;
    allowEarly?: boolean;
    timeoutDamagePerMissing?: number;
    statusText?: string;
    restWaitingText?: string;
  };
  evidence: { id: string; label: string; description: string }[];
  steps: {
    id: string;
    actions: SceneAction[];
    outcomes: Record<
      string,
      {
        narration: string;
        evidenceIds?: string[];
        unlockOptionIds?: OptionId[];
        tagsAdded?: { global?: string[]; scene?: string[] };
        hpDelta?: number;
      }
    >;
  }[];
  options: {
    id: OptionId;
    text: string;
    defaultVisible?: boolean;
    isRisky?: boolean;
    tagsAdded?: { global?: string[]; scene?: string[] };
    next: { ifGlobal?: TagCondition; to: string | null }[];
  }[];
  unlockRules: { optionId: OptionId; evidenceIds: string[] }[];
  outcomeByOption: Record<OptionId, { text: string; hpDelta?: number }>;
  isEnding?: boolean;
};

type StoryData = {
  version: number;
  startSceneId: string;
  combat: {
    partyHp: number;
    actions: CombatAction[];
  };
  meta: Record<string, unknown>;
  scenes: Scene[];
};

type Theme = {
  id: string;
  label: string;
  location: string;
  relic: string;
  enemy: string;
  material: string;
  sigil: string;
};

type ExploreCard = {
  id: string;
  title: string;
  obstacle: string;
  intro: string;
  rangerUtility?: boolean;
};

type PuzzleCard = {
  id: string;
  title: string;
  focus: string;
};

type TreasureCard = {
  id: string;
  title: string;
  cache: string;
};

const THEMES: Theme[] = [
  {
    id: 'sunken_temple',
    label: 'Sunken Temple',
    location: 'the drowned halls',
    relic: 'the tide heart',
    enemy: 'Drowned Guardian',
    material: 'salted basalt',
    sigil: 'wave sigils',
  },
  {
    id: 'obsidian_keep',
    label: 'Obsidian Keep',
    location: 'the black-glass courtyards',
    relic: 'the oath ember',
    enemy: 'Ash Warden',
    material: 'volcanic glass',
    sigil: 'oath marks',
  },
  {
    id: 'ashen_crypt',
    label: 'Ashen Crypt',
    location: 'the bone vaults',
    relic: 'the death anchor',
    enemy: 'Ossuary Sentinel',
    material: 'powdered obsidian',
    sigil: 'skull runes',
  },
];

const EXPLORE_CARDS: ExploreCard[] = [
  {
    id: 'sealed_gate',
    title: 'Sealed Gate',
    obstacle: 'a reinforced gate covered in {sigil}',
    intro: 'The corridor narrows into {obstacle}.',
    rangerUtility: true,
  },
  {
    id: 'collapsed_hall',
    title: 'Collapsed Hall',
    obstacle: 'a fresh collapse choking the main route',
    intro: 'Dust hangs over {obstacle}.',
  },
  {
    id: 'flooded_room',
    title: 'Flooded Room',
    obstacle: 'a submerged crossing with unstable footing',
    intro: 'Knee-high water slows the group near {obstacle}.',
    rangerUtility: true,
  },
  {
    id: 'whisper_wall',
    title: 'Whisper Wall',
    obstacle: 'a wall that answers spoken words',
    intro: 'Torchlight shakes while the party faces {obstacle}.',
  },
];

const PUZZLE_CARDS: PuzzleCard[] = [
  { id: 'ancient_altar', title: 'Ancient Altar', focus: 'an altar that reacts to relic signatures' },
  { id: 'echo_engine', title: 'Echo Engine', focus: 'a cracked resonance engine still humming' },
  { id: 'ward_lattice', title: 'Ward Lattice', focus: 'a lattice of defensive runes guarding a passage' },
];

const TREASURE_CARDS: TreasureCard[] = [
  { id: 'armory_cache', title: 'Armory Cache', cache: 'combat modules and field repairs' },
  { id: 'ritual_cache', title: 'Ritual Cache', cache: 'seal tools and relay keys' },
  { id: 'supply_cache', title: 'Supply Cache', cache: 'stimulants and reserve kits' },
];

type Rng = () => number;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string): Rng {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(rng: Rng, items: T[]): T {
  const index = Math.floor(rng() * items.length);
  return items[Math.max(0, Math.min(items.length - 1, index))]!;
}

function pickUnique<T>(rng: Rng, items: T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const total = Math.max(0, Math.min(count, pool.length));
  for (let index = 0; index < total; index += 1) {
    const itemIndex = Math.floor(rng() * pool.length);
    result.push(pool.splice(itemIndex, 1)[0]!);
  }
  return result;
}

function replaceTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => tokens[key] ?? `{${key}}`);
}

function timed(kind: 'rest' | 'travel' | 'wait', minutes: number, statusText: string) {
  return {
    kind,
    durationSeconds: Math.floor(minutes * 60),
    allowEarly: true,
    timeoutDamagePerMissing: 1,
    statusText,
    restWaitingText: 'The party waits for the timer to resolve this node.',
  } as const;
}

function roleClues(theme: Theme, subject: string): Partial<Record<RoleId, string>> {
  return {
    warrior: `You spot stress marks around ${subject}; force can open a path.`,
    sage: `You read unstable patterns in ${theme.sigil} near ${subject}.`,
    ranger: `You map a narrow side route around ${subject}.`,
  };
}

function makeTimedActions(prefix: string): SceneAction[] {
  return [
    {
      id: `${prefix}_attack`,
      role: 'warrior',
      text: 'Break through with force.',
      buttonText: 'Break (20m)',
      durationSeconds: 20 * 60,
    },
    {
      id: `${prefix}_study`,
      role: 'sage',
      text: 'Study the structure and extract a safe route.',
      buttonText: 'Study (30m)',
      durationSeconds: 30 * 60,
    },
    {
      id: `${prefix}_scout`,
      role: 'ranger',
      text: 'Scout for a hidden bypass and mark safe footing.',
      buttonText: 'Scout (15m)',
      durationSeconds: 15 * 60,
    },
  ];
}

function buildStartScene(theme: Theme): Scene {
  const evidenceId = 'scene_0_entry';
  return {
    id: 'scene_0',
    title: `Entry - ${theme.label}`,
    journalTitle: `Entry - ${theme.label}`,
    canonicalTruth: `The party enters ${theme.location} to recover ${theme.relic}.`,
    intro: `The expedition begins in ${theme.location}. Your objective is ${theme.relic}.`,
    roleClues: roleClues(theme, 'the entry seal'),
    mode: 'timed',
    timed: timed('travel', 40, 'Entry pressure is building.'),
    evidence: [{ id: evidenceId, label: 'ENTRY_TRACE', description: 'Initial readings from the expedition start.' }],
    steps: [
      {
        id: 'scene_0_step_1',
        actions: makeTimedActions('scene_0'),
        outcomes: {
          scene_0_attack: {
            narration: 'The breach line holds and the party gains momentum.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['entry_force'] },
          },
          scene_0_study: {
            narration: 'A stable pattern is mapped and shared with the team.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['entry_read'] },
          },
          scene_0_scout: {
            narration: 'A discreet lane is flagged for future repositioning.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['entry_path'] },
          },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Proceed in formation.', defaultVisible: true, next: [{ to: 'scene_1' }] },
      { id: 'B', text: 'Push the pace.', next: [{ to: 'scene_1' }], tagsAdded: { global: ['tempo_fast'] } },
      { id: 'C', text: 'Take a risky side route.', isRisky: true, next: [{ to: 'scene_1' }], tagsAdded: { global: ['risk_taken'] } },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'The party advances steadily.' },
      B: { text: 'The group gains time but exposes itself.', hpDelta: -1 },
      C: { text: 'The shortcut works, but costs stamina.', hpDelta: -1 },
    },
  };
}

function buildExploreScene(sceneId: string, nextSceneId: string, card: ExploreCard, theme: Theme): Scene {
  const evidenceId = `${sceneId}_evidence`;
  const obstacle = replaceTokens(card.obstacle, { sigil: theme.sigil });
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `The party must handle ${obstacle}.`,
    intro: `${replaceTokens(card.intro, { obstacle })} The walls are ${theme.material}.`,
    roleClues: roleClues(theme, obstacle),
    mode: 'timed',
    timed: timed('travel', 45, 'Expedition timer is active for this room.'),
    evidence: [{ id: evidenceId, label: 'FIELD_MARK', description: `Actionable data recovered near ${obstacle}.` }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: makeTimedActions(sceneId),
        outcomes: {
          [`${sceneId}_attack`]: {
            narration: 'A direct opening appears through the obstruction.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
          },
          [`${sceneId}_study`]: {
            narration: 'The mechanism is decoded and risk is reduced.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['lore_fragment'] },
          },
          [`${sceneId}_scout`]: {
            narration: card.rangerUtility
              ? 'A utility key is recovered from the side route.'
              : 'A fallback route is marked for rapid retreat.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: card.rangerUtility ? { global: ['utility_key'] } : { global: ['fallback_route'] },
          },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Advance carefully.', defaultVisible: true, next: [{ to: nextSceneId }] },
      { id: 'B', text: 'Exploit the opening.', next: [{ to: nextSceneId }], tagsAdded: { global: ['tempo_fast'] } },
      { id: 'C', text: 'Force the unstable path.', isRisky: true, next: [{ to: nextSceneId }], tagsAdded: { global: ['risk_taken'] } },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'The party maintains control.' },
      B: { text: 'The team gains ground quickly, taking light strain.', hpDelta: -1 },
      C: { text: 'The risk pays off, but morale takes a hit.', hpDelta: -1 },
    },
  };
}

function buildPuzzleScene(sceneId: string, nextSceneId: string, card: PuzzleCard, theme: Theme): Scene {
  const evidenceId = `${sceneId}_evidence`;
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `The node revolves around ${card.focus}.`,
    intro: `At the center of ${theme.location}, the party discovers ${card.focus}.`,
    roleClues: roleClues(theme, card.focus),
    mode: 'timed',
    timed: timed('wait', 60, 'Puzzle pressure rises as runes adapt.'),
    evidence: [{ id: evidenceId, label: 'RUNE_KEY', description: 'Critical puzzle alignment data.' }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          {
            id: `${sceneId}_attack`,
            role: 'warrior',
            text: 'Break the lock ring at a weak point.',
            buttonText: 'Break Ring (20m)',
            durationSeconds: 20 * 60,
          },
          {
            id: `${sceneId}_study`,
            role: 'sage',
            text: 'Decode rune order and stabilize the relay.',
            buttonText: 'Decode Runes (30m)',
            durationSeconds: 30 * 60,
          },
          {
            id: `${sceneId}_scout`,
            role: 'ranger',
            text: 'Find a bypass trigger hidden in side channels.',
            buttonText: 'Find Trigger (15m)',
            durationSeconds: 15 * 60,
          },
        ],
        outcomes: {
          [`${sceneId}_attack`]: {
            narration: 'The lock ring cracks and reveals a forced route.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
          },
          [`${sceneId}_study`]: {
            narration: 'Rune cadence is solved and opens a controlled route.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B', 'C'],
            tagsAdded: { global: ['puzzle_mastered'] },
          },
          [`${sceneId}_scout`]: {
            narration: 'A hidden trigger grants a tactical bypass.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['utility_key'] },
          },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Take the stable route.', defaultVisible: true, next: [{ to: nextSceneId }] },
      { id: 'B', text: 'Take the high-throughput route.', next: [{ to: nextSceneId }], tagsAdded: { global: ['boss_exposed'] } },
      { id: 'C', text: 'Take the hidden bypass.', isRisky: true, next: [{ to: nextSceneId }], tagsAdded: { global: ['shortcut_ready'] } },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'The party keeps a safe pace.' },
      B: { text: 'The team primes an advantage for the boss.', hpDelta: 1 },
      C: { text: 'The bypass saves time but adds uncertainty.', hpDelta: -1 },
    },
  };
}

function buildTreasureScene(sceneId: string, nextSceneId: string, card: TreasureCard, theme: Theme): Scene {
  const evidenceId = `${sceneId}_evidence`;
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `The party secures ${card.cache} before the boss.`,
    intro: `A side chamber contains ${card.cache}. This is the last prep node before ${theme.enemy}.`,
    roleClues: roleClues(theme, card.cache),
    mode: 'timed',
    timed: timed('rest', 35, 'Upgrade selection window is active.'),
    evidence: [{ id: evidenceId, label: 'CACHE_INDEX', description: 'Pre-boss resource index.' }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          {
            id: `${sceneId}_attack`,
            role: 'warrior',
            text: 'Prioritize offensive modules.',
            buttonText: 'Offense Pack (20m)',
            durationSeconds: 20 * 60,
          },
          {
            id: `${sceneId}_study`,
            role: 'sage',
            text: 'Prioritize defensive wards.',
            buttonText: 'Defense Pack (30m)',
            durationSeconds: 30 * 60,
          },
          {
            id: `${sceneId}_scout`,
            role: 'ranger',
            text: 'Prioritize mobility kits and tactical tools.',
            buttonText: 'Utility Pack (15m)',
            durationSeconds: 15 * 60,
          },
        ],
        outcomes: {
          [`${sceneId}_attack`]: {
            narration: 'The party is set up for stronger burst damage.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['upgrade_offense'] },
          },
          [`${sceneId}_study`]: {
            narration: 'Defensive reserves are fortified.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['upgrade_defense'] },
          },
          [`${sceneId}_scout`]: {
            narration: 'Utility routing improves flexibility under pressure.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B', 'C'],
            tagsAdded: { global: ['upgrade_utility'] },
          },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Lock in balanced loadout.', defaultVisible: true, next: [{ to: nextSceneId }] },
      { id: 'B', text: 'Lock in aggressive loadout.', next: [{ to: nextSceneId }], tagsAdded: { global: ['augment_party_fury'] } },
      { id: 'C', text: 'Lock in defensive loadout.', next: [{ to: nextSceneId }], tagsAdded: { global: ['augment_reserve_vigor'] } },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'The team keeps a balanced profile.' },
      B: { text: 'Offense spikes for the final fight.', hpDelta: 1 },
      C: { text: 'Durability increases before the boss.', hpDelta: 2 },
    },
  };
}

function buildBossScene(theme: Theme): Scene {
  return {
    id: 'scene_5',
    title: `Boss - ${theme.enemy}`,
    journalTitle: `Final Encounter - ${theme.enemy}`,
    canonicalTruth: `${theme.enemy} protects ${theme.relic}.`,
    intro: `${theme.enemy} rises from ${theme.material}. Enemy attacks land every 45 minutes unless blocked.`,
    roleClues: {
      warrior: 'Armor seams are visible near the shoulder plate.',
      sage: 'The ritual core desyncs for short windows.',
      ranger: 'A blind-side lane opens between attack cycles.',
    },
    mode: 'combat',
    combat: {
      enemyName: theme.enemy,
      enemyHp: 20,
      enemyAttack: 2,
      enemyAttackIntervalSeconds: 45 * 60,
      allowRun: true,
    },
    evidence: [],
    steps: [],
    options: [
      { id: 'A', text: 'Victory', defaultVisible: true, next: [{ to: 'scene_end_victory' }] },
      { id: 'B', text: 'Defeat', next: [{ to: 'scene_end_defeat' }] },
      { id: 'C', text: 'Retreat', next: [{ to: 'scene_end_retreat' }] },
    ],
    unlockRules: [],
    outcomeByOption: {
      A: { text: `The boss falls and ${theme.relic} is secured.` },
      B: { text: `The party is overwhelmed before reaching ${theme.relic}.` },
      C: { text: 'The team escapes with partial gains.' },
    },
  };
}

function buildEndingScene(id: string, title: string, intro: string, canonicalTruth: string): Scene {
  return {
    id,
    title,
    canonicalTruth,
    intro,
    isEnding: true,
    evidence: [],
    steps: [
      {
        id: `${id}_step_1`,
        actions: [
          { id: `${id}_warrior`, role: 'warrior', text: 'The warrior secures the final line.' },
          { id: `${id}_sage`, role: 'sage', text: 'The sage records the expedition outcome.' },
          { id: `${id}_ranger`, role: 'ranger', text: 'The ranger marks safe extraction routes.' },
        ],
        outcomes: {
          [`${id}_warrior`]: { narration: 'The front holds to the end.' },
          [`${id}_sage`]: { narration: 'The account is archived for future runs.' },
          [`${id}_ranger`]: { narration: 'Extraction remains controlled.' },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Conclude run.', defaultVisible: true, next: [{ to: null }] },
      { id: 'B', text: 'Conclude run.', next: [{ to: null }] },
      { id: 'C', text: 'Conclude run.', next: [{ to: null }] },
    ],
    unlockRules: [],
    outcomeByOption: {
      A: { text: 'Run complete.' },
      B: { text: 'Run complete.' },
      C: { text: 'Run complete.' },
    },
  };
}

function buildCombatActions(): CombatAction[] {
  const offenseMod = { ifGlobal: { all: ['augment_party_fury'] }, damageDelta: 1 };
  const defenseMod = { ifGlobal: { all: ['augment_reserve_vigor'] }, blockDelta: 1 };
  const exposeMod = { ifGlobal: { all: ['boss_exposed'] }, damageDelta: 1 };

  return [
    { id: 'warrior_strike', role: 'warrior', text: 'Attack', effect: { damage: 3 }, modifiers: [offenseMod, exposeMod] },
    { id: 'warrior_guard', role: 'warrior', text: 'Defend', effect: { block: 2 }, modifiers: [defenseMod] },
    { id: 'warrior_withdraw', role: 'warrior', text: 'Hold retreat lane', effect: { run: true, block: 1 }, modifiers: [defenseMod] },

    { id: 'sage_bolt', role: 'sage', text: 'Cast bolt', effect: { damage: 3, enemyAttackDelta: -1 }, modifiers: [offenseMod, exposeMod] },
    { id: 'sage_ward', role: 'sage', text: 'Raise ward', effect: { block: 2 }, modifiers: [defenseMod] },
    { id: 'sage_withdraw', role: 'sage', text: 'Coordinated retreat', effect: { run: true, enemyAttackDelta: -1 }, modifiers: [defenseMod] },

    { id: 'ranger_shot', role: 'ranger', text: 'Take shot', effect: { damage: 3 }, modifiers: [offenseMod, exposeMod] },
    { id: 'ranger_cover', role: 'ranger', text: 'Mobile cover', effect: { block: 2 }, modifiers: [defenseMod] },
    { id: 'ranger_withdraw', role: 'ranger', text: 'Open fallback', effect: { run: true }, modifiers: [defenseMod] },

    {
      id: 'team_utility',
      role: 'any',
      text: 'Activate utility rig',
      ifGlobal: { all: ['upgrade_utility'] },
      effect: { damage: 2, block: 1 },
      modifiers: [offenseMod, defenseMod],
    },
  ];
}

export function generateProceduralStoryData(seedInput: string): StoryData {
  const seed = seedInput.trim() || 'questing-together-default';
  const rng = createRng(seed);

  const theme = pickOne(rng, THEMES);
  const exploreCards = pickUnique(rng, EXPLORE_CARDS, 2);
  const puzzleCard = pickOne(rng, PUZZLE_CARDS);
  const treasureCard = pickOne(rng, TREASURE_CARDS);

  const scenes: Scene[] = [
    buildStartScene(theme),
    buildExploreScene('scene_1', 'scene_2', exploreCards[0]!, theme),
    buildExploreScene('scene_2', 'scene_3', exploreCards[1]!, theme),
    buildPuzzleScene('scene_3', 'scene_4', puzzleCard, theme),
    buildTreasureScene('scene_4', 'scene_5', treasureCard, theme),
    buildBossScene(theme),
    buildEndingScene('scene_end_victory', 'Victory', `The party returns with ${theme.relic}.`, 'Run victory.'),
    buildEndingScene('scene_end_retreat', 'Retreat', 'The team survives and extracts with partial gains.', 'Run retreat.'),
    buildEndingScene('scene_end_defeat', 'Defeat', `The party falls before securing ${theme.relic}.`, 'Run defeat.'),
  ];

  return {
    version: 2001,
    startSceneId: 'scene_0',
    combat: {
      partyHp: 24,
      actions: buildCombatActions(),
    },
    meta: {
      generator: 'procedural-v2-short',
      seed,
      runLength: 'short',
      language: 'en',
      themeId: theme.id,
      themeLabel: theme.label,
      structure: ['start', 'explore', 'explore', 'puzzle', 'treasure', 'boss'],
    },
    scenes,
  };
}
