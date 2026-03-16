import { ScreenContainer, Typography } from '@/components';
import { useGame } from '@/contexts/GameContext';
import { RoomConnectionCard } from '@/features/lobby/RoomConnectionCard';

const HomeScreen = () => {
  const game = useGame();

  if (!game.auth.isAuthReady) {
    return (
      <ScreenContainer centered>
        <Typography>Signing in...</Typography>
      </ScreenContainer>
    );
  }

  if (game.auth.authError) {
    return (
      <ScreenContainer centered>
        <Typography variant="error">Auth error: {game.auth.authError}</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <RoomConnectionCard
        isBusy={game.roomConnection.isBusy}
        errorText={game.roomConnection.roomError}
        onCreateRoom={() => void game.roomConnection.createRoom()}
        onJoinRoom={(code) => void game.roomConnection.joinRoom(code)}
      />
    </ScreenContainer>
  );
};

export default HomeScreen;
