import fireballCastData from '@/features/vfx/assets/sequences/fireball-cast.json';
import seqFireballTestData from '@/features/vfx/assets/sequences/fireball-cast_02.json';
import seqIceshardData from '@/features/vfx/assets/sequences/Seq_IceShard.json';
import type { EffectSequence } from '@/features/vfx/types/sequences';

const effectSequences = [
  fireballCastData,
  seqFireballTestData,
  seqIceshardData,
] as EffectSequence[];

const effectSequenceById = new Map(effectSequences.map((sequence) => [sequence.id, sequence]));

export function getEffectSequence(sequenceId: string) {
  return effectSequenceById.get(sequenceId) ?? null;
}

export function listEffectSequences() {
  return effectSequences;
}
