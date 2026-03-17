import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  BottomSheet,
  Button,
  Divider,
  EmptyState,
  Portrait,
  Stack,
  Stepper,
  TextField,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
import { playerNameById, roles } from '@/constants/constants';
import { useGame } from '@/contexts/GameContext';
import { getNameError } from '@/features/lobby/utils/getNameError';
import { getReadyText } from '@/features/lobby/utils/getReadyText';
import type { RoleId } from '@/types/player';
import { portraitByRole } from '@/utils/portraitByRole';

function getPortraitColor(isSelected: boolean, isTaken: boolean, isFocused: boolean) {
  if (isSelected) return colors.success;
  if (isTaken) return colors.errorDark;
  if (isFocused) return colors.textOverlayHeading;
  return colors.textInputDark;
}

const LobbyContent = () => {
  // Hooks
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
  const [nameInput, setNameInput] = useState('');
  const [focusedRoleId, setFocusedRoleId] = useState<RoleId | null>(null);

  // Derived state
  const { players, isBusy } = roomConnection;
  const targetPlayerCount = room?.target_player_count ?? 1;
  const localPlayer = players.find((p) => p.player_id === localPlayerId);
  const existingName = localPlayer?.display_name ?? '';
  const selectedRoleId = localPlayer?.role_id ?? null;
  const assignedCount = players.filter((p) => p.role_id).length;
  const normalizedName = (nameInput || existingName).trim();
  const nameError = localPlayerId ? getNameError(normalizedName, players, localPlayerId) : null;
  const hasName = Boolean(existingName) || (normalizedName.length > 0 && nameError === null);
  const localHasRole = Boolean(selectedRoleId || focusedRoleId);
  const allPicked =
    players.length === targetPlayerCount &&
    players.every((p) => (p.player_id === localPlayerId ? localHasRole : Boolean(p.role_id))) &&
    hasName;
  const focusedRole = focusedRoleId ? roles.find((r) => r.id === focusedRoleId) : null;

  // Handlers
  const handlePortraitPress = (roleId: RoleId) => {
    setFocusedRoleId(roleId);
    void roomConnection.selectRole(roleId);
  };

  // Early returns
  if (!isLobby) {
    if (!localPlayerId) {
      return <EmptyState text="Syncing your player slot..." />;
    }

    if (!isAdventureStarted || !localRole) {
      const statusText = !isAdventureStarted
        ? 'Waiting for adventure to start...'
        : 'This room is in progress but your role is not assigned.';

      return <EmptyState text={statusText} />;
    }

    return null;
  }

  // Render
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
            {"À l'Aventure Compagnons"}
          </Typography>

          {localPlayerId ? (
            <Typography
              variant="bodySm"
              bold
              style={{ marginTop: -2, textAlign: 'center', color: colors.textOverlayAccent }}
            >
              Signed in as {localDisplayName}
            </Typography>
          ) : null}

          {room?.code ? (
            <Typography variant="body" bold style={{ color: colors.textOverlayHeading }}>
              Room code: {room.code}
            </Typography>
          ) : null}

          {localPlayerId ? (
            <>
              <Divider />

              {/* Name section */}
              {!existingName ? (
                <>
                  <Typography
                    variant="caption"
                    bold
                    style={{ color: colors.textAvatarNameParchment }}
                  >
                    Choose Your Name
                  </Typography>
                  <TextField
                    value={nameInput}
                    onChangeText={(text) => setNameInput(text.replace(/\s+/g, '-'))}
                    onBlur={() => {
                      const name = nameInput.trim();
                      console.log('onBlur name:', name, 'nameError:', nameError);
                      if (name.length > 0 && !nameError) {
                        roomConnection.setDisplayName(name);
                      }
                    }}
                    onSubmitEditing={() => {
                      const name = nameInput.trim();
                      if (name.length > 0 && !nameError) {
                        roomConnection.setDisplayName(name);
                      }
                    }}
                    autoCorrect={false}
                    autoCapitalize="words"
                    maxLength={20}
                    editable={!isBusy}
                    placeholder="Your adventurer name"
                  />
                </>
              ) : null}

              {/* Party size section */}
              <Stack direction="row" align="center" justify="space-between">
                <Typography
                  variant="caption"
                  bold
                  style={{ color: colors.textAvatarNameParchment }}
                >
                  Party Size
                </Typography>
                {isHost ? (
                  <Stepper
                    value={targetPlayerCount}
                    min={Math.max(1, players.length)}
                    max={3}
                    label={(v: number) => `${v} ${v === 1 ? 'player' : 'players'}`}
                    disabled={isBusy}
                    onValueChange={(c: number) => roomConnection.setTargetPlayerCount(c)}
                  />
                ) : (
                  <Typography variant="caption" style={{ color: colors.textAvatarNameParchment }}>
                    {targetPlayerCount} {targetPlayerCount === 1 ? 'player' : 'players'}
                  </Typography>
                )}
              </Stack>

              <Divider />

              {/* Role portraits */}
              <Typography variant="caption" bold style={{ color: colors.textAvatarNameParchment }}>
                Pick Your Role
              </Typography>
              <Stack gap={8}>
                <Stack direction="row" justify="space-evenly">
                  {roles.map((role) => {
                    const owner = players.find((p) => p.role_id === role.id);
                    const isTakenByOther = Boolean(owner && owner.player_id !== localPlayerId);
                    const isSelectedByLocal = selectedRoleId === role.id;
                    const isFocused = focusedRoleId === role.id;
                    const isDisabled = isTakenByOther || isBusy;
                    const isDimmed = focusedRoleId !== null && !isFocused && !isSelectedByLocal;
                    const ownerName =
                      owner?.display_name ?? (owner ? playerNameById[owner.player_id] : undefined);
                    const portraitColor = getPortraitColor(
                      isSelectedByLocal,
                      isTakenByOther,
                      isFocused,
                    );
                    const portraitOpacity = isDimmed ? 0.35 : isDisabled ? 0.5 : 1;

                    return (
                      <Pressable
                        key={role.id}
                        disabled={isDisabled}
                        onPress={() => handlePortraitPress(role.id)}
                        style={{ alignItems: 'center', opacity: portraitOpacity }}
                      >
                        <Portrait
                          source={portraitByRole(role.id)}
                          size={80}
                          highlighted={isSelectedByLocal || isFocused || isTakenByOther}
                          highlightColor={portraitColor}
                          name={role.label}
                          nameColor={portraitColor}
                          nameFontSize={12}
                        />
                        {ownerName ? (
                          <Typography
                            variant="fine"
                            bold
                            style={{ color: portraitColor, marginTop: 2 }}
                          >
                            {ownerName}
                          </Typography>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Stack>
              </Stack>

              {/* Focused role description */}
              {focusedRole ? (
                <Alert variant="warning" title={focusedRole.label}>
                  {focusedRole.summary}
                </Alert>
              ) : null}

              {/* Party assignment */}
              <Stack gap={3}>
                <Typography
                  variant="caption"
                  bold
                  style={{ color: colors.textAvatarNameParchment, marginBottom: 2 }}
                >
                  Party Assignment
                </Typography>
                {players.map((p) => (
                  <Typography
                    key={p.player_id}
                    variant="caption"
                    style={{ color: colors.textAvatarNameParchment }}
                  >
                    {p.display_name ?? playerNameById[p.player_id]}:{' '}
                    {p.role_id ? p.role_id.toUpperCase() : 'waiting...'}
                  </Typography>
                ))}
              </Stack>

              {/* Ready status */}
              <Typography
                variant="caption"
                style={{ textAlign: 'center', color: colors.textOverlayAccent }}
              >
                {getReadyText(
                  true,
                  players.length < targetPlayerCount,
                  allPicked,
                  players.length,
                  targetPlayerCount,
                  assignedCount,
                )}
              </Typography>
            </>
          ) : (
            <EmptyState text="Syncing your player slot..." />
          )}
        </Stack>
      </ScrollView>

      {/* Bottom actions */}
      <BottomSheet size="xs">
        <Stack direction="row" gap={10}>
          <Stack flex={1}>
            <Button
              label={isBusy ? 'Leaving...' : 'Leave Room'}
              variant="danger"
              size="sm"
              disabled={isBusy}
              onPress={() => roomConnection.leaveRoom()}
            />
          </Stack>
          <Stack flex={1}>
            {isHost ? (
              <Button
                label={isBusy ? 'Starting...' : 'Start Adventure'}
                variant="validation"
                size="sm"
                disabled={!allPicked || isBusy}
                onPress={() => roomConnection.startAdventure()}
              />
            ) : (
              <Button label="Waiting for host..." variant="ghost" size="sm" disabled />
            )}
          </Stack>
        </Stack>
      </BottomSheet>
    </>
  );
};

export default LobbyContent;
