import { EmptyState, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import AdventureProgressBar from '@/features/adventure/components/AdventureProgressBar';
import ChoiceScreen from '@/features/choice/ChoiceScreen';
import CombatScreen from '@/features/combat/CombatScreen';
import PuzzleScreen from '@/features/puzzle/PuzzleScreen';
import RestScreen from '@/features/rest/RestScreen';
import ShopScreen from '@/features/shop/ShopScreen';

const AdventureDispatcher = () => {
  const { roomConnection } = useGame();
  const { currentScreen } = roomConnection;

  if (!currentScreen) {
    return <EmptyState text="Loading adventure..." />;
  }

  const renderScreen = () => {
    switch (currentScreen.screenType) {
      case 'combat':
      case 'boss_fight':
        return <CombatScreen />;
      case 'narrative_choice':
        return <ChoiceScreen />;
      case 'shop':
        return <ShopScreen />;
      case 'rest':
        return <RestScreen />;
      case 'puzzle':
        return <PuzzleScreen />;
      default:
        return (
          <Stack flex={1} align="center" justify="center">
            <Typography variant="body1" style={{ color: colors.textPrimary }}>
              Unknown screen type
            </Typography>
          </Stack>
        );
    }
  };

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundDark }}>
      <AdventureProgressBar
        position={currentScreen.position}
        bloc={currentScreen.bloc}
        phase={currentScreen.phase}
        screenType={currentScreen.screenType}
      />
      {renderScreen()}
    </Stack>
  );
};

export default AdventureDispatcher;
