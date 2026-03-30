/**
 * Post-combat bonus rewards.
 * Offered as choices between fights.
 */

type Bonus = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const BONUSES: Bonus[] = [
  {
    id: 'max-hp-10',
    name: '+10 Max HP',
    description: 'Permanently increase your max HP by 10.',
    icon: '❤️',
  },
  {
    id: 'max-hp-20',
    name: '+20 Max HP',
    description: 'Permanently increase your max HP by 20.',
    icon: '💖',
  },
  {
    id: 'starting-block-5',
    name: 'Iron Skin',
    description: 'Start each fight with 5 Block.',
    icon: '🛡️',
  },
  {
    id: 'starting-block-10',
    name: 'Steel Skin',
    description: 'Start each fight with 10 Block.',
    icon: '🛡️',
  },
  {
    id: 'free-first-reroll',
    name: 'Lucky Draw',
    description: 'First reroll each turn is free.',
    icon: '🎲',
  },
  {
    id: 'max-energy-1',
    name: 'Energy Core',
    description: 'Gain +1 max energy permanently.',
    icon: '⚡',
  },
  { id: 'heal-15', name: 'Healing Potion', description: 'Heal 15 HP immediately.', icon: '🧪' },
  { id: 'heal-30', name: 'Greater Potion', description: 'Heal 30 HP immediately.', icon: '🧪' },
];

const BONUS_BY_ID: Record<string, Bonus> = Object.fromEntries(BONUSES.map((b) => [b.id, b]));

export type { Bonus };
export { BONUS_BY_ID, BONUSES };
