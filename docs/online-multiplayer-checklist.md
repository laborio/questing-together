# Online Multiplayer Checklist (Action Loop)

This app now supports only the systems required for the action-driven loop:
- room create/join + per-device player identity (`p1`, `p2`, `p3`)
- lobby role assignment (`sage`, `warrior`, `ranger`) with first-come-first-serve locking
- player display names (per-room, no spaces)
- synced scene progression (linear 5-scene story with per-option intro variants)
- mind-bond chat with per-scene message/character limits
- synced scene actions + action log
- decision voting after all reactions are resolved
- branching story graph with tag-driven routing + multiple endings
- story content lives in `src/story/story-data.json` and is validated at runtime
- optional combat scenes (shared combat actions, persistent party HP, automatic resolution)
- timed rest/travel scenes (server-authoritative timers, automatic advance)

## 1) Product rules locked

- Story shape: fixed linear sequence of 5 scenes.
- Adventure start: host starts only after 3 players pick unique roles.
- Scene flow: Phase 1 (first action), Phase 2 (remaining actions), Phase 3 (vote).
- Each player may take at most one action per scene (or choose “no reaction”).
- Timer: remaining players auto-skip after 6 hours (configurable).
- Decisions: one default option visible; hidden options unlock from action outcomes.
- Vote resolution: majority wins, random on tie, then advance scene.

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
- `room_messages` (mind-bond chat)
- `room_events` (scene/action/vote event stream)

## 4) Event stream contract (`room_events`)

Client action RPCs write these event types server-side:
- `story_select_role(p_room_id, p_role_id)`
- `story_set_display_name(p_room_id, p_display_name)`
- `story_start_adventure(p_room_id)`
- `story_take_action(p_room_id, p_scene_id, p_step_id, p_action_id)`
- `story_confirm_option(p_room_id, p_scene_id, p_step_id, p_option_id, p_next_scene_id)`
- `story_resolve_combat(p_room_id, p_scene_id, p_option_id, p_next_scene_id)`
- `story_start_timer(p_room_id, p_scene_id, p_step_id, p_duration_seconds)`
- `story_resolve_timed_scene(p_room_id, p_scene_id, p_option_id, p_next_scene_id, p_force)`
- `story_reset(p_room_id)`

Generated events:
- `scene_action`
  - payload: `{ sceneId, stepId, actionId, playerId }`
- `scene_resolve`
  - payload: `{ sceneId, optionId, mode, nextSceneId }`
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
