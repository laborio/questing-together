import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EVIDENCE_CONFIRMATION_COUNT, playerNameById, players } from '@/src/game/constants';
import { PlayerId, RoleId } from '@/src/game/types';
import { supabase } from '@/src/online/supabase-client';
import {
  ActionId,
  CombatAction,
  NO_REACTION_ACTION_ID,
  OptionId,
  Scene,
  SceneId,
  applyTagSet,
  getStoryRuntime,
  isCombatActionAvailable,
  matchesTagCondition,
  resolveCombatActionEffect,
  resolveNextSceneId,
} from '@/src/story/story';

type RoomEventRow = {
  id: number;
  type: string;
  payload_json: unknown;
  created_at: string;
};

type SceneActionPayload = {
  eventId: number;
  sceneId: SceneId;
  stepId: string;
  actionId: ActionId;
  playerId: PlayerId;
};

type OptionConfirmPayload = {
  sceneId: SceneId;
  optionId: OptionId;
  playerId: PlayerId;
  nextSceneId: SceneId | null;
};

type SceneResolvePayload = {
  sceneId: SceneId;
  optionId: OptionId;
  mode: 'majority' | 'random' | 'combat' | 'timed';
  nextSceneId: SceneId | null;
};

type SceneContinuePayload = {
  sceneId: SceneId;
  playerId: PlayerId;
};

type SceneAdvancePayload = {
  sceneId: SceneId;
  optionId: OptionId;
  nextSceneId: SceneId | null;
};

type SceneTimerPayload = {
  sceneId: SceneId;
  stepId: string;
  endAt: string;
  durationSeconds: number;
};

type SceneConfirmedVotes = Partial<Record<PlayerId, OptionId>>;
type SceneContinuedBy = Partial<Record<PlayerId, boolean>>;
type SceneActionsByStep = Partial<Record<string, SceneActionPayload[]>>;

type StoryReduction = {
  currentSceneId: SceneId;
  sceneSequence: SceneId[];
  sceneEnteredAtByScene: Partial<Record<SceneId, string>>;
  actionsBySceneStep: Partial<Record<SceneId, SceneActionsByStep>>;
  confirmedVotesByScene: Partial<Record<SceneId, SceneConfirmedVotes>>;
  resolvedOptionByScene: Partial<Record<SceneId, OptionId>>;
  resolutionModeByScene: Partial<Record<SceneId, 'majority' | 'random' | 'combat' | 'timed'>>;
  continuedByScene: Partial<Record<SceneId, SceneContinuedBy>>;
  timersByScene: Partial<Record<SceneId, SceneTimerPayload>>;
};

type SceneHistoryItem = {
  sceneId: SceneId;
  sceneTitle: string;
  optionId: OptionId;
  outcomeText: string;
};

type JournalEntry =
  | { id: string; kind: 'transition'; text: string }
  | { id: string; kind: 'narration'; text: string }
  | { id: string; kind: 'npc'; speaker: string; text: string; aside?: string; narration?: string }
  | { id: string; kind: 'player'; speaker: string; lines: string[]; stage?: string; narration?: string }
  | {
      id: string;
      kind: 'combat_summary';
      combatState: CombatState;
      combatLog: { id: string; text: string }[];
    };

type CombatOutcome = 'victory' | 'defeat' | 'escape';

type CombatRoundLog = {
  round: number;
  partyDamage: number;
  enemyDamage: number;
  block: number;
  enemyAttack: number;
  runVotes: number;
  summary: string;
};

type CombatState = {
  partyHp: number;
  partyHpMax: number;
  enemyHp: number;
  enemyHpMax: number;
  enemyName: string;
  round: number;
  outcome: CombatOutcome | null;
  allowRun: boolean;
  roundLog: CombatRoundLog[];
};

type UseRoomStoryOptions = {
  roomId: string | null;
  localPlayerId: PlayerId;
  localRole: RoleId | null;
  isHost?: boolean;
  playerCount?: number;
  playerDisplayNameById?: Partial<Record<PlayerId, string>>;
  playerRoleById?: Partial<Record<PlayerId, RoleId | null>>;
};

type UseRoomStoryResult = {
  isReady: boolean;
  storyError: string | null;
  currentScene: Scene;
  journalEntries: JournalEntry[];
  combatLog: { id: string; text: string }[];
  combatState: CombatState | null;
  isCombatScene: boolean;
  isTimedScene: boolean;
  partyHp: number;
  partyHpMax: number;
  timedStatusText: string | null;
  timedEndsAt: string | null;
  timedAllowEarly: boolean;
  timedWaitingText: string | null;
  phaseLabel: string;
  phaseStatusText: string;
  availableActions: { id: string; text: string; isDisabled?: boolean; hpDelta?: number; effectText?: string }[];
  localSelectedActionId: string | null;
  canAct: boolean;
  allowSkip: boolean;
  visibleOptions: Scene['options'];
  hiddenOptionCount: number;
  riskyUnlockedOptionIds: Set<OptionId>;
  localConfirmedOption: OptionId | null;
  voteCounts: Record<OptionId, number>;
  confirmedVoteCount: number;
  resolvedOption: OptionId | null;
  resolutionMode: 'majority' | 'random' | 'combat' | 'timed' | null;
  localHasContinued: boolean;
  continuedCount: number;
  continuedByPlayerId: Partial<Record<PlayerId, boolean>>;
  isStoryEnded: boolean;
  canVote: boolean;
  voteLockReason: string | null;
  expectedPlayerCount: number;
  sceneHistory: SceneHistoryItem[];
  takeAction: (actionId: string) => void;
  skipAction: () => void;
  confirmOption: (optionId: OptionId) => void;
  continueToNextScene: () => void;
  finishTimedScene: (force?: boolean) => void;
  resetStory: () => void;
};

const OPTION_ID_SET = new Set<OptionId>(['A', 'B', 'C']);
const ACTION_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const COMBAT_ROUND_PREFIX = 'combat_round_';
const DEFAULT_COMBAT_CONFIG = { partyHp: 30, actions: [] as CombatAction[] };
const roleLabelById: Record<RoleId, string> = {
  warrior: 'Warrior',
  sage: 'Sage',
  ranger: 'Ranger',
};

function mergeRoomEvents(currentEvents: RoomEventRow[], incomingEvents: RoomEventRow[]) {
  if (!incomingEvents.length) return currentEvents;

  const byId = new Map<number, RoomEventRow>();
  currentEvents.forEach((event) => {
    byId.set(event.id, event);
  });

  let hasNewEvent = false;
  incomingEvents.forEach((event) => {
    if (!byId.has(event.id)) {
      hasNewEvent = true;
    }
    byId.set(event.id, event);
  });

  if (!hasNewEvent && byId.size === currentEvents.length) {
    return currentEvents;
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

function extractQuotedLines(text: string) {
  const lines: string[] = [];
  text.replace(/"([^"]+)"/g, (_, line: string) => {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
    return '';
  });
  return lines;
}

