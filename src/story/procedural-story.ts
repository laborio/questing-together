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
    allowRun?: boolean;
  };
  evidence: { id: string; label: string; description: string }[];
  steps: {
    id: string;
    actions: { id: string; role: RoleId | 'any'; text: string; buttonText?: string; ifGlobal?: TagCondition }[];
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
  zone: string;
  relic: string;
  symbol: string;
  material: string;
  guardian: string;
  atmosphere: string;
  ambientSound: string;
};

type ExploreCard = {
  id: string;
  title: string;
  obstacle: string;
  context: string;
  rangerFindsUtility?: boolean;
};

type EventCard = {
  id: string;
  title: string;
  focus: string;
};

type DangerCard = {
  id: string;
  title: string;
  hazard: string;
  pressure: string;
};

type RewardCard = {
  id: string;
  title: string;
  cache: string;
};

const THEMES: Theme[] = [
  {
    id: 'necromancer_ruins',
    label: 'Ruines Necromantiques',
    zone: 'les cryptes de cendre',
    relic: 'l\'ancre des morts',
    symbol: 'des crane-runes',
    material: 'de l\'obsidienne poudreuse',
    guardian: 'Sentinelle Ossuaire',
    atmosphere: 'une froideur d\'encre colle a chaque souffle',
    ambientSound: 'des os qui frottent sous la pierre',
  },
  {
    id: 'sunken_temple',
    label: 'Temple Englouti',
    zone: 'les salles submergees',
    relic: 'le coeur de maree',
    symbol: 'des soleils noyes',
    material: 'du basalte humide',
    guardian: 'Gardien des Marées',
    atmosphere: 'l\'air sale de saumure et d\'algues noires',
    ambientSound: 'des vagues enfermées sous la roche',
  },
  {
    id: 'obsidian_keep',
    label: 'Forteresse d\'Obsidienne',
    zone: 'les cours de verre noir',
    relic: 'la braise juratoire',
    symbol: 'des sigils de serment',
    material: 'du verre volcanique',
    guardian: 'Marcheur de Cendre',
    atmosphere: 'la chaleur mord meme sans flammes visibles',
    ambientSound: 'des chaines tendues qui vibrent',
  },
];

const EXPLORE_CARDS: ExploreCard[] = [
  {
    id: 'locked_path',
    title: 'Passage Verrouille',
    obstacle: 'une porte de {material} couverte de {symbol}',
    context: 'Le couloir se resserre et debouche sur {obstacle}.',
    rangerFindsUtility: true,
  },
  {
    id: 'collapsed_gallery',
    title: 'Galerie Effondree',
    obstacle: 'un eboulis instable qui noie l\'ancien axe',
    context: 'Une galerie laterale finit contre {obstacle}.',
  },
  {
    id: 'flooded_chamber',
    title: 'Chambre Inondee',
    obstacle: 'un bassin brise qui cache la sortie',
    context: 'L\'eau monte jusqu\'aux genoux; devant, {obstacle}.',
    rangerFindsUtility: true,
  },
  {
    id: 'whisper_wall',
    title: 'Mur Murmurant',
    obstacle: 'un mur grave qui repond aux voix',
    context: 'Les torches vibrent. Vous tombez face a {obstacle}.',
  },
  {
    id: 'sealed_niche',
    title: 'Niche Scellee',
    obstacle: 'une niche rituelle soudee par des liens anciens',
    context: 'Dans l\'ombre d\'une arche, {obstacle}.',
  },
  {
    id: 'watch_post',
    title: 'Poste de Guet',
    obstacle: 'une meurtriere activee par un mecanisme sourd',
    context: 'Un ancien poste tient encore. Au centre, {obstacle}.',
  },
];

const EVENT_CARDS: EventCard[] = [
  { id: 'relay_altar', title: 'Autel-Relais', focus: 'un autel relie au coeur du complexe' },
  { id: 'resonance_hub', title: 'Noyau de Resonance', focus: 'un noyau qui amplifie vos traces' },
  { id: 'broken_orrery', title: 'Orrery Brisee', focus: 'un cadran rituel fendu mais encore actif' },
];

