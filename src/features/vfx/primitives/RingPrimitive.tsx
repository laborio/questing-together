import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import type { EffectAsset, RingLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: RingLayer;
  progress: SharedValue<number>;
};

const RingPrimitive = ({ asset, instance, layer, progress }: RingPrimitiveProps) => {
  const animatedProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);

    return {
      cx: x,
      cy: y,
      r: Math.max(0.5, layer.radius * scale),
      opacity: Math.max(0, alpha),
      strokeWidth: Math.max(1, layer.thickness * scale),
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill="transparent" stroke={layer.color} />;
};

export default RingPrimitive;
