import { useState } from 'react';
import homeScreenArt from '@/assets/images/T_HomeScreen_Art.png';
import homeScreenTitleFrame from '@/assets/images/T_HomeScreen_TitleFrame.png';
import { FramedTitle, Typography } from '@/components/display';
import { CodeInput, TexturedButton } from '@/components/input';
import { ActionGroup, BackgroundArt, ContentContainer, Stack } from '@/components/layout';
import { useHomeScreenLayout } from '@/utils/homeScreenLayout';

type RoomConnectionCardProps = {
  isBusy: boolean;
  errorText: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
};

const RoomConnectionCard = ({
  isBusy,
  errorText,
  onCreateRoom,
  onJoinRoom,
}: RoomConnectionCardProps) => {
  const {
    minHeight,
    titleTopOffset,
    actionsBottomOffset,
    titleFrameHeight,
    titleFrameWidth,
    insets,
  } = useHomeScreenLayout();
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const canJoin = Boolean(joinCode.trim()) && !isBusy;

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
        </Stack>

        <ActionGroup style={{ marginBottom: actionsBottomOffset }}>
          <TexturedButton
            disabled={isBusy}
            onPress={onCreateRoom}
            label={isBusy ? 'Working...' : 'Create Room'}
            hint="Start a new party"
          />

          <TexturedButton
            disabled={showJoinInput && !canJoin}
            onPress={() => {
              if (!showJoinInput) {
                setShowJoinInput(true);
                return;
              }
              if (!canJoin) return;
              onJoinRoom(joinCode);
            }}
            label={showJoinInput ? 'Join With Code' : 'Join Room'}
            hint={
              showJoinInput
                ? 'Confirm to enter the selected room'
                : 'Enter a room code to join your party'
            }
          />

          {showJoinInput ? (
            <CodeInput value={joinCode} onChangeText={(text) => setJoinCode(text.toUpperCase())} />
          ) : null}

          {errorText ? <Typography variant="error">{errorText}</Typography> : null}
        </ActionGroup>
      </ContentContainer>
    </BackgroundArt>
  );
};

export default RoomConnectionCard;