const DANGER_CARDS: DangerCard[] = [
  {
    id: 'ritual_guard',
    title: 'Garde Rituel',
    hazard: 'des automates de garde sortent des murs',
    pressure: 'Le moindre faux pas declenche une riposte coordonnee.',
  },
  {
    id: 'void_cleft',
    title: 'Faille Noire',
    hazard: 'une faille mange les appuis au centre de la salle',
    pressure: 'Le passage se referme par vagues brutales.',
  },
  {
    id: 'howling_corridor',
    title: 'Corridor Hurlant',
    hazard: 'une conduite sonore brouille les ordres et attire des ombres',
    pressure: 'Les cris amplifies poussent le groupe a la faute.',
  },
  {
    id: 'burning_valve',
    title: 'Vanne Incendiee',
    hazard: 'une vanne instable vomit chaleur et etincelles',
    pressure: 'Le terrain force des decisions rapides et couteuses.',
  },
];

const REWARD_CARDS: RewardCard[] = [
  { id: 'armory_cache', title: 'Reserve d\'Arsenal', cache: 'des modules de combat encore intacts' },
  { id: 'ritual_cache', title: 'Reserve Rituelle', cache: 'des outils de sceau et des clefs fractales' },
  { id: 'field_cache', title: 'Reserve de Campagne', cache: 'de l\'equipement mobile et des stimulants' },
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

function buildRoleClues(theme: Theme, sceneLabel: string) {
  return {
    warrior: `Tu reperes des marques de choc pres de ${sceneLabel}; quelque chose de lourd est passe ici.`,
    sage: `Tu lis un motif de ${theme.symbol} incomplet autour de ${sceneLabel}; le flux rituel est affaibli.`,
    ranger: `Tu notes des traces discrètes autour de ${sceneLabel}; un trajet secondaire reste praticable.`,
  } as Partial<Record<RoleId, string>>;
}

function buildStartScene(theme: Theme): Scene {
  const evidenceId = 'scene_0_trace';
  return {
    id: 'scene_0',
    title: `Depart - ${theme.label}`,
    journalTitle: `Depart - ${theme.label}`,
    canonicalTruth: `Le groupe entre dans ${theme.zone} pour atteindre ${theme.relic}.`,
    intro: `La mission commence dans ${theme.zone}. ${theme.atmosphere}. Votre cible est ${theme.relic}, perdu derriere ${theme.symbol}.`,
    roleClues: buildRoleClues(theme, 'la porte d\'entree'),
    evidence: [{ id: evidenceId, label: 'POINT_D_ENTREE', description: 'Indices initiaux sur la structure du complexe.' }],
    steps: [
      {
        id: 'scene_0_step_1',
        actions: [
          { id: 'scene_0_warrior', role: 'warrior', text: 'Le Guerrier securise l\'entree et mesure le terrain.' },
          { id: 'scene_0_sage', role: 'sage', text: 'Le Sage lit les premières inscriptions actives.' },
          { id: 'scene_0_ranger', role: 'ranger', text: 'Le Ranger cartographie les couloirs proches.' },
        ],
        outcomes: {
          scene_0_warrior: {
            narration: 'Le groupe gagne un point d\'appui solide avant d\'avancer.',
            evidenceIds: [evidenceId],
            tagsAdded: { global: ['start_anchor'] },
          },
          scene_0_sage: {
            narration: 'Les motifs revelent une structure en blocs reactifs.',
            evidenceIds: [evidenceId],
            tagsAdded: { global: ['start_reading'] },
          },
          scene_0_ranger: {
            narration: 'Un chemin discret est note pour une future retraite.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['start_paths'] },
          },
        },
      },
    ],
    options: [
      { id: 'A', text: 'Entrer prudemment.', defaultVisible: true, next: [{ to: 'scene_1' }] },
      {
        id: 'B',
        text: 'Prendre l\'axe principal.',
        next: [{ to: 'scene_1' }],
        tagsAdded: { global: ['tempo_fast'] },
      },
      {
        id: 'C',
        text: 'Passer par une faille laterale.',
        isRisky: true,
        next: [{ to: 'scene_1' }],
        tagsAdded: { global: ['tempo_fast', 'risk_taken'] },
      },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'Le groupe progresse en gardant ses reserves intactes.' },
      B: { text: 'La progression gagne du temps mais revele votre presence.', hpDelta: -1 },
      C: { text: 'Le détour paie, mais coute des forces sur un terrain instable.', hpDelta: -1 },
    },
  };
}

