function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function scrollToTopSmooth(durationMs = 850): void {
  if (typeof window === "undefined") return;

  const startY = window.scrollY;
  if (startY <= 0) return;

  const startedAt = performance.now();

  function step(now: number) {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, Math.round(startY * (1 - eased)));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
