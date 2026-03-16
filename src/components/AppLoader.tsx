import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

void SplashScreen.preventAutoHideAsync();

type AppLoaderProps = {
  fonts: Record<string, number>;
  images: number[];
  children: ReactNode;
};

const AppLoader = ({ fonts, images, children }: AppLoaderProps) => {
  const [fontsLoaded, fontsError] = useFonts(fonts);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Asset.loadAsync(images)
      .catch((error) => console.warn('Image preload failed', error))
      .finally(() => {
        if (!controller.signal.aborted) setImagesLoaded(true);
      });

    return () => controller.abort();
  }, [images]);

  const onLayoutRootView = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (fontsError) throw fontsError;
  if (!fontsLoaded || !imagesLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {children}
    </View>
  );
};

export default AppLoader;
