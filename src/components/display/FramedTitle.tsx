import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, type ViewStyle } from 'react-native';
import Stack from '@/components/layout/Stack';

type FramedTitleProps = {
  source: ImageSourcePropType;
  style?: ViewStyle;
  children: ReactNode;
};

const FramedTitle = ({ source, style, children }: FramedTitleProps) => {
  return (
    <Stack align="center" justify="center" style={[{ alignSelf: 'center' }, style]}>
      <Image
        source={source}
        resizeMode="stretch"
        style={[StyleSheet.absoluteFillObject, { width: undefined, height: undefined }]}
      />
      {children}
    </Stack>
  );
};

export default FramedTitle;