function cleanSceneTitle(title: string) {
  return title
    .replace(/^\d+\.\s*/i, '')
    .replace(/^Scene\\s*\\d+:\\s*/i, '')
    .replace(/^Fin\.\s*/i, '')
    .replace(/^Échec\.\s*/i, '')
    .replace(/^Combat:\\s*/i, 'Combat — ')
    .replace(/^Rest:\\s*/i, 'Rest — ');
}

function getIntermissionText(scene: Scene) {
  const sceneName = cleanSceneTitle(scene.title);
  const customTemplate = scene.intermissionText?.trim();
  if (!customTemplate) {
    return `Plus tard, le groupe atteint ${sceneName}.`;
  }
  return customTemplate.replace(/\{scene\}|<scene name>/gi, sceneName);
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === 'p1' || value === 'p2' || value === 'p3';
}

function isSceneId(value: unknown, sceneIdSet: Set<SceneId>): value is SceneId {
  return typeof value === 'string' && sceneIdSet.has(value as SceneId);
}

function isOptionId(value: unknown): value is OptionId {
  return typeof value === 'string' && OPTION_ID_SET.has(value as OptionId);
}

function parseCombatRound(stepId: string): number | null {
  if (!stepId.startsWith(COMBAT_ROUND_PREFIX)) return null;
  const suffix = stepId.slice(COMBAT_ROUND_PREFIX.length);
  const round = Number.parseInt(suffix, 10);
  if (!Number.isFinite(round) || round <= 0) return null;
  return round;
}

function parseSceneActionPayload(eventId: number, payload: unknown, sceneIdSet: Set<SceneId>): SceneActionPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (typeof candidate.stepId !== 'string' || !candidate.stepId) return null;
  if (typeof candidate.actionId !== 'string' || !candidate.actionId) return null;
  if (!isPlayerId(candidate.playerId)) return null;

  return {
    eventId,
    sceneId: candidate.sceneId,
    stepId: candidate.stepId,
    actionId: candidate.actionId,
    playerId: candidate.playerId,
  };
}

function parseSceneTimerPayload(payload: unknown, sceneIdSet: Set<SceneId>): SceneTimerPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (typeof candidate.stepId !== 'string' || !candidate.stepId) return null;
  if (typeof candidate.endAt !== 'string' || !candidate.endAt) return null;
  if (typeof candidate.durationSeconds !== 'number' || !Number.isFinite(candidate.durationSeconds)) return null;

  return {
    sceneId: candidate.sceneId,
    stepId: candidate.stepId,
    endAt: candidate.endAt,
    durationSeconds: candidate.durationSeconds,
  };
}

function parseOptionConfirmPayload(payload: unknown, sceneIdSet: Set<SceneId>): OptionConfirmPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (!isOptionId(candidate.optionId)) return null;
  if (!isPlayerId(candidate.playerId)) return null;
  const nextSceneId = candidate.nextSceneId;
  if (nextSceneId !== null && nextSceneId !== undefined && !isSceneId(nextSceneId, sceneIdSet)) return null;

  return {
    sceneId: candidate.sceneId,
    optionId: candidate.optionId,
    playerId: candidate.playerId,
    nextSceneId: (nextSceneId ?? null) as SceneId | null,
  };
}

function parseSceneResolvePayload(payload: unknown, sceneIdSet: Set<SceneId>): SceneResolvePayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (!isOptionId(candidate.optionId)) return null;
  const mode = candidate.mode;
  if (mode !== 'majority' && mode !== 'random' && mode !== 'combat' && mode !== 'timed') return null;
  const nextSceneId = candidate.nextSceneId;
  if (nextSceneId !== null && nextSceneId !== undefined && !isSceneId(nextSceneId, sceneIdSet)) return null;

  return {
    sceneId: candidate.sceneId,
    optionId: candidate.optionId,
    mode,
    nextSceneId: (nextSceneId ?? null) as SceneId | null,
  };
}

function parseSceneContinuePayload(payload: unknown, sceneIdSet: Set<SceneId>): SceneContinuePayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (!isPlayerId(candidate.playerId)) return null;

  return {
    sceneId: candidate.sceneId,
    playerId: candidate.playerId,
  };
}

function parseSceneAdvancePayload(payload: unknown, sceneIdSet: Set<SceneId>): SceneAdvancePayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;
  if (!isSceneId(candidate.sceneId, sceneIdSet)) return null;
  if (!isOptionId(candidate.optionId)) return null;
  const nextSceneId = candidate.nextSceneId;
  if (nextSceneId !== null && nextSceneId !== undefined && !isSceneId(nextSceneId, sceneIdSet)) return null;

  return {
    sceneId: candidate.sceneId,
    optionId: candidate.optionId,
    nextSceneId: (nextSceneId ?? null) as SceneId | null,
  };
}

function summarizeCombatRound(round: number, totalDamage: number, partyDamage: number, block: number, enemyAttack: number) {
  return `Round ${round}: party dealt ${totalDamage}, took ${partyDamage} (blocked ${block}, enemy ${enemyAttack}).`;
}

function summarizeCombatEscape(round: number) {
  return `Round ${round}: the party calls for retreat and withdraws.`;
}

