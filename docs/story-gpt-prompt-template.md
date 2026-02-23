# GPT Story Prompt Template

Use this template to ask GPT for a new story JSON that plugs directly into the app.

---

You are writing a complete story JSON for the game **Questing Together**.

Rules:
- Output **only valid JSON** (no Markdown, no comments, no trailing commas).
- Follow the provided JSON Schema exactly.
- Include **all scenes** and **all endings** in one JSON object.
- Each scene must include: `id`, `title`, `canonicalTruth`, `intro`, `evidence`, `steps`, `options`, `unlockRules`, `outcomeByOption`.
- Steps: include 1+ steps, each with 3 actions per role (warrior/sage/ranger) or `"any"` when shared.
- Each action has a matching outcome in `outcomes`.
- Each option has `next` routes.
- Include a `defaultVisible: true` option in each scene.
- Include at least 4 endings with `isEnding: true` and `next: [{ "to": null }]`.
- All IDs must be unique and referenced correctly.
- If you include any combat scenes (`"mode": "combat"`), include a root `"combat"` config and set `"combat"` on those scenes.

Schema (must conform):
PASTE THE JSON SCHEMA HERE: docs/story-schema.json

Design constraints:
- Use the world + tone from `story-authoring/world-brief.md`
- Follow mechanics from `story-authoring/mechanics-brief.md`
- Keep branching consistent with `story-authoring/story-map.json`
- Use `story-authoring/style-guide.md` for voice
- If editing one scene, output only that scene JSON

PASTE YOUR STORY REQUIREMENTS HERE (theme, number of scenes, branching goals, etc.)

Output:
Return **only** the final JSON object.
