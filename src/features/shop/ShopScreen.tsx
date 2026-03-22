import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, BottomSheet, Button, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import type { ShopScreenConfig } from '@/types/adventure';

const ShopScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, localPlayerId, isHost } = useGame();
  const { currentScreen } = roomConnection;
  const { t } = useTranslation();

  const config = currentScreen?.config as ShopScreenConfig | undefined;
  const localCharacter = roomConnection.characters.find((c) => c.playerId === localPlayerId);
  const gold = localCharacter?.gold ?? 0;

  if (!config) return null;

  const handleBuy = (itemId: string) => {
    const item = config.items.find((i) => i.id === itemId);
    if (item) {
      void roomConnection.shopPurchase(
        item.cost,
        item.effect.hpDelta ?? 0,
        item.effect.expDelta ?? 0,
      );
    }
  };

  const translateItemName = (nameKey: string) =>
    t(`shop.${nameKey}` as 'shop.potion_small') || nameKey;

  return (
    <Stack flex={1}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16 + insets.top,
          paddingBottom: 120 + insets.bottom,
          gap: 12,
        }}
      >
        <Typography variant="h4" style={{ color: colors.combatTitle, textAlign: 'center' }}>
          {t('playTest.shop')}
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.intentConfirmedBorder, textAlign: 'center' }}
        >
          {t('combat.goldLabel')}: {gold} g.
        </Typography>

        <Stack gap={8} style={{ marginTop: 12 }}>
          {config.items.map((item) => {
            const canAfford = gold >= item.cost;
            const effectParts: string[] = [];
            if (item.effect.hpDelta) effectParts.push(`HP +${item.effect.hpDelta}`);
            if (item.effect.expDelta) effectParts.push(`XP +${item.effect.expDelta}`);

            return (
              <ActionButton
                key={item.id}
                label={`${translateItemName(item.name)} (${item.cost}g)`}
                subtitle={effectParts.join(' · ')}
                disabled={!canAfford || roomConnection.isBusy}
                onPress={() => handleBuy(item.id)}
              />
            );
          })}
        </Stack>
      </ScrollView>

      {isHost ? (
        <BottomSheet size="xs">
          <Button
            size="sm"
            disabled={roomConnection.isBusy}
            onPress={() => void roomConnection.advanceScreen()}
            label={t('combat.continue')}
          />
        </BottomSheet>
      ) : (
        <BottomSheet size="xs">
          <Typography
            variant="caption"
            style={{ color: colors.combatWaiting, textAlign: 'center' }}
          >
            {t('combat.waitingHost')}
          </Typography>
        </BottomSheet>
      )}
    </Stack>
  );
};

export default ShopScreen;
