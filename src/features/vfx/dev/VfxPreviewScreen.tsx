import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { Button, Card, ContentContainer, ScreenContainer, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import EffectPlayer from '@/features/vfx/player/EffectPlayer';
import { createEffectInstance } from '@/features/vfx/runtime/createEffectInstance';
import { getEffectAsset } from '@/features/vfx/runtime/effectRegistry';
import { playEffectSequence } from '@/features/vfx/runtime/playEffectSequence';
import type { EffectInstance } from '@/features/vfx/types/runtime';

type AnchorKey = 'caster' | 'target';
type Point = { x: number; y: number };

type VfxPreviewScreenProps = {
  sequenceId: string;
  travelAssetId?: string;
  impactAssetId?: string;
  title?: string;
  description?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const VfxPreviewScreen = ({
  sequenceId,
  travelAssetId,
  impactAssetId,
  title = 'VFX Playground',
  description = 'Drag the caster and target anchors, then preview the full cast sequence or its individual cues directly in the stage.',
}: VfxPreviewScreenProps) => {
  const router = useRouter();
  const stageRef = useRef<View>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
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
    resetPreviewPlayback();
    const durationMs = playEffectSequence({
      sequenceId,
      caster: anchors.caster,
      target: anchors.target,
      playEffect: playLocalEffect,
      onTimeout: queueLocalTimeout,
    });
    queueLocalTimeout(() => {
      setInstances([]);
    }, durationMs + 120);
  }, [
    anchors.caster,
    anchors.target,
    playLocalEffect,
    queueLocalTimeout,
    resetPreviewPlayback,
    sequenceId,
  ]);

  const handleTravelOnly = useCallback(() => {
    if (!travelAssetId) {
      return;
    }

    resetPreviewPlayback();
    playLocalEffect(travelAssetId, {
      x: anchors.caster.x,
      y: anchors.caster.y,
      targetX: anchors.target.x,
      targetY: anchors.target.y,
    });
    const durationMs = getEffectAsset(travelAssetId)?.durationMs ?? 0;
    queueLocalTimeout(() => {
      setInstances([]);
    }, durationMs + 120);
  }, [
    anchors.caster.x,
    anchors.caster.y,
    anchors.target.x,
    anchors.target.y,
    playLocalEffect,
    queueLocalTimeout,
    resetPreviewPlayback,
    travelAssetId,
  ]);

  const handleImpactOnly = useCallback(() => {
    if (!impactAssetId) {
      return;
    }

    resetPreviewPlayback();
    playLocalEffect(impactAssetId, {
      x: anchors.target.x,
      y: anchors.target.y,
    });
    const durationMs = getEffectAsset(impactAssetId)?.durationMs ?? 0;
    queueLocalTimeout(() => {
      setInstances([]);
    }, durationMs + 120);
  }, [
    anchors.target.x,
    anchors.target.y,
    impactAssetId,
    playLocalEffect,
    queueLocalTimeout,
    resetPreviewPlayback,
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
              <View ref={stageRef} onLayout={handleStageLayout} style={styles.stage}>
                <View pointerEvents="none" style={styles.stageEffects}>
                  {instances.map((instance) => (
                    <EffectPlayer
                      key={instance.instanceId}
                      instance={instance}
                      onComplete={handleComplete}
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
                label="Cast Sequence"
                size="md"
                onPress={handlePlaySequence}
                style={{ flex: 1 }}
              />
              {travelAssetId ? (
                <Button
                  label="Travel Only"
                  size="md"
                  variant="ghost"
                  textured={false}
                  onPress={handleTravelOnly}
                  style={{ flex: 1 }}
                />
              ) : null}
            </Stack>
            {impactAssetId ? (
              <Button
                label="Impact Only"
                size="md"
                variant="ghost"
                textured={false}
                onPress={handleImpactOnly}
                style={{ width: '100%' }}
              />
            ) : null}
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
