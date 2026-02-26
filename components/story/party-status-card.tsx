import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PartyStatusTone = 'ready' | 'waiting' | 'neutral' | 'offline';

type PartyStatusRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: PartyStatusTone;
};

type PartyStatusCardProps = {
  title: string;
  rows: PartyStatusRow[];
  variant?: 'default' | 'parchment';
};

export function PartyStatusCard({ title, rows, variant = 'default' }: PartyStatusCardProps) {
  const isParchment = variant === 'parchment';

  return (
    <View style={[styles.card, isParchment && styles.cardParchment]}>
      <Text style={[styles.title, isParchment && styles.titleParchment]}>{title}</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <View>
            <Text style={[styles.name, isParchment && styles.nameParchment]}>{row.name}</Text>
            <Text style={[styles.role, isParchment && styles.roleParchment]}>{row.role}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              styles[isParchment ? `status${row.tone}Parchment` : `status${row.tone}`],
            ]}
          >
            <Text style={[styles.statusText, isParchment && styles.statusTextParchment]}>{row.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#3b1901',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  cardParchment: {
    backgroundColor: '#33160000',
    borderColor: '#c9a87a00',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5a3612',
  },
  titleParchment: {
    color: '#000000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#554011',
  },
  nameParchment: {
    color: '#f4ead7',
  },
  role: {
    fontSize: 11,
    color: '#d3c2a4',
  },
  roleParchment: {
    color: '#e9dcc6',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f3e8d0',
    textTransform: 'uppercase',
  },
  statusTextParchment: {
    color: '#3b2a1d',
  },
  statusready: {
    backgroundColor: '#2f3a26',
    borderColor: '#7fbf72',
  },
  statusreadyParchment: {
    backgroundColor: '#dfe9d0',
    borderColor: '#7fbf72',
  },
  statuswaiting: {
    backgroundColor: '#4a3824',
    borderColor: '#d6b25d',
  },
  statuswaitingParchment: {
    backgroundColor: '#efe3c9',
    borderColor: '#d6b25d',
  },
  statusneutral: {
    backgroundColor: '#2f2319',
    borderColor: '#7a5c3a',
  },
  statusneutralParchment: {
    backgroundColor: '#eadcc9',
    borderColor: '#b48a54',
  },
  statusoffline: {
    backgroundColor: '#4a2219',
    borderColor: '#b35b4a',
  },
  statusofflineParchment: {
    backgroundColor: '#f1d0c6',
    borderColor: '#b35b4a',
  },
});
