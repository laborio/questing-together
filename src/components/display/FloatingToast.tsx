import { useEffect, useRef } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Animated, Easing } from 'react-native';
import Portrait from '@/components/display/Portrait';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type FloatingToastProps = {
  portrait: ImageSourcePropType;
  name: string;
  text: string;
  onDone: () => void;
  entryDuration?: number;
  holdDuration?: number;
  fadeDuration?: number;
  riseDistance?: number;
};

const FloatingToast = ({
  portrait,
  name,
  text,
  onDone,
  entryDuration = 140,
  holdDuration = 400,
  fadeDuration = 1600,
  riseDistance = -400,
}: FloatingToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const totalRiseDuration = entryDuration + holdDuration + fadeDuration;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: riseDistance,
        duration: totalRiseDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: entryDuration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: entryDuration,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(holdDuration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: fadeDuration,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      animation.stop();
    };
  }, [
    entryDuration,
    fadeDuration,
    holdDuration,
    onDone,
    opacity,
    riseDistance,
    scale,
    totalRiseDuration,
    translateY,
  ]);

  return (
    <Animated.View
      style={{
        minWidth: 170,
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.emoteToastBorder,
        backgroundColor: colors.emoteToastBg,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 14,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Portrait source={portrait} size={42} />
      <Stack gap={1} shrink={1}>
        <Typography
          variant="caption"
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: colors.emoteToastName,
            letterSpacing: 0.7,
          }}
        >
          {name}
        </Typography>
        <Typography
          variant="body"
          style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}
        >
          {text}
        </Typography>
      </Stack>
    </Animated.View>
  );
};

export default FloatingToast;
