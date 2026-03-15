import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/api/supabase-client';
import { MAX_PARTY_EMOTES_PER_SCENE, PARTY_EMOTES } from '@/constants/constants';
import type { EmoteText, PartyEmote, PlayerId } from '@/types/player';

type UsePartyEmotesOptions = {
  localPlayerId: PlayerId;
  roomId: string | null;
  currentSceneId: string | null;
};

type RoomMessageRow = {
  id: number;
  kind: 'player' | 'separator' | 'system';
  player_id: PlayerId | null;
  scene_id: string | null;
  text: string;
};

const partyEmoteSet = new Set<string>(PARTY_EMOTES);
const legacyRpcMissingPattern = /send_room_emote/i;

function normalizeEmoteErrorMessage(message: string) {
  if (/emote limit reached for this scene/i.test(message)) {
    return 'No emotes left for this scene.';
  }
  if (/mind-bond message limit reached for this scene/i.test(message)) {
    return 'No emotes left for this scene.';
  }
  if (/message cannot be empty/i.test(message)) {
    return 'Choose an emote first.';
  }
  if (/message exceeds 30 characters/i.test(message)) {
    return 'That emote is not valid.';
  }
  return message;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; details?: unknown; hint?: unknown };
    const message = typeof maybe.message === 'string' ? maybe.message : null;
    const details = typeof maybe.details === 'string' ? maybe.details : null;
    const hint = typeof maybe.hint === 'string' ? maybe.hint : null;
    const combined = [message, details, hint].filter(Boolean).join(' | ');
    if (combined) return combined;
  }
  return fallback;
}

async function sendEmoteRpc(roomId: string, sceneId: string, emote: EmoteText) {
  const preferred = await supabase.rpc('send_room_emote', {
    p_room_id: roomId,
    p_scene_id: sceneId,
    p_emote: emote,
  });

  if (!preferred.error) return preferred;

  const preferredMessage = getErrorMessage(preferred.error, 'Failed to send emote');
  if (!legacyRpcMissingPattern.test(preferredMessage)) {
    return preferred;
  }

  return supabase.rpc('send_room_message', {
    p_room_id: roomId,
    p_scene_id: sceneId,
    p_text: emote,
  });
}

function normalizeEmote(input: string): EmoteText | null {
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (!partyEmoteSet.has(normalized)) return null;
  return normalized as EmoteText;
}

function toPartyEmote(row: RoomMessageRow): PartyEmote | null {
  if (row.kind !== 'player' || !row.player_id) return null;
  const text = normalizeEmote(row.text);
  if (!text) return null;

  return {
    id: `rm-${row.id}`,
    playerId: row.player_id,
    sceneId: row.scene_id ?? undefined,
    text,
  };
}

