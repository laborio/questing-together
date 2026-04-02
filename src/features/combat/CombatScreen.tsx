import { StatusBar } from 'expo-status-bar';
import { type RefCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ModalBackdrop, Stack, StatusBadge, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import CombatBottomPanel from '@/features/combat/components/CombatBottomPanel';
import CombatPortraitStrip from '@/features/combat/components/CombatPortraitStrip';
import CombatTurnBanner from '@/features/combat/components/CombatTurnBanner';
import EnemyList from '@/features/combat/components/EnemyList';
import ScreenFlashOverlay from '@/features/combat/components/ScreenFlashOverlay';
import useBotAI from '@/features/combat/hooks/useBotAI';
import useCombatAnimations from '@/features/combat/hooks/useCombatAnimations';
import useCombatBroadcast from '@/features/combat/hooks/useCombatBroadcast';
import useCombatTurnPhase from '@/features/combat/hooks/useCombatTurnPhase';
import { buildCombatPlayers } from '@/features/combat/utils/buildCombatPlayers';
import { getEffectiveEnemyId } from '@/features/combat/utils/getEffectiveEnemyId';
import { type CardVfxTarget, getCardById } from '@/features/gameConfig';
import { getEffectAsset, getEffectSequence, playEffectSequence, useVfx } from '@/features/vfx';
import type { PlayerId } from '@/types/player';

const getEffectType = (damage: number, block: number, heal: number, isAoe?: boolean): string => {
  if (heal > 0) return 'heal_self';
  if (block > 0 && damage === 0) return 'taunt';
  if (isAoe) return 'damage_aoe';
  return 'damage_single';
};

type Position = { x: number; y: number };
type CombatVfxPayload = {
  effectId?: string;
  playerId: PlayerId | null;
  sequenceId?: string;
  targetEnemyId?: string | null;
  targetMode: CardVfxTarget;
};

const resolveCardVfxTarget = (target: CardVfxTarget | undefined): CardVfxTarget =>
  target ?? 'self_to_target';

const getSequenceImpactDelayMs = (sequenceId: string) => {
  const sequence = getEffectSequence(sequenceId);
  if (!sequence) return 0;

  return sequence.cues.reduce((maxDelay, cue) => {
    if (cue.anchor === 'target' || cue.anchor === 'projectile' || cue.targetAnchor === 'target') {
      return Math.max(maxDelay, cue.atMs);
    }

    return maxDelay;
  }, 0);
};

const getEffectImpactDelayMs = (effectId: string, targetMode: CardVfxTarget) => {
  if (targetMode !== 'self_to_target') return 0;

  const effect = getEffectAsset(effectId);
  return effect?.durationMs ?? 0;
};

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
  const { playEffect } = useVfx();
  const { roomConnection, localPlayerId, playerDisplayNameById, isHost } = useGame();

  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [botActionToast, setBotActionToast] = useState<string | null>(null);
  const botToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enemyPositionsRef = useRef<Record<string, Position>>({});
  const playerPositionRef = useRef<Position>({ x: 0, y: 0 });
  const playerPortraitRefs = useRef<Partial<Record<PlayerId, View | null>>>({});
  const enemyPortraitRefs = useRef<Record<string, View | null>>({});
  const vfxTimeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timeoutId of vfxTimeoutIdsRef.current) {
        clearTimeout(timeoutId);
      }
      vfxTimeoutIdsRef.current = [];
    },
    [],
  );

  const handleEnemyLayout = useCallback((enemyId: string, x: number, y: number) => {
    enemyPositionsRef.current[enemyId] = { x, y };
  }, []);

  const handlePlayerLayout = useCallback((x: number, y: number) => {
    playerPositionRef.current = { x, y };
  }, []);

  const handlePlayerPortraitRef = useCallback(
    (playerId: PlayerId): RefCallback<View> =>
      (node: View | null) => {
        if (node) {
          playerPortraitRefs.current[playerId] = node;
        } else {
          delete playerPortraitRefs.current[playerId];
        }
      },
    [],
  );

  const handleEnemyPortraitRef = useCallback(
    (enemyId: string): RefCallback<View> =>
      (node: View | null) => {
        if (node) {
          enemyPortraitRefs.current[enemyId] = node;
        } else {
          delete enemyPortraitRefs.current[enemyId];
        }
      },
    [],
  );

  const measureViewCenterInWindow = useCallback((node: View | null) => {
    return new Promise<Position | null>((resolve) => {
      if (!node) {
        resolve(null);
        return;
      }

      node.measureInWindow((x, y, width, height) => {
        if (!width && !height) {
          resolve(null);
          return;
        }

        resolve({
          x: x + width / 2,
          y: y + height / 2,
        });
      });
    });
  }, []);

  const queueVfxTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      vfxTimeoutIdsRef.current = vfxTimeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);

    vfxTimeoutIdsRef.current.push(timeoutId);
  }, []);

  const playCardVfx = useCallback(
    async ({ effectId, playerId, sequenceId, targetEnemyId, targetMode }: CombatVfxPayload) => {
      if (!playerId || (!sequenceId && !effectId)) {
        return { impactDelayMs: 0, played: false };
      }

      const sourcePortrait = playerPortraitRefs.current[playerId] ?? null;
      const needsTargetPortrait = targetMode !== 'self';
      const targetPortrait = targetEnemyId
        ? (enemyPortraitRefs.current[targetEnemyId] ?? null)
        : null;

      const [caster, target] = await Promise.all([
        measureViewCenterInWindow(sourcePortrait),
        needsTargetPortrait
          ? measureViewCenterInWindow(targetPortrait)
          : Promise.resolve<Position | null>(null),
      ]);

      if (!caster) {
        return { impactDelayMs: 0, played: false };
      }

      if (needsTargetPortrait && !target) {
        return { impactDelayMs: 0, played: false };
      }

      const resolvedOrigin = targetMode === 'target' ? (target ?? caster) : caster;
      const resolvedDestination = targetMode === 'self' ? caster : (target ?? caster);

      if (sequenceId) {
        playEffectSequence({
          sequenceId,
          caster: resolvedOrigin,
          target: resolvedDestination,
          playEffect,
          onTimeout: queueVfxTimeout,
        });

        return {
          impactDelayMs: getSequenceImpactDelayMs(sequenceId),
          played: true,
        };
      }

      if (!effectId) {
        return { impactDelayMs: 0, played: false };
      }

      playEffect(
        effectId,
        targetMode === 'self_to_target'
          ? {
              x: resolvedOrigin.x,
              y: resolvedOrigin.y,
              targetX: resolvedDestination.x,
              targetY: resolvedDestination.y,
            }
          : {
              x: resolvedOrigin.x,
              y: resolvedOrigin.y,
            },
      );

      return {
        impactDelayMs: getEffectImpactDelayMs(effectId, targetMode),
        played: true,
      };
    },
    [measureViewCenterInWindow, playEffect, queueVfxTimeout],
  );

  const localCharacter =
    roomConnection.characters.find((c) => c.playerId === localPlayerId) ?? null;

  const localRoleId =
    (roomConnection.players.find((p) => p.player_id === localPlayerId)?.role_id as
      | 'warrior'
      | 'sage'
      | 'ranger') ?? 'warrior';

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
      async (event) => {
        const allyCard = event.spellId ? getCardById(event.spellId) : undefined;
        const allyTargetMode = resolveCardVfxTarget(allyCard?.vfxTarget);
        const vfxResult =
          allyCard && event.actionType === 'spell'
            ? await playCardVfx({
                effectId: allyCard.vfxEffectId,
                playerId: event.playerId,
                sequenceId: allyCard.vfxSequenceId,
                targetEnemyId: event.targetEnemyId,
                targetMode: allyTargetMode,
              })
            : { impactDelayMs: 0, played: false };

        anim.playBotAction(event.playerId, event.actionType, event.damage, event.spellName, {
          impactDelayMs: vfxResult.impactDelayMs,
        });
      },
      [anim, playCardVfx],
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
    playBotAction: async (botId, action) => {
      const botPlayer = roomConnection.players.find((p) => p.player_id === botId);
      const botName = botPlayer?.display_name ?? 'Bot';
      const botCard = action.spellId ? getCardById(action.spellId) : undefined;
      const botTargetMode = resolveCardVfxTarget(botCard?.vfxTarget);
      const vfxResult =
        botCard && action.action === 'spell'
          ? await playCardVfx({
              effectId: botCard.vfxEffectId,
              playerId: botId,
              sequenceId: botCard.vfxSequenceId,
              targetEnemyId: action.targetId,
              targetMode: botTargetMode,
            })
          : { impactDelayMs: 0, played: false };
      anim.playBotAction(botId, action.action, action.damage ?? 0, action.spellName, {
        impactDelayMs: vfxResult.impactDelayMs,
      });

      const dmg = action.damage ?? 0;
      const label = action.spellName ?? action.action;
      const detail = dmg > 0 ? `${label} → ${dmg} dmg` : label;
      showBotToast(`${botName}: ${detail}`);
      broadcastAction({
        playerId: botId,
        playerName: botName,
        actionType: action.action === 'skip' ? 'spell' : action.action,
        damage: action.damage ?? 0,
        spellId: action.spellId,
        spellName: action.spellName,
        targetEnemyId: action.targetId,
      });
    },
    onBotSkip: (botId, reason) => {
      const botPlayer = roomConnection.players.find((p) => p.player_id === botId);
      const botName = botPlayer?.display_name ?? 'Bot';
      showBotToast(`${botName}: ${reason}`);
    },
  });

  const handlePlayCard = useCallback(
    (handIndex: number, targetEnemyIdx?: number | null) => {
      if (isDead || anim.isAnimating || hasEndedTurn) return;
      if (!localCombatState) return;
      const instance = localCombatState.hand[handIndex];
      if (!instance) return;
      const card = getCardById(instance.cardId);
      if (!card) return;

      const direction = getLungeToEnemy();
      const targetEnemyId =
        targetEnemyIdx != null && targetEnemyIdx >= 0
          ? (aliveEnemies[targetEnemyIdx]?.id ?? effectiveEnemyId)
          : effectiveEnemyId;

      void roomConnection.combatPlayCard(handIndex, targetEnemyIdx).then(async (result) => {
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
        const cardTargetMode = resolveCardVfxTarget(card.vfxTarget);
        const needsTargetEnemy = cardTargetMode !== 'self';
        const shouldPlayCombatVfx =
          Boolean(card.vfxSequenceId || card.vfxEffectId) &&
          !card.isAoe &&
          (!needsTargetEnemy || Boolean(targetEnemyId));
        const vfxResult = shouldPlayCombatVfx
          ? await playCardVfx({
              effectId: card.vfxEffectId,
              playerId: localPlayerId,
              sequenceId: card.vfxSequenceId,
              targetEnemyId,
              targetMode: cardTargetMode,
            })
          : { impactDelayMs: 0, played: false };

        anim.playCastSpell(r.damage, r.cardName, effectType, direction, 0, 'normal', r.heal, {
          impactDelayMs: vfxResult.impactDelayMs,
          skipLunge: vfxResult.played,
        });

        if (localPlayerId) {
          broadcastAction({
            playerId: localPlayerId,
            playerName: localPlayerName,
            actionType: 'spell',
            damage: r.damage,
            spellId: card.id,
            spellName: r.cardName,
            targetEnemyId,
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
      aliveEnemies,
      effectiveEnemyId,
      playCardVfx,
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

  const handleEndTurn = useCallback(() => {
    void roomConnection.combatEndTurn();
  }, [roomConnection]);

  const handleReroll = useCallback(() => {
    void roomConnection.combatRerollHand();
  }, [roomConnection]);

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundCombat }}>
      <StatusBar hidden />
      <Stack style={{ paddingTop: insets.top }}>
        <CombatTurnBanner
          turnPhase={turnPhase}
          turnNumber={turnNumber}
          playerTurnStates={roomConnection.playerTurnStates}
        />
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
          paddingHorizontal: 14,
          paddingBottom: 320 + insets.bottom,
          gap: 12,
          paddingTop: 10,
        }}
      >
        {turnPhase === 'player' && !hasEndedTurn && !isDead && aliveEnemies.length > 1 ? (
          <Stack align="center" style={{ paddingVertical: 2 }}>
            <Typography
              variant="micro"
              style={{
                color: colors.combatDamage,
                fontWeight: '600',
                letterSpacing: 1,
                opacity: 0.7,
              }}
            >
              TAP AN ENEMY TO SELECT TARGET
            </Typography>
          </Stack>
        ) : null}

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
          onEnemyPortraitRef={handleEnemyPortraitRef}
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
          onPlayerPortraitRef={handlePlayerPortraitRef}
          floatingTexts={anim.floatingTexts}
        />
      </ScrollView>

      <CombatBottomPanel
        allEnemiesDead={allEnemiesDead}
        isDead={isDead}
        turnPhase={turnPhase}
        hasEndedTurn={hasEndedTurn}
        isHost={isHost}
        isBusy={roomConnection.isBusy}
        isAnimating={anim.isAnimating}
        localCombatState={localCombatState}
        roleId={localRoleId}
        selectedEnemyIdx={selectedEnemyIdx >= 0 ? selectedEnemyIdx : null}
        onPlayCard={handlePlayCard}
        onConvergence={handleConvergence}
        onEndTurn={handleEndTurn}
        onReroll={handleReroll}
        onAdvanceScreen={roomConnection.advanceScreen}
      />

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

export default CombatScreen;
