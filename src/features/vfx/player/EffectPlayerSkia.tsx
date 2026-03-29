import {
  BlendColor,
  Canvas,
  Circle,
  Group,
  Path,
  RoundedRect,
  type SkImage,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform, Image as RNImage, StyleSheet } from 'react-native';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import { getEffectPlaybackDurationMs } from '@/features/vfx/runtime/getEffectPlaybackDurationMs';
import {
  sampleLayerTrack,
  sampleMotionPosition,
  sampleTrack,
} from '@/features/vfx/runtime/sampleTrack';
import { getVfxSpriteSource } from '@/features/vfx/runtime/spriteRegistry';
import type {
  ArcLayer,
  DiamondLayer,
  EffectAsset,
  EffectLayer,
  OrbLayer,
  ParticleEmitterLayer,
  RingLayer,
  SpriteLayer,
  StarburstLayer,
  StreakLayer,
  TrailLayer,
} from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type EffectPlayerProps = {
  instance: EffectInstance;
  onComplete: (instanceId: string) => void;
  spriteImageCache?: Partial<Record<string, SkImage>>;
};

type SharedLayerMetrics = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  alpha: SharedValue<number>;
};

type SharedParticleMetrics = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  size: SharedValue<number>;
  alpha: SharedValue<number>;
  rotationDeg: SharedValue<number>;
};

function resolveSkiaDataSource(spriteId: string) {
  const source = getVfxSpriteSource(spriteId);

  if (!source) {
    return null;
  }

  if (typeof source === 'number' || typeof source === 'string') {
    return source;
  }

  if (Array.isArray(source)) {
    const first = source[0];
    if (!first) return null;
    return typeof first === 'number' ? first : (first.uri ?? null);
  }

  return RNImage.resolveAssetSource(source)?.uri ?? null;
}

function resolveSkiaPreloadUri(spriteId: string) {
  const source = getVfxSpriteSource(spriteId);

  if (!source) {
    return null;
  }

  if (typeof source === 'string') {
    return source;
  }

  if (typeof source === 'number') {
    return RNImage.resolveAssetSource(source)?.uri ?? null;
  }

  if (Array.isArray(source)) {
    const first = source[0];
    if (!first) return null;
    if (typeof first === 'number') {
      return RNImage.resolveAssetSource(first)?.uri ?? null;
    }
    return first.uri ?? null;
  }

  return RNImage.resolveAssetSource(source)?.uri ?? null;
}

function collectAssetSpriteIds(asset: EffectAsset) {
  const spriteIds = new Set<string>();

  for (const layer of asset.layers) {
    if (layer.type === 'sprite' && layer.spriteId) {
      spriteIds.add(layer.spriteId);
      continue;
    }

    if (layer.type === 'trail' && layer.style === 'sprite' && layer.spriteId) {
      spriteIds.add(layer.spriteId);
      continue;
    }

    if (layer.type === 'particleEmitter' && layer.renderer === 'sprite' && layer.spriteId) {
      spriteIds.add(layer.spriteId);
    }
  }

  return [...spriteIds];
}

