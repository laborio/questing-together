import Constants from 'expo-constants';
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
import { useHomeScreenLayout } from '@/utils/homeScreenLayout';

type TitleScreenProps = {
  onCreate: () => void;
  onBrowse: () => void;
};

const TitleScreen = ({ onCreate, onBrowse }: TitleScreenProps) => {
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
              <Typography variant="title">À L'AVENTURE,</Typography>
              <Typography variant="title">COMPAGNONS</Typography>
            </Stack>
          </FramedTitle>
          <Typography variant="subtitle">Multiplayer Text RPG Adventure</Typography>
          <Typography variant="micro" style={{ color: colors.textDisabled }}>
            v{Constants.expoConfig?.version ?? '0.0.0'}
          </Typography>
        </Stack>

        <ActionGroup style={{ marginBottom: actionsBottomOffset }}>
          <Button
            size="lg"
            disabled={isBusy}
            onPress={onCreate}
            label="Create Room"
            hint="Start a new party"
          />
          <Button
            size="lg"
            disabled={isBusy}
            onPress={onBrowse}
            label="Join Room"
            hint="Browse available rooms"
          />
          {roomError ? <Typography variant="error">{roomError}</Typography> : null}
        </ActionGroup>
      </ContentContainer>
    </BackgroundArt>
  );
};

export default TitleScreen;
