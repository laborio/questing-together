import { Image, type ImageSourcePropType, Pressable, View } from 'react-native';
import eyesIcon from '@/assets/images/spellIcons/eyes.png';
import fireIcon from '@/assets/images/spellIcons/fire.png';
import leafIcon from '@/assets/images/spellIcons/leaf.png';
import shieldIcon from '@/assets/images/spellIcons/shield.png';
import strikeIcon from '@/assets/images/spellIcons/strike.png';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import type { TraitMeta } from '@/features/gameConfig';

const TRAIT_ICON_MAP: Record<string, ImageSourcePropType> = {
  fire: fireIcon,
  guard: shieldIcon,
  shadow: eyesIcon,
  storm: strikeIcon,
  nature: leafIcon,
};

type SchoolChargeBarProps = {
  energy: number;
  maxEnergy: number;
  schools: TraitMeta[];
  schoolCharges: Record<string, number>;
  onEndTurn: () => void;
  endTurnDisabled?: boolean;
  endTurnLabel: string;
};

const CIRCLE_SIZE = 38;
const DOT_SIZE = 8;

const TraitOrb = ({
  icon,
  charge,
  color,
  empowered,
}: {
  icon: ImageSourcePropType;
  charge: number;
  color: string;
  empowered: boolean;
}) => {
  const threshold = COMBAT.empowerThreshold;
  const radius = CIRCLE_SIZE / 2;

  return (
    <View
      style={{
        width: CIRCLE_SIZE + DOT_SIZE,
        height: CIRCLE_SIZE + DOT_SIZE + 4,
        alignItems: 'center',
      }}
    >
      {/* Circle border around icon */}
      <View
        style={{
          marginTop: 0,
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          borderWidth: 1,
          borderColor: empowered ? color : '#2d2e35',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: empowered ? color : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: empowered ? 0.8 : 0,
          shadowRadius: empowered ? 8 : 0,
        }}
      >
        <Image source={icon} style={{ width: 18, height: 18 }} resizeMode="contain" />
      </View>

      {/* Charge dots positioned along the bottom arc of the circle */}
      {Array.from({ length: threshold }, (_, i) => {
        // Spread dots along bottom arc: angles from 210° to 330° (bottom half)
        const startAngle = 55;
        const endAngle = 125;
        const angle = startAngle + ((endAngle - startAngle) / (threshold - 1)) * i;
        const rad = (angle * Math.PI) / 180;
        const centerX = (CIRCLE_SIZE + DOT_SIZE) / 2;
        const centerY = CIRCLE_SIZE / 2;
        const cx = centerX + Math.cos(rad) * radius - DOT_SIZE / 2;
        const cy = centerY + Math.sin(rad) * radius - DOT_SIZE / 2;
        const filled = i < charge;

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: filled ? color : '#45454b',
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.25)',
              shadowColor: filled && empowered ? color : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: filled && empowered ? 1 : 0,
              shadowRadius: filled && empowered ? 4 : 0,
            }}
          />
        );
      })}
    </View>
  );
};

const SchoolChargeBar = ({
  energy,
  maxEnergy,
  schools,
  schoolCharges,
  onEndTurn,
  endTurnDisabled = false,
  endTurnLabel,
}: SchoolChargeBarProps) => (
  <Stack
    gap={6}
    style={{
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.backgroundCombat,
    }}
  >
    {/* Trait orbs with charge dots on circle */}
    <Stack direction="row" gap={20} align="center" justify="center">
      {schools.map((school) => {
        const charge = schoolCharges[school.id] ?? 0;
        const empowered = charge >= COMBAT.empowerThreshold;

        return (
          <TraitOrb
            key={school.id}
            icon={TRAIT_ICON_MAP[school.id]}
            charge={charge}
            color={school.color}
            empowered={empowered}
          />
        );
      })}
    </Stack>

    {/* Bottom row: energy left + end turn */}
    <Stack direction="row" align="center" justify="space-between">
      <Stack
        direction="row"
        gap={4}
        align="center"
        style={{
          paddingHorizontal: 8,
          paddingVertical: 13,
          borderRadius: 6,
          backgroundColor: `${colors.intentConfirmedBorder}15`,
          borderWidth: 1,
          borderColor: `${colors.intentConfirmedBorder}33`,
        }}
      >
        <Typography
          variant="caption"
          style={{ color: colors.intentConfirmedBorder, fontWeight: '800', fontSize: 13 }}
        >
          ⚡
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.intentConfirmedBorder, fontWeight: '800' }}
        >
          {energy}/{maxEnergy}
        </Typography>
      </Stack>

      <Pressable
        onPress={onEndTurn}
        disabled={endTurnDisabled}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: endTurnDisabled
            ? `${colors.intentConfirmedBorder}44`
            : colors.intentConfirmedBorder,
          backgroundColor: endTurnDisabled ? 'transparent' : `${colors.intentConfirmedBorder}18`,
          opacity: endTurnDisabled ? 0.5 : 1,
        }}
      >
        <Typography
          variant="caption"
          style={{
            color: endTurnDisabled ? colors.textSecondary : colors.intentConfirmedBorder,
            fontWeight: '700',
          }}
        >
          {endTurnLabel}
        </Typography>
      </Pressable>
    </Stack>
  </Stack>
);

export default SchoolChargeBar;
