import { Image, View, type ViewStyle } from 'react-native';
import partyHealthFrame from '@/assets/images/T_PartyHealthFrame.png';
import AnimatedBarFill from '@/components/display/AnimatedBarFill';
import Typography from '@/components/display/Typography';
import { colors } from '@/constants/colors';

type HealthBarProps = {
  current: number;
  max: number;
  label?: string;
  compact?: boolean;
  textColor?: string;
  style?: ViewStyle;
};

const HealthBar = ({
  current,
  max,
  label,
  compact = false,
  textColor = colors.textPrimary,
  style,
}: HealthBarProps) => {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(1, current / safeMax));
  const displayLabel = label ?? `Party Health ${current}/${max}`;

  return (
    <View
      style={[{ flex: 1, minWidth: 0, height: compact ? 32 : 36, justifyContent: 'center' }, style]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: compact ? 9 : 0,
          overflow: 'hidden',
        }}
      >
        <AnimatedBarFill
          percent={percent}
          style={{ height: '100%', backgroundColor: colors.hpFill }}
        />
      </View>

      <Image
        source={partyHealthFrame}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: compact ? 32 : 36 }}
      />
      <Typography
        variant="body"
        style={{
          textAlign: 'center',
          fontSize: compact ? 11 : 13,
          fontWeight: '700',
          color: textColor,
        }}
      >
        {displayLabel}
      </Typography>
    </View>
  );
};

export default HealthBar;
