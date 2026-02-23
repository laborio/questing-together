import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const storyPath = path.join(repoRoot, 'src', 'story', 'story-data.json');
const schemaPath = path.join(repoRoot, 'docs', 'story-schema.json');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/story', async (_req, res) => {
  try {
    const json = await fs.readFile(storyPath, 'utf8');
    res.type('application/json').send(json);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read story data.' });
  }
});

app.post('/api/story', async (req, res) => {
  try {
    const body = req.body ?? {};
    const formatted = JSON.stringify(body, null, 2) + '\n';
    await fs.writeFile(storyPath, formatted, 'utf8');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write story data.' });
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
