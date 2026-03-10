# Online Multiplayer Checklist (Action Loop)

This app now supports only the systems required for the action-driven loop:
- room create/join + per-device player identity (`p1`, `p2`, `p3`)
- lobby role assignment (`sage`, `warrior`, `ranger`) with first-come-first-serve locking
- player display names (per-room, no spaces)
- synced scene progression (short procedural run, timed node resolution)
- room board notes (2 notes per player per active node, 120 chars max)
- synced scene actions + action log
- no scene voting (node outcomes auto-resolve from contributions + timer)
- branching story graph with tag-driven routing + multiple endings
- story content lives in `src/story/story-data.json` and is validated at runtime
- combat scenes with real-time enemy cadence metadata
- timed node timers (server-authoritative timers, debug early-finish button)

## 1) Product rules locked

- Story shape: short procedural run (6 core nodes before ending scene).
- Adventure start: host starts only after 3 players pick unique roles.
- Scene flow: contributions -> timer -> auto resolution.
- Each player may take at most one action per node.
- Timer: nodes resolve when timer ends (or with debug finish button).
- Decisions: one default option visible; hidden options unlock from action outcomes and are auto-selected by resolver.
- Failure condition: party HP reaching 0.

## 2) Backend minimum

Recommended for this Expo app: Supabase (Auth + Postgres + Realtime).

You need:
- Supabase project URL
- Supabase anon key
- Anonymous auth enabled (MVP)

## 3) Database tables in use

- `rooms` (room metadata only)
- `room_players` (identity + membership)
  - includes `role_id` (nullable in lobby, required before start)
- `room_messages` (room board notes)
- `room_events` (scene/action/timer event stream)
- `push_subscriptions` (one Expo push token per user/device session)
- `push_notification_dispatches` (dedupe marker for timed-scene push sends)

## 4) Event stream contract (`room_events`)

Client action RPCs write these event types server-side:
- `story_select_role(p_room_id, p_role_id)`
- `story_set_display_name(p_room_id, p_display_name)`
- `story_start_adventure(p_room_id)`
- `story_take_action(p_room_id, p_scene_id, p_step_id, p_action_id)`
- `story_resolve_combat(p_room_id, p_scene_id, p_option_id, p_next_scene_id)`
- `story_start_timer(p_room_id, p_scene_id, p_step_id, p_duration_seconds)`
- `story_resolve_timed_scene(p_room_id, p_scene_id, p_option_id, p_next_scene_id, p_force)`
- `set_push_subscription(p_token, p_platform)`
- `story_reset(p_room_id)`

Generated events:
- `scene_action`
  - payload: `{ sceneId, stepId, actionId, playerId }`
- `scene_resolve`
  - payload: `{ sceneId, optionId, mode, nextSceneId }`
- `scene_advance`
  - payload: `{ sceneId, optionId, nextSceneId }`
- `scene_timer_started`
  - payload: `{ sceneId, stepId, endAt, durationSeconds }`
- `story_reset`
  - payload: `{}`

Client reduces events in order to derive current state.

## 5) Deployment prep

- Add env vars in Expo:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Apply `docs/sql/supabase-schema.sql` for fresh setup.
- If migrating from old schema, apply `docs/sql/supabase-pivot-migration.sql`.
- Confirm Realtime publication includes: `rooms`, `room_players`, `room_messages`, `room_events`.
- Deploy edge function `timed-scene-notify` (`supabase/functions/timed-scene-notify/index.ts`), request body `{ roomId, sceneId }`.
- Install notifications package on client (`npx expo install expo-notifications`) and add `"expo-notifications"` to `app.json` plugins.
