import type { RealtimeChannel } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '@/api/models/character';
import type { Enemy } from '@/api/models/enemy';
import { supabase } from '@/api/supabaseClient';
import type { AdventureScreen, ScreenConfig, ScreenType } from '@/types/adventure';
import type { CombatTurn, PlayerTurnState } from '@/types/combatTurn';
import type { PlayerId, RoleId } from '@/types/player';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { STORY_CONFIG } from '@/utils/storyConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RoomRecord = {
  id: string;
  code: string;
  host_user_id: string;
  status: 'lobby' | 'in_progress' | 'finished';
  target_player_count: number;
  current_screen_position: number;
  current_bloc: number;
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

type RoomPeek = {
  roomId: string;
  status: string;
  playerCount: number;
  takenRoles: RoleId[];
};

type RoomState = {
  room: RoomRecord;
  players: RoomPlayerRecord[];
  characters: Character[];
  enemies: Enemy[];
  currentScreen: AdventureScreen | null;
  combatTurn: CombatTurn | null;
  playerTurnStates: PlayerTurnState[];
};

type MyRoom = {
  roomId: string;
  code: string;
  status: string;
  playerCount: number;
  isHost: boolean;
  hostName: string;
};

type AvailableRoom = {
  roomId: string;
  code: string;
  status: string;
  playerCount: number;
  hostName: string;
};

type UseRoomConnectionResult = {
  room: RoomRecord | null;
  players: RoomPlayerRecord[];
  characters: Character[];
  enemies: Enemy[];
  currentScreen: AdventureScreen | null;
  myRooms: MyRoom[];
  availableRooms: AvailableRoom[];
  isBusy: boolean;
  roomError: string | null;
  createRoom: (displayName: string, roleId: RoleId) => Promise<void>;
  createPlaytest: (
    screenType: ScreenType,
    bloc: number,
    displayName?: string,
    roleId?: RoleId,
    enemyCount?: number,
  ) => Promise<void>;
  joinRoom: (code: string, displayName: string, roleId: RoleId) => Promise<void>;
  rejoinRoom: (roomId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  peekRoom: (code: string) => Promise<RoomPeek | null>;
  startAdventure: () => Promise<void>;
  cancelAdventure: () => Promise<void>;
  advanceScreen: () => Promise<unknown>;
  applyScreenEffect: (hpDelta: number, goldDelta: number, expDelta: number) => Promise<unknown>;
  shopPurchase: (cost: number, hpDelta: number, expDelta: number) => Promise<unknown>;
  restHeal: (restorePercent: number) => Promise<unknown>;
  combatAttack: (enemyId: string) => Promise<unknown>;
  combatAbility: (enemyId: string | null) => Promise<unknown>;
  combatHeal: (targetPlayerId?: PlayerId) => Promise<unknown>;
  combatEndTurn: () => Promise<unknown>;
  combatEnemyPhase: () => Promise<unknown>;
  combatTurn: CombatTurn | null;
  playerTurnStates: PlayerTurnState[];
  leaveRoom: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withSchemaHint(message: string) {
  if (
    message.includes('create_room') ||
    message.includes('function') ||
    message.includes('permission')
  ) {
    return `${message}. Verify Supabase SQL was applied.`;
  }
  return message;
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

async function fetchRoomSnapshot(roomId: string): Promise<RoomRecord | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, code, host_user_id, status, target_player_count, current_screen_position, current_bloc',
    )
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

async function fetchCharacters(roomId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select(
      'id, room_id, player_id, name, level, gold, exp, hp, hp_max, taunt_turns_left, ability_cooldown_left, heal_cooldown_left',
    )
    .eq('room_id', roomId)
    .order('player_id', { ascending: true });

  if (error) return [];
  return (
    (data ?? []) as {
      id: string;
      room_id: string;
      player_id: PlayerId;
      name: string;
      level: number;
      gold: number;
      exp: number;
      hp: number;
      hp_max: number;
      taunt_turns_left: number;
      ability_cooldown_left: number;
      heal_cooldown_left: number;
    }[]
  ).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    playerId: row.player_id,
    name: row.name,
    level: row.level,
    gold: row.gold,
    exp: row.exp,
    hp: row.hp,
    hpMax: row.hp_max,
    tauntTurnsLeft: row.taunt_turns_left,
    abilityCooldownLeft: row.ability_cooldown_left,
    healCooldownLeft: row.heal_cooldown_left,
  }));
}

