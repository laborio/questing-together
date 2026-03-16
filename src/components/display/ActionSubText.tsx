import Typography from '@/components/display/Typography';
import { colors } from '@/constants/colors';

type ActionSubTextProps = {
  hpLabel: string | null;
  effectText?: string;
};

const ActionSubText = ({ hpLabel, effectText }: ActionSubTextProps) => {
  if (!hpLabel && !effectText) return null;
  return (
    <Typography
      variant="captionSm"
      style={{
        marginTop: 4,
        color: colors.textSubAction,
        textAlign: 'center',
        textTransform: 'uppercase',
        fontWeight: '700',
      }}
    >
      {hpLabel}
      {hpLabel && effectText ? ' · ' : ''}
      {effectText ?? ''}
    </Typography>
  );
};

export default ActionSubText;
