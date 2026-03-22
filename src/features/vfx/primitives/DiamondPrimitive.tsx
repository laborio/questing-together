import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { sampleLayerTrack, sampleMotionPosition } from '@/features/vfx/runtime/sampleTrack';
import type { DiamondLayer, EffectAsset } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type DiamondPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: DiamondLayer;
  progress: SharedValue<number>;
};

function rotatePoint(x: number, y: number, angleRad: number) {
  'worklet';
  return {
    x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
    y: x * Math.sin(angleRad) + y * Math.cos(angleRad),
  };
}

const DiamondPrimitive = ({ asset, instance, layer, progress }: DiamondPrimitiveProps) => {
  const animatedProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const x = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);
    const halfWidth = Math.max(1, (layer.width * scale) / 2);
    const halfHeight = Math.max(1, (layer.height * scale) / 2);
    const angleRad = ((layer.rotationDeg ?? 0) * Math.PI) / 180;
    const points = [
      { x: 0, y: -halfHeight },
      { x: halfWidth, y: 0 },
      { x: 0, y: halfHeight },
      { x: -halfWidth, y: 0 },
    ]
      .map((point) => rotatePoint(point.x, point.y, angleRad))
      .map((point) => ({ x: x + point.x, y: y + point.y }));

    const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;

    return {
      d,
      opacity: Math.max(0, alpha),
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={layer.color} />;
};

export default DiamondPrimitive;
