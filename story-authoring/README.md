# Story Authoring Pack

This folder is the single source of truth for story writing when using AI.
The app still reads `src/story/story-data.json`, but everything here is designed
to keep GPT prompts small and consistent.

Recommended workflow
1) Update `world-brief.md` if the setting or tone changes.
2) Update `story-map.json` to match your intended branching.
3) Write or edit one scene at a time (see `scene-template.json`).
4) Paste the resulting scene into the runtime JSON or build script (later).
5) Run `npx tsx scripts/validate-story.ts`.

Generate the story map automatically:
- `npx tsx scripts/generate-story-map.ts`

Notes
- `world-brief.md`, `mechanics-brief.md`, and `style-guide.md` should always be
  included in GPT prompts.
- For small edits, only include the target scene + `story-map.json` so GPT
  can keep IDs consistent without reading the whole story.
