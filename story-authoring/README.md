# Story Authoring Pack

This folder is the single source of truth for story writing when using AI.
The app still reads `src/story/story-data.json`, but everything here is designed
to keep GPT prompts small and consistent.

Recommended workflow
1) Update `world-brief.md` if the setting or tone changes.
2) Write or edit scene content (see `scene-template.json`).
3) Update `src/story/story-data.json` (full story or scene-by-scene).
4) Regenerate `story-map.json` from runtime data:
   - `npx tsx scripts/generate-story-map.ts`
5) Run validation:
   - `npx tsx scripts/validate-story.ts`

Generate the story map automatically:
- `npx tsx scripts/generate-story-map.ts`

Notes
- `world-brief.md`, `mechanics-brief.md`, and `style-guide.md` should always be
  included in GPT prompts.
- For small edits, include target scene JSON + `story-map.json` + these briefs.
- `story-map.json` is a planning view, not the runtime source of truth.
