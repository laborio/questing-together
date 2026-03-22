import { Redirect } from 'expo-router';
import { useGame } from '@/contexts/GameContext';
import AdventureDispatcher from '@/features/adventure/AdventureDispatcher';

const AdventureScreen = () => {
  const { isLobby } = useGame();

  if (isLobby) {
    return <Redirect href="/(game)/lobby" />;
  }

  return <AdventureDispatcher />;
};

export default AdventureScreen;
