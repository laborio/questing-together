import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  initialSceneChat,
  MAX_CHAT_CHARACTERS_PER_MESSAGE,
  MAX_CHAT_MESSAGES_PER_SCENE,
} from '@/src/game/constants';
import { PartyChatMessage, PlayerId } from '@/src/game/types';
import { supabase } from '@/src/online/supabase-client';

type UsePartyChatOptions = {
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

function toPartyChatMessage(row: RoomMessageRow): PartyChatMessage {
  return {
    id: `rm-${row.id}`,
    kind: row.kind === 'player' ? 'player' : 'separator',
    playerId: row.player_id ?? undefined,
    sceneId: row.scene_id ?? undefined,
    text: row.text,
  };
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

function normalizeOutgoingMessage(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function usePartyChat({ localPlayerId, roomId, currentSceneId }: UsePartyChatOptions) {
  const [messages, setMessages] = useState<PartyChatMessage[]>(initialSceneChat);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);

  const isChatOpenRef = useRef(isChatOpen);
  const currentSceneIdRef = useRef<string | null>(currentSceneId);
  const lastMessageIdRef = useRef(0);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    currentSceneIdRef.current = currentSceneId;
  }, [currentSceneId]);

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  const normalizedInput = useMemo(() => normalizeOutgoingMessage(chatInput), [chatInput]);
  const inputLength = normalizedInput.length;

  const messagesUsedThisScene = useMemo(() => {
    if (!currentSceneId) return 0;
    return messages.reduce((count, message) => {
      if (message.kind !== 'player') return count;
      if (message.playerId !== localPlayerId) return count;
      if (message.sceneId !== currentSceneId) return count;
      return count + 1;
    }, 0);
  }, [currentSceneId, localPlayerId, messages]);

  const messagesRemainingThisScene = Math.max(0, MAX_CHAT_MESSAGES_PER_SCENE - messagesUsedThisScene);
  const canSend =
    Boolean(normalizedInput) &&
    inputLength <= MAX_CHAT_CHARACTERS_PER_MESSAGE &&
    messagesRemainingThisScene > 0 &&
    (!roomId || Boolean(currentSceneId));

  useEffect(() => {
    if (!roomId || !currentSceneId) {
      setMessages(initialSceneChat);
      setChatUnreadCount(0);
      setChatError(null);
      lastMessageIdRef.current = 0;
      return;
    }

    let isMounted = true;
    setChatError(null);
    lastMessageIdRef.current = 0;

    const appendRows = (rows: RoomMessageRow[]) => {
      if (!rows.length) return;
      const scopedRows = rows.filter((row) => row.scene_id === currentSceneIdRef.current);
      if (!scopedRows.length) return;

      const mapped = scopedRows.map(toPartyChatMessage);
      const maxId = scopedRows.reduce((maxId, row) => (row.id > maxId ? row.id : maxId), lastMessageIdRef.current);
      lastMessageIdRef.current = maxId;

      setMessages((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const next = mapped.filter((item) => !existing.has(item.id));
        return next.length ? [...prev, ...next] : prev;
      });
    };

    const channel = supabase
      .channel(`room-board-${roomId}-${currentSceneId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as RoomMessageRow;
          if (row.scene_id !== currentSceneIdRef.current) return;

          const message = toPartyChatMessage(row);
          const newId = Number(String(message.id).replace('rm-', ''));
          if (Number.isFinite(newId)) {
            lastMessageIdRef.current = Math.max(lastMessageIdRef.current, newId);
          }
          if (!isMounted) return;

          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
          if (!isChatOpenRef.current) {
            setChatUnreadCount((count) => count + 1);
          }
        }
      )
      .subscribe();

    const loadInitialRoomMessages = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('id, kind, player_id, scene_id, text')
        .eq('room_id', roomId)
        .eq('scene_id', currentSceneId)
        .order('id', { ascending: true })
        .limit(200);

      if (!isMounted) return;
      if (error) {
        setChatError(getErrorMessage(error, 'Failed to load room board'));
        return;
      }

      const rows = (data ?? []) as RoomMessageRow[];
      const mapped = rows.map(toPartyChatMessage);
      const maxId = rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
      lastMessageIdRef.current = maxId;
      setMessages(mapped.length ? mapped : initialSceneChat);
      setChatError(null);
    };

    const pollNewMessages = async () => {
      const sceneId = currentSceneIdRef.current;
      if (!sceneId) return;
      const { data, error } = await supabase
        .from('room_messages')
        .select('id, kind, player_id, scene_id, text')
        .eq('room_id', roomId)
        .eq('scene_id', sceneId)
        .gt('id', lastMessageIdRef.current)
        .order('id', { ascending: true })
        .limit(50);

      if (!isMounted) return;
      if (error) {
        setChatError(getErrorMessage(error, 'Failed to sync room board'));
        return;
      }

      appendRows((data ?? []) as RoomMessageRow[]);
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
  }, [roomId, currentSceneId]);

  const sendChatMessage = useCallback(async () => {
    const outgoingText = normalizedInput;
    if (!outgoingText) return;
    if (outgoingText.length > MAX_CHAT_CHARACTERS_PER_MESSAGE) {
      setChatError(`Note is too long (${outgoingText.length}/${MAX_CHAT_CHARACTERS_PER_MESSAGE}).`);
      return;
    }
    if (messagesRemainingThisScene <= 0) {
      setChatError('Board note limit reached for this node.');
      return;
    }

    if (roomId) {
      if (!currentSceneId) {
        setChatError('Room board is waiting for the active node.');
        return;
      }

      const { data: insertedId, error } = await supabase.rpc('send_room_message', {
        p_room_id: roomId,
        p_scene_id: currentSceneId,
        p_text: outgoingText,
      });

      if (error) {
        setChatError(getErrorMessage(error, 'Failed to send board note'));
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
          const message = toPartyChatMessage(rowData as RoomMessageRow);
          const newId = Number(String(message.id).replace('rm-', ''));
          if (Number.isFinite(newId)) {
            lastMessageIdRef.current = Math.max(lastMessageIdRef.current, newId);
          }
          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        }
      }

      setChatError(null);
      setChatInput('');
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `chat-${Date.now()}`,
        kind: 'player',
        playerId: localPlayerId,
        sceneId: currentSceneId ?? 'local-scene',
        text: outgoingText,
      },
    ]);

    if (!isChatOpen) {
      setChatUnreadCount((count) => count + 1);
    }

    setChatInput('');
  }, [currentSceneId, isChatOpen, localPlayerId, messagesRemainingThisScene, normalizedInput, roomId]);

  useEffect(() => {
    if (!isChatOpen) return;
    setChatUnreadCount(0);
  }, [isChatOpen]);

  return {
    messages,
    chatError,
    chatInput,
    setChatInput,
    inputLength,
    canSend,
    messagesUsedThisScene,
    messagesRemainingThisScene,
    maxMessagesPerScene: MAX_CHAT_MESSAGES_PER_SCENE,
    maxCharactersPerMessage: MAX_CHAT_CHARACTERS_PER_MESSAGE,
    isChatOpen,
    chatUnreadCount,
    openChat,
    closeChat,
    sendChatMessage,
  };
}
