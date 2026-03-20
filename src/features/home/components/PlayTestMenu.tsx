import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, BottomSheet, Button, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import type { ScreenType } from '@/types/adventure';

type PlayTestMenuProps = {
  isBusy: boolean;
  onSelect: (screenType: ScreenType, bloc: number) => void;
  onBack: () => void;
};

const TESTS: { label: string; icon: string; screenType: ScreenType; bloc: number }[] = [
  { label: 'Combat Bloc 1', icon: '⚔️', screenType: 'combat', bloc: 1 },
  { label: 'Combat Bloc 2', icon: '⚔️', screenType: 'combat', bloc: 2 },
  { label: 'Combat Bloc 3', icon: '⚔️', screenType: 'combat', bloc: 3 },
  { label: 'Boss Bloc 1', icon: '🐉', screenType: 'boss_fight', bloc: 1 },
  { label: 'Boss Final', icon: '💀', screenType: 'boss_fight', bloc: 3 },
  { label: 'Narrative Choice', icon: '📜', screenType: 'narrative_choice', bloc: 1 },
  { label: 'Shop', icon: '🛒', screenType: 'shop', bloc: 1 },
  { label: 'Rest', icon: '🏕️', screenType: 'rest', bloc: 1 },
  { label: 'Puzzle', icon: '🧩', screenType: 'puzzle', bloc: 1 },
];

const PlayTestMenu = ({ isBusy, onSelect, onBack }: PlayTestMenuProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundDark }}>
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          gap: 8,
          paddingTop: 12 + insets.top,
          paddingBottom: 120 + insets.bottom,
        }}
      >
        <Typography variant="h4" style={{ color: colors.combatTitle, textAlign: 'center' }}>
          Play Test
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.combatWaiting, textAlign: 'center', marginBottom: 8 }}
        >
          Launch a specific screen directly
        </Typography>

        <Stack gap={8}>
          {TESTS.map((test) => (
            <ActionButton
              key={`${test.screenType}-${test.bloc}`}
              label={test.label}
              icon={test.icon}
              subtitle={`Bloc ${test.bloc}`}
              disabled={isBusy}
              onPress={() => onSelect(test.screenType, test.bloc)}
            />
          ))}
        </Stack>
      </ScrollView>

      <BottomSheet size="xs">
        <Button size="sm" variant="ghost" disabled={isBusy} onPress={onBack} label="Back" />
      </BottomSheet>
    </Stack>
  );
};

export default PlayTestMenu;
