import { HealthBar, Portrait } from '@/components/display';
import { Stack } from '@/components/layout';
import { colors } from '@/constants/colors';
import type { StatusTone } from '@/constants/statusTones';
import { portraitByRole } from '@/utils/portraitByRole';

type PartyStatusRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: StatusTone;
};

type PartyTopBarProps = {
  partyHp: number;
  partyHpMax: number;
  rows: PartyStatusRow[];
  variant?: 'default' | 'parchment' | 'overlay';
};

const variantStyles = {
  default: {
    barBg: colors.backgroundTopBar,
    nameColor: colors.textAvatarName,
    hpTextColor: colors.textPrimary,
  },
  parchment: {
    barBg: colors.backgroundTopBarParchment,
    nameColor: colors.textAvatarNameParchment,
    hpTextColor: colors.textOverlayHeading,
  },
  overlay: {
    barBg: 'transparent',
    nameColor: colors.textPrimary,
    hpTextColor: colors.textPrimary,
  },
} as const;

const PartyTopBar = ({ partyHp, partyHpMax, rows, variant = 'default' }: PartyTopBarProps) => {
  const isCompact = variant === 'overlay';

  const { barBg, nameColor, hpTextColor } = variantStyles[variant];

  return (
    <Stack direction="row" gap={isCompact ? 4 : 8} style={{ backgroundColor: barBg }}>
      {rows.map((row) => (
        <Portrait
          key={row.id}
          source={portraitByRole(row.role)}
          name={row.name}
          size={isCompact ? 52 : 84}
          nameColor={nameColor}
          nameFontSize={isCompact ? 9 : 16}
          style={{ width: isCompact ? 66 : 96, flexShrink: 0 }}
        />
      ))}
      <HealthBar current={partyHp} max={partyHpMax} compact={isCompact} textColor={hpTextColor} />
    </Stack>
  );
};

export default PartyTopBar;
