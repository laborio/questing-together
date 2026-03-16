import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { preloadFonts } from '@/assets/fonts';
import { preloadImages } from '@/assets/images';
import { ScreenContainer } from '@/components';

void SplashScreen.preventAutoHideAsync();

type AppLoaderProps = {
  children: ReactNode;
};

const AppLoader = ({ children }: AppLoaderProps) => {
  const [fontsLoaded, fontsError] = useFonts(preloadFonts);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    Asset.loadAsync(preloadImages)
      .catch((error) => console.warn('Image preload failed', error))
      .finally(() => setImagesLoaded(true));
  }, []);

  const onLayoutRootView = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (fontsError) throw fontsError;
  if (!fontsLoaded || !imagesLoaded) return null;

  return <ScreenContainer onLayout={onLayoutRootView}>{children}</ScreenContainer>;
};

export default AppLoader;
