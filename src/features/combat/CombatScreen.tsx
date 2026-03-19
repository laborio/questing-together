import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, ModalBackdrop, Stack, StatusBadge, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import { useGame } from '@/contexts/GameContext';
import CombatActionGrid from '@/features/combat/components/CombatActionGrid';
import CombatHeader from '@/features/combat/components/CombatHeader';
import CombatPortraitStrip from '@/features/combat/components/CombatPortraitStrip';
import EnemyList from '@/features/combat/components/EnemyList';
import useCombatAnimations from '@/features/combat/hooks/useCombatAnimations';
import { buildCombatPlayers } from '@/features/combat/utils/buildCombatPlayers';
import { getEffectiveEnemyId } from '@/features/combat/utils/getEffectiveEnemyId';

const CombatScreen = () => {
  const insets = useSafeAreaInsets();
  const { roomConnection, localPlayerId, localRole, playerDisplayNameById } = useGame();
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const anim = useCombatAnimations();

  const localCharacter =
    roomConnection.characters.find((c) => c.playerId === localPlayerId) ?? null;

  const effectiveEnemyId = getEffectiveEnemyId(roomConnection.enemies, selectedEnemyId);
  const combatPlayers = buildCombatPlayers(roomConnection.players, playerDisplayNameById);
  const isDead = (localCharacter?.hp ?? 0) <= 0;

  const handleAttack = async () => {
    if (!effectiveEnemyId || isDead || anim.isAnimating) return;
    const result = await roomConnection.combatAttack(effectiveEnemyId);
    if (result) {
      const r = result as { enemyDamage: number; counterDamage: number };
      anim.playAttack(r.enemyDamage, r.counterDamage);
    }
  };

  const handleAbility = async () => {
    if (isDead || anim.isAnimating) return;
    const result = await roomConnection.combatAbility(effectiveEnemyId);
    if (result) {
      const r = result as {
        damage?: number;
        damagePerEnemy?: number;
        counterDamage?: number;
        ability: string;
      };
      const damage = r.damage ?? r.damagePerEnemy ?? 0;
      const counterDamage = r.counterDamage ?? 0;
      const abilityLabel =
        localRole && COMBAT.abilities[localRole] ? COMBAT.abilities[localRole].label : 'Ability';
      anim.playAbility(damage, abilityLabel, counterDamage);
    }
  };

  const handleHeal = async () => {
    if (isDead || anim.isAnimating) return;
    const result = await roomConnection.combatHeal();
    if (result) {
      const r = result as { hpRestored: number };
      anim.playHeal(r.hpRestored);
    }
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

        <EnemyList
          selectedEnemyId={effectiveEnemyId}
          onSelectEnemy={setSelectedEnemyId}
          enemyShake={anim.enemyShake}
          enemyFlash={anim.enemyFlash}
          floatingTexts={anim.floatingTexts}
        />

        <CombatPortraitStrip
          players={combatPlayers}
          localPlayerId={localPlayerId}
          playerLunge={anim.playerLunge}
          playerFlash={anim.playerFlash}
          floatingTexts={anim.floatingTexts}
        />
      </ScrollView>

      {!isDead ? (
        <BottomSheet size="sm">
          <CombatActionGrid
            onAttack={() => void handleAttack()}
            onAbility={() => void handleAbility()}
            onHeal={() => void handleHeal()}
            disabled={isDead || anim.isAnimating}
          />
        </BottomSheet>
      ) : null}

      {isDead ? (
        <ModalBackdrop onPress={() => roomConnection.cancelAdventure()}>
          <StatusBadge icon="🏃" title="YOU DIED" titleColor={colors.combatDamage} />
        </ModalBackdrop>
      ) : null}
    </Stack>
  );
};

export default CombatScreen;
