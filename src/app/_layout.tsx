import '../../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import AppLoader from '@/components/AppLoader';
import { GameProvider } from '@/contexts/GameProvider';
import { useColorScheme } from '@/hooks/useColorScheme';

const fonts = {
  Besley: fontBesley,
  BesleyItalic: fontBesleyItalic,
};

const images = [
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

const RootLayout = () => {
  const colorScheme = useColorScheme();

  return (
    <AppLoader fonts={fonts} images={images}>
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
