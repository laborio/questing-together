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

type LungeDirection = { x: number; y: number };

type CombatAnimations = {
  playerLungeX: SharedValue<number>;
  playerLungeY: SharedValue<number>;
  playerFlash: SharedValue<number>;
  enemyShake: SharedValue<number>;
  enemyFlash: SharedValue<number>;
  enemyLungeX: SharedValue<number>;
  enemyLungeY: SharedValue<number>;
  floatingTexts: FloatingText[];
  isAnimating: boolean;
  playAttack: (enemyDamage: number, direction: LungeDirection) => void;
  playAbility: (damage: number, abilityName: string) => void;
  playHeal: (amount: number) => void;
  playEnemyPhase: (totalDamage: number, direction: LungeDirection) => void;
};

const LUNGE_DISTANCE = 30;
const LUNGE_IN = 120;
const LUNGE_OUT = 150;
const SHAKE_STEP = 40;
const FLASH_IN = 60;
const FLASH_OUT = 200;
const COUNTER_FLASH_OUT = 300;
const ABILITY_FLASH_TOTAL = 460;
const HEAL_FLASH_TOTAL = 400;
const FLOATING_LIFETIME = 1000;

const useCombatAnimations = (): CombatAnimations => {
  const playerLungeX = useSharedValue(0);
  const playerLungeY = useSharedValue(0);
  const playerFlash = useSharedValue(0);
  const enemyShake = useSharedValue(0);
  const enemyFlash = useSharedValue(0);
  const enemyLungeX = useSharedValue(0);
  const enemyLungeY = useSharedValue(0);
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
    (enemyDamage: number, direction: LungeDirection) => {
      setIsAnimating(true);

      // Directional lunge toward target enemy
      playerLungeX.value = withSequence(
        withTiming(direction.x * LUNGE_DISTANCE, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );
      playerLungeY.value = withSequence(
        withTiming(direction.y * LUNGE_DISTANCE, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );

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

      scheduleCallback(LUNGE_IN + 30, () => {
        addFloating(`-${enemyDamage}`, colors.combatDamage, 'enemy');
      });

      scheduleCallback(LUNGE_IN + LUNGE_OUT + FLASH_OUT, () => {
        setIsAnimating(false);
      });
    },
    [playerLungeX, playerLungeY, enemyShake, enemyFlash, addFloating],
  );

  const playAbility = useCallback(
    (damage: number, abilityName: string) => {
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

      scheduleCallback(ABILITY_FLASH_TOTAL, () => {
        setIsAnimating(false);
      });
    },
    [enemyFlash, enemyShake, addFloating],
  );

  const playEnemyPhase = useCallback(
    (totalDamage: number, direction: LungeDirection) => {
      setIsAnimating(true);

      // Enemies lunge toward players
      enemyLungeX.value = withSequence(
        withTiming(direction.x * LUNGE_DISTANCE, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );
      enemyLungeY.value = withSequence(
        withTiming(direction.y * LUNGE_DISTANCE, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );

      // Player flash after lunge lands
      playerFlash.value = withDelay(
        LUNGE_IN,
        withSequence(
          withTiming(1, { duration: FLASH_IN }),
          withTiming(0, { duration: 150 }),
          withTiming(0.8, { duration: FLASH_IN }),
          withTiming(0, { duration: COUNTER_FLASH_OUT }),
        ),
      );

      scheduleCallback(LUNGE_IN + 50, () => {
        if (totalDamage > 0) {
          addFloating(`-${totalDamage}`, colors.combatDamage, 'player');
        }
      });

      scheduleCallback(LUNGE_IN + FLASH_IN + 150 + FLASH_IN + COUNTER_FLASH_OUT, () => {
        setIsAnimating(false);
      });
    },
    [enemyLungeX, enemyLungeY, playerFlash, addFloating],
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
    playerLungeX,
    playerLungeY,
    playerFlash,
    enemyShake,
    enemyFlash,
    enemyLungeX,
    enemyLungeY,
    floatingTexts,
    isAnimating,
    playAttack,
    playAbility,
    playHeal,
    playEnemyPhase,
  };
};

export default useCombatAnimations;
