import { useCallback, useEffect } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import cardContainerImg from '@/assets/images/cards/card-container.png';
import cardIconImg from '@/assets/images/cards/card-icon.png';
import cardTopCircleImg from '@/assets/images/cards/card-top-circle.png';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import type { Card } from '@/features/gameConfig';
import { getCardById, TRAIT_MAP } from '@/features/gameConfig';
import type { DeckCardInstance } from '@/types/spellCombat';

const CARD_HEIGHT = 125;
const COST_SIZE = 28;

type CardViewProps = {
  instance: DeckCardInstance;
  traitCharge: number;
  canAfford: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const getSubtitle = (card: Card, upgraded: boolean): string => {
  const parts: string[] = [];
  const dmg = upgraded ? (card.upgradedDamage ?? card.baseDamage) : card.baseDamage;
  const blk = upgraded ? (card.upgradedBlock ?? card.baseBlock) : card.baseBlock;
  const heal = upgraded ? (card.upgradedHeal ?? card.baseHeal) : card.baseHeal;
  const burn = upgraded ? (card.upgradedBurn ?? card.baseBurn) : card.baseBurn;

  if (dmg && dmg > 0) parts.push(`${dmg} DMG${card.isAoe ? ' AOE' : ''}`);
  if (blk && blk > 0) parts.push(`${blk} BLK`);
  if (heal && heal > 0) parts.push(`${heal} HEAL`);
  if (burn && burn > 0) parts.push(`${burn} BURN`);

  return parts.join(' · ') || card.description;
};

const CardView = ({
  instance,
  traitCharge,
  canAfford,
  disabled = false,
  onPress,
}: CardViewProps) => {
  const card = getCardById(instance.cardId);

  const isAmplified = traitCharge >= COMBAT.empowerThreshold;
  const traitMeta = card ? TRAIT_MAP[card.trait] : null;
  const traitColor = traitMeta?.color ?? colors.tabBorder;
  const isDisabled = disabled || !canAfford || !card;

  const scale = useSharedValue(1);
  const brightness = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (isAmplified) {
      glowPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
        -1,
        true,
      );
    } else {
      glowPulse.value = 0;
    }
  }, [isAmplified, glowPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isDisabled ? 0.35 : 1 - brightness.value * 0.15,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: traitColor,
    opacity: glowPulse.value * 0.9,
    shadowColor: traitColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowPulse.value,
    shadowRadius: 10 + glowPulse.value * 6,
  }));

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    scale.value = withSequence(
      withTiming(0.9, { duration: 60 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 80 }),
    );
    brightness.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );
    onPress();
  }, [onPress, isDisabled, scale, brightness]);

  if (!card) return null;

  const displayName = instance.upgraded ? card.upgradeName : card.name;

  return (
    <Pressable disabled={isDisabled} onPress={handlePress} style={{ flex: 1 }}>
      <Animated.View style={[animatedStyle, { position: 'relative' }]}>
        {/* Amplified glow */}
        {isAmplified ? <Animated.View style={glowStyle} pointerEvents="none" /> : null}

        <View
          style={{
            height: CARD_HEIGHT,
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isAmplified ? traitColor : `${colors.tabBorder}88`,
          }}
        >
          {/* Card background image */}
          <Image
            source={cardContainerImg}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            resizeMode="stretch"
          />

          {/* Trait accent strip at bottom */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: traitColor,
              opacity: 0.8,
            }}
          />

          {/* Card content */}
          <Stack
            align="center"
            justify="center"
            gap={2}
            style={{ flex: 1, paddingTop: 24, paddingBottom: 10, paddingHorizontal: 4 }}
          >
            {/* Card icon */}
            <Image
              source={cardIconImg}
              style={{ width: 30, height: 30, opacity: 0.85, marginTop: 2, marginBottom: 4 }}
              resizeMode="contain"
            />

            {/* Card name */}
            <Typography
              variant="micro"
              style={{
                color: colors.textPrimary,
                fontWeight: '700',
                fontSize: 9,
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
              numberOfLines={2}
            >
              {displayName}
            </Typography>

            {/* Stats */}
            <Typography
              variant="micro"
              style={{
                color: isAmplified ? traitColor : colors.textSubAction,
                fontWeight: '600',
                fontSize: 7,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
              numberOfLines={1}
            >
              {getSubtitle(card, instance.upgraded)}
            </Typography>

            {/* Trait icon */}
            <Typography variant="micro" style={{ fontSize: 12, marginTop: 2 }}>
              {traitMeta?.icon ?? ''}
            </Typography>
          </Stack>
        </View>

        {/* Cost circle at top center */}
        <View
          style={{
            position: 'absolute',
            top: -4,
            alignSelf: 'center',
            width: COST_SIZE,
            height: COST_SIZE,
          }}
        >
          <Image
            source={cardTopCircleImg}
            style={{ width: COST_SIZE, height: COST_SIZE }}
            resizeMode="contain"
          />
          <View
            style={{
              position: 'absolute',
              width: COST_SIZE,
              height: COST_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="micro"
              style={{
                color: canAfford ? colors.textPrimary : `${colors.textPrimary}55`,
                fontWeight: '800',
                fontSize: 12,
              }}
            >
              {card.cost}
            </Typography>
          </View>
        </View>

        {/* Upgraded badge */}
        {instance.upgraded ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              backgroundColor: `${colors.combatHeal}33`,
              borderRadius: 4,
              paddingHorizontal: 3,
              paddingVertical: 1,
            }}
          >
            <Typography
              variant="micro"
              style={{ color: colors.combatHeal, fontWeight: '800', fontSize: 7 }}
            >
              +
            </Typography>
          </View>
        ) : null}

        {/* AMP badge */}
        {isAmplified ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 6,
              backgroundColor: `${traitColor}33`,
              borderRadius: 4,
              paddingHorizontal: 3,
              paddingVertical: 1,
            }}
          >
            <Typography
              variant="micro"
              style={{ color: traitColor, fontWeight: '800', fontSize: 7 }}
            >
              AMP
            </Typography>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

export default CardView;
