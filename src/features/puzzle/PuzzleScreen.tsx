import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, BottomSheet, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import type { PuzzleScreenConfig } from '@/types/adventure';

const PuzzleScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, isHost } = useGame();
  const { currentScreen } = roomConnection;
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);

  const config = currentScreen?.config as PuzzleScreenConfig | undefined;

  if (!config) return null;

  const handleAnswer = (isCorrect: boolean) => {
    setAnswered(true);
    setCorrect(isCorrect);
    const effect = isCorrect ? config.reward : config.penalty;
    void roomConnection.applyScreenEffect(
      effect.hpDelta ?? 0,
      effect.goldDelta ?? 0,
      effect.expDelta ?? 0,
    );
  };

  const handleContinue = () => {
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
        <Typography variant="h4" style={{ color: colors.combatTitle, textAlign: 'center' }}>
          🧩 Riddle
        </Typography>

        <Typography
          variant="body1"
          style={{ color: colors.textPrimary, textAlign: 'center', lineHeight: 22 }}
        >
          {config.puzzleId}
        </Typography>

        {!answered ? (
          <Stack gap={8} style={{ marginTop: 16 }}>
            <ActionButton
              label="Answer A"
              disabled={roomConnection.isBusy || !isHost}
              onPress={() => handleAnswer(true)}
            />
            <ActionButton
              label="Answer B"
              disabled={roomConnection.isBusy || !isHost}
              onPress={() => handleAnswer(false)}
            />
            <ActionButton
              label="Answer C"
              disabled={roomConnection.isBusy || !isHost}
              onPress={() => handleAnswer(false)}
            />
          </Stack>
        ) : (
          <Stack gap={8} align="center" style={{ marginTop: 16 }}>
            <Typography
              variant="h4"
              style={{ color: correct ? colors.combatHeal : colors.combatDamage }}
            >
              {correct ? '✅ Correct!' : '❌ Wrong!'}
            </Typography>
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              {correct
                ? `XP +${config.reward.expDelta ?? 0} · Gold +${config.reward.goldDelta ?? 0}`
                : `HP ${config.penalty.hpDelta ?? 0}`}
            </Typography>
          </Stack>
        )}
      </ScrollView>

      {answered && isHost ? (
        <BottomSheet size="xs">
          <ActionButton
            label="Continue"
            disabled={roomConnection.isBusy}
            onPress={handleContinue}
          />
        </BottomSheet>
      ) : null}

      {!isHost ? (
        <BottomSheet size="xs">
          <Typography
            variant="caption"
            style={{ color: colors.combatWaiting, textAlign: 'center' }}
          >
            Waiting for host...
          </Typography>
        </BottomSheet>
      ) : null}
    </Stack>
  );
};

export default PuzzleScreen;
