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
  playerId?: string;
};

type LungeDirection = { x: number; y: number };

type EnemyAttackInfo = {
  enemyId: string;
  damage: number;
  direction: LungeDirection;
};

interface CombatAnimations {
  playerLungeX: SharedValue<number>;
  playerLungeY: SharedValue<number>;
  playerFlash: SharedValue<number>;
  enemyShake: SharedValue<number>;
  enemyFlash: SharedValue<number>;
  enemyLungeX: SharedValue<number>;
  enemyLungeY: SharedValue<number>;
  screenFlash: SharedValue<number>;
  screenFlashColor: string;
  attackingEnemyId: string | null;
  enemyPhaseDamageDealt: number;
  prePhaseHp: number | null;
  botLungePlayerId: string | null;
  botLunge: SharedValue<number>;
  floatingTexts: FloatingText[];
  isAnimating: boolean;
  playCastSpell: (
    damage: number,
    spellName: string,
    effectType: string,
    direction: LungeDirection,
    roll: number,
    rollLabel: string,
    healed?: number,
  ) => void;
  playConvergence: (damage: number, name: string, roll: number, rollLabel: string) => void;
  playBotAction: (
    botPlayerId: string,
    actionType: string,
    damage: number,
    spellName?: string,
  ) => void;
  playEnemyPhase: (attacks: EnemyAttackInfo[], currentHp: number) => void;
}

