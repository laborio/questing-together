import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type CardProps = {
  gap?: number;
  embedded?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  style?: ViewStyle;
  children: ReactNode;
};

const Card = ({
  gap = 10,
  embedded = false,
  backgroundColor = colors.backgroundCard,
  borderColor = colors.borderCard,
  style,
  children,
}: CardProps) => {
  return (
    <Stack
      gap={gap}
      style={[
        embedded
          ? { backgroundColor: 'transparent' }
          : { backgroundColor, borderRadius: 12, padding: 12, borderWidth: 1, borderColor },
        style,
      ]}
    >
      {children}
    </Stack>
  );
};

export default Card;