function buildExploreScene({
  sceneId,
  nextSceneId,
  card,
  theme,
}: {
  sceneId: string;
  nextSceneId: string;
  card: ExploreCard;
  theme: Theme;
}): Scene {
  const evidenceId = `${sceneId}_evidence`;
  const obstacle = replaceTokens(card.obstacle, { material: theme.material, symbol: theme.symbol });
  return {
    id: sceneId,
    title: `${card.title}`,
    canonicalTruth: `Le groupe doit contourner ${obstacle}.`,
    intro: replaceTokens(card.context, { obstacle }) + ` ${theme.ambientSound}.`,
    roleClues: buildRoleClues(theme, obstacle),
    evidence: [
      {
        id: evidenceId,
        label: 'TRACE_STRUCTURELLE',
        description: `Observation utile autour de ${obstacle}.`,
      },
    ],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          { id: `${sceneId}_warrior`, role: 'warrior', text: 'Le Guerrier ouvre un angle de progression.' },
          { id: `${sceneId}_sage`, role: 'sage', text: 'Le Sage calibre les runes actives.' },
          { id: `${sceneId}_ranger`, role: 'ranger', text: 'Le Ranger cherche une faille exploitable.' },
        ],
        outcomes: {
          [`${sceneId}_warrior`]: {
            narration: 'La position devient tenable, meme sous pression.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
          },
          [`${sceneId}_sage`]: {
            narration: 'Le schema local est decode et simplifie la suite.',
            evidenceIds: [evidenceId],
            tagsAdded: { global: ['lore_fragment'] },
          },
          [`${sceneId}_ranger`]: {
            narration: card.rangerFindsUtility
              ? 'Une petite clef modulaire est recuperee dans la poussiere.'
              : 'Un passage de secours est balise pour plus tard.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: card.rangerFindsUtility ? { global: ['utility_skeleton_key'] } : { global: ['path_marked'] },
          },
        },
      },
    ],
    options: [
      {
        id: 'A',
        text: 'Continuer en formation serree.',
        defaultVisible: true,
        next: [{ to: nextSceneId }],
      },
      {
        id: 'B',
        text: 'Exploiter l\'ouverture detectee.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['tempo_fast'] },
      },
      {
        id: 'C',
        text: 'Forcer un passage fragile.',
        isRisky: true,
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['risk_taken'] },
      },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'La progression reste stable et disciplinée.' },
      B: { text: 'Vous gagnez du terrain mais le complexe vous repere.', hpDelta: -1 },
      C: { text: 'Le groupe passe au prix d\'une fatigue immediate.', hpDelta: -1 },
    },
  };
}

function buildEventScene({
  sceneId,
  nextSceneId,
  card,
  theme,
}: {
  sceneId: string;
  nextSceneId: string;
  card: EventCard;
  theme: Theme;
}): Scene {
  const evidenceId = `${sceneId}_evidence`;
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `La scene attribue les augments de run en lien avec ${card.focus}.`,
    intro: `Au centre de ${theme.zone}, vous trouvez ${card.focus}. C'est ici que vos choix peuvent changer la fin de run.`,
    roleClues: buildRoleClues(theme, card.focus),
    evidence: [{ id: evidenceId, label: 'NOEUD_CENTRAL', description: 'Element cle pour la suite de l\'expedition.' }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          { id: `${sceneId}_warrior`, role: 'warrior', text: 'Le Guerrier ancre une charge de rupture.' },
          { id: `${sceneId}_sage`, role: 'sage', text: 'Le Sage stabilise le flux et concentre la puissance.' },
          { id: `${sceneId}_ranger`, role: 'ranger', text: 'Le Ranger monte un kit tactique de contournement.' },
          { id: `${sceneId}_any`, role: 'any', text: 'Le groupe extrait une clef rituelle transportable.' },
        ],
        outcomes: {
          [`${sceneId}_warrior`]: {
            narration: 'Augment obtenu: Briseur de ligne (Guerrier).',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['augment_warrior_breach'] },
          },
          [`${sceneId}_sage`]: {
            narration: 'Augment obtenu: Focalisation arcanique (Sage).',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['augment_sage_focus'] },
          },
          [`${sceneId}_ranger`]: {
            narration: 'Augment obtenu: Outils d\'embuscade (Ranger).',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['augment_ranger_gadget'] },
          },
          [`${sceneId}_any`]: {
            narration: 'Vous prenez une clef utilitaire reutilisable.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['utility_skeleton_key'] },
          },
        },
      },
    ],
    options: [
      {
        id: 'A',
        text: 'Sceller le noyau et poursuivre.',
        defaultVisible: true,
        next: [{ to: nextSceneId }],
      },
      {
        id: 'B',
        text: 'Surcharger les canaux offensifs.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['augment_party_fury'] },
      },
      {
        id: 'C',
        text: 'Prioriser la logistique et les raccourcis.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['utility_skeleton_key'] },
      },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'Le noyau est stabilise sans surcout.' },
      B: { text: 'Le groupe gagne un pic de puissance pour les combats a venir.' },
      C: { text: 'Le groupe securise une marge tactique pour les zones dangereuses.' },
    },
  };
}

