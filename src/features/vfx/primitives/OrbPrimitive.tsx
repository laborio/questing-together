import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import type { EffectAsset, OrbLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type OrbPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: OrbLayer;
  progress: SharedValue<number>;
};

const OrbPrimitive = ({ asset, instance, layer, progress }: OrbPrimitiveProps) => {
  const glowProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);
    const glow = sampleLayerTrack(layer, 'glow', progress.value, 0);
    const radius = layer.radius * scale * (layer.glowScale ?? 2.3) * (1 + glow * 0.45);

    return {
      cx: x,
      cy: y,
      r: radius,
      opacity: Math.max(0, alpha * (0.18 + glow * 0.35)),
    };
  });

  const coreProps = useAnimatedProps(() => {
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
      <AnimatedCircle animatedProps={glowProps} fill={layer.glowColor ?? layer.color} />
      <AnimatedCircle animatedProps={coreProps} fill={layer.color} />
    </>
  );
};

export default OrbPrimitive;
