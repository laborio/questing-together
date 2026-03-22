/**
 * Biomes define the visual and narrative context of each phase.
 * Add new biomes here — the adventure generator picks randomly.
 */

export type Biome = {
  id: string;
  name: string;
  description: string;
  phases: {
    early: BiomePhase;
    core: BiomePhase;
    resolve: BiomePhase;
  };
};

type BiomePhase = {
  theme: string;
  ambiance: string;
  narratives: NarrativeTemplate[];
  combatIntro: string;
  bossIntro?: string;
};

type NarrativeTemplate = {
  id: string;
  prompt: string;
  options: {
    id: string;
    text: string;
    effect: { hpDelta?: number; goldDelta?: number; expDelta?: number };
    flavor: string;
  }[];
};

export const BIOMES: Biome[] = [
  {
    id: 'cursed_forest',
    name: 'Cursed Forest',
    description: 'A dark forest where twisted trees whisper ancient curses.',
    phases: {
      early: {
        theme: 'Village at the forest edge',
        ambiance: 'Fog rolls between wooden huts. Villagers speak in hushed tones.',
        narratives: [
          {
            id: 'cf_early_1',
            prompt:
              'An old herbalist beckons you from her hut. "The forest takes more than it gives," she warns.',
            options: [
              {
                id: 'a',
                text: 'Accept her protective charm',
                effect: { hpDelta: 10 },
                flavor: 'A warm glow surrounds you.',
              },
              {
                id: 'b',
                text: 'Buy supplies instead',
                effect: { goldDelta: -10, hpDelta: 20 },
                flavor: 'You stock up on healing herbs.',
              },
              {
                id: 'c',
                text: 'Ignore her and press on',
                effect: { expDelta: 10 },
                flavor: 'Your resolve hardens.',
              },
            ],
          },
          {
            id: 'cf_early_2',
            prompt:
              'A child tugs at your cloak. "My father went into the woods three days ago. Please..."',
            options: [
              {
                id: 'a',
                text: 'Promise to find him',
                effect: { expDelta: 15 },
                flavor: 'Hope flickers in their eyes.',
              },
              {
                id: 'b',
                text: 'Offer gold for information',
                effect: { goldDelta: -15, expDelta: 20 },
                flavor: 'The villagers share what they know.',
              },
            ],
          },
        ],
        combatIntro: 'Wolves emerge from the treeline, eyes glowing red.',
      },
      core: {
        theme: 'Deep forest trails',
        ambiance: 'Branches claw at you. The canopy blocks all light.',
        narratives: [
          {
            id: 'cf_core_1',
            prompt:
              'A fork in the path. Left leads deeper into darkness. Right follows a faint stream.',
            options: [
              {
                id: 'a',
                text: 'Follow the darkness',
                effect: { expDelta: 25, hpDelta: -10 },
                flavor: 'The shadows reveal hidden knowledge.',
              },
              {
                id: 'b',
                text: 'Follow the stream',
                effect: { hpDelta: 15 },
                flavor: 'The water soothes your wounds.',
              },
              {
                id: 'c',
                text: 'Cut through the undergrowth',
                effect: { goldDelta: 20 },
                flavor: 'You find an abandoned camp with supplies.',
              },
            ],
          },
          {
            id: 'cf_core_2',
            prompt:
              'A wounded ranger leans against a tree. "They\'re everywhere... the spiders..."',
            options: [
              {
                id: 'a',
                text: 'Heal them',
                effect: { hpDelta: -10, expDelta: 20 },
                flavor: 'They share a shortcut through the forest.',
              },
              {
                id: 'b',
                text: 'Take their gear',
                effect: { goldDelta: 25 },
                flavor: 'Their loss is your gain.',
              },
              {
                id: 'c',
                text: 'Ask for intel',
                effect: { expDelta: 15 },
                flavor: 'They mark danger zones on your map.',
              },
            ],
          },
          {
            id: 'cf_core_3',
            prompt: 'Glowing mushrooms line a clearing. Their light pulses like a heartbeat.',
            options: [
              {
                id: 'a',
                text: 'Eat one',
                effect: { hpDelta: 30, expDelta: -10 },
                flavor: 'Strange visions flood your mind but your body heals.',
              },
              {
                id: 'b',
                text: 'Harvest them to sell',
                effect: { goldDelta: 30 },
                flavor: 'These will fetch a good price.',
              },
              {
                id: 'c',
                text: 'Leave them alone',
                effect: { expDelta: 10 },
                flavor: 'Wisdom is knowing what not to touch.',
              },
            ],
          },
        ],
        combatIntro: 'Cursed creatures lurch from the shadows.',
        bossIntro: 'The Forest Guardian rises — a twisted amalgam of wood and fury.',
      },
      resolve: {
        theme: 'Heart of the forest',
        ambiance: 'An ancient tree towers above, pulsing with dark energy.',
        narratives: [],
        combatIntro: 'The corruption manifests as a towering beast.',
        bossIntro: 'The Elder Treant awakens, roots tearing through the earth.',
      },
    },
  },
  {
    id: 'sunken_sewers',
    name: 'Sunken Sewers',
    description:
      'Labyrinthine tunnels beneath a crumbling city, flooded with filth and forgotten things.',
    phases: {
      early: {
        theme: 'City slums entrance',
        ambiance: 'Rain hammers the cobblestones. A rusted grate leads below.',
        narratives: [
          {
            id: 'ss_early_1',
            prompt:
              'A shady merchant blocks the entrance. "Toll to enter. Or we can... negotiate."',
            options: [
              {
                id: 'a',
                text: 'Pay the toll (15g)',
                effect: { goldDelta: -15 },
                flavor: 'He steps aside with a grin.',
              },
              {
                id: 'b',
                text: 'Intimidate him',
                effect: { expDelta: 15 },
                flavor: 'He scurries into the dark.',
              },
              {
                id: 'c',
                text: 'Find another entrance',
                effect: { hpDelta: -5, expDelta: 10 },
                flavor: 'You squeeze through a crumbling wall.',
              },
            ],
          },
        ],
        combatIntro: 'Rats the size of dogs swarm from the pipes.',
      },
      core: {
        theme: 'Flooded tunnels',
        ambiance: 'Waist-deep murky water. Things move beneath the surface.',
        narratives: [
          {
            id: 'ss_core_1',
            prompt: 'A locked door blocks your path. Strange symbols glow on its surface.',
            options: [
              {
                id: 'a',
                text: 'Force it open',
                effect: { hpDelta: -15, expDelta: 10 },
                flavor: 'The door shatters but the noise attracts attention.',
              },
              {
                id: 'b',
                text: 'Search for a key',
                effect: { expDelta: 20 },
                flavor: 'You find it hidden in a skull niche.',
              },
              {
                id: 'c',
                text: 'Find a way around',
                effect: { goldDelta: 15 },
                flavor: 'The detour reveals a hidden stash.',
              },
            ],
          },
          {
            id: 'ss_core_2',
            prompt: 'You hear chanting echoing through the tunnels. It grows louder.',
            options: [
              {
                id: 'a',
                text: 'Investigate',
                effect: { expDelta: 25, hpDelta: -10 },
                flavor: 'A cult ritual — you learn their weaknesses.',
              },
              {
                id: 'b',
                text: 'Avoid it',
                effect: { hpDelta: 10 },
                flavor: 'Discretion is the better part of valor.',
              },
            ],
          },
          {
            id: 'ss_core_3',
            prompt: 'An underground river blocks your path. A rotting boat sits on the bank.',
            options: [
              {
                id: 'a',
                text: 'Take the boat',
                effect: { goldDelta: 10, expDelta: 10 },
                flavor: 'You drift past dangers unseen.',
              },
              {
                id: 'b',
                text: 'Swim across',
                effect: { hpDelta: -20, expDelta: 15 },
                flavor: 'Something brushes your leg.',
              },
              {
                id: 'c',
                text: 'Follow the bank',
                effect: { expDelta: 20 },
                flavor: 'A longer but safer route.',
              },
            ],
          },
        ],
        combatIntro: 'Sewer dwellers emerge, weapons crude but deadly.',
        bossIntro: 'The Sewer King rises from the depths, crowned in filth.',
      },
      resolve: {
        theme: 'Underground throne room',
        ambiance: 'A vast cavern lit by bioluminescent fungi. A throne of bones.',
        narratives: [],
        combatIntro: 'The lord of the sewers will not let you leave.',
        bossIntro: 'The Abomination unfolds — a mass of flesh and metal, fused by dark magic.',
      },
    },
  },
  {
    id: 'ruined_fortress',
    name: 'Ruined Fortress',
    description:
      'A crumbling stronghold overrun by the undead, echoing with the clash of ghostly battles.',
    phases: {
      early: {
        theme: 'Fortress approach',
        ambiance: 'Broken banners flutter in the wind. The gates hang open.',
        narratives: [
          {
            id: 'rf_early_1',
            prompt: 'A spectral knight materializes at the gate. "State your purpose, mortal."',
            options: [
              {
                id: 'a',
                text: 'Declare your quest',
                effect: { expDelta: 15 },
                flavor: 'The ghost nods with respect.',
              },
              {
                id: 'b',
                text: 'Offer tribute (20g)',
                effect: { goldDelta: -20, hpDelta: 20 },
                flavor: 'The spirits grant you their blessing.',
              },
              {
                id: 'c',
                text: 'Rush past',
                effect: { hpDelta: -10 },
                flavor: 'Ghostly blades graze you as you charge through.',
              },
            ],
          },
        ],
        combatIntro: 'Skeletal sentries rattle to attention.',
      },
      core: {
        theme: 'Fortress interior',
        ambiance: 'Echoes of battle. Armor stands animate as you pass.',
        narratives: [
          {
            id: 'rf_core_1',
            prompt: 'An armory, still stocked. Most weapons are rusted, but some gleam.',
            options: [
              {
                id: 'a',
                text: 'Take a gleaming sword',
                effect: { expDelta: 20 },
                flavor: 'It hums with faint enchantment.',
              },
              {
                id: 'b',
                text: 'Search for gold',
                effect: { goldDelta: 30 },
                flavor: 'A coin purse hidden behind a shield.',
              },
              {
                id: 'c',
                text: 'Set a trap with the armor',
                effect: { expDelta: 15 },
                flavor: 'Your ingenuity will pay off later.',
              },
            ],
          },
          {
            id: 'rf_core_2',
            prompt: 'A throne room. The ghostly king sits, crown askew, muttering.',
            options: [
              {
                id: 'a',
                text: 'Kneel before him',
                effect: { hpDelta: 20, expDelta: 10 },
                flavor: 'He blesses you with phantom strength.',
              },
              {
                id: 'b',
                text: 'Steal the crown',
                effect: { goldDelta: 50, hpDelta: -20 },
                flavor: 'The spirits rage but the crown is yours.',
              },
              {
                id: 'c',
                text: 'Ask for passage',
                effect: { expDelta: 25 },
                flavor: 'He reveals a secret passage deeper.',
              },
            ],
          },
        ],
        combatIntro: 'The undead garrison awakens.',
        bossIntro: 'The Death Knight draws a blade of black flame.',
      },
      resolve: {
        theme: 'Fortress dungeon',
        ambiance: 'Chains rattle. A portal of dark energy crackles in the center.',
        narratives: [],
        combatIntro: 'The source of corruption guards the portal.',
        bossIntro: 'The Lich Commander emerges, surrounded by a choir of the damned.',
      },
    },
  },
];
