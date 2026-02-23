import fs from 'node:fs';
import path from 'node:path';

type TagCondition = {
  all?: string[];
  any?: string[];
  none?: string[];
};

type TagRoute = {
  ifGlobal?: TagCondition;
  ifScene?: TagCondition;
  to: string | null;
};

type SceneOption = {
  id: string;
  next: TagRoute[];
};

type Scene = {
  id: string;
  title: string;
  intro?: string;
  isEnding?: boolean;
  mode?: 'story' | 'combat' | 'timed';
  combat?: {
    enemyName?: string;
  };
  timed?: {
    kind?: string;
    durationSeconds?: number;
  };
  options?: SceneOption[];
};

type StoryData = {
  version?: number;
  meta?: Record<string, unknown>;
  startSceneId: string;
  scenes: Scene[];
};

const DEFAULT_INPUT = path.join(process.cwd(), 'src', 'story', 'story-data.json');
const DEFAULT_OUTPUT = path.join(process.cwd(), 'story-authoring', 'story-map.json');

function toSentence(text: string, maxLength = 140): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const sentenceEnd = trimmed.search(/[.!?]\s/);
  const slice = sentenceEnd > -1 ? trimmed.slice(0, sentenceEnd + 1) : trimmed;
  if (slice.length <= maxLength) return slice;
  return `${slice.slice(0, maxLength - 1)}…`;
}

function buildRoutes(options: SceneOption[] | undefined): Record<string, TagRoute[]> {
  if (!options) return {};
  return options.reduce<Record<string, TagRoute[]>>((acc, option) => {
    acc[option.id] = option.next ?? [];
    return acc;
  }, {});
}

function inferSceneType(scene: Scene): string {
  if (scene.isEnding) return 'ending';
  if (scene.mode === 'combat' || scene.combat) return 'combat';
  if ((scene as Scene).mode === 'timed' || (scene as Scene).timed) return 'timed';
  return 'story';
}

function run(): void {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

  const json = fs.readFileSync(inputPath, 'utf8');
  const story = JSON.parse(json) as StoryData;

  const map = {
    version: 1,
    title: String(story.meta?.title ?? 'Story Map'),
    generatedAt: new Date().toISOString(),
    startSceneId: story.startSceneId,
    notes: 'Auto-generated from src/story/story-data.json. Edit source story instead.',
    scenes: story.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      type: inferSceneType(scene),
      summary: toSentence(scene.intro ?? ''),
      enemy: scene.combat?.enemyName ?? undefined,
      routes: buildRoutes(scene.options)
    }))
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2) + '\n', 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Story map generated at ${outputPath}`);
}

run();
