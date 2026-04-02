import type { EffectAsset, EffectDynamicTrackMap } from '@/features/vfx/types/assets';

function getTrackMaxValue(trackMap: EffectDynamicTrackMap | undefined, name: string) {
  const track = trackMap?.[name];
  if (!track?.length) {
    return null;
  }

  return track.reduce((maxValue, keyframe) => Math.max(maxValue, keyframe.value), track[0].value);
}

function getMaxParticleLifetimeMs(asset: EffectAsset) {
  let maxLifetimeMs = 0;

  for (const layer of asset.layers) {
    if (layer.type !== 'particleEmitter') {
      continue;
    }

    const trackedLifetimeMs = getTrackMaxValue(layer.emitterTracks, 'particleLifetimeMs');
    maxLifetimeMs = Math.max(
      maxLifetimeMs,
      trackedLifetimeMs ?? layer.particleLifetimeMaxMs ?? layer.particleLifetimeMs ?? 0,
    );
  }

  return maxLifetimeMs;
}

export function getEffectPlaybackDurationMs(
  asset: EffectAsset,
  durationMsOverride?: number,
  includeParticleTail = true,
) {
  const effectDurationMs = Math.max(1, durationMsOverride ?? asset.durationMs);
  if (!includeParticleTail) {
    return effectDurationMs;
  }

  return Math.max(effectDurationMs, effectDurationMs + getMaxParticleLifetimeMs(asset));
}