export function usePartyEmotes({ localPlayerId, roomId, currentSceneId }: UsePartyEmotesOptions) {
  const [messages, setMessages] = useState<PartyEmote[]>([]);
  const [visibleEmotes, setVisibleEmotes] = useState<PartyEmote[]>([]);
  const [emoteError, setEmoteError] = useState<string | null>(null);
  const lastMessageIdRef = useRef(0);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const emotesUsedThisScene = useMemo(() => {
    if (!currentSceneId) return 0;
    return messages.reduce((count, message) => {
      if (message.playerId !== localPlayerId) return count;
      if (message.sceneId !== currentSceneId) return count;
      return count + 1;
    }, 0);
  }, [currentSceneId, localPlayerId, messages]);

  const emotesRemainingThisScene = Math.max(0, MAX_PARTY_EMOTES_PER_SCENE - emotesUsedThisScene);

  const appendRows = useCallback((rows: RoomMessageRow[], shouldToast: boolean) => {
    if (!rows.length) return;

    const mapped = rows
      .map(toPartyEmote)
      .filter((message): message is PartyEmote => Boolean(message));
    const maxId = rows.reduce(
      (maxId, row) => (row.id > maxId ? row.id : maxId),
      lastMessageIdRef.current,
    );
    lastMessageIdRef.current = maxId;

    if (!mapped.length) return;

    const next = mapped.filter((item) => !knownMessageIdsRef.current.has(item.id));
    if (!next.length) return;

    next.forEach((item) => {
      knownMessageIdsRef.current.add(item.id);
    });

    setMessages((prev) => [...prev, ...next]);

    if (shouldToast) {
      setVisibleEmotes((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const toastable = next.filter((item) => !existing.has(item.id));
        return toastable.length ? [...prev, ...toastable] : prev;
      });
    }
  }, []);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setVisibleEmotes([]);
      setEmoteError(null);
      lastMessageIdRef.current = 0;
      knownMessageIdsRef.current = new Set();
      return;
    }

    let isMounted = true;
    setEmoteError(null);

    const channel = supabase
      .channel(`room-emotes-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const insertedRow = payload.new as RoomMessageRow;
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, insertedRow.id);
          if (!isMounted) return;
          appendRows([insertedRow], true);
        },
      )
      .subscribe();

    const loadInitialRoomMessages = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('id, kind, player_id, scene_id, text')
        .eq('room_id', roomId)
        .order('id', { ascending: true })
        .limit(250);

      if (!isMounted) return;
      if (error) {
        setEmoteError(getErrorMessage(error, 'Failed to load emotes'));
        return;
      }

      const rows = (data ?? []) as RoomMessageRow[];
      const initialMessages = rows
        .map(toPartyEmote)
        .filter((message): message is PartyEmote => Boolean(message));
      lastMessageIdRef.current = rows.reduce((maxId, row) => (row.id > maxId ? row.id : maxId), 0);
      knownMessageIdsRef.current = new Set(initialMessages.map((message) => message.id));
      setMessages(initialMessages);
      setEmoteError(null);
    };

    const pollNewMessages = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('id, kind, player_id, scene_id, text')
        .eq('room_id', roomId)
        .gt('id', lastMessageIdRef.current)
        .order('id', { ascending: true })
        .limit(50);

      if (!isMounted) return;
      if (error) {
        setEmoteError(getErrorMessage(error, 'Failed to sync emotes'));
        return;
      }

      appendRows((data ?? []) as RoomMessageRow[], true);
    };

    void loadInitialRoomMessages();
    const pollTimer = setInterval(() => {
      void pollNewMessages();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [appendRows, roomId]);

  const sendEmote = useCallback(
    async (emote: EmoteText) => {
      setEmoteError(null);

      if (emotesRemainingThisScene <= 0) {
        setEmoteError('No emotes left for this scene.');
        return;
      }

      if (roomId) {
        if (!currentSceneId) {
          setEmoteError('Emotes unlock when the scene is active.');
          return;
        }

        const { data: insertedId, error } = await sendEmoteRpc(roomId, currentSceneId, emote);

        if (error) {
          setEmoteError(normalizeEmoteErrorMessage(getErrorMessage(error, 'Failed to send emote')));
          return;
        }

        const numericInsertedId =
          typeof insertedId === 'number'
            ? insertedId
            : typeof insertedId === 'string'
              ? Number.parseInt(insertedId, 10)
              : Number.NaN;

        if (Number.isFinite(numericInsertedId)) {
          const { data: rowData, error: rowError } = await supabase
            .from('room_messages')
            .select('id, kind, player_id, scene_id, text')
            .eq('id', numericInsertedId)
            .maybeSingle();

          if (!rowError && rowData) {
            appendRows([rowData as RoomMessageRow], true);
          }
        }

        setEmoteError(null);
        return;
      }

      const localEmote: PartyEmote = {
        id: `local-emote-${Date.now()}`,
        playerId: localPlayerId,
        sceneId: currentSceneId ?? 'local-scene',
        text: emote,
      };

      setMessages((prev) => [...prev, localEmote]);
      setVisibleEmotes((prev) => [...prev, localEmote]);
    },
    [appendRows, currentSceneId, emotesRemainingThisScene, localPlayerId, roomId],
  );

  const clearVisibleEmote = useCallback((id: string) => {
    setVisibleEmotes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    visibleEmotes,
    emoteError,
    emotesUsedThisScene,
    emotesRemainingThisScene,
    sendEmote,
    clearVisibleEmote,
  };
}
