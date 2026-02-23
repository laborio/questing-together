import { PartyChatMessage, Player, PlayerId, RoleId } from '@/src/game/types';

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

export const initialSceneChat: PartyChatMessage[] = [
  {
    id: 'chat-setup',
    kind: 'separator',
    text: 'Mind-bond active: 4 messages per scene, 30 characters max per message.',
  },
];

export const EVIDENCE_CONFIRMATION_COUNT = 2;
export const MAX_EVIDENCE_MARKS_PER_SCENE = 2;
export const MAX_CHAT_MESSAGES_PER_SCENE = 4;
export const MAX_CHAT_CHARACTERS_PER_MESSAGE = 30;

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
