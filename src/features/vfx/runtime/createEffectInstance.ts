import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import type { EffectInstance, PlayEffectOptions } from '@/features/vfx/types/runtime';

let nextInstanceId = 0;

export function createEffectInstance(
  assetId: string,
  options: PlayEffectOptions,
): EffectInstance | null {
  if (!getEffectAsset(assetId)) {
    return null;
  }

  nextInstanceId += 1;

  return {
    assetId,
    instanceId: `${assetId}-${nextInstanceId}`,
    ...options,
  };
}
