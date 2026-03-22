import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, BottomSheet, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import type { ChoiceScreenConfig } from '@/types/adventure';

const ChoiceScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, isHost } = useGame();
  const { currentScreen } = roomConnection;

  const config = currentScreen?.config as ChoiceScreenConfig | undefined;

  if (!config) return null;

  const handleChoice = async (optionId: string) => {
    const option = config.options.find((o) => o.id === optionId);
    if (option) {
      await roomConnection.applyScreenEffect(
        option.effect.hpDelta ?? 0,
        option.effect.goldDelta ?? 0,
        option.effect.expDelta ?? 0,
      );
    }
    void roomConnection.advanceScreen();
  };

  return (
    <Stack flex={1}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16 + insets.top,
          paddingBottom: 120 + insets.bottom,
          gap: 16,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h4"
          style={{ color: colors.combatTitle, textAlign: 'center', marginBottom: 8 }}
        >
          📜
        </Typography>
        <Typography
          variant="body1"
          style={{ color: colors.textPrimary, textAlign: 'center', lineHeight: 22 }}
        >
          {config.prompt}
        </Typography>

        <Stack gap={8} style={{ marginTop: 16 }}>
          {config.options.map((option) => {
            const effectParts: string[] = [];
            if (option.effect.hpDelta)
              effectParts.push(
                `HP ${option.effect.hpDelta > 0 ? '+' : ''}${option.effect.hpDelta}`,
              );
            if (option.effect.goldDelta)
              effectParts.push(
                `Gold ${option.effect.goldDelta > 0 ? '+' : ''}${option.effect.goldDelta}`,
              );
            if (option.effect.expDelta)
              effectParts.push(
                `XP ${option.effect.expDelta > 0 ? '+' : ''}${option.effect.expDelta}`,
              );

            return (
              <ActionButton
                key={option.id}
                label={option.text}
                subtitle={effectParts.join(' · ')}
                disabled={roomConnection.isBusy || !isHost}
                onPress={() => handleChoice(option.id)}
              />
            );
          })}
        </Stack>
      </ScrollView>

      {!isHost ? (
        <BottomSheet size="xs">
          <Typography
            variant="caption"
            style={{ color: colors.combatWaiting, textAlign: 'center' }}
          >
            Waiting for host to choose...
          </Typography>
        </BottomSheet>
      ) : null}
    </Stack>
  );
};

export default ChoiceScreen;
