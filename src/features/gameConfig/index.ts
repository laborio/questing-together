/**
 * Game config barrel — all game data: cards, traits, biomes, enemies, encounters, identities, bonuses, riddles, shop.
 */

import type { Card, Trait } from '@/features/gameConfig/cardTypes';
import { REWARD_CARD_POOL } from '@/features/gameConfig/rewardPool';
import { RANGER_STARTER } from '@/features/gameConfig/starterRanger';
import { SAGE_STARTER } from '@/features/gameConfig/starterSage';
import { WARRIOR_STARTER } from '@/features/gameConfig/starterWarrior';
import type { RoleId } from '@/types/player';

// ─── Starter decks by role ──────────────────────────────────────

const STARTER_DECKS: Record<RoleId, Card[]> = {
  warrior: WARRIOR_STARTER,
  sage: SAGE_STARTER,
  ranger: RANGER_STARTER,
};

const STARTER_DECK: Card[] = [...WARRIOR_STARTER, ...SAGE_STARTER, ...RANGER_STARTER];

// ─── All cards lookup ───────────────────────────────────────────

const ALL_CARDS: Card[] = [...STARTER_DECK, ...REWARD_CARD_POOL];
const CARD_BY_ID: Record<string, Card> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));

const getCardById = (id: string): Card | undefined => CARD_BY_ID[id];
const getCardsByTrait = (trait: Trait): Card[] => ALL_CARDS.filter((c) => c.trait === trait);
const getStarterDeck = (roleId: RoleId): Card[] => STARTER_DECKS[roleId];

// ─── Card re-exports ────────────────────────────────────────────

// ─── Biomes ─────────────────────────────────────────────────────
export type { Biome } from '@/features/gameConfig/biomes';
export { BIOMES } from '@/features/gameConfig/biomes';
// ─── Bonuses ────────────────────────────────────────────────────
export type { Bonus } from '@/features/gameConfig/bonuses';
export { BONUS_BY_ID, BONUSES } from '@/features/gameConfig/bonuses';
export type { Card, ConvergenceEffect, Trait, TraitMeta } from '@/features/gameConfig/cardTypes';
// ─── Encounters & enemy templates ───────────────────────────────
export type { Encounter, EncounterEnemy, EnemyTemplate } from '@/features/gameConfig/encounters';
export {
  ENCOUNTERS,
  ENEMY_TEMPLATE_BY_ID,
  ENEMY_TEMPLATES,
  getEnemyTemplate,
} from '@/features/gameConfig/encounters';
// ─── Legacy enemies (biome-based) ───────────────────────────────
export type {
  BossTemplate,
  EnemyTemplate as BiomeEnemyTemplate,
} from '@/features/gameConfig/enemies';
export { ENEMIES_BY_BIOME } from '@/features/gameConfig/enemies';
// ─── Identities ─────────────────────────────────────────────────
export type { Identity } from '@/features/gameConfig/identities';
export { getIdentityById, IDENTITIES, IDENTITY_BY_ID } from '@/features/gameConfig/identities';
export { REWARD_CARD_POOL } from '@/features/gameConfig/rewardPool';
// ─── Riddles ────────────────────────────────────────────────────
export type { Riddle } from '@/features/gameConfig/riddles';
export { RIDDLES } from '@/features/gameConfig/riddles';
// ─── Shop ───────────────────────────────────────────────────────
export type { ShopItem } from '@/features/gameConfig/shop';
export { getAvailableItems, SHOP_ITEMS } from '@/features/gameConfig/shop';
export {
  CONVERGENCE_BY_TRAIT,
  CONVERGENCE_COUNT_MULTIPLIERS,
  getConvergenceMultiplier,
  TRAIT_MAP,
  TRAITS,
} from '@/features/gameConfig/traits';
export {
  ALL_CARDS,
  CARD_BY_ID,
  getCardById,
  getCardsByTrait,
  getStarterDeck,
  STARTER_DECK,
  STARTER_DECKS,
};
