import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedBarFill } from '@/components/Animated/AnimatedBarFill';

type TimedStatusCardProps = {
  label: string;
  endAt: string | null;
  durationSeconds?: number | null;
  statusText: string;
  statusStyle?: 'default' | 'journal';
  timePrefix?: string;
  showTime?: boolean;
  showFinishButton?: boolean;
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
  durationSeconds = null,
  statusText,
  statusStyle = 'default',
  timePrefix = 'Time remaining',
  showTime = true,
  showFinishButton = true,
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
  const totalMs = durationSeconds && durationSeconds > 0 ? durationSeconds * 1000 : null;

  const isComplete = remainingMs !== null && remainingMs <= 0;
  const timePercent =
    remainingMs === null || totalMs === null || totalMs <= 0
      ? null
      : Math.max(0, Math.min(1, remainingMs / totalMs));
  const timeLabel = remainingMs === null ? null : isComplete ? '0s' : formatRemaining(remainingMs);
  const isEmbedded = embedded;

  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? (
        <Text style={[styles.sectionTitle, isEmbedded && styles.sectionTitleEmbedded]}>
          {label}
        </Text>
      ) : null}
      <Text style={[styles.statusText, statusStyle === 'journal' && styles.statusTextJournal]}>
        {statusText}
      </Text>
      {showTime && timeLabel && timePercent !== null ? (
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, isEmbedded && styles.timeLabelEmbedded]}>
            {timePrefix}
          </Text>
          <View style={styles.timeBar}>
            <AnimatedBarFill
              percent={timePercent}
              style={styles.timeFill}
              decreaseDuration={850}
              increaseDuration={180}
            />
          </View>
          <Text style={[styles.timeValue, isEmbedded && styles.timeValueEmbedded]}>
            {timeLabel}
          </Text>
        </View>
      ) : null}
      {showFinishButton && allowEarly && remainingMs !== null && remainingMs > 0 ? (
        <Pressable
          onPress={onFinishEarly}
          style={[styles.finishButton, embedded && styles.finishButtonEmbedded]}
        >
          <Text style={[styles.finishButtonText, embedded && styles.finishButtonTextEmbedded]}>
            Skip timer
          </Text>
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
    fontFamily: 'Besley',
  },
  sectionTitleEmbedded: {
    color: '#47332a',
  },
  statusText: {
    fontSize: 12,
    color: '#d3c2a4',
    fontFamily: 'Besley',
  },
  statusTextJournal: {
    fontSize: 17,
    lineHeight: 28,
    color: '#413129',
    fontWeight: '500',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  timeBlock: {
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    color: '#e8d7bf',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  timeLabelEmbedded: {
    color: '#6b4a2a',
  },
  timeBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4a270f66',
    overflow: 'hidden',
  },
  timeFill: {
    height: '100%',
    backgroundColor: '#f08d2b',
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d3c2a4',
    fontFamily: 'Besley',
  },
  timeValueEmbedded: {
    color: '#6e5043',
  },
  finishButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a57a4a66',
  },
  finishButtonEmbedded: {
    borderColor: '#8b674866',
  },
  finishButtonText: {
    color: '#d6b48d',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Besley',
  },
  finishButtonTextEmbedded: {
    color: '#7b5d46',
  },
});
