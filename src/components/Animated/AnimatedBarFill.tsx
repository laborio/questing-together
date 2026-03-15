import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

type AnimatedBarFillProps = {
  percent: number;
  style?: StyleProp<ViewStyle>;
  decreaseDuration?: number;
  increaseDuration?: number;
};

export function AnimatedBarFill({
  percent,
  style,
  decreaseDuration = 650,
  increaseDuration = 220,
}: AnimatedBarFillProps) {
  const clampedPercent = Math.max(0, Math.min(1, percent));
  const width = useRef(new Animated.Value(0)).current;
  const lastPercentRef = useRef(clampedPercent);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (trackWidth <= 0) return;

    const targetWidth = trackWidth * clampedPercent;
    const previousPercent = lastPercentRef.current;
    lastPercentRef.current = clampedPercent;

    width.stopAnimation();
    Animated.timing(width, {
      toValue: targetWidth,
      duration: clampedPercent < previousPercent ? decreaseDuration : increaseDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedPercent, decreaseDuration, increaseDuration, trackWidth, width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setTrackWidth((currentWidth) => {
      if (Math.abs(currentWidth - nextWidth) < 0.5) {
        return currentWidth;
      }
      return nextWidth;
    });
    width.setValue(nextWidth * clampedPercent);
  };

  return (
    <View pointerEvents="none" style={styles.track} onLayout={handleLayout}>
      <Animated.View style={[styles.fill, style, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    ...StyleSheet.absoluteFillObject,
  },
  fill: {
    height: '100%',
  },
});
