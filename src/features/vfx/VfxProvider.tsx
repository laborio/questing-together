import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import EffectLayer from '@/features/vfx/player/EffectLayer';
import { createEffectInstance } from '@/features/vfx/runtime/createEffectInstance';
import type { EffectInstance, PlayEffect } from '@/features/vfx/types/runtime';

type VfxContextValue = {
  playEffect: PlayEffect;
};

const VfxContext = createContext<VfxContextValue | null>(null);

type VfxProviderProps = {
  children: ReactNode;
};

const VfxProvider = ({ children }: VfxProviderProps) => {
  const [instances, setInstances] = useState<EffectInstance[]>([]);

  const playEffect = useCallback<PlayEffect>((assetId, options) => {
    const instance = createEffectInstance(assetId, options);

    if (!instance) {
      console.warn(`[vfx] Unknown asset: ${assetId}`);
      return null;
    }

    setInstances((current) => [...current, instance]);
    return instance.instanceId;
  }, []);

  const handleComplete = useCallback((instanceId: string) => {
    setInstances((current) => current.filter((instance) => instance.instanceId !== instanceId));
  }, []);

  const contextValue = useMemo(
    () => ({
      playEffect,
    }),
    [playEffect],
  );

  return (
    <VfxContext.Provider value={contextValue}>
      {children}
      <EffectLayer instances={instances} onComplete={handleComplete} />
    </VfxContext.Provider>
  );
};

export function useVfx() {
  const context = useContext(VfxContext);

  if (!context) {
    throw new Error('useVfx must be used inside VfxProvider');
  }

  return context;
}

export default VfxProvider;