function rotatePoint(x: number, y: number, angleRad: number) {
  'worklet';

  return {
    x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
    y: x * Math.sin(angleRad) + y * Math.cos(angleRad),
  };
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  'worklet';

  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function fract(value: number) {
  'worklet';

  return value - Math.floor(value);
}

function random01(seed: number) {
  'worklet';

  return fract(Math.sin(seed * 12.9898 + 78.233) * 43758.5453123);
}

function randomSigned(seed: number) {
  'worklet';

  return random01(seed) * 2 - 1;
}

function sampleDynamicTrackValue(
  trackMap: Record<string, { at: number; value: number }[]> | undefined,
  name: string,
  progress: number,
  fallback = 0,
) {
  'worklet';

  return sampleTrack(trackMap?.[name], progress, fallback);
}

function resolveEffectDurationMs(asset: EffectAsset, instance: EffectInstance) {
  'worklet';

  return Math.max(1, instance.durationMsOverride ?? asset.durationMs);
}

function getDefaultParticleRotationDeg(renderer: ParticleEmitterLayer['renderer']) {
  'worklet';

  return renderer === 'arc' || renderer === 'starburst' ? -90 : 0;
}

function sampleMotionHeadingDeg(asset: EffectAsset, instance: EffectInstance, progress: number) {
  'worklet';

  const current = sampleMotionPosition(asset, instance, progress);
  const next = sampleMotionPosition(asset, instance, Math.min(1, progress + 0.01));
  const dx = next.x - current.x;
  const dy = next.y - current.y;

  if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  return -90;
}

function resolveParticleBirthProgress(
  layer: ParticleEmitterLayer,
  effectDurationMs: number,
  index: number,
) {
  'worklet';

  const maxParticles = Math.max(1, Math.round(layer.maxParticles));
  const burstCount = Math.min(maxParticles, Math.max(0, Math.round(layer.burstCount ?? 0)));
  const durationSeconds = effectDurationMs / 1000;
  const continuousCapacity = Math.max(0, maxParticles - burstCount);
  const continuousCount =
    layer.emissionRate > 0
      ? Math.min(continuousCapacity, Math.max(1, Math.ceil(durationSeconds * layer.emissionRate)))
      : 0;

  if (index < burstCount) {
    const burstWindow = burstCount > 1 ? Math.min(0.08, Math.max(0.015, burstCount * 0.01)) : 0;
    return burstCount === 1 ? 0 : (index / Math.max(1, burstCount - 1)) * burstWindow;
  }

  const continuousIndex = index - burstCount;
  if (continuousIndex < 0 || continuousIndex >= continuousCount) {
    return null;
  }

  const continuousStart = burstCount > 0 ? Math.min(0.14, Math.max(0.02, burstCount * 0.012)) : 0;
  return continuousCount === 1
    ? continuousStart
    : continuousStart + (continuousIndex / continuousCount) * (1 - continuousStart);
}

function sampleParticleState(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: ParticleEmitterLayer,
  progress: number,
  elapsedMs: number,
  index: number,
) {
  'worklet';

  const effectDurationMs = resolveEffectDurationMs(asset, instance);
  const birthProgress = resolveParticleBirthProgress(layer, effectDurationMs, index);
  const defaultRotationDeg = getDefaultParticleRotationDeg(layer.renderer);

  if (birthProgress == null) {
    return {
      x: instance.x,
      y: instance.y,
      size: 0,
      alpha: 0,
      rotationDeg: layer.rotationDeg ?? defaultRotationDeg,
    };
  }

  const lifetimeMs = Math.max(
    1,
    sampleDynamicTrackValue(
      layer.emitterTracks,
      'particleLifetimeMs',
      birthProgress,
      layer.particleLifetimeMs,
    ),
  );
  const birthMs = birthProgress * effectDurationMs;
  const ageMs = elapsedMs - birthMs;

  if (ageMs < 0 || ageMs > lifetimeMs) {
    return {
      x: instance.x,
      y: instance.y,
      size: 0,
      alpha: 0,
      rotationDeg: layer.rotationDeg ?? defaultRotationDeg,
    };
  }

  const lifeProgress = Math.max(0, Math.min(1, ageMs / lifetimeMs));
  const ageSeconds = ageMs / 1000;
  const origin = sampleMotionPosition(asset, instance, birthProgress);
  const originX = origin.x + sampleLayerTrack(layer, 'x', birthProgress, 0);
  const originY = origin.y + sampleLayerTrack(layer, 'y', birthProgress, 0);
  const directionDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'directionDeg',
    birthProgress,
    layer.directionDeg ?? sampleMotionHeadingDeg(asset, instance, birthProgress),
  );
  const spreadDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'spreadDeg',
    birthProgress,
    layer.spreadDeg,
  );
  const speed = Math.max(
    0,
    sampleDynamicTrackValue(layer.emitterTracks, 'speed', birthProgress, layer.speed) +
      randomSigned(index * 37.11 + birthProgress * 997.1) *
        sampleDynamicTrackValue(
          layer.emitterTracks,
          'speedJitter',
          birthProgress,
          layer.speedJitter ?? 0,
        ),
  );
  const gravityX = sampleDynamicTrackValue(
    layer.emitterTracks,
    'gravityX',
    birthProgress,
    layer.gravityX ?? 0,
  );
  const gravityY = sampleDynamicTrackValue(
    layer.emitterTracks,
    'gravityY',
    birthProgress,
    layer.gravityY ?? 0,
  );
  const drag = Math.max(
    0,
    sampleDynamicTrackValue(layer.emitterTracks, 'drag', birthProgress, layer.drag ?? 0),
  );
  const angleRad =
    ((directionDeg + randomSigned(index * 83.17 + 11.9) * spreadDeg * 0.5) * Math.PI) / 180;
  const travelTime = drag > 0 ? (1 - Math.exp(-drag * ageSeconds)) / drag : ageSeconds;
  const offsetX = sampleDynamicTrackValue(layer.particleTracks, 'x', lifeProgress, 0);
  const offsetY = sampleDynamicTrackValue(layer.particleTracks, 'y', lifeProgress, 0);
  const startSize = sampleDynamicTrackValue(
    layer.emitterTracks,
    'startSize',
    birthProgress,
    layer.startSize,
  );
  const endSize = sampleDynamicTrackValue(
    layer.emitterTracks,
    'endSize',
    birthProgress,
    layer.endSize ?? startSize,
  );
  const startAlpha = sampleDynamicTrackValue(
    layer.emitterTracks,
    'startAlpha',
    birthProgress,
    layer.startAlpha ?? 1,
  );
  const endAlpha = sampleDynamicTrackValue(
    layer.emitterTracks,
    'endAlpha',
    birthProgress,
    layer.endAlpha ?? 0,
  );
  const size = Math.max(
    0.5,
    (startSize + (endSize - startSize) * lifeProgress) *
      sampleDynamicTrackValue(layer.particleTracks, 'scale', lifeProgress, 1),
  );
  const alpha = Math.max(
    0,
    sampleLayerTrack(layer, 'alpha', progress, 1) *
      (startAlpha + (endAlpha - startAlpha) * lifeProgress) *
      sampleDynamicTrackValue(layer.particleTracks, 'alpha', lifeProgress, 1),
  );
  const rotationDeg =
    sampleDynamicTrackValue(
      layer.emitterTracks,
      'rotationDeg',
      birthProgress,
      layer.rotationDeg ?? defaultRotationDeg,
    ) +
    sampleDynamicTrackValue(layer.emitterTracks, 'spinDeg', birthProgress, layer.spinDeg ?? 0) *
      ageSeconds +
    sampleDynamicTrackValue(layer.particleTracks, 'rotationDeg', lifeProgress, 0);

  return {
    x:
      originX +
      Math.cos(angleRad) * speed * travelTime +
      0.5 * gravityX * ageSeconds * ageSeconds +
      offsetX,
    y:
      originY +
      Math.sin(angleRad) * speed * travelTime +
      0.5 * gravityY * ageSeconds * ageSeconds +
      offsetY,
    size,
    alpha,
    rotationDeg,
  };
}

