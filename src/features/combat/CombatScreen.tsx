import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import CombatActionGrid from '@/features/combat/CombatActionGrid';
import CombatHeader from '@/features/combat/CombatHeader';
import type { CombatPlayer } from '@/features/combat/CombatPortraitStrip';
import CombatPortraitStrip from '@/features/combat/CombatPortraitStrip';
import EnemyList from '@/features/combat/EnemyList';

const CombatScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, localPlayerId, playerDisplayNameById } = useGame();
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

  const localCharacter =
    roomConnection.characters.find((c) => c.playerId === localPlayerId) ?? null;

  // Auto-select first alive enemy, reset if selected enemy died
  const aliveEnemies = roomConnection.enemies.filter((e) => !e.isDead);
  const selectedIsAlive = aliveEnemies.some((e) => e.id === selectedEnemyId);
  const effectiveEnemyId = selectedIsAlive ? selectedEnemyId : (aliveEnemies[0]?.id ?? null);

  const combatPlayers: CombatPlayer[] = roomConnection.players
    .filter((p) => p.role_id)
    .map((p) => ({
      playerId: p.player_id,
      roleId: p.role_id as NonNullable<typeof p.role_id>,
      displayName: playerDisplayNameById[p.player_id] ?? p.player_id,
    }));

  const isDead = (localCharacter?.hp ?? 0) <= 0;

  const handleAttack = () => {
    if (!effectiveEnemyId || isDead) return;
    void roomConnection.combatAttack(effectiveEnemyId);
  };

  const handleAbility = () => {
    if (isDead) return;
    void roomConnection.combatAbility(effectiveEnemyId);
  };

  const handleHeal = () => {
    if (isDead) return;
    void roomConnection.combatHeal();
  };

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundDark }}>
      <Stack style={{ paddingTop: insets.top }}>
        <CombatHeader character={localCharacter} />
      </Stack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 200 + insets.bottom,
          gap: 10,
          paddingTop: 8,
        }}
      >
        <Stack gap={4} align="center" style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Typography
            variant="body"
            style={{
              color: colors.combatTitle,
              fontWeight: '700',
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            Zone de combat
          </Typography>
          <Typography
            variant="caption"
            style={{ color: colors.combatWaiting, fontSize: 12, textAlign: 'center' }}
          >
            Vous êtes dans une zone de combat libre
          </Typography>
        </Stack>

        <EnemyList selectedEnemyId={effectiveEnemyId} onSelectEnemy={setSelectedEnemyId} />

        <CombatPortraitStrip players={combatPlayers} localPlayerId={localPlayerId} />
      </ScrollView>

      {!isDead ? (
        <BottomSheet size="sm">
          <CombatActionGrid
            onAttack={handleAttack}
            onAbility={handleAbility}
            onHeal={handleHeal}
            disabled={isDead}
          />
        </BottomSheet>
      ) : null}

      {isDead ? (
        <Pressable
          onPress={() => roomConnection.cancelAdventure()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 200,
              padding: 16,
              borderRadius: 12,
              backgroundColor: colors.backgroundCombatCard,
              borderWidth: 1,
              borderColor: colors.errorDark,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Typography variant="body" style={{ fontSize: 20 }}>
              🏃
            </Typography>
            <Typography
              variant="heading"
              style={{ color: '#f44', fontSize: 22, fontWeight: '800', textAlign: 'center' }}
            >
              YOU DIED
            </Typography>
          </View>
        </Pressable>
      ) : null}
    </Stack>
  );
};

export default CombatScreen;
