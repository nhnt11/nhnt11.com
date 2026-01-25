// Mouse-based background movement for desktop devices

const Parallax = (function() {
  let isFirstMove = true;

  function handleMouseMove(e) {
    const padding = LAYOUT.parallaxDeadzone;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const clampedX = Math.max(padding, Math.min(viewWidth - padding, e.clientX));
    const clampedY = Math.max(padding, Math.min(viewHeight - padding, e.clientY));

    const percentX = ((clampedX - padding) / (viewWidth - 2 * padding)) * 100;
    const percentY = ((clampedY - padding) / (viewHeight - 2 * padding)) * 100;

    // Smooth transition on first mouse entry to prevent jerk
    if (isFirstMove) {
      isFirstMove = false;
      Gallery.setTransition(`opacity ${TIMING.transitionSlow}ms ease-in-out, background-position ${TIMING.parallaxSmooth}ms ease-out`);
      setTimeout(() => Gallery.setTransition(''), TIMING.parallaxSmooth);
    }

    Gallery.setPosition(percentX, percentY);
  }

  function init() {
    document.addEventListener('mousemove', handleMouseMove);
  }

  return { init };
})();
