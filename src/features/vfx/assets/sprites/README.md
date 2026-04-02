VFX sprite assets live here.

How to add a new sprite:

1. Drop a PNG/WebP with transparency into this folder.
2. Add it to `/Users/xavierlaborie/Documents/questing-together/src/features/vfx/assets/sprites/manifest.json`.
3. Regenerate `/Users/xavierlaborie/Documents/questing-together/src/features/vfx/runtime/spriteRegistry.ts`.

Or use the standalone editor `Import Sprite` button, which performs all of that automatically.

Notes:

- Runtime JSON stores `spriteId`, not a raw file path.
- `manifest.json` is the shared source of truth for sprite ids and filenames.
- The React Native app resolves `spriteId` through the generated runtime sprite registry.
- The standalone editor resolves `spriteId` from `manifest.json`.
- Sprite layers and sprite trails can optionally use `tintColor` to fill the sprite alpha with a chosen color.
