import { useEffect, useRef } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, CircularHealthBar, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import type { RestScreenConfig } from '@/types/adventure';

const RestScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, localPlayerId, isHost } = useGame();
  const { currentScreen } = roomConnection;
  const hasHealed = useRef(false);

  const config = currentScreen?.config as RestScreenConfig | undefined;
  const localCharacter = roomConnection.characters.find((c) => c.playerId === localPlayerId);
  const hp = localCharacter?.hp ?? 0;
  const hpMax = localCharacter?.hpMax ?? 100;
  const restorePercent = config?.hpRestorePercent ?? 50;

  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulseOpacity.value = withTiming(1, { duration: 1500 });
    if (!hasHealed.current) {
      hasHealed.current = true;
      void roomConnection.restHeal(restorePercent);
    }
  }, [pulseOpacity, roomConnection, restorePercent]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Stack flex={1}>
      <Stack
        flex={1}
        align="center"
        justify="center"
        gap={16}
        style={{ paddingTop: insets.top, paddingBottom: 120 + insets.bottom }}
      >
        <Animated.View style={pulseStyle}>
          <Typography variant="h1" style={{ color: colors.combatHeal }}>
            🏕️
          </Typography>
        </Animated.View>

        <Typography variant="h4" style={{ color: colors.combatTitle, textAlign: 'center' }}>
          Rest Zone
        </Typography>
        <Typography variant="body1" style={{ color: colors.combatWaiting, textAlign: 'center' }}>
          Your party rests and recovers {restorePercent}% HP.
        </Typography>

        <Stack align="center" style={{ width: 90, height: 90 }}>
          <CircularHealthBar hp={hp} hpMax={hpMax} size={90} strokeWidth={4} />
          <Stack
            align="center"
            justify="center"
            style={{ width: 90, height: 90, position: 'absolute' }}
          >
            <Typography variant="body2" bold style={{ color: colors.combatHeal }}>
              {hp}/{hpMax}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      {isHost ? (
        <BottomSheet size="xs">
          <Button
            size="sm"
            disabled={roomConnection.isBusy}
            onPress={() => void roomConnection.advanceScreen()}
            label="Continue"
          />
        </BottomSheet>
      ) : (
        <BottomSheet size="xs">
          <Typography
            variant="caption"
            style={{ color: colors.combatWaiting, textAlign: 'center' }}
          >
            Waiting for host to continue...
          </Typography>
        </BottomSheet>
      )}
    </Stack>
  );
};

export default RestScreen;