function buildDangerScene({
  sceneId,
  nextSceneId,
  card,
  theme,
}: {
  sceneId: string;
  nextSceneId: string;
  card: DangerCard;
  theme: Theme;
}): Scene {
  const evidenceId = `${sceneId}_evidence`;
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `Scene de danger: ${card.hazard}.`,
    intro: `${card.hazard}. ${card.pressure} ${theme.atmosphere}.`,
    roleClues: buildRoleClues(theme, card.hazard),
    evidence: [{ id: evidenceId, label: 'SIGNAL_DANGER', description: 'Element tactique confirme sous pression.' }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          { id: `${sceneId}_warrior_base`, role: 'warrior', text: 'Le Guerrier couvre l\'avance a la lame.' },
          { id: `${sceneId}_sage_base`, role: 'sage', text: 'Le Sage dresse un contre-rythme defensif.' },
          { id: `${sceneId}_ranger_base`, role: 'ranger', text: 'Le Ranger guide une ligne de fuite propre.' },
          {
            id: `${sceneId}_warrior_aug`,
            role: 'warrior',
            text: 'Augment: le Guerrier brise la ligne adverse.',
            ifGlobal: { all: ['augment_warrior_breach'] },
          },
          {
            id: `${sceneId}_sage_aug`,
            role: 'sage',
            text: 'Augment: le Sage court-circuite la pression rituelle.',
            ifGlobal: { all: ['augment_sage_focus'] },
          },
          {
            id: `${sceneId}_ranger_aug`,
            role: 'ranger',
            text: 'Augment: le Ranger pose un filet tactique.',
            ifGlobal: { all: ['augment_ranger_gadget'] },
          },
          {
            id: `${sceneId}_utility`,
            role: 'any',
            text: 'Utilitaire: activer la clef modulaire pour ouvrir un axe securise.',
            ifGlobal: { all: ['utility_skeleton_key'] },
          },
        ],
        outcomes: {
          [`${sceneId}_warrior_base`]: {
            narration: 'La ligne tient, mais au prix d\'efforts visibles.',
            evidenceIds: [evidenceId],
            hpDelta: -1,
          },
          [`${sceneId}_sage_base`]: {
            narration: 'La poussée est contenue, mais draine vos reserves.',
            evidenceIds: [evidenceId],
            hpDelta: -1,
            unlockOptionIds: ['B'],
          },
          [`${sceneId}_ranger_base`]: {
            narration: 'Le groupe traverse le pire de la zone en restant mobile.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
          },
          [`${sceneId}_warrior_aug`]: {
            narration: 'Action augmentee: une ouverture nette apparait dans la defense adverse.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
            tagsAdded: { global: ['danger_opening'] },
          },
          [`${sceneId}_sage_aug`]: {
            narration: 'Action augmentee: la trame ennemie perd son rythme.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B', 'C'],
            tagsAdded: { global: ['boss_exposed'] },
          },
          [`${sceneId}_ranger_aug`]: {
            narration: 'Action augmentee: le groupe gagne un couloir d\'engagement ideal.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['path_marked'] },
          },
          [`${sceneId}_utility`]: {
            narration: 'Utilitaire active: la clef ouvre un raccourci vers l\'objectif.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
            tagsAdded: { global: ['shortcut_ready'] },
          },
        },
      },
    ],
    options: [
      {
        id: 'A',
        text: 'Maintenir le plan et passer proprement.',
        defaultVisible: true,
        next: [{ to: nextSceneId }],
      },
      {
        id: 'B',
        text: 'Exploiter la faille offensive.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['boss_exposed'] },
      },
      {
        id: 'C',
        text: 'Prendre le raccourci instable.',
        isRisky: true,
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['risk_taken'] },
      },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'La zone est franchie en limitant la casse.' },
      B: { text: 'Vous prenez l\'initiative pour le combat final.', hpDelta: 1 },
      C: { text: 'Le raccourci fonctionne mais use les nerfs.', hpDelta: -1 },
    },
  };
}

