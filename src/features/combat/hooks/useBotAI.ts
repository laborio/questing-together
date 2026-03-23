import { useEffect, useRef } from 'react';
import { scheduleCallback } from '@/features/combat/utils/scheduleCallback';
import type { PlayerId } from '@/types/player';

const BOT_TURN_DELAY = 3000;
const BOT_ACTION_REPLAY_INTERVAL = 1000;

type BotAction = {
  action: 'attack' | 'ability' | 'heal' | 'skip';
  ability?: string;
  damage?: number;
  targetId?: string;
  target?: string;
};

type PlayBotActionFn = (botPlayerId: PlayerId, action: BotAction) => void;

type UseBotAIParams = {
  turnPhase: string;
  turnNumber: number;
  botPlayerIds: PlayerId[];
  combatBotTurn: (botPlayerId: PlayerId) => Promise<unknown>;
  playBotAction: PlayBotActionFn;
};

const useBotAI = ({
  turnPhase,
  turnNumber,
  botPlayerIds,
  combatBotTurn,
  playBotAction,
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

    botPlayerIds.forEach((botId, botIndex) => {
      scheduleCallback(BOT_TURN_DELAY * (botIndex + 1), () => {
        if (currentTurnRef.current !== capturedTurn || currentPhaseRef.current !== 'player') return;

        void combatBotTurn(botId)
          .then((result) => {
            if (!result) return;
            const r = result as { actions: BotAction[] };
            const actions = r.actions ?? [];

            const visibleActions = actions.filter((a) => a.action !== 'skip');
            visibleActions.forEach((action, actionIndex) => {
              scheduleCallback(BOT_ACTION_REPLAY_INTERVAL * actionIndex, () => {
                playBotAction(botId, action);
              });
            });
          })
          .catch(() => {
            // Bot turn failed (e.g. enemy already dead) — ignore silently
          });
      });
    });
  }, [turnPhase, turnNumber, botPlayerIds, combatBotTurn, playBotAction]);
};

export default useBotAI;
export type { BotAction };
