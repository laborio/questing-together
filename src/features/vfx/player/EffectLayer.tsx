import { StyleSheet, View } from 'react-native';
import EffectPlayer from '@/features/vfx/player/EffectPlayer';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type EffectLayerProps = {
  instances: EffectInstance[];
  onComplete: (instanceId: string) => void;
};

const EffectLayer = ({ instances, onComplete }: EffectLayerProps) => {
  return (
    <View pointerEvents="none" style={styles.layer}>
      {instances.map((instance) => (
        <EffectPlayer key={instance.instanceId} instance={instance} onComplete={onComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
});

export default EffectLayer;
