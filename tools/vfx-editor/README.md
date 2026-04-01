# VFX Editor

Standalone local browser tool for authoring VFX JSON for the in-game runtime.

## Open It

From the repo root:

```bash
python3 -m http.server 4174
```

Then open:

```text
http://127.0.0.1:4174/tools/vfx-editor/
```

Important:

- Serve the **repo root**, not `tools/vfx-editor`, so the quick-load buttons can read the existing effect files from `src/features/vfx/assets/effects/`.
- For direct "Save Back to File", use a Chromium-based browser like Chrome, Arc, or Edge. Safari/Firefox will still work for preview and download.

## Workflow

1. Click `Quick Load` to inspect an existing effect, or `Open Effect JSON` to load one from disk.
2. Click `Link Repo Root` once and choose `/Users/xavierlaborie/Documents/questing-together` if you want the editor to autosave its own session file.
3. Click `Import Sprite` to add a new PNG/WebP/JPG/SVG into the VFX sprite folder and regenerate the runtime sprite registry.
4. Drag the `Spawn` and `Target` anchors in the preview stage.
5. Edit layer properties and `over lifetime` values from the right panel.
6. Toggle between `Keyframe List` and `Bezier Curve` mode for each track.
7. In `Bezier Curve` mode, drag anchors and weighted tangents; the editor bakes that curve back into linear runtime keys on export.
8. Scrub the timeline to inspect the full effect lifetime.
9. Use `Save Back to File` or `Download JSON`.

## Notes

- The editor is standalone and does not affect the app bundle unless you intentionally wire it into the app.
- The output format matches the current runtime JSON shape used by the VFX module.
- If the repo root is linked, the editor autosaves its own workspace state to `tools/vfx-editor/editor-session.json` and reloads it on refresh. This file is git-ignored.
- `Import Sprite` requires a Chromium-based browser and will ask you to pick the repo root so it can write the new image, update `manifest.json`, and regenerate `src/features/vfx/runtime/spriteRegistry.ts`.
- Imported SVG files are rasterized to PNG on import so they keep working through the existing app/runtime sprite pipeline.
