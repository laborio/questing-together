import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, ModalBackdrop, Stack, StatusBadge, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { COMBAT } from '@/constants/combatSettings';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import CombatActionGrid from '@/features/combat/components/CombatActionGrid';
import CombatHeader from '@/features/combat/components/CombatHeader';
import CombatPortraitStrip from '@/features/combat/components/CombatPortraitStrip';
import EnemyList from '@/features/combat/components/EnemyList';
import useCombatAnimations from '@/features/combat/hooks/useCombatAnimations';
import useCombatTurnPhase from '@/features/combat/hooks/useCombatTurnPhase';
import { buildCombatPlayers } from '@/features/combat/utils/buildCombatPlayers';
import { getEffectiveEnemyId } from '@/features/combat/utils/getEffectiveEnemyId';

type Position = { x: number; y: number };

const computeDirection = (from: Position, to: Position): { x: number; y: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: 0, y: -1 };
  return { x: dx / dist, y: dy / dist };
};

const CombatScreen = () => {
  const insets = useSafeAreaInsets();
  const anim = useCombatAnimations();
  const { roomConnection, localPlayerId, localRole, playerDisplayNameById, isHost } = useGame();
  const { t } = useTranslation();

  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

  // Position tracking for directional lunge
  const enemyPositionsRef = useRef<Record<string, Position>>({});
  const playerPositionRef = useRef<Position>({ x: 0, y: 0 });

  const handleEnemyLayout = useCallback((enemyId: string, x: number, y: number) => {
    enemyPositionsRef.current[enemyId] = { x, y };
  }, []);

  const handlePlayerLayout = useCallback((x: number, y: number) => {
    playerPositionRef.current = { x, y };
  }, []);

  const localCharacter =
    roomConnection.characters.find((c) => c.playerId === localPlayerId) ?? null;

  const effectiveEnemyId = getEffectiveEnemyId(roomConnection.enemies, selectedEnemyId);
  const combatPlayers = buildCombatPlayers(roomConnection.players, playerDisplayNameById);
  const isDead = (localCharacter?.hp ?? 0) <= 0;
  const allEnemiesDead =
    roomConnection.enemies.length > 0 && roomConnection.enemies.every((e) => e.isDead);

  const combatTurn = roomConnection.combatTurn;
  const turnPhase = combatTurn?.phase ?? 'player';
  const turnNumber = combatTurn?.turnNumber ?? 1;

  const localTurnState = roomConnection.playerTurnStates.find(
    (pts) => pts.playerId === localPlayerId,
  );
  const actionsRemaining = localTurnState?.actionsRemaining ?? 0;
  const hasEndedTurn = localTurnState?.hasEndedTurn ?? false;

  const abilityCooldown = localCharacter?.abilityCooldownLeft ?? 0;
  const healCooldown = localCharacter?.healCooldownLeft ?? 0;

  const getLungeToEnemy = useCallback((): { x: number; y: number } => {
    const targetPos = effectiveEnemyId ? enemyPositionsRef.current[effectiveEnemyId] : null;
    if (!targetPos) return { x: 0, y: -1 };
    return computeDirection(playerPositionRef.current, targetPos);
  }, [effectiveEnemyId]);

  const getLungeToPlayer = useCallback((): { x: number; y: number } => {
    const firstEnemy = roomConnection.enemies.find((e) => !e.isDead);
    const enemyPos = firstEnemy ? enemyPositionsRef.current[firstEnemy.id] : null;
    if (!enemyPos) return { x: 0, y: 1 };
    return computeDirection(enemyPos, playerPositionRef.current);
  }, [roomConnection.enemies]);

  useCombatTurnPhase({
    isHost,
    turnPhase,
    combatEnemyPhase: roomConnection.combatEnemyPhase,
    playEnemyPhase: anim.playEnemyPhase,
    getLungeToPlayer,
  });

  const handleAttack = async () => {
    if (!effectiveEnemyId || isDead || anim.isAnimating || hasEndedTurn) return;
    const direction = getLungeToEnemy();
    const result = await roomConnection.combatAttack(effectiveEnemyId);
    if (result) {
      const r = result as { enemyDamage: number };
      anim.playAttack(r.enemyDamage, direction);
    }
  };

  const handleAbility = async () => {
    if (isDead || anim.isAnimating || hasEndedTurn) return;
    const result = await roomConnection.combatAbility(effectiveEnemyId);
    if (result) {
      const r = result as {
        damage?: number;
        damagePerEnemy?: number;
        ability: string;
      };
      const damage = r.damage ?? r.damagePerEnemy ?? 0;
      const abilityLabel =
        localRole && COMBAT.abilities[localRole] ? COMBAT.abilities[localRole].label : 'Ability';
      anim.playAbility(damage, abilityLabel);
    }
  };

  const handleHeal = async () => {
    if (isDead || anim.isAnimating || hasEndedTurn) return;
    const result = await roomConnection.combatHeal();
    if (result) {
      const r = result as { hpRestored: number };
      anim.playHeal(r.hpRestored);
    }
  };

  const handleEndTurn = () => {
    void roomConnection.combatEndTurn();
  };

  const renderTurnBanner = () => {
    if (turnPhase === 'enemy') {
      return (
        <Stack align="center" style={{ paddingVertical: 4 }}>
          <Typography variant="caption" bold style={{ color: colors.combatDamage }}>
            Enemy Phase
          </Typography>
        </Stack>
      );
    }

    const endedCount = roomConnection.playerTurnStates.filter((pts) => pts.hasEndedTurn).length;
    const totalPlayers = roomConnection.playerTurnStates.length;

    return (
      <Stack
        direction="row"
        justify="space-between"
        align="center"
        style={{ paddingHorizontal: 12, paddingVertical: 4 }}
      >
        <Typography variant="caption" bold style={{ color: colors.intentConfirmedBorder }}>
          Turn {turnNumber}
        </Typography>
        <Typography variant="caption" style={{ color: colors.combatWaiting }}>
          {endedCount}/{totalPlayers} ready
        </Typography>
      </Stack>
    );
  };

  const renderBottomContent = () => {
    if (allEnemiesDead) {
      return (
        <BottomSheet size="sm">
          <Stack gap={12} align="center" style={{ paddingVertical: 8 }}>
            <StatusBadge icon="⚔️" title="Victory!" titleColor={colors.combatOutcome} />
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              {t('combat.enemiesKilled', { count: roomConnection.enemies.length })}
            </Typography>
            {isHost ? (
              <Button
                size="md"
                onPress={() => void roomConnection.advanceScreen()}
                label={t('combat.continue')}
                disabled={roomConnection.isBusy}
              />
            ) : (
              <Typography variant="caption" style={{ color: colors.combatWaiting }}>
                {t('combat.waitingHost')}
              </Typography>
            )}
          </Stack>
        </BottomSheet>
      );
    }

    if (isDead) return null;

    if (turnPhase === 'enemy') {
      return (
        <BottomSheet size="sm">
          <Stack align="center" style={{ paddingVertical: 16 }}>
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              Enemies are attacking...
            </Typography>
          </Stack>
        </BottomSheet>
      );
    }

    if (hasEndedTurn) {
      return (
        <BottomSheet size="sm">
          <Stack align="center" style={{ paddingVertical: 16 }}>
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              Waiting for other players...
            </Typography>
          </Stack>
        </BottomSheet>
      );
    }

    return (
      <BottomSheet size="sm">
        <CombatActionGrid
          onAttack={() => void handleAttack()}
          onAbility={() => void handleAbility()}
          onHeal={() => void handleHeal()}
          onEndTurn={handleEndTurn}
          actionsRemaining={actionsRemaining}
          abilityCooldown={abilityCooldown}
          healCooldown={healCooldown}
          disabled={anim.isAnimating}
        />
      </BottomSheet>
    );
  };

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundDark }}>
      <StatusBar hidden />
      <Stack style={{ paddingTop: insets.top }}>
        <CombatHeader character={localCharacter} onFlee={() => roomConnection.leaveRoom()} />
        {renderTurnBanner()}
      </Stack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 200 + insets.bottom,
          gap: 10,
          paddingTop: 8,
        }}
      >
        <EnemyList
          selectedEnemyId={effectiveEnemyId}
          onSelectEnemy={setSelectedEnemyId}
          enemyShake={anim.enemyShake}
          enemyFlash={anim.enemyFlash}
          enemyLungeX={anim.enemyLungeX}
          enemyLungeY={anim.enemyLungeY}
          onEnemyLayout={handleEnemyLayout}
          floatingTexts={anim.floatingTexts}
        />

        <CombatPortraitStrip
          players={combatPlayers}
          localPlayerId={localPlayerId}
          playerLungeX={anim.playerLungeX}
          playerLungeY={anim.playerLungeY}
          playerFlash={anim.playerFlash}
          onPlayerLayout={handlePlayerLayout}
          floatingTexts={anim.floatingTexts}
        />
      </ScrollView>

      {renderBottomContent()}

      {isDead && !allEnemiesDead ? (
        <ModalBackdrop onPress={() => roomConnection.cancelAdventure()}>
          <StatusBadge icon="🏃" title="YOU DIED" titleColor={colors.combatDamage} />
        </ModalBackdrop>
      ) : null}
    </Stack>
  );
};

export default CombatScreen;
