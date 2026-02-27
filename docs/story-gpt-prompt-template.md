# GPT Story Prompt Template

Use this template to generate story JSON compatible with Questing Together.

---

You are writing JSON for the game **Questing Together**.

## Output Mode
Use exactly one mode:
- `full_story`: return one full story object compatible with `src/story/story-data.json`.
- `single_scene`: return one scene object only (for replacing one existing scene).

Mode for this run: `PASTE_MODE_HERE`

## Hard Output Rules
- Output **JSON only** (no Markdown, no comments, no trailing commas).
- Do not invent fields outside the provided schema.
- Keep ids stable and references valid.

## Runtime/Validation Constraints
- Option ids are fixed to `A`, `B`, `C`.
- Each scene must have at least one `defaultVisible: true` option.
- Each option present in `options` must exist in `outcomeByOption`.
- Each option must have a non-empty `next` array.
- Route `to` can be a scene id or `null`.
- Non-combat scenes must have at least one step, and each action must have a matching outcome.
- If any scene is combat (`mode: "combat"` or has `combat`), include root `combat` config in full story mode.
- Timed scenes use `mode: "timed"` + `timed` config.

## Branching Rules
- `next` routes may use:
  - `ifGlobal` (global tags)
  - `ifScene` (scene tags)
  - `ifActions` (action ids chosen in current scene)
- Route order matters (first matching route is used).

## Gameplay Semantics (for writing)
- Story scenes: react -> react -> react -> vote.
- Vote resolves by majority; ties resolve randomly.
- Evidence unlock is deterministic via outcomes/evidence ids.
- Combat outcomes map to options:
  - `A` = victory
  - `B` = defeat
  - `C` = escape
- Timed scenes resolve via option `A` route when timer ends.

## Context To Use
- Schema: `docs/story-schema.json`
- Mechanics: `story-authoring/mechanics-brief.md`
- Style: `story-authoring/style-guide.md`
- World: `story-authoring/world-brief.md`
- Branch planning map: `story-authoring/story-map.json`

## Author Request
PASTE YOUR STORY REQUIREMENTS HERE
(theme, scene count target, branching goals, endings target, specific characters, etc.)

## Mode-specific Output
- If mode is `full_story`: return one full story JSON object.
- If mode is `single_scene`: return one scene JSON object only.

