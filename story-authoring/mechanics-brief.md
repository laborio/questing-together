# Mechanics Brief (Authoring Reference)

Use this file in GPT prompts to keep story content aligned with gameplay rules.

## Party + Roles
- 3 players: warrior, sage, ranger.
- Each player chooses one action per scene step.
- Each scene can have multiple steps.
- Action role can be `warrior`, `sage`, `ranger`, or `any`.

## Scene Flow
- Story scenes:
  - Phase 1: first reaction.
  - Phase 2: remaining players react.
  - Phase 3: vote on options.
- Voting is unlocked only after all 3 players reacted for the current step.
- Vote resolves by majority; ties are resolved randomly.
- `no_reaction` exists and can be used only after at least one action was taken.

## Evidence
- Evidence is unlocked only by explicit action outcomes (no text parsing).
- Evidence can unlock hidden options.
- Evidence confirmation requires at least 2 players marking the same evidence in the scene.
- Evidence is scene-local.

## Combat
- Combat scenes use shared role actions defined in story root.
- Party HP persists across scenes (start at 30).
- Enemy HP + attack defined per combat scene.
- Combat resolves automatically by rounds (no option voting).
- Escape is action-driven (`effect.run`), with a 2/3 vote threshold (for 3 players, that means 2).
- Combat outcomes map to options:
  - A = victory
  - B = defeat
  - C = escape

## Timed Scenes
- Timed scenes use `mode: "timed"` + `timed` config (`kind`, `durationSeconds`, optional `allowEarly`, `statusText`).
- Timed scenes do not use option voting.
- Timed resolution uses option `A` route after timer completion (or early finish if allowed).

## Branching
- Option routes can branch with conditions on:
  - global tags (`ifGlobal`)
  - scene tags (`ifScene`)
  - chosen action ids (`ifActions`)
- Route order matters: first matching route wins.
- Routes can end the story with `to: null`.

## Damage / Healing
- Non-combat scenes can add `hpDelta` via action outcomes or option outcomes.
- Safe or rest content can heal with positive `hpDelta`.

## Authoring Constraints (Important)
- Option ids are fixed to `A`, `B`, `C`.
- At least one option per scene must be `defaultVisible: true`.
- Every option present in `options` must have an entry in `outcomeByOption`.
- For non-combat scenes, include at least one step and ensure each action has a matching outcome entry.
