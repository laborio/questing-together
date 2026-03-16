import { Text, View } from 'react-native';
import { useGame } from '@/contexts/GameContext';
import { RoomConnectionCard } from '@/features/lobby/RoomConnectionCard';

const HomeScreen = () => {
  const game = useGame();

  if (!game.auth.isAuthReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e140d',
        }}
      >
        <Text style={{ fontSize: 14, color: '#d0c0a6', fontFamily: 'Besley' }}>Signing in...</Text>
      </View>
    );
  }

  if (game.auth.authError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e140d',
        }}
      >
        <Text style={{ fontSize: 13, color: '#f3b3a4' }}>Auth error: {game.auth.authError}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1e140d', justifyContent: 'center' }}>
      <RoomConnectionCard
        isBusy={game.roomConnection.isBusy}
        errorText={game.roomConnection.roomError}
        onCreateRoom={() => void game.roomConnection.createRoom()}
        onJoinRoom={(code) => void game.roomConnection.joinRoom(code)}
      />
    </View>
  );
};

export default HomeScreen;
