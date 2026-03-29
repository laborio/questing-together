import type { ImageSourcePropType } from 'react-native';
import demoCoreSprite from '@/features/vfx/assets/sprites/demo-core.png';
import demoSigilSprite from '@/features/vfx/assets/sprites/demo-sigil.png';
import tVfxFirerockSprite from '@/features/vfx/assets/sprites/t-vfx-firerock.png';
import tVfxParticleDefaultSprite from '@/features/vfx/assets/sprites/t-vfx-particle-default.png';
import tVfxParticleStarSprite from '@/features/vfx/assets/sprites/t-vfx-particle-star.png';

export type VfxSpriteDefinition = {
  id: string;
  label: string;
  source: ImageSourcePropType;
  editorSrc: string;
};

const vfxSprites: VfxSpriteDefinition[] = [
  {
    id: 'demo-core',
    label: 'Demo Core',
    source: demoCoreSprite,
    editorSrc: '../../src/features/vfx/assets/sprites/demo-core.png',
  },
  {
    id: 'demo-sigil',
    label: 'Demo Sigil',
    source: demoSigilSprite,
    editorSrc: '../../src/features/vfx/assets/sprites/demo-sigil.png',
  },
  {
    id: 't-vfx-firerock',
    label: 'T Vfx Firerock',
    source: tVfxFirerockSprite,
    editorSrc: '../../src/features/vfx/assets/sprites/t-vfx-firerock.png',
  },
  {
    id: 't-vfx-particle-default',
    label: 'T Vfx Particle Default',
    source: tVfxParticleDefaultSprite,
    editorSrc: '../../src/features/vfx/assets/sprites/t-vfx-particle-default.png',
  },
  {
    id: 't-vfx-particle-star',
    label: 'T Vfx Particle Star',
    source: tVfxParticleStarSprite,
    editorSrc: '../../src/features/vfx/assets/sprites/t-vfx-particle-star.png',
  },
];

const vfxSpriteById = new Map(vfxSprites.map((sprite) => [sprite.id, sprite]));

export function getVfxSprite(spriteId: string) {
  return vfxSpriteById.get(spriteId) ?? null;
}

export function getVfxSpriteSource(spriteId: string) {
  return getVfxSprite(spriteId)?.source ?? null;
}

export function listVfxSprites() {
  return vfxSprites.map(({ id, label, editorSrc }) => ({ id, label, editorSrc }));
}
