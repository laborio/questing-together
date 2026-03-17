import { Image, type ImageSourcePropType, type ViewStyle } from 'react-native';
import portraitFrame from '@/assets/images/T_PortraitFrame.png';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';

type PortraitProps = {
  source: ImageSourcePropType;
  name?: string;
  size?: number;
  nameColor?: string;
  nameFontSize?: number;
  highlighted?: boolean;
  highlightColor?: string;
  hideName?: boolean;
  style?: ViewStyle;
};

const Portrait = ({
  source,
  name,
  size = 84,
  nameColor,
  nameFontSize = 16,
  highlighted = false,
  highlightColor,
  hideName = false,
  style,
}: PortraitProps) => {
  return (
    <Stack align="center" style={style}>
      <Stack
        align="center"
        justify="center"
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          borderWidth: highlighted ? 1.5 : 0,
          borderColor: highlighted
            ? (highlightColor ?? colors.intentConfirmedBorder)
            : 'transparent',
        }}
      >
        <Image source={portraitFrame} style={{ width: '100%', height: '100%' }} />
        <Image
          source={source}
          resizeMode="contain"
          style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}
        />
      </Stack>
      {name && !hideName ? (
        <Typography
          variant="body"
          style={{ marginTop: 4, fontSize: nameFontSize, fontWeight: '600', color: nameColor }}
        >
          {name}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default Portrait;
