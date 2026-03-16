import { useState } from 'react';
import { View } from 'react-native';
import homeScreenArt from '@/assets/images/T_HomeScreen_Art.png';
import homeScreenTitleFrame from '@/assets/images/T_HomeScreen_TitleFrame.png';
import {
  BackgroundArt,
  CodeInput,
  ContentContainer,
  FramedTitle,
  TexturedButton,
  Typography,
} from '@/components';
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
        <View style={{ width: '100%', alignItems: 'center', gap: 8, marginTop: titleTopOffset }}>
          <FramedTitle
            source={homeScreenTitleFrame}
            style={{ height: titleFrameHeight, width: titleFrameWidth, marginTop: 2 }}
          >
            <Typography variant="title">À L'AVENTURE, COMPAGNONS</Typography>
          </FramedTitle>
          <Typography variant="subtitle">Multiplayer Text RPG Adventure</Typography>
        </View>

        <View
          style={{
            width: '100%',
            alignItems: 'center',
            gap: 10,
            marginTop: 'auto',
            marginBottom: actionsBottomOffset,
          }}
        >
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
        </View>
      </ContentContainer>
    </BackgroundArt>
  );
};

export { RoomConnectionCard };
