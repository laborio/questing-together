import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Typography } from '@/components';

type FloatingDamageProps = {
  text: string;
  color: string;
};

const FloatingDamage = ({ text, color }: FloatingDamageProps) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(-40, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 });
  }, [translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -10,
          alignSelf: 'center',
          zIndex: 200,
        },
        style,
      ]}
    >
      <Typography
        variant="body"
        style={{
          color,
          fontSize: 18,
          fontWeight: '800',
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }}
      >
        {text}
      </Typography>
    </Animated.View>
  );
};

export default FloatingDamage;
