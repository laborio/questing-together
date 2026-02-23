import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionId } from '@/src/story/story';

type CombatRoundLog = {
  id: string;
  text: string;
};

type CombatState = {
  partyHp: number;
  partyHpMax: number;
  enemyHp: number;
  enemyHpMax: number;
  enemyName: string;
  round: number;
  outcome: 'victory' | 'defeat' | 'escape' | null;
  allowRun: boolean;
};

type CombatStatusCardProps = {
  combatState: CombatState;
  combatLog: CombatRoundLog[];
  resolvedOption: OptionId | null;
  localHasContinued: boolean;
  continuedCount: number;
  expectedPlayerCount: number;
  onContinueToNextScene: () => void;
  embedded?: boolean;
};

export function CombatStatusCard({
  combatState,
  combatLog,
  resolvedOption,
  localHasContinued,
  continuedCount,
  expectedPlayerCount,
  onContinueToNextScene,
  embedded = false,
}: CombatStatusCardProps) {
  const partyPercent = Math.max(0, Math.min(1, combatState.partyHp / combatState.partyHpMax));
  const enemyPercent = Math.max(0, Math.min(1, combatState.enemyHp / combatState.enemyHpMax));
  const outcomeLabel = combatState.outcome ? combatState.outcome.toUpperCase() : null;

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={styles.sectionTitle}>Combat Status</Text> : null}

      <View style={styles.headerRow}>
        <Text style={styles.roundText}>Round {combatState.round}</Text>
        {outcomeLabel ? <Text style={styles.outcomeText}>{outcomeLabel}</Text> : null}
      </View>

      <View style={styles.healthBlock}>
        <Text style={styles.healthLabel}>Party HP</Text>
        <View style={styles.healthBar}>
          <View style={[styles.healthFill, { width: `${partyPercent * 100}%` }]} />
        </View>
        <Text style={styles.healthValue}>
          {combatState.partyHp}/{combatState.partyHpMax}
        </Text>
      </View>

      <View style={styles.healthBlock}>
        <Text style={styles.healthLabel}>{combatState.enemyName}</Text>
        <View style={styles.healthBar}>
          <View style={[styles.enemyFill, { width: `${enemyPercent * 100}%` }]} />
        </View>
        <Text style={styles.healthValue}>
          {combatState.enemyHp}/{combatState.enemyHpMax}
        </Text>
      </View>

      {combatLog.length > 0 ? (
        <View style={styles.logBlock}>
          {combatLog.slice(-4).map((entry) => (
            <Text key={entry.id} style={styles.logText}>
              {entry.text}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.logText}>No rounds resolved yet.</Text>
      )}

      {resolvedOption ? (
        localHasContinued ? (
          <Text style={styles.waitingText}>
            Waiting for party to continue ({continuedCount}/{expectedPlayerCount}).
          </Text>
        ) : (
          <Pressable onPress={onContinueToNextScene} style={styles.continueButton}>
            <Text style={styles.continueButtonText}>Meet your party at the next scene</Text>
          </Pressable>
        )
      ) : combatState.outcome ? (
        <Text style={styles.waitingText}>Resolving combat outcome...</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  embeddedCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f3e8d0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0bf88',
    textTransform: 'uppercase',
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ad18b',
    textTransform: 'uppercase',
  },
  healthBlock: {
    gap: 6,
  },
  healthLabel: {
    fontSize: 12,
    color: '#e8d7bf',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  healthBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2a1d14',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#9acd5a',
  },
  enemyFill: {
    height: '100%',
    backgroundColor: '#d68b54',
  },
  healthValue: {
    fontSize: 11,
    color: '#d3c2a4',
  },
  logBlock: {
    gap: 4,
  },
  logText: {
    fontSize: 12,
    color: '#d8c8b0',
  },
  continueButton: {
    borderRadius: 10,
    backgroundColor: '#6b4428',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a57a4a',
  },
  continueButtonText: {
    color: '#f7f0df',
    fontSize: 13,
    fontWeight: '700',
  },
  waitingText: {
    fontSize: 12,
    color: '#d3c2a4',
  },
});
