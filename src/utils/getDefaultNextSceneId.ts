import type { SceneId } from '@/types/story';
import { STORY_CONFIG } from '@/utils/storyConfig';

export function getDefaultNextSceneId(sceneId: SceneId): SceneId | null {
  const currentIndex = STORY_CONFIG.scenes.findIndex((scene) => scene.id === sceneId);
  if (currentIndex < 0) return null;
  const nextScene = STORY_CONFIG.scenes[currentIndex + 1];
  return nextScene ? nextScene.id : null;
}
