import { View, type ViewProps } from 'react-native';
import { colors } from '@/constants/colors';

type ScreenContainerProps = ViewProps & {
  centered?: boolean;
};

const ScreenContainer = ({ centered, style, ...props }: ScreenContainerProps) => {
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.backgroundDark },
        centered && { justifyContent: 'center', alignItems: 'center' },
        style,
      ]}
      {...props}
    />
  );
};

export default ScreenContainer;
