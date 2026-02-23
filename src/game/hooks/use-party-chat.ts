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
  currentSceneTitle: string | null;
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

export function usePartyChat({ localPlayerId, roomId, currentSceneId, currentSceneTitle }: UsePartyChatOptions) {
  const [messages, setMessages] = useState<PartyChatMessage[]>(initialSceneChat);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);

  const isChatOpenRef = useRef(isChatOpen);
  const lastMessageIdRef = useRef(0);
  const lastAnnouncedSceneRef = useRef<string | null>(null);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

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
    if (!roomId) {
      setMessages(initialSceneChat);
      setChatUnreadCount(0);
      setChatError(null);
      lastMessageIdRef.current = 0;
      lastAnnouncedSceneRef.current = null;
      return;
    }

    let isMounted = true;
    setChatError(null);

    const appendRows = (rows: RoomMessageRow[]) => {
      if (!rows.length) return;
      const mapped = rows.map(toPartyChatMessage);
      const maxId = rows.reduce((maxId, row) => (row.id > maxId ? row.id : maxId), lastMessageIdRef.current);
      lastMessageIdRef.current = maxId;

      setMessages((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const next = mapped.filter((item) => !existing.has(item.id));
        return next.length ? [...prev, ...next] : prev;
      });
    };

    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = toPartyChatMessage(payload.new as RoomMessageRow);
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
        .order('id', { ascending: true })
        .limit(250);

      if (!isMounted) return;
      if (error) {
        setChatError(getErrorMessage(error, 'Failed to load chat'));
        return;
      }

      const mapped = (data as RoomMessageRow[]).map(toPartyChatMessage);
      const maxId = (data as RoomMessageRow[]).reduce((max, row) => (row.id > max ? row.id : max), 0);
      lastMessageIdRef.current = maxId;
      setMessages(mapped.length ? mapped : initialSceneChat);
      setChatError(null);
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
        setChatError(getErrorMessage(error, 'Failed to sync chat'));
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
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !currentSceneId) return;

    if (lastAnnouncedSceneRef.current === currentSceneId) return;
    lastAnnouncedSceneRef.current = currentSceneId;

    const sceneMessageId = `scene-${roomId}-${currentSceneId}`;
    const sceneLabel = currentSceneTitle ? currentSceneTitle.replace(/^Scene \d+:\s*/i, '') : currentSceneId;

    setMessages((prev) => {
      if (prev.some((item) => item.id === sceneMessageId)) return prev;
      return [
        ...prev,
        {
          id: sceneMessageId,
          kind: 'separator',
          text: `Scene changed: ${sceneLabel}`,
        },
      ];
    });

    if (!isChatOpenRef.current) {
      setChatUnreadCount((count) => count + 1);
    }
  }, [currentSceneId, currentSceneTitle, roomId]);

  const sendChatMessage = useCallback(async () => {
    const outgoingText = normalizedInput;
    if (!outgoingText) return;
    if (outgoingText.length > MAX_CHAT_CHARACTERS_PER_MESSAGE) {
      setChatError(`Message is too long (${outgoingText.length}/${MAX_CHAT_CHARACTERS_PER_MESSAGE}).`);
      return;
    }
    if (messagesRemainingThisScene <= 0) {
      setChatError('Mind-link drained for this scene. No messages left.');
      return;
    }

    if (roomId) {
      if (!currentSceneId) {
        setChatError('Mind-link not ready. Wait for the active scene.');
        return;
      }

      const { data: insertedId, error } = await supabase.rpc('send_room_message', {
        p_room_id: roomId,
        p_scene_id: currentSceneId,
        p_text: outgoingText,
      });

      if (error) {
        setChatError(getErrorMessage(error, 'Failed to send chat message'));
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
