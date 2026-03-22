import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import type { EffectAsset, StarburstLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type StarburstPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: StarburstLayer;
  progress: SharedValue<number>;
};

const StarburstPrimitive = ({ asset, instance, layer, progress }: StarburstPrimitiveProps) => {
  const animatedProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const cx = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const cy = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);
    const innerRadius = Math.max(0.5, layer.innerRadius * scale);
    const outerRadius = Math.max(innerRadius + 0.5, layer.outerRadius * scale);
    const points = Math.max(3, Math.round(layer.points));
    const rotationRad = ((layer.rotationDeg ?? -90) * Math.PI) / 180;
    const vertices = Array.from({ length: points * 2 }, (_, index) => {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotationRad + (Math.PI * index) / points;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
    const d = vertices
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
      .concat(' Z');

    return {
      d,
      opacity: Math.max(0, alpha),
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={layer.color} />;
};

export default StarburstPrimitive;
