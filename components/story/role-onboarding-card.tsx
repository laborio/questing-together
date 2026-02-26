import React, { useEffect, useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { playerNameById, roles } from '@/src/game/constants';
import { PlayerId, RoleId } from '@/src/game/types';

type LobbyPlayer = {
  playerId: PlayerId;
  roleId: RoleId | null;
  displayName: string | null;
};

type RoleOnboardingCardProps = {
  localPlayerId: PlayerId;
  players: LobbyPlayer[];
  isHost: boolean;
  isBusy: boolean;
  onSetDisplayName: (name: string) => void;
  onSelectRole: (roleId: RoleId) => void;
  onStartAdventure: () => void;
};

const dividerLarge = require('../../assets/images/T_Divider_L.png');
const buttonTexture = require('../../assets/images/T_Button.png');
const buttonTextureSelected = require('../../assets/images/T_Button_Selected.png');
const buttonTextureDisabled = require('../../assets/images/T_Button_Disabled.png');

export function RoleOnboardingCard({
  localPlayerId,
  players,
  isHost,
  isBusy,
  onSetDisplayName,
  onSelectRole,
  onStartAdventure,
}: RoleOnboardingCardProps) {
  const existingName = players.find((player) => player.playerId === localPlayerId)?.displayName ?? '';
  const [nameInput, setNameInput] = useState(existingName || '');
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (existingName && existingName !== nameInput) {
      setNameInput(existingName);
    }
  }, [existingName, nameInput]);

  const normalizedName = useMemo(() => nameInput.trim(), [nameInput]);
  const hasInvalidWhitespace = /\s/.test(normalizedName);
  const isNameEmpty = normalizedName.length === 0;
  const isNameTooLong = normalizedName.length > 20;
  const isNameValid = !isNameEmpty && !isNameTooLong && !hasInvalidWhitespace;

  const localNameSaved = Boolean(existingName);
  const canPickRole = localNameSaved;
  const selectedRoleId = players.find((player) => player.playerId === localPlayerId)?.roleId ?? null;
  const assignedRoleIds = new Set(players.map((player) => player.roleId).filter(Boolean) as RoleId[]);
  const allPicked = players.length === 3 && players.every((player) => Boolean(player.roleId));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Pick Your Role</Text>
      <Text style={styles.subtitle}>First come, first serve. Each role can be taken by one player only.</Text>
      <Image source={dividerLarge} style={styles.divider} resizeMode="contain" />

      <View style={styles.nameCard}>
        <Text style={styles.nameTitle}>Choose your name</Text>
        <TextInput
          value={nameInput}
          onChangeText={(text) => {
            setNameTouched(true);
            setNameInput(text);
          }}
          autoCorrect={false}
          autoCapitalize="words"
          maxLength={20}
          placeholder="No spaces (e.g. Arin)"
          placeholderTextColor="#64748b"
          style={styles.nameInput}
        />
        {nameTouched && !isNameValid ? (
          <Text style={styles.nameError}>
            {isNameEmpty
              ? 'Name is required.'
              : isNameTooLong
                ? 'Name must be 20 characters or fewer.'
                : 'Name cannot contain spaces.'}
          </Text>
        ) : null}
        <Pressable
          disabled={!isNameValid || isBusy}
          onPress={() => {
            setNameTouched(true);
            if (!isNameValid) return;
            onSetDisplayName(normalizedName);
          }}
          style={[styles.nameSaveButton, (!isNameValid || isBusy) && styles.roleButtonDisabled]}>
          <ImageBackground
            source={!isNameValid || isBusy ? buttonTextureDisabled : buttonTexture}
            resizeMode="stretch"
            imageStyle={styles.textureImage}
            style={styles.textureButton}>
            <Text style={styles.nameSaveButtonText}>{localNameSaved ? 'Update Name' : 'Save Name'}</Text>
          </ImageBackground>
        </Pressable>
        {localNameSaved ? <Text style={styles.nameSavedText}>Saved as {existingName}.</Text> : null}
      </View>

      <View style={styles.roleList}>
        {roles.map((role) => {
          const owner = players.find((player) => player.roleId === role.id);
          const isTakenByOther = owner && owner.playerId !== localPlayerId;
          const isSelectedByLocal = selectedRoleId === role.id;
          const isDisabled = Boolean(isTakenByOther) || isBusy || !canPickRole;

          return (
            <Pressable
              key={role.id}
              disabled={isDisabled}
              onPress={() => onSelectRole(role.id)}
              style={[
                styles.roleButton,
                isSelectedByLocal && styles.roleButtonSelected,
                isTakenByOther && styles.roleButtonTaken,
                isDisabled && styles.roleButtonDisabled,
              ]}>
              <ImageBackground
                source={isSelectedByLocal ? buttonTextureSelected : isDisabled ? buttonTextureDisabled : buttonTexture}
                resizeMode="stretch"
                imageStyle={styles.textureImage}
                style={styles.roleButtonBg}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleLabel}>{role.label}</Text>
                  <Text style={styles.roleStatus}>
                    {isSelectedByLocal
                      ? 'You'
                      : owner
                        ? `Taken by ${owner.displayName ?? playerNameById[owner.playerId]}`
                        : 'Available'}
                  </Text>
                </View>
                <Text style={styles.roleSummary}>{role.summary}</Text>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.assignmentCard}>
        <Text style={styles.assignmentTitle}>Party Assignment</Text>
        {players.map((player) => (
          <Text key={player.playerId} style={styles.assignmentLine}>
            {player.displayName ?? playerNameById[player.playerId]}: {player.roleId ? player.roleId.toUpperCase() : 'waiting...'}
          </Text>
        ))}
      </View>

      <Text style={styles.readyLine}>
        {canPickRole
          ? allPicked
            ? 'All roles picked. Host can start adventure.'
            : `Waiting for all picks (${assignedRoleIds.size}/3).`
          : 'Set your name to unlock roles.'}
      </Text>

      {isHost ? (
        <Pressable
          disabled={!allPicked || isBusy}
          onPress={onStartAdventure}
          style={[styles.startButton, (!allPicked || isBusy) && styles.startButtonDisabled]}>
          <ImageBackground
            source={!allPicked || isBusy ? buttonTextureDisabled : buttonTextureSelected}
            resizeMode="stretch"
            imageStyle={styles.textureImage}
            style={styles.textureButton}>
            <Text style={styles.startButtonText}>{isBusy ? 'Starting...' : 'Start Adventure'}</Text>
          </ImageBackground>
        </Pressable>
      ) : (
        <Text style={styles.hostHint}>Waiting for host to start once everyone has picked.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 0,
    gap: 12,
    borderWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4b3420',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b4a2a',
    lineHeight: 18,
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  divider: {
    width: '72%',
    aspectRatio: 400 / 22,
    alignSelf: 'center',
  },
  nameCard: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    gap: 8,
  },
  nameTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b4a2a',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#c2a377',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#4d3625',
    backgroundColor: '#f8efdf',
    fontSize: 14,
    fontFamily: 'Besley',
  },
  nameError: {
    fontSize: 11,
    color: '#9c3f32',
    fontFamily: 'Besley',
  },
  nameSaveButton: {
    width: '100%',
  },
  textureButton: {
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textureImage: {
    borderRadius: 10,
  },
  nameSaveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8f1e2',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  nameSavedText: {
    fontSize: 11,
    color: '#5f7a45',
    fontFamily: 'Besley',
  },
  roleList: {
    gap: 8,
  },
  roleButton: {
    width: '100%',
  },
  roleButtonSelected: {
    opacity: 1,
  },
  roleButtonTaken: {
    opacity: 0.88,
  },
  roleButtonDisabled: {
    opacity: 0.72,
  },
  roleButtonBg: {
    borderRadius: 10,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 5,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8f1e2',
    fontFamily: 'Besley',
  },
  roleStatus: {
    fontSize: 10,
    color: '#efdcbb',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  roleSummary: {
    fontSize: 12,
    color: '#f2e4ca',
    lineHeight: 17,
    fontFamily: 'Besley',
  },
  assignmentCard: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    gap: 3,
  },
  assignmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5f4325',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: 'Besley',
  },
  assignmentLine: {
    fontSize: 12,
    color: '#5f4325',
    fontFamily: 'Besley',
  },
  readyLine: {
    fontSize: 12,
    color: '#6b4a2a',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#f8f1e2',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  hostHint: {
    fontSize: 12,
    color: '#6b4a2a',
    textAlign: 'center',
    fontFamily: 'Besley',
  },
});
