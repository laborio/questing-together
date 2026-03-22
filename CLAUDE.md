# Project context

Questing Together — multiplayer mobile RPG (React Native / Expo / Supabase).

## Game architecture

### Flow
```
Title Screen → Create Room / Join Room / Play Test
  → Character Picker (name + class)
  → Lobby (party, start adventure)
  → Adventure (gameplay loop)
  → Combat / Choice / Shop / Rest / Puzzle / Boss screens
```

### Gameplay loop
```
BLOC 1: EARLY (1-2 screens) → CORE (5-6 screens) → RESOLVE (boss + shop + rest)
BLOC 2: CORE → RESOLVE (difficulty ↑)
BLOC 3: CORE → FINAL BOSS
```

### Roles
- **Warrior** — 60 HP, Taunt (5 turns, redirects damage, -60% reduction)
- **Sage** — 40 HP, Fireball (6 damage single target)
- **Ranger** — 50 HP, Arrows (3 damage AoE)

### Combat (turn-based)

Each combat encounter alternates between **Player Phase** and **Enemy Phase**.

#### Turn flow
```
TURN N
├── Player Phase (simultaneous)
│   ├── Each player has 3 actions (attack, ability, heal — any mix)
│   ├── Actions apply damage immediately on enemies
│   ├── Cooldowns decrement once per turn (not per action)
│   ├── Player presses "End Turn" when done (can skip remaining actions)
│   └── Wait until ALL alive players have ended their turn
│
├── Enemy Phase (automatic, host-triggered)
│   ├── Each alive enemy attacks ALL alive players
│   ├── Taunt redirects all damage to Warrior (-60% reduction)
│   ├── Taunt/ability/heal cooldowns decrement by 1
│   └── Check party wipe → resolved or next turn
│
└── TURN N+1 (reset 3 actions per player)
```

#### Actions
- **Attack** — 3 dmg + (level - 1) to single target. No cooldown.
- **Ability** — role-dependent, 2-turn cooldown (server-enforced):
  - Warrior: Taunt (5 turns, redirects all enemy attacks, -60% reduction)
  - Sage: Fireball (6 damage, single target)
  - Ranger: Arrows (3 damage, AoE all enemies)
- **Heal** — +10 HP (capped at hp_max), 2-turn cooldown (server-enforced)

#### State tracking
- `combat_turns` table — turn number, phase (`player`/`enemy`/`resolved`), per room+screen
- `player_turn_state` table — actions remaining, has_ended_turn, per player per turn
- `characters` columns — `ability_cooldown_left`, `heal_cooldown_left` (server-authoritative)
- Realtime subscriptions on both tables for live sync

#### Key RPCs
- `combat_init_turn(room_id, screen_id)` — creates turn 1, player states
- `combat_attack/ability/heal` — check actions remaining + cooldowns, apply effect, decrement action
- `combat_end_turn(room_id)` — marks player done, if all done → phase = 'enemy'
- `combat_enemy_phase(room_id)` — all enemies attack, decrement cooldowns, next turn or party wipe

#### Level up
- XP needed = level × 100, HP scales with level (+10/level)

#### Settings
- `src/constants/combatSettings.ts` — damage values, cooldowns, actions per turn
- Adventure settings in `src/constants/adventureSettings.ts`

### Content system (`src/content/`)
- **Data-driven** — all game content is in TS files, designed to be migrated to a Supabase DB + admin portal later
- `biomes.ts` — biome definitions (id, name, phases with narratives, combat intros, boss intros). 3 biomes: Cursed Forest, Sunken Sewers, Ruined Fortress
- `enemies.ts` — enemy templates per biome (early/core/bosses/finalBoss) with HP/attack multipliers
- `riddles.ts` — puzzle riddles with choices, rewards, penalties, time limits. Biome-specific or universal
- `shop.ts` — shop items with costs, effects, min bloc availability
- `index.ts` — barrel export for all content
- To add a new biome: add entry in `biomes.ts` + `enemies.ts`, optionally add riddles in `riddles.ts`
- To add new enemies/items/riddles: add to the relevant file, the adventure generator picks randomly

### Database (Supabase)
- `rooms` — status (lobby/in_progress/finished), current_screen_position, current_bloc
- `room_players` — player_id (p1/p2/p3), role_id, display_name
- `characters` — name, level, hp, hp_max, gold, exp, taunt_turns_left
- `enemies` — per-screen enemies, hp, attack, is_dead, screen_id
- `adventure_screens` — bloc, phase, position, screen_type, config_json, is_completed
- `combat_turns` — turn_number, phase (player/enemy/resolved), per room+screen
- `player_turn_state` — actions_remaining, has_ended_turn, per player per combat turn
- Key RPCs: `create_room`, `join_room`, `peek_room`, `start_adventure`, `cancel_adventure`, `generate_adventure`, `advance_screen`, `seed_enemies_for_screen`, `combat_init_turn`, `combat_attack`, `combat_ability`, `combat_heal`, `combat_end_turn`, `combat_enemy_phase`, `reset_combat`, `list_my_rooms`, `list_available_rooms`, `delete_room`
- SQL migrations in `src/api/sql/` (numbered 001-009), applied via `bun run db:migrate`

