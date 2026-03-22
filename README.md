# Questing Together

Multiplayer Text RPG Adventure built with Expo (React Native) and Supabase.

## Getting Started

```bash
bun install
npx expo start --clear
```

## Scripts

| Script | Description |
|---|---|
| `bun run start` | Start Expo dev server |
| `bun run ios` | Run on iOS |
| `bun run android` | Run on Android |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Format code with Biome |
| `bun run db:migrate` | Apply all SQL migrations + regenerate types |
| `bun run db:types` | Regenerate Supabase DB types only |
| `bun run build:dev` | EAS build (development, iOS) |
| `bun run build:preview` | EAS build (preview, iOS) |
| `bun run update:preview` | EAS OTA update (preview channel) |

## Supabase

### First-time setup

Login to the Supabase CLI and link the project:

```bash
npx supabase login          # opens browser to authenticate
npx supabase link --project-ref jjomkrlwakrtshdnsrtu
```

You only need to do this once. It creates a `supabase/.temp` directory locally to store the link.

### Apply migrations

All SQL migrations live in `src/api/sql/`. Old/deprecated migrations are in `src/api/sql/old/`.

Apply all migrations at once:

```bash
bun run db:migrate
```

This runs every `.sql` file in `src/api/sql/` (alphabetical order) against the linked project, then regenerates the TypeScript types.

To add a new migration, create a `.sql` file in `src/api/sql/` — it will be picked up automatically.

### Generate DB types only

```bash
bun run db:types
```

This generates `src/api/database.types.ts` from the live database schema.

## Combat System (Turn-Based)

Combat alternates between a **Player Phase** (simultaneous) and an **Enemy Phase** (automatic).

### Turn Flow

```
TURN N
├── Player Phase (simultaneous for all players)
│   ├── Each player has 3 actions per turn
│   ├── Actions: Attack, Ability, Heal (any mix, any order)
│   ├── Damage applies immediately — no waiting
│   ├── Cooldowns are server-enforced, decrement once per turn
│   ├── "End Turn" button to signal readiness (can skip unused actions)
│   └── Phase ends when ALL alive players have ended their turn
│
├── Enemy Phase (automatic, triggered by host)
│   ├── Every alive enemy attacks every alive player
│   ├── If a Warrior has Taunt active: ALL enemy damage redirected to them (-60%)
│   ├── Cooldowns (ability, heal, taunt) decrement by 1
│   └── Party wipe check
│
└── TURN N+1 — actions reset to 3, continue
```

### Actions

| Action | Effect | Cooldown |
|--------|--------|----------|
| Attack | 3 + (level - 1) damage to single target | None |
| Ability | Role-dependent (see Roles) | 5 turns |
| Heal | +10 HP (capped at hp_max) | 3 turns |

### Roles

| Role | HP | Ability | Description |
|------|----|---------|-------------|
| Warrior | 60 | Taunt | Redirects ALL enemy attacks to self for 5 turns, -60% damage reduction |
| Sage | 40 | Fireball | 6 damage to single target |
| Ranger | 50 | Arrows | 3 damage to ALL enemies (AoE) |

### Database

- **`combat_turns`** — turn_number, phase (`player`/`enemy`/`resolved`), per room+screen
- **`player_turn_state`** — actions_remaining (resets to 3), has_ended_turn, per player
- **`characters`** — `ability_cooldown_left`, `heal_cooldown_left` (server-authoritative)

### Key RPCs

| RPC | Description |
|-----|-------------|
| `combat_init_turn` | Creates turn 1 + player states when entering combat |
| `combat_attack/ability/heal` | Validates actions + cooldowns, applies effect |
| `combat_end_turn` | Marks player done; all done → enemy phase |
| `combat_enemy_phase` | All enemies attack, cooldowns decrement, next turn or party wipe |

## Tech Stack

- **App**: Expo (React Native), Expo Router, TypeScript
- **State**: TanStack Query, React Context
- **Backend**: Supabase (Postgres, Auth, Realtime)
- **Styling**: Inline styles, custom design system (`src/components/`)
- **Linting**: Biome
