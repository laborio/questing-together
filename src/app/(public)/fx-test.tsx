import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, ContentContainer, ScreenContainer, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import effectAssetData from '@/features/vfx/assets/comet-trail.json';
import EffectPreview from '@/features/vfx/components/EffectPreview';
import type { EffectAsset } from '@/features/vfx/types';

const effectAsset = effectAssetData as EffectAsset;

const FxTestScreen = () => {
  const router = useRouter();
  const [replayToken, setReplayToken] = useState(0);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ContentContainer style={{ justifyContent: 'center', maxWidth: 420 }}>
          <Stack gap={16} style={{ width: '100%' }}>
            <Stack gap={6}>
              <Typography variant="h3">VFX Runtime Spike</Typography>
              <Typography style={{ textAlign: 'left' }}>
                Minimal proof that the current React Native stack can load an effect file and drive
                multiple animated parameters together.
              </Typography>
            </Stack>

            <Card
              backgroundColor={colors.backgroundOverlayPanel}
              borderColor={colors.borderOverlay}
            >
              <Stack gap={12}>
                <Typography variant="sectionTitle" style={{ color: colors.textOverlayHeading }}>
                  {effectAsset.label}
                </Typography>
                <Typography style={{ color: colors.textOverlayBody, textAlign: 'left' }}>
                  Asset file: `src/features/vfx/assets/comet-trail.json`
                </Typography>
                <EffectPreview key={replayToken} asset={effectAsset} />
                <Typography style={{ color: colors.textOverlayBody, textAlign: 'left' }}>
                  Animated together: `x`, `y`, `scale`, `alpha`, `glow`, `ring`.
                </Typography>
                <Typography style={{ color: colors.textOverlayBody, textAlign: 'left' }}>
                  Visuals in this test: a moving core, delayed trail segments, and a burst ring near
                  the end of the timeline.
                </Typography>
              </Stack>
            </Card>

            <Stack direction="row" gap={12}>
              <Button
                label="Replay"
                size="md"
                onPress={() => setReplayToken((current) => current + 1)}
                style={{ flex: 1 }}
              />
              <Button
                label="Back"
                size="md"
                variant="ghost"
                textured={false}
                onPress={() => router.back()}
                style={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </ContentContainer>
      </ScrollView>
    </ScreenContainer>
  );
};

export default FxTestScreen;