function buildRewardScene({
  sceneId,
  nextSceneId,
  card,
  theme,
}: {
  sceneId: string;
  nextSceneId: string;
  card: RewardCard;
  theme: Theme;
}): Scene {
  const evidenceId = `${sceneId}_evidence`;
  return {
    id: sceneId,
    title: card.title,
    canonicalTruth: `Point de recompense avant le boss: ${card.cache}.`,
    intro: `Vous trouvez ${card.cache}. C'est le dernier moment pour calibrer la puissance de run avant ${theme.guardian}.`,
    roleClues: buildRoleClues(theme, card.cache),
    evidence: [{ id: evidenceId, label: 'RESERVE', description: 'Materiel exploitable avant le boss.' }],
    steps: [
      {
        id: `${sceneId}_step_1`,
        actions: [
          { id: `${sceneId}_warrior`, role: 'warrior', text: 'Le Guerrier renforce l\'attaque frontale.' },
          { id: `${sceneId}_sage`, role: 'sage', text: 'Le Sage stabilise les reserves defensives.' },
          { id: `${sceneId}_ranger`, role: 'ranger', text: 'Le Ranger trie l\'equipement utilitaire.' },
        ],
        outcomes: {
          [`${sceneId}_warrior`]: {
            narration: 'Le groupe prepare un assaut plus brutal.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B'],
          },
          [`${sceneId}_sage`]: {
            narration: 'Un coussin defensif est mis en place.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['C'],
          },
          [`${sceneId}_ranger`]: {
            narration: 'Des modules de contournement sont rendus utilisables.',
            evidenceIds: [evidenceId],
            unlockOptionIds: ['B', 'C'],
          },
        },
      },
    ],
    options: [
      {
        id: 'A',
        text: 'Prendre l\'upgrade offensive.',
        defaultVisible: true,
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['augment_party_fury'] },
      },
      {
        id: 'B',
        text: 'Prendre l\'upgrade utilitaire.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['utility_skeleton_key', 'shortcut_ready'] },
      },
      {
        id: 'C',
        text: 'Prendre l\'upgrade defensive.',
        next: [{ to: nextSceneId }],
        tagsAdded: { global: ['augment_reserve_vigor'] },
      },
    ],
    unlockRules: [{ optionId: 'B', evidenceIds: [evidenceId] }],
    outcomeByOption: {
      A: { text: 'Vous acceptez une montee de puissance immediate.' },
      B: { text: 'Le groupe privilegie l\'impact tactique et les ouvertures.', hpDelta: 1 },
      C: { text: 'Les reserves sont consolidees pour absorber le choc final.', hpDelta: 2 },
    },
  };
}

