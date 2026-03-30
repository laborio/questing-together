import { useEffect, useRef } from 'react';
import { scheduleCallback } from '@/features/combat/utils/scheduleCallback';
import type { PlayerId } from '@/types/player';

const BOT_INITIAL_DELAY = 2000;
const BOT_ACTION_REPLAY_INTERVAL = 800;
const BOT_BETWEEN_DELAY = 1500;

type BotAction = {
  action: 'spell' | 'convergence' | 'skip';
  spellId?: string;
  spellName?: string;
  ability?: string;
  damage?: number;
  targetId?: string;
  target?: string;
};

type PlayBotActionFn = (botPlayerId: PlayerId, action: BotAction) => void;
type OnBotSkipFn = (botPlayerId: PlayerId, reason: string) => void;

type UseBotAIParams = {
  turnPhase: string;
  turnNumber: number;
  botPlayerIds: PlayerId[];
  combatBotTurn: (botPlayerId: PlayerId) => Promise<unknown>;
  playBotAction: PlayBotActionFn;
  onBotSkip?: OnBotSkipFn;
};

const useBotAI = ({
  turnPhase,
  turnNumber,
  botPlayerIds,
  combatBotTurn,
  playBotAction,
  onBotSkip,
}: UseBotAIParams) => {
  const triggeredTurnRef = useRef<number>(0);
  const currentTurnRef = useRef<number>(0);
  const currentPhaseRef = useRef<string>('player');

  currentTurnRef.current = turnNumber;
  currentPhaseRef.current = turnPhase;

  useEffect(() => {
    if (turnPhase !== 'player' || botPlayerIds.length === 0) return;
    if (triggeredTurnRef.current === turnNumber) return;
    triggeredTurnRef.current = turnNumber;

    const capturedTurn = turnNumber;

    // Run bots sequentially: bot 1 finishes all actions, then bot 2, then bot 3
    const runBotsSequentially = async () => {
      await new Promise((r) => scheduleCallback(BOT_INITIAL_DELAY, r as () => void));

      for (const botId of botPlayerIds) {
        // Check phase hasn't changed
        if (currentTurnRef.current !== capturedTurn || currentPhaseRef.current !== 'player') break;

        try {
          const result = await combatBotTurn(botId);
          if (!result) {
            onBotSkip?.(botId, 'No actions');
            continue;
          }

          const r = result as { actions: BotAction[]; dead?: boolean };

          if (r.dead) {
            onBotSkip?.(botId, 'Dead');
            continue;
          }

          const visibleActions = (r.actions ?? []).filter((a) => a.action !== 'skip');

          if (visibleActions.length === 0) {
            onBotSkip?.(botId, 'No energy');
            continue;
          }

          // Replay each action with delay
          for (let i = 0; i < visibleActions.length; i++) {
            await new Promise<void>((resolve) => {
              scheduleCallback(BOT_ACTION_REPLAY_INTERVAL * i, () => {
                playBotAction(botId, visibleActions[i]);
                resolve();
              });
            });
          }

          // Wait for last action animation to finish before next bot
          await new Promise((r) =>
            scheduleCallback(
              BOT_ACTION_REPLAY_INTERVAL * visibleActions.length + BOT_BETWEEN_DELAY,
              r as () => void,
            ),
          );
        } catch {
          onBotSkip?.(botId, 'Error');
        }
      }
    };

    void runBotsSequentially();
  }, [turnPhase, turnNumber, botPlayerIds, combatBotTurn, playBotAction, onBotSkip]);
};

export default useBotAI;
export type { BotAction };
