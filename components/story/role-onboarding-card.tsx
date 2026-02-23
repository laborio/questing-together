import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
          <Text style={styles.nameSaveButtonText}>{localNameSaved ? 'Update Name' : 'Save Name'}</Text>
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
          <Text style={styles.startButtonText}>{isBusy ? 'Starting...' : 'Start Adventure'}</Text>
        </Pressable>
      ) : (
        <Text style={styles.hostHint}>Waiting for host to start once everyone has picked.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  nameCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    gap: 6,
  },
  nameTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    textTransform: 'uppercase',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e2e8f0',
    backgroundColor: '#0b1220',
    fontSize: 14,
  },
  nameError: {
    fontSize: 11,
    color: '#fca5a5',
  },
  nameSaveButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
    paddingVertical: 9,
    alignItems: 'center',
  },
  nameSaveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    textTransform: 'uppercase',
  },
  nameSavedText: {
    fontSize: 11,
    color: '#86efac',
  },
  roleList: {
    gap: 8,
  },
  roleButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    gap: 4,
  },
  roleButtonSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
  },
  roleButtonTaken: {
    borderColor: '#475569',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  roleStatus: {
    fontSize: 11,
    color: '#7dd3fc',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roleSummary: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  assignmentCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    gap: 3,
  },
  assignmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  assignmentLine: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  readyLine: {
    fontSize: 12,
    color: '#94a3b8',
  },
  startButton: {
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hostHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
