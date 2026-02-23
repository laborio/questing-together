import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TimedStatusCardProps = {
  label: string;
  endAt: string | null;
  statusText: string;
  allowEarly: boolean;
  onFinishEarly: () => void;
  embedded?: boolean;
};

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function TimedStatusCard({
  label,
  endAt,
  statusText,
  allowEarly,
  onFinishEarly,
  embedded = false,
}: TimedStatusCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = useMemo(() => {
    if (!endAt) return null;
    const endMs = Date.parse(endAt);
    if (!Number.isFinite(endMs)) return null;
    return endMs - now;
  }, [endAt, now]);

  const isComplete = remainingMs !== null && remainingMs <= 0;
  const timeLabel =
    remainingMs === null
      ? 'Waiting for the rest timer to begin.'
      : isComplete
        ? 'Rest period complete.'
        : `Time remaining: ${formatRemaining(remainingMs)}`;

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={styles.sectionTitle}>{label}</Text> : null}
      <Text style={styles.statusText}>{statusText}</Text>
      <Text style={styles.timeText}>{timeLabel}</Text>
      {allowEarly && remainingMs !== null && remainingMs > 0 ? (
        <Pressable onPress={onFinishEarly} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>End rest early (testing)</Text>
        </Pressable>
      ) : null}
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
  statusText: {
    fontSize: 12,
    color: '#d3c2a4',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e0bf88',
    textTransform: 'uppercase',
  },
  finishButton: {
    borderRadius: 10,
    backgroundColor: '#6b4428',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a57a4a',
  },
  finishButtonText: {
    color: '#f7f0df',
    fontSize: 12,
    fontWeight: '700',
  },
});
