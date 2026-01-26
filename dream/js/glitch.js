// Text glitch effect with random slice displacement

const Glitch = (function() {
  const container = document.querySelector('.dream-text-container');
  const slices = document.querySelectorAll('.dream-slice');
  const parallaxLayers = document.querySelectorAll('.dream-parallax');

  let isGlitching = false;
  let autoGlitchTimer = null;
  let lastGlitchChangedPalette = false;
  let manualPaletteChangeBlocksNext = false;
  let manualStrokeChangedPalette = false;
  let mouseIdleTimer = null;
  let parallaxFrame = null;

  // For velocity-based layer separation
  let prevMouseX = 0, prevMouseY = 0;
  let velocityX = 0, velocityY = 0;
  let separation = 0; // current separation amount

  function onMouseIdle() {
    manualStrokeChangedPalette = false;
  }

  function resetMouseIdleTimer() {
    if (mouseIdleTimer) clearTimeout(mouseIdleTimer);
    mouseIdleTimer = setTimeout(onMouseIdle, 300);
  }

  function doGlitch(shouldFreeze, isManual) {
    // 50% chance to randomize the color palette and glitch the background
    // But never two palette changes in a row
    // And if manual glitch changed palette, block the next auto glitch from doing so
    // And only one palette change per mouse stroke
    const blockedByManual = !isManual && manualPaletteChangeBlocksNext;
    const blockedByStroke = isManual && manualStrokeChangedPalette;
    if (!lastGlitchChangedPalette && !blockedByManual && !blockedByStroke && Math.random() < 0.5) {
      Visuals.randomizePalette();
      Visuals.triggerGlitch();
      lastGlitchChangedPalette = true;
      manualPaletteChangeBlocksNext = isManual;
      if (isManual) manualStrokeChangedPalette = true;
    } else {
      lastGlitchChangedPalette = false;
      if (!isManual) manualPaletteChangeBlocksNext = false;
    }

    // Clear any previous frozen state and set up new glitch
    slices.forEach(slice => {
      slice.style.opacity = '';
      slice.style.transform = '';
      slice.classList.remove('glitching');

      if (Math.random() > 0.3) {
        slice.style.setProperty('--glitch-x', `${(Math.random() - 0.5) * 60}px`);
        slice.style.setProperty('--glitch-skew', `${(Math.random() - 0.5) * 10}deg`);
        slice.classList.add('glitching');
      }
    });

    container.classList.add('glitching');

    setTimeout(() => {
      container.classList.remove('glitching');

      slices.forEach(slice => {
        if (shouldFreeze && slice.classList.contains('glitching')) {
          const x = slice.style.getPropertyValue('--glitch-x');
          const skew = slice.style.getPropertyValue('--glitch-skew');
          slice.classList.remove('glitching');
          slice.style.opacity = '1';
          slice.style.transform = `translateX(${x}) skewX(${skew})`;
        } else {
          slice.classList.remove('glitching');
        }
      });

      isGlitching = false;
    }, 100 + Math.random() * 200);
  }

  function trigger(scheduleNext = true) {
    if (isGlitching) return;
    isGlitching = true;
    const isManual = !scheduleNext;
    if (isManual) resetMouseIdleTimer();
    doGlitch(isManual, isManual);
  }

  function autoGlitch() {
    if (!isGlitching) {
      isGlitching = true;
      doGlitch(false, false);
    }
    scheduleAutoGlitch();
  }

  function scheduleAutoGlitch() {
    autoGlitchTimer = setTimeout(autoGlitch, 800 + Math.random() * 1700);
  }

  function updateParallax() {
    const mouse = Visuals.getMouse();

    // Calculate velocity
    const dx = mouse.x - prevMouseX;
    const dy = mouse.y - prevMouseY;
    prevMouseX = mouse.x;
    prevMouseY = mouse.y;

    // Smooth velocity
    velocityX = velocityX * 0.8 + dx * 0.2;
    velocityY = velocityY * 0.8 + dy * 0.2;
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

    // Separation increases with movement, converges when stopped
    const targetSeparation = Math.min(speed * 800, 1);
    separation += (targetSeparation - separation) * 0.1;

    // Base parallax - all layers move together
    const baseX = mouse.x * 25;
    const baseY = mouse.y * 20;

    // Layer offsets: spread along velocity direction
    const layerOffsets = [-1, 0, 1];
    const maxSpread = 30;

    parallaxLayers.forEach((layer, i) => {
      const spread = layerOffsets[i] * separation * maxSpread;
      // Spread in direction of movement
      const x = baseX + velocityX * spread * 50;
      const y = baseY + velocityY * spread * 50;
      layer.style.transform = `translate(${x}px, ${y}px)`;
    });

    parallaxFrame = requestAnimationFrame(updateParallax);
  }

  function init() {
    container.addEventListener('mousemove', () => trigger(false));
    setTimeout(scheduleAutoGlitch, 5500);
    // Start parallax animation
    updateParallax();
  }

  return { init, trigger };
})();
