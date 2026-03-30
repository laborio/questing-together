import { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import type { Card } from '@/features/gameConfig';
import { getCardById, TRAIT_MAP } from '@/features/gameConfig';
import type { DeckCardInstance } from '@/types/spellCombat';

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

  return parts.join(' + ') || card.description;
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isDisabled ? 0.35 : 1 - brightness.value * 0.15,
  }));

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    scale.value = withSequence(
      withTiming(0.92, { duration: 60 }),
      withTiming(1, { duration: 120 }),
    );
    brightness.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );
    onPress();
  }, [onPress, isDisabled, scale, brightness]);

  if (!card) return null;

  const displayName = instance.upgraded ? card.upgradeName : card.name;

  return (
    <Pressable disabled={isDisabled} onPress={handlePress} style={{ flex: 1 }}>
      <Animated.View style={animatedStyle}>
        <Stack
          direction="row"
          gap={6}
          align="center"
          style={{
            height: 52,
            paddingHorizontal: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isAmplified ? traitColor : colors.tabBorder,
            borderLeftWidth: 3,
            borderLeftColor: traitColor,
            backgroundColor: isAmplified ? `${traitColor}22` : colors.backgroundCombatCard,
          }}
        >
          {/* Energy cost */}
          <Stack
            align="center"
            justify="center"
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: canAfford ? traitColor : `${traitColor}44`,
            }}
          >
            <Typography
              variant="micro"
              style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 10 }}
            >
              {card.cost}
            </Typography>
          </Stack>

          <Stack flex={1} gap={0}>
            <Stack direction="row" gap={4} align="center">
              <Typography
                variant="captionSm"
                style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 10 }}
                numberOfLines={1}
              >
                {displayName}
              </Typography>
              {isAmplified ? (
                <Typography
                  variant="micro"
                  style={{ color: traitColor, fontWeight: '800', fontSize: 7 }}
                >
                  AMP
                </Typography>
              ) : null}
              {instance.upgraded ? (
                <Typography
                  variant="micro"
                  style={{ color: colors.combatHeal, fontWeight: '800', fontSize: 7 }}
                >
                  +
                </Typography>
              ) : null}
            </Stack>
            <Typography
              variant="fine"
              style={{
                color: isAmplified ? traitColor : colors.textSubAction,
                fontWeight: '700',
                fontSize: 8,
                textTransform: 'uppercase',
              }}
              numberOfLines={1}
            >
              {getSubtitle(card, instance.upgraded)}
            </Typography>
          </Stack>

          {/* Trait icon */}
          <Typography variant="micro">{traitMeta?.icon ?? ''}</Typography>
        </Stack>
      </Animated.View>
    </Pressable>
  );
};

export default CardView;
