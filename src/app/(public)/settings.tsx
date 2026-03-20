import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Button, Card, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useTranslation } from '@/contexts/I18nContext';

type Locale = 'en' | 'fr';

const LANGUAGES: { value: Locale; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
];

const SettingsScreen = () => {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  return (
    <Stack
      gap={24}
      style={{
        flex: 1,
        backgroundColor: colors.backgroundDark,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 40,
      }}
    >
      <Typography variant="h2">{t('settings.title')}</Typography>

      <Stack gap={12}>
        <Typography variant="caption" bold style={{ color: colors.textSecondary }}>
          {t('settings.language')}
        </Typography>

        <Stack gap={8}>
          {LANGUAGES.map((lang) => {
            const isSelected = locale === lang.value;
            return (
              <Pressable key={lang.value} onPress={() => setLocale(lang.value)}>
                <Card
                  borderColor={isSelected ? colors.optionSelectedBorder : colors.borderCard}
                  backgroundColor={isSelected ? colors.actionSelectedBg : colors.backgroundCard}
                >
                  <Stack direction="row" align="center" gap={12}>
                    <Typography variant="h4">{lang.flag}</Typography>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Typography variant="body1" bold style={{ color: colors.textPrimary }}>
                        {lang.label}
                      </Typography>
                    </Stack>
                    <Stack
                      align="center"
                      justify="center"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? colors.optionSelectedBorder : colors.textDisabled,
                      }}
                    >
                      {isSelected ? (
                        <Stack
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.optionSelectedBorder,
                          }}
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                </Card>
              </Pressable>
            );
          })}
        </Stack>
      </Stack>

      <Stack style={{ marginTop: 'auto' }}>
        <Button size="md" variant="ghost" onPress={() => router.back()} label={t('common.back')} />
      </Stack>
    </Stack>
  );
};

export default SettingsScreen;
