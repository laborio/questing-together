import { combatAbilityVfxConfig } from '@/features/combat/config/combatAbilityVfxConfig';
import type { PlayEffect } from '@/features/vfx';
import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import { playEffectSequence } from '@/features/vfx/runtime/playEffectSequence';
import type { RoleId } from '@/types/player';

type VfxPoint = {
  x: number;
  y: number;
};

type CombatVfxViewport = {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
};

type CombatAbilityVfxParams = {
  role: RoleId | null;
  playEffect: PlayEffect;
  viewport: CombatVfxViewport;
  origin?: VfxPoint;
  target?: VfxPoint;
  onTimeout: (callback: () => void, delayMs: number) => void;
};

function getFallbackOrigin(viewport: CombatVfxViewport): VfxPoint {
  return {
    x: viewport.width * 0.5,
    y: viewport.height - viewport.insetBottom - 300,
  };
}

function getFallbackTarget(viewport: CombatVfxViewport): VfxPoint {
  return {
    x: viewport.width * 0.5,
    y: viewport.insetTop + 245,
  };
}

export function playCombatAbilityVfx({
  role,
  playEffect,
  viewport,
  origin,
  target,
  onTimeout,
}: CombatAbilityVfxParams) {
  if (!role) {
    return;
  }

  const config = combatAbilityVfxConfig[role];
  if (!config) {
    return;
  }

  const resolvedOrigin = origin ?? getFallbackOrigin(viewport);
  const resolvedTarget = target ?? getFallbackTarget(viewport);

  if (config.kind === 'impact') {
    playEffect(config.impactAssetId, {
      x: resolvedTarget.x,
      y: resolvedTarget.y,
    });
    return;
  }

  if (config.kind === 'sequence') {
    playEffectSequence({
      sequenceId: config.sequenceId,
      caster: resolvedOrigin,
      target: resolvedTarget,
      playEffect,
      onTimeout,
    });
    return;
  }

  const travelDurationMs = getEffectAsset(config.travelAssetId)?.durationMs ?? 420;

  playEffect(config.travelAssetId, {
    x: resolvedOrigin.x,
    y: resolvedOrigin.y,
    targetX: resolvedTarget.x,
    targetY: resolvedTarget.y,
  });

  onTimeout(() => {
    playEffect(config.impactAssetId, {
      x: resolvedTarget.x,
      y: resolvedTarget.y,
    });
  }, travelDurationMs);
}
