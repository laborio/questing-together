export type EffectKeyframe = {
  at: number;
  value: number;
};

export type EffectTrackName = 'x' | 'y' | 'scale' | 'alpha' | 'glow' | 'travel';

export type EffectTrackMap = Partial<Record<EffectTrackName, EffectKeyframe[]>>;
export type EffectDynamicTrackMap = Record<string, EffectKeyframe[]>;
export type ShaderUniformValue = number | number[];

type EffectLayerBase = {
  id: string;
  layerLifetimeMs?: number;
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

export type RadialGradientLayer = EffectLayerBase & {
  type: 'radialGradient';
  radius: number;
  color: string;
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

export type PrimitiveLayerType =
  | 'orb'
  | 'ring'
  | 'radialGradient'
  | 'streak'
  | 'diamond'
  | 'arc'
  | 'starburst'
  | 'sprite';

export type ParticleEmitterRenderMode = PrimitiveLayerType;
export type ParticleEmitterShape = 'point' | 'circle' | 'rectangle';

export type ParticleEmitterLayer = EffectLayerBase & {
  type: 'particleEmitter';
  renderer: ParticleEmitterRenderMode;
  color: string;
  color2?: string;
  spriteId?: string;
  tintColor?: string;
  tintColor2?: string;
  maxParticles: number;
  emissionRate: number;
  burstCount?: number;
  particleLifetimeMs: number;
  particleLifetimeMaxMs?: number;
  speed: number;
  speedMax?: number;
  speedJitter?: number;
  velocityX?: number;
  velocityY?: number;
  spreadDeg: number;
  directionDeg?: number;
  startSize: number;
  startSizeMax?: number;
  emitterShape?: ParticleEmitterShape;
  emitterRadius?: number;
  emitterWidth?: number;
  emitterHeight?: number;
  endSize?: number;
  startAlpha?: number;
  endAlpha?: number;
  gravityX?: number;
  gravityY?: number;
  drag?: number;
  rotationDeg?: number;
  rotationOverLifetimeDeg?: number;
  spinDeg?: number;
  emitterTracks?: EffectDynamicTrackMap;
  particleTracks?: EffectDynamicTrackMap;
};

export type ShaderLayerTarget = 'screen' | 'layer' | 'sprite';

export type ShaderLayer = EffectLayerBase & {
  type: 'shaderLayer';
  shaderId: string;
  target: ShaderLayerTarget;
  width?: number;
  height?: number;
  blendMode?: string;
  uniforms?: Record<string, ShaderUniformValue>;
  uniformTracks?: EffectDynamicTrackMap;
};

export type EffectLayer =
  | OrbLayer
  | TrailLayer
  | RingLayer
  | RadialGradientLayer
  | StreakLayer
  | DiamondLayer
  | ArcLayer
  | StarburstLayer
  | SpriteLayer
  | ParticleEmitterLayer
  | ShaderLayer;

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
