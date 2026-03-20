import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import homeScreenArt from '@/assets/images/T_HomeScreen_Art.png';
import homeScreenTitleFrame from '@/assets/images/T_HomeScreen_TitleFrame.png';
import {
  ActionGroup,
  BackgroundArt,
  Button,
  ContentContainer,
  FramedTitle,
  Stack,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import { useHomeScreenLayout } from '@/utils/homeScreenLayout';

type TitleScreenProps = {
  onCreate: () => void;
  onBrowse: () => void;
  onPlayTest: () => void;
};

const TitleScreen = ({ onCreate, onBrowse, onPlayTest }: TitleScreenProps) => {
  const {
    minHeight,
    titleTopOffset,
    actionsBottomOffset,
    titleFrameHeight,
    titleFrameWidth,
    insets,
  } = useHomeScreenLayout();
  const { roomConnection } = useGame();
  const { isBusy, roomError } = roomConnection;
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <BackgroundArt
      source={homeScreenArt}
      style={{ minHeight, marginTop: -insets.top, marginBottom: -insets.bottom }}
    >
      <ContentContainer>
        <Stack gap={16} align="center" style={{ width: '100%', marginTop: titleTopOffset }}>
          <FramedTitle
            source={homeScreenTitleFrame}
            style={{ height: titleFrameHeight, width: titleFrameWidth, marginTop: 2 }}
          >
            <Stack style={{ marginBottom: -16 }}>
              <Typography variant="title">{t('title.heading1')}</Typography>
              <Typography variant="title">{t('title.heading2')}</Typography>
            </Stack>
          </FramedTitle>
          <Typography variant="subtitle">{t('title.subtitle')}</Typography>
          <Typography variant="micro" style={{ color: colors.textDisabled }}>
            v{Constants.expoConfig?.version ?? '0.0.0'}
          </Typography>
        </Stack>

        <ActionGroup style={{ marginBottom: actionsBottomOffset }}>
          <Button
            size="lg"
            disabled={isBusy}
            onPress={onCreate}
            label={t('home.createRoom')}
            hint={t('home.createRoomHint')}
          />
          <Button
            size="lg"
            disabled={isBusy}
            onPress={onBrowse}
            label={t('home.joinRoom')}
            hint={t('home.joinRoomHint')}
          />
          <Button
            size="lg"
            disabled={isBusy}
            onPress={onPlayTest}
            label={t('home.sandbox')}
            hint={t('home.sandboxHint')}
          />
          <Button
            size="sm"
            variant="ghost"
            onPress={() => router.push('/(public)/settings')}
            label={`⚙ ${t('settings.title')}`}
          />
          {roomError ? <Typography variant="error">{roomError}</Typography> : null}
        </ActionGroup>
      </ContentContainer>
    </BackgroundArt>
  );
};

export default TitleScreen;
