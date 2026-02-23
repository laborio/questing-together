# Story Editor

Local web app to visualize story branches and edit `src/story/story-data.json` directly.

## Setup

```
cd tools/story-editor
npm install
npm run dev
```

Open `http://localhost:5178`.

## Notes

- Uses the repo story file directly; **Save** writes to `src/story/story-data.json`.
- Ctrl+Z / Cmd+Z outside inputs undoes the last committed change.
- Validation uses `docs/story-schema.json` plus cross-reference checks.
