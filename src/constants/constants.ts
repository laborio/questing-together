import type { EmoteText, Player, PlayerId, RoleId } from '@/types/player';

export const players: Player[] = [
  { id: 'p1', name: 'Player 1' },
  { id: 'p2', name: 'Player 2' },
  { id: 'p3', name: 'Player 3' },
];

export const playerNameById: Record<PlayerId, string> = {
  p1: 'Player 1',
  p2: 'Player 2',
  p3: 'Player 3',
};

export const NO_REACTION_ACTION_ID = 'no_reaction';
export const EVIDENCE_CONFIRMATION_COUNT = 2;
export const MAX_PARTY_EMOTES_PER_SCENE = 400;
export const PARTY_EMOTES: EmoteText[] = ['Safe!', 'Fight!', 'Trust me!', 'Sorry...'];

export const roles: { id: RoleId; label: string; summary: string }[] = [
  {
    id: 'warrior',
    label: 'Warrior',
    summary: 'Direct, protective, and decisive. Strong in forceful or honorable approaches.',
  },
  {
    id: 'sage',
    label: 'Sage',
    summary: 'Observant, thoughtful, and analytical. Strong in inference and negotiation.',
  },
  {
    id: 'ranger',
    label: 'Ranger',
    summary: 'Practical, quiet, and situational. Strong in scanning and subtle leverage.',
  },
];
