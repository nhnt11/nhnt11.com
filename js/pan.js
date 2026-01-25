// Touch-based panning and auto-pan for mobile devices

const Pan = (function() {
  let body;
  let animationId = null;
  let startTime = null;
  let params = null;
  let currentX = 50;
  let currentY = 50;
  let isTouching = false;

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let hasPanned = false;
  let wasRevealedBeforePan = false;

  function initParams(isFirst) {
    const data = Gallery.getImageData(Gallery.getCurrentIndex());
    if (!data) return null;

    const direction = Math.random() < 0.5 ? 1 : -1;
    const angleOffset = (Math.random() - 0.5) * 30;
    const angleRad = angleOffset * Math.PI / 180;

    return {
      direction,
      speedX: LAYOUT.panSpeedX,
      speedY: LAYOUT.panSpeedX * Math.tan(angleRad),
      startX: isFirst ? 50 : currentX,
      startY: isFirst ? 50 : currentY
    };
  }

  function updatePosition() {
    Gallery.setPosition(currentX, currentY);
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    if (!params) {
      params = initParams(true);
      if (!params) {
        animationId = requestAnimationFrame(animate);
        return;
      }
    }

    const elapsed = timestamp - startTime;
    const deltaX = elapsed * params.speedX * params.direction;
    const deltaY = elapsed * params.speedY * params.direction;

    currentX = Math.max(0, Math.min(100, params.startX + deltaX));
    currentY = Math.max(0, Math.min(100, params.startY + deltaY));

    updatePosition();
    animationId = requestAnimationFrame(animate);
  }

  function startNewPan(isFirst) {
    startTime = null;
    params = initParams(isFirst);
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(animate);
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    if (e.target.closest('a, button')) return;

    isTouching = true;
    hasPanned = false;
    wasRevealedBeforePan = body.classList.contains('bg-reveal');
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    panStartX = currentX;
    panStartY = currentY;

    Gallery.setTransition(`opacity ${TIMING.transitionSlow}ms ease-in-out`);

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function handleTouchMove(e) {
    if (!isTouching || e.touches.length !== 1) return;
    e.preventDefault();

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    if (!hasPanned) {
      const pixelDeltaX = Math.abs(touchX - touchStartX);
      const pixelDeltaY = Math.abs(touchY - touchStartY);
      if (pixelDeltaX > LAYOUT.tapThreshold || pixelDeltaY > LAYOUT.tapThreshold) {
        hasPanned = true;
        body.classList.add('bg-reveal');
      }
    }

    const deltaX = ((touchStartX - touchX) / window.innerWidth) * 100;
    const deltaY = ((touchStartY - touchY) / window.innerHeight) * 100;

    currentX = Math.max(0, Math.min(100, panStartX + deltaX));
    currentY = Math.max(0, Math.min(100, panStartY + deltaY));

    updatePosition();
  }

  function handleTouchEnd() {
    if (!isTouching) return;
    isTouching = false;

    Gallery.setTransition('');

    if (hasPanned) {
      if (wasRevealedBeforePan) {
        body.classList.add('bg-reveal');
      } else {
        body.classList.remove('bg-reveal');
      }
    } else {
      const edgeZone = window.innerWidth * LAYOUT.tapEdgeZone;
      if (touchStartX < edgeZone) {
        if (!Gallery.isTransitioning()) {
          Gallery.cycle(-1, true);
          Gallery.resetTimer();
        }
      } else if (touchStartX > window.innerWidth - edgeZone) {
        if (!Gallery.isTransitioning()) {
          Gallery.cycle(1, true);
          Gallery.resetTimer();
        }
      } else {
        body.classList.toggle('bg-reveal');
      }
    }

    startNewPan(false);
  }

  function init(elements) {
    body = elements.body;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    Gallery.onCycle(function() {
      if (!isTouching) startNewPan(false);
    });

    const checkAndStart = setInterval(() => {
      if (Gallery.getImageData(Gallery.getCurrentIndex())) {
        clearInterval(checkAndStart);
        startNewPan(true);
      }
    }, 100);
  }

  return {
    init,
    isTouching: () => isTouching,
  };
})();
