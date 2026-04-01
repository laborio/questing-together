import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';
import ArcPrimitive from '@/features/vfx/primitives/ArcPrimitive';
import DiamondPrimitive from '@/features/vfx/primitives/DiamondPrimitive';
import OrbPrimitive from '@/features/vfx/primitives/OrbPrimitive';
import RadialGradientPrimitive from '@/features/vfx/primitives/RadialGradientPrimitive';
import RingPrimitive from '@/features/vfx/primitives/RingPrimitive';
import SpritePrimitive from '@/features/vfx/primitives/SpritePrimitive';
import StarburstPrimitive from '@/features/vfx/primitives/StarburstPrimitive';
import StreakPrimitive from '@/features/vfx/primitives/StreakPrimitive';
import TrailPrimitive from '@/features/vfx/primitives/TrailPrimitive';
import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import { getEffectPlaybackDurationMs } from '@/features/vfx/runtime/getEffectPlaybackDurationMs';
import type { EffectLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type EffectPlayerProps = {
  instance: EffectInstance;
  onComplete: (instanceId: string) => void;
  active?: boolean;
};

function renderLayer(layer: EffectLayer, instance: EffectInstance, progress: SharedValue<number>) {
  const asset = getEffectAsset(instance.assetId);

  if (!asset) return null;

  switch (layer.type) {
    case 'orb':
      return (
        <OrbPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'ring':
      return (
        <RingPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'radialGradient':
      return (
        <RadialGradientPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'streak':
      return (
        <StreakPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'diamond':
      return (
        <DiamondPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'arc':
      return (
        <ArcPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'starburst':
      return (
        <StarburstPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'trail':
      return (
        <TrailPrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'sprite':
      return (
        <SpritePrimitive
          key={layer.id}
          asset={asset}
          instance={instance}
          layer={layer}
          progress={progress}
        />
      );
    case 'particleEmitter':
    case 'shaderLayer':
      return null;
  }
}

const EffectPlayer = ({ instance, onComplete, active = true }: EffectPlayerProps) => {
  const progress = useSharedValue(0);
  const asset = getEffectAsset(instance.assetId);
  const shouldLoop = instance.loopOverride ?? asset?.loop ?? false;
  const animationDurationMs = Math.max(1, instance.durationMsOverride ?? asset?.durationMs ?? 1);
  const playbackDurationMs =
    asset && !shouldLoop
      ? getEffectPlaybackDurationMs(asset, instance.durationMsOverride, true)
      : animationDurationMs;

  useEffect(() => {
    if (!active || !asset) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: animationDurationMs, easing: Easing.linear }),
      shouldLoop ? -1 : 1,
      false,
    );

    if (shouldLoop) {
      return () => {
        cancelAnimation(progress);
      };
    }

    const timeoutId = setTimeout(() => {
      onComplete(instance.instanceId);
    }, playbackDurationMs + 32);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimation(progress);
    };
  }, [
    animationDurationMs,
    asset,
    instance.instanceId,
    onComplete,
    playbackDurationMs,
    progress,
    shouldLoop,
    active,
  ]);

  if (!asset) return null;
  if (!active) return null;

  return (
    <Svg pointerEvents="none" style={styles.canvas} width="100%" height="100%">
      {asset.layers.map((layer) => renderLayer(layer, instance, progress))}
    </Svg>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default EffectPlayer;
