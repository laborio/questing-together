import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/constants/colors';

type CircularHealthBarProps = {
  hp: number;
  hpMax: number;
  size?: number;
  strokeWidth?: number;
};

const CircularHealthBar = ({ hp, hpMax, size = 80, strokeWidth = 3 }: CircularHealthBarProps) => {
  const percent = Math.max(0, Math.min(1, hp / Math.max(1, hpMax)));
  const hpColor = percent > 0.25 ? colors.combatHeal : colors.combatDamage;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent);

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.combatHealthBarBg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Fill */}
      {percent > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={hpColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          opacity={0.8}
        />
      ) : null}
    </Svg>
  );
};

export default CircularHealthBar;
