import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import portraitFrame from '@/assets/images/T_PortraitFrame.png';
import rangerPortrait from '@/assets/images/T_RangerPortrait.png';
import sagePortrait from '@/assets/images/T_SagePortrait.png';
import warriorPortrait from '@/assets/images/T_WarriorPortrait.png';
import type { PlayerId, RoleId } from '@/types/player';

export type ChoiceIntentPortraitPlayer = {
  playerId: PlayerId;
  roleId: RoleId | null;
  confirmed: boolean;
};

type ChoiceIntentPortraitsProps = {
  players: ChoiceIntentPortraitPlayer[];
  size?: 'default' | 'compact';
  placement?: 'topRight' | 'bottomRight';
};

function portraitByRole(roleId: RoleId): ImageSourcePropType {
  if (roleId === 'ranger') return rangerPortrait;
  if (roleId === 'sage') return sagePortrait;
  return warriorPortrait;
}

export function ChoiceIntentPortraits({
  players,
  size = 'default',
  placement = 'topRight',
}: ChoiceIntentPortraitsProps) {
  const visiblePlayers = players.filter(
    (player): player is ChoiceIntentPortraitPlayer & { roleId: RoleId } => Boolean(player.roleId),
  );
  if (!visiblePlayers.length) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        size === 'compact' ? styles.overlayCompact : styles.overlayDefault,
        placement === 'bottomRight' ? styles.overlayBottomRight : styles.overlayTopRight,
      ]}
    >
      {visiblePlayers.map((player, index) => (
        <View
          key={player.playerId}
          style={[
            styles.portraitWrap,
            size === 'compact' ? styles.portraitWrapCompact : styles.portraitWrapDefault,
            index > 0 &&
              (size === 'compact' ? styles.portraitStackCompact : styles.portraitStackDefault),
            player.confirmed && styles.portraitWrapConfirmed,
            { zIndex: visiblePlayers.length - index },
          ]}
        >
          <Image source={portraitFrame} style={styles.portraitFrame} resizeMode="contain" />
          <Image
            source={portraitByRole(player.roleId)}
            style={styles.portraitImage}
            resizeMode="contain"
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  overlayDefault: {
    right: -10,
  },
  overlayCompact: {
    right: -8,
  },
  overlayTopRight: {
    top: -10,
  },
  overlayBottomRight: {
    bottom: -10,
  },
  portraitWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 999,
  },
  portraitWrapConfirmed: {
    borderWidth: 1.5,
    borderColor: '#ffb300',
  },
  portraitWrapDefault: {
    width: 34,
    height: 34,
  },
  portraitWrapCompact: {
    width: 30,
    height: 30,
  },
  portraitStackDefault: {
    marginRight: -10,
  },
  portraitStackCompact: {
    marginRight: -9,
  },
  portraitFrame: {
    width: '100%',
    height: '100%',
  },
  portraitImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});