const ROLL_COLORS: Record<string, string> = {
  critical_fail: '#888888',
  weak: colors.combatDamage,
  normal: colors.combatAbilityDamage,
  strong: colors.combatAbilityBuff,
  critical: colors.intentConfirmedBorder,
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
const ENEMY_ATTACK_INTERVAL = 1000;
const SINGLE_ATTACK_DURATION = LUNGE_IN + LUNGE_OUT + 100;

const useCombatAnimations = (): CombatAnimations => {
  const playerLungeX = useSharedValue(0);
  const playerLungeY = useSharedValue(0);
  const playerFlash = useSharedValue(0);
  const enemyShake = useSharedValue(0);
  const enemyFlash = useSharedValue(0);
  const enemyLungeX = useSharedValue(0);
  const enemyLungeY = useSharedValue(0);
  const screenFlash = useSharedValue(0);
  const [screenFlashColor, setScreenFlashColor] = useState('transparent');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);
  const [enemyPhaseDamageDealt, setEnemyPhaseDamageDealt] = useState(0);
  const [botLungePlayerId, setBotLungePlayerId] = useState<string | null>(null);
  const botLunge = useSharedValue(0);
  const [prePhaseHp, setPrePhaseHp] = useState<number | null>(null);
  const prePhaseHpRef = useRef<number | null>(null);
  const floatingIdRef = useRef(0);

  const addFloating = useCallback(
    (text: string, color: string, target: 'enemy' | 'player', playerId?: string) => {
      floatingIdRef.current += 1;
      const id = floatingIdRef.current;
      setFloatingTexts((prev) => [...prev, { id, text, color, target, playerId }]);
      scheduleCallback(FLOATING_LIFETIME, () => {
        setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
      });
    },
    [],
  );

  const triggerScreenFlash = useCallback(
    (rollLabel: string) => {
      if (rollLabel === 'critical_fail') {
        setScreenFlashColor(colors.screenFlashCriticalFail);
      } else if (rollLabel === 'strong') {
        setScreenFlashColor(colors.screenFlashStrong);
      } else if (rollLabel === 'critical') {
        setScreenFlashColor(colors.screenFlashCritical);
      } else {
        return;
      }
      screenFlash.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 }),
      );
    },
    [screenFlash],
  );

  const playCastSpell = useCallback(
    (
      damage: number,
      spellName: string,
      effectType: string,
      direction: LungeDirection,
      roll: number,
      rollLabel: string,
      healed?: number,
    ) => {
      setIsAnimating(true);

      const isHeal =
        effectType === 'heal_self' ||
        effectType === 'heal_ally' ||
        effectType === 'heal_self_and_taunt';
      const isDamageSingle =
        effectType === 'damage_single' || effectType === 'damage_single_and_aoe';
      const hasDamage = !isHeal && effectType !== 'taunt';

      if (hasDamage) {
        triggerScreenFlash(rollLabel);
        addFloating(`🎲 ${roll}`, ROLL_COLORS[rollLabel] ?? colors.combatDamage, 'player');
      }

      if (isDamageSingle) {
        // Lunge toward target (like old playAttack)
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
          withSequence(
            withTiming(1, { duration: FLASH_IN }),
            withTiming(0, { duration: FLASH_OUT }),
          ),
        );

        scheduleCallback(LUNGE_IN + 30, () => {
          const dmgText = rollLabel === 'critical_fail' ? 'MISS' : `-${damage}`;
          const dmgColor =
            rollLabel === 'critical' || rollLabel === 'strong'
              ? colors.intentConfirmedBorder
              : colors.combatDamage;
          addFloating(dmgText, dmgColor, 'enemy');
        });

        scheduleCallback(LUNGE_IN + LUNGE_OUT + FLASH_OUT, () => {
          setIsAnimating(false);
        });
      } else if (hasDamage) {
        // AoE: flash + shake (like old playAbility)
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
          const dmgColor =
            rollLabel === 'critical' ? colors.intentConfirmedBorder : colors.combatAbilityDamage;
          const dmgText = rollLabel === 'critical_fail' ? 'MISS' : `-${damage}`;
          addFloating(dmgText, dmgColor, 'enemy');
        });

        scheduleCallback(ABILITY_FLASH_TOTAL, () => {
          setIsAnimating(false);
        });
      } else if (isHeal) {
        // Heal: green flash
        playerFlash.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 300 }),
        );

        scheduleCallback(100, () => {
          addFloating(`+${healed ?? damage}`, colors.combatHeal, 'player');
        });

        scheduleCallback(HEAL_FLASH_TOTAL, () => {
          setIsAnimating(false);
        });
      } else {
        // Taunt / buff
        addFloating(spellName, colors.combatAbilityBuff, 'player');
        scheduleCallback(HEAL_FLASH_TOTAL, () => {
          setIsAnimating(false);
        });
      }
    },
    [
      playerLungeX,
      playerLungeY,
      playerFlash,
      enemyShake,
      enemyFlash,
      addFloating,
      triggerScreenFlash,
    ],
  );

  const playConvergence = useCallback(
    (damage: number, name: string, roll: number, rollLabel: string) => {
      setIsAnimating(true);
      triggerScreenFlash(rollLabel);
      addFloating(`🎲 ${roll}`, ROLL_COLORS[rollLabel] ?? colors.intentConfirmedBorder, 'player');

      // Dramatic double flash + heavy shake
      enemyFlash.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 80 }),
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.8, { duration: 60 }),
        withTiming(0, { duration: 200 }),
      );
      enemyShake.value = withSequence(
        withTiming(14, { duration: 40 }),
        withTiming(-14, { duration: 40 }),
        withTiming(12, { duration: 40 }),
        withTiming(-12, { duration: 40 }),
        withTiming(8, { duration: 40 }),
        withTiming(-8, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );

      setScreenFlashColor(colors.screenFlashConvergence);
      screenFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 500 }),
      );

      scheduleCallback(150, () => {
        const dmgText = rollLabel === 'critical_fail' ? 'MISS' : `-${damage}`;
        addFloating(`${name} ${dmgText}`, colors.intentConfirmedBorder, 'enemy');
      });

      scheduleCallback(600, () => {
        setIsAnimating(false);
      });
    },
    [enemyFlash, enemyShake, screenFlash, addFloating, triggerScreenFlash],
  );

  const playSingleEnemyAttack = useCallback(
    (enemyId: string, damage: number, direction: LungeDirection) => {
      setAttackingEnemyId(enemyId);

      // Enemy lunges toward players
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
          withTiming(0, { duration: COUNTER_FLASH_OUT }),
        ),
      );

      scheduleCallback(LUNGE_IN + 30, () => {
        addFloating(`-${damage}`, colors.combatDamage, 'player');
        // Clamp accumulated damage to not exceed prePhaseHp
        setEnemyPhaseDamageDealt((prev) => {
          const safeDmg = Number.isFinite(damage) ? damage : 0;
          return Math.min(prev + safeDmg, prePhaseHpRef.current ?? 9999);
        });
      });

      scheduleCallback(SINGLE_ATTACK_DURATION, () => {
        setAttackingEnemyId(null);
      });
    },
    [enemyLungeX, enemyLungeY, playerFlash, addFloating],
  );

  const playEnemyPhase = useCallback(
    (attacks: EnemyAttackInfo[], currentHp: number) => {
      setIsAnimating(true);
      setEnemyPhaseDamageDealt(0);
      setPrePhaseHp(currentHp);
      prePhaseHpRef.current = currentHp;

      // Track accumulated damage to stop when player dies
      const tracker = { damage: 0 };

      attacks.forEach((attack, index) => {
        const delay = index * ENEMY_ATTACK_INTERVAL;
        scheduleCallback(delay, () => {
          // Stop playing attacks if player is already dead
          if (tracker.damage >= currentHp) return;
          tracker.damage += attack.damage;
          playSingleEnemyAttack(attack.enemyId, attack.damage, attack.direction);
        });
      });

      // End animation after last played attack + 1s pause
      const totalDuration = attacks.length * ENEMY_ATTACK_INTERVAL + SINGLE_ATTACK_DURATION + 1000;
      scheduleCallback(totalDuration, () => {
        setPrePhaseHp(null);
        prePhaseHpRef.current = null;
        setIsAnimating(false);
      });
    },
    [playSingleEnemyAttack],
  );

  const playBotAction = useCallback(
    (botPlayerId: string, actionType: string, damage: number, spellName?: string) => {
      setBotLungePlayerId(botPlayerId);
      botLunge.value = withSequence(
        withTiming(-15, { duration: LUNGE_IN }),
        withTiming(0, { duration: LUNGE_OUT }),
      );
      scheduleCallback(LUNGE_IN + LUNGE_OUT, () => {
        setBotLungePlayerId(null);
      });

      if (actionType === 'spell' && damage > 0) {
        addFloating(
          `${spellName ?? '✨'} -${damage}`,
          colors.combatAbilityDamage,
          'player',
          botPlayerId,
        );
        enemyShake.value = withSequence(
          withTiming(6, { duration: SHAKE_STEP }),
          withTiming(-6, { duration: SHAKE_STEP }),
          withTiming(0, { duration: SHAKE_STEP }),
        );
      } else if (actionType === 'convergence') {
        addFloating(
          `${spellName ?? 'Convergence'} -${damage}`,
          colors.intentConfirmedBorder,
          'player',
          botPlayerId,
        );
        enemyShake.value = withSequence(
          withTiming(10, { duration: SHAKE_STEP }),
          withTiming(-10, { duration: SHAKE_STEP }),
          withTiming(0, { duration: SHAKE_STEP }),
        );
      } else if (actionType === 'spell') {
        // No damage = buff/heal
        addFloating(`${spellName ?? 'Buff'}`, colors.combatAbilityBuff, 'player', botPlayerId);
      }
    },
    [enemyShake, botLunge, addFloating],
  );

  return {
    playerLungeX,
    playerLungeY,
    playerFlash,
    enemyShake,
    enemyFlash,
    enemyLungeX,
    enemyLungeY,
    screenFlash,
    screenFlashColor,
    attackingEnemyId,
    enemyPhaseDamageDealt,
    prePhaseHp,
    botLungePlayerId,
    botLunge,
    floatingTexts,
    isAnimating,
    playCastSpell,
    playConvergence,
    playBotAction,
    playEnemyPhase,
  };
};

export default useCombatAnimations;
