import '../../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import AppLoader from '@/components/utils/AppLoader';
import { GameProvider } from '@/contexts/GameContext';
import { useColorScheme } from '@/hooks/useColorScheme';

const RootLayout = () => {
  const colorScheme = useColorScheme();

  return (
    <AppLoader>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GameProvider>
          <Slot />
          <StatusBar style="auto" />
        </GameProvider>
      </ThemeProvider>
    </AppLoader>
  );
};

export default RootLayout;
