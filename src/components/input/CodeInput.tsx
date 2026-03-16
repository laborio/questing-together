import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/constants/colors';

type CodeInputProps = Omit<TextInputProps, 'style'>;

const CodeInput = ({ ...props }: CodeInputProps) => {
  return (
    <TextInput
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={8}
      placeholder="ROOM CODE"
      placeholderTextColor={colors.textPlaceholder}
      style={styles.input}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundInput,
    fontSize: 17,
    fontFamily: 'Besley',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    width: '100%',
    maxWidth: 320,
  },
});

export default CodeInput;
