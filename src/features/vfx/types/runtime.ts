export type PlayEffectOptions = {
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  durationMsOverride?: number;
};

export type EffectInstance = PlayEffectOptions & {
  assetId: string;
  instanceId: string;
};

export type PlayEffect = (assetId: string, options: PlayEffectOptions) => string | null;
