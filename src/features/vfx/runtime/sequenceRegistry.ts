import seqFireballData from '@/features/vfx/assets/sequences/Seq_Fireball.json';
import seqGreentestData from '@/features/vfx/assets/sequences/Seq_GreenTest.json';
import seqIceshardData from '@/features/vfx/assets/sequences/Seq_IceShard.json';
import seqShielddoubleData from '@/features/vfx/assets/sequences/Seq_ShieldDouble.json';
import type { EffectSequence } from '@/features/vfx/types/sequences';

const effectSequences = [
  seqFireballData,
  seqGreentestData,
  seqIceshardData,
  seqShielddoubleData,
] as EffectSequence[];

const effectSequenceById = new Map(effectSequences.map((sequence) => [sequence.id, sequence]));

export function getEffectSequence(sequenceId: string) {
  return effectSequenceById.get(sequenceId) ?? null;
}

export function listEffectSequences() {
  return effectSequences;
}
