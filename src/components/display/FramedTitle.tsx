import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native';

type FramedTitleProps = {
  source: ImageSourcePropType;
  style?: ViewStyle;
  children: ReactNode;
};

const FramedTitle = ({ source, style, children }: FramedTitleProps) => {
  return (
    <View style={[{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={source}
        resizeMode="stretch"
        style={[StyleSheet.absoluteFillObject, { width: undefined, height: undefined }]}
      />
      {children}
    </View>
  );
};

export default FramedTitle;
