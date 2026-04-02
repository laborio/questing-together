import { Image as RNImage } from 'react-native';
import { getVfxSpriteSource } from '@/features/vfx/runtime/spriteRegistry';
import type { EffectAsset } from '@/features/vfx/types/assets';

function resolveSpritePreloadUri(spriteId: string) {
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

export function collectEffectSpriteIds(asset: EffectAsset) {
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

export async function preloadEffectSprites(assets: EffectAsset[]) {
  const spriteIds = new Set<string>();

  for (const asset of assets) {
    for (const spriteId of collectEffectSpriteIds(asset)) {
      spriteIds.add(spriteId);
    }
  }

  await Promise.all(
    [...spriteIds].map(async (spriteId) => {
      const uri = resolveSpritePreloadUri(spriteId);
      if (!uri) {
        return;
      }

      try {
        await RNImage.prefetch(uri);
      } catch (error) {
        console.warn(`Could not preload VFX sprite "${spriteId}".`, error);
      }
    }),
  );
}
