import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, BottomSheet, Button, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useTranslation } from '@/contexts/I18nContext';
import type { ScreenType } from '@/types/adventure';

type PlayTestMenuProps = {
  isBusy: boolean;
  onSelect: (screenType: ScreenType, bloc: number) => void;
  onBack: () => void;
};

type TestEntry = {
  labelKey:
    | 'combatBloc'
    | 'bossBloc'
    | 'bossFinal'
    | 'narrativeChoice'
    | 'shop'
    | 'rest'
    | 'puzzle';
  icon: string;
  screenType: ScreenType;
  bloc: number;
};

const TESTS: TestEntry[] = [
  { labelKey: 'combatBloc', icon: '⚔️', screenType: 'combat', bloc: 1 },
  { labelKey: 'bossBloc', icon: '🐉', screenType: 'boss_fight', bloc: 1 },
  { labelKey: 'shop', icon: '🛒', screenType: 'shop', bloc: 1 },
  { labelKey: 'rest', icon: '🏕️', screenType: 'rest', bloc: 1 },
  { labelKey: 'puzzle', icon: '🧩', screenType: 'puzzle', bloc: 1 },
];

const PlayTestMenu = ({ isBusy, onSelect, onBack }: PlayTestMenuProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
          {t('playTest.title')}
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.combatWaiting, textAlign: 'center', marginBottom: 8 }}
        >
          {t('playTest.subtitle')}
        </Typography>

        <Stack gap={8}>
          {TESTS.map((test) => (
            <ActionButton
              key={`${test.screenType}-${test.bloc}`}
              label={t(`playTest.${test.labelKey}`, { bloc: test.bloc })}
              icon={test.icon}
              disabled={isBusy}
              onPress={() => onSelect(test.screenType, test.bloc)}
            />
          ))}
        </Stack>
      </ScrollView>

      <BottomSheet size="xs">
        <Button
          size="sm"
          variant="ghost"
          disabled={isBusy}
          onPress={onBack}
          label={t('common.back')}
        />
      </BottomSheet>
    </Stack>
  );
};

export default PlayTestMenu;
