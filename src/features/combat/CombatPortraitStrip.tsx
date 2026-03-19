import { View } from 'react-native';
import { Portrait, Typography } from '@/components/display';
import { Stack } from '@/components/layout';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import type { PlayerId, RoleId } from '@/types/player';
import { portraitByRole } from '@/utils/portraitByRole';

type CombatPlayer = {
  playerId: PlayerId;
  roleId: RoleId;
  displayName: string;
};

type CombatPortraitStripProps = {
  players: CombatPlayer[];
  localPlayerId: PlayerId | null;
};

const RING_SIZE = 80;
const PORTRAIT_SIZE = 68;
const RING_WIDTH = 3;

const HpRing = ({ hp, hpMax }: { hp: number; hpMax: number }) => {
  const percent = Math.max(0, Math.min(1, hp / Math.max(1, hpMax)));

  return (
    <View
      style={{
        position: 'absolute',
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        borderWidth: RING_WIDTH,
        borderColor: colors.combatHealthBarBg,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderWidth: RING_WIDTH,
          borderColor: percent > 0.25 ? '#2ecc40' : '#f44',
          borderTopColor: percent >= 1 ? (percent > 0.25 ? '#2ecc40' : '#f44') : 'transparent',
          transform: [{ rotate: '-90deg' }],
          opacity: percent > 0 ? 0.8 : 0,
        }}
      />
    </View>
  );
};

const CombatPortraitStrip = ({ players, localPlayerId }: CombatPortraitStripProps) => {
  const { roomConnection } = useGame();

  return (
    <Stack direction="row" justify="space-evenly" style={{ paddingTop: 16, paddingBottom: 8 }}>
      {players.map((player) => {
        const isLocal = player.playerId === localPlayerId;
        const character = roomConnection.characters.find((c) => c.playerId === player.playerId);
        const hp = character?.hp ?? 0;
        const hpMax = character?.hpMax ?? 100;
        const isDead = hp <= 0;

        return (
          <Stack key={player.playerId} align="center" gap={2}>
            <View
              style={{
                width: RING_SIZE,
                height: RING_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isDead ? 0.4 : 1,
              }}
            >
              <HpRing hp={hp} hpMax={hpMax} />
              <Portrait
                source={portraitByRole(player.roleId)}
                size={PORTRAIT_SIZE}
                highlighted={isLocal}
                highlightColor={isLocal ? colors.intentConfirmedBorder : colors.tabBorder}
                hideName
              />
            </View>
            <Typography
              variant="fine"
              style={{
                color: isLocal ? colors.intentConfirmedBorder : colors.combatWaiting,
                fontWeight: isLocal ? '700' : '400',
                fontSize: 10,
              }}
            >
              {player.displayName}
            </Typography>
            <Typography
              variant="fine"
              style={{
                color: isDead ? '#f44' : '#2ecc40',
                fontWeight: '700',
                fontSize: 9,
              }}
            >
              {isDead ? 'DEAD' : `${hp}/${hpMax}`}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
};

export default CombatPortraitStrip;
export type { CombatPlayer };
