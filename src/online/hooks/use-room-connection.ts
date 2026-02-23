import { useCallback, useEffect, useMemo, useState } from 'react';

import { RealtimeChannel } from '@supabase/supabase-js';

import { PlayerId, RoleId } from '@/src/game/types';
import { supabase } from '@/src/online/supabase-client';
import { STORY_START_SCENE_ID } from '@/src/story/story';

type RoomRecord = {
  id: string;
  code: string;
  host_user_id: string;
  status: 'lobby' | 'in_progress' | 'finished';
};

type RoomPlayerRecord = {
  id: string;
  room_id: string;
  player_id: PlayerId;
  user_id: string;
  role_id: RoleId | null;
  display_name: string | null;
  is_connected: boolean;
};

type UseRoomConnectionResult = {
  room: RoomRecord | null;
  players: RoomPlayerRecord[];
  isBusy: boolean;
  roomError: string | null;
  createRoom: (playerId: PlayerId) => Promise<void>;
  joinRoom: (code: string, playerId: PlayerId) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  selectRole: (roleId: RoleId) => Promise<void>;
  startAdventure: () => Promise<void>;
  leaveRoom: () => Promise<void>;
};

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

function withSchemaHint(message: string) {
  if (message.includes('create_room') || message.includes('function') || message.includes('permission')) {
    return `${message}. Verify Supabase SQL was applied (docs/sql/supabase-schema.sql or docs/sql/supabase-pivot-migration.sql).`;
  }
  return message;
}

async function fetchRoomSnapshot(roomId: string): Promise<RoomRecord | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, code, host_user_id, status')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  return (data as RoomRecord | null) ?? null;
}

async function fetchRoomPlayers(roomId: string): Promise<RoomPlayerRecord[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select('id, room_id, player_id, user_id, role_id, display_name, is_connected')
    .eq('room_id', roomId)
    .order('player_id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as RoomPlayerRecord[];
}

async function loadJoinedRoomIdForCurrentUser(): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('room_players')
    .select('room_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.room_id as string | undefined) ?? null;
}

export function useRoomConnection(): UseRoomConnectionResult {
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRecord[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refreshRoomState = useCallback(async (roomId: string) => {
    const [nextRoom, nextPlayers] = await Promise.all([fetchRoomSnapshot(roomId), fetchRoomPlayers(roomId)]);

    if (!nextRoom) {
      setRoom(null);
      setPlayers([]);
      return;
    }

    setRoom(nextRoom);
    setPlayers(nextPlayers);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const joinedRoomId = await loadJoinedRoomIdForCurrentUser();
        if (!mounted || !joinedRoomId) return;
        await refreshRoomState(joinedRoomId);
      } catch (error) {
        if (!mounted) return;
        setRoomError(getErrorMessage(error, 'Failed to load room'));
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void bootstrap();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshRoomState]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    if (!room?.id) return;

    channel = supabase
      .channel(`room-sync-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        () => {
          void refreshRoomState(room.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        () => {
          void refreshRoomState(room.id);
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refreshRoomState, room?.id]);

  const createRoom = useCallback(
    async (playerId: PlayerId) => {
      setIsBusy(true);
      setRoomError(null);

      try {
        const { data, error } = await supabase.rpc('create_room', { p_player_id: playerId });
        if (error) throw error;

        const created = Array.isArray(data) ? data[0] : null;
        if (!created?.room_id) {
          throw new Error('Room was not created');
        }

        await refreshRoomState(created.room_id as string);
      } catch (error) {
        setRoomError(withSchemaHint(getErrorMessage(error, 'Failed to create room')));
      } finally {
        setIsBusy(false);
      }
    },
    [refreshRoomState]
  );

  const joinRoom = useCallback(
    async (code: string, playerId: PlayerId) => {
      setIsBusy(true);
      setRoomError(null);

      try {
        const normalizedCode = code.trim().toUpperCase();
        if (!normalizedCode) {
          throw new Error('Enter a room code');
        }

        const { data, error } = await supabase.rpc('join_room', {
          p_code: normalizedCode,
          p_player_id: playerId,
        });

        if (error) throw error;
        if (!data) {
          throw new Error('Could not join room');
        }

        await refreshRoomState(data as string);
      } catch (error) {
        setRoomError(getErrorMessage(error, 'Failed to join room'));
      } finally {
        setIsBusy(false);
      }
    },
    [refreshRoomState]
  );

  const setDisplayName = useCallback(
    async (displayName: string) => {
      if (!room?.id) return;
      setIsBusy(true);
      setRoomError(null);

      try {
        const { error } = await supabase.rpc('story_set_display_name', {
          p_room_id: room.id,
          p_display_name: displayName,
        });
        if (error) throw error;
        await refreshRoomState(room.id);
      } catch (error) {
        setRoomError(getErrorMessage(error, 'Failed to set display name'));
      } finally {
        setIsBusy(false);
      }
    },
    [refreshRoomState, room?.id]
  );

  const leaveRoom = useCallback(async () => {
    if (!room?.id) return;

    setIsBusy(true);
    setRoomError(null);

    try {
      const { error } = await supabase.rpc('leave_room', { p_room_id: room.id });
      if (error) throw error;

      setRoom(null);
      setPlayers([]);
    } catch (error) {
      setRoomError(getErrorMessage(error, 'Failed to leave room'));
    } finally {
      setIsBusy(false);
    }
  }, [room?.id]);

  const selectRole = useCallback(
    async (roleId: RoleId) => {
      if (!room?.id) return;

      setIsBusy(true);
      setRoomError(null);
      try {
        const { error } = await supabase.rpc('story_select_role', {
          p_room_id: room.id,
          p_role_id: roleId,
        });
        if (error) throw error;
        await refreshRoomState(room.id);
      } catch (error) {
        setRoomError(getErrorMessage(error, 'Failed to pick role'));
      } finally {
        setIsBusy(false);
      }
    },
    [refreshRoomState, room?.id]
  );

  const startAdventure = useCallback(async () => {
    if (!room?.id) return;

    setIsBusy(true);
    setRoomError(null);
    try {
      const { error } = await supabase.rpc('story_start_adventure', {
        p_room_id: room.id,
        p_start_scene_id: STORY_START_SCENE_ID,
      });
      if (error) throw error;
      await refreshRoomState(room.id);
    } catch (error) {
      setRoomError(getErrorMessage(error, 'Failed to start adventure'));
    } finally {
      setIsBusy(false);
    }
  }, [refreshRoomState, room?.id]);

  return useMemo(
    () => ({
      room,
      players,
      isBusy,
      roomError,
      createRoom,
      joinRoom,
      setDisplayName,
      selectRole,
      startAdventure,
      leaveRoom,
    }),
    [room, players, isBusy, roomError, createRoom, joinRoom, setDisplayName, selectRole, startAdventure, leaveRoom]
  );
}
