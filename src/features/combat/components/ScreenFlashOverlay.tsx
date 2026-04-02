import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

type ScreenFlashOverlayProps = {
  flash: SharedValue<number>;
  color: string;
};

const ScreenFlashOverlay = ({ flash, color }: ScreenFlashOverlayProps) => {
  const style = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: color, zIndex: 200 }, style]}
      pointerEvents="none"
    />
  );
};

export default ScreenFlashOverlay;
