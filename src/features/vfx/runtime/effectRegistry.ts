import fireballImpactData from '@/features/vfx/assets/effects/fireball-impact.json';
import fireballMuzzleData from '@/features/vfx/assets/effects/fireball-muzzle.json';
import fireballTravelData from '@/features/vfx/assets/effects/fireball-travel.json';
import fireballTravelLeftData from '@/features/vfx/assets/effects/fireball-travel_left.json';
import frostboltImpactData from '@/features/vfx/assets/effects/frostbolt-impact.json';
import frostboltTravelData from '@/features/vfx/assets/effects/frostbolt-travel.json';
import iceShardTravelData from '@/features/vfx/assets/effects/Ice Shard-travel.json';
import iceImpactData from '@/features/vfx/assets/effects/Ice-impact.json';
import starsImpactData from '@/features/vfx/assets/effects/stars-impact.json';
import starsTravelData from '@/features/vfx/assets/effects/stars-travel.json';
import type { EffectAsset } from '@/features/vfx/types/assets';

const effectAssets = [
  iceImpactData,
  iceShardTravelData,
  fireballImpactData,
  fireballMuzzleData,
  fireballTravelData,
  fireballTravelLeftData,
  frostboltImpactData,
  frostboltTravelData,
  starsImpactData,
  starsTravelData,
] as EffectAsset[];

const effectAssetById = new Map(effectAssets.map((asset) => [asset.id, asset]));

export function getEffectAsset(assetId: string) {
  return effectAssetById.get(assetId) ?? null;
}

export function listEffectAssets() {
  return effectAssets;
}
