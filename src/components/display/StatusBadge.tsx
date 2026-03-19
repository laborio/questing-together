import Typography from '@/components/display/Typography';
import Stack from '@/components/layout/Stack';

type StatusBadgeProps = {
  icon: string;
  title: string;
  titleColor: string;
};

const StatusBadge = ({ icon, title, titleColor }: StatusBadgeProps) => {
  return (
    <Stack gap={8} align="center">
      <Typography variant="body" style={{ fontSize: 20 }}>
        {icon}
      </Typography>
      <Typography
        variant="heading"
        style={{ color: titleColor, fontSize: 22, fontWeight: '800', textAlign: 'center' }}
      >
        {title}
      </Typography>
    </Stack>
  );
};

export default StatusBadge;
