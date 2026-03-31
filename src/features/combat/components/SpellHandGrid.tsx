import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ActionButton, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import SchoolChargeBar from '@/features/combat/components/SchoolChargeBar';
import CardView from '@/features/combat/components/SpellCard';
import type { Trait } from '@/features/gameConfig';
import { getCardById, getIdentityById, TRAITS } from '@/features/gameConfig';
import type { PlayerCombatState } from '@/types/spellCombat';

const VISIBLE_HAND_SIZE = 4;

type CardHandGridProps = {
  combatState: PlayerCombatState;
  disabled?: boolean;
  onPlayCard: (
    handIndex: number,
    targetEnemyIdx?: number | null,
    useAttune?: boolean,
    attuneTrait?: string | null,
  ) => void;
  onConvergence: () => void;
  onEndTurn: () => void;
  onReroll: () => void;
  selectedEnemyIdx: number | null;
};

const CardHandGrid = ({
  combatState,
  disabled = false,
  onPlayCard,
  onConvergence,
  onEndTurn,
  onReroll,
  selectedEnemyIdx,
}: CardHandGridProps) => {
  const [attuneActive, setAttuneActive] = useState(false);
  const [attuneTargetTrait, setAttuneTargetTrait] = useState<string | null>(null);
  // Optimistic tracking
  const [localPlayedIndices, setLocalPlayedIndices] = useState<number[]>([]);
  // Reroll: show first 4 cards, reroll swaps to remaining cards
  const [rerolled, setRerolled] = useState(false);

  // Reset optimistic state when hand actually changes (new turn)
  const prevHandRef = useRef(JSON.stringify(combatState.hand));
  useEffect(() => {
    const serialized = JSON.stringify(combatState.hand);
    if (serialized !== prevHandRef.current) {
      prevHandRef.current = serialized;
      setLocalPlayedIndices([]);
      setRerolled(false);
      setAttuneActive(false);
      setAttuneTargetTrait(null);
    }
  }, [combatState.hand]);

  const identity = getIdentityById(combatState.identityId);

  // Count empowered traits
  const empoweredCount = Object.values(combatState.traitCharges).filter(
    (c) => c >= COMBAT.empowerThreshold,
  ).length;
  const canConverge = empoweredCount >= COMBAT.convergenceRequiredTraits;

  // Convergence glow pulse
  const convergenceGlow = useSharedValue(0);
  useEffect(() => {
    if (canConverge) {
      convergenceGlow.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.3, { duration: 600 })),
        -1,
        true,
      );
    } else {
      convergenceGlow.value = 0;
    }
  }, [canConverge, convergenceGlow]);

  const convergenceGlowStyle = useAnimatedStyle(() => ({
    shadowColor: colors.intentConfirmedBorder,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: convergenceGlow.value,
    shadowRadius: 12,
  }));

  const handleAttunePress = useCallback(() => {
    if (attuneActive) {
      setAttuneActive(false);
      setAttuneTargetTrait(null);
    } else if (combatState.attuneCharges > 0) {
      setAttuneActive(true);
    }
  }, [attuneActive, combatState.attuneCharges]);

  const handleTraitPress = useCallback((trait: string) => {
    setAttuneTargetTrait((prev) => (prev === trait ? null : trait));
  }, []);

  const handleCardPress = useCallback(
    (handIndex: number) => {
      if (localPlayedIndices.includes(handIndex)) return;
      const instance = combatState.hand[handIndex];
      if (!instance) return;
      const card = getCardById(instance.cardId);
      if (!card || combatState.energy < card.cost) return;

      setLocalPlayedIndices((prev) => [...prev, handIndex]);

      const useAttune = attuneActive && attuneTargetTrait !== null;
      onPlayCard(
        handIndex,
        card.baseDamage && card.baseDamage > 0 ? selectedEnemyIdx : null,
        useAttune,
        useAttune ? attuneTargetTrait : null,
      );

      if (useAttune) {
        setAttuneActive(false);
        setAttuneTargetTrait(null);
      }
    },
    [
      combatState,
      localPlayedIndices,
      attuneActive,
      attuneTargetTrait,
      selectedEnemyIdx,
      onPlayCard,
    ],
  );

  // Build schools from TRAITS (excluding neutral)
  const schools = TRAITS.filter((t) => t.id !== 'neutral').map((t) => ({
    id: t.id as Trait,
    name: t.name,
    icon: t.icon,
    color: t.color,
  }));

  return (
    <Stack gap={12}>
      {/* Energy display */}
      <Stack direction="row" align="center" justify="space-between">
        <Stack direction="row" gap={4} align="center">
          <Typography
            variant="caption"
            style={{ color: colors.intentConfirmedBorder, fontWeight: '700' }}
          >
            {combatState.energy}/{combatState.maxEnergy}
          </Typography>
          <Typography variant="micro" style={{ color: colors.textSecondary }}>
            ENERGY
          </Typography>
        </Stack>
        {combatState.block > 0 ? (
          <Stack direction="row" gap={4} align="center">
            <Typography variant="caption" style={{ color: '#5b9bd5', fontWeight: '700' }}>
              {combatState.block}
            </Typography>
            <Typography variant="micro" style={{ color: colors.textSecondary }}>
              BLOCK
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      {/* Trait charges */}
      <SchoolChargeBar
        schools={schools}
        schoolCharges={combatState.traitCharges}
        attuneCharges={combatState.attuneCharges}
        attuneActive={attuneActive}
        attuneTargetSchool={attuneTargetTrait}
        onAttunePress={handleAttunePress}
        onSchoolPress={handleTraitPress}
      />

      {/* Card hand: 2x2 grid of visible cards */}
      {(() => {
        // Filter out played cards
        const availableCards = combatState.hand
          .map((instance, idx) => ({ instance, idx }))
          .filter(({ idx }) => !localPlayedIndices.includes(idx));

        const visibleCards = availableCards.slice(0, VISIBLE_HAND_SIZE);

        return (
          <Stack gap={8}>
            <Stack direction="row" gap={8}>
              {visibleCards.slice(0, 2).map(({ instance, idx }) => {
                const card = getCardById(instance.cardId);
                if (!card) return null;
                return (
                  <CardView
                    key={`${instance.cardId}-${idx}`}
                    instance={instance}
                    traitCharge={combatState.traitCharges[card.trait] ?? 0}
                    canAfford={combatState.energy >= card.cost}
                    disabled={disabled}
                    onPress={() => handleCardPress(idx)}
                  />
                );
              })}
            </Stack>
            <Stack direction="row" gap={8}>
              {visibleCards.slice(2, 4).map(({ instance, idx }) => {
                const card = getCardById(instance.cardId);
                if (!card) return null;
                return (
                  <CardView
                    key={`${instance.cardId}-${idx}`}
                    instance={instance}
                    traitCharge={combatState.traitCharges[card.trait] ?? 0}
                    canAfford={combatState.energy >= card.cost}
                    disabled={disabled}
                    onPress={() => handleCardPress(idx)}
                  />
                );
              })}
            </Stack>
          </Stack>
        );
      })()}

      {/* Convergence banner — ulti popup */}
      {canConverge && identity ? (
        <Pressable onPress={onConvergence} disabled={disabled}>
          <Animated.View
            style={[
              convergenceGlowStyle,
              {
                padding: 12,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: colors.intentConfirmedBorder,
                backgroundColor: `${colors.intentConfirmedBorder}20`,
                alignItems: 'center',
                gap: 2,
              },
            ]}
          >
            <Typography
              variant="caption"
              style={{
                color: colors.intentConfirmedBorder,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              ⚡ {identity.convergenceActionName} ⚡
            </Typography>
            <Typography variant="micro" style={{ color: colors.textSecondary }}>
              {empoweredCount} traits empowered — FREE ACTION
            </Typography>
          </Animated.View>
        </Pressable>
      ) : null}

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.tabBorder, opacity: 0.4 }} />

      {/* Bottom row: Reroll + End Turn */}
      <Stack direction="row" gap={8}>
        <ActionButton
          label={`Reroll (${rerolled ? 0 : 1})`}
          icon="🔄"
          onPress={() => {
            setRerolled(true);
            setLocalPlayedIndices([]);
            onReroll();
          }}
          disabled={disabled || rerolled}
        />
        <ActionButton
          label="End Turn"
          icon="⏭️"
          subtitle={`${combatState.energy} energy left`}
          onPress={onEndTurn}
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
};

export default CardHandGrid;
