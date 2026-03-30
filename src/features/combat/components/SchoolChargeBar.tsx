import { Pressable, View } from 'react-native';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import type { TraitMeta } from '@/features/gameConfig';

type SchoolChargeBarProps = {
  schools: TraitMeta[];
  schoolCharges: Record<string, number>;
  attuneCharges: number;
  attuneActive: boolean;
  attuneTargetSchool: string | null;
  onAttunePress: () => void;
  onSchoolPress: (school: string) => void;
};

const ChargeDots = ({
  charge,
  color,
  empowered,
}: {
  charge: number;
  color: string;
  empowered: boolean;
}) => (
  <Stack direction="row" gap={2}>
    {Array.from({ length: COMBAT.empowerThreshold }, (_, i) => (
      <View
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: i < charge ? color : `${color}33`,
          borderWidth: empowered && i < charge ? 1 : 0,
          borderColor: empowered ? color : 'transparent',
        }}
      />
    ))}
  </Stack>
);

const SchoolChargeBar = ({
  schools,
  schoolCharges,
  attuneCharges,
  attuneActive,
  attuneTargetSchool,
  onAttunePress,
  onSchoolPress,
}: SchoolChargeBarProps) => (
  <Stack
    direction="row"
    gap={6}
    align="center"
    justify="space-between"
    style={{ paddingVertical: 4 }}
  >
    <Stack direction="row" gap={8} align="center" flex={1}>
      {schools.map((school) => {
        const charge = schoolCharges[school.id] ?? 0;
        const empowered = charge >= COMBAT.empowerThreshold;
        const isAttuneTarget = attuneActive && attuneTargetSchool === school.id;

        return (
          <Pressable
            key={school.id}
            onPress={() => onSchoolPress(school.id)}
            disabled={!attuneActive}
          >
            <Stack
              direction="row"
              gap={3}
              align="center"
              style={{
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: isAttuneTarget ? 1 : 0,
                borderColor: isAttuneTarget ? colors.intentConfirmedBorder : 'transparent',
                backgroundColor: isAttuneTarget
                  ? `${colors.intentConfirmedBorder}22`
                  : 'transparent',
              }}
            >
              <Typography variant="micro">{school.icon}</Typography>
              <ChargeDots charge={charge} color={school.color} empowered={empowered} />
            </Stack>
          </Pressable>
        );
      })}
    </Stack>

    <Pressable onPress={onAttunePress} disabled={attuneCharges <= 0 && !attuneActive}>
      <Stack
        direction="row"
        gap={3}
        align="center"
        style={{
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: attuneActive
            ? colors.intentConfirmedBorder
            : attuneCharges > 0
              ? colors.tabBorder
              : `${colors.tabBorder}44`,
          backgroundColor: attuneActive ? `${colors.intentConfirmedBorder}22` : 'transparent',
          opacity: attuneCharges <= 0 && !attuneActive ? 0.4 : 1,
        }}
      >
        <Typography
          variant="micro"
          style={{
            color: attuneActive ? colors.intentConfirmedBorder : colors.textSecondary,
            fontWeight: '700',
          }}
        >
          ATT {attuneCharges}
        </Typography>
      </Stack>
    </Pressable>
  </Stack>
);

export default SchoolChargeBar;
