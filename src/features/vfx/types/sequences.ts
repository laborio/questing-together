export type EffectSequenceAnchor = 'caster' | 'target' | 'projectile';

export type EffectSequenceCue = {
  id: string;
  assetId: string;
  atMs: number;
  durationMs?: number;
  anchor: EffectSequenceAnchor;
  targetAnchor?: EffectSequenceAnchor;
  travelT?: number;
};

export type EffectSequence = {
  id: string;
  label: string;
  cues: EffectSequenceCue[];
};
