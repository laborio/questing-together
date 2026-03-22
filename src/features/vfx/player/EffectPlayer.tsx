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
import RingPrimitive from '@/features/vfx/primitives/RingPrimitive';
import SpritePrimitive from '@/features/vfx/primitives/SpritePrimitive';
import StarburstPrimitive from '@/features/vfx/primitives/StarburstPrimitive';
import StreakPrimitive from '@/features/vfx/primitives/StreakPrimitive';
import TrailPrimitive from '@/features/vfx/primitives/TrailPrimitive';
import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import type { EffectLayer } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type EffectPlayerProps = {
  instance: EffectInstance;
  onComplete: (instanceId: string) => void;
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
  }
}

const EffectPlayer = ({ instance, onComplete }: EffectPlayerProps) => {
  const progress = useSharedValue(0);
  const asset = getEffectAsset(instance.assetId);
  const playbackDurationMs = Math.max(1, instance.durationMsOverride ?? asset?.durationMs ?? 1);

  useEffect(() => {
    if (!asset) return;

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: playbackDurationMs, easing: Easing.linear }),
      asset.loop ? -1 : 1,
      false,
    );

    if (asset.loop) {
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
  }, [asset, instance.instanceId, onComplete, playbackDurationMs, progress]);

  if (!asset) return null;

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