function useLayerMetrics(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: EffectLayer,
  progress: SharedValue<number>,
): SharedLayerMetrics {
  const x = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    return base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
  });

  const y = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    return base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
  });

  const scale = useDerivedValue(() => sampleLayerTrack(layer, 'scale', progress.value, 1));
  const alpha = useDerivedValue(() =>
    Math.max(0, sampleLayerTrack(layer, 'alpha', progress.value, 1)),
  );

  return { x, y, scale, alpha };
}

function useParticleMetrics(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: ParticleEmitterLayer,
  progress: SharedValue<number>,
  elapsedMs: SharedValue<number>,
  index: number,
): SharedParticleMetrics {
  const state = useDerivedValue(() =>
    sampleParticleState(asset, instance, layer, progress.value, elapsedMs.value, index),
  );

  const x = useDerivedValue(() => state.value.x);
  const y = useDerivedValue(() => state.value.y);
  const size = useDerivedValue(() => state.value.size);
  const alpha = useDerivedValue(() => state.value.alpha);
  const rotationDeg = useDerivedValue(() => state.value.rotationDeg);

  return { x, y, size, alpha, rotationDeg };
}

const OrbPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: OrbLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const glow = useDerivedValue(() => sampleLayerTrack(layer, 'glow', progress.value, 0));
  const glowRadius = useDerivedValue(
    () => layer.radius * scale.value * (layer.glowScale ?? 2.3) * (1 + glow.value * 0.45),
  );
  const glowOpacity = useDerivedValue(() => Math.max(0, alpha.value * (0.18 + glow.value * 0.35)));
  const coreRadius = useDerivedValue(() => Math.max(1, layer.radius * scale.value));

  return (
    <>
      <Circle
        cx={x}
        cy={y}
        r={glowRadius}
        color={layer.glowColor ?? layer.color}
        opacity={glowOpacity}
      />
      <Circle cx={x} cy={y} r={coreRadius} color={layer.color} opacity={alpha} />
    </>
  );
};

const RingPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: RingLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const radius = useDerivedValue(() => Math.max(0.5, layer.radius * scale.value));
  const strokeWidth = useDerivedValue(() => Math.max(1, layer.thickness * scale.value));

  return (
    <Circle
      cx={x}
      cy={y}
      r={radius}
      color={layer.color}
      opacity={alpha}
      style="stroke"
      strokeWidth={strokeWidth}
    />
  );
};

const StreakPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: StreakLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const width = useDerivedValue(() => Math.max(1, layer.width * scale.value));
  const height = useDerivedValue(() => Math.max(1, layer.height * scale.value));
  const rectX = useDerivedValue(() => x.value - width.value / 2);
  const rectY = useDerivedValue(() => y.value - height.value / 2);
  const radius = useDerivedValue(() => height.value / 2);
  const origin = useDerivedValue(() => ({ x: x.value, y: y.value }));
  const rotationRad = ((layer.rotationDeg ?? 0) * Math.PI) / 180;

  return (
    <Group origin={origin} transform={[{ rotate: rotationRad }]} opacity={alpha}>
      <RoundedRect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        r={radius}
        color={layer.color}
      />
    </Group>
  );
};

const DiamondPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: DiamondLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const path = useDerivedValue(() => {
    const halfWidth = Math.max(1, (layer.width * scale.value) / 2);
    const halfHeight = Math.max(1, (layer.height * scale.value) / 2);
    const angleRad = ((layer.rotationDeg ?? 0) * Math.PI) / 180;
    const points = [
      { x: 0, y: -halfHeight },
      { x: halfWidth, y: 0 },
      { x: 0, y: halfHeight },
      { x: -halfWidth, y: 0 },
    ]
      .map((point) => rotatePoint(point.x, point.y, angleRad))
      .map((point) => ({ x: x.value + point.x, y: y.value + point.y }));

    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
  });

  return <Path path={path} color={layer.color} opacity={alpha} />;
};

const ArcPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ArcLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const path = useDerivedValue(() => {
    const radius = Math.max(1, layer.radius * scale.value);
    const startAngle = (layer.rotationDeg ?? -90) - layer.sweepDeg / 2;
    const endAngle = startAngle + layer.sweepDeg;
    const start = polarToCartesian(x.value, y.value, radius, startAngle);
    const end = polarToCartesian(x.value, y.value, radius, endAngle);
    const largeArcFlag = layer.sweepDeg > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  });
  const strokeWidth = useDerivedValue(() => Math.max(1, layer.thickness * scale.value));

  return (
    <Path
      path={path}
      color={layer.color}
      opacity={alpha}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
    />
  );
};

const StarburstPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: StarburstLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const path = useDerivedValue(() => {
    const innerRadius = Math.max(0.5, layer.innerRadius * scale.value);
    const outerRadius = Math.max(innerRadius + 0.5, layer.outerRadius * scale.value);
    const points = Math.max(3, Math.round(layer.points));
    const rotationRad = ((layer.rotationDeg ?? -90) * Math.PI) / 180;
    const vertices = Array.from({ length: points * 2 }, (_, index) => {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotationRad + (Math.PI * index) / points;
      return {
        x: x.value + radius * Math.cos(angle),
        y: y.value + radius * Math.sin(angle),
      };
    });

    return vertices
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
      .concat(' Z');
  });

  return <Path path={path} color={layer.color} opacity={alpha} />;
};

const SpriteNodeSkia = ({
  spriteId,
  x,
  y,
  width,
  height,
  opacity,
  tintColor,
  rotationDeg,
  imageOverride,
}: {
  spriteId: string;
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
  tintColor?: string;
  rotationDeg?: number;
  imageOverride?: SkImage | null;
}) => {
  const dataSource = useMemo(() => resolveSkiaDataSource(spriteId), [spriteId]);
  const loadedImage = useImage(imageOverride ? null : dataSource);
  const image = imageOverride ?? loadedImage;
  const left = useDerivedValue(() => x.value - width.value / 2);
  const top = useDerivedValue(() => y.value - height.value / 2);
  const origin = useDerivedValue(() => ({ x: x.value, y: y.value }));
  const rotationRad = ((rotationDeg ?? 0) * Math.PI) / 180;

  if (!image) {
    return null;
  }

  return (
    <Group origin={origin} transform={[{ rotate: rotationRad }]} opacity={opacity}>
      <SkiaImage image={image} x={left} y={top} width={width} height={height} fit="fill">
        {tintColor ? <BlendColor color={tintColor} mode="srcIn" /> : null}
      </SkiaImage>
    </Group>
  );
};

const SpritePrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: SpriteLayer;
  progress: SharedValue<number>;
  spriteImageCache?: Partial<Record<string, SkImage>>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const width = useDerivedValue(() => Math.max(1, layer.width * scale.value));
  const height = useDerivedValue(() => Math.max(1, layer.height * scale.value));

  return (
    <SpriteNodeSkia
      spriteId={layer.spriteId}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={alpha}
      tintColor={layer.tintColor}
      imageOverride={spriteImageCache?.[layer.spriteId]}
    />
  );
};

const ParticleOrbNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const radius = useDerivedValue(() => Math.max(0.5, size.value / 2));

  return <Circle cx={x} cy={y} r={radius} color={layer.color} opacity={alpha} />;
};

const ParticleRingNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const radius = useDerivedValue(() => Math.max(0.5, size.value / 2));
  const strokeWidth = useDerivedValue(() => Math.max(1, size.value * 0.12));

  return (
    <Circle
      cx={x}
      cy={y}
      r={radius}
      color={layer.color}
      opacity={alpha}
      style="stroke"
      strokeWidth={strokeWidth}
    />
  );
};

const ParticleStreakNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const path = useDerivedValue(() => {
    const halfLength = Math.max(0.5, size.value / 2);
    const angleRad = (rotationDeg.value * Math.PI) / 180;
    const dx = Math.cos(angleRad) * halfLength;
    const dy = Math.sin(angleRad) * halfLength;

    return `M ${x.value - dx} ${y.value - dy} L ${x.value + dx} ${y.value + dy}`;
  });
  const strokeWidth = useDerivedValue(() => Math.max(1, size.value * 0.28));

  return (
    <Path
      path={path}
      color={layer.color}
      opacity={alpha}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
    />
  );
};

const ParticleDiamondNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const path = useDerivedValue(() => {
    const halfWidth = Math.max(1, size.value * 0.42);
    const halfHeight = Math.max(1, size.value / 2);
    const angleRad = (rotationDeg.value * Math.PI) / 180;
    const points = [
      { x: 0, y: -halfHeight },
      { x: halfWidth, y: 0 },
      { x: 0, y: halfHeight },
      { x: -halfWidth, y: 0 },
    ]
      .map((point) => rotatePoint(point.x, point.y, angleRad))
      .map((point) => ({ x: x.value + point.x, y: y.value + point.y }));

    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
  });

  return <Path path={path} color={layer.color} opacity={alpha} />;
};

const ParticleArcNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const path = useDerivedValue(() => {
    const radius = Math.max(1, size.value / 2);
    const sweepDeg = 130;
    const startAngle = rotationDeg.value - sweepDeg / 2;
    const endAngle = startAngle + sweepDeg;
    const start = polarToCartesian(x.value, y.value, radius, startAngle);
    const end = polarToCartesian(x.value, y.value, radius, endAngle);

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
  });
  const strokeWidth = useDerivedValue(() => Math.max(1, size.value * 0.1));

  return (
    <Path
      path={path}
      color={layer.color}
      opacity={alpha}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
    />
  );
};

const ParticleStarburstNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );
  const path = useDerivedValue(() => {
    const innerRadius = Math.max(0.5, size.value * 0.21);
    const outerRadius = Math.max(innerRadius + 0.5, size.value / 2);
    const pointCount = 6;
    const rotationRad = (rotationDeg.value * Math.PI) / 180;
    const vertices = Array.from({ length: pointCount * 2 }, (_, pointIndex) => {
      const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotationRad + (Math.PI * pointIndex) / pointCount;
      return {
        x: x.value + radius * Math.cos(angle),
        y: y.value + radius * Math.sin(angle),
      };
    });

    return vertices
      .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
      .concat(' Z');
  });

  return <Path path={path} color={layer.color} opacity={alpha} />;
};

const ParticleSpriteNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
  spriteImageCache?: Partial<Record<string, SkImage>>;
}) => {
  const { x, y, size, alpha } = useParticleMetrics(
    asset,
    instance,
    layer,
    progress,
    elapsedMs,
    index,
  );

  return (
    <SpriteNodeSkia
      spriteId={layer.spriteId ?? ''}
      x={x}
      y={y}
      width={size}
      height={size}
      opacity={alpha}
      tintColor={layer.tintColor}
      imageOverride={layer.spriteId ? spriteImageCache?.[layer.spriteId] : undefined}
    />
  );
};

const ParticleNodeSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  index,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  index: number;
  spriteImageCache?: Partial<Record<string, SkImage>>;
}) => {
  switch (layer.renderer) {
    case 'sprite':
      return (
        <ParticleSpriteNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
          spriteImageCache={spriteImageCache}
        />
      );
    case 'ring':
      return (
        <ParticleRingNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
    case 'streak':
      return (
        <ParticleStreakNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
    case 'diamond':
      return (
        <ParticleDiamondNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
    case 'arc':
      return (
        <ParticleArcNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
    case 'starburst':
      return (
        <ParticleStarburstNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
    default:
      return (
        <ParticleOrbNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
        />
      );
  }
};

const ParticleEmitterPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
  elapsedMs,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  progress: SharedValue<number>;
  elapsedMs: SharedValue<number>;
  spriteImageCache?: Partial<Record<string, SkImage>>;
}) => {
  const particleCount = Math.max(1, Math.round(layer.maxParticles));

  return (
    <>
      {Array.from({ length: particleCount }, (_, index) => (
        <ParticleNodeSkia
          key={`${layer.id}-particle-${index}`}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          index={index}
          spriteImageCache={spriteImageCache}
        />
      ))}
    </>
  );
};

type TrailSegmentMetrics = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  sizeFactor: SharedValue<number>;
  opacity: SharedValue<number>;
};

function useTrailSegmentMetrics(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: TrailLayer,
  progress: SharedValue<number>,
  index: number,
): TrailSegmentMetrics {
  const segmentProgress = useDerivedValue(() =>
    Math.max(0, progress.value - index * layer.spacing),
  );
  const x = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, segmentProgress.value);
    return base.x + sampleLayerTrack(layer, 'x', segmentProgress.value, 0);
  });
  const y = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, segmentProgress.value);
    return base.y + sampleLayerTrack(layer, 'y', segmentProgress.value, 0);
  });
  const scale = useDerivedValue(() => sampleLayerTrack(layer, 'scale', segmentProgress.value, 1));
  const sizeFactor = useDerivedValue(() => Math.max(0.1, 1 - index * (layer.falloff ?? 0.1)));
  const opacity = useDerivedValue(() => {
    const alpha = sampleLayerTrack(layer, 'alpha', segmentProgress.value, 1);
    const falloff = layer.falloff ?? 0.1;
    return Math.max(0, alpha * (0.65 - index * (falloff * 0.9)));
  });

  return { x, y, scale, sizeFactor, opacity };
}

const TrailFillSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const radius = useDerivedValue(() => Math.max(1, layer.radius * scale.value * sizeFactor.value));

  return <Circle cx={x} cy={y} r={radius} color={layer.color} opacity={opacity} />;
};

const TrailRingSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const radius = useDerivedValue(() => Math.max(1, layer.radius * scale.value * sizeFactor.value));
  const strokeWidth = useDerivedValue(() =>
    Math.max(1, (layer.thickness ?? 2.5) * scale.value * sizeFactor.value),
  );

  return (
    <Circle
      cx={x}
      cy={y}
      r={radius}
      color={layer.color}
      opacity={opacity}
      style="stroke"
      strokeWidth={strokeWidth}
    />
  );
};

const TrailSpriteSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const width = useDerivedValue(() =>
    Math.max(1, (layer.width ?? layer.radius * 2) * scale.value * sizeFactor.value),
  );
  const height = useDerivedValue(() =>
    Math.max(1, (layer.height ?? layer.radius * 2) * scale.value * sizeFactor.value),
  );

  return (
    <SpriteNodeSkia
      spriteId={layer.spriteId ?? ''}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={opacity}
      tintColor={layer.tintColor}
      rotationDeg={layer.rotationDeg}
    />
  );
};

const TrailStreakSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const width = useDerivedValue(() =>
    Math.max(1, (layer.width ?? 36) * scale.value * sizeFactor.value),
  );
  const height = useDerivedValue(() =>
    Math.max(1, (layer.height ?? 10) * scale.value * sizeFactor.value),
  );
  const left = useDerivedValue(() => x.value - width.value / 2);
  const top = useDerivedValue(() => y.value - height.value / 2);
  const radius = useDerivedValue(() => height.value / 2);
  const origin = useDerivedValue(() => ({ x: x.value, y: y.value }));
  const rotationRad = ((layer.rotationDeg ?? -24) * Math.PI) / 180;

  return (
    <Group origin={origin} transform={[{ rotate: rotationRad }]} opacity={opacity}>
      <RoundedRect x={left} y={top} width={width} height={height} r={radius} color={layer.color} />
    </Group>
  );
};

const TrailDiamondSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const path = useDerivedValue(() => {
    const halfWidth = Math.max(1, ((layer.width ?? 24) * scale.value * sizeFactor.value) / 2);
    const halfHeight = Math.max(1, ((layer.height ?? 28) * scale.value * sizeFactor.value) / 2);
    const angle = ((layer.rotationDeg ?? 0) * Math.PI) / 180;
    const points = [
      rotatePoint(0, -halfHeight, angle),
      rotatePoint(halfWidth, 0, angle),
      rotatePoint(0, halfHeight, angle),
      rotatePoint(-halfWidth, 0, angle),
    ].map((point) => ({ x: x.value + point.x, y: y.value + point.y }));

    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
  });

  return <Path path={path} color={layer.color} opacity={opacity} />;
};

const TrailArcSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const path = useDerivedValue(() => {
    const radius = Math.max(1, (layer.radius ?? 12) * scale.value * sizeFactor.value);
    const sweepDeg = layer.sweepDeg ?? 130;
    const startAngle = (layer.rotationDeg ?? -90) - sweepDeg / 2;
    const endAngle = startAngle + sweepDeg;
    const start = polarToCartesian(x.value, y.value, radius, startAngle);
    const end = polarToCartesian(x.value, y.value, radius, endAngle);

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
  });
  const strokeWidth = useDerivedValue(() =>
    Math.max(1, (layer.thickness ?? 3) * scale.value * sizeFactor.value),
  );

  return (
    <Path
      path={path}
      color={layer.color}
      opacity={opacity}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
    />
  );
};

const TrailStarburstSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const { x, y, scale, sizeFactor, opacity } = useTrailSegmentMetrics(
    asset,
    instance,
    layer,
    progress,
    index,
  );
  const path = useDerivedValue(() => {
    const innerRadius = Math.max(0.5, (layer.innerRadius ?? 6) * scale.value * sizeFactor.value);
    const outerRadius = Math.max(
      innerRadius + 0.5,
      (layer.outerRadius ?? 14) * scale.value * sizeFactor.value,
    );
    const pointCount = Math.max(3, Math.round(layer.points ?? 6));
    const rotation = ((layer.rotationDeg ?? -90) * Math.PI) / 180;
    const points = Array.from({ length: pointCount * 2 }, (_, pointIndex) => {
      const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotation + (Math.PI * pointIndex) / pointCount;
      return {
        x: x.value + radius * Math.cos(angle),
        y: y.value + radius * Math.sin(angle),
      };
    });

    return points
      .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
      .concat(' Z');
  });

  return <Path path={path} color={layer.color} opacity={opacity} />;
};

