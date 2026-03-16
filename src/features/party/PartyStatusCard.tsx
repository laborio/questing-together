import { View } from 'react-native';
import Typography from '@/components/display/Typography';
import { colors } from '@/constants/colors';
import { type StatusTone, statusToneStyles } from '@/constants/statusTones';

type PartyStatusRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: StatusTone;
};

type PartyStatusCardProps = {
  title: string;
  rows: PartyStatusRow[];
  variant?: 'default' | 'parchment';
};

const PartyStatusCard = ({ title, rows, variant = 'default' }: PartyStatusCardProps) => {
  const isParchment = variant === 'parchment';

  return (
    <View
      style={{
        backgroundColor: isParchment ? colors.backgroundCardTransparent : colors.backgroundCard,
        borderRadius: 12,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: isParchment ? colors.borderCardTransparent : colors.borderCard,
      }}
    >
      <Typography
        variant="body"
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: isParchment ? colors.textBlack : colors.textDark,
        }}
      >
        {title}
      </Typography>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View>
            <Typography
              variant="body"
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: isParchment ? colors.textParchment : colors.textName,
              }}
            >
              {row.name}
            </Typography>
            <Typography
              variant="body"
              style={{
                fontSize: 11,
                color: isParchment ? colors.textRoleParchment : colors.textRole,
              }}
            >
              {row.role}
            </Typography>
          </View>
          <View
            style={[
              { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
              statusToneStyles[row.tone][isParchment ? 'parchment' : 'default'],
            ]}
          >
            <Typography
              variant="caption"
              style={{ color: isParchment ? colors.textParchmentDark : colors.textStatus }}
            >
              {row.status}
            </Typography>
          </View>
        </View>
      ))}
    </View>
  );
};

export default PartyStatusCard;
