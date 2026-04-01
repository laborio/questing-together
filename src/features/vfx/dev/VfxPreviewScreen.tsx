import { type SkImage, useImage } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import skeletor from '@/assets/images/skeletor.png';
import {
  Button,
  Card,
  ContentContainer,
  Portrait,
  ScreenContainer,
  Select,
  Stack,
  TextField,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
import FloatingDamage from '@/features/combat/components/FloatingDamage';
import EffectPlayer from '@/features/vfx/player/EffectPlayer';
import { createEffectInstance } from '@/features/vfx/runtime/createEffectInstance';
import { getEffectAsset, listEffectAssets } from '@/features/vfx/runtime/effectRegistry';
import { playEffectSequence } from '@/features/vfx/runtime/playEffectSequence';
import {
  collectEffectSpriteIds,
  preloadEffectSprites,
} from '@/features/vfx/runtime/preloadEffectSprites';
import { listEffectSequences } from '@/features/vfx/runtime/sequenceRegistry';
import { getVfxSpriteSource } from '@/features/vfx/runtime/spriteRegistry';
import type { EffectAsset } from '@/features/vfx/types/assets';
import type { EffectInstance } from '@/features/vfx/types/runtime';
import type { EffectSequence } from '@/features/vfx/types/sequences';
import { portraitByRole } from '@/utils/portraitByRole';

type AnchorKey = 'caster' | 'target';
type Point = { x: number; y: number };
type PreviewMode = 'sequence' | 'effect';
type PreviewInstanceSlot = { slotId: number; active: boolean; instance: EffectInstance };
type PreviewCombatFloat = {
  id: number;
  anchor: AnchorKey;
  text: string;
  color: string;
};

const INSTANCE_OFFSET_STEP = 18;
const PORTRAIT_SIZE = 74;

type VfxPreviewScreenProps = {
  sequenceId?: string;
  travelAssetId?: string;
  impactAssetId?: string;
  effectId?: string;
  title?: string;
  description?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveCueDurationMs(cue: EffectSequence['cues'][number], asset: EffectAsset | null) {
  return cue.durationMs ?? asset?.durationMs ?? 0;
}

function parseInstanceCount(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return clamp(parsed, 1, 32);
}

function getSequenceWarmupSlotCounts(sequence: EffectSequence | null, multiplier = 1) {
  const slotCounts = new Map<string, number>();

  if (!sequence) {
    return slotCounts;
  }

  const eventsByAsset = new Map<string, { atMs: number; delta: number }[]>();

  for (const cue of sequence.cues) {
    const asset = getEffectAsset(cue.assetId);
    const durationMs = Math.max(0, resolveCueDurationMs(cue, asset));
    const events = eventsByAsset.get(cue.assetId) ?? [];
    events.push({ atMs: cue.atMs, delta: 1 });
    events.push({ atMs: cue.atMs + durationMs, delta: -1 });
    eventsByAsset.set(cue.assetId, events);
  }

  for (const [assetId, events] of eventsByAsset.entries()) {
    let activeCount = 0;
    let maxActiveCount = 0;

    events
      .sort((left, right) => left.atMs - right.atMs || left.delta - right.delta)
      .forEach((event) => {
        activeCount += event.delta;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
      });

    if (maxActiveCount > 0) {
      slotCounts.set(assetId, maxActiveCount * multiplier);
    }
  }

  return slotCounts;
}

function createWarmupInstance(assetId: string, slotId: number): EffectInstance {
  return {
    assetId,
    instanceId: `warmup-${assetId}-${slotId}`,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    loopOverride: false,
  };
}

function resolveSkiaSpriteSource(spriteId: string) {
  const source = getVfxSpriteSource(spriteId);

  if (!source) {
    return null;
  }

  if (typeof source === 'number' || typeof source === 'string') {
    return source;
  }

  if (Array.isArray(source)) {
    const first = source[0];
    if (!first) return null;
    return typeof first === 'number' ? first : (first.uri ?? null);
  }

  return null;
}

function getInstanceOffset(index: number, totalCount: number): Point {
  if (totalCount <= 1) {
    return { x: 0, y: 0 };
  }

  const columns = Math.ceil(Math.sqrt(totalCount));
  const rows = Math.ceil(totalCount / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: (column - (columns - 1) / 2) * INSTANCE_OFFSET_STEP,
    y: (row - (rows - 1) / 2) * INSTANCE_OFFSET_STEP,
  };
}

type SpriteWarmupImageProps = {
  spriteId: string;
  onResolved: (spriteId: string, image: SkImage | null) => void;
};

const SpriteWarmupImage = ({ spriteId, onResolved }: SpriteWarmupImageProps) => {
  const source = useMemo(() => resolveSkiaSpriteSource(spriteId), [spriteId]);
  const image = useImage(source);

  useEffect(() => {
    onResolved(spriteId, image);
  }, [image, onResolved, spriteId]);

  return null;
};

const VfxPreviewScreen = ({
  sequenceId,
  travelAssetId,
  impactAssetId,
  effectId,
  title = 'VFX Playground',
  description = 'Drag the caster and target anchors, then preview either a full sequence or a single effect directly in the stage.',
}: VfxPreviewScreenProps) => {
  const router = useRouter();
  const stageRef = useRef<View>(null);
  const activationFrameIdsRef = useRef<number[]>([]);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const slotIdRef = useRef(0);
  const instanceSlotsRef = useRef<PreviewInstanceSlot[]>([]);
  const stageBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const effectOptions = useMemo(
    () =>
      listEffectAssets().map((asset) => ({
        value: asset.id,
        label: `${asset.label} (${asset.id})`,
      })),
    [],
  );
  const sequenceOptions = useMemo(
    () =>
      listEffectSequences().map((sequence) => ({
        value: sequence.id,
        label: `${sequence.label} (${sequence.id})`,
      })),
    [],
  );
  const defaultEffectId =
    effectId ?? travelAssetId ?? impactAssetId ?? effectOptions[0]?.value ?? '';
  const defaultSequenceId = sequenceId ?? sequenceOptions[0]?.value ?? '';
  const [previewMode, setPreviewMode] = useState<PreviewMode>(
    defaultSequenceId ? 'sequence' : 'effect',
  );
  const [selectedEffectId, setSelectedEffectId] = useState(defaultEffectId);
  const [selectedSequenceId, setSelectedSequenceId] = useState(defaultSequenceId);
  const [instanceCount, setInstanceCount] = useState('1');
  const [fps, setFps] = useState(0);
  const [spriteImageCache, setSpriteImageCache] = useState<Partial<Record<string, SkImage>>>({});
  const [selectionReady, setSelectionReady] = useState(true);
  const [instanceSlots, setInstanceSlots] = useState<PreviewInstanceSlot[]>([]);
  const [stageReady, setStageReady] = useState(false);
  const [combatFloats, setCombatFloats] = useState<PreviewCombatFloat[]>([]);
  const [anchors, setAnchors] = useState<{ caster: Point; target: Point }>({
    caster: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
  });

  const clearTimers = useCallback(() => {
    if (timeoutIdsRef.current.length === 0) {
      return;
    }

    for (const timeoutId of timeoutIdsRef.current) {
      clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];
  }, []);

  const clearActivationFrames = useCallback(() => {
    if (activationFrameIdsRef.current.length === 0) {
      return;
    }

    for (const frameId of activationFrameIdsRef.current) {
      cancelAnimationFrame(frameId);
    }
    activationFrameIdsRef.current = [];
  }, []);

  const resetPreviewPlayback = useCallback(() => {
    clearActivationFrames();
    clearTimers();
    setCombatFloats([]);
    setInstanceSlots((current) =>
      current.some((slot) => slot.active)
        ? current.map((slot) => (slot.active ? { ...slot, active: false } : slot))
        : current,
    );
  }, [clearActivationFrames, clearTimers]);

  const resetPreviewPlaybackIfActive = useCallback(() => {
    if (
      timeoutIdsRef.current.length === 0 &&
      !instanceSlotsRef.current.some((slot) => slot.active)
    ) {
      return;
    }

    resetPreviewPlayback();
  }, [resetPreviewPlayback]);

  useEffect(
    () => () => {
      clearActivationFrames();
      clearTimers();
    },
    [clearActivationFrames, clearTimers],
  );

  useEffect(() => {
    let frameId = 0;
    let sampleStartedAt = performance.now();
    let frameCount = 0;

    const sampleFps = (now: number) => {
      frameCount += 1;

      const elapsedMs = now - sampleStartedAt;
      if (elapsedMs >= 400) {
        const nextFps = Math.round((frameCount * 1000) / elapsedMs);
        setFps((current) => (current === nextFps ? current : nextFps));
        sampleStartedAt = now;
        frameCount = 0;
      }

      frameId = requestAnimationFrame(sampleFps);
    };

    frameId = requestAnimationFrame((now) => {
      sampleStartedAt = now;
      frameId = requestAnimationFrame(sampleFps);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    instanceSlotsRef.current = instanceSlots;
  }, [instanceSlots]);

  const refreshStageBounds = useCallback((onMeasured?: () => void) => {
    stageRef.current?.measureInWindow((x, y, width, height) => {
      stageBoundsRef.current = { x, y, width, height };
      onMeasured?.();
    });
  }, []);

  const updateAnchorFromPage = useCallback((anchor: AnchorKey, pageX: number, pageY: number) => {
    const bounds = stageBoundsRef.current;
    if (!bounds.width || !bounds.height) return;

    setAnchors((current) => ({
      ...current,
      [anchor]: {
        x: clamp(pageX - bounds.x, 0, bounds.width),
        y: clamp(pageY - bounds.y, 0, bounds.height),
      },
    }));
  }, []);

  const handleStageLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setStageReady(true);
      setAnchors((current) => {
        const shouldReset =
          (!current.caster.x && !current.caster.y && !current.target.x && !current.target.y) ||
          !stageBoundsRef.current.width;

        if (!shouldReset) {
          const previous = stageBoundsRef.current;
          return {
            caster: {
              x: previous.width ? (current.caster.x / previous.width) * width : current.caster.x,
              y: previous.height ? (current.caster.y / previous.height) * height : current.caster.y,
            },
            target: {
              x: previous.width ? (current.target.x / previous.width) * width : current.target.x,
              y: previous.height ? (current.target.y / previous.height) * height : current.target.y,
            },
          };
        }

        return {
          caster: { x: width * 0.18, y: height * 0.72 },
          target: { x: width * 0.78, y: height * 0.34 },
        };
      });

      requestAnimationFrame(() => {
        refreshStageBounds();
      });
    },
    [refreshStageBounds],
  );

  const playLocalEffect = useCallback(
    (assetId: string, options: Omit<EffectInstance, 'assetId' | 'instanceId'>) => {
      const instance = createEffectInstance(assetId, options);
      if (!instance) {
        return null;
      }

      setInstanceSlots((current) => {
        const reusableSlotIndex = current.findIndex(
          (slot) => !slot.active && slot.instance.assetId === assetId,
        );

        if (reusableSlotIndex >= 0) {
          const reusableSlot = current[reusableSlotIndex];
          const nextSlots = current.map((slot, index) =>
            index === reusableSlotIndex ? { ...slot, instance, active: false } : slot,
          );
          const frameId = requestAnimationFrame(() => {
            activationFrameIdsRef.current = activationFrameIdsRef.current.filter(
              (candidate) => candidate !== frameId,
            );
            setInstanceSlots((slots) =>
              slots.map((slot) =>
                slot.slotId === reusableSlot.slotId &&
                slot.instance.instanceId === instance.instanceId
                  ? { ...slot, active: true }
                  : slot,
              ),
            );
          });
          activationFrameIdsRef.current.push(frameId);
          return nextSlots;
        }

        return [...current, { slotId: slotIdRef.current++, active: true, instance }];
      });
      return instance.instanceId;
    },
    [],
  );

  const handleComplete = useCallback((instanceId: string) => {
    setInstanceSlots((current) =>
      current.map((slot) =>
        slot.instance.instanceId === instanceId ? { ...slot, active: false } : slot,
      ),
    );
  }, []);

  const queueLocalTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((candidate) => candidate !== timeoutId);
      callback();
    }, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const spawnCombatFloat = useCallback(
    (anchor: AnchorKey, text: string, color: string, delayMs = 0) => {
      queueLocalTimeout(() => {
        const id = Date.now() + Math.round(Math.random() * 10000);
        setCombatFloats((current) => [...current, { id, anchor, text, color }]);
        queueLocalTimeout(() => {
          setCombatFloats((current) => current.filter((entry) => entry.id !== id));
        }, 850);
      }, delayMs);
    },
    [queueLocalTimeout],
  );

  const triggerPreviewCombatFeedback = useCallback(
    (impactDelayMs: number) => {
      spawnCombatFloat('caster', 'CAST', colors.intentConfirmedBorder, 0);
      spawnCombatFloat('target', '-18', colors.combatDamage, impactDelayMs);
    },
    [spawnCombatFloat],
  );

  const selectedEffect = useMemo(
    () => (selectedEffectId ? getEffectAsset(selectedEffectId) : null),
    [selectedEffectId],
  );
  const selectedSequence = useMemo(
    () => listEffectSequences().find((sequence) => sequence.id === selectedSequenceId) ?? null,
    [selectedSequenceId],
  );

  const handlePlaySequence = useCallback(() => {
    if (!selectedSequenceId) {
      return;
    }

    const totalInstances = parseInstanceCount(instanceCount);
    resetPreviewPlayback();
    const impactDelayMs = selectedSequence
      ? selectedSequence.cues.reduce((maxDelay, cue) => {
          if (cue.anchor === 'target' || cue.anchor === 'projectile') {
            return Math.max(maxDelay, cue.atMs);
          }
          return maxDelay;
        }, 120)
      : 120;
    triggerPreviewCombatFeedback(impactDelayMs);
    for (let index = 0; index < totalInstances; index += 1) {
      const offset = getInstanceOffset(index, totalInstances);
      playEffectSequence({
        sequenceId: selectedSequenceId,
        caster: {
          x: anchors.caster.x + offset.x,
          y: anchors.caster.y + offset.y,
        },
        target: {
          x: anchors.target.x + offset.x,
          y: anchors.target.y + offset.y,
        },
        playEffect: playLocalEffect,
        onTimeout: queueLocalTimeout,
      });
    }
  }, [
    anchors.caster,
    anchors.target,
    instanceCount,
    playLocalEffect,
    queueLocalTimeout,
    resetPreviewPlayback,
    selectedSequence,
    selectedSequenceId,
    triggerPreviewCombatFeedback,
  ]);

  const handlePlayEffect = useCallback(() => {
    if (!selectedEffectId) {
      return;
    }

    const totalInstances = parseInstanceCount(instanceCount);
    resetPreviewPlayback();
    triggerPreviewCombatFeedback(
      selectedEffect ? Math.min(240, Math.round(selectedEffect.durationMs * 0.45)) : 120,
    );
    for (let index = 0; index < totalInstances; index += 1) {
      const offset = getInstanceOffset(index, totalInstances);
      playLocalEffect(selectedEffectId, {
        x: anchors.caster.x + offset.x,
        y: anchors.caster.y + offset.y,
        targetX: anchors.target.x + offset.x,
        targetY: anchors.target.y + offset.y,
        loopOverride: false,
      });
    }
  }, [
    anchors.caster.x,
    anchors.caster.y,
    anchors.target.x,
    anchors.target.y,
    instanceCount,
    playLocalEffect,
    resetPreviewPlayback,
    selectedEffectId,
    selectedEffect,
    triggerPreviewCombatFeedback,
  ]);

  const casterPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          resetPreviewPlaybackIfActive();
          refreshStageBounds(() => {
            updateAnchorFromPage('caster', event.nativeEvent.pageX, event.nativeEvent.pageY);
          });
        },
        onPanResponderMove: (event) => {
          updateAnchorFromPage('caster', event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
      }),
    [refreshStageBounds, resetPreviewPlaybackIfActive, updateAnchorFromPage],
  );

  const targetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          resetPreviewPlaybackIfActive();
          refreshStageBounds(() => {
            updateAnchorFromPage('target', event.nativeEvent.pageX, event.nativeEvent.pageY);
          });
        },
        onPanResponderMove: (event) => {
          updateAnchorFromPage('target', event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
      }),
    [refreshStageBounds, resetPreviewPlaybackIfActive, updateAnchorFromPage],
  );

  const warmupSlotCounts = useMemo(() => {
    const totalInstances = parseInstanceCount(instanceCount);

    if (previewMode === 'sequence') {
      return getSequenceWarmupSlotCounts(selectedSequence, totalInstances);
    }

    if (selectedEffect) {
      return new Map([[selectedEffect.id, totalInstances]]);
    }

    return new Map<string, number>();
  }, [instanceCount, previewMode, selectedEffect, selectedSequence]);
  const selectedSpriteIds = useMemo(() => {
    const assets =
      previewMode === 'sequence'
        ? (selectedSequence?.cues
            .map((cue) => getEffectAsset(cue.assetId))
            .filter((asset) => asset != null) ?? [])
        : selectedEffect
          ? [selectedEffect]
          : [];

    return [...new Set(assets.flatMap((asset) => collectEffectSpriteIds(asset)))];
  }, [previewMode, selectedEffect, selectedSequence]);
  const canPlaySequence =
    previewMode === 'sequence' && Boolean(selectedSequenceId) && selectionReady;
  const canPlayEffect = previewMode === 'effect' && Boolean(selectedEffectId) && selectionReady;

  useEffect(() => {
    let cancelled = false;
    if (selectedSpriteIds.length === 0) {
      setSelectionReady(true);
      return;
    }

    setSelectionReady(false);
    const unresolvedSpriteIds = selectedSpriteIds.filter((spriteId) => !spriteImageCache[spriteId]);
    if (unresolvedSpriteIds.length === 0) {
      setSelectionReady(true);
      return;
    }

    const assetsToWarm =
      previewMode === 'sequence'
        ? (selectedSequence?.cues
            .map((cue) => getEffectAsset(cue.assetId))
            .filter((asset) => asset != null) ?? [])
        : selectedEffect
          ? [selectedEffect]
          : [];

    void preloadEffectSprites(assetsToWarm).then(() => {
      if (!cancelled) {
        const stillUnresolved = unresolvedSpriteIds.some((spriteId) => !spriteImageCache[spriteId]);
        if (!stillUnresolved) {
          setSelectionReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewMode, selectedEffect, selectedSequence, selectedSpriteIds, spriteImageCache]);

  useEffect(() => {
    if (selectedSpriteIds.length === 0) {
      setSelectionReady(true);
      return;
    }

    setSelectionReady(selectedSpriteIds.every((spriteId) => Boolean(spriteImageCache[spriteId])));
  }, [selectedSpriteIds, spriteImageCache]);

  useEffect(() => {
    if (warmupSlotCounts.size === 0) {
      return;
    }

    setInstanceSlots((current) => {
      let nextSlots = current;

      for (const [assetId, requiredCount] of warmupSlotCounts.entries()) {
        const currentCount = nextSlots.filter((slot) => slot.instance.assetId === assetId).length;

        if (currentCount >= requiredCount) {
          continue;
        }

        if (nextSlots === current) {
          nextSlots = [...current];
        }

        for (let index = currentCount; index < requiredCount; index += 1) {
          const slotId = slotIdRef.current++;
          nextSlots.push({
            slotId,
            active: false,
            instance: createWarmupInstance(assetId, slotId),
          });
        }
      }

      return nextSlots;
    });
  }, [warmupSlotCounts]);

  const handleSpriteResolved = useCallback((spriteId: string, image: SkImage | null) => {
    if (!image) {
      return;
    }

    setSpriteImageCache((current) => {
      if (current[spriteId] === image) {
        return current;
      }

      return {
        ...current,
        [spriteId]: image,
      };
    });
  }, []);

  return (
    <ScreenContainer>
      <ContentContainer style={{ justifyContent: 'center', maxWidth: 520, flex: 1 }}>
        <Stack gap={16} style={{ width: '100%' }}>
          <Stack gap={6}>
            <Typography variant="h3">{title}</Typography>
            <Typography style={{ textAlign: 'left' }}>{description}</Typography>
          </Stack>

          <Card backgroundColor={colors.backgroundOverlayPanel} borderColor={colors.borderOverlay}>
            <Stack gap={12}>
              <Stack gap={6}>
                <Typography variant="body" style={{ color: colors.textSecondary }}>
                  Preview Mode
                </Typography>
                <Select
                  value={previewMode}
                  options={[
                    { value: 'sequence', label: 'Sequence' },
                    { value: 'effect', label: 'Single Effect' },
                  ]}
                  onSelect={(value) => setPreviewMode(value)}
                />
              </Stack>

              {previewMode === 'sequence' ? (
                <Stack gap={6}>
                  <Typography variant="body" style={{ color: colors.textSecondary }}>
                    Sequence
                  </Typography>
                  <Select
                    value={selectedSequenceId}
                    options={sequenceOptions}
                    disabled={sequenceOptions.length === 0}
                    onSelect={setSelectedSequenceId}
                  />
                  {selectedSequence ? (
                    <Typography variant="caption" style={{ color: colors.textSecondary }}>
                      {selectedSequence.cues.length} cue
                      {selectedSequence.cues.length === 1 ? '' : 's'}
                    </Typography>
                  ) : null}
                </Stack>
              ) : (
                <Stack gap={6}>
                  <Typography variant="body" style={{ color: colors.textSecondary }}>
                    Effect
                  </Typography>
                  <Select
                    value={selectedEffectId}
                    options={effectOptions}
                    disabled={effectOptions.length === 0}
                    onSelect={setSelectedEffectId}
                  />
                  {selectedEffect ? (
                    <Typography variant="caption" style={{ color: colors.textSecondary }}>
                      Duration: {selectedEffect.durationMs} ms
                    </Typography>
                  ) : null}
                </Stack>
              )}

              <Stack gap={6}>
                <TextField
                  label="Instance Count"
                  value={instanceCount}
                  keyboardType="number-pad"
                  helperText="Custom value, clamped between 1 and 32."
                  onChangeText={(value) => setInstanceCount(value.replace(/[^0-9]/g, ''))}
                  onBlur={() => setInstanceCount(String(parseInstanceCount(instanceCount)))}
                />
              </Stack>
            </Stack>
          </Card>

          <Card backgroundColor={colors.backgroundOverlayPanel} borderColor={colors.borderOverlay}>
            <Stack gap={12}>
              <View ref={stageRef} onLayout={handleStageLayout} style={styles.stage}>
                <View pointerEvents="none" style={styles.stageBackdrop} />

                <View pointerEvents="none" style={styles.stagePortraits}>
                  <View
                    style={[
                      styles.portraitPlate,
                      styles.casterPlate,
                      {
                        left: anchors.caster.x - PORTRAIT_SIZE / 2,
                        top: anchors.caster.y - PORTRAIT_SIZE / 2,
                      },
                    ]}
                  >
                    <Portrait
                      source={portraitByRole('sage')}
                      size={PORTRAIT_SIZE}
                      highlighted
                      highlightColor={colors.intentConfirmedBorder}
                      hideName
                    />
                    {combatFloats
                      .filter((entry) => entry.anchor === 'caster')
                      .map((entry) => (
                        <FloatingDamage key={entry.id} text={entry.text} color={entry.color} />
                      ))}
                  </View>

                  <View
                    style={[
                      styles.portraitPlate,
                      styles.targetPlate,
                      {
                        left: anchors.target.x - PORTRAIT_SIZE / 2,
                        top: anchors.target.y - PORTRAIT_SIZE / 2,
                      },
                    ]}
                  >
                    <Portrait
                      source={skeletor}
                      size={PORTRAIT_SIZE}
                      highlighted
                      highlightColor={colors.combatDamage}
                      hideName
                    />
                    {combatFloats
                      .filter((entry) => entry.anchor === 'target')
                      .map((entry) => (
                        <FloatingDamage key={entry.id} text={entry.text} color={entry.color} />
                      ))}
                  </View>
                </View>

                {stageReady ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.motionGuide,
                      {
                        left:
                          (anchors.caster.x + anchors.target.x) / 2 -
                          Math.hypot(
                            anchors.target.x - anchors.caster.x,
                            anchors.target.y - anchors.caster.y,
                          ) /
                            2,
                        top: (anchors.caster.y + anchors.target.y) / 2,
                        width: Math.hypot(
                          anchors.target.x - anchors.caster.x,
                          anchors.target.y - anchors.caster.y,
                        ),
                        transform: [
                          {
                            rotate: `${Math.atan2(
                              anchors.target.y - anchors.caster.y,
                              anchors.target.x - anchors.caster.x,
                            )}rad`,
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}

                <View pointerEvents="none" style={styles.stageEffects}>
                  {instanceSlots.map((slot) => (
                    <EffectPlayer
                      key={slot.slotId}
                      instance={slot.instance}
                      onComplete={handleComplete}
                      spriteImageCache={spriteImageCache}
                      active={slot.active}
                    />
                  ))}
                </View>

                <View pointerEvents="none" style={styles.fpsPill}>
                  <Typography variant="caption" style={styles.fpsText}>
                    {fps} FPS
                  </Typography>
                </View>

                {stageReady ? (
                  <>
                    <View
                      style={[
                        styles.anchorShell,
                        {
                          left: anchors.caster.x - 52,
                          top: anchors.caster.y - 52,
                        },
                      ]}
                      {...casterPanResponder.panHandlers}
                    />

                    <View
                      style={[
                        styles.anchorShell,
                        {
                          left: anchors.target.x - 52,
                          top: anchors.target.y - 52,
                        },
                      ]}
                      {...targetPanResponder.panHandlers}
                    />
                  </>
                ) : null}
              </View>
            </Stack>
          </Card>

          <Stack gap={12}>
            <Stack direction="row" gap={12}>
              <Button
                label={
                  selectionReady
                    ? previewMode === 'sequence'
                      ? 'Play Sequence'
                      : 'Play Effect'
                    : 'Preparing...'
                }
                size="md"
                disabled={previewMode === 'sequence' ? !canPlaySequence : !canPlayEffect}
                onPress={previewMode === 'sequence' ? handlePlaySequence : handlePlayEffect}
                style={{ flex: 1 }}
              />
              <Button
                label="Clear"
                size="md"
                variant="ghost"
                textured={false}
                onPress={resetPreviewPlayback}
                style={{ flex: 1 }}
              />
            </Stack>
            <Button
              label="Back"
              size="md"
              variant="ghost"
              textured={false}
              onPress={() => router.back()}
              style={{ width: '100%' }}
            />
          </Stack>
        </Stack>
        {selectedSpriteIds.map((spriteId) => (
          <SpriteWarmupImage key={spriteId} spriteId={spriteId} onResolved={handleSpriteResolved} />
        ))}
      </ContentContainer>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stage: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderOverlay,
    backgroundColor: 'rgba(10, 14, 24, 0.94)',
    position: 'relative',
  },
  stageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#10141c',
  },
  stagePortraits: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  portraitPlate: {
    position: 'absolute',
    alignItems: 'center',
    width: PORTRAIT_SIZE,
  },
  casterPlate: {
    zIndex: 2,
  },
  targetPlate: {
    zIndex: 2,
  },
  stageEffects: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  fpsPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 12, 20, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 5,
  },
  fpsText: {
    color: colors.textPrimary,
  },
  motionGuide: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(248, 198, 127, 0.18)',
    transformOrigin: 'center',
    zIndex: 2,
  },
  anchorShell: {
    position: 'absolute',
    width: 104,
    height: 104,
    zIndex: 4,
  },
});

export default VfxPreviewScreen;
