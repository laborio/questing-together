import { useMemo } from 'react';
import { Pressable } from 'react-native';
import { AnimatedBarFill, Card, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useTick } from '@/hooks/useTick';
import { formatRemaining } from '@/utils/formatRemaining';

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

const TimedStatusCard = ({
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
}: TimedStatusCardProps) => {
  const now = useTick(1000);

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

  return (
    <Card gap={8} embedded={embedded} backgroundColor={colors.backgroundCombatCard}>
      {!embedded ? (
        <Typography variant="sectionTitle" style={{ color: colors.textStatus }}>
          {label}
        </Typography>
      ) : null}

      <Typography
        variant={statusStyle === 'journal' ? 'sectionTitle' : 'caption'}
        style={
          statusStyle === 'journal'
            ? { lineHeight: 28, color: colors.textDialogue, fontWeight: '500', textAlign: 'center' }
            : { color: colors.textRole }
        }
      >
        {statusText}
      </Typography>

      {showTime && timeLabel && timePercent !== null ? (
        <Stack gap={6}>
          <Typography
            variant="caption"
            style={{
              color: embedded ? colors.combatHealthLabelEmbedded : colors.combatHealthLabel,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            {timePrefix}
          </Typography>
          <Stack
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.timedBarBg,
              overflow: 'hidden',
            }}
          >
            <AnimatedBarFill
              percent={timePercent}
              style={{ height: '100%', backgroundColor: colors.timedBarFill }}
              decreaseDuration={850}
              increaseDuration={180}
            />
          </Stack>
          <Typography
            variant="bodySm"
            style={{
              fontWeight: '700',
              color: embedded ? colors.combatHealthValueEmbedded : colors.textRole,
            }}
          >
            {timeLabel}
          </Typography>
        </Stack>
      ) : null}

      {showFinishButton && allowEarly && remainingMs !== null && remainingMs > 0 ? (
        <Pressable
          onPress={onFinishEarly}
          style={{
            alignSelf: 'flex-end',
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: embedded ? colors.timedFinishBorderEmbedded : colors.timedFinishBorder,
          }}
        >
          <Typography
            variant="captionSm"
            style={{
              fontWeight: '600',
              color: embedded ? colors.timedFinishTextEmbedded : colors.timedFinishText,
            }}
          >
            Skip timer
          </Typography>
        </Pressable>
      ) : null}
    </Card>
  );
};

export default TimedStatusCard;
