import {
  Image,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import buttonTexture from '@/assets/images/T_Button.png';
import buttonTextureDisabled from '@/assets/images/T_Button_Disabled.png';
import Typography from '@/components/display/Typography';
import { colors } from '@/constants/colors';

type TexturedButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  hint?: string;
  style?: ViewStyle;
};

const TexturedButton = ({ label, hint, disabled, style, ...props }: TexturedButtonProps) => {
  return (
    <Pressable
      disabled={disabled}
      style={[{ width: '100%', maxWidth: 420 }, disabled && { opacity: 0.6 }, style]}
      {...props}
    >
      <View
        style={{
          minHeight: 66,
          borderRadius: 10,
          overflow: 'hidden',
          paddingHorizontal: 14,
          paddingVertical: 10,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Image
          source={disabled ? buttonTextureDisabled : buttonTexture}
          resizeMode="stretch"
          style={[
            StyleSheet.absoluteFillObject,
            { width: undefined, height: undefined, borderRadius: 10 },
          ]}
        />
        <Typography
          variant="body"
          style={{
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" style={{ textAlign: 'center' }}>
            {hint}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
};

export default TexturedButton;
