import { Redirect, Stack } from 'expo-router';
import { useGame } from '@/contexts/GameContext';

const PublicLayout = () => {
  const game = useGame();

  if (!game.auth.isAuthReady) return null;

  if (game.room) {
    return <Redirect href={game.isLobby ? '/(game)/lobby' : '/(game)/adventure-setup'} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="fx-test" />
    </Stack>
  );
};

export default PublicLayout;
