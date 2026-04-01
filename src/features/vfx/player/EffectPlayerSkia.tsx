import {
  BlendColor,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  RoundedRect,
  type SkImage,
  Image as SkiaImage,
  useImage,
  vec,
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
  RadialGradientLayer,
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
  active?: boolean;
};

type SharedLayerMetrics = {
  progress: SharedValue<number>;
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
  color: SharedValue<string>;
};

type ResolvedParticleStaticState = {
  active: boolean;
  defaultX: number;
  defaultY: number;
  hiddenRotationDeg: number;
  birthMs: number;
  lifetimeMs: number;
  originX: number;
  originY: number;
  velocityX: number;
  velocityY: number;
  gravityX: number;
  gravityY: number;
  drag: number;
  startSize: number;
  startAlpha: number;
  endAlpha: number;
  hasScaleTrack: boolean;
  hasAlphaTrack: boolean;
  hasOffsetXTrack: boolean;
  hasOffsetYTrack: boolean;
  hasRotationTrack: boolean;
  legacyEndSize: number;
  baseRotationDeg: number;
  rotationOverLifetimeDeg: number;
  spinDeg: number;
  color: string;
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

function resolveLayerTimelineProgress(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: EffectLayer,
  progress: number,
) {
  'worklet';

  const lifetimeMs = Number.isFinite(Number(layer.layerLifetimeMs))
    ? Math.max(1, Number(layer.layerLifetimeMs))
    : null;

  if (!lifetimeMs) {
    return Math.max(0, Math.min(1, progress));
  }

  const effectDurationMs = resolveEffectDurationMs(asset, instance);
  const lifetimeProgress = Math.min(1, lifetimeMs / effectDurationMs);

  if (progress > lifetimeProgress) {
    return null;
  }

  return Math.max(0, Math.min(1, progress / lifetimeProgress));
}

function getDefaultParticleRotationDeg(renderer: ParticleEmitterLayer['renderer']) {
  'worklet';

  return renderer === 'arc' || renderer === 'starburst' ? -90 : 0;
}

function hasDynamicTrack(
  trackMap: Record<string, { at: number; value: number }[]> | undefined,
  name: string,
) {
  'worklet';

  return Boolean(trackMap?.[name]?.length);
}

function sampleRandomRange(minValue: number, maxValue: number, seed: number) {
  'worklet';

  const low = Math.min(minValue, maxValue);
  const high = Math.max(minValue, maxValue);
  return low === high ? low : low + (high - low) * random01(seed);
}

function parseColorToRgba(color: string | undefined) {
  'worklet';

  if (typeof color !== 'string') {
    return null;
  }

  const value = color.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const expanded = hex
        .split('')
        .map((part) => part + part)
        .join('');
      const red = Number.parseInt(expanded.slice(0, 2), 16);
      const green = Number.parseInt(expanded.slice(2, 4), 16);
      const blue = Number.parseInt(expanded.slice(4, 6), 16);
      const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
      return { red, green, blue, alpha };
    }

    if (hex.length === 6 || hex.length === 8) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { red, green, blue, alpha };
    }
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );

  if (!rgbMatch) {
    return null;
  }

  return {
    red: Math.max(0, Math.min(255, Number(rgbMatch[1]))),
    green: Math.max(0, Math.min(255, Number(rgbMatch[2]))),
    blue: Math.max(0, Math.min(255, Number(rgbMatch[3]))),
    alpha: rgbMatch[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgbMatch[4]))),
  };
}

