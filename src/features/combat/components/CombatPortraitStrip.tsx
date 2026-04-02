import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { CircularHealthBar, Portrait, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import FloatingDamage from '@/features/combat/components/FloatingDamage';
import type { PlayerId, RoleId } from '@/types/player';
import { portraitByRole } from '@/utils/portraitByRole';

type CombatPlayer = {
  playerId: PlayerId;
  roleId: RoleId;
  displayName: string;
};

type FloatingText = {
  id: number;
  text: string;
  color: string;
  target: 'enemy' | 'player';
  playerId?: string;
};

type CombatPortraitStripProps = {
  players: CombatPlayer[];
  localPlayerId: PlayerId | null;
  playerLungeX: SharedValue<number>;
  playerLungeY: SharedValue<number>;
  playerFlash: SharedValue<number>;
  botLunge: SharedValue<number>;
  botLungePlayerId: string | null;
  localHpOverride: number | null;
  onPlayerLayout: (x: number, y: number) => void;
  floatingTexts: FloatingText[];
};

const RING_SIZE = 80;
const PORTRAIT_SIZE = 72;

const ALLY_COLOR = colors.combatHeal;
const LOCAL_COLOR = colors.intentConfirmedBorder;

const CombatPortraitStrip = ({
  players,
  localPlayerId,
  playerLungeX,
  playerLungeY,
  playerFlash,
  botLunge,
  botLungePlayerId,
  localHpOverride,
  onPlayerLayout,
  floatingTexts,
}: CombatPortraitStripProps) => {
  const { roomConnection } = useGame();

  const lungeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerLungeX.value }, { translateY: playerLungeY.value }],
  }));

  const botLungeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: botLunge.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: playerFlash.value,
  }));

  return (
    <Stack gap={8}>
      {/* Player portraits row — adapts from 1 to 3 */}
      <Stack
        direction="row"
        justify={players.length === 1 ? 'center' : 'space-evenly'}
        style={{ paddingVertical: 8 }}
      >
        {players.map((player) => {
          const isLocal = player.playerId === localPlayerId;
          const character = roomConnection.characters.find((c) => c.playerId === player.playerId);
          const serverHp = character?.hp ?? 0;
          const hpMax = character?.hpMax ?? 100;
          const hp = isLocal && localHpOverride !== null ? Math.max(0, localHpOverride) : serverHp;
          const isDead = hp <= 0;
          const hpPercent = hpMax > 0 ? hp / hpMax : 0;
          const accentColor = isLocal ? LOCAL_COLOR : ALLY_COLOR;

          return (
            <Stack
              key={player.playerId}
              align="center"
              gap={3}
              style={{ position: 'relative' }}
              onLayout={
                isLocal
                  ? (e) => {
                      const { x, y, width } = e.nativeEvent.layout;
                      onPlayerLayout(x + width / 2, y);
                    }
                  : undefined
              }
            >
              {/* HP above portrait */}
              <Typography
                variant="micro"
                style={{
                  color: isDead
                    ? colors.combatDamage
                    : hpPercent <= 0.25
                      ? colors.combatDamage
                      : ALLY_COLOR,
                  fontWeight: '700',
                }}
              >
                {isDead ? 'DEAD' : `${hp}/${hpMax}`}
              </Typography>

              <Animated.View
                style={
                  isLocal
                    ? lungeStyle
                    : player.playerId === botLungePlayerId
                      ? botLungeStyle
                      : undefined
                }
              >
                <View
                  style={{
                    width: RING_SIZE,
                    height: RING_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDead ? 0.35 : 1,
                  }}
                >
                  <CircularHealthBar hp={hp} hpMax={hpMax} size={RING_SIZE} />
                  <Portrait
                    source={portraitByRole(player.roleId)}
                    size={PORTRAIT_SIZE}
                    highlighted={isLocal}
                    highlightColor={accentColor}
                    hideName
                  />
                  {/* Damage flash overlay */}
                  {isLocal ? (
                    <Animated.View
                      style={[
                        {
                          position: 'absolute',
                          width: PORTRAIT_SIZE,
                          height: PORTRAIT_SIZE,
                          borderRadius: PORTRAIT_SIZE / 2,
                          backgroundColor: colors.combatDamage,
                        },
                        flashStyle,
                      ]}
                      pointerEvents="none"
                    />
                  ) : null}
                </View>
              </Animated.View>

              {/* Player name */}
              <Typography
                variant="fine"
                style={{
                  color: isLocal ? LOCAL_COLOR : ALLY_COLOR,
                  fontWeight: isLocal ? '700' : '500',
                }}
              >
                {player.displayName}
              </Typography>

              {/* Local player indicator */}
              {isLocal ? (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: LOCAL_COLOR,
                    shadowColor: LOCAL_COLOR,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  }}
                />
              ) : null}

              {floatingTexts
                .filter((f) => {
                  if (f.target !== 'player') return false;
                  if (f.playerId) return f.playerId === player.playerId;
                  return isLocal;
                })
                .map((f) => (
                  <FloatingDamage key={f.id} text={f.text} color={f.color} />
                ))}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default CombatPortraitStrip;
export type { CombatPlayer };
