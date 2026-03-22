export type EffectKeyframe = {
  at: number;
  value: number;
};

export type EffectTrackName = 'x' | 'y' | 'scale' | 'alpha' | 'glow' | 'travel';

export type EffectTrackMap = Partial<Record<EffectTrackName, EffectKeyframe[]>>;

type EffectLayerBase = {
  id: string;
  tracks?: EffectTrackMap;
};

export type OrbLayer = EffectLayerBase & {
  type: 'orb';
  radius: number;
  color: string;
  glowColor?: string;
  glowScale?: number;
};

export type TrailStyle = 'fill' | 'ring' | 'streak' | 'diamond' | 'arc' | 'starburst' | 'sprite';

export type TrailLayer = EffectLayerBase & {
  type: 'trail';
  radius: number;
  color: string;
  segments: number;
  spacing: number;
  falloff?: number;
  style?: TrailStyle;
  thickness?: number;
  spriteId?: string;
  width?: number;
  height?: number;
  rotationDeg?: number;
  sweepDeg?: number;
  innerRadius?: number;
  outerRadius?: number;
  points?: number;
  tintColor?: string;
};

export type RingLayer = EffectLayerBase & {
  type: 'ring';
  radius: number;
  color: string;
  thickness: number;
};

export type StreakLayer = EffectLayerBase & {
  type: 'streak';
  width: number;
  height: number;
  color: string;
  rotationDeg?: number;
};

export type DiamondLayer = EffectLayerBase & {
  type: 'diamond';
  width: number;
  height: number;
  color: string;
  rotationDeg?: number;
};

export type ArcLayer = EffectLayerBase & {
  type: 'arc';
  radius: number;
  thickness: number;
  sweepDeg: number;
  color: string;
  rotationDeg?: number;
};

export type StarburstLayer = EffectLayerBase & {
  type: 'starburst';
  innerRadius: number;
  outerRadius: number;
  points: number;
  color: string;
  rotationDeg?: number;
};

export type SpriteLayer = EffectLayerBase & {
  type: 'sprite';
  spriteId: string;
  width: number;
  height: number;
  tintColor?: string;
};

export type EffectLayer =
  | OrbLayer
  | TrailLayer
  | RingLayer
  | StreakLayer
  | DiamondLayer
  | ArcLayer
  | StarburstLayer
  | SpriteLayer;

export type EffectMotion = {
  mode: 'fixed' | 'line' | 'path';
  tracks?: Pick<EffectTrackMap, 'travel' | 'x' | 'y'>;
};

export type EffectAsset = {
  id: string;
  label: string;
  durationMs: number;
  loop?: boolean;
  motion?: EffectMotion;
  layers: EffectLayer[];
};
