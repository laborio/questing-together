import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import fontBesleyItalic from '@/assets/fonts/Besley-Italic-VariableFont_wght.ttf';
import fontBesley from '@/assets/fonts/Besley-VariableFont_wght.ttf';
import imgBackgroundHeader from '@/assets/images/T_Background_Header.png';
import imgBackgroundPaper from '@/assets/images/T_Background_Paper.png';
import imgButton from '@/assets/images/T_Button.png';
import imgButtonDisabled from '@/assets/images/T_Button_Disabled.png';
import imgButtonSelected from '@/assets/images/T_Button_Selected.png';
import imgDividerL from '@/assets/images/T_Divider_L.png';
import imgDividerS from '@/assets/images/T_Divider_S.png';
import imgHeaderBorder from '@/assets/images/T_HeaderBorder.png';
import imgHomeScreenArt from '@/assets/images/T_HomeScreen_Art.png';
import imgHomeScreenTitleFrame from '@/assets/images/T_HomeScreen_TitleFrame.png';
import imgPartyHealthFrame from '@/assets/images/T_PartyHealthFrame.png';
import imgPortraitFrame from '@/assets/images/T_PortraitFrame.png';
import imgRangerPortrait from '@/assets/images/T_RangerPortrait.png';
import imgSagePortrait from '@/assets/images/T_SagePortrait.png';
import imgWarriorPortrait from '@/assets/images/T_WarriorPortrait.png';
import { useColorScheme } from '@/hooks/useColorScheme';

void SplashScreen.preventAutoHideAsync();

const bootImageAssets: number[] = [
  imgBackgroundPaper,
  imgBackgroundHeader,
  imgHeaderBorder,
  imgHomeScreenArt,
  imgHomeScreenTitleFrame,
  imgButton,
  imgButtonSelected,
  imgButtonDisabled,
  imgDividerL,
  imgDividerS,
  imgPortraitFrame,
  imgRangerPortrait,
  imgSagePortrait,
  imgWarriorPortrait,
  imgPartyHealthFrame,
];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontsError] = useFonts({
    Besley: fontBesley,
    BesleyItalic: fontBesleyItalic,
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
