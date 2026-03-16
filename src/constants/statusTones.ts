import type { ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

type StatusTone = 'ready' | 'waiting' | 'neutral' | 'offline';

const statusToneStyles: Record<StatusTone, { default: ViewStyle; parchment: ViewStyle }> = {
  ready: {
    default: { backgroundColor: colors.statusReady, borderColor: colors.statusReadyBorder },
    parchment: {
      backgroundColor: colors.statusReadyParchment,
      borderColor: colors.statusReadyBorder,
    },
  },
  waiting: {
    default: { backgroundColor: colors.statusWaiting, borderColor: colors.statusWaitingBorder },
    parchment: {
      backgroundColor: colors.statusWaitingParchment,
      borderColor: colors.statusWaitingBorder,
    },
  },
  neutral: {
    default: { backgroundColor: colors.statusNeutral, borderColor: colors.statusNeutralBorder },
    parchment: {
      backgroundColor: colors.statusNeutralParchment,
      borderColor: colors.statusNeutralParchmentBorder,
    },
  },
  offline: {
    default: { backgroundColor: colors.statusOffline, borderColor: colors.statusOfflineBorder },
    parchment: {
      backgroundColor: colors.statusOfflineParchment,
      borderColor: colors.statusOfflineBorder,
    },
  },
};

export type { StatusTone };
export { statusToneStyles };