function computeCombatResolution({
  scene,
  actionsByStep,
  expectedPlayerCount,
  partyHpStart,
  combatActionById,
  globalTags,
  sceneStartedAtMs,
  nowMs,
}: {
  scene: Scene;
  actionsByStep: SceneActionsByStep;
  expectedPlayerCount: number;
  partyHpStart: number;
  combatActionById: Map<string, CombatAction>;
  globalTags: Set<string>;
  sceneStartedAtMs: number;
  nowMs: number;
}): {
  state: CombatState;
  currentRoundIndex: number;
  currentRoundActions: SceneActionPayload[];
} | null {
  if (!scene.combat) return null;

  const roundMap = new Map<number, SceneActionPayload[]>();
  Object.entries(actionsByStep).forEach(([stepId, stepActions]) => {
    const round = parseCombatRound(stepId);
    if (!round || !stepActions) return;
    roundMap.set(round, [...stepActions].sort((a, b) => a.eventId - b.eventId));
  });

  const roundsSorted = Array.from(roundMap.keys()).sort((a, b) => a - b);
  let partyHp = partyHpStart;
  let enemyHp = scene.combat.enemyHp;
  let outcome: CombatOutcome | null = null;
  const roundLog: CombatRoundLog[] = [];
  const runThreshold = Math.ceil((expectedPlayerCount * 2) / 3);
  const roundDurationMs = Math.max(
    1,
    Math.floor(((scene.combat as { enemyAttackIntervalSeconds?: number }).enemyAttackIntervalSeconds ?? 2700) * 1000)
  );

  let round = 1;
  while (true) {
    const actions = roundMap.get(round) ?? [];
    const uniquePlayers = new Set(actions.map((action) => action.playerId));
    const stepCompleted = uniquePlayers.size >= expectedPlayerCount;
    const roundDeadlineMs = sceneStartedAtMs + round * roundDurationMs;
    const deadlineReached = nowMs >= roundDeadlineMs;

    if (!stepCompleted && !deadlineReached) {
      break;
    }

    const allowRun = scene.combat.allowRun !== false;
    const runVotes = actions.reduce((count, action) => {
      const actionMeta = combatActionById.get(action.actionId);
      if (!actionMeta || !isCombatActionAvailable(actionMeta, globalTags)) return count;
      const effect = resolveCombatActionEffect(actionMeta, globalTags);
      return effect?.run ? count + 1 : count;
    }, 0);

    if (allowRun && runVotes >= runThreshold) {
      roundLog.push({
        round,
        partyDamage: 0,
        enemyDamage: 0,
        block: 0,
        enemyAttack: scene.combat.enemyAttack,
        runVotes,
        summary: summarizeCombatEscape(round),
      });
      outcome = 'escape';
      break;
    }

    let totalDamage = 0;
    let totalBlock = 0;
    let enemyAttackDelta = 0;

    actions.forEach((action) => {
      const actionMeta = combatActionById.get(action.actionId);
      if (!actionMeta || !isCombatActionAvailable(actionMeta, globalTags)) return;
      const effect = resolveCombatActionEffect(actionMeta, globalTags);
      if (!effect) return;
      totalDamage += effect.damage ?? 0;
      totalBlock += effect.block ?? 0;
      enemyAttackDelta += effect.enemyAttackDelta ?? 0;
    });

    const enemyAttack = Math.max(0, scene.combat.enemyAttack + enemyAttackDelta);
    const partyDamage = Math.max(0, enemyAttack - totalBlock);

    enemyHp = Math.max(0, enemyHp - totalDamage);
    partyHp = Math.max(0, partyHp - partyDamage);

    roundLog.push({
      round,
      partyDamage,
      enemyDamage: totalDamage,
      block: totalBlock,
      enemyAttack,
      runVotes,
      summary: summarizeCombatRound(round, totalDamage, partyDamage, totalBlock, enemyAttack),
    });

    if (enemyHp <= 0) {
      outcome = 'victory';
      break;
    }
    if (partyHp <= 0) {
      outcome = 'defeat';
      break;
    }

    round += 1;

    // Exit once we've caught up and no pending actions/deadline-triggered rounds remain.
    const maxKnownRound = roundsSorted[roundsSorted.length - 1] ?? 0;
    if (round > maxKnownRound && nowMs < sceneStartedAtMs + round * roundDurationMs) {
      break;
    }
  }

  let currentRoundIndex = round;
  if (outcome) {
    currentRoundIndex = Math.max(1, round);
  }

  const currentRoundActions = roundMap.get(currentRoundIndex) ?? [];

  return {
    state: {
      partyHp,
      partyHpMax: partyHpStart,
      enemyHp,
      enemyHpMax: scene.combat.enemyHp,
      enemyName: scene.combat.enemyName,
      round: currentRoundIndex,
      outcome,
      allowRun: scene.combat.allowRun !== false,
      roundLog,
    },
    currentRoundIndex,
    currentRoundActions,
  };
}

