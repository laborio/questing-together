import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { players } from '@/src/game/constants';
import { PlayerId } from '@/src/game/types';

type PlayerIdentityCardProps = {
  selectedPlayerId: PlayerId | null;
  onSelectPlayer: (playerId: PlayerId) => void;
};

export function PlayerIdentityCard({ selectedPlayerId, onSelectPlayer }: PlayerIdentityCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Choose Your Slot</Text>
      <Text style={styles.subtitle}>Pick which player slot this device controls. You can name yourself next.</Text>

      <View style={styles.playerList}>
        {players.map((player) => {
          const isSelected = selectedPlayerId === player.id;
          return (
            <Pressable
              key={player.id}
              onPress={() => onSelectPlayer(player.id)}
              style={[styles.playerButton, isSelected && styles.playerButtonSelected]}>
              <Text style={[styles.playerButtonText, isSelected && styles.playerButtonTextSelected]}>
                {player.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    gap: 8,
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
  },
  playerList: {
    gap: 8,
  },
  playerButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  playerButtonSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c4a6e',
  },
  playerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  playerButtonTextSelected: {
    color: '#e0f2fe',
  },
});