function buildBossScene(theme: Theme): Scene {
  return {
    id: 'scene_8',
    title: `Boss - ${theme.guardian}`,
    journalTitle: `Affrontement Final - ${theme.guardian}`,
    canonicalTruth: `Le boss final verrouille ${theme.relic}.`,
    intro: `${theme.guardian} sort de ${theme.material} et bloque l'acces a ${theme.relic}. Les choices de run definissent votre puissance ici.`,
    roleClues: {
      warrior: 'Tu vois des points de rupture nets sur l\'armure du boss.',
      sage: 'Tu detectes une oscillation breve dans le noyau rituel du boss.',
      ranger: 'Tu identifies un angle mort exploitable sur le flanc du boss.',
    },
    mode: 'combat',
    combat: {
      enemyName: theme.guardian,
      enemyHp: 34,
      enemyAttack: 8,
      allowRun: true,
    },
    evidence: [],
    steps: [],
    options: [
      { id: 'A', text: 'Victoire', defaultVisible: true, next: [{ to: 'scene_end_heroic' }] },
      { id: 'B', text: 'Defaite', next: [{ to: 'scene_end_failure' }] },
      { id: 'C', text: 'Retraite', next: [{ to: 'scene_end_escape' }] },
    ],
    unlockRules: [],
    outcomeByOption: {
      A: { text: `Le boss tombe. ${theme.relic} est securise.` },
      B: { text: `Le groupe cede et ${theme.relic} reste hors de portee.` },
      C: { text: `Le groupe se retire en conservant une partie des acquis.` },
    },
  };
}

function buildEndingScene({
  id,
  title,
  intro,
  canonicalTruth,
}: {
  id: string;
  title: string;
  intro: string;
  canonicalTruth: string;
}): Scene {
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
          { id: `${id}_warrior`, role: 'warrior', text: 'Le Guerrier confirme la fin de l\'expedition.' },
          { id: `${id}_sage`, role: 'sage', text: 'Le Sage fixe le rapport final.' },
          { id: `${id}_ranger`, role: 'ranger', text: 'Le Ranger balise la sortie.' },
        ],
        outcomes: {
          [`${id}_warrior`]: { narration: 'Le front est tenu jusqu\'au dernier instant.' },
          [`${id}_sage`]: { narration: 'La conclusion est proprement documentee.' },
          [`${id}_ranger`]: { narration: 'Le retrait de la zone est securise.' },
        },
      },
    ],
    options: [
      {
        id: 'A',
        text: 'Conclure la run.',
        defaultVisible: true,
        next: [{ to: null }],
      },
      {
        id: 'B',
        text: 'Conclure la run.',
        next: [{ to: null }],
      },
      {
        id: 'C',
        text: 'Conclure la run.',
        next: [{ to: null }],
      },
    ],
    unlockRules: [],
    outcomeByOption: {
      A: { text: 'Run terminee.' },
      B: { text: 'Run terminee.' },
      C: { text: 'Run terminee.' },
    },
  };
}

function buildCombatActions(): CombatAction[] {
  const offenseModifier = { ifGlobal: { all: ['augment_party_fury'] }, damageDelta: 1 };
  const defenseModifier = { ifGlobal: { all: ['augment_reserve_vigor'] }, blockDelta: 1 };
  const exposedModifier = { ifGlobal: { all: ['boss_exposed'] }, damageDelta: 1 };

  return [
    {
      id: 'warrior_cleave',
      role: 'warrior',
      text: 'Fendre la ligne',
      effect: { damage: 4 },
      modifiers: [offenseModifier, exposedModifier],
    },
    {
      id: 'warrior_guard',
      role: 'warrior',
      text: 'Couvrir le groupe',
      effect: { block: 3 },
      modifiers: [defenseModifier],
    },
    {
      id: 'warrior_fallback',
      role: 'warrior',
      text: 'Tenir la retraite',
      effect: { run: true, block: 1 },
      modifiers: [defenseModifier],
    },
    {
      id: 'sage_bolt',
      role: 'sage',
      text: 'Eclair rituel',
      effect: { damage: 4, enemyAttackDelta: -1 },
      modifiers: [offenseModifier, exposedModifier],
    },
    {
      id: 'sage_ward',
      role: 'sage',
      text: 'Voile de garde',
      effect: { block: 3 },
      modifiers: [defenseModifier],
    },
    {
      id: 'sage_withdraw',
      role: 'sage',
      text: 'Retrait coordonne',
      effect: { run: true, enemyAttackDelta: -1 },
      modifiers: [defenseModifier],
    },
    {
      id: 'ranger_shot',
      role: 'ranger',
      text: 'Tir d\'ouverture',
      effect: { damage: 4 },
      modifiers: [offenseModifier, exposedModifier],
    },
    {
      id: 'ranger_cover',
      role: 'ranger',
      text: 'Couverture mobile',
      effect: { block: 2, enemyAttackDelta: -1 },
      modifiers: [defenseModifier],
    },
    {
      id: 'ranger_slip',
      role: 'ranger',
      text: 'Ouvrir une sortie',
      effect: { run: true },
      modifiers: [defenseModifier],
    },
    {
      id: 'warrior_breach',
      role: 'warrior',
      text: 'Augment: Rupture totale',
      ifGlobal: { all: ['augment_warrior_breach'] },
      effect: { damage: 7 },
      modifiers: [offenseModifier, exposedModifier],
    },
    {
      id: 'sage_overload',
      role: 'sage',
      text: 'Augment: Surcharge runique',
      ifGlobal: { all: ['augment_sage_focus'] },
      effect: { damage: 6, enemyAttackDelta: -1 },
      modifiers: [offenseModifier, exposedModifier],
    },
    {
      id: 'ranger_barrage',
      role: 'ranger',
      text: 'Augment: Barrage tactique',
      ifGlobal: { all: ['augment_ranger_gadget'] },
      effect: { damage: 5, block: 2 },
      modifiers: [offenseModifier, defenseModifier],
    },
    {
      id: 'team_pylon',
      role: 'any',
      text: 'Utilitaire: Activer le pylone',
      ifGlobal: { all: ['utility_skeleton_key'] },
      effect: { damage: 4, block: 2 },
      modifiers: [offenseModifier, defenseModifier],
    },
  ];
}

