import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, RoomCard, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';

type RoomBrowserProps = {
  onSelectRoom: (code: string) => void;
  onBack: () => void;
};

const RoomBrowser = ({ onSelectRoom, onBack }: RoomBrowserProps) => {
  const insets = useSafeAreaInsets();
  const { roomConnection } = useGame();
  const { myRooms, availableRooms, isBusy, roomError } = roomConnection;
  const { t } = useTranslation();

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundDark }}>
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          gap: 12,
          paddingTop: 12 + insets.top,
          paddingBottom: 120 + insets.bottom,
        }}
      >
        {myRooms.length > 0 ? (
          <Stack gap={8}>
            <Typography variant="h4" style={{ color: colors.combatTitle }}>
              {t('roomBrowser.yourRooms')}
            </Typography>
            {myRooms.map((r) => (
              <RoomCard
                key={r.roomId}
                code={r.code}
                status={r.status}
                playerCount={r.playerCount}
                hostName={r.hostName}
                isHost={r.isHost}
                disabled={isBusy}
                onPress={() => void roomConnection.rejoinRoom(r.roomId)}
                onDelete={() => void roomConnection.deleteRoom(r.roomId)}
              />
            ))}
          </Stack>
        ) : null}

        <Stack gap={8}>
          <Typography variant="h4" style={{ color: colors.combatTitle }}>
            {t('roomBrowser.availableRooms')}
          </Typography>
          {availableRooms.length > 0 ? (
            availableRooms.map((r) => (
              <RoomCard
                key={r.roomId}
                code={r.code}
                status={r.status}
                playerCount={r.playerCount}
                hostName={r.hostName}
                disabled={isBusy}
                onPress={() => onSelectRoom(r.code)}
              />
            ))
          ) : (
            <Typography
              variant="body1"
              style={{ color: colors.combatWaiting, textAlign: 'center' }}
            >
              {t('roomBrowser.noRooms')}
            </Typography>
          )}
        </Stack>
      </ScrollView>

      <BottomSheet size="xs">
        <Stack direction="row" gap={10}>
          <Stack flex={1}>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onPress={onBack}
              label={t('common.back')}
            />
          </Stack>
          <Stack flex={1}>
            <Button
              size="sm"
              variant="danger"
              disabled={isBusy}
              onPress={() => void roomConnection.adminDeleteAllRooms()}
              label="Delete all"
            />
          </Stack>
        </Stack>
        {roomError ? <Typography variant="error">{roomError}</Typography> : null}
      </BottomSheet>
    </Stack>
  );
};

export default RoomBrowser;
