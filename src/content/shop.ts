/**
 * Shop items available per phase/bloc.
 * Add new items here — the shop screen picks from these.
 */

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  effect: { hpDelta?: number; goldDelta?: number; expDelta?: number };
  minBloc: number; // available from this bloc onwards
};

export const SHOP_ITEMS: ShopItem[] = [
  // Healing
  {
    id: 'potion_small',
    name: 'Small Potion',
    description: 'Restores 15 HP',
    icon: '🧪',
    cost: 10,
    effect: { hpDelta: 15 },
    minBloc: 1,
  },
  {
    id: 'potion_medium',
    name: 'Medium Potion',
    description: 'Restores 30 HP',
    icon: '🧪',
    cost: 20,
    effect: { hpDelta: 30 },
    minBloc: 1,
  },
  {
    id: 'potion_large',
    name: 'Large Potion',
    description: 'Restores 50 HP',
    icon: '🧪',
    cost: 40,
    effect: { hpDelta: 50 },
    minBloc: 2,
  },

  // Experience
  {
    id: 'scroll_wisdom',
    name: 'Scroll of Wisdom',
    description: 'Grants 30 XP',
    icon: '📜',
    cost: 25,
    effect: { expDelta: 30 },
    minBloc: 1,
  },
  {
    id: 'tome_knowledge',
    name: 'Tome of Knowledge',
    description: 'Grants 60 XP',
    icon: '📖',
    cost: 45,
    effect: { expDelta: 60 },
    minBloc: 2,
  },

  // Combined
  {
    id: 'elixir',
    name: 'Elixir of Power',
    description: 'Restores 20 HP and grants 40 XP',
    icon: '✨',
    cost: 50,
    effect: { hpDelta: 20, expDelta: 40 },
    minBloc: 2,
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Restores 80 HP',
    icon: '🔥',
    cost: 80,
    effect: { hpDelta: 80 },
    minBloc: 3,
  },
];

export function getAvailableItems(bloc: number): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.minBloc <= bloc);
}