### State management
- TanStack Query for all Supabase data (queries + mutations)
- `useRoomConnection` hook — room state, players, characters, enemies, currentScreen, all mutations
- `GameContext` — wraps everything, exposed via `useGame()`
- Supabase Realtime subscriptions for live sync (rooms, room_players, characters, enemies, adventure_screens, combat_turns, player_turn_state)

## Project structure

```
src/
├── api/
│   ├── hooks/          — useRoomConnection, useAnonymousAuth, usePushRegistration
│   ├── models/         — Character, Enemy (camelCase client types)
│   ├── sql/            — numbered SQL migrations (001-008)
│   ├── database.types.ts — auto-generated Supabase types
│   ├── queryClient.ts  — TanStack Query client
│   └── supabaseClient.ts
├── app/                — Expo Router file-based routing
│   ├── (public)/       — title screen (index.tsx)
│   └── (game)/         — lobby, adventure-setup, story
├── components/         — Design System (DS)
│   ├── display/        — Typography, Portrait, EnemyCard, StatBar, CircularHealthBar, RoomCard, StatusBadge, ModalBackdrop...
│   ├── input/          — Button, ActionButton, TextField, Stepper...
│   └── layout/         — Stack, BottomSheet, Card, Overlay, ScreenContainer...
├── constants/          — colors, combatSettings, adventureSettings, constants
├── content/            — game content data (biomes, enemies, riddles, shop items)
├── contexts/           — GameContext, DecisionContext
├── features/
│   ├── home/           — GameLauncher, TitleScreen, RoomBrowser, CharacterPicker, PlayTestMenu
│   ├── lobby/          — LobbyContent
│   ├── combat/         — CombatScreen, components/ (EnemyList, ActionGrid, Header, PortraitStrip...), hooks/, utils/
│   ├── story/          — story flow components
│   └── emote/          — party emotes
├── hooks/              — useRoomStory, usePartyEmotes, useColorScheme...
├── types/              — player.ts, story.ts, adventure.ts
└── utils/              — getErrorMessage, portraitByRole, homeScreenLayout...
```

## Related repos

- **story-editor**: `/Users/kevingraff/WebstormProjects/story-editor` — local web app (React + ReactFlow) to visualize and edit story branches.

## Code style rules

### Design System (DS)

- All reusable UI components live in `src/components/` organized by category:
  - `layout/` — screen structure, containers, backgrounds
  - `display/` — content presentation, text, decorations
  - `input/` — user interactions
- `src/components/index.ts` is the barrel — all consumers import from `@/components`
- All components use `export default`
- Feature-specific / domain components go in `src/features/`, NOT in `src/components/`

### Typography
- Use variant names, never custom `fontSize` in style props
- Variants: `h1`-`h6`, `body1`-`body3`, `caption`, `small`, `micro`, `subtitle`, `error`
- Legacy aliases still work: `title`, `heading`, `subheading`, `sectionTitle`, `body`, `bodySm`, `fine`

### Styling

- No `StyleSheet.create` — inline styles directly where used
- No hardcoded colors — every color must exist in `src/constants/colors.ts` and be referenced as `colors.xxx`
- Style config objects (like tone styles) go in `src/constants/`, not in component files
- Use `Typography` instead of `Text`, and DS button components instead of raw `Pressable`
- No nested ternaries — extract to a function if needed

### Exports & imports

- Components: `export default`
- Import from `@/components` barrel, not from individual files (except internal cross-references within components/)
- Respect Biome linting: `import type` for type-only imports, sorted imports/exports

### Supabase & Data

- DB types are auto-generated in `src/api/database.types.ts` — use these types for all Supabase queries, RPCs, and table references
- Regenerate with `bun run db:types` after any schema change
- API models (camelCase client types) live in `src/api/models/`
- Supabase hooks live in `src/api/hooks/` (camelCase filenames)
- Use TanStack Query (`useQuery`/`useMutation`) for all Supabase data fetching and mutations
- SQL files in `src/api/sql/` numbered for execution order
- Apply migrations: `bun run db:migrate`

### General

- No `let` — use `const` only (use `useRef` for mutable values)
- No `setTimeout` — use `requestAnimationFrame` polling or Reanimated callbacks
- Reusable layout logic goes in `src/utils/` as custom hooks
- Feature structure: `features/<name>/` with `components/`, `hooks/`, `utils/` subdirs
- Keep feature files thin: compose DS components, don't redefine UI primitives
- Animations use `react-native-reanimated` (already installed)
- SVG uses `react-native-svg` (already installed)

### EAS / Deployment

- Version in `app.json` only (not `package.json`)
- Env vars configured in Expo dashboard (all environments)
- `bun run build:preview` for internal builds
- `eas update --channel preview` for OTA updates (JS only, not native changes)
- Supabase project ID: `jjomkrlwakrtshdnsrtu`
- Link with: `npx supabase link --project-ref jjomkrlwakrtshdnsrtu`