export function generateProceduralStoryData(seedInput: string): StoryData {
  const seed = seedInput.trim() || 'questing-together-default';
  const rng = createRng(seed);

  const theme = pickOne(rng, THEMES);
  const exploreCards = pickUnique(rng, EXPLORE_CARDS, 3);
  const eventCard = pickOne(rng, EVENT_CARDS);
  const dangerCards = pickUnique(rng, DANGER_CARDS, 2);
  const rewardCard = pickOne(rng, REWARD_CARDS);

  const scenes: Scene[] = [
    buildStartScene(theme),
    buildExploreScene({ sceneId: 'scene_1', nextSceneId: 'scene_2', card: exploreCards[0]!, theme }),
    buildExploreScene({ sceneId: 'scene_2', nextSceneId: 'scene_3', card: exploreCards[1]!, theme }),
    buildExploreScene({ sceneId: 'scene_3', nextSceneId: 'scene_4', card: exploreCards[2]!, theme }),
    buildEventScene({ sceneId: 'scene_4', nextSceneId: 'scene_5', card: eventCard, theme }),
    buildDangerScene({ sceneId: 'scene_5', nextSceneId: 'scene_6', card: dangerCards[0]!, theme }),
    buildDangerScene({ sceneId: 'scene_6', nextSceneId: 'scene_7', card: dangerCards[1]!, theme }),
    buildRewardScene({ sceneId: 'scene_7', nextSceneId: 'scene_8', card: rewardCard, theme }),
    buildBossScene(theme),
    buildEndingScene({
      id: 'scene_end_heroic',
      title: 'Fin Heroique',
      intro: `La compagnie revient avec ${theme.relic}. Le complexe se tait enfin.`,
      canonicalTruth: 'Victoire de run.',
    }),
    buildEndingScene({
      id: 'scene_end_escape',
      title: 'Fin Retraite',
      intro: 'Vous survivez et sortez avec des fragments utiles, sans prendre le coeur du site.',
      canonicalTruth: 'Retraite tactique.',
    }),
    buildEndingScene({
      id: 'scene_end_failure',
      title: 'Fin Echec',
      intro: `Le groupe tombe avant de securiser ${theme.relic}. La zone reste active.`,
      canonicalTruth: 'Defaite de run.',
    }),
  ];

  return {
    version: 1001,
    startSceneId: 'scene_0',
    combat: {
      partyHp: 30,
      actions: buildCombatActions(),
    },
    meta: {
      generator: 'procedural-v1',
      seed,
      runLength: 'short',
      themeId: theme.id,
      themeLabel: theme.label,
      structure: ['start', 'explore', 'explore', 'explore', 'event', 'danger', 'danger', 'reward', 'boss'],
    },
    scenes,
  };
}
