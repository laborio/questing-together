import { PARTY_EMOTES } from '@/constants/constants';
import type { EmoteText } from '@/types/player';

type Point = { x: number; y: number };

const optionVectors: Record<EmoteText, Point> = {
  'Safe!': { x: 0, y: -1 },
  'Fight!': { x: 1, y: 0 },
  'Trust me!': { x: 0, y: 1 },
  'Sorry...': { x: -1, y: 0 },
};

const resolveHighlightedEmote = (point: Point, center: Point): EmoteText | null => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 34) return null;

  return PARTY_EMOTES.reduce<{ emote: EmoteText | null; score: number }>(
    (best, emote) => {
      const vector = optionVectors[emote];
      const score = (dx * vector.x + dy * vector.y) / distance;
      return score > best.score ? { emote, score } : best;
    },
    { emote: null, score: -Infinity },
  ).emote;
};

export type { Point };
export { optionVectors, resolveHighlightedEmote };
