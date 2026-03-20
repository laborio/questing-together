import { Redirect } from 'expo-router';
import paperTexture from '@/assets/images/T_Background_Paper.png';
import { Stack, TiledBackground, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import LobbyContent from '@/features/lobby/LobbyContent';

const LobbyScreen = () => {
  const { room, isStoryView, roomStory } = useGame();

  if (!room) return null;

  if (isStoryView) {
    return <Redirect href="/(game)/adventure" />;
  }

  if (!roomStory.isReady) {
    return (
      <Stack
        flex={1}
        align="center"
        justify="center"
        style={{ backgroundColor: colors.backgroundPaper }}
      >
        <TiledBackground source={paperTexture} />
        <Typography variant="body" style={{ color: colors.textSecondary }}>
          Syncing room state...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundPaper }}>
      <TiledBackground source={paperTexture} />
      <LobbyContent />
    </Stack>
  );
};

export default LobbyScreen;
