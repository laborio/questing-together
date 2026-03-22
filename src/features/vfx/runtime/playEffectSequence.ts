import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import { sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import { getEffectSequence } from '@/features/vfx/runtime/sequenceRegistry';
import type { EffectAsset } from '@/features/vfx/types/assets';
import type { PlayEffectOptions } from '@/features/vfx/types/runtime';
import type {
  EffectSequence,
  EffectSequenceAnchor,
  EffectSequenceCue,
} from '@/features/vfx/types/sequences';

type SequencePoint = {
  x: number;
  y: number;
};

type PlaySequenceEffect = (
  assetId: string,
  options: PlayEffectOptions,
) => string | null | undefined;

type EffectSequencePlaybackParams = {
  sequenceId: string;
  caster: SequencePoint;
  target: SequencePoint;
  playEffect: PlaySequenceEffect;
  onTimeout: (callback: () => void, delayMs: number) => void;
  assetOverrides?: Partial<Record<string, EffectAsset>>;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function resolveEffectAsset(
  assetId: string,
  assetOverrides: Partial<Record<string, EffectAsset>> | undefined,
) {
  return assetOverrides?.[assetId] ?? getEffectAsset(assetId);
}

function findProjectileCue(
  sequence: EffectSequence,
  assetOverrides: Partial<Record<string, EffectAsset>> | undefined,
) {
  return (
    sequence.cues.find(
      (cue) => cue.targetAnchor && resolveEffectAsset(cue.assetId, assetOverrides),
    ) ?? null
  );
}

function resolveStaticAnchorPoint(
  anchor: Exclude<EffectSequenceAnchor, 'projectile'>,
  caster: SequencePoint,
  target: SequencePoint,
) {
  return anchor === 'caster' ? caster : target;
}

function sampleProjectilePoint(
  sequence: EffectSequence,
  cue: EffectSequenceCue,
  caster: SequencePoint,
  target: SequencePoint,
  assetOverrides: Partial<Record<string, EffectAsset>> | undefined,
) {
  const projectileCue = findProjectileCue(sequence, assetOverrides);
  if (!projectileCue) {
    return target;
  }

  const projectileAsset = resolveEffectAsset(projectileCue.assetId, assetOverrides);
  if (!projectileAsset) {
    return target;
  }

  const startPoint = resolveStaticAnchorPoint(
    projectileCue.anchor === 'target' ? 'target' : 'caster',
    caster,
    target,
  );
  const targetPoint = resolveStaticAnchorPoint(
    projectileCue.targetAnchor === 'caster' ? 'caster' : 'target',
    caster,
    target,
  );
  const travelDurationMs = Math.max(1, projectileAsset.durationMs);
  const sampledTravelT = cue.travelT ?? clamp01((cue.atMs - projectileCue.atMs) / travelDurationMs);

  return sampleMotionPosition(
    projectileAsset,
    {
      assetId: projectileAsset.id,
      instanceId: `${sequence.id}-${cue.id}-projectile-anchor`,
      x: startPoint.x,
      y: startPoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
    },
    sampledTravelT,
  );
}

function resolveAnchorPoint(
  sequence: EffectSequence,
  cue: EffectSequenceCue,
  anchor: EffectSequenceAnchor,
  caster: SequencePoint,
  target: SequencePoint,
  assetOverrides: Partial<Record<string, EffectAsset>> | undefined,
) {
  if (anchor === 'projectile') {
    return sampleProjectilePoint(sequence, cue, caster, target, assetOverrides);
  }

  return resolveStaticAnchorPoint(anchor, caster, target);
}

function buildCuePlayOptions(
  sequence: EffectSequence,
  cue: EffectSequenceCue,
  caster: SequencePoint,
  target: SequencePoint,
  assetOverrides: Partial<Record<string, EffectAsset>> | undefined,
) {
  const origin = resolveAnchorPoint(sequence, cue, cue.anchor, caster, target, assetOverrides);
  const options: PlayEffectOptions = {
    x: origin.x,
    y: origin.y,
  };

  if (cue.targetAnchor) {
    const cueTarget = resolveAnchorPoint(
      sequence,
      cue,
      cue.targetAnchor,
      caster,
      target,
      assetOverrides,
    );
    options.targetX = cueTarget.x;
    options.targetY = cueTarget.y;
  }

  if (cue.durationMs != null) {
    options.durationMsOverride = cue.durationMs;
  }

  return options;
}

export function getEffectSequenceDurationMs(
  sequenceId: string,
  assetOverrides?: Partial<Record<string, EffectAsset>>,
) {
  const sequence = getEffectSequence(sequenceId);
  if (!sequence) {
    return 0;
  }

  return sequence.cues.reduce((maxDurationMs, cue) => {
    const cueAsset = resolveEffectAsset(cue.assetId, assetOverrides);
    const cueDurationMs = cue.durationMs ?? cueAsset?.durationMs ?? 0;
    return Math.max(maxDurationMs, cue.atMs + cueDurationMs);
  }, 0);
}

export function playEffectSequence({
  sequenceId,
  caster,
  target,
  playEffect,
  onTimeout,
  assetOverrides,
}: EffectSequencePlaybackParams) {
  const sequence = getEffectSequence(sequenceId);
  if (!sequence) {
    return 0;
  }

  const cues = [...sequence.cues].sort((left, right) => left.atMs - right.atMs);

  for (const cue of cues) {
    const playCue = () => {
      if (!resolveEffectAsset(cue.assetId, assetOverrides)) {
        return;
      }

      playEffect(cue.assetId, buildCuePlayOptions(sequence, cue, caster, target, assetOverrides));
    };

    if (cue.atMs <= 0) {
      playCue();
    } else {
      onTimeout(playCue, cue.atMs);
    }
  }

  return getEffectSequenceDurationMs(sequenceId, assetOverrides);
}
