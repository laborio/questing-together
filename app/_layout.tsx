import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Text } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

void SplashScreen.preventAutoHideAsync();

const bootImageAssets: number[] = [
  require('../assets/images/T_Background_Paper.png'),
  require('../assets/images/T_Background_Header.png'),
  require('../assets/images/T_HeaderBorder.png'),
  require('../assets/images/T_HomeScreen_Art.png'),
  require('../assets/images/T_HomeScreen_TitleFrame.png'),
  require('../assets/images/T_Button.png'),
  require('../assets/images/T_Button_Selected.png'),
  require('../assets/images/T_Button_Disabled.png'),
  require('../assets/images/T_Divider_L.png'),
  require('../assets/images/T_Divider_S.png'),
  require('../assets/images/T_PortraitFrame.png'),
  require('../assets/images/T_RangerPortrait.png'),
  require('../assets/images/T_SagePortrait.png'),
  require('../assets/images/T_WarriorPortrait.png'),
  require('../assets/images/T_PartyHealthFrame.png'),
];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontsError] = useFonts({
    Besley: require('../assets/fonts/Besley-VariableFont_wght.ttf'),
    BesleyItalic: require('../assets/fonts/Besley-Italic-VariableFont_wght.ttf'),
  });
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await Asset.loadAsync(bootImageAssets);
      } catch (error) {
        console.warn('Image preload failed', error);
      } finally {
        if (mounted) {
          setImagesLoaded(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const appReady = fontsLoaded && imagesLoaded;

  useEffect(() => {
    if (!appReady) return;
    void SplashScreen.hideAsync();
  }, [appReady]);

  if (fontsError) {
    throw fontsError;
  }

  if (!appReady) {
    return null;
  }

  const TextAny = Text as unknown as { defaultProps?: { style?: any } };
  TextAny.defaultProps = TextAny.defaultProps ?? {};
  TextAny.defaultProps.style = [TextAny.defaultProps.style, { fontFamily: 'Besley', fontWeight: '400' }];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
