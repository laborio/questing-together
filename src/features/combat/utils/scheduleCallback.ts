/**
 * Schedules a JS callback after a delay using requestAnimationFrame polling.
 * Frame-accurate alternative to setTimeout.
 */
export function scheduleCallback(delayMs: number, fn: () => void) {
  const start = performance.now();
  const poll = () => {
    if (performance.now() - start >= delayMs) {
      fn();
    } else {
      requestAnimationFrame(poll);
    }
  };
  requestAnimationFrame(poll);
}