function reduceStory(
  events: RoomEventRow[],
  storyRuntime: {
    startSceneId: SceneId;
    sceneById: Record<SceneId, Scene>;
    sceneIdSet: Set<SceneId>;
    getDefaultNextSceneId: (sceneId: SceneId) => SceneId | null;
  }
): StoryReduction {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });

  const state: StoryReduction = {
    currentSceneId: storyRuntime.startSceneId,
    sceneSequence: [storyRuntime.startSceneId],
    sceneEnteredAtByScene: {},
    actionsBySceneStep: {},
    confirmedVotesByScene: {},
    resolvedOptionByScene: {},
    resolutionModeByScene: {},
    continuedByScene: {},
    timersByScene: {},
  };

  sortedEvents.forEach((event) => {
    if (event.type === 'story_reset') {
      state.currentSceneId = storyRuntime.startSceneId;
      state.sceneSequence = [storyRuntime.startSceneId];
      state.sceneEnteredAtByScene = {
        [storyRuntime.startSceneId]: event.created_at,
      };
      state.actionsBySceneStep = {};
      state.confirmedVotesByScene = {};
      state.resolvedOptionByScene = {};
      state.resolutionModeByScene = {};
      state.continuedByScene = {};
      state.timersByScene = {};
      return;
    }

    if (event.type === 'scene_action') {
      const payload = parseSceneActionPayload(event.id, event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;
      if (state.resolvedOptionByScene[payload.sceneId]) return;

      const sceneActions = state.actionsBySceneStep[payload.sceneId] ?? {};
      const stepActions = sceneActions[payload.stepId] ?? [];
      if (stepActions.some((action) => action.playerId === payload.playerId)) return;
      sceneActions[payload.stepId] = [...stepActions, payload];
      state.actionsBySceneStep[payload.sceneId] = sceneActions;
      return;
    }

    if (event.type === 'scene_timer_started') {
      const payload = parseSceneTimerPayload(event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;
      if (state.timersByScene[payload.sceneId]) return;
      state.timersByScene[payload.sceneId] = payload;
      return;
    }

    if (event.type === 'option_confirm') {
      const payload = parseOptionConfirmPayload(event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;

      if (payload.sceneId !== state.currentSceneId) return;
      if (state.resolvedOptionByScene[payload.sceneId]) return;

      const sceneVotes = state.confirmedVotesByScene[payload.sceneId] ?? {};
      if (sceneVotes[payload.playerId]) return;
      sceneVotes[payload.playerId] = payload.optionId;
      state.confirmedVotesByScene[payload.sceneId] = sceneVotes;
      return;
    }

    if (event.type === 'scene_resolve') {
      const payload = parseSceneResolvePayload(event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;

      if (payload.sceneId !== state.currentSceneId) return;
      if (state.resolvedOptionByScene[payload.sceneId]) return;

      state.resolvedOptionByScene[payload.sceneId] = payload.optionId;
      state.resolutionModeByScene[payload.sceneId] = payload.mode;
      return;
    }

    if (event.type === 'scene_continue') {
      const payload = parseSceneContinuePayload(event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;

      if (payload.sceneId !== state.currentSceneId) return;
      if (!state.resolvedOptionByScene[payload.sceneId]) return;

      const continued = state.continuedByScene[payload.sceneId] ?? {};
      continued[payload.playerId] = true;
      state.continuedByScene[payload.sceneId] = continued;
      return;
    }

    if (event.type === 'scene_advance') {
      const payload = parseSceneAdvancePayload(event.payload_json, storyRuntime.sceneIdSet);
      if (!payload) return;

      if (payload.sceneId !== state.currentSceneId) return;

      if (!state.resolvedOptionByScene[payload.sceneId]) {
        state.resolvedOptionByScene[payload.sceneId] = payload.optionId;
        const scene = storyRuntime.sceneById[payload.sceneId];
        state.resolutionModeByScene[payload.sceneId] = scene?.mode === 'timed' || scene?.timed ? 'timed' : 'majority';
      }

      const fallbackNextSceneId = payload.nextSceneId ?? storyRuntime.getDefaultNextSceneId(payload.sceneId);
      if (fallbackNextSceneId) {
        state.currentSceneId = fallbackNextSceneId;
        if (!state.sceneEnteredAtByScene[fallbackNextSceneId]) {
          state.sceneEnteredAtByScene[fallbackNextSceneId] = event.created_at;
        }
        const lastSceneId = state.sceneSequence[state.sceneSequence.length - 1];
        if (lastSceneId !== fallbackNextSceneId) {
          state.sceneSequence = [...state.sceneSequence, fallbackNextSceneId];
        }
      }
    }
  });

  return state;
}

export function useRoomStory({
  roomId,
  localPlayerId,
  localRole,
  isHost = false,
  playerCount,
  playerDisplayNameById = {},
  playerRoleById = {},
}: UseRoomStoryOptions): UseRoomStoryResult {
  const [events, setEvents] = useState<RoomEventRow[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const latestEventIdRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    latestEventIdRef.current = events[events.length - 1]?.id ?? 0;
  }, [events]);

  useEffect(() => {
    if (!roomId) {
      setEvents([]);
      setStoryError(null);
      setIsReady(true);
      latestEventIdRef.current = 0;
      return;
    }

    let isMounted = true;
    setIsReady(false);
    setStoryError(null);

    const syncEvents = async (afterEventId?: number) => {
      let query = supabase
        .from('room_events')
        .select('id, type, payload_json, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1000);

      if (typeof afterEventId === 'number' && afterEventId > 0) {
        query = query.gt('id', afterEventId);
      }

      const { data, error } = await query;
      if (!isMounted) return;

      if (error) {
        setStoryError(error.message);
        return;
      }

      setEvents((currentEvents) => mergeRoomEvents(currentEvents, (data ?? []) as RoomEventRow[]));
      setStoryError(null);
    };

    const channel = supabase
      .channel(`room-events-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (!isMounted) return;
          const event = payload.new as RoomEventRow;
          setEvents((prev) => (prev.some((item) => item.id === event.id) ? prev : [...prev, event]));
        }
      )
      .subscribe();

    const loadInitialEvents = async () => {
      await syncEvents();
      if (!isMounted) return;
      setIsReady(true);
    };

    void loadInitialEvents();
    const reconciliationTimer = setInterval(() => {
      void syncEvents(latestEventIdRef.current);
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(reconciliationTimer);
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const storyRuntime = useMemo(() => getStoryRuntime(roomId ?? 'local-default'), [roomId]);

  const reduced = useMemo(() => reduceStory(events, storyRuntime), [events, storyRuntime]);

  const combatConfig = storyRuntime.data.combat ?? DEFAULT_COMBAT_CONFIG;
  const combatActionById = useMemo(() => {
    const map = new Map<string, CombatAction>();
    combatConfig.actions.forEach((action) => {
      map.set(action.id, action);
    });
    return map;
  }, [combatConfig.actions]);

  const currentScene = storyRuntime.sceneById[reduced.currentSceneId] ?? storyRuntime.scenes[0]!;

  const isCombatScene = currentScene.mode === 'combat' || Boolean(currentScene.combat);
  const isTimedScene = currentScene.mode === 'timed' || Boolean(currentScene.timed);
  const timedConfig = currentScene.timed ?? null;

  const actionsByStep = useMemo(
    () => reduced.actionsBySceneStep[currentScene.id] ?? {},
    [currentScene.id, reduced.actionsBySceneStep]
  );
  const expectedPlayerCount = Math.max(1, playerCount ?? players.length);

  const combatSnapshots = useMemo(() => {
    let partyHp = combatConfig.partyHp;
    const globalTags = new Set<string>();
    const combatStatesByScene: Partial<
      Record<
        SceneId,
        {
          state: CombatState;
          currentRoundIndex: number;
          currentRoundActions: SceneActionPayload[];
        }
      >
    > = {};

    const applyHpDelta = (delta?: number) => {
      if (typeof delta !== 'number' || !Number.isFinite(delta)) return;
      partyHp = Math.max(0, Math.min(partyHp + delta, combatConfig.partyHp));
    };

    reduced.sceneSequence.forEach((sceneId) => {
      const scene = storyRuntime.sceneById[sceneId];
      if (!scene) return;
      const sceneTags = new Set<string>();

      if (scene.combat) {
        const sceneActionsByStep = reduced.actionsBySceneStep[sceneId] ?? {};
        const sceneEnteredAt = reduced.sceneEnteredAtByScene[sceneId];
        const sceneStartedAtMs = sceneEnteredAt ? Date.parse(sceneEnteredAt) : Number.NaN;
        const resolution = computeCombatResolution({
          scene,
          actionsByStep: sceneActionsByStep,
          expectedPlayerCount,
          partyHpStart: partyHp,
          combatActionById,
          globalTags,
          sceneStartedAtMs: Number.isFinite(sceneStartedAtMs) ? sceneStartedAtMs : nowMs,
          nowMs,
        });
        if (resolution) {
          combatStatesByScene[sceneId] = {
            state: {
              ...resolution.state,
              partyHpMax: combatConfig.partyHp,
            },
            currentRoundIndex: resolution.currentRoundIndex,
            currentRoundActions: resolution.currentRoundActions,
          };
          partyHp = resolution.state.partyHp;
        }
        const resolvedOption = reduced.resolvedOptionByScene[sceneId];
        if (resolvedOption) {
          const option = scene.options.find((item) => item.id === resolvedOption);
          applyTagSet(option?.tagsAdded, globalTags, sceneTags);
        }
        return;
      }

      const sceneActions = reduced.actionsBySceneStep[sceneId] ?? {};
      Object.values(sceneActions).forEach((stepActions) => {
        stepActions?.forEach((action) => {
          const outcome =
            scene.steps.map((step) => step.outcomes[action.actionId]).find((value) => Boolean(value)) ?? null;
          applyHpDelta(outcome?.hpDelta);
          applyTagSet(outcome?.tagsAdded, globalTags, sceneTags);
        });
      });

      const resolvedOption = reduced.resolvedOptionByScene[sceneId];
      if (resolvedOption) {
        const outcome = scene.outcomeByOption[resolvedOption];
        applyHpDelta(outcome?.hpDelta);
        const option = scene.options.find((item) => item.id === resolvedOption);
        applyTagSet(option?.tagsAdded, globalTags, sceneTags);

        // Timed pressure: missing contributions cost party HP.
        if (scene.mode === 'timed' || scene.timed) {
          const actionParticipants = new Set<PlayerId>();
          Object.values(sceneActions).forEach((stepActions) => {
            stepActions?.forEach((action) => {
              actionParticipants.add(action.playerId);
            });
          });
          const missingPlayers = Math.max(0, expectedPlayerCount - actionParticipants.size);
          const timeoutDamagePerMissing =
            typeof scene.timed?.timeoutDamagePerMissing === 'number' && Number.isFinite(scene.timed.timeoutDamagePerMissing)
              ? Math.max(0, Math.floor(scene.timed.timeoutDamagePerMissing))
              : 1;
          if (missingPlayers > 0 && timeoutDamagePerMissing > 0) {
            applyHpDelta(-(missingPlayers * timeoutDamagePerMissing));
          }
        }
      }
    });

    return { partyHp, combatStatesByScene };
  }, [
    combatActionById,
    combatConfig.partyHp,
    expectedPlayerCount,
    nowMs,
    reduced.actionsBySceneStep,
    reduced.sceneEnteredAtByScene,
    reduced.resolvedOptionByScene,
    reduced.sceneSequence,
    storyRuntime.sceneById,
  ]);

  const combatSnapshot = isCombatScene ? combatSnapshots.combatStatesByScene[currentScene.id] ?? null : null;
  const combatState = combatSnapshot?.state ?? null;
  const partyHp = combatSnapshots.partyHp;
  const partyHpMax = combatConfig.partyHp;

  const stepStatuses = useMemo(
    () =>
      !isCombatScene
        ? currentScene.steps.map((step) => {
            const actions = actionsByStep[step.id] ?? [];
            const uniquePlayers = new Set(actions.map((action) => action.playerId));
            return {
              step,
              actions,
              completed: uniquePlayers.size >= expectedPlayerCount,
            };
          })
        : [],
    [actionsByStep, currentScene.steps, expectedPlayerCount, isCombatScene]
  );

  const firstIncompleteIndex = !isCombatScene ? stepStatuses.findIndex((item) => !item.completed) : -1;
  const currentStepIndex =
    !isCombatScene && stepStatuses.length > 0 ? (firstIncompleteIndex === -1 ? stepStatuses.length - 1 : firstIncompleteIndex) : 0;
  const currentStep = !isCombatScene && stepStatuses.length > 0 ? stepStatuses[currentStepIndex]?.step ?? currentScene.steps[0] : null;
  const currentStepActions = useMemo(
    () => (isCombatScene ? combatSnapshot?.currentRoundActions ?? [] : stepStatuses[currentStepIndex]?.actions ?? []),
    [combatSnapshot?.currentRoundActions, currentStepIndex, isCombatScene, stepStatuses]
  );
  const currentStepCompleted = isCombatScene
    ? new Set(currentStepActions.map((action) => action.playerId)).size >= expectedPlayerCount
    : stepStatuses[currentStepIndex]?.completed ?? false;
  const currentStepId = isCombatScene
    ? `${COMBAT_ROUND_PREFIX}${combatSnapshot?.currentRoundIndex ?? 1}`
    : currentStep?.id ?? currentScene.steps[0]?.id;

  const resolvedOption = reduced.resolvedOptionByScene[currentScene.id] ?? null;
  const resolutionMode = reduced.resolutionModeByScene[currentScene.id] ?? null;

  const continuedBy = reduced.continuedByScene[currentScene.id] ?? {};
  const localHasContinued = Boolean(continuedBy[localPlayerId]);
  const continuedCount = Object.keys(continuedBy).length;

  const sceneActionEvents = useMemo(() => {
    const allActions: SceneActionPayload[] = [];
    Object.values(actionsByStep).forEach((stepActions) => {
      stepActions?.forEach((action) => allActions.push(action));
    });
    return allActions.sort((a, b) => a.eventId - b.eventId);
  }, [actionsByStep]);

  const currentActionIds = useMemo(() => {
    return new Set(sceneActionEvents.map((action) => action.actionId));
  }, [sceneActionEvents]);

  const disabledActionIds = useMemo(() => {
    const disabled = new Set<ActionId>();
    if (!currentStep) return disabled;
    currentStepActions.forEach((action) => {
      const outcome = currentStep.outcomes[action.actionId];
      outcome?.disableActionIds?.forEach((id) => disabled.add(id));
    });
    return disabled;
  }, [currentStep, currentStepActions]);

  const combatLog = useMemo(() => {
    if (!combatState) return [];
    return combatState.roundLog.map((entry, index) => ({
      id: `combat-${entry.round}-${index}`,
      text: entry.summary,
    }));
  }, [combatState]);

  const journalEntries = useMemo<JournalEntry[]>(() => {
    const entries: JournalEntry[] = [];
    const sequence = reduced.sceneSequence;

    sequence.forEach((sceneId, index) => {
      const scene = storyRuntime.sceneById[sceneId];
      if (!scene) return;

      if (index > 0) {
        entries.push({
          id: `transition-${sceneId}-${index}`,
          kind: 'transition',
          text: getIntermissionText(scene),
        });
      }

      const previousSceneId = index > 0 ? sequence[index - 1] : null;
      const previousOption = previousSceneId ? reduced.resolvedOptionByScene[previousSceneId] ?? null : null;
      const introText =
        previousOption && scene.introByPreviousOption?.[previousOption]
          ? scene.introByPreviousOption[previousOption]!
          : scene.intro;
      if (introText) {
        entries.push({
          id: `intro-${sceneId}-${index}`,
          kind: 'narration',
          text: introText,
        });
      }

      (scene.introDialogue ?? []).forEach((line, lineIndex) => {
        entries.push({
          id: `intro-npc-${sceneId}-${index}-${lineIndex}`,
          kind: 'npc',
          speaker: line.speaker,
          text: line.text,
          aside: line.aside,
        });
      });

      const roleLabel = localRole ? roleLabelById[localRole] : null;
      const roleClue = localRole ? scene.roleClues?.[localRole] : null;
      if (roleClue && roleLabel) {
        entries.push({
          id: `role-clue-${sceneId}-${index}-${localRole}`,
          kind: 'narration',
          text: `Personal clue (${roleLabel}): ${roleClue}`,
        });
      }

      const sceneActionsByStep = reduced.actionsBySceneStep[sceneId] ?? {};
      const sceneActionEvents: SceneActionPayload[] = [];
      Object.values(sceneActionsByStep).forEach((stepActions) => {
        stepActions?.forEach((action) => sceneActionEvents.push(action));
      });
      sceneActionEvents.sort((a, b) => a.eventId - b.eventId);

      if (!(scene.mode === 'combat' || scene.combat)) {
        const actionMetaMap = new Map<ActionId, { text: string; buttonText?: string; stage?: string; narration?: string }>();
        scene.steps.forEach((step) => {
          step.actions.forEach((action) => {
            actionMetaMap.set(action.id, {
              text: action.text,
              buttonText: action.buttonText,
              stage: action.stage,
              narration: action.narration,
            });
          });
        });

        sceneActionEvents.forEach((action, actionIndex) => {
          const outcome =
            scene.steps.map((step) => step.outcomes[action.actionId]).find((value) => Boolean(value)) ?? null;
          const meta = actionMetaMap.get(action.actionId);
          const actionText = meta?.text ?? '(unlisted action)';
          const stageLineRaw = meta?.stage;
          const stageLine = stageLineRaw ? `${stageLineRaw.charAt(0).toUpperCase()}${stageLineRaw.slice(1)}` : undefined;
          const hasSilentButtonLabel = Boolean(meta?.buttonText) && extractQuotedLines(actionText).length === 0;
          const spokenLines =
            action.actionId === NO_REACTION_ACTION_ID ? [] : extractQuotedLines(actionText);
          const bubbleLines =
            action.actionId === NO_REACTION_ACTION_ID
              ? []
              : spokenLines.length > 0
                ? spokenLines
                : hasSilentButtonLabel
                  ? []
                  : [actionText];
          const playerName = playerDisplayNameById[action.playerId] ?? playerNameById[action.playerId];
          const roleId = playerRoleById[action.playerId] ?? null;
          const roleLabel = roleId ? roleLabelById[roleId] : 'Adventurer';
          const npcDialogue = outcome?.dialogue ?? [];

          const narrationText =
            meta?.narration ??
            (npcDialogue.length === 0 ? outcome?.narration : null) ??
            (action.actionId === NO_REACTION_ACTION_ID ? 'The moment passes in silence.' : null);

          entries.push({
            id: `player-${sceneId}-${action.eventId}-${actionIndex}`,
            kind: 'player',
            speaker: `${playerName} the ${roleLabel}`,
            lines: bubbleLines,
            stage: stageLine,
            narration: narrationText ?? undefined,
          });

          npcDialogue.forEach((line, lineIndex) => {
            entries.push({
              id: `npc-${sceneId}-${action.eventId}-${lineIndex}`,
              kind: 'npc',
              speaker: line.speaker,
              text: line.text,
              aside: line.aside,
              narration: line.narration ?? (lineIndex === npcDialogue.length - 1 ? outcome?.narration : undefined),
            });
          });
        });
      } else {
        const snapshot = combatSnapshots.combatStatesByScene[sceneId];
        if (snapshot) {
          entries.push({
            id: `combat-summary-${sceneId}-${index}`,
            kind: 'combat_summary',
            combatState: snapshot.state,
            combatLog: snapshot.state.roundLog.map((entry, entryIndex) => ({
              id: `combat-summary-${sceneId}-${entry.round}-${entryIndex}`,
              text: entry.summary,
            })),
          });
        }
      }

      const resolvedOption = reduced.resolvedOptionByScene[sceneId];
      if (resolvedOption) {
        const outcome = scene.outcomeByOption[resolvedOption];
        if (outcome?.text) {
          entries.push({
            id: `outcome-${sceneId}-${resolvedOption}-${index}`,
            kind: 'narration',
            text: outcome.text,
          });
        }
      }
    });

    return entries;
  }, [
    combatSnapshots.combatStatesByScene,
    localRole,
    playerDisplayNameById,
    playerRoleById,
    reduced.actionsBySceneStep,
    reduced.resolvedOptionByScene,
    reduced.sceneSequence,
    storyRuntime.sceneById,
  ]);

  const tagState = useMemo(() => {
    const globalTags = new Set<string>();
    const sceneTagsByScene: Partial<Record<SceneId, Set<string>>> = {};

    reduced.sceneSequence.forEach((sceneId) => {
      const scene = storyRuntime.sceneById[sceneId];
      if (!scene) return;
      const sceneTags = new Set<string>();
      const sceneActions = reduced.actionsBySceneStep[sceneId] ?? {};

      Object.values(sceneActions).forEach((stepActions) => {
        stepActions?.forEach((action) => {
          const outcome =
            scene.steps.map((step) => step.outcomes[action.actionId]).find((value) => Boolean(value)) ?? null;
          applyTagSet(outcome?.tagsAdded, globalTags, sceneTags);
        });
      });

      const resolvedOption = reduced.resolvedOptionByScene[sceneId];
      if (resolvedOption) {
        const option = scene.options.find((item) => item.id === resolvedOption);
        applyTagSet(option?.tagsAdded, globalTags, sceneTags);
      }

      sceneTagsByScene[sceneId] = sceneTags;
    });

    return { globalTags, sceneTagsByScene };
  }, [reduced.actionsBySceneStep, reduced.resolvedOptionByScene, reduced.sceneSequence, storyRuntime.sceneById]);

  const currentSceneTags = useMemo(
    () => tagState.sceneTagsByScene[currentScene.id] ?? new Set<string>(),
    [currentScene.id, tagState.sceneTagsByScene]
  );
  const currentTimer = reduced.timersByScene[currentScene.id] ?? null;
  const timedEndsAt = currentTimer?.endAt ?? null;
  const timedWaitingText = isTimedScene
    ? currentTimer
      ? (timedConfig?.restWaitingText?.trim() || 'The party is waiting...')
      : timedConfig?.statusText?.trim() || 'The party is waiting...'
    : null;
  const timedStatusText = isTimedScene && currentTimer ? timedConfig?.statusText ?? 'The group is busy...' : null;

  useEffect(() => {
    if (!roomId || !isTimedScene || !currentStepId || currentTimer || resolvedOption) return;
    const durationSeconds = timedConfig?.durationSeconds ?? 0;
    if (durationSeconds <= 0) return;
    let isActive = true;
    supabase
      .rpc('story_start_timer', {
        p_room_id: roomId,
        p_scene_id: currentScene.id,
        p_step_id: currentStepId,
        p_duration_seconds: Math.floor(durationSeconds),
      })
      .then(({ error }) => {
        if (!isActive) return;
        if (error) {
          if (error.message.includes('Waiting for all reactions before starting timer') && !currentStepCompleted) {
            return;
          }
          setStoryError(error.message);
        }
      });
    return () => {
      isActive = false;
    };
  }, [
    currentScene.id,
    currentStepCompleted,
    currentStepId,
    currentTimer,
    isTimedScene,
    roomId,
    resolvedOption,
    timedConfig?.durationSeconds,
  ]);

  useEffect(() => {
    if (!roomId || !isCombatScene || !combatState?.outcome || resolvedOption) return;
    let isActive = true;

    const optionId: OptionId =
      combatState.outcome === 'victory' ? 'A' : combatState.outcome === 'defeat' ? 'B' : 'C';
    const nextSceneId = resolveNextSceneId(currentScene, optionId, tagState.globalTags, currentSceneTags, currentActionIds);

    supabase
      .rpc('story_resolve_combat', {
        p_room_id: roomId,
        p_scene_id: currentScene.id,
        p_option_id: optionId,
        p_next_scene_id: nextSceneId,
      })
      .then(({ error }) => {
        if (!isActive) return;
        if (error) {
          setStoryError(error.message);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    combatState?.outcome,
    currentActionIds,
    currentScene,
    currentSceneTags,
    isCombatScene,
    resolvedOption,
    roomId,
    tagState.globalTags,
  ]);

  const evidenceTallies = useMemo(() => {
    if (isCombatScene) return new Map<string, Set<PlayerId>>();
    const tallies = new Map<string, Set<PlayerId>>();
    sceneActionEvents.forEach((action) => {
      const outcome =
        currentScene.steps
          .map((step) => step.outcomes[action.actionId])
          .find((value) => Boolean(value)) ?? null;
      if (!outcome?.evidenceIds?.length) return;
      outcome.evidenceIds.forEach((evidenceId) => {
        const set = tallies.get(evidenceId) ?? new Set<PlayerId>();
        set.add(action.playerId);
        tallies.set(evidenceId, set);
      });
    });
    return tallies;
  }, [currentScene.steps, isCombatScene, sceneActionEvents]);

  const confirmedEvidenceIds = useMemo(() => {
    if (isCombatScene) return new Set<string>();
    const confirmed = new Set<string>();
    currentScene.evidence.forEach((evidence) => {
      const tally = evidenceTallies.get(evidence.id);
      if (tally && tally.size >= EVIDENCE_CONFIRMATION_COUNT) {
        confirmed.add(evidence.id);
      }
    });
    return confirmed;
  }, [currentScene.evidence, evidenceTallies, isCombatScene]);

  const unlockedOptionIds = useMemo(() => {
    if (isCombatScene) return new Set<OptionId>();
    const unlocked = new Set<OptionId>();
    currentScene.unlockRules.forEach((rule) => {
      const isUnlocked = rule.evidenceIds.every((evidenceId) => confirmedEvidenceIds.has(evidenceId));
      if (isUnlocked) unlocked.add(rule.optionId);
    });

    sceneActionEvents.forEach((action) => {
      const outcome =
        currentScene.steps
          .map((step) => step.outcomes[action.actionId])
          .find((value) => Boolean(value)) ?? null;
      outcome?.unlockOptionIds?.forEach((optionId) => unlocked.add(optionId));
    });

    return unlocked;
  }, [confirmedEvidenceIds, currentScene.steps, currentScene.unlockRules, isCombatScene, sceneActionEvents]);

  const resolvableOptions = useMemo(
    () => currentScene.options.filter((option) => option.defaultVisible || unlockedOptionIds.has(option.id)),
    [currentScene.options, unlockedOptionIds]
  );
  const visibleOptions = useMemo(() => {
    if (isCombatScene || isTimedScene) return [];
    return resolvableOptions;
  }, [isCombatScene, isTimedScene, resolvableOptions]);
  const hiddenOptionCount = isCombatScene || isTimedScene ? 0 : Math.max(0, currentScene.options.length - visibleOptions.length);

  const riskyUnlockedOptionIds = useMemo(() => {
    const risky = new Set<OptionId>();
    visibleOptions.forEach((option) => {
      if (option.isRisky) risky.add(option.id);
    });
    return risky;
  }, [visibleOptions]);

  const localConfirmedOption = null;
  const voteCounts = useMemo<Record<OptionId, number>>(() => ({ A: 0, B: 0, C: 0 }), []);
  const confirmedVoteCount = 0;

  const isStoryEnded = useMemo(() => {
    if (!currentScene.isEnding) return false;
    return true;
  }, [currentScene.isEnding]);

  const sceneHistory = useMemo(() => {
    const history: SceneHistoryItem[] = [];

    reduced.sceneSequence.forEach((sceneId) => {
      const scene = storyRuntime.sceneById[sceneId];
      const optionId = reduced.resolvedOptionByScene[sceneId];
      if (!scene || !optionId) return;

      history.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        optionId,
        outcomeText: scene.outcomeByOption[optionId].text,
      });
    });

    return history;
  }, [reduced.resolvedOptionByScene, reduced.sceneSequence, storyRuntime.sceneById]);

  const playersActed = new Set(currentStepActions.map((action) => action.playerId));
  const localHasActed = playersActed.has(localPlayerId);
  const localSelectedActionId = currentStepActions.find((action) => action.playerId === localPlayerId)?.actionId ?? null;
  const phaseLabel = isCombatScene
    ? `Combat Round ${combatSnapshot?.currentRoundIndex ?? 1} · ${Math.ceil(((currentScene.combat as { enemyAttackIntervalSeconds?: number } | undefined)?.enemyAttackIntervalSeconds ?? 2700) / 60)}m cadence`
    : isTimedScene
      ? timedConfig?.kind === 'travel'
        ? 'Travel'
        : timedConfig?.kind === 'wait'
          ? 'Waiting'
          : 'Rest'
      : currentStepActions.length === 0
        ? 'Contributions: Initiate'
        : currentStepCompleted
          ? 'Contributions: Complete'
          : 'Contributions: In Progress';
  const phaseStatusText = isCombatScene
    ? combatState?.outcome
      ? `Combat resolved: ${combatState.outcome}.`
      : localHasActed
        ? `Waiting for remaining actions (${currentStepActions.length}/${expectedPlayerCount}).`
        : `Choose a combat action (${currentStepActions.length}/${expectedPlayerCount} so far).`
    : isTimedScene
      ? currentStepCompleted
        ? timedConfig?.statusText ?? 'The group is busy...'
        : currentStepActions.length === 0
          ? 'Choose how you spend the time.'
          : localHasActed
            ? `Waiting for remaining players to react (${currentStepActions.length}/${expectedPlayerCount}).`
            : `Your reaction is available (${currentStepActions.length}/${expectedPlayerCount} so far).`
      : currentStepCompleted
        ? 'All contributions are in.'
        : currentStepActions.length === 0
          ? 'Any player can act to begin the exchange.'
          : localHasActed
            ? `Waiting for remaining players to react (${currentStepActions.length}/${expectedPlayerCount}).`
            : `Your reaction is available (${currentStepActions.length}/${expectedPlayerCount} so far).`;

  const timedWindowOpen = useMemo(() => {
    if (!isTimedScene) return true;
    if (!timedEndsAt) return true;
    const endMs = Date.parse(timedEndsAt);
    if (!Number.isFinite(endMs)) return true;
    return endMs > nowMs;
  }, [isTimedScene, nowMs, timedEndsAt]);

  const canAct =
    Boolean(localRole) &&
    !resolvedOption &&
    !isStoryEnded &&
    !currentStepCompleted &&
    timedWindowOpen &&
    !localHasActed &&
    (!isCombatScene || !combatState?.outcome);
  const allowSkip = canAct && currentStepActions.length > 0;

  const availableActions = useMemo(() => {
    if (!localRole) return [];
    if (isCombatScene) {
      return combatConfig.actions
        .filter((action) => action.role === localRole || action.role === 'any')
        .filter((action) => isCombatActionAvailable(action, tagState.globalTags))
        .map((action) => ({
          action,
          effect: resolveCombatActionEffect(action, tagState.globalTags),
        }))
        .filter(({ effect }) => (effect.run ? combatState?.allowRun !== false : true))
        .map(({ action, effect }) => ({
          id: action.id,
          text: action.text,
          isDisabled: false,
          effectText: [
            effect.damage ? `+${effect.damage} dmg` : null,
            effect.block ? `+${effect.block} block` : null,
            effect.enemyAttackDelta
              ? `${effect.enemyAttackDelta > 0 ? '+' : ''}${effect.enemyAttackDelta} enemy atk`
              : null,
            effect.run ? 'run' : null,
          ]
            .filter(Boolean)
            .join(', '),
        }));
    }
    if (!currentStep) return [];
    return currentStep.actions
      .filter((action) => action.role === localRole || action.role === 'any')
      .filter((action) => matchesTagCondition(tagState.globalTags, action.ifGlobal))
      .map((action) => ({
        id: action.id,
        text: action.buttonText ?? action.text,
        isDisabled: disabledActionIds.has(action.id),
        hpDelta: currentStep.outcomes[action.id]?.hpDelta,
        effectText:
          typeof action.durationSeconds === 'number' && action.durationSeconds > 0
            ? `~${Math.ceil(action.durationSeconds / 60)}m`
            : undefined,
      }));
  }, [combatConfig.actions, combatState?.allowRun, currentStep, disabledActionIds, isCombatScene, localRole, tagState.globalTags]);
  const availableActionIdSet = useMemo(() => new Set(availableActions.map((action) => action.id)), [availableActions]);

  const canVote = false;
  const voteLockReason = 'Scene voting is disabled. Node outcomes resolve from contributions and timer pressure.';

  useEffect(() => {
    if (!allowSkip || !roomId || !currentStepId || localHasActed) return;
    const timer = setTimeout(() => {
      void supabase.rpc('story_take_action', {
        p_room_id: roomId,
        p_scene_id: currentScene.id,
        p_step_id: currentStepId,
        p_action_id: NO_REACTION_ACTION_ID,
      });
    }, ACTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [allowSkip, currentScene.id, currentStepId, localHasActed, roomId]);

  const takeAction = useCallback(
    async (actionId: string) => {
      if (!roomId || !canAct || !currentStepId) return;
      if (disabledActionIds.has(actionId)) return;
      if (!availableActionIdSet.has(actionId)) return;

      const { error } = await supabase.rpc('story_take_action', {
        p_room_id: roomId,
        p_scene_id: currentScene.id,
        p_step_id: currentStepId,
        p_action_id: actionId,
      });

      if (error) {
        setStoryError(error.message);
        return;
      }

      setStoryError(null);
    },
    [availableActionIdSet, canAct, currentScene.id, currentStepId, disabledActionIds, roomId]
  );

  const skipAction = useCallback(async () => {
    if (!roomId || !allowSkip || !currentStepId) return;

    const { error } = await supabase.rpc('story_take_action', {
      p_room_id: roomId,
      p_scene_id: currentScene.id,
      p_step_id: currentStepId,
      p_action_id: NO_REACTION_ACTION_ID,
    });

    if (error) {
      setStoryError(error.message);
      return;
    }

    setStoryError(null);
  }, [allowSkip, currentScene.id, currentStepId, roomId]);

  const confirmOption = useCallback(
    async (_optionId: OptionId) => {
      setStoryError('Scene voting is disabled in the current engine.');
    },
    []
  );

  const finishTimedScene = useCallback(
    async (force?: boolean) => {
      if (!roomId || !isTimedScene || resolvedOption) return;
      if (!timedConfig) return;

      const participantCount = new Set(sceneActionEvents.map((action) => action.playerId)).size;
      const missingParticipants = Math.max(0, expectedPlayerCount - participantCount);
      const candidateOptions = (resolvableOptions.length ? resolvableOptions : currentScene.options).map((option) => option.id);
      const hasOption = (optionId: OptionId) => candidateOptions.includes(optionId);

      let optionId: OptionId;
      if (missingParticipants > 0) {
        optionId = hasOption('A')
          ? 'A'
          : ((candidateOptions[0] as OptionId | undefined) ?? 'A');
      } else if (hasOption('B') && hasOption('C')) {
        optionId = Math.random() < 0.5 ? 'B' : 'C';
      } else if (hasOption('C')) {
        optionId = 'C';
      } else if (hasOption('B')) {
        optionId = 'B';
      } else {
        optionId = 'A';
      }

      const nextSceneId =
        resolveNextSceneId(currentScene, optionId, tagState.globalTags, currentSceneTags, currentActionIds) ??
        storyRuntime.getDefaultNextSceneId(currentScene.id);

      const { error } = await supabase.rpc('story_resolve_timed_scene', {
        p_room_id: roomId,
        p_scene_id: currentScene.id,
        p_option_id: optionId,
        p_next_scene_id: nextSceneId,
        p_force: Boolean(force),
      });

      if (error) {
        setStoryError(error.message);
        return;
      }

      setStoryError(null);
    },
    [
      currentActionIds,
      currentScene,
      currentSceneTags,
      expectedPlayerCount,
      isTimedScene,
      resolvableOptions,
      resolvedOption,
      roomId,
      sceneActionEvents,
      storyRuntime,
      tagState.globalTags,
      timedConfig,
    ]
  );

  useEffect(() => {
    if (!isTimedScene || !timedEndsAt || resolvedOption) return;
    const endAtMs = Date.parse(timedEndsAt);
    if (!Number.isFinite(endAtMs)) return;
    const remainingMs = endAtMs - Date.now();
    if (remainingMs <= 0) {
      void finishTimedScene(false);
      return;
    }
    const timer = setTimeout(() => {
      void finishTimedScene(false);
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [finishTimedScene, isTimedScene, resolvedOption, timedEndsAt]);

  const continueToNextScene = useCallback(async () => {
    if (!roomId || !resolvedOption || isStoryEnded || localHasContinued) return;

    const { error } = await supabase.rpc('story_continue_scene', {
      p_room_id: roomId,
      p_scene_id: currentScene.id,
    });

    if (error) {
      setStoryError(error.message);
      return;
    }

    setStoryError(null);
  }, [currentScene.id, isStoryEnded, localHasContinued, resolvedOption, roomId]);

  useEffect(() => {
    if (!isCombatScene) return;
    if (!resolvedOption || isStoryEnded || localHasContinued) return;
    void continueToNextScene();
  }, [continueToNextScene, isCombatScene, isStoryEnded, localHasContinued, resolvedOption]);

  const resetStory = useCallback(async () => {
    if (!roomId || !isHost) return;

    const { error } = await supabase.rpc('story_reset', {
      p_room_id: roomId,
      p_start_scene_id: storyRuntime.startSceneId,
    });

    if (error) {
      setStoryError(error.message);
      return;
    }

    setStoryError(null);
  }, [isHost, roomId, storyRuntime.startSceneId]);

  return {
    isReady,
    storyError,
    currentScene,
    journalEntries,
    combatLog,
    combatState,
    isCombatScene,
    isTimedScene,
    partyHp,
    partyHpMax,
    timedStatusText,
    timedEndsAt,
    timedAllowEarly: Boolean(timedConfig?.allowEarly),
    timedWaitingText,
    phaseLabel,
    phaseStatusText,
    availableActions,
    localSelectedActionId,
    canAct,
    allowSkip,
    visibleOptions,
    hiddenOptionCount,
    riskyUnlockedOptionIds,
    localConfirmedOption,
    voteCounts,
    confirmedVoteCount,
    resolvedOption,
    resolutionMode,
    localHasContinued,
    continuedCount,
    continuedByPlayerId: continuedBy,
    isStoryEnded,
    canVote,
    voteLockReason,
    expectedPlayerCount,
    sceneHistory,
    takeAction,
    skipAction,
    confirmOption,
    continueToNextScene,
    finishTimedScene,
    resetStory,
  };
}
