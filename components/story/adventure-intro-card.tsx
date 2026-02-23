import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AdventureIntroCardProps = {
  onContinue: () => void;
};

export function AdventureIntroCard({ onContinue }: AdventureIntroCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Before You Enter</Text>
      <Text style={styles.body}>
        The castle keeps its gates shut at dusk. Ledgers are missing, the reliquary is sealed, and every courtier whispers
        a different version of the truth. Your party has one night to find the thread that holds the story together.
      </Text>

      <View style={styles.tipBlock}>
        <Text style={styles.tipTitle}>How to play</Text>
        <Text style={styles.tipLine}>• When a scene opens, each player chooses one action.</Text>
        <Text style={styles.tipLine}>• Actions reveal evidence and may unlock hidden decisions.</Text>
        <Text style={styles.tipLine}>• Vote on the decision once all actions are done.</Text>
        <Text style={styles.tipLine}>• Party HP is shared. Choose wisely.</Text>
      </View>

      <Pressable onPress={onContinue} style={styles.continueButton}>
        <Text style={styles.continueButtonText}>Enter the Adventure</Text>
      </Pressable>
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
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: '#cbd5e1',
  },
  tipBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    gap: 4,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    textTransform: 'uppercase',
  },
  tipLine: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  continueButton: {
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
