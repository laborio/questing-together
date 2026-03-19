import type { ReactNode } from 'react';
import {
  ImageBackground,
  type ImageSourcePropType,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

type BackgroundArtProps = {
  source: ImageSourcePropType;
  style?: ViewStyle;
  children: ReactNode;
};

const BackgroundArt = ({ source, style, children }: BackgroundArtProps) => {
  return (
    <ImageBackground
      source={source}
      resizeMode="cover"
      style={[{ width: '100%', overflow: 'hidden', justifyContent: 'center' }, style]}
    >
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.backgroundOverlay }]}
      />
      {children}
    </ImageBackground>
  );
};

export default BackgroundArt;
