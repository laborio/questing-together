import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/constants/colors';
import { sampleTrack } from '@/features/vfx/runtime';
import type { EffectAsset } from '@/features/vfx/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 220;

type EffectPreviewProps = {
  asset: EffectAsset;
};

type TrailSegmentProps = {
  asset: EffectAsset;
  index: number;
  progress: SharedValue<number>;
};

const TrailSegment = ({ asset, index, progress }: TrailSegmentProps) => {
  const animatedProps = useAnimatedProps(() => {
    const sampledProgress = Math.max(0, progress.value - index * asset.trail.spacing);
    const x = sampleTrack(asset.tracks.x, sampledProgress) * PREVIEW_WIDTH;
    const y = sampleTrack(asset.tracks.y, sampledProgress) * PREVIEW_HEIGHT;
    const scale = sampleTrack(asset.tracks.scale, sampledProgress);
    const alpha = sampleTrack(asset.tracks.alpha, sampledProgress);
    const glow = sampleTrack(asset.tracks.glow, sampledProgress);
    const radius = asset.trail.baseRadius * scale * (1 - index * 0.09);
    const opacity = alpha * (0.52 - index * 0.06) * (0.65 + glow * 0.35);

    return {
      cx: x,
      cy: y,
      r: Math.max(2, radius),
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <AnimatedCircle animatedProps={animatedProps} fill={index === 0 ? '#f8f3d0' : '#d69f4b'} />
  );
};

const EffectPreview = ({ asset }: EffectPreviewProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: asset.durationMs,
        easing: Easing.linear,
      }),
      asset.loop ? -1 : 1,
      false,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [asset.durationMs, asset.loop, progress]);

  const cometGlowProps = useAnimatedProps(() => {
    const x = sampleTrack(asset.tracks.x, progress.value) * PREVIEW_WIDTH;
    const y = sampleTrack(asset.tracks.y, progress.value) * PREVIEW_HEIGHT;
    const scale = sampleTrack(asset.tracks.scale, progress.value);
    const alpha = sampleTrack(asset.tracks.alpha, progress.value);
    const glow = sampleTrack(asset.tracks.glow, progress.value);

    return {
      cx: x,
      cy: y,
      r: 26 * scale * (1 + glow * 0.55),
      opacity: Math.max(0.15, alpha * 0.3 + glow * 0.45),
    };
  });

  const cometCoreProps = useAnimatedProps(() => {
    const x = sampleTrack(asset.tracks.x, progress.value) * PREVIEW_WIDTH;
    const y = sampleTrack(asset.tracks.y, progress.value) * PREVIEW_HEIGHT;
    const scale = sampleTrack(asset.tracks.scale, progress.value);
    const alpha = sampleTrack(asset.tracks.alpha, progress.value);

    return {
      cx: x,
      cy: y,
      r: 11 * scale,
      opacity: alpha,
    };
  });

  const burstRingProps = useAnimatedProps(() => {
    const x = sampleTrack(asset.tracks.x, progress.value) * PREVIEW_WIDTH;
    const y = sampleTrack(asset.tracks.y, progress.value) * PREVIEW_HEIGHT;
    const ring = sampleTrack(asset.tracks.ring, progress.value);

    return {
      cx: x,
      cy: y,
      r: 10 + ring * 52,
      opacity: Math.max(0, 1 - ring),
      strokeWidth: 2 + ring * 6,
    };
  });

  return (
    <View style={styles.frame}>
      <Svg width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
        <Defs>
          <LinearGradient id="previewBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#120d08" />
            <Stop offset="55%" stopColor="#20160f" />
            <Stop offset="100%" stopColor="#3b2314" />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          rx={18}
          fill="url(#previewBg)"
        />
        <Circle cx={78} cy={50} r={52} fill="rgba(244, 186, 96, 0.05)" />
        <Circle cx={254} cy={172} r={66} fill="rgba(104, 65, 30, 0.16)" />
        {Array.from({ length: asset.trail.segments }, (_, index) => (
          <TrailSegment key={`trail-${index}`} asset={asset} index={index} progress={progress} />
        ))}
        <AnimatedCircle animatedProps={cometGlowProps} fill="rgba(255, 177, 59, 0.35)" />
        <AnimatedCircle animatedProps={burstRingProps} fill="transparent" stroke="#ffd27a" />
        <AnimatedCircle animatedProps={cometCoreProps} fill="#fff6d7" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderOverlay,
    backgroundColor: '#140d08',
    alignSelf: 'center',
  },
});

export default EffectPreview;
