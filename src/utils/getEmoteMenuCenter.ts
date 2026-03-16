import type { Point } from '@/utils/resolveHighlightedEmote';

const OPTION_RADIUS = 112;
const OPTION_BUBBLE_SIZE = 82;

const getEmoteMenuCenter = (
  launcherLayout: { x: number; y: number; width: number; height: number } | null,
  windowWidth: number,
  windowHeight: number,
  insetTop: number,
  insetBottom: number,
): Point | null => {
  if (!launcherLayout) return null;
  const desiredX = launcherLayout.x + launcherLayout.width / 2;
  const desiredY = launcherLayout.y + launcherLayout.height / 2;
  const padding = OPTION_RADIUS + OPTION_BUBBLE_SIZE / 2 + 12;
  return {
    x: Math.min(windowWidth - padding, Math.max(padding, desiredX)),
    y: Math.min(windowHeight - insetBottom - padding, Math.max(insetTop + padding, desiredY)),
  };
};

export { getEmoteMenuCenter };
