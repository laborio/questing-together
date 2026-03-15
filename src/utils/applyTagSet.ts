import type { TagSet } from '@/types/story';

export function applyTagSet(
  tags: TagSet | undefined,
  globalSet: Set<string>,
  sceneSet: Set<string>,
) {
  if (!tags) return;
  for (const tag of tags.global ?? []) globalSet.add(tag);
  for (const tag of tags.scene ?? []) sceneSet.add(tag);
}
