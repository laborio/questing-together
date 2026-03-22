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
};

type CombatPortraitStripProps = {
  players: CombatPlayer[];
  localPlayerId: PlayerId | null;
  playerLungeX: SharedValue<number>;
  playerLungeY: SharedValue<number>;
  playerFlash: SharedValue<number>;
  onPlayerLayout: (x: number, y: number) => void;
  floatingTexts: FloatingText[];
};

const RING_SIZE = 80;
const PORTRAIT_SIZE = 72;

const CombatPortraitStrip = ({
  players,
  localPlayerId,
  playerLungeX,
  playerLungeY,
  playerFlash,
  onPlayerLayout,
  floatingTexts,
}: CombatPortraitStripProps) => {
  const { roomConnection } = useGame();

  const lungeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerLungeX.value }, { translateY: playerLungeY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: playerFlash.value,
  }));

  const playerFloats = floatingTexts.filter((t) => t.target === 'player');

  return (
    <Stack direction="row" justify="space-evenly" style={{ paddingTop: 48, paddingBottom: 8 }}>
      {players.map((player) => {
        const isLocal = player.playerId === localPlayerId;
        const character = roomConnection.characters.find((c) => c.playerId === player.playerId);
        const hp = character?.hp ?? 0;
        const hpMax = character?.hpMax ?? 100;
        const isDead = hp <= 0;

        return (
          <Stack
            key={player.playerId}
            align="center"
            gap={2}
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
            <Animated.View style={isLocal ? lungeStyle : undefined}>
              <View
                style={{
                  width: RING_SIZE,
                  height: RING_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isDead ? 0.4 : 1,
                }}
              >
                <CircularHealthBar hp={hp} hpMax={hpMax} size={RING_SIZE} />
                <Portrait
                  source={portraitByRole(player.roleId)}
                  size={PORTRAIT_SIZE}
                  highlighted={isLocal}
                  highlightColor={isLocal ? colors.intentConfirmedBorder : colors.tabBorder}
                  hideName
                />
                {/* Red flash overlay on portrait */}
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
            <Typography
              variant="fine"
              style={{
                color: isLocal ? colors.intentConfirmedBorder : colors.combatWaiting,
                fontWeight: isLocal ? '700' : '400',
              }}
            >
              {player.displayName}
            </Typography>
            <Typography
              variant="micro"
              style={{
                color: isDead ? colors.combatDamage : colors.combatHeal,
                fontWeight: '700',
              }}
            >
              {isDead ? 'DEAD' : `${hp}/${hpMax}`}
            </Typography>
            {isLocal
              ? playerFloats.map((f) => <FloatingDamage key={f.id} text={f.text} color={f.color} />)
              : null}
          </Stack>
        );
      })}
    </Stack>
  );
};

export default CombatPortraitStrip;
export type { CombatPlayer };
