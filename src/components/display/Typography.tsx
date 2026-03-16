import { Text, type TextProps } from 'react-native';
import { colors } from '@/constants/colors';

type TypographyProps = TextProps & {
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'error';
};

const variantStyles = {
  title: {
    fontSize: 30,
    color: colors.textDark,
    fontFamily: 'Besley',
    fontWeight: '700' as const,
    letterSpacing: 0.1,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtitleLight,
    fontFamily: 'Besley',
    textAlign: 'center' as const,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Besley',
  },
  caption: {
    fontSize: 9,
    color: colors.textMuted,
    fontFamily: 'Besley',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    fontFamily: 'Besley',
    textAlign: 'center' as const,
  },
};

const Typography = ({ variant = 'body', style, ...props }: TypographyProps) => {
  return <Text style={[variantStyles[variant], style]} {...props} />;
};

export default Typography;
