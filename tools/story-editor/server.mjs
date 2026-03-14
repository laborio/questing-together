import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const runtimeStoryPath = path.join(repoRoot, 'src', 'story', 'story-data.json');
const storyLibraryDir = path.join(repoRoot, 'src', 'story', 'library');
const storyLibraryConfigPath = path.join(repoRoot, 'src', 'story', 'story-library.json');
const schemaPath = path.join(repoRoot, 'docs', 'story-schema.json');
const DEFAULT_STORY_FILE = 'default-story.json';

const app = express();
app.use(express.json({ limit: '10mb' }));

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function normalizeStoryFileName(input) {
  if (typeof input !== 'string') {
    throw new Error('Story file name is required.');
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Story file name is required.');
  }

  const safeBaseName = path
    .basename(trimmed)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  if (!safeBaseName || safeBaseName === '.json') {
    throw new Error('Story file name is invalid.');
  }

  return safeBaseName.endsWith('.json') ? safeBaseName : `${safeBaseName}.json`;
}

function getStoryFilePath(fileName) {
  return path.join(storyLibraryDir, normalizeStoryFileName(fileName));
}

async function readStoryLibraryConfig() {
  try {
    const json = await fs.readFile(storyLibraryConfigPath, 'utf8');
    const parsed = JSON.parse(json);
    return {
      activeStoryFile:
        typeof parsed?.activeStoryFile === 'string' && parsed.activeStoryFile.trim()
          ? normalizeStoryFileName(parsed.activeStoryFile)
          : null
    };
  } catch (error) {
    return { activeStoryFile: null };
  }
}

async function writeStoryLibraryConfig(activeStoryFile) {
  await fs.writeFile(
    storyLibraryConfigPath,
    formatJson({ activeStoryFile: normalizeStoryFileName(activeStoryFile) }),
    'utf8'
  );
}

async function listStoryFiles() {
  const entries = await fs.readdir(storyLibraryDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function ensureStoryLibrary() {
  await fs.mkdir(storyLibraryDir, { recursive: true });

  let storyFiles = await listStoryFiles();
  if (storyFiles.length === 0) {
    const runtimeJson = await fs.readFile(runtimeStoryPath, 'utf8');
    await fs.writeFile(getStoryFilePath(DEFAULT_STORY_FILE), runtimeJson, 'utf8');
    storyFiles = await listStoryFiles();
  }

  const config = await readStoryLibraryConfig();
  const activeStoryFile =
    config.activeStoryFile && storyFiles.includes(config.activeStoryFile)
      ? config.activeStoryFile
      : storyFiles[0] ?? DEFAULT_STORY_FILE;

  if (activeStoryFile !== config.activeStoryFile) {
    await writeStoryLibraryConfig(activeStoryFile);
  }

  return { activeStoryFile, storyFiles };
}

async function writeLibraryStory(fileName, story) {
  await fs.writeFile(getStoryFilePath(fileName), formatJson(story), 'utf8');
}

async function writeRuntimeStory(story) {
  await fs.writeFile(runtimeStoryPath, formatJson(story), 'utf8');
}

async function buildStoryList(activeStoryFile) {
  const storyFiles = await listStoryFiles();
  const stories = await Promise.all(
    storyFiles.map(async (fileName) => {
      try {
        const json = await fs.readFile(getStoryFilePath(fileName), 'utf8');
        const story = JSON.parse(json);
        const title = typeof story?.meta?.title === 'string' && story.meta.title.trim() ? story.meta.title : fileName;
        return {
          fileName,
          title,
          version: typeof story?.version === 'number' ? story.version : null,
          sceneCount: Array.isArray(story?.scenes) ? story.scenes.length : null,
          isActive: fileName === activeStoryFile,
          isValidJson: true
        };
      } catch (error) {
        return {
          fileName,
          title: `${fileName} (invalid JSON)`,
          version: null,
          sceneCount: null,
          isActive: fileName === activeStoryFile,
          isValidJson: false
        };
      }
    })
  );

  return stories;
}

app.get('/api/stories', async (_req, res) => {
  try {
    const { activeStoryFile } = await ensureStoryLibrary();
    const stories = await buildStoryList(activeStoryFile);
    res.json({ activeStoryFile, stories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list story files.' });
  }
});

app.post('/api/story', async (req, res) => {
  try {
    const { activeStoryFile } = await ensureStoryLibrary();
    const payload = req.body ?? {};
    const fileName = normalizeStoryFileName(payload.fileName ?? activeStoryFile ?? DEFAULT_STORY_FILE);
    const story = payload.story ?? payload;

    await writeLibraryStory(fileName, story);

    const isActive = fileName === activeStoryFile;
    if (isActive) {
      await writeRuntimeStory(story);
    }

    res.json({ ok: true, fileName, syncedToGame: isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write story file.' });
  }
});

app.post('/api/story/apply', async (req, res) => {
  try {
    await ensureStoryLibrary();
    const payload = req.body ?? {};
    const fileName = normalizeStoryFileName(payload.fileName ?? DEFAULT_STORY_FILE);

    const story =
      payload.story ??
      JSON.parse(await fs.readFile(getStoryFilePath(fileName), 'utf8'));

    await writeLibraryStory(fileName, story);
    await writeRuntimeStory(story);
    await writeStoryLibraryConfig(fileName);

    res.json({ ok: true, fileName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply story to the game.' });
  }
});

app.get('/api/story', async (req, res) => {
  try {
    const { activeStoryFile, storyFiles } = await ensureStoryLibrary();
    const requestedFile =
      typeof req.query.file === 'string' && req.query.file.trim()
        ? normalizeStoryFileName(req.query.file)
        : activeStoryFile;

    if (!requestedFile || !storyFiles.includes(requestedFile)) {
      res.status(404).json({ error: 'Story file not found.' });
      return;
    }

    const json = await fs.readFile(getStoryFilePath(requestedFile), 'utf8');
    const story = JSON.parse(json);

    res.json({
      fileName: requestedFile,
      activeStoryFile,
      story
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read story data.' });
  }
});

app.get('/api/schema', async (_req, res) => {
  try {
    const json = await fs.readFile(schemaPath, 'utf8');
    res.type('application/json').send(json);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read schema.' });
  }
});

const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true }
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', async (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const port = process.env.PORT ? Number(process.env.PORT) : 5178;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Story editor running at http://localhost:${port}`);
});
