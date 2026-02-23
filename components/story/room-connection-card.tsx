import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type RoomConnectionCardProps = {
  localPlayerName: string;
  isBusy: boolean;
  errorText: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
};

export function RoomConnectionCard({
  localPlayerName,
  isBusy,
  errorText,
  onCreateRoom,
  onJoinRoom,
}: RoomConnectionCardProps) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Connect Online</Text>
      <Text style={styles.subtitle}>Signed in as {localPlayerName}. Create a room or join with a code.</Text>

      <Pressable disabled={isBusy} onPress={onCreateRoom} style={[styles.primaryButton, isBusy && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{isBusy ? 'Working...' : 'Create Room'}</Text>
      </Pressable>

      <View style={styles.joinCard}>
        <Text style={styles.joinTitle}>Join Existing Room</Text>
        <TextInput
          value={joinCode}
          onChangeText={(text) => setJoinCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          placeholder="Enter code"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        <Pressable
          disabled={isBusy || !joinCode.trim()}
          onPress={() => onJoinRoom(joinCode)}
          style={[styles.secondaryButton, (isBusy || !joinCode.trim()) && styles.disabled]}>
          <Text style={styles.secondaryButtonText}>Join Room</Text>
        </Pressable>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  joinCard: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: '#111827',
  },
  joinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e2e8f0',
    backgroundColor: '#0b1220',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#bae6fd',
  },
  errorText: {
    fontSize: 12,
    color: '#fca5a5',
  },
  disabled: {
    opacity: 0.5,
  },
});
