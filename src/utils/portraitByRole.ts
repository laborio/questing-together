import type { ImageSourcePropType } from 'react-native';
import rangerPortrait from '@/assets/images/T_RangerPortrait.png';
import sagePortrait from '@/assets/images/T_SagePortrait.png';
import warriorPortrait from '@/assets/images/T_WarriorPortrait.png';

const portraitByRole = (role: string | null | undefined): ImageSourcePropType => {
  const normalized = (role ?? '').toLowerCase();
  if (normalized.includes('ranger')) return rangerPortrait;
  if (normalized.includes('sage')) return sagePortrait;
  return warriorPortrait;
};

export { portraitByRole };
