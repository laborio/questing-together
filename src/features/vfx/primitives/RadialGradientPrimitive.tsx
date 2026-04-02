import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import type { EffectAsset, RadialGradientLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RadialGradientPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: RadialGradientLayer;
  progress: SharedValue<number>;
};

const RadialGradientPrimitive = ({
  asset,
  instance,
  layer,
  progress,
}: RadialGradientPrimitiveProps) => {
  const gradientId = `radial-gradient-${instance.instanceId}-${layer.id}`;

  const circleProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);

    return {
      cx: x,
      cy: y,
      r: Math.max(1, layer.radius * scale),
      opacity: Math.max(0, alpha),
    };
  });

  return (
    <>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={layer.color} stopOpacity={1} />
          <Stop offset="100%" stopColor={layer.color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <AnimatedCircle animatedProps={circleProps} fill={`url(#${gradientId})`} />
    </>
  );
};

export default RadialGradientPrimitive;
