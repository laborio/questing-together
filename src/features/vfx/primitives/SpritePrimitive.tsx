import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Defs, Mask, Rect, Image as SvgImage } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import { getVfxSpriteSource } from '@/features/vfx/runtime/spriteRegistry';
import type { EffectAsset, SpriteLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedImage = Animated.createAnimatedComponent(SvgImage);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type SpritePrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: SpriteLayer;
  progress: SharedValue<number>;
};

const SpritePrimitive = ({ asset, instance, layer, progress }: SpritePrimitiveProps) => {
  const source = getVfxSpriteSource(layer.spriteId);
  const maskId = `vfx-sprite-mask-${instance.instanceId}-${layer.id}`;

  const imageProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const width = Math.max(1, layer.width * scale);
    const height = Math.max(1, layer.height * scale);

    return {
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
    };
  });

  const displayProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);
    const width = Math.max(1, layer.width * scale);
    const height = Math.max(1, layer.height * scale);

    return {
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
      opacity: Math.max(0, alpha),
    };
  });

  if (!source) return null;

  if (layer.tintColor) {
    return (
      <>
        <Defs>
          <Mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <AnimatedImage
              animatedProps={imageProps}
              href={source}
              preserveAspectRatio="xMidYMid meet"
            />
          </Mask>
        </Defs>
        <AnimatedRect
          animatedProps={displayProps}
          fill={layer.tintColor}
          mask={`url(#${maskId})`}
        />
      </>
    );
  }

  return (
    <AnimatedImage animatedProps={displayProps} href={source} preserveAspectRatio="xMidYMid meet" />
  );
};

export default SpritePrimitive;
