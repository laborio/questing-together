import { View } from 'react-native';
import AnimatedBarFill from '@/components/display/AnimatedBarFill';
import Typography from '@/components/display/Typography';
import { Stack } from '@/components/layout';

type StatBarProps = {
  label: string;
  current: number;
  max: number;
  fillColor: string;
  trackColor: string;
  labelColor?: string;
  valueColor?: string;
};

const StatBar = ({
  label,
  current,
  max,
  fillColor,
  trackColor,
  labelColor,
  valueColor,
}: StatBarProps) => {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(1, current / safeMax));

  return (
    <Stack gap={6}>
      <Typography variant="caption" style={{ fontSize: 12, fontWeight: '700', color: labelColor }}>
        {label}
      </Typography>
      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: trackColor,
          overflow: 'hidden',
        }}
      >
        <AnimatedBarFill percent={percent} style={{ height: '100%', backgroundColor: fillColor }} />
      </View>
      <Typography variant="body" style={{ fontSize: 13, fontWeight: '700', color: valueColor }}>
        {current}/{max}
      </Typography>
    </Stack>
  );
};

export default StatBar;
