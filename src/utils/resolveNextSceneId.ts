import type { OptionId, Scene, SceneId, TagCondition } from '@/types/story';
import { applyTagSet } from '@/utils/applyTagSet';

function matchesCondition(tags: Set<string>, condition?: TagCondition): boolean {
  if (!condition) return true;
  if (condition.all?.some((tag) => !tags.has(tag))) return false;
  if (condition.any && condition.any.length > 0 && !condition.any.some((tag) => tags.has(tag)))
    return false;
  return !condition.none?.some((tag) => tags.has(tag));
}

export function resolveNextSceneId(
  scene: Scene,
  optionId: OptionId,
  globalTags: Set<string>,
  sceneTags: Set<string>,
  actionIds: Set<string>,
): SceneId | null {
  const option = scene.options.find((item) => item.id === optionId);
  if (!option) return null;

  const nextGlobalTags = new Set(globalTags);
  const nextSceneTags = new Set(sceneTags);
  applyTagSet(option.tagsAdded, nextGlobalTags, nextSceneTags);

  const routes = option.next ?? [];
  for (const route of routes) {
    if (!matchesCondition(nextGlobalTags, route.ifGlobal)) continue;
    if (!matchesCondition(nextSceneTags, route.ifScene)) continue;
    if (!matchesCondition(actionIds, route.ifActions)) continue;
    return route.to ?? null;
  }

  return null;
}
