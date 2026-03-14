# Story Editor

Local web app to visualize story branches, edit multiple story JSON files, and choose which one is applied to `src/story/story-data.json` for the game.

## Setup

```
cd tools/story-editor
npm install
npm run dev
```

Open `http://localhost:5178`.

## Notes

- Story files live in `src/story/library/*.json`.
- **Save JSON** writes to the selected library file.
- **Apply to Game** copies the selected story into `src/story/story-data.json` and marks it active.
- Saving the active story file also keeps `src/story/story-data.json` in sync automatically.
- Ctrl+Z / Cmd+Z outside inputs undoes the last committed change.
- Validation uses `docs/story-schema.json` plus cross-reference checks.
