import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

interface TiledBackgroundProps {
  source: number;
}

const TiledBackground = ({ source }: TiledBackgroundProps) => {
  const { width, height } = useWindowDimensions();
  const tileWidth = Math.min(512, Math.max(1, Math.floor(width)));
  const tileHeight = Math.max(1, Math.floor(tileWidth * 1.5));
  const columns = Math.ceil(width / tileWidth) + 1;
  const rows = Math.ceil(height / tileHeight) + 1;
  const tileCount = columns * rows;

  return (
    <View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        flexWrap: 'wrap',
        opacity: 1,
      }}
    >
      {Array.from({ length: tileCount }).map((_, index) => (
        <Image
          key={`tile-${index}`}
          source={source}
          style={{ width: tileWidth, height: tileHeight }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
};

export default TiledBackground;
