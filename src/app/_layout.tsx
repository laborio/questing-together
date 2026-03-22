import '../../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { queryClient } from '@/api/queryClient';
import AppLoader from '@/components/utils/AppLoader';
import { GameProvider } from '@/contexts/GameContext';
import { I18nProvider } from '@/contexts/I18nContext';
import VfxProvider from '@/features/vfx/VfxProvider';
import { useColorScheme } from '@/hooks/useColorScheme';

const RootLayout = () => {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AppLoader>
        <I18nProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <VfxProvider>
              <GameProvider>
                <Slot />
                <StatusBar style="auto" />
              </GameProvider>
            </VfxProvider>
          </ThemeProvider>
        </I18nProvider>
      </AppLoader>
    </QueryClientProvider>
  );
};

export default RootLayout;
