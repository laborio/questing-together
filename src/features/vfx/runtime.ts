import type { EffectKeyframe } from '@/features/vfx/types';

function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

export function sampleTrack(track: EffectKeyframe[], progress: number) {
  'worklet';

  if (track.length === 0) return 0;

  const clampedProgress = clamp01(progress);

  if (clampedProgress <= track[0].at) {
    return track[0].value;
  }

  const lastKeyframe = track[track.length - 1];
  if (clampedProgress >= lastKeyframe.at) {
    return lastKeyframe.value;
  }

  for (let index = 1; index < track.length; index += 1) {
    const current = track[index];
    const previous = track[index - 1];

    if (clampedProgress > current.at) {
      continue;
    }

    const span = current.at - previous.at;
    if (span <= 0) {
      return current.value;
    }

    const localProgress = (clampedProgress - previous.at) / span;
    return previous.value + (current.value - previous.value) * localProgress;
  }

  return lastKeyframe.value;
}
