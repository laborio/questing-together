import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

function formatRemaining(ms: number): string {
  const d = dayjs.duration(Math.max(0, ms));
  if (d.asHours() >= 1) return d.format('H[h] m[m]');
  if (d.asMinutes() >= 1) return d.format('m[m] s[s]');
  return d.format('s[s]');
}

export { formatRemaining };
