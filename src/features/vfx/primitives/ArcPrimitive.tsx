import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import {
  sampleLayerTrack,
  sampleMotionPosition,
  sampleResolvedLayerRotationDeg,
} from '@/features/vfx/runtime/sampleTrack';
import type { ArcLayer, EffectAsset } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type ArcPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: ArcLayer;
  progress: SharedValue<number>;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  'worklet';
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

const ArcPrimitive = ({ asset, instance, layer, progress }: ArcPrimitiveProps) => {
  const animatedProps = useAnimatedProps(() => {
    const base = sampleMotionPosition(asset, instance, progress.value);
    const cx = base.x + sampleLayerTrack(layer, 'x', progress.value, 0);
    const cy = base.y + sampleLayerTrack(layer, 'y', progress.value, 0);
    const scale = sampleLayerTrack(layer, 'scale', progress.value, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', progress.value, 1);
    const radius = Math.max(1, layer.radius * scale);
    const startAngle =
      sampleResolvedLayerRotationDeg(asset, instance, layer, progress.value, -90, 90) -
      layer.sweepDeg / 2;
    const endAngle = startAngle + layer.sweepDeg;
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const largeArcFlag = layer.sweepDeg > 180 ? 1 : 0;

    return {
      d: `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      opacity: Math.max(0, alpha),
      strokeWidth: Math.max(1, layer.thickness * scale),
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="transparent"
      stroke={layer.color}
      strokeLinecap="round"
    />
  );
};

export default ArcPrimitive;