async function fetchEnemies(roomId: string): Promise<Enemy[]> {
  const { data, error } = await supabase
    .from('enemies')
    .select('id, room_id, position, name, level, hp, hp_max, attack, is_dead')
    .eq('room_id', roomId)
    .order('position', { ascending: true });

  if (error) return [];
  return (
    (data ?? []) as {
      id: string;
      room_id: string;
      position: number;
      name: string;
      level: number;
      hp: number;
      hp_max: number;
      attack: number;
      is_dead: boolean;
    }[]
  ).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    position: row.position,
    name: row.name,
    level: row.level,
    hp: row.hp,
    hpMax: row.hp_max,
    attack: row.attack,
    isDead: row.is_dead,
  }));
}

async function fetchCurrentScreen(
  roomId: string,
  position: number,
): Promise<AdventureScreen | null> {
  const { data, error } = await supabase
    .from('adventure_screens')
    .select(
      'id, room_id, bloc, phase, position, screen_type, config_json, is_completed, result_json',
    )
    .eq('room_id', roomId)
    .eq('position', position)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    roomId: data.room_id as string,
    bloc: data.bloc as number,
    phase: data.phase as AdventureScreen['phase'],
    position: data.position as number,
    screenType: data.screen_type as AdventureScreen['screenType'],
    config: data.config_json as ScreenConfig,
    isCompleted: data.is_completed as boolean,
    resultJson: data.result_json as Record<string, unknown> | null,
  };
}

async function fetchCombatTurn(roomId: string): Promise<CombatTurn | null> {
  const { data, error } = await supabase
    .from('combat_turns')
    .select('id, room_id, screen_id, turn_number, phase')
    .eq('room_id', roomId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    roomId: data.room_id as string,
    screenId: data.screen_id as string,
    turnNumber: data.turn_number as number,
    phase: data.phase as CombatTurn['phase'],
  };
}

async function fetchPlayerTurnStates(roomId: string): Promise<PlayerTurnState[]> {
  const { data, error } = await supabase
    .from('player_turn_state')
    .select(
      'id, combat_turn_id, player_id, actions_remaining, has_ended_turn, combat_turns!inner(room_id)',
    )
    .eq('combat_turns.room_id', roomId);

  if (error || !data) return [];
  return (
    data as {
      id: string;
      combat_turn_id: string;
      player_id: PlayerId;
      actions_remaining: number;
      has_ended_turn: boolean;
    }[]
  ).map((row) => ({
    id: row.id,
    combatTurnId: row.combat_turn_id,
    playerId: row.player_id,
    actionsRemaining: row.actions_remaining,
    hasEndedTurn: row.has_ended_turn,
  }));
}

async function fetchRoomState(roomId: string): Promise<RoomState | null> {
  const [room, players, characters, enemies] = await Promise.all([
    fetchRoomSnapshot(roomId),
    fetchRoomPlayers(roomId),
    fetchCharacters(roomId),
    fetchEnemies(roomId),
  ]);
  if (!room) return null;

  const currentScreen =
    room.status === 'in_progress'
      ? await fetchCurrentScreen(roomId, room.current_screen_position)
      : null;

  const [combatTurn, playerTurnStates] = await Promise.all([
    fetchCombatTurn(roomId),
    fetchPlayerTurnStates(roomId),
  ]);

  return { room, players, characters, enemies, currentScreen, combatTurn, playerTurnStates };
}

