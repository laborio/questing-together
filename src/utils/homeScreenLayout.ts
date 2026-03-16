import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const useHomeScreenLayout = () => {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return {
    minHeight: Math.max(560, height + insets.top + insets.bottom),
    titleTopOffset: Math.max(52, Math.round(height * 0.16)),
    actionsBottomOffset: Math.max(90, Math.round(height * 0.16)),
    titleFrameHeight: Math.max(106, Math.round(height * 0.15)),
    titleFrameWidth: width + 32,
    insets,
  };
};

export { useHomeScreenLayout };
