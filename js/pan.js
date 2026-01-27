// Touch-based panning and auto-pan for mobile devices
// With optional gyroscope-based parallax when available

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

  // Gyroscope state
  let gyroSupported = false;
  let gyroPermissionGranted = false;
  let gyroX = 0, gyroY = 0; // Normalized -1 to 1
  let gyroTargetX = 50, gyroTargetY = 50; // Target position based on tilt
  let gyroPermissionRequested = false;

  // Gyroscope permission request (iOS 13+ requires user gesture)
  async function requestGyroPermission() {
    if (gyroPermissionRequested) return gyroPermissionGranted;
    gyroPermissionRequested = true;

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        gyroPermissionGranted = permission === 'granted';
      } catch (e) {
        gyroPermissionGranted = false;
      }
    } else {
      // Android and older iOS don't need permission
      gyroPermissionGranted = true;
    }

    if (gyroPermissionGranted) {
      window.addEventListener('deviceorientation', onDeviceOrientation);
      gyroSupported = true;
    }

    return gyroPermissionGranted;
  }

  function onDeviceOrientation(e) {
    // beta: front-back tilt (-180 to 180), gamma: left-right (-90 to 90)
    // Normalize to -1 to 1 range, with 45° as neutral holding angle
    gyroX = Math.max(-1, Math.min(1, e.gamma / 30)); // ±30° range
    gyroY = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); // 45° neutral, ±30° range

    // Map gyro tilt to 0-100% position
    // Inverted so tilting right moves view right (shows left side of image)
    gyroTargetX = 50 + gyroX * 50;
    gyroTargetY = 50 + gyroY * 50;
  }

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

    // Use gyro-based positioning when available
    if (gyroSupported && !isTouching) {
      // Smooth interpolation toward gyro target (ease factor ~0.08 for smooth movement)
      const ease = 0.08;
      currentX += (gyroTargetX - currentX) * ease;
      currentY += (gyroTargetY - currentY) * ease;

      // Clamp to valid range
      currentX = Math.max(0, Math.min(100, currentX));
      currentY = Math.max(0, Math.min(100, currentY));

      updatePosition();
      animationId = requestAnimationFrame(animate);
      return;
    }

    // Fall back to auto-pan when gyro not available
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

    // Request gyro permission on first touch (iOS requires user gesture)
    if (!gyroPermissionRequested) {
      requestGyroPermission();
    }

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
