import { useCallback, useRef, useState } from 'react';
import {
  type SharedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { scheduleCallback } from '@/features/combat/utils/scheduleCallback';

type FloatingText = {
  id: number;
  text: string;
  color: string;
  target: 'enemy' | 'player';
};

type CombatAnimations = {
  playerLunge: SharedValue<number>;
  playerFlash: SharedValue<number>;
  enemyShake: SharedValue<number>;
  enemyFlash: SharedValue<number>;
  floatingTexts: FloatingText[];
  isAnimating: boolean;
  playAttack: (enemyDamage: number, counterDamage: number) => void;
  playAbility: (damage: number, abilityName: string, counterDamage: number) => void;
  playHeal: (amount: number) => void;
};

const LUNGE_IN = 120;
const LUNGE_OUT = 150;
const SHAKE_STEP = 40;
const FLASH_IN = 60;
const FLASH_OUT = 200;
const COUNTER_DELAY = 500;
const COUNTER_FLASH_OUT = 300;
const ABILITY_FLASH_TOTAL = 460;
const HEAL_FLASH_TOTAL = 400;
const FLOATING_LIFETIME = 1000;

const useCombatAnimations = (): CombatAnimations => {
  const playerLunge = useSharedValue(0);
  const playerFlash = useSharedValue(0);
  const enemyShake = useSharedValue(0);
  const enemyFlash = useSharedValue(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const floatingIdRef = useRef(0);

  const addFloating = useCallback((text: string, color: string, target: 'enemy' | 'player') => {
    floatingIdRef.current += 1;
    const id = floatingIdRef.current;
    setFloatingTexts((prev) => [...prev, { id, text, color, target }]);
    scheduleCallback(FLOATING_LIFETIME, () => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    });
  }, []);

  const playAttack = useCallback(
    (enemyDamage: number, counterDamage: number) => {
      setIsAnimating(true);

      // 1. Player lunges forward
      playerLunge.value = withSequence(
        withTiming(-20, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );

      // 2. Enemy shakes + flashes red (after lunge lands)
      enemyShake.value = withDelay(
        LUNGE_IN,
        withSequence(
          withTiming(8, { duration: SHAKE_STEP }),
          withTiming(-8, { duration: SHAKE_STEP }),
          withTiming(6, { duration: SHAKE_STEP }),
          withTiming(-6, { duration: SHAKE_STEP }),
          withTiming(0, { duration: SHAKE_STEP }),
        ),
      );
      enemyFlash.value = withDelay(
        LUNGE_IN,
        withSequence(withTiming(1, { duration: FLASH_IN }), withTiming(0, { duration: FLASH_OUT })),
      );

      // 3. Floating damage on enemy
      scheduleCallback(LUNGE_IN + 30, () => {
        addFloating(`-${enemyDamage}`, colors.combatDamage, 'enemy');
      });

      // 4. Counter-attack: player flashes red
      if (counterDamage > 0) {
        playerFlash.value = withDelay(
          COUNTER_DELAY,
          withSequence(
            withTiming(1, { duration: FLASH_IN }),
            withTiming(0, { duration: COUNTER_FLASH_OUT }),
          ),
        );

        scheduleCallback(COUNTER_DELAY + 50, () => {
          addFloating(`-${counterDamage}`, colors.combatDamage, 'player');
        });
      }

      // 5. Animation done
      const totalDuration =
        counterDamage > 0
          ? COUNTER_DELAY + FLASH_IN + COUNTER_FLASH_OUT
          : LUNGE_IN + LUNGE_OUT + FLASH_OUT;

      scheduleCallback(totalDuration, () => {
        setIsAnimating(false);
      });
    },
    [playerLunge, enemyShake, enemyFlash, playerFlash, addFloating],
  );

  const playAbility = useCallback(
    (damage: number, abilityName: string, counterDamage: number) => {
      setIsAnimating(true);

      enemyFlash.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 100 }),
        withTiming(0.8, { duration: 80 }),
        withTiming(0, { duration: 200 }),
      );

      enemyShake.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );

      scheduleCallback(100, () => {
        if (damage > 0) {
          addFloating(`-${damage}`, colors.combatAbilityDamage, 'enemy');
        } else {
          addFloating(abilityName, colors.combatAbilityBuff, 'player');
        }
      });

      // Counter-attack from targeted enemy
      if (counterDamage > 0) {
        playerFlash.value = withDelay(
          COUNTER_DELAY,
          withSequence(
            withTiming(1, { duration: FLASH_IN }),
            withTiming(0, { duration: COUNTER_FLASH_OUT }),
          ),
        );

        scheduleCallback(COUNTER_DELAY + 50, () => {
          addFloating(`-${counterDamage}`, colors.combatDamage, 'player');
        });
      }

      const totalDuration =
        counterDamage > 0 ? COUNTER_DELAY + FLASH_IN + COUNTER_FLASH_OUT : ABILITY_FLASH_TOTAL;

      scheduleCallback(totalDuration, () => {
        setIsAnimating(false);
      });
    },
    [enemyFlash, enemyShake, playerFlash, addFloating],
  );

  const playHeal = useCallback(
    (amount: number) => {
      setIsAnimating(true);

      playerFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 }),
      );

      scheduleCallback(100, () => {
        addFloating(`+${amount}`, colors.combatHeal, 'player');
      });

      scheduleCallback(HEAL_FLASH_TOTAL, () => {
        setIsAnimating(false);
      });
    },
    [playerFlash, addFloating],
  );

  return {
    playerLunge,
    playerFlash,
    enemyShake,
    enemyFlash,
    floatingTexts,
    isAnimating,
    playAttack,
    playAbility,
    playHeal,
  };
};

export default useCombatAnimations;
