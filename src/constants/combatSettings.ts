import type { RoleId } from '@/types/player';

export const COMBAT = {
  baseHpByRole: { warrior: 60, ranger: 50, sage: 40 } as Record<RoleId, number>,
  hpPerLevel: 10,
  attackDamage: 3,
  damagePerLevel: 1,
  healAmount: 10,
  abilityCooldown: 5,
  healCooldown: 3,
  abilities: {
    warrior: { label: 'Taunt', icon: '🛡️', subtitle: 'Taunt 5t · -60% dmg', damage: 0, aoe: false },
    sage: { label: 'Fireball', icon: '🔥', subtitle: '6 Damage', damage: 6, aoe: false },
    ranger: { label: 'Arrows', icon: '🏹', subtitle: '3 Damage AoE', damage: 3, aoe: true },
  } satisfies Record<
    RoleId,
    { label: string; icon: string; subtitle: string; damage: number; aoe: boolean }
  >,
} as const;
