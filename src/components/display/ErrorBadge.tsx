import type { ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type ErrorBadgeProps = {
  children: ReactNode;
  textAlign?: TextStyle['textAlign'];
  style?: ViewStyle;
};

const ErrorBadge = ({ children, textAlign, style }: ErrorBadgeProps) => (
  <Stack
    style={[
      {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.errorBadgeBorder,
        backgroundColor: colors.errorBadgeBg,
        paddingHorizontal: 10,
        paddingVertical: 8,
      },
      style,
    ]}
  >
    <Typography
      variant="body"
      style={{
        color: colors.errorBadgeText,
        fontSize: 11,
        lineHeight: 15,
        textAlign,
      }}
    >
      {children}
    </Typography>
  </Stack>
);

export default ErrorBadge;
