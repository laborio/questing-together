import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, ModalBackdrop, Stack, StatusBadge, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import CombatHeader from '@/features/combat/components/CombatHeader';
import CombatPortraitStrip from '@/features/combat/components/CombatPortraitStrip';
import EnemyList from '@/features/combat/components/EnemyList';
import RewardScreen from '@/features/combat/components/RewardScreen';
import CardHandGrid from '@/features/combat/components/SpellHandGrid';
import useBotAI from '@/features/combat/hooks/useBotAI';
import useCombatAnimations from '@/features/combat/hooks/useCombatAnimations';
import useCombatBroadcast from '@/features/combat/hooks/useCombatBroadcast';
import useCombatTurnPhase from '@/features/combat/hooks/useCombatTurnPhase';
import { buildCombatPlayers } from '@/features/combat/utils/buildCombatPlayers';
import { getEffectiveEnemyId } from '@/features/combat/utils/getEffectiveEnemyId';
import { getCardById } from '@/features/gameConfig';

const getEffectType = (damage: number, block: number, heal: number, isAoe?: boolean): string => {
  if (heal > 0) return 'heal_self';
  if (block > 0 && damage === 0) return 'taunt';
  if (isAoe) return 'damage_aoe';
  return 'damage_single';
};

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
  const { roomConnection, localPlayerId, playerDisplayNameById, isHost } = useGame();
  const { t } = useTranslation();

  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);
  const [botActionToast, setBotActionToast] = useState<string | null>(null);
  const botToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Map enemy_combat_state to EnemyList-compatible format
  const mappedEnemies = useMemo(
    () =>
      roomConnection.enemyCombatStates.map((ecs) => ({
        id: ecs.id,
        roomId: ecs.roomId,
        position: 0,
        name: ecs.name,
        level: 1,
        hp: ecs.hp,
        hpMax: ecs.hpMax,
        attack: ecs.strength,
        isDead: ecs.isDead,
        templateId: ecs.templateId,
        intentIndex: ecs.intentIndex,
      })),
    [roomConnection.enemyCombatStates],
  );

  const effectiveEnemyId = getEffectiveEnemyId(mappedEnemies, selectedEnemyId);
  const combatPlayers = buildCombatPlayers(roomConnection.players, playerDisplayNameById);
  const isDead = (localCharacter?.hp ?? 0) <= 0;
  const allEnemiesDead = mappedEnemies.length > 0 && mappedEnemies.every((e) => e.isDead);

  const combatTurn = roomConnection.combatTurn;
  const turnPhase = combatTurn?.phase ?? 'player';
  const turnNumber = combatTurn?.turnNumber ?? 1;

  const localTurnState = roomConnection.playerTurnStates.find(
    (pts) => pts.playerId === localPlayerId,
  );
  const hasEndedTurn = localTurnState?.hasEndedTurn ?? false;

  const localCombatState =
    roomConnection.playerCombatStates.find((pcs) => pcs.playerId === localPlayerId) ?? null;

  // Late joiner: init combat state if missing
  const initAttemptedRef = useRef(false);
  useEffect(() => {
    if (!localCombatState && combatTurn && !initAttemptedRef.current) {
      initAttemptedRef.current = true;
      void roomConnection.combatInitTurn();
    }
  }, [localCombatState, combatTurn, roomConnection.combatInitTurn]);

  // Find selected enemy index (position-based for deckbuilder)
  const aliveEnemies = mappedEnemies.filter((e) => !e.isDead);
  const selectedEnemyIdx = effectiveEnemyId
    ? aliveEnemies.findIndex((e) => e.id === effectiveEnemyId)
    : 0;

  const getLungeToEnemy = useCallback((): { x: number; y: number } => {
    const targetPos = effectiveEnemyId ? enemyPositionsRef.current[effectiveEnemyId] : null;
    if (!targetPos) return { x: 0, y: -1 };
    return computeDirection(playerPositionRef.current, targetPos);
  }, [effectiveEnemyId]);

  const getDirectionForEnemy = useCallback((enemyId: string): { x: number; y: number } => {
    const enemyPos = enemyPositionsRef.current[enemyId];
    if (!enemyPos) return { x: 0, y: 1 };
    return computeDirection(enemyPos, playerPositionRef.current);
  }, []);

  const botPlayerIds = roomConnection.players.filter((p) => p.is_bot).map((p) => p.player_id);

  useCombatTurnPhase({
    isHost,
    turnPhase,
    localHp: localCharacter?.hp ?? 0,
    combatEnemyPhase: roomConnection.combatEnemyPhase,
    playEnemyPhase: anim.playEnemyPhase,
    getDirectionForEnemy,
  });

  const localPlayerName =
    roomConnection.players.find((p) => p.player_id === localPlayerId)?.display_name ?? 'Player';

  const { broadcastAction } = useCombatBroadcast({
    roomId: roomConnection.room?.id ?? null,
    localPlayerId,
    onAllyAction: useCallback(
      (event) => {
        anim.playBotAction(event.playerId, event.actionType, event.damage, event.spellName);
      },
      [anim],
    ),
  });

  const showBotToast = useCallback((text: string) => {
    if (botToastTimer.current) clearTimeout(botToastTimer.current);
    setBotActionToast(text);
    botToastTimer.current = setTimeout(() => setBotActionToast(null), 2000);
  }, []);

  useBotAI({
    turnPhase,
    turnNumber,
    botPlayerIds,
    combatBotTurn: roomConnection.combatBotTurn,
    playBotAction: (botId, action) => {
      const botPlayer = roomConnection.players.find((p) => p.player_id === botId);
      const botName = botPlayer?.display_name ?? 'Bot';
      anim.playBotAction(botId, action.action, action.damage ?? 0, action.spellName);

      // Show visible toast
      const dmg = action.damage ?? 0;
      const label = action.spellName ?? action.action;
      const detail = dmg > 0 ? `${label} → ${dmg} dmg` : label;
      showBotToast(`${botName}: ${detail}`);
      broadcastAction({
        playerId: botId,
        playerName: botName,
        actionType: action.action === 'skip' ? 'spell' : action.action,
        damage: action.damage ?? 0,
        spellName: action.spellName,
      });
    },
    onBotSkip: (botId, reason) => {
      const botPlayer = roomConnection.players.find((p) => p.player_id === botId);
      const botName = botPlayer?.display_name ?? 'Bot';
      showBotToast(`${botName}: ${reason}`);
    },
  });

  const handlePlayCard = useCallback(
    (
      handIndex: number,
      targetEnemyIdx?: number | null,
      useAttune?: boolean,
      attuneTrait?: string | null,
    ) => {
      if (isDead || anim.isAnimating || hasEndedTurn) return;
      if (!localCombatState) return;
      const instance = localCombatState.hand[handIndex];
      if (!instance) return;
      const card = getCardById(instance.cardId);
      if (!card) return;

      const direction = getLungeToEnemy();

      void roomConnection
        .combatPlayCard(handIndex, targetEnemyIdx, useAttune, attuneTrait)
        .then((result) => {
          if (!result) return;
          const r = result as {
            cardName: string;
            damage: number;
            block: number;
            heal: number;
            burn: number;
            wasAmplified: boolean;
            trait: string;
          };

          const effectType = getEffectType(r.damage, r.block, r.heal, card.isAoe);

          anim.playCastSpell(
            r.damage,
            r.cardName,
            effectType,
            direction,
            0, // no D20 roll in deckbuilder
            'normal',
            r.heal,
          );

          if (localPlayerId) {
            broadcastAction({
              playerId: localPlayerId,
              playerName: localPlayerName,
              actionType: 'spell',
              damage: r.damage,
              spellName: r.cardName,
            });
          }
        });
    },
    [
      isDead,
      anim,
      hasEndedTurn,
      localCombatState,
      getLungeToEnemy,
      roomConnection,
      localPlayerId,
      localPlayerName,
      broadcastAction,
    ],
  );

  const handleConvergence = useCallback(() => {
    if (isDead || anim.isAnimating || hasEndedTurn) return;

    void roomConnection
      .combatUseConvergence(selectedEnemyIdx >= 0 ? selectedEnemyIdx : null)
      .then((result) => {
        if (!result) return;
        const r = result as {
          damage: number;
          block: number;
          heal: number;
          empoweredCount: number;
        };

        anim.playConvergence(r.damage, 'Convergence', 0, 'normal');

        if (localPlayerId) {
          broadcastAction({
            playerId: localPlayerId,
            playerName: localPlayerName,
            actionType: 'convergence',
            damage: r.damage,
            spellName: 'Convergence',
          });
        }
      });
  }, [
    isDead,
    anim,
    hasEndedTurn,
    selectedEnemyIdx,
    roomConnection,
    localPlayerId,
    localPlayerName,
    broadcastAction,
  ]);

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
      if (showRewards) {
        return (
          <BottomSheet
            size="lg"
            style={{ backgroundColor: colors.backgroundDark, borderColor: colors.tabBorder }}
          >
            <RewardScreen
              onDone={() => {
                setShowRewards(false);
                void roomConnection.advanceScreen();
              }}
            />
          </BottomSheet>
        );
      }
      return (
        <BottomSheet
          size="sm"
          style={{ backgroundColor: colors.backgroundDark, borderColor: colors.tabBorder }}
        >
          <Stack gap={12} align="center" style={{ paddingVertical: 8 }}>
            <StatusBadge icon="⚔️" title="Victory!" titleColor={colors.combatOutcome} />
            {isHost ? (
              <Button
                size="md"
                onPress={() => setShowRewards(true)}
                label="Claim Rewards"
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
      return null;
    }

    if (hasEndedTurn) {
      return (
        <BottomSheet
          size="sm"
          style={{ backgroundColor: colors.backgroundDark, borderColor: colors.tabBorder }}
        >
          <Stack align="center" style={{ paddingVertical: 16 }}>
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              Waiting for other players...
            </Typography>
          </Stack>
        </BottomSheet>
      );
    }

    if (!localCombatState) {
      return (
        <BottomSheet
          size="sm"
          style={{ backgroundColor: colors.backgroundDark, borderColor: colors.tabBorder }}
        >
          <Stack align="center" style={{ paddingVertical: 16 }}>
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              Loading cards...
            </Typography>
          </Stack>
        </BottomSheet>
      );
    }

    return (
      <BottomSheet
        size="lg"
        style={{ backgroundColor: colors.backgroundDark, borderColor: colors.tabBorder }}
      >
        <CardHandGrid
          combatState={localCombatState}
          disabled={anim.isAnimating}
          onPlayCard={handlePlayCard}
          onConvergence={handleConvergence}
          onEndTurn={handleEndTurn}
          onReroll={() => void roomConnection.combatRerollHand()}
          selectedEnemyIdx={selectedEnemyIdx >= 0 ? selectedEnemyIdx : null}
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
        {botActionToast ? (
          <Stack
            align="center"
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              marginHorizontal: 24,
              borderRadius: 8,
              backgroundColor: colors.emoteToastBg,
              borderWidth: 1,
              borderColor: colors.emoteToastBorder,
            }}
          >
            <Typography
              variant="caption"
              style={{ color: colors.emoteToastName, fontWeight: '600' }}
            >
              {botActionToast}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 260 + insets.bottom,
          gap: 10,
          paddingTop: 8,
        }}
      >
        <EnemyList
          enemies={mappedEnemies}
          selectedEnemyId={effectiveEnemyId}
          onSelectEnemy={setSelectedEnemyId}
          enemyShake={anim.enemyShake}
          enemyFlash={anim.enemyFlash}
          enemyLungeX={anim.enemyLungeX}
          enemyLungeY={anim.enemyLungeY}
          attackingEnemyId={anim.attackingEnemyId}
          onEnemyLayout={handleEnemyLayout}
          floatingTexts={anim.floatingTexts}
        />

        <CombatPortraitStrip
          players={combatPlayers}
          localPlayerId={localPlayerId}
          playerLungeX={anim.playerLungeX}
          playerLungeY={anim.playerLungeY}
          playerFlash={anim.playerFlash}
          botLunge={anim.botLunge}
          botLungePlayerId={anim.botLungePlayerId}
          localHpOverride={
            anim.prePhaseHp !== null
              ? Math.max(0, anim.prePhaseHp - anim.enemyPhaseDamageDealt)
              : null
          }
          onPlayerLayout={handlePlayerLayout}
          floatingTexts={anim.floatingTexts}
        />
      </ScrollView>

      {renderBottomContent()}

      {isDead && !allEnemiesDead ? (
        <ModalBackdrop>
          <Stack gap={16} align="center">
            <StatusBadge icon="💀" title="YOU DIED" titleColor={colors.combatDamage} />
            <Button
              size="md"
              variant="ghost"
              label="Leave"
              onPress={() => void roomConnection.leaveRoom()}
            />
          </Stack>
        </ModalBackdrop>
      ) : null}

      <ScreenFlashOverlay flash={anim.screenFlash} color={anim.screenFlashColor} />
    </Stack>
  );
};

const ScreenFlashOverlay = ({ flash, color }: { flash: SharedValue<number>; color: string }) => {
  const style = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: color, zIndex: 200 }, style]}
      pointerEvents="none"
    />
  );
};

export default CombatScreen;
