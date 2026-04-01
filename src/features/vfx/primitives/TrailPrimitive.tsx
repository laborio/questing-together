import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { Circle, Defs, Mask, Path, Rect, Image as SvgImage } from 'react-native-svg';
import {
  sampleLayerTrack,
  sampleMotionPosition,
  sampleResolvedLayerRotationDeg,
} from '@/features/vfx/runtime/sampleTrack';
import { getVfxSpriteSource } from '@/features/vfx/runtime/spriteRegistry';
import type { EffectAsset, TrailLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedImage = Animated.createAnimatedComponent(SvgImage);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type TrailSegmentProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
  index: number;
};

function sampleSegmentValues(
  asset: EffectAsset,
  instance: EffectInstance,
  layer: TrailLayer,
  progress: number,
  index: number,
) {
  'worklet';

  const falloff = layer.falloff ?? 0.1;
  const segmentProgress = Math.max(0, progress - index * layer.spacing);
  const base = sampleMotionPosition(asset, instance, segmentProgress);
  const x = base.x + sampleLayerTrack(layer, 'x', segmentProgress, 0);
  const y = base.y + sampleLayerTrack(layer, 'y', segmentProgress, 0);
  const scale = sampleLayerTrack(layer, 'scale', segmentProgress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', segmentProgress, 1);
  const sizeFactor = Math.max(0.1, 1 - index * falloff);

  return {
    x,
    y,
    scale,
    sizeFactor,
    opacity: Math.max(0, alpha * (0.65 - index * (falloff * 0.9))),
  };
}

const FillTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const radius = Math.max(1, layer.radius * values.scale * values.sizeFactor);

    return {
      cx: values.x,
      cy: values.y,
      r: radius,
      opacity: values.opacity,
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill={layer.color} />;
};

const RingTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const radius = Math.max(1, layer.radius * values.scale * values.sizeFactor);

    return {
      cx: values.x,
      cy: values.y,
      r: radius,
      opacity: values.opacity,
      strokeWidth: Math.max(1, (layer.thickness ?? 2.5) * values.scale * values.sizeFactor),
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill="transparent" stroke={layer.color} />;
};

const SpriteTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const source = getVfxSpriteSource(layer.spriteId ?? '');
  const maskId = `vfx-trail-mask-${instance.instanceId}-${layer.id}-${index}`;

  const imageProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const width = Math.max(1, (layer.width ?? layer.radius * 2) * values.scale * values.sizeFactor);
    const height = Math.max(
      1,
      (layer.height ?? layer.radius * 2) * values.scale * values.sizeFactor,
    );

    return {
      x: values.x - width / 2,
      y: values.y - height / 2,
      width,
      height,
    };
  });

  const displayProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const width = Math.max(1, (layer.width ?? layer.radius * 2) * values.scale * values.sizeFactor);
    const height = Math.max(
      1,
      (layer.height ?? layer.radius * 2) * values.scale * values.sizeFactor,
    );

    return {
      x: values.x - width / 2,
      y: values.y - height / 2,
      width,
      height,
      opacity: values.opacity,
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

const StreakTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const width = Math.max(1, (layer.width ?? 36) * values.scale * values.sizeFactor);
    const height = Math.max(1, (layer.height ?? 10) * values.scale * values.sizeFactor);
    const rotationDeg = sampleResolvedLayerRotationDeg(
      asset,
      instance,
      layer,
      Math.max(0, progress.value - index * layer.spacing),
      -24,
    );

    return {
      x: values.x - width / 2,
      y: values.y - height / 2,
      width,
      height,
      rx: height / 2,
      ry: height / 2,
      opacity: values.opacity,
      transform: `rotate(${rotationDeg} ${values.x} ${values.y})`,
    };
  });

  return <AnimatedRect animatedProps={animatedProps} fill={layer.color} />;
};

const DiamondTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const halfWidth = Math.max(1, ((layer.width ?? 24) * values.scale * values.sizeFactor) / 2);
    const halfHeight = Math.max(1, ((layer.height ?? 28) * values.scale * values.sizeFactor) / 2);
    const angle =
      (sampleResolvedLayerRotationDeg(
        asset,
        instance,
        layer,
        Math.max(0, progress.value - index * layer.spacing),
        0,
        90,
      ) *
        Math.PI) /
      180;
    const rotatePoint = (offsetX: number, offsetY: number) => ({
      x: offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
      y: offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
    });
    const points = [
      rotatePoint(0, -halfHeight),
      rotatePoint(halfWidth, 0),
      rotatePoint(0, halfHeight),
      rotatePoint(-halfWidth, 0),
    ].map((point) => ({ x: values.x + point.x, y: values.y + point.y }));
    const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;

    return {
      d,
      opacity: values.opacity,
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={layer.color} />;
};

const ArcTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const radius = Math.max(1, (layer.radius ?? 12) * values.scale * values.sizeFactor);
    const sweepDeg = layer.sweepDeg ?? 130;
    const startAngle =
      sampleResolvedLayerRotationDeg(
        asset,
        instance,
        layer,
        Math.max(0, progress.value - index * layer.spacing),
        -90,
        90,
      ) -
      sweepDeg / 2;
    const endAngle = startAngle + sweepDeg;
    const toPoint = (angleDeg: number) => {
      const angle = (angleDeg * Math.PI) / 180;
      return {
        x: values.x + radius * Math.cos(angle),
        y: values.y + radius * Math.sin(angle),
      };
    };
    const start = toPoint(startAngle);
    const end = toPoint(endAngle);

    return {
      d: `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}`,
      opacity: values.opacity,
      strokeWidth: Math.max(1, (layer.thickness ?? 3) * values.scale * values.sizeFactor),
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

const StarburstTrailSegment = ({ asset, instance, layer, progress, index }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const values = sampleSegmentValues(asset, instance, layer, progress.value, index);
    const innerRadius = Math.max(0.5, (layer.innerRadius ?? 6) * values.scale * values.sizeFactor);
    const outerRadius = Math.max(
      innerRadius + 0.5,
      (layer.outerRadius ?? 14) * values.scale * values.sizeFactor,
    );
    const pointCount = Math.max(3, Math.round(layer.points ?? 6));
    const rotation =
      (sampleResolvedLayerRotationDeg(
        asset,
        instance,
        layer,
        Math.max(0, progress.value - index * layer.spacing),
        -90,
        90,
      ) *
        Math.PI) /
      180;
    const points = Array.from({ length: pointCount * 2 }, (_, pointIndex) => {
      const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotation + (Math.PI * pointIndex) / pointCount;
      return {
        x: values.x + radius * Math.cos(angle),
        y: values.y + radius * Math.sin(angle),
      };
    });
    const d = points
      .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
      .concat(' Z');

    return {
      d,
      opacity: values.opacity,
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={layer.color} />;
};

const TrailSegment = (props: TrailSegmentProps) => {
  const style = props.layer.style ?? 'fill';

  if (style === 'ring') {
    return <RingTrailSegment {...props} />;
  }

  if (style === 'sprite') {
    return <SpriteTrailSegment {...props} />;
  }

  if (style === 'streak') {
    return <StreakTrailSegment {...props} />;
  }

  if (style === 'diamond') {
    return <DiamondTrailSegment {...props} />;
  }

  if (style === 'arc') {
    return <ArcTrailSegment {...props} />;
  }

  if (style === 'starburst') {
    return <StarburstTrailSegment {...props} />;
  }

  return <FillTrailSegment {...props} />;
};

type TrailPrimitiveProps = {
  asset: EffectAsset;
  instance: EffectInstance;
  layer: TrailLayer;
  progress: SharedValue<number>;
};

const TrailPrimitive = ({ asset, instance, layer, progress }: TrailPrimitiveProps) => {
  return Array.from({ length: layer.segments }, (_, index) => (
    <TrailSegment
      key={`${layer.id}-${index}`}
      asset={asset}
      instance={instance}
      layer={layer}
      progress={progress}
      index={index}
    />
  ));
};

export default TrailPrimitive;
