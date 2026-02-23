# Mechanics Brief (Authoring Reference)

Use this file in GPT prompts to keep story content aligned with gameplay rules.

## Party + Roles
- 3 players: warrior, sage, ranger.
- Each player chooses one action per scene step.
- Each scene can have multiple steps (prototype often uses 1).

## Scene Flow
- Phase 1: first reaction.
- Phase 2: remaining players react.
- Phase 3: vote on options.
- Vote resolves by majority; tie -> random.

## Evidence
- Evidence is unlocked only by explicit action outcomes (no text parsing).
- Evidence can unlock hidden options.
- Evidence is scene-local (tags optional).

## Combat
- Combat scenes use shared role actions defined in story root.
- Party HP persists across scenes (start at 30).
- Enemy HP + attack defined per combat scene.
- Run action: majority vote triggers escape (if allowed).
- No RNG (deterministic resolution).

## Damage / Healing
- Non-combat scenes can add `hpDelta` via action outcomes or option outcomes.
- Rest or safe scenes can heal via positive `hpDelta`.

## Branching
- Option routes can branch based on tags (global or scene).
- Combat outcomes map to options A/B/C:
  - A = victory
  - B = defeat
  - C = escape
