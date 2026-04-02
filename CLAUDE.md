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

### Identities (replaces classes)
- No fixed classes — all players share the same universal card pool
- Player picks an **Identity** that defines a dominant trait
- **Ashbound** (Fire), **Bulwark** (Guard), **Nightglass** (Shadow), **Tempest Core** (Storm), **Worldroot** (Nature)
- Identity definitions: `src/content/identities.ts`

### Combat (deckbuilder, turn-based)

Slay the Spire-inspired deckbuilder combat. Players play cards from a hand, spending energy. Cards belong to 5 traits (Fire, Guard, Shadow, Storm, Nature). Trait empowerment and convergence add strategic depth.

#### Card system
- **Starter deck**: 15 cards (3 Fire, 3 Guard, 3 Shadow, 2 Storm, 2 Nature, 2 Neutral, 1 Focus)
- **Reward card pool**: 20+ additional cards earned between fights
- Cards have **energy cost** (0-3), **trait**, **base/upgraded** values
- Cards **auto-upgrade** after being played X times (upgradeThreshold)
- **Hand size**: 4 cards per turn
- Card definitions: `src/content/cards.ts` (client) + `card_definitions` SQL table (server)

#### Energy system
- Start each turn with **3 energy** (upgradeable via bonuses)
- Each card costs 0-3 energy to play
- Unspent energy is lost at end of turn

#### Deck zones
- **Draw pile** → **Hand** (draw 4) → **Discard pile**
- When draw pile is exhausted, shuffle discard back in
- Hand, draw pile, discard all tracked as JSONB arrays server-side

#### Block & status effects
- **Block**: absorbs damage before HP. Resets each turn (unless persist bonus)
- **Burn**: DOT — deals damage at start of enemy phase, decrements by 1
- **Vulnerable**: +50% damage taken (turns-based, decrements each turn)
- **Weakened**: -25% damage dealt (turns-based, decrements each turn)
- **Thorns**: reflects damage when hit
- **Regen**: heals HP at end of each turn

#### Trait empowerment
- 5 traits: Fire, Guard, Shadow, Storm, Nature
- Each tracks a **charge counter** (0 to 3)
- Playing a card adds +1 charge to its trait
- At **3 charges** = **empowered** — next card from that trait is **amplified** (+50% all values)
- After amplified play: trait charge resets to 0

#### Convergence
- If **2+ traits** empowered simultaneously → **Convergence** button appears
- **Free action** — doesn't cost energy
- Each trait contributes its effect: Fire=16dmg, Guard=14block, Shadow=2vuln+2weak, Storm=2energy, Nature=12heal
- Multiplied by count: 2 traits=x1, 3=x1.5, 4=x2, 5=x2.5
- Resets all empowered traits to 0

#### Enemy intents
- Enemies have **intent patterns** (cycling list of actions per turn)
- Intents: 0=attack, 1=defend, 2=buff(+str), 3=heavy, 4=multi, 5=debuff, 6=charge, 7=special
- Enemy templates with HP/strength scaling per fight number
- Enemy definitions: `src/content/encounters.ts`

#### Turn flow
```
TURN N
├── Player Phase (simultaneous)
│   ├── Hand of 4 cards drawn from draw pile
│   ├── Play cards by spending energy (3 base)
│   ├── Optional: Convergence (free action, if 2+ traits empowered)
│   ├── "End Turn" when done
│   └── Wait for all alive players
│
├── Enemy Phase (host-triggered)
│   ├── Burn DOT ticks on enemies
│   ├── Each enemy acts based on intent pattern
│   ├── Damage goes through block first, then HP
│   ├── Status effects decrement
│   ├── Regen ticks on players
│   ├── Hand → discard, draw new hand of 4
│   └── Energy resets, block resets (unless persist)
│
└── TURN N+1
```

#### State tracking
- `combat_turns` table — turn number, phase, per room+screen
- `player_turn_state` table — has_ended_turn
- `player_combat_state` table — identity, draw_pile, hand, discard_pile (all JSONB), energy, block, trait_charges, status effects, bonuses
- `enemy_combat_state` table — template_id, hp, strength, block, intent_index, status effects
- `card_definitions` table — server-side card data (mirrors `src/content/cards.ts`)
- Realtime subscriptions on all combat tables

#### Key RPCs
- `combat_init_turn(room_id, screen_id)` — creates turn 1, player states, starter deck, draws hand
- `combat_play_card(room_id, hand_index, target_enemy_idx?, ...)` — validates energy, applies effects, updates charges
- `combat_use_convergence(room_id, target_enemy_idx?)` — free action, requires 2+ empowered traits
- `combat_end_turn(room_id)` — marks player done, if all done → phase = 'enemy'
- `combat_enemy_phase(room_id)` — burn DOT, enemy intents, damage through block, draw new hands

