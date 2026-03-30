import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import type { PlayerId } from '@/types/player';

type CombatActionEvent = {
  playerId: PlayerId;
  playerName: string;
  actionType: 'spell' | 'convergence';
  damage: number;
  spellName?: string;
  effectType?: string;
  roll?: number;
  rollLabel?: string;
};

type OnAllyActionFn = (event: CombatActionEvent) => void;

type UseCombatBroadcastParams = {
  roomId: string | null;
  localPlayerId: PlayerId | null;
  onAllyAction: OnAllyActionFn;
};

const useCombatBroadcast = ({ roomId, localPlayerId, onAllyAction }: UseCombatBroadcastParams) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onAllyActionRef = useRef(onAllyAction);
  onAllyActionRef.current = onAllyAction;

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`combat-actions-${roomId}`);

    channel.on('broadcast', { event: 'combat-action' }, (payload) => {
      const event = payload.payload as CombatActionEvent;
      // Ignore own actions
      if (event.playerId === localPlayerId) return;
      onAllyActionRef.current(event);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, localPlayerId]);

  const broadcastAction = useCallback((event: CombatActionEvent) => {
    const channel = channelRef.current;

    if (!channel) return;

    void channel.send({
      type: 'broadcast',
      event: 'combat-action',
      payload: event,
    });
  }, []);

  return { broadcastAction };
};

export default useCombatBroadcast;
export type { CombatActionEvent };
