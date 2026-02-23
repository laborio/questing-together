import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PartyHpCardProps = {
  partyHp: number;
  partyHpMax: number;
};

export function PartyHpCard({ partyHp, partyHpMax }: PartyHpCardProps) {
  const max = Math.max(1, partyHpMax);
  const percent = Math.max(0, Math.min(1, partyHp / max));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Party Health</Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${percent * 100}%` }]} />
      </View>
      <Text style={styles.value}>
        {partyHp}/{partyHpMax}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e8d7bf',
    textTransform: 'uppercase',
  },
  bar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2a1d14',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#9acd5a',
  },
  value: {
    fontSize: 11,
    color: '#d3c2a4',
  },
});
