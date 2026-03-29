import { type SkImage, useImage } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ContentContainer,
  ScreenContainer,
  Select,
  Stack,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
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
import type { EffectInstance } from '@/features/vfx/types/runtime';

type AnchorKey = 'caster' | 'target';
type Point = { x: number; y: number };
type PreviewMode = 'sequence' | 'effect';

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
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
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
  const [spriteImageCache, setSpriteImageCache] = useState<Partial<Record<string, SkImage>>>({});
  const [selectionReady, setSelectionReady] = useState(true);
  const [instances, setInstances] = useState<EffectInstance[]>([]);
  const [stageReady, setStageReady] = useState(false);
  const [anchors, setAnchors] = useState<{ caster: Point; target: Point }>({
    caster: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
  });

  const clearTimers = useCallback(() => {
    for (const timeoutId of timeoutIdsRef.current) {
      clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];
  }, []);

  const resetPreviewPlayback = useCallback(() => {
    clearTimers();
    setInstances([]);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

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

      setInstances((current) => [...current, instance]);
      return instance.instanceId;
    },
    [],
  );

  const handleComplete = useCallback((instanceId: string) => {
    setInstances((current) => current.filter((instance) => instance.instanceId !== instanceId));
  }, []);

  const queueLocalTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(callback, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const handlePlaySequence = useCallback(() => {
    if (!selectedSequenceId) {
      return;
    }

    resetPreviewPlayback();
    playEffectSequence({
      sequenceId: selectedSequenceId,
      caster: anchors.caster,
      target: anchors.target,
      playEffect: playLocalEffect,
      onTimeout: queueLocalTimeout,
    });
  }, [
    anchors.caster,
    anchors.target,
    playLocalEffect,
    queueLocalTimeout,
    resetPreviewPlayback,
    selectedSequenceId,
  ]);

  const handlePlayEffect = useCallback(() => {
    if (!selectedEffectId) {
      return;
    }

    resetPreviewPlayback();
    playLocalEffect(selectedEffectId, {
      x: anchors.caster.x,
      y: anchors.caster.y,
      targetX: anchors.target.x,
      targetY: anchors.target.y,
      loopOverride: false,
    });
  }, [
    anchors.caster.x,
    anchors.caster.y,
    anchors.target.x,
    anchors.target.y,
    playLocalEffect,
    resetPreviewPlayback,
    selectedEffectId,
  ]);

  const casterPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          refreshStageBounds(() => {
            updateAnchorFromPage('caster', event.nativeEvent.pageX, event.nativeEvent.pageY);
          });
        },
        onPanResponderMove: (event) => {
          updateAnchorFromPage('caster', event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
      }),
    [refreshStageBounds, updateAnchorFromPage],
  );

  const targetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          refreshStageBounds(() => {
            updateAnchorFromPage('target', event.nativeEvent.pageX, event.nativeEvent.pageY);
          });
        },
        onPanResponderMove: (event) => {
          updateAnchorFromPage('target', event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
      }),
    [refreshStageBounds, updateAnchorFromPage],
  );

  const selectedEffect = useMemo(
    () => (selectedEffectId ? getEffectAsset(selectedEffectId) : null),
    [selectedEffectId],
  );
  const selectedSequence = useMemo(
    () => listEffectSequences().find((sequence) => sequence.id === selectedSequenceId) ?? null,
    [selectedSequenceId],
  );
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
            </Stack>
          </Card>

          <Card backgroundColor={colors.backgroundOverlayPanel} borderColor={colors.borderOverlay}>
            <Stack gap={12}>
              <View ref={stageRef} onLayout={handleStageLayout} style={styles.stage}>
                <View pointerEvents="none" style={styles.stageEffects}>
                  {instances.map((instance) => (
                    <EffectPlayer
                      key={instance.instanceId}
                      instance={instance}
                      onComplete={handleComplete}
                      spriteImageCache={spriteImageCache}
                    />
                  ))}
                </View>

                {stageReady ? (
                  <>
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

                    <View
                      style={[
                        styles.anchorShell,
                        {
                          left: anchors.caster.x - 24,
                          top: anchors.caster.y - 24,
                        },
                      ]}
                      {...casterPanResponder.panHandlers}
                    >
                      <View style={styles.casterAnchorOuter}>
                        <View style={styles.casterAnchorInner} />
                      </View>
                    </View>

                    <View
                      style={[
                        styles.anchorShell,
                        {
                          left: anchors.target.x - 28,
                          top: anchors.target.y - 28,
                        },
                      ]}
                      {...targetPanResponder.panHandlers}
                    >
                      <View style={styles.targetAnchorOuter}>
                        <View style={styles.targetAnchorInner} />
                      </View>
                    </View>
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
  stageEffects: {
    ...StyleSheet.absoluteFillObject,
  },
  motionGuide: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(248, 198, 127, 0.35)',
    transformOrigin: 'center',
  },
  anchorShell: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casterAnchorOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.intentConfirmedBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 196, 255, 0.08)',
  },
  casterAnchorInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.intentConfirmedBorder,
  },
  targetAnchorOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.combatDamage,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 110, 82, 0.08)',
  },
  targetAnchorInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.combatDamage,
  },
});

export default VfxPreviewScreen;