function rgbaToCssColor({
  red,
  green,
  blue,
  alpha,
}: {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}) {
  'worklet';

  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${Number(safeAlpha.toFixed(3))})`;
}

function mixColors(colorA: string, colorB: string, amount: number) {
  'worklet';

  const start = parseColorToRgba(colorA);
  const end = parseColorToRgba(colorB);

  if (start && end) {
    return rgbaToCssColor({
      red: start.red + (end.red - start.red) * amount,
      green: start.green + (end.green - start.green) * amount,
      blue: start.blue + (end.blue - start.blue) * amount,
      alpha: start.alpha + (end.alpha - start.alpha) * amount,
    });
  }

  return amount < 0.5 ? colorA : colorB;
}

function transparentizeColor(color: string) {
  'worklet';

  const parsed = parseColorToRgba(color);
  if (!parsed) {
    return 'rgba(255, 255, 255, 0)';
  }

  return rgbaToCssColor({
    red: parsed.red,
    green: parsed.green,
    blue: parsed.blue,
    alpha: 0,
  });
}

function normalizeParticleEmitterShape(shape: ParticleEmitterLayer['emitterShape']) {
  'worklet';

  return shape === 'circle' || shape === 'rectangle' ? shape : 'point';
}

function getParticleColorRange(layer: ParticleEmitterLayer) {
  'worklet';

  if (layer.renderer === 'sprite') {
    const firstTint = typeof layer.tintColor === 'string' ? layer.tintColor.trim() : '';
    const secondTint = typeof layer.tintColor2 === 'string' ? layer.tintColor2.trim() : '';
    const colorA = firstTint || secondTint || '';
    const colorB = secondTint || firstTint || '';
    return { colorA, colorB };
  }

  const firstColor =
    typeof layer.color === 'string' && layer.color.trim() ? layer.color : '#ffffff';
  const secondColor =
    typeof layer.color2 === 'string' && layer.color2.trim() ? layer.color2 : firstColor;
  const colorA = firstColor;
  const colorB = secondColor;
  return { colorA, colorB };
}

function sampleParticleRenderColor(layer: ParticleEmitterLayer, seed: number) {
  'worklet';

  const { colorA, colorB } = getParticleColorRange(layer);

  if (!colorA && !colorB) {
    return '';
  }

  if (colorA === colorB) {
    return colorA;
  }

  return mixColors(colorA, colorB, random01(seed));
}

function sampleEmitterShapeOffset(layer: ParticleEmitterLayer, seed: number) {
  'worklet';

  const shape = normalizeParticleEmitterShape(layer.emitterShape);

  if (shape === 'circle') {
    const radius = Math.max(0, layer.emitterRadius ?? 24) * Math.sqrt(random01(seed + 13.7));
    const angle = random01(seed + 91.3) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  if (shape === 'rectangle') {
    return {
      x: randomSigned(seed + 17.1) * Math.max(0, layer.emitterWidth ?? 48) * 0.5,
      y: randomSigned(seed + 43.9) * Math.max(0, layer.emitterHeight ?? 48) * 0.5,
    };
  }

  return { x: 0, y: 0 };
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

function resolveParticleNodeCount(
  layer: ParticleEmitterLayer,
  asset: EffectAsset,
  instance: EffectInstance,
) {
  const shouldLoop = instance.loopOverride ?? asset.loop ?? false;
  const maxParticles = Math.max(0, Math.round(layer.maxParticles));

  if (shouldLoop) {
    return maxParticles;
  }

  const effectDurationMs = resolveEffectDurationMs(asset, instance);
  const burstCount = Math.min(maxParticles, Math.max(0, Math.round(layer.burstCount ?? 0)));
  const durationSeconds = effectDurationMs / 1000;
  const continuousCapacity = Math.max(0, maxParticles - burstCount);
  const continuousCount =
    layer.emissionRate > 0
      ? Math.min(continuousCapacity, Math.max(1, Math.ceil(durationSeconds * layer.emissionRate)))
      : 0;

  return burstCount + continuousCount;
}

function resolveParticleStaticState(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: ParticleEmitterLayer,
  index: number,
): ResolvedParticleStaticState {
  const effectDurationMs = resolveEffectDurationMs(asset, instance);
  const birthProgress = resolveParticleBirthProgress(layer, effectDurationMs, index);
  const defaultRotationDeg = getDefaultParticleRotationDeg(layer.renderer);
  const defaultColor = sampleParticleRenderColor(layer, index * 73.17 + 1.9);

  if (birthProgress == null) {
    return {
      active: false,
      defaultX: instance.x,
      defaultY: instance.y,
      hiddenRotationDeg: layer.rotationDeg ?? defaultRotationDeg,
      birthMs: 0,
      lifetimeMs: 1,
      originX: instance.x,
      originY: instance.y,
      velocityX: 0,
      velocityY: 0,
      gravityX: 0,
      gravityY: 0,
      drag: 0,
      startSize: 0,
      startAlpha: 0,
      endAlpha: 0,
      hasScaleTrack: hasDynamicTrack(layer.particleTracks, 'scale'),
      hasAlphaTrack: hasDynamicTrack(layer.particleTracks, 'alpha'),
      hasOffsetXTrack: hasDynamicTrack(layer.particleTracks, 'x'),
      hasOffsetYTrack: hasDynamicTrack(layer.particleTracks, 'y'),
      hasRotationTrack: hasDynamicTrack(layer.particleTracks, 'rotationDeg'),
      legacyEndSize: 0,
      baseRotationDeg: layer.rotationDeg ?? defaultRotationDeg,
      rotationOverLifetimeDeg: 0,
      spinDeg: 0,
      color: defaultColor,
    };
  }

  const lifetimeMinMs = Math.max(
    1,
    sampleDynamicTrackValue(
      layer.emitterTracks,
      'particleLifetimeMs',
      birthProgress,
      layer.particleLifetimeMs,
    ),
  );
  const lifetimeMs = Math.max(
    1,
    sampleRandomRange(
      lifetimeMinMs,
      layer.particleLifetimeMaxMs ?? lifetimeMinMs,
      index * 19.73 + birthProgress * 541.7,
    ),
  );
  const birthMs = birthProgress * effectDurationMs;
  const origin = sampleMotionPosition(asset, instance, birthProgress);
  const emitterOffset = sampleEmitterShapeOffset(layer, index * 47.19 + birthProgress * 683.5);
  const originX = origin.x + sampleLayerTrack(layer, 'x', birthProgress, 0) + emitterOffset.x;
  const originY = origin.y + sampleLayerTrack(layer, 'y', birthProgress, 0) + emitterOffset.y;
  const motionMode = asset.motion?.mode ?? 'fixed';
  const hasVelocityOverride =
    Number.isFinite(Number(layer.velocityX)) ||
    Number.isFinite(Number(layer.velocityY)) ||
    hasDynamicTrack(layer.emitterTracks, 'velocityX') ||
    hasDynamicTrack(layer.emitterTracks, 'velocityY');
  const hasDirectionOverride =
    Number.isFinite(Number(layer.directionDeg)) ||
    hasDynamicTrack(layer.emitterTracks, 'directionDeg');
  const directionDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'directionDeg',
    birthProgress,
    layer.directionDeg ??
      (motionMode === 'fixed' ? 0 : sampleMotionHeadingDeg(asset, instance, birthProgress)),
  );
  const spreadDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'spreadDeg',
    birthProgress,
    !hasVelocityOverride && motionMode === 'fixed' && !hasDirectionOverride ? 360 : layer.spreadDeg,
  );
  const speedMin = sampleDynamicTrackValue(
    layer.emitterTracks,
    'speed',
    birthProgress,
    layer.speed,
  );
  const speedSeed = index * 37.11 + birthProgress * 997.1;
  const speedBase = sampleRandomRange(speedMin, layer.speedMax ?? speedMin, speedSeed);
  const speed = Math.max(
    0,
    speedBase +
      (layer.speedMax == null
        ? randomSigned(speedSeed) *
          sampleDynamicTrackValue(
            layer.emitterTracks,
            'speedJitter',
            birthProgress,
            layer.speedJitter ?? 0,
          )
        : 0),
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
  const velocityX = hasVelocityOverride
    ? sampleDynamicTrackValue(layer.emitterTracks, 'velocityX', birthProgress, layer.velocityX ?? 0)
    : Math.cos(angleRad) * speed;
  const velocityY = hasVelocityOverride
    ? sampleDynamicTrackValue(layer.emitterTracks, 'velocityY', birthProgress, layer.velocityY ?? 0)
    : Math.sin(angleRad) * speed;
  const startSizeMin = sampleDynamicTrackValue(
    layer.emitterTracks,
    'startSize',
    birthProgress,
    layer.startSize,
  );
  const startSize = sampleRandomRange(
    startSizeMin,
    layer.startSizeMax ?? startSizeMin,
    index * 61.23 + birthProgress * 719.4,
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
  const hasScaleTrack = hasDynamicTrack(layer.particleTracks, 'scale');
  const hasAlphaTrack = hasDynamicTrack(layer.particleTracks, 'alpha');
  const legacyEndSize = sampleDynamicTrackValue(
    layer.emitterTracks,
    'endSize',
    birthProgress,
    layer.endSize ?? startSize,
  );
  const baseRotationDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'rotationDeg',
    birthProgress,
    layer.rotationDeg ?? defaultRotationDeg,
  );
  const rotationOverLifetimeDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'rotationOverLifetimeDeg',
    birthProgress,
    layer.rotationOverLifetimeDeg ?? 0,
  );
  const spinDeg = sampleDynamicTrackValue(
    layer.emitterTracks,
    'spinDeg',
    birthProgress,
    layer.spinDeg ?? 0,
  );
  const color = sampleParticleRenderColor(layer, index * 59.81 + birthProgress * 443.2);

  return {
    active: true,
    defaultX: instance.x,
    defaultY: instance.y,
    hiddenRotationDeg: layer.rotationDeg ?? defaultRotationDeg,
    birthMs,
    lifetimeMs,
    originX,
    originY,
    velocityX,
    velocityY,
    gravityX,
    gravityY,
    drag,
    startSize,
    startAlpha,
    endAlpha,
    hasScaleTrack,
    hasAlphaTrack,
    hasOffsetXTrack: hasDynamicTrack(layer.particleTracks, 'x'),
    hasOffsetYTrack: hasDynamicTrack(layer.particleTracks, 'y'),
    hasRotationTrack: hasDynamicTrack(layer.particleTracks, 'rotationDeg'),
    legacyEndSize,
    baseRotationDeg,
    rotationOverLifetimeDeg,
    spinDeg,
    color,
  };
}

function sampleResolvedParticleState(
  layer: ParticleEmitterLayer,
  emitterAlpha: number,
  elapsedMs: number,
  staticState: ResolvedParticleStaticState,
) {
  'worklet';

  if (!staticState.active) {
    return {
      x: staticState.defaultX,
      y: staticState.defaultY,
      size: 0,
      alpha: 0,
      rotationDeg: staticState.hiddenRotationDeg,
      color: staticState.color,
    };
  }

  const ageMs = elapsedMs - staticState.birthMs;

  if (ageMs < 0 || ageMs > staticState.lifetimeMs) {
    return {
      x: staticState.defaultX,
      y: staticState.defaultY,
      size: 0,
      alpha: 0,
      rotationDeg: staticState.hiddenRotationDeg,
      color: staticState.color,
    };
  }

  const lifeProgress = Math.max(0, Math.min(1, ageMs / staticState.lifetimeMs));
  const ageSeconds = ageMs / 1000;
  const travelTime =
    staticState.drag > 0
      ? (1 - Math.exp(-staticState.drag * ageSeconds)) / staticState.drag
      : ageSeconds;
  const offsetX = staticState.hasOffsetXTrack
    ? sampleDynamicTrackValue(layer.particleTracks, 'x', lifeProgress, 0)
    : 0;
  const offsetY = staticState.hasOffsetYTrack
    ? sampleDynamicTrackValue(layer.particleTracks, 'y', lifeProgress, 0)
    : 0;
  const size = Math.max(
    0.5,
    staticState.hasScaleTrack
      ? staticState.startSize *
          sampleDynamicTrackValue(layer.particleTracks, 'scale', lifeProgress, 1)
      : staticState.startSize + (staticState.legacyEndSize - staticState.startSize) * lifeProgress,
  );
  const alpha = Math.max(
    0,
    emitterAlpha *
      (staticState.hasAlphaTrack
        ? sampleDynamicTrackValue(layer.particleTracks, 'alpha', lifeProgress, 1)
        : staticState.startAlpha + (staticState.endAlpha - staticState.startAlpha) * lifeProgress),
  );
  const rotationDeg =
    staticState.baseRotationDeg +
    staticState.rotationOverLifetimeDeg * lifeProgress +
    staticState.spinDeg * ageSeconds +
    (staticState.hasRotationTrack
      ? sampleDynamicTrackValue(layer.particleTracks, 'rotationDeg', lifeProgress, 0)
      : 0);

  return {
    x:
      staticState.originX +
      staticState.velocityX * travelTime +
      0.5 * staticState.gravityX * ageSeconds * ageSeconds +
      offsetX,
    y:
      staticState.originY +
      staticState.velocityY * travelTime +
      0.5 * staticState.gravityY * ageSeconds * ageSeconds +
      offsetY,
    size,
    alpha,
    rotationDeg,
    color: staticState.color,
  };
}

function useLayerMetrics(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: EffectLayer,
  progress: SharedValue<number>,
): SharedLayerMetrics {
  const timelineProgress = useDerivedValue(() =>
    resolveLayerTimelineProgress(asset, instance, layer, progress.value),
  );
  const layerProgress = useDerivedValue(() => timelineProgress.value ?? 1);
  const layerVisible = useDerivedValue(() => (timelineProgress.value == null ? 0 : 1));
  const x = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, layerProgress.value);
    return base.x + sampleLayerTrack(layer, 'x', layerProgress.value, 0);
  });

  const y = useDerivedValue(() => {
    const base = sampleMotionPosition(asset, instance, layerProgress.value);
    return base.y + sampleLayerTrack(layer, 'y', layerProgress.value, 0);
  });

  const scale = useDerivedValue(() => sampleLayerTrack(layer, 'scale', layerProgress.value, 1));
  const alpha = useDerivedValue(() =>
    Math.max(0, layerVisible.value * sampleLayerTrack(layer, 'alpha', layerProgress.value, 1)),
  );

  return { progress: layerProgress, x, y, scale, alpha };
}

function useParticleMetrics(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: ParticleEmitterLayer,
  elapsedMs: SharedValue<number>,
  emitterAlpha: SharedValue<number>,
  index: number,
): SharedParticleMetrics {
  const staticState = useMemo(
    () => resolveParticleStaticState(asset, instance, layer, index),
    [asset, index, instance, layer],
  );
  const state = useDerivedValue(() =>
    sampleResolvedParticleState(layer, emitterAlpha.value, elapsedMs.value, staticState),
  );

  const x = useDerivedValue(() => state.value.x);
  const y = useDerivedValue(() => state.value.y);
  const size = useDerivedValue(() => state.value.size);
  const alpha = useDerivedValue(() => state.value.alpha);
  const rotationDeg = useDerivedValue(() => state.value.rotationDeg);
  const color = useDerivedValue(() => state.value.color ?? '');

  return { x, y, size, alpha, rotationDeg, color };
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
  const {
    progress: layerProgress,
    x,
    y,
    scale,
    alpha,
  } = useLayerMetrics(asset, instance, layer, progress);
  const glow = useDerivedValue(() => sampleLayerTrack(layer, 'glow', layerProgress.value, 0));
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

const RadialGradientPrimitiveSkia = ({
  asset,
  instance,
  layer,
  progress,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: RadialGradientLayer;
  progress: SharedValue<number>;
}) => {
  const { x, y, scale, alpha } = useLayerMetrics(asset, instance, layer, progress);
  const radius = useDerivedValue(() => Math.max(1, layer.radius * scale.value));
  const edgeColor = useMemo(() => transparentizeColor(layer.color), [layer.color]);
  const center = useDerivedValue(() => vec(x.value, y.value));

  return (
    <Circle cx={x} cy={y} r={radius} opacity={alpha}>
      <RadialGradient c={center} r={radius} colors={[layer.color, edgeColor]} />
    </Circle>
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
  tintColorValue,
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
  tintColorValue?: SharedValue<string>;
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
        {tintColorValue ? (
          <BlendColor color={tintColorValue} mode="srcIn" />
        ) : tintColor ? (
          <BlendColor color={tintColor} mode="srcIn" />
        ) : null}
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
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
    index,
  );
  const radius = useDerivedValue(() => Math.max(0.5, size.value / 2));

  return <Circle cx={x} cy={y} r={radius} color={color} opacity={alpha} />;
};

const ParticleRadialGradientNodeSkia = ({
  asset,
  instance,
  layer,
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
    index,
  );
  const radius = useDerivedValue(() => Math.max(0.5, size.value / 2));
  const colors = useDerivedValue(() => [color.value, transparentizeColor(color.value)]);
  const center = useDerivedValue(() => vec(x.value, y.value));

  return (
    <Circle cx={x} cy={y} r={radius} opacity={alpha}>
      <RadialGradient c={center} r={radius} colors={colors} />
    </Circle>
  );
};

const ParticleRingNodeSkia = ({
  asset,
  instance,
  layer,
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
    index,
  );
  const radius = useDerivedValue(() => Math.max(0.5, size.value / 2));
  const strokeWidth = useDerivedValue(() => Math.max(1, size.value * 0.12));

  return (
    <Circle
      cx={x}
      cy={y}
      r={radius}
      color={color}
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
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
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
      color={color}
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
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
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

  return <Path path={path} color={color} opacity={alpha} />;
};

const ParticleArcNodeSkia = ({
  asset,
  instance,
  layer,
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
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
      color={color}
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
  elapsedMs,
  emitterAlpha,
  index,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
}) => {
  const { x, y, size, alpha, rotationDeg, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
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

  return <Path path={path} color={color} opacity={alpha} />;
};

const ParticleSpriteNodeSkia = ({
  asset,
  instance,
  layer,
  elapsedMs,
  emitterAlpha,
  index,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
  index: number;
  spriteImageCache?: Partial<Record<string, SkImage>>;
}) => {
  const { x, y, size, alpha, color } = useParticleMetrics(
    asset,
    instance,
    layer,
    elapsedMs,
    emitterAlpha,
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
      tintColor={
        !((layer.tintColor ?? '').trim() || (layer.tintColor2 ?? '').trim())
          ? layer.tintColor
          : undefined
      }
      tintColorValue={
        (layer.tintColor ?? '').trim() || (layer.tintColor2 ?? '').trim() ? color : undefined
      }
      imageOverride={layer.spriteId ? spriteImageCache?.[layer.spriteId] : undefined}
    />
  );
};

const ParticleNodeSkia = ({
  asset,
  instance,
  layer,
  elapsedMs,
  emitterAlpha,
  index,
  spriteImageCache,
}: {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ParticleEmitterLayer;
  elapsedMs: SharedValue<number>;
  emitterAlpha: SharedValue<number>;
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
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
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
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    case 'radialGradient':
      return (
        <ParticleRadialGradientNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    case 'streak':
      return (
        <ParticleStreakNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    case 'diamond':
      return (
        <ParticleDiamondNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    case 'arc':
      return (
        <ParticleArcNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    case 'starburst':
      return (
        <ParticleStarburstNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
          index={index}
        />
      );
    default:
      return (
        <ParticleOrbNodeSkia
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
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
  const shouldLoop = instance.loopOverride ?? asset.loop ?? false;
  const particleCount = shouldLoop
    ? Math.max(0, Math.round(layer.maxParticles))
    : resolveParticleNodeCount(layer, asset, instance);
  const emitterAlpha = useDerivedValue(() => sampleLayerTrack(layer, 'alpha', progress.value, 1));
  const particleIndices = useMemo(
    () => Array.from({ length: particleCount }, (_, index) => index),
    [particleCount],
  );

  if (particleCount <= 0) {
    return null;
  }

  return (
    <>
      {particleIndices.map((index) => (
        <ParticleNodeSkia
          key={`${layer.id}-particle-${index}`}
          asset={asset}
          instance={instance}
          layer={layer}
          elapsedMs={elapsedMs}
          emitterAlpha={emitterAlpha}
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
  const timelineProgress = useDerivedValue(() =>
    resolveLayerTimelineProgress(asset, instance, layer, progress.value),
  );
  const layerProgress = useDerivedValue(() => timelineProgress.value ?? 1);
  const layerVisible = useDerivedValue(() => (timelineProgress.value == null ? 0 : 1));
  const segmentProgress = useDerivedValue(() =>
    Math.max(0, layerProgress.value - index * layer.spacing),
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
    return Math.max(0, layerVisible.value * alpha * (0.65 - index * (falloff * 0.9)));
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
  asset: EffectAsset,
  layer: EffectLayer,
  instance: EffectInstance,
  progress: SharedValue<number>,
  elapsedMs: SharedValue<number>,
  coreLayerOpacity: SharedValue<number>,
  spriteImageCache?: Partial<Record<string, SkImage>>,
) {
  const wrapCoreLayer = (content: ReactNode, key = layer.id) => (
    <Group key={key} opacity={coreLayerOpacity}>
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
    case 'radialGradient':
      return wrapCoreLayer(
        <RadialGradientPrimitiveSkia
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />,
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
        `${layer.id}-${instance.instanceId}`,
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

const EffectPlayerSkia = ({
  instance,
  onComplete,
  spriteImageCache,
  active = true,
}: EffectPlayerProps) => {
  const progress = useSharedValue(0);
  const elapsedMs = useSharedValue(0);
  const renderOpacity = useSharedValue(0);
  const asset = getEffectAsset(instance.assetId);
  const spriteIds = useMemo(() => (asset ? collectAssetSpriteIds(asset) : []), [asset]);
  const spriteCount = spriteIds.length;
  const allSpritesCached = spriteIds.every((spriteId) => spriteImageCache?.[spriteId]);
  const needsSpriteWarmup = spriteCount > 0 && !allSpritesCached;
  const [spritesReady, setSpritesReady] = useState(spriteCount === 0 || allSpritesCached);
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
    if (!active || !asset || !spritesReady) {
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
    renderOpacity.value = spriteCount === 0 ? 1 : 0;

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

    if (needsSpriteWarmup) {
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
    active,
    asset,
    animationDurationMs,
    elapsedMs,
    instance.instanceId,
    onComplete,
    playbackDurationMs,
    progress,
    renderOpacity,
    shouldLoop,
    needsSpriteWarmup,
    spritesReady,
    spriteCount,
  ]);

  if (!asset) return null;

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Group opacity={renderOpacity}>
        {asset.layers.map((layer) =>
          renderLayer(
            asset,
            layer,
            instance,
            progress,
            elapsedMs,
            coreLayerOpacity,
            spriteImageCache,
          ),
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
