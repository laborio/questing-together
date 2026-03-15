import rawStoryData from '@/constants/storyConfig.json';
import type { Scene, SceneId, StoryData } from '@/types/story';
import { assertStoryData } from '@/utils/assertStoryData';

export const STORY_CONFIG: StoryData = assertStoryData(rawStoryData);

export const SCENE_BY_ID: Record<SceneId, Scene> = Object.fromEntries(
  STORY_CONFIG.scenes.map((scene) => [scene.id, scene]),
) as Record<SceneId, Scene>;
