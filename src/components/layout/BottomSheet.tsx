import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

type BottomSheetSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeStyles: Record<
  BottomSheetSize,
  {
    paddingTop: number;
    paddingHorizontal: number;
    borderTopLeftRadius: number;
    borderTopRightRadius: number;
  }
> = {
  xs: { paddingTop: 8, paddingHorizontal: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  sm: { paddingTop: 12, paddingHorizontal: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  md: { paddingTop: 14, paddingHorizontal: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  lg: { paddingTop: 20, paddingHorizontal: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
};

type BottomSheetProps = {
  children: ReactNode;
  size?: BottomSheetSize;
  gap?: number;
  style?: ViewStyle;
};

const BottomSheet = ({ children, size = 'sm', gap = 10, style }: BottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const s = sizeStyles[size];

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: s.paddingHorizontal,
          paddingTop: s.paddingTop,
          paddingBottom: s.paddingTop + insets.bottom,
          gap,
          backgroundColor: colors.backgroundOverlayPanel,
          borderTopLeftRadius: s.borderTopLeftRadius,
          borderTopRightRadius: s.borderTopRightRadius,
          borderTopWidth: 1,
          borderColor: colors.borderOverlay,
          shadowColor: colors.textBlack,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default BottomSheet;
export type { BottomSheetSize };
