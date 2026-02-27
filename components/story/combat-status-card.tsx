import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  showResolutionStatus?: boolean;
  embedded?: boolean;
};

export function CombatStatusCard({
  combatState,
  combatLog,
  resolvedOption,
  showResolutionStatus = true,
  embedded = false,
}: CombatStatusCardProps) {
  const partyPercent = Math.max(0, Math.min(1, combatState.partyHp / combatState.partyHpMax));
  const enemyPercent = Math.max(0, Math.min(1, combatState.enemyHp / combatState.enemyHpMax));
  const outcomeLabel = combatState.outcome ? combatState.outcome.toUpperCase() : null;
  const isEmbedded = embedded;

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={[styles.sectionTitle, isEmbedded && styles.sectionTitleEmbedded]}>Combat Status</Text> : null}

      <View style={styles.headerRow}>
        <Text style={[styles.roundText, isEmbedded && styles.roundTextEmbedded]}>Round {combatState.round}</Text>
        {outcomeLabel ? <Text style={[styles.outcomeText, isEmbedded && styles.outcomeTextEmbedded]}>{outcomeLabel}</Text> : null}
      </View>

      <View style={styles.healthBlock}>
        <Text style={[styles.healthLabel, isEmbedded && styles.healthLabelEmbedded]}>Party HP</Text>
        <View style={styles.healthBar}>
          <View style={[styles.healthFill, { width: `${partyPercent * 100}%` }]} />
        </View>
        <Text style={[styles.healthValue, isEmbedded && styles.healthValueEmbedded]}>
          {combatState.partyHp}/{combatState.partyHpMax}
        </Text>
      </View>

      <View style={styles.healthBlock}>
        <Text style={[styles.healthLabel, isEmbedded && styles.healthLabelEmbedded]}>{combatState.enemyName}</Text>
        <View style={styles.healthBar}>
          <View style={[styles.enemyFill, { width: `${enemyPercent * 100}%` }]} />
        </View>
        <Text style={[styles.healthValue, isEmbedded && styles.healthValueEmbedded]}>
          {combatState.enemyHp}/{combatState.enemyHpMax}
        </Text>
      </View>

      {combatLog.length > 0 ? (
        <View style={styles.logBlock}>
          {combatLog.slice(-4).map((entry) => (
            <Text key={entry.id} style={[styles.logText, isEmbedded && styles.logTextEmbedded]}>
              {entry.text}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[styles.logText, isEmbedded && styles.logTextEmbedded]}>No rounds resolved yet.</Text>
      )}

      {showResolutionStatus
        ? resolvedOption
          ? <Text style={[styles.waitingText, isEmbedded && styles.waitingTextEmbedded]}>Moving to the next scene...</Text>
          : combatState.outcome
            ? <Text style={[styles.waitingText, isEmbedded && styles.waitingTextEmbedded]}>Resolving combat outcome...</Text>
            : null
        : null}
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
    fontFamily: 'Besley',
  },
  sectionTitleEmbedded: {
    color: '#47332a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#422c05',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  roundTextEmbedded: {
    color: '#3f270c',
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ad18b',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  outcomeTextEmbedded: {
    color: '#5f7a45',
  },
  healthBlock: {
    gap: 6,
  },
  healthLabel: {
    fontSize: 12,
    color: '#e8d7bf',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  healthLabelEmbedded: {
    color: '#6b4a2a',
  },
  healthBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#371c0087',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#1ccf1669',
  },
  enemyFill: {
    height: '100%',
    backgroundColor: '#f4000057',
  },
  healthValue: {
    fontSize: 13,
    color: '#d3c2a4',
    fontFamily: 'Besley',
    fontWeight: '700',
  },
  healthValueEmbedded: {
    color: '#6e5043',
  },
  logBlock: {
    gap: 4,
  },
  logText: {
    fontSize: 12,
    color: '#d8c8b0',
    fontFamily: 'Besley',
  },
  logTextEmbedded: {
    color: '#5a4330',
  },
  waitingText: {
    fontSize: 12,
    color: '#d3c2a4',
    fontFamily: 'BesleyItalic',
  },
  waitingTextEmbedded: {
    color: '#6e5043',
  },
});