async function fetchMyRooms(): Promise<MyRoom[]> {
  const { data, error } = await supabase.rpc('list_my_rooms');
  if (error) return [];
  return (
    (data ?? []) as {
      room_id: string;
      room_code: string;
      room_status: string;
      player_count: number;
      is_host: boolean;
      host_name: string;
    }[]
  ).map((row) => ({
    roomId: row.room_id,
    code: row.room_code,
    status: row.room_status,
    playerCount: row.player_count,
    isHost: row.is_host,
    hostName: row.host_name,
  }));
}

async function fetchAvailableRooms(): Promise<AvailableRoom[]> {
  const { data, error } = await supabase.rpc('list_available_rooms');
  if (error) return [];
  return (
    (data ?? []) as {
      room_id: string;
      room_code: string;
      room_status: string;
      player_count: number;
      host_name: string;
    }[]
  ).map((row) => ({
    roomId: row.room_id,
    code: row.room_code,
    status: row.room_status,
    playerCount: row.player_count,
    hostName: row.host_name,
  }));
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const roomKeys = {
  currentRoomId: ['currentRoomId'] as const,
  roomState: (roomId: string | null) => ['roomState', roomId] as const,
  myRooms: ['myRooms'] as const,
  availableRooms: ['availableRooms'] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRoomConnection(): UseRoomConnectionResult {
  const qc = useQueryClient();
  const [roomError, setRoomError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // No auto-reconnect: user starts on home screen and picks a room
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Fetch user's existing rooms for the join screen
  const { data: myRooms = [] } = useQuery({
    queryKey: roomKeys.myRooms,
    queryFn: fetchMyRooms,
    staleTime: 1000 * 30,
  });

  const { data: availableRooms = [] } = useQuery({
    queryKey: roomKeys.availableRooms,
    queryFn: fetchAvailableRooms,
    staleTime: 1000 * 30,
  });

  // Step 2: Fetch full room state when we have a roomId
  const { data: roomState = null, isFetching: isRoomFetching } = useQuery({
    queryKey: roomKeys.roomState(currentRoomId),
    queryFn: () => (currentRoomId ? fetchRoomState(currentRoomId) : null),
    enabled: currentRoomId !== null,
    staleTime: 1000 * 10,
  });

  const room = roomState?.room ?? null;
  const players = roomState?.players ?? [];
  const characters = roomState?.characters ?? [];
  const enemies = roomState?.enemies ?? [];
  const currentScreen = roomState?.currentScreen ?? null;
  const combatTurn = roomState?.combatTurn ?? null;
  const playerTurnStates = roomState?.playerTurnStates ?? [];

  // Realtime: invalidate room state on DB changes
  useEffect(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!room?.id) return;

    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    };

    channelRef.current = supabase
      .channel(`room-sync-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `room_id=eq.${room.id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enemies', filter: `room_id=eq.${room.id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'adventure_screens',
          filter: `room_id=eq.${room.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combat_turns',
          filter: `room_id=eq.${room.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_turn_state',
        },
        invalidate,
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [qc, room?.id]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const enterRoom = useCallback(
    (newRoomId: string) => {
      setCurrentRoomId(newRoomId);
      void qc.invalidateQueries({ queryKey: roomKeys.roomState(newRoomId) });
      void qc.invalidateQueries({ queryKey: roomKeys.myRooms });
    },
    [qc],
  );

  const clearRoom = useCallback(() => {
    setCurrentRoomId(null);
    qc.removeQueries({ queryKey: roomKeys.roomState(currentRoomId) });
    void qc.invalidateQueries({ queryKey: roomKeys.myRooms });
  }, [qc, currentRoomId]);

  const createRoomMutation = useMutation({
    mutationFn: async ({ displayName, roleId }: { displayName: string; roleId: RoleId }) => {
      const { data, error } = await supabase.rpc('create_room', {
        p_display_name: displayName,
        p_role_id: roleId,
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : null;
      if (!created?.room_id) throw new Error('Room was not created');
      return created.room_id as string;
    },
    onSuccess: (roomId) => enterRoom(roomId),
    onError: (error) =>
      setRoomError(withSchemaHint(getErrorMessage(error, 'Failed to create room'))),
  });

  const createPlaytestMutation = useMutation({
    mutationFn: async ({
      screenType,
      bloc,
      displayName,
      roleId,
      enemyCount,
    }: {
      screenType: ScreenType;
      bloc: number;
      displayName?: string;
      roleId?: RoleId;
      enemyCount?: number;
    }) => {
      const { data, error } = await supabase.rpc('create_playtest', {
        p_screen_type: screenType,
        p_bloc: bloc,
        p_display_name: displayName ?? 'Tester',
        p_role_id: roleId ?? 'warrior',
        p_enemy_count: enemyCount ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('Playtest room was not created');
      return data as string;
    },
    onSuccess: (roomId) => enterRoom(roomId),
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to create playtest')),
  });

  const joinRoomMutation = useMutation({
    mutationFn: async ({
      code,
      displayName,
      roleId,
    }: {
      code: string;
      displayName: string;
      roleId: RoleId;
    }) => {
      const normalizedCode = code.trim().toUpperCase();
      if (!normalizedCode) throw new Error('Enter a room code');
      const { data, error } = await supabase.rpc('join_room', {
        p_code: normalizedCode,
        p_display_name: displayName,
        p_role_id: roleId,
      });
      if (error) throw error;
      if (!data) throw new Error('Could not join room');
      return data as string;
    },
    onSuccess: (roomId) => enterRoom(roomId),
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to join room')),
  });

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) return;
      const { error } = await supabase.rpc('leave_room', { p_room_id: room.id });
      if (error) throw error;
    },
    onSuccess: () => clearRoom(),
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to leave room')),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.rpc('delete_room', { p_room_id: roomId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roomKeys.myRooms });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to delete room')),
  });

  const startAdventureMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) throw new Error('No room');
      const { error } = await supabase.rpc('story_start_adventure', {
        p_room_id: room.id,
        p_start_scene_id: STORY_CONFIG.startSceneId,
      });
      if (error) throw error;
      // Reset combat state and generate adventure
      await supabase.rpc('reset_combat', { p_room_id: room.id });
      await supabase.rpc('generate_adventure', { p_room_id: room.id });
      // Seed enemies for first screen if it's combat
      const { data: firstScreen } = await supabase
        .from('adventure_screens')
        .select('id, screen_type')
        .eq('room_id', room.id)
        .eq('position', 0)
        .maybeSingle();
      if (
        firstScreen &&
        (firstScreen.screen_type === 'combat' || firstScreen.screen_type === 'boss_fight')
      ) {
        await supabase.rpc('seed_enemies_for_screen', {
          p_room_id: room.id,
          p_screen_id: firstScreen.id,
        });
      }
    },
    onSuccess: () => {
      if (room?.id) {
        void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
      }
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to start adventure')),
  });

  const cancelAdventureMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) throw new Error('No room');
      const { error } = await supabase.rpc('cancel_adventure', {
        p_room_id: room.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (room?.id) {
        void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
      }
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to cancel adventure')),
  });

  // ---------------------------------------------------------------------------
  // Combat mutations
  // ---------------------------------------------------------------------------

  const advanceScreenMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('advance_screen', { p_room_id: room.id });
      if (error) throw error;
      return data as { finished: boolean };
    },
    onSuccess: (data) => {
      if (data?.finished) {
        clearRoom();
      } else if (room?.id) {
        void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
      }
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to advance screen')),
  });

  const applyScreenEffectMutation = useMutation({
    mutationFn: async ({
      hpDelta,
      goldDelta,
      expDelta,
    }: {
      hpDelta: number;
      goldDelta: number;
      expDelta: number;
    }) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('apply_screen_effect', {
        p_room_id: room.id,
        p_hp_delta: hpDelta,
        p_gold_delta: goldDelta,
        p_exp_delta: expDelta,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to apply effect')),
  });

  const shopPurchaseMutation = useMutation({
    mutationFn: async ({
      cost,
      hpDelta,
      expDelta,
    }: {
      cost: number;
      hpDelta: number;
      expDelta: number;
    }) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('shop_purchase', {
        p_room_id: room.id,
        p_item_cost: cost,
        p_hp_delta: hpDelta,
        p_exp_delta: expDelta,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to purchase')),
  });

  const restHealMutation = useMutation({
    mutationFn: async (restorePercent: number) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('rest_heal', {
        p_room_id: room.id,
        p_restore_percent: restorePercent,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Failed to rest')),
  });

  const combatAttackMutation = useMutation({
    mutationFn: async (enemyId: string) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('combat_attack', {
        p_room_id: room.id,
        p_enemy_id: enemyId,
      });
      if (error) throw error;
      return data as {
        enemyDamage: number;
        counterDamage: number;
        enemyKilled: boolean;
        xpGained: number;
        goldGained: number;
      };
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Attack failed')),
  });

  const combatAbilityMutation = useMutation({
    mutationFn: async (enemyId: string | null) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('combat_ability', {
        p_room_id: room.id,
        p_enemy_id: enemyId,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Ability failed')),
  });

  const combatHealMutation = useMutation({
    mutationFn: async (targetPlayerId?: PlayerId) => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('combat_heal', {
        p_room_id: room.id,
        p_target_player_id: targetPlayerId ?? null,
      });
      if (error) throw error;
      return data as { targetPlayerId: string; hpRestored: number; newHp: number };
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Heal failed')),
  });

  const combatEndTurnMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('combat_end_turn', { p_room_id: room.id });
      if (error) throw error;
      return data as { allReady: boolean };
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'End turn failed')),
  });

  const combatEnemyPhaseMutation = useMutation({
    mutationFn: async () => {
      if (!room?.id) throw new Error('No room');
      const { data, error } = await supabase.rpc('combat_enemy_phase', { p_room_id: room.id });
      if (error) throw error;
      return data as { partyWiped: boolean; turnNumber: number; attacks: unknown[] };
    },
    onSuccess: () => {
      if (room?.id) void qc.invalidateQueries({ queryKey: roomKeys.roomState(room.id) });
    },
    onError: (error) => setRoomError(getErrorMessage(error, 'Enemy phase failed')),
  });

  // ---------------------------------------------------------------------------
  // peekRoom (standalone, no cache)
  // ---------------------------------------------------------------------------

  const peekRoom = useCallback(async (code: string): Promise<RoomPeek | null> => {
    setRoomError(null);
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setRoomError('Enter a room code');
      return null;
    }
    const { data, error } = await supabase.rpc('peek_room', { p_code: normalizedCode });
    if (error) {
      setRoomError(getErrorMessage(error, 'Failed to peek room'));
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setRoomError('Room not found');
      return null;
    }
    return {
      roomId: row.room_id as string,
      status: row.room_status as string,
      playerCount: row.player_count as number,
      takenRoles: (row.taken_roles ?? []) as RoleId[],
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Stable wrappers
  // ---------------------------------------------------------------------------

  const createRoom = useCallback(
    async (displayName: string, roleId: RoleId) => {
      setRoomError(null);
      await createRoomMutation.mutateAsync({ displayName, roleId });
    },
    [createRoomMutation],
  );

  const createPlaytest = useCallback(
    async (
      screenType: ScreenType,
      bloc: number,
      displayName?: string,
      roleId?: RoleId,
      enemyCount?: number,
    ) => {
      setRoomError(null);
      await createPlaytestMutation.mutateAsync({
        screenType,
        bloc,
        displayName,
        roleId,
        enemyCount,
      });
    },
    [createPlaytestMutation],
  );

  const joinRoom = useCallback(
    async (code: string, displayName: string, roleId: RoleId) => {
      setRoomError(null);
      await joinRoomMutation.mutateAsync({ code, displayName, roleId });
    },
    [joinRoomMutation],
  );

  const leaveRoom = useCallback(async () => {
    setRoomError(null);
    await leaveRoomMutation.mutateAsync();
  }, [leaveRoomMutation]);

  const rejoinRoom = useCallback(
    async (roomId: string) => {
      setRoomError(null);
      enterRoom(roomId);
    },
    [enterRoom],
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      setRoomError(null);
      await deleteRoomMutation.mutateAsync(roomId);
    },
    [deleteRoomMutation],
  );

  const startAdventure = useCallback(async () => {
    setRoomError(null);
    await startAdventureMutation.mutateAsync();
  }, [startAdventureMutation]);

  const cancelAdventure = useCallback(async () => {
    setRoomError(null);
    await cancelAdventureMutation.mutateAsync();
  }, [cancelAdventureMutation]);

  const advanceScreen = useCallback(async () => {
    setRoomError(null);
    return advanceScreenMutation.mutateAsync();
  }, [advanceScreenMutation]);

  const applyScreenEffect = useCallback(
    async (hpDelta: number, goldDelta: number, expDelta: number) => {
      setRoomError(null);
      return applyScreenEffectMutation.mutateAsync({ hpDelta, goldDelta, expDelta });
    },
    [applyScreenEffectMutation],
  );

  const shopPurchase = useCallback(
    async (cost: number, hpDelta: number, expDelta: number) => {
      setRoomError(null);
      return shopPurchaseMutation.mutateAsync({ cost, hpDelta, expDelta });
    },
    [shopPurchaseMutation],
  );

  const restHeal = useCallback(
    async (restorePercent: number) => {
      setRoomError(null);
      return restHealMutation.mutateAsync(restorePercent);
    },
    [restHealMutation],
  );

  const combatAttack = useCallback(
    async (enemyId: string) => {
      setRoomError(null);
      return combatAttackMutation.mutateAsync(enemyId);
    },
    [combatAttackMutation],
  );

  const combatAbility = useCallback(
    async (enemyId: string | null) => {
      setRoomError(null);
      return combatAbilityMutation.mutateAsync(enemyId);
    },
    [combatAbilityMutation],
  );

  const combatHeal = useCallback(
    async (targetPlayerId?: PlayerId) => {
      setRoomError(null);
      return combatHealMutation.mutateAsync(targetPlayerId);
    },
    [combatHealMutation],
  );

  const combatEndTurn = useCallback(async () => {
    setRoomError(null);
    return combatEndTurnMutation.mutateAsync();
  }, [combatEndTurnMutation]);

  const combatEnemyPhase = useCallback(async () => {
    setRoomError(null);
    return combatEnemyPhaseMutation.mutateAsync();
  }, [combatEnemyPhaseMutation]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const isBusy =
    isRoomFetching ||
    createRoomMutation.isPending ||
    createPlaytestMutation.isPending ||
    joinRoomMutation.isPending ||
    leaveRoomMutation.isPending ||
    startAdventureMutation.isPending ||
    cancelAdventureMutation.isPending ||
    advanceScreenMutation.isPending ||
    deleteRoomMutation.isPending;

  return useMemo(
    () => ({
      room,
      players,
      characters,
      enemies,
      currentScreen,
      combatTurn,
      playerTurnStates,
      myRooms,
      availableRooms,
      isBusy,
      roomError,
      createRoom,
      createPlaytest,
      joinRoom,
      rejoinRoom,
      deleteRoom,
      peekRoom,
      startAdventure,
      cancelAdventure,
      advanceScreen,
      applyScreenEffect,
      shopPurchase,
      restHeal,
      combatAttack,
      combatAbility,
      combatHeal,
      combatEndTurn,
      combatEnemyPhase,
      leaveRoom,
    }),
    [
      room,
      players,
      characters,
      enemies,
      currentScreen,
      combatTurn,
      playerTurnStates,
      myRooms,
      availableRooms,
      isBusy,
      roomError,
      createRoom,
      createPlaytest,
      joinRoom,
      rejoinRoom,
      deleteRoom,
      peekRoom,
      startAdventure,
      cancelAdventure,
      advanceScreen,
      applyScreenEffect,
      shopPurchase,
      restHeal,
      combatAttack,
      combatAbility,
      combatHeal,
      combatEndTurn,
      combatEnemyPhase,
      leaveRoom,
    ],
  );
}
