import type { ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type ModalBackdropProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

const ModalBackdrop = ({ children, onPress, style }: ModalBackdropProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          backgroundColor: colors.overlayDark,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Stack
        gap={12}
        align="center"
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.backgroundCombatCard,
          borderWidth: 1,
          borderColor: colors.errorDark,
        }}
      >
        {children}
      </Stack>
    </Pressable>
  );
};

export default ModalBackdrop;