#### Post-combat rewards
- Card choices (pick 1 of 3 from reward pool)
- Upgrade choices (pick 1 of 3 cards to upgrade)
- Bonuses (+HP, +block, +energy, healing)
- Bonus definitions: `src/content/bonuses.ts`

#### Settings
- `src/constants/combatSettings.ts` — base HP, energy, hand size, empower threshold, reward params
- `src/content/cards.ts` — all card definitions, traits, convergence effects
- `src/content/encounters.ts` — enemy templates, encounter compositions
- `src/content/identities.ts` — identity definitions
- `src/content/bonuses.ts` — post-combat bonus definitions

### Content system (`src/content/`)
- **Data-driven** — all game content is in TS files, designed to be migrated to a Supabase DB + admin portal later
- `biomes.ts` — biome definitions (id, name, phases with narratives, combat intros, boss intros). 3 biomes: Cursed Forest, Sunken Sewers, Ruined Fortress
- `enemies.ts` — enemy templates per biome (early/core/bosses/finalBoss) with HP/attack multipliers
- `riddles.ts` — puzzle riddles with choices, rewards, penalties, time limits. Biome-specific or universal
- `shop.ts` — shop items with costs, effects, min bloc availability
- `spells.ts` — spell definitions (8 per class, 3 schools), school metadata, convergence effects. Mirrored in `spell_definitions` SQL table for server validation
- `index.ts` — barrel export for all content
- To add a new biome: add entry in `biomes.ts` + `enemies.ts`, optionally add riddles in `riddles.ts`
- To add new enemies/items/riddles: add to the relevant file, the adventure generator picks randomly
- To add/modify spells: update both `spells.ts` AND `spell_definitions` SQL table (must stay in sync)

### Database (Supabase)
- `rooms` — status (lobby/in_progress/finished), current_screen_position, current_bloc
- `room_players` — player_id (p1/p2/p3), role_id, display_name
- `characters` — name, level, hp, hp_max, gold, exp, taunt_turns_left
- `enemies` — per-screen enemies, hp, attack, is_dead, screen_id
- `adventure_screens` — bloc, phase, position, screen_type, config_json, is_completed
- `combat_turns` — turn_number, phase (player/enemy/resolved), per room+screen
- `player_turn_state` — actions_remaining, has_ended_turn, per player per combat turn
- `card_definitions` — server-side card reference (id, name, cost, trait, base/upgraded values, flags)
- `player_combat_state` — per-player deckbuilder state: identity, deck zones (JSONB), energy, block, trait_charges, status effects
- `enemy_combat_state` — per-enemy state: template_id, hp, strength, block, intent_index, status effects
- Key RPCs: `create_room`, `join_room`, `peek_room`, `start_adventure`, `cancel_adventure`, `generate_adventure`, `advance_screen`, `seed_enemies_for_screen`, `combat_init_turn`, `combat_play_card`, `combat_use_convergence`, `combat_end_turn`, `combat_enemy_phase`, `reset_combat`, `list_my_rooms`, `list_available_rooms`, `delete_room`
- SQL migrations in `src/api/sql/` (numbered 001-013), applied via `bun run db:migrate`

### State management
- TanStack Query for all Supabase data (queries + mutations)
- `useRoomConnection` hook — room state, players, characters, enemies, currentScreen, all mutations
- `GameContext` — wraps everything, exposed via `useGame()`
- Supabase Realtime subscriptions for live sync (rooms, room_players, characters, enemies, adventure_screens, combat_turns, player_turn_state, player_combat_state, enemy_combat_state)

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
├── content/            — game content data (biomes, cards, encounters, identities, bonuses, riddles, shop items)
├── contexts/           — GameContext, DecisionContext
├── features/
│   ├── home/           — GameLauncher, TitleScreen, RoomBrowser, CharacterPicker, PlayTestMenu
│   ├── lobby/          — LobbyContent
│   ├── combat/         — CombatScreen, components/ (EnemyList, CardHandGrid, CardView, SchoolChargeBar, Header, PortraitStrip...), hooks/, utils/
│   ├── story/          — story flow components
│   └── emote/          — party emotes
├── hooks/              — useRoomStory, usePartyEmotes, useColorScheme...
├── types/              — player.ts, story.ts, adventure.ts, combatTurn.ts, spellCombat.ts
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
