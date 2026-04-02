import type { SkImage } from '@shopify/react-native-skia';
import EffectPlayerSkia, { canUseSkiaRenderer } from '@/features/vfx/player/EffectPlayerSkia';
import EffectPlayerSvg from '@/features/vfx/player/EffectPlayerSvg';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type EffectPlayerProps = {
  instance: EffectInstance;
  onComplete: (instanceId: string) => void;
  spriteImageCache?: Partial<Record<string, SkImage>>;
  active?: boolean;
};

const EffectPlayer = ({
  instance,
  onComplete,
  spriteImageCache,
  active = true,
}: EffectPlayerProps) =>
  canUseSkiaRenderer ? (
    <EffectPlayerSkia
      instance={instance}
      onComplete={onComplete}
      spriteImageCache={spriteImageCache}
      active={active}
    />
  ) : (
    <EffectPlayerSvg instance={instance} onComplete={onComplete} active={active} />
  );

export default EffectPlayer;
