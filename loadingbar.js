// Retro 8-bit loading bar: custom-timed fill with stutter start and random finish (total ~2s)
(function () {
  function startLoadingBar() {
    const overlay = document.getElementById('loading-overlay');
    const fill = document.querySelector('.loading-bar-fill');
    if (!overlay || !fill) return;

    const TOTAL_MS = 2000;
    const STUTTER_MS = 250;            // initial slow/stutter segment
    const RANDOM_END_MS = 300;          // last segment with random jumps
    const MAIN_MS = TOTAL_MS - STUTTER_MS - RANDOM_END_MS; // middle, smooth-ish

    const PROGRESS_AT_STUTTER_END = 0.12; // ~12%
    const PROGRESS_AT_MAIN_END = 0.88;    // ~88%

    const BAR_STEPS = 24; // quantize to chunky steps

    let currentProgress = 0; // 0..1
    let lastTick = performance.now();
    const start = lastTick;

    // helper to quantize to chunky steps
    function quantize(progress) {
      const stepped = Math.round(progress * BAR_STEPS) / BAR_STEPS;
      return Math.max(0, Math.min(1, stepped));
    }

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 1, 3) / 2;
    }

    function tick(now) {
      const elapsed = now - start;

      let target = currentProgress;

      if (elapsed <= STUTTER_MS) {
        // Stuttered start: small, uneven increments; slow overall
        // Update only every ~40-70ms to create visible stepping
        if (now - lastTick > 40 + Math.random() * 30) {
          const remaining = PROGRESS_AT_STUTTER_END - currentProgress;
          const maxStep = Math.max(0.01, remaining * 0.5);
          const step = Math.random() * Math.min(0.04, maxStep);
          target = currentProgress + step;
          lastTick = now;
        }
      } else if (elapsed <= STUTTER_MS + MAIN_MS) {
        // Smooth middle towards ~88%
        const t = (elapsed - STUTTER_MS) / MAIN_MS; // 0..1
        const smoothed = easeInOutCubic(Math.max(0, Math.min(1, t)));
        target = PROGRESS_AT_STUTTER_END + smoothed * (PROGRESS_AT_MAIN_END - PROGRESS_AT_STUTTER_END);
      } else {
        // Random finish: jumpy increments to 100%
        const endElapsed = elapsed - (TOTAL_MS - RANDOM_END_MS);
        const ft = Math.max(0, Math.min(1, endElapsed / RANDOM_END_MS));
        const base = PROGRESS_AT_MAIN_END + Math.sqrt(ft) * (1 - PROGRESS_AT_MAIN_END); // bias to faster finish

        // Only advance if we have a randomly-sized gap to close
        if (now - lastTick > 50 + Math.random() * 70) {
          const remaining = 1 - currentProgress;
          const minStep = Math.min(0.02, remaining);
          const maxStep = Math.min(0.08, remaining);
          const randomStep = minStep + Math.random() * (maxStep - minStep);
          target = Math.max(currentProgress, Math.max(base, currentProgress + randomStep));
          lastTick = now;
        } else {
          target = Math.max(currentProgress, base);
        }
      }

      // Clamp, quantize, and apply
      currentProgress = quantize(Math.min(1, target));
      fill.style.width = Math.round(currentProgress * 100) + '%';

      if (elapsed < TOTAL_MS) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);

    // After total duration, ensure full and hide
    setTimeout(() => {
      fill.style.width = '100%';
      overlay.classList.add('hidden');
    }, TOTAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoadingBar, { once: true });
  } else {
    startLoadingBar();
  }
})();
