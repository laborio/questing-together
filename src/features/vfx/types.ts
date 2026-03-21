export type EffectKeyframe = {
  at: number;
  value: number;
};

export type EffectTrackName = 'x' | 'y' | 'scale' | 'alpha' | 'glow' | 'ring';

export type EffectTrackMap = Record<EffectTrackName, EffectKeyframe[]>;

export type EffectTrailConfig = {
  segments: number;
  spacing: number;
  baseRadius: number;
};

export type EffectAsset = {
  id: string;
  label: string;
  durationMs: number;
  loop: boolean;
  tracks: EffectTrackMap;
  trail: EffectTrailConfig;
};
