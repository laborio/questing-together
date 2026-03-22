import fireballCastData from '@/features/vfx/assets/sequences/fireball-cast.json';
import type { EffectSequence } from '@/features/vfx/types/sequences';

const effectSequences = [fireballCastData] as EffectSequence[];

const effectSequenceById = new Map(effectSequences.map((sequence) => [sequence.id, sequence]));

export function getEffectSequence(sequenceId: string) {
  return effectSequenceById.get(sequenceId) ?? null;
}

export function listEffectSequences() {
  return effectSequences;
}
