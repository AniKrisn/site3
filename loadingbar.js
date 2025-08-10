// Retro 8-bit loading bar: fills over 2 seconds on page load
(function () {
  function startLoadingBar() {
    const overlay = document.getElementById('loading-overlay');
    const fill = document.querySelector('.loading-bar-fill');
    if (!overlay || !fill) return;

    // Kick the CSS transition on the next frame
    requestAnimationFrame(() => {
      fill.style.width = '100%';
    });

    // After 2s (match CSS), hide the overlay
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoadingBar, { once: true });
  } else {
    startLoadingBar();
  }
})();
