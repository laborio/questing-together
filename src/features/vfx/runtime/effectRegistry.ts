import fireballimpactData from '@/features/vfx/assets/effects/FireballImpact.json';
import fireballtravelData from '@/features/vfx/assets/effects/FireballTravel.json';
import greentestimpactData from '@/features/vfx/assets/effects/GreenTestImpact.json';
import greentestmuzzleData from '@/features/vfx/assets/effects/GreenTestMuzzle.json';
import greentesttravelData from '@/features/vfx/assets/effects/GreenTestTravel.json';
import iceimpactData from '@/features/vfx/assets/effects/IceImpact.json';
import iceshardtravelData from '@/features/vfx/assets/effects/IceShardTravel.json';
import shieldselfData from '@/features/vfx/assets/effects/ShieldSelf.json';
import type { EffectAsset } from '@/features/vfx/types/assets';

const effectAssets = [
  fireballimpactData,
  fireballtravelData,
  greentestimpactData,
  greentestmuzzleData,
  greentesttravelData,
  iceimpactData,
  iceshardtravelData,
  shieldselfData,
] as EffectAsset[];

const effectAssetById = new Map(effectAssets.map((asset) => [asset.id, asset]));

export function getEffectAsset(assetId: string) {
  return effectAssetById.get(assetId) ?? null;
}

export function listEffectAssets() {
  return effectAssets;
}
