import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  Button,
  Divider,
  EmptyState,
  Portrait,
  Stack,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
import { playerNameById, roles } from '@/constants/constants';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import { portraitByRole } from '@/utils/portraitByRole';

const LobbyContent = () => {
  const {
    roomConnection,
    localPlayerId,
    localDisplayName,
    room,
    isLobby,
    isAdventureStarted,
    localRole,
    isHost,
  } = useGame();
  const insets = useSafeAreaInsets();
  const { players, isBusy } = roomConnection;
  const { t } = useTranslation();

  // Early returns
  if (!isLobby) {
    if (!localPlayerId) {
      return <EmptyState text={t('lobby.syncingSlot')} />;
    }

    if (!isAdventureStarted || !localRole) {
      const statusText = !isAdventureStarted
        ? t('lobby.waitingAdventure')
        : t('lobby.roleNotAssigned');

      return <EmptyState text={statusText} />;
    }

    return null;
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          gap: 14,
          paddingTop: 12 + insets.top,
          paddingBottom: 120 + insets.bottom,
          flexGrow: 1,
        }}
      >
        <Stack
          gap={12}
          style={{
            paddingVertical: 14,
            overflow: 'hidden',
            backgroundColor: colors.backgroundCardTransparent,
          }}
        >
          <Typography variant="heading" style={{ color: colors.textOverlayHeading }}>
            {t('lobby.heading')}
          </Typography>

          {localPlayerId ? (
            <Typography
              variant="bodySm"
              bold
              style={{ marginTop: -2, textAlign: 'center', color: colors.textOverlayAccent }}
            >
              {t('lobby.signedInAs', { name: localDisplayName })}
            </Typography>
          ) : null}

          {room?.code ? (
            <Typography variant="body" bold style={{ color: colors.textOverlayHeading }}>
              {t('lobby.roomCode', { code: room.code })}
            </Typography>
          ) : null}

          {localPlayerId ? (
            <>
              <Divider />

              {/* Party members */}
              <Typography variant="caption" bold style={{ color: colors.textAvatarNameParchment }}>
                {t('lobby.party')}
              </Typography>
              <Stack direction="row" justify="space-evenly">
                {players.map((p) => {
                  const role = roles.find((r) => r.id === p.role_id);
                  const roleKey = p.role_id as 'warrior' | 'sage' | 'ranger' | undefined;
                  return (
                    <Stack key={p.player_id} align="center" gap={2}>
                      {p.role_id ? (
                        <Portrait
                          source={portraitByRole(p.role_id)}
                          size={80}
                          highlighted
                          highlightColor={colors.success}
                          name={roleKey ? t(`roles.${roleKey}`) : (role?.label ?? '')}
                          nameColor={colors.success}
                          nameFontSize={12}
                        />
                      ) : null}
                      <Typography
                        variant="fine"
                        bold
                        style={{ color: colors.textAvatarNameParchment }}
                      >
                        {p.display_name ?? playerNameById[p.player_id]}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>

              <Typography
                variant="caption"
                style={{ textAlign: 'center', color: colors.textOverlayAccent }}
              >
                {players.length === 1
                  ? t('lobby.waitingCompanions')
                  : t('lobby.adventurersReady', { count: players.length })}
              </Typography>
            </>
          ) : (
            <EmptyState text={t('lobby.syncingSlot')} />
          )}
        </Stack>
      </ScrollView>

      {/* Bottom actions */}
      <BottomSheet size="xs">
        <Stack direction="row" gap={10}>
          <Stack flex={1}>
            <Button
              label={isBusy ? t('lobby.leaving') : t('lobby.leaveRoom')}
              variant="danger"
              size="sm"
              disabled={isBusy}
              onPress={() => roomConnection.leaveRoom()}
            />
          </Stack>
          <Stack flex={1}>
            {isHost ? (
              <Button
                label={isBusy ? t('lobby.starting') : t('lobby.startAdventure')}
                variant="validation"
                size="sm"
                disabled={isBusy}
                onPress={() => roomConnection.startAdventure()}
              />
            ) : (
              <Button label={t('lobby.waitingHost')} variant="ghost" size="sm" disabled />
            )}
          </Stack>
        </Stack>
      </BottomSheet>
    </>
  );
};

export default LobbyContent;