const TrailSegmentSkia = ({
  asset,
  instance,
  layer,
  progress,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
}) => {
  const style = layer.style ?? 'fill';

  if (style === 'ring') {
    return (
      <TrailRingSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  if (style === 'sprite') {
    return (
      <TrailSpriteSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  if (style === 'streak') {
    return (
      <TrailStreakSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  if (style === 'diamond') {
    return (
      <TrailDiamondSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  if (style === 'arc') {
    return (
      <TrailArcSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  if (style === 'starburst') {
    return (
      <TrailStarburstSegmentSkia
        asset={asset}
        instance={instance}
        layer={layer}
        progress={progress}
        index={index}
      />
    );
  }

  return (
    <TrailFillSegmentSkia
      asset={asset}
      instance={instance}
      layer={layer}
      progress={progress}
      index={index}
    />
  );
};

const TrailPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
}) => {
  return (
    <>
      {Array.from({ length: layer.segments }, (_, index) => (
        <TrailSegmentSkia
          key={`${layer.id}-${index}`}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          index={index}
        />
      ))}
    </>
  );
};

function renderLayer(
  layer: EffectLayer,
  instance: EffectInstance,
  progress: SharedValue<number>,
  elapsedMs: SharedValue<number>,
  coreLayerOpacity: SharedValue<number>,
  spriteImageCache?: Partial<Record<string, SkImage>>,
) {
  const asset = getEffectAsset(instance.assetId);

  if (!asset) return null;

  const wrapCoreLayer = (content: ReactNode) => (
    <Group key={layer.id} opacity={coreLayerOpacity}>
      {content}
    </Group>
  );

  switch (layer.type) {
    case 'orb':
      return wrapCoreLayer(
        <OrbPrimitiveSkia asset={asset} instance={instance} layer={layer} progress={progress} />,
      );
    case 'ring':
      return wrapCoreLayer(
        <RingPrimitiveSkia asset={asset} instance={instance} layer={layer} progress={progress} />,
      );
    case 'streak':
      return wrapCoreLayer(
        <StreakPrimitiveSkia asset={asset} instance={instance} layer={layer} progress={progress} />,
      );
    case 'diamond':
      return wrapCoreLayer(
        <DiamondPrimitiveSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />,
      );
    case 'arc':
      return wrapCoreLayer(
        <ArcPrimitiveSkia asset={asset} instance={instance} layer={layer} progress={progress} />,
      );
    case 'starburst':
      return wrapCoreLayer(
        <StarburstPrimitiveSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />,
      );
    case 'trail':
      return wrapCoreLayer(
        <TrailPrimitiveSkia asset={asset} instance={instance} layer={layer} progress={progress} />,
      );
    case 'sprite':
      return wrapCoreLayer(
        <SpritePrimitiveSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          spriteImageCache={spriteImageCache}
        />,
      );
    case 'particleEmitter':
      return (
        <ParticleEmitterPrimitiveSkia
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
          elapsedMs={elapsedMs}
          spriteImageCache={spriteImageCache}
        />
      );
    case 'shaderLayer':
      return null;
  }
}

const EffectPlayerSkia = ({ instance, onComplete, spriteImageCache }: EffectPlayerProps) => {
  const progress = useSharedValue(0);
  const elapsedMs = useSharedValue(0);
  const renderOpacity = useSharedValue(0);
  const asset = getEffectAsset(instance.assetId);
  const spriteIds = useMemo(() => (asset ? collectAssetSpriteIds(asset) : []), [asset]);
  const allSpritesCached = spriteIds.every((spriteId) => spriteImageCache?.[spriteId]);
  const [spritesReady, setSpritesReady] = useState(spriteIds.length === 0 || allSpritesCached);
  const shouldLoop = instance.loopOverride ?? asset?.loop ?? false;
  const animationDurationMs = Math.max(1, instance.durationMsOverride ?? asset?.durationMs ?? 1);
  const playbackDurationMs =
    asset && !shouldLoop
      ? getEffectPlaybackDurationMs(asset, instance.durationMsOverride, true)
      : animationDurationMs;
  const coreLayerOpacity = useDerivedValue<number>(() =>
    shouldLoop || elapsedMs.value <= animationDurationMs ? 1 : 0,
  );

  useEffect(() => {
    if (!asset) {
      setSpritesReady(true);
      return;
    }

    if (spriteIds.length === 0 || allSpritesCached) {
      setSpritesReady(true);
      return;
    }

    let cancelled = false;
    setSpritesReady(false);

    void Promise.all(
      spriteIds.map(async (spriteId) => {
        const uri = resolveSkiaPreloadUri(spriteId);
        if (!uri) {
          return;
        }

        try {
          await RNImage.prefetch(uri);
        } catch (error) {
          console.warn(`Could not preload VFX sprite "${spriteId}".`, error);
        }
      }),
    ).then(() => {
      if (!cancelled) {
        setSpritesReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [allSpritesCached, asset, spriteIds]);

  useEffect(() => {
    if (!asset || !spritesReady) {
      cancelAnimation(progress);
      cancelAnimation(elapsedMs);
      progress.value = 0;
      elapsedMs.value = 0;
      renderOpacity.value = 0;
      return;
    }

    cancelAnimation(progress);
    cancelAnimation(elapsedMs);
    progress.value = 0;
    elapsedMs.value = 0;
    renderOpacity.value = spriteIds.length === 0 ? 1 : 0;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let frameOne: number | null = null;
    let frameTwo: number | null = null;
    let cancelled = false;

    const startPlayback = () => {
      if (cancelled) {
        return;
      }

      renderOpacity.value = 1;

      if (shouldLoop) {
        progress.value = withRepeat(
          withTiming(1, { duration: animationDurationMs, easing: Easing.linear }),
          -1,
          false,
        );
        elapsedMs.value = withRepeat(
          withTiming(animationDurationMs, {
            duration: animationDurationMs,
            easing: Easing.linear,
          }),
          -1,
          false,
        );
        return;
      }

      progress.value = withTiming(1, { duration: animationDurationMs, easing: Easing.linear });
      elapsedMs.value = withTiming(playbackDurationMs, {
        duration: playbackDurationMs,
        easing: Easing.linear,
      });

      timeoutId = setTimeout(() => {
        onComplete(instance.instanceId);
      }, playbackDurationMs + 32);
    };

    if (spriteIds.length > 0) {
      frameOne = requestAnimationFrame(() => {
        frameTwo = requestAnimationFrame(startPlayback);
      });
    } else {
      startPlayback();
    }

    return () => {
      cancelled = true;
      if (frameOne != null) {
        cancelAnimationFrame(frameOne);
      }
      if (frameTwo != null) {
        cancelAnimationFrame(frameTwo);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cancelAnimation(progress);
      cancelAnimation(elapsedMs);
      renderOpacity.value = 0;
    };
  }, [
    asset,
    animationDurationMs,
    elapsedMs,
    instance.instanceId,
    onComplete,
    playbackDurationMs,
    progress,
    renderOpacity,
    shouldLoop,
    spriteIds.length,
    spritesReady,
  ]);

  if (!asset) return null;

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Group opacity={renderOpacity}>
        {asset.layers.map((layer) =>
          renderLayer(layer, instance, progress, elapsedMs, coreLayerOpacity, spriteImageCache),
        )}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});

export const canUseSkiaRenderer = Platform.OS !== 'web';

export default EffectPlayerSkia;
