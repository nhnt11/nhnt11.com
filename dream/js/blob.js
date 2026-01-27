// The Blob - a curious guide through the dream journey

const Blob = (function() {
  // Mobile detection - set once at load, never changes
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Canvas setup
  let canvas, ctx;
  let width, height;

  // Touch tracking (mobile only)
  let touchX = 0, touchY = 0;
  let touchActive = false;

  // Gyroscope tracking (mobile only)
  let gyroX = 0, gyroY = 0; // Normalized -1 to 1
  let gyroSupported = false;
  let gyroPermissionGranted = false;

  // Blob state
  const state = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    radius: 20,
    baseRadius: 20,
    opacity: 0,
    visible: false,
    mood: 'curious', // curious, purposeful, searching, peaceful
    breathPhase: 0,
    wobblePhase: 0,
    emergenceProgress: 0,
    emerging: false,
    emerged: false,
    despawning: false,
    despawnProgress: 0,
    despawnX: 0,
    despawnY: 0,
    hoverGlow: 0, // Smoothly transitions for hover effect
    bursting: false, // RGB burst and reform animation
    burstPhase: 'none', // 'explode', 'reform', 'none'
    expanding: false, // Expand to fill screen animation
    expandProgress: 0
  };

  // Movement parameters
  const movement = {
    speed: 60, // Pixels per second - constant speed toward cursor
    wobbleAmount: 3,
    wobbleSpeed: 2,
    breathAmount: 0.2, // Pulsates between 0.8x and 1.2x (1.5x ratio)
    breathSpeed: 0.8 // Slower, more noticeable pulse
  };

  // Cursor tracking
  let mouseX = 0, mouseY = 0;
  let mouseInitialized = false;
  let cursorNearBlob = false;

  // Convergence point for spawn animation - follows mouse with same movement as blob
  let convergenceX = 0, convergenceY = 0;

  // Click handling
  let clickHandlers = [];
  let expandStartHandlers = [];
  const CLICK_RADIUS = 40;
  let shouldDespawnOnClick = false; // If false, burst and reform instead
  let shouldExpandOnClick = false; // For reprise -> conclusion transition
  let fragmentMultiplier = 1; // Can be increased for special sections
  let radiusMultiplier = 1; // Can be increased for larger blob
  let despawnLingerTime = 0; // Extra delay before fragments start evaporating

  // Interactive spawn - fragments spawn as mouse moves
  let interactiveSpawn = false;
  let targetFragmentCount = 0;
  let spawnedFragmentCount = 0;
  let lastMouseX = 0, lastMouseY = 0;
  let mouseMovementAccumulator = 0;
  const MOVEMENT_PER_FRAGMENT = 35; // Pixels of mouse movement to spawn one fragment

  // Timing
  const EMERGENCE_DELAY = 5500; // After intro animation (1.5s delay + 4s zoom)
  const EMERGENCE_DURATION = 2500;
  const DESPAWN_DURATION = 800;
  let emergenceTimeout = null; // Track scheduled emergence for cancellation

  // Glitch effect for reprise blob
  let glitchOffsetX = 0;
  let glitchOffsetY = 0;
  let glitchRGBOffsets = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]; // R, G, B
  let glitchTimer = 0;
  let glitchIntensity = 0; // 0-1, controls amount of glitch

  // Fragment system for spawn/despawn animations
  const fragments = [];
  const FRAGMENT_COUNT = 18;

  // Trail fragments - small particles that spawn and quickly evaporate
  const trailFragments = [];
  const TRAIL_LIFETIME = 0.6; // seconds before fully faded
  const TRAIL_RADIUS = 4;

  function spawnTrailFragment(x, y, useRGB = false, explodeFrom = null) {
    // Spawn a small trail fragment at the given position
    // If useRGB is true, pick a random RGB color; otherwise white
    // If explodeFrom is provided {x, y}, fragment will drift outward from that point
    let color = null;
    if (useRGB) {
      color = RGB_COLORS[Math.floor(Math.random() * RGB_COLORS.length)];
    }

    let driftX, driftY;
    let isExplosion = false;
    if (explodeFrom) {
      // Explode outward from the given point
      const dx = x - explodeFrom.x;
      const dy = y - explodeFrom.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 60 + Math.random() * 180; // 60-240 px/s outward (wide range)
      driftX = (dx / dist) * speed;
      driftY = (dy / dist) * speed;
      isExplosion = true;
    } else {
      // Slight drift in random direction
      driftX = (Math.random() - 0.5) * 20;
      driftY = (Math.random() - 0.5) * 20 - 10; // Slight upward bias
    }

    trailFragments.push({
      x: x,
      y: y,
      radius: TRAIL_RADIUS * (0.6 + Math.random() * 0.8), // 60-140% of base size
      opacity: 0.8,
      age: 0,
      color: color, // null = white, otherwise RGB
      driftX: driftX,
      driftY: driftY,
      isExplosion: isExplosion // Explosion fragments persist until off-screen
    });
  }

  function updateTrailFragments(dt) {
    // Update and remove expired trail fragments
    for (let i = trailFragments.length - 1; i >= 0; i--) {
      const frag = trailFragments[i];
      frag.age += dt;

      // Apply drift
      frag.x += frag.driftX * dt;
      frag.y += frag.driftY * dt;

      if (frag.isExplosion) {
        // Explosion fragments: stay full opacity, remove when off-screen
        const margin = 50;
        if (frag.x < -margin || frag.x > width + margin ||
            frag.y < -margin || frag.y > height + margin) {
          trailFragments.splice(i, 1);
        }
      } else {
        // Normal fragments: fade out over time
        frag.opacity = 0.8 * (1 - frag.age / TRAIL_LIFETIME);

        // Remove when faded
        if (frag.age >= TRAIL_LIFETIME) {
          trailFragments.splice(i, 1);
        }
      }
    }
  }

  function renderTrailFragments() {
    if (trailFragments.length === 0) return;

    // Use additive blending for nice glow
    ctx.globalCompositeOperation = 'lighter';

    trailFragments.forEach(frag => {
      if (frag.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = frag.opacity;

      // Get color (RGB or white)
      const color = frag.color || { r: 255, g: 255, b: 255 };
      const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

      // Soft glow
      const glowRadius = frag.radius * 3;
      const gradient = ctx.createRadialGradient(frag.x, frag.y, 0, frag.x, frag.y, glowRadius);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
      gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
      ctx.fillStyle = colorStr;
      ctx.fill();

      ctx.restore();
    });

    ctx.globalCompositeOperation = 'source-over';
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'blob-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function onMouseMove(e) {
    const prevX = mouseX;
    const prevY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Track movement for interactive spawn
    if (mouseInitialized && interactiveSpawn && state.emerging && !state.emerged) {
      const dx = mouseX - prevX;
      const dy = mouseY - prevY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      mouseMovementAccumulator += distance;
    }

    mouseInitialized = true;
  }

  // Touch event handlers (mobile only)
  function onTouchStart(e) {
    touchActive = true;
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
  }

  function onTouchMove(e) {
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
  }

  function onTouchEnd(e) {
    touchActive = false;
  }

  // Gyroscope permission request (iOS 13+ requires user gesture)
  async function requestGyroPermission() {
    if (!isMobile) return false;

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
    // Normalize to -1 to 1 range
    gyroX = Math.max(-1, Math.min(1, e.gamma / 45));
    gyroY = Math.max(-1, Math.min(1, (e.beta - 45) / 45)); // 45° is "neutral" holding position
  }

  function updateCursorState() {
    // Not clickable if not visible or not emerged
    if (!state.visible || !state.emerged) {
      canvas.style.pointerEvents = 'none';
      canvas.style.cursor = 'default';
      cursorNearBlob = false;
      return;
    }

    // Check if cursor is near blob
    const dx = mouseX - state.x;
    const dy = mouseY - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    cursorNearBlob = distance < CLICK_RADIUS;

    // Update canvas pointer-events based on proximity
    canvas.style.pointerEvents = cursorNearBlob ? 'auto' : 'none';
    canvas.style.cursor = cursorNearBlob ? 'pointer' : 'default';
  }

  // Helper function to handle blob tap/click at given coordinates
  function handleBlobInteraction(clientX, clientY) {
    if (!state.visible || !state.emerged) return false;

    const dx = clientX - state.x;
    const dy = clientY - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < CLICK_RADIUS) {
      triggerBlobAction();
      return true;
    }
    return false;
  }

  function triggerBlobAction() {
    // Expand, despawn, or burst based on context
    if (shouldExpandOnClick) {
      // For expand, don't notify handlers yet - they'll be notified when expand completes
      startExpand(() => {
        // Notify handlers after expand is done
        clickHandlers.forEach(fn => fn());
      });
    } else {
      // Trigger glitch effect for visual coherence
      if (typeof Glitch !== 'undefined') {
        Glitch.trigger(false);
      }

      // Cycle visual effect and palette with glitch transition
      if (typeof Visuals !== 'undefined') {
        Visuals.randomizePalette();
        Visuals.startCrossfade(); // This also triggers the shader glitch
      }

      // Save despawn flag before handlers run (handlers may change it via updateDOM)
      const shouldDespawn = shouldDespawnOnClick;

      // Notify handlers
      clickHandlers.forEach(fn => fn());

      // Use saved value to decide animation
      if (shouldDespawn) {
        startDespawn();
      } else {
        startBurst();
      }
    }
  }

  function onClick(e) {
    handleBlobInteraction(e.clientX, e.clientY);
  }

  // Touch tap handler for mobile (document-level to avoid pointer-events issues)
  function onTouchTap(e) {
    // Only handle single-finger taps
    if (e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    handleBlobInteraction(touch.clientX, touch.clientY);
  }

  function updateMovement(dt) {
    // Speed inversely proportional to distance - asymptotic approach
    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only move if we're not already very close
    if (distance > 0.5) {
      // Speed scales with distance - slower as we get closer
      // At 200px away, move at full speed. At 20px, move at 1/10 speed. etc.
      const referenceDistance = 200;
      const speedMultiplier = distance / referenceDistance;
      const actualSpeed = movement.speed * speedMultiplier;

      const moveDistance = actualSpeed * dt;
      const ratio = Math.min(moveDistance / distance, 1);

      state.x += dx * ratio;
      state.y += dy * ratio;
    }
  }

  function updateGlitch(dt) {
    // Only glitch during reprise blob building (interactive spawn with shouldExpandOnClick)
    const shouldGlitch = (state.emerging || state.emerged) && interactiveSpawn && shouldExpandOnClick;

    if (!shouldGlitch) {
      glitchIntensity = 0;
      return;
    }

    // Calculate glitch intensity based on blob growth
    const targetRadius = state.baseRadius * radiusMultiplier;
    if (state.emerged) {
      glitchIntensity = 1; // Max glitch when fully built
    } else {
      const growthRatio = state.radius / targetRadius;
      glitchIntensity = growthRatio * growthRatio; // Exponential ramp-up
    }

    // Glitch frequency increases with intensity
    // At low intensity: glitch every 200-400ms
    // At high intensity: glitch every 20-50ms (nearly continuous)
    const minInterval = 0.02;
    const maxInterval = 0.4;
    const glitchInterval = maxInterval - (maxInterval - minInterval) * glitchIntensity;

    glitchTimer += dt;
    if (glitchTimer >= glitchInterval) {
      glitchTimer = 0;

      // Random position offset (increases with intensity)
      const maxOffset = 15 * glitchIntensity;
      glitchOffsetX = (Math.random() - 0.5) * 2 * maxOffset;
      glitchOffsetY = (Math.random() - 0.5) * 2 * maxOffset;

      // RGB separation offsets (increases with intensity)
      const rgbOffset = 8 * glitchIntensity;
      for (let i = 0; i < 3; i++) {
        glitchRGBOffsets[i] = {
          x: (Math.random() - 0.5) * 2 * rgbOffset,
          y: (Math.random() - 0.5) * 2 * rgbOffset
        };
      }
    }
  }

  function updatePersonality(dt) {
    // Breathing pulse
    state.breathPhase += dt * movement.breathSpeed;
    const breathScale = 1 + Math.sin(state.breathPhase) * movement.breathAmount;

    // Organic wobble
    state.wobblePhase += dt * movement.wobbleSpeed;

    // Radius recovery (after click expansion) - skip during expand animation
    if (!state.expanding) {
      const targetRadius = state.baseRadius * radiusMultiplier;
      state.radius += (targetRadius * breathScale - state.radius) * 0.1;
    }

    // Smooth hover glow transition
    const targetGlow = cursorNearBlob && state.emerged ? 1 : 0;
    const glowSpeed = 8; // How fast the glow transitions
    state.hoverGlow += (targetGlow - state.hoverGlow) * glowSpeed * dt;

    // After emergence, actively follow the cursor (desktop) or touch (mobile)
    if (state.emerged && mouseInitialized) {
      // EXISTING BEHAVIOR - UNCHANGED for desktop
      state.targetX = mouseX;
      state.targetY = mouseY;
    }

    // Mobile-only: when mouse never initialized, use gyro or touch for blob target
    // This block ONLY runs on mobile when no mouse events occurred
    if (state.emerged && !mouseInitialized && isMobile) {
      if (touchActive) {
        // Follow touch position when finger is down
        state.targetX = touchX;
        state.targetY = touchY;
      } else if (gyroSupported) {
        // Wander based on device tilt when no touch
        const wanderX = width / 2 + gyroX * (width * 0.3);
        const wanderY = height / 2 + gyroY * (height * 0.3);
        state.targetX = wanderX;
        state.targetY = wanderY;
      }
    }
  }

  // RGB colors for spawn fragments - bright, luminescent versions
  const RGB_COLORS = [
    { r: 255, g: 120, b: 120 },   // Bright red/pink
    { r: 120, g: 255, b: 120 },   // Bright green
    { r: 120, g: 120, b: 255 }    // Bright blue/periwinkle
  ];

  function spawnSingleFragment(index) {
    // Random angle for spawn direction
    const angle = Math.random() * Math.PI * 2;
    // Spawn from outside screen
    const spawnDistance = Math.max(width, height) * 0.7 + Math.random() * 200;

    // Assign R, G, or B color
    const color = RGB_COLORS[index % 3];

    fragments.push({
      // Start position (outside screen)
      startX: convergenceX + Math.cos(angle) * spawnDistance,
      startY: convergenceY + Math.sin(angle) * spawnDistance,
      // Current position
      x: convergenceX + Math.cos(angle) * spawnDistance,
      y: convergenceY + Math.sin(angle) * spawnDistance,
      // Target follows convergence point
      targetX: convergenceX,
      targetY: convergenceY,
      // Fragment properties
      radius: 4 + Math.random() * 6,
      opacity: 0,
      color: color,
      // Timing - no delay for interactive spawn, small delay otherwise
      delay: interactiveSpawn ? 0 : Math.random() * 0.4,
      progress: 0,
      speed: 0.6 + Math.random() * 0.4,
      spawnTime: state.emergenceProgress // Track when this fragment was spawned
    });
  }

  function createSpawnFragments() {
    fragments.length = 0;
    // Initialize convergence point at mouse position (or screen center if mouse not initialized)
    convergenceX = mouseInitialized ? mouseX : width / 2;
    convergenceY = mouseInitialized ? mouseY : height / 2;

    targetFragmentCount = Math.floor(FRAGMENT_COUNT * fragmentMultiplier);
    spawnedFragmentCount = 0;
    mouseMovementAccumulator = 0;

    if (interactiveSpawn) {
      // For interactive spawn, don't create fragments yet - they spawn as mouse moves
      // But spawn a few initial fragments to show something is happening
      const initialFragments = 3;
      for (let i = 0; i < initialFragments; i++) {
        spawnSingleFragment(spawnedFragmentCount);
        spawnedFragmentCount++;
      }
    } else {
      // Normal spawn - create all fragments at once
      for (let i = 0; i < targetFragmentCount; i++) {
        spawnSingleFragment(i);
        spawnedFragmentCount++;
      }
    }
  }

  let despawnCenterX = 0, despawnCenterY = 0;

  function createDespawnFragments() {
    fragments.length = 0;

    // Remember the center for outward drift
    despawnCenterX = state.x;
    despawnCenterY = state.y;

    // 10-20 initial fragments
    const initialCount = 10 + Math.floor(Math.random() * 11);

    // Total area of fragments = 50% of big blob area
    // Area = π * r², so each fragment radius = R * sqrt(0.5 / N)
    const fragmentRadius = state.radius * Math.sqrt(0.5 / initialCount);

    for (let i = 0; i < initialCount; i++) {
      const angle = (i / initialCount) * Math.PI * 2 + Math.random() * 0.3;
      // Space out - distribute within the blob area
      const offset = Math.random() * state.radius * 0.8;

      const x = state.x + Math.cos(angle) * offset;
      const y = state.y + Math.sin(angle) * offset;

      // Outward drift from center
      const driftAngle = angle + (Math.random() - 0.5) * 0.5;
      const driftSpeed = 15 + Math.random() * 15;

      fragments.push({
        x: x,
        y: y,
        radius: fragmentRadius,
        opacity: 1,
        splitTime: despawnLingerTime + 0.1 + Math.random() * 0.2,
        drift: {
          x: Math.cos(driftAngle) * driftSpeed,
          y: Math.sin(driftAngle) * driftSpeed
        }
      });
    }
  }

  function splitFragment(frag) {
    if (frag.radius < 1) return []; // Too small to split further

    // 3-5 children per split
    const count = 3 + Math.floor(Math.random() * 3);

    // Total area of children = 50% of parent area
    // Each child radius = parentRadius * sqrt(0.5 / count)
    const childRadius = frag.radius * Math.sqrt(0.5 / count);

    if (childRadius < 1) return []; // Children would be too small

    const children = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const offset = frag.radius * 0.3 + Math.random() * frag.radius * 0.4;

      const x = frag.x + Math.cos(angle) * offset;
      const y = frag.y + Math.sin(angle) * offset;

      // Outward drift from original blob center
      const dx = x - despawnCenterX;
      const dy = y - despawnCenterY;
      const outwardAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
      const driftSpeed = 20 + Math.random() * 20;

      children.push({
        x: x,
        y: y,
        radius: childRadius,
        opacity: 1,
        splitTime: 0.15 + Math.random() * 0.25,
        drift: {
          x: Math.cos(outwardAngle) * driftSpeed,
          y: Math.sin(outwardAngle) * driftSpeed
        }
      });
    }

    return children;
  }

  function updateEmergence(dt) {
    if (!state.emerging || state.emerged) return;

    state.emergenceProgress += dt / (EMERGENCE_DURATION / 1000);

    // Move convergence point toward mouse with same asymptotic movement as blob
    if (mouseInitialized) {
      const dx = mouseX - convergenceX;
      const dy = mouseY - convergenceY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.5) {
        // Same movement as blob: speed inversely proportional to distance
        const referenceDistance = 200;
        const speedMultiplier = distance / referenceDistance;
        const actualSpeed = movement.speed * speedMultiplier;
        const moveDistance = actualSpeed * dt;
        const ratio = Math.min(moveDistance / distance, 1);

        convergenceX += dx * ratio;
        convergenceY += dy * ratio;
      }
    }

    // For interactive spawn, spawn new fragments based on mouse movement
    if (interactiveSpawn && spawnedFragmentCount < targetFragmentCount) {
      while (mouseMovementAccumulator >= MOVEMENT_PER_FRAGMENT && spawnedFragmentCount < targetFragmentCount) {
        mouseMovementAccumulator -= MOVEMENT_PER_FRAGMENT;
        spawnSingleFragment(spawnedFragmentCount);
        spawnedFragmentCount++;
      }
    }

    // First pass: update targets and move all fragments
    fragments.forEach(frag => {
      // Update target to follow convergence point
      frag.targetX = convergenceX;
      frag.targetY = convergenceY;

      // For interactive spawn, use time since this fragment was spawned
      // For normal spawn, use global emergence progress with delay
      let fragProgress;
      if (interactiveSpawn) {
        const timeSinceSpawn = state.emergenceProgress - (frag.spawnTime || 0);
        fragProgress = Math.min(1, timeSinceSpawn * frag.speed * 1.5);
      } else {
        // Apply delay for normal spawn
        if (state.emergenceProgress < frag.delay) {
          return;
        }
        fragProgress = Math.min(1, (state.emergenceProgress - frag.delay) / (1 - frag.delay) * frag.speed);
      }
      frag.progress = fragProgress;

      // Ease out cubic
      const eased = 1 - Math.pow(1 - fragProgress, 3);

      // Move toward convergence point
      frag.x = frag.startX + (frag.targetX - frag.startX) * eased;
      frag.y = frag.startY + (frag.targetY - frag.startY) * eased;

      // Stay fully visible - fade in quickly at start
      frag.opacity = Math.min(1, fragProgress * 4);
    });

    // Second pass: check which fragments have arrived at convergence point
    let arrivedCount = 0;
    const arrivalThreshold = 15; // Fragments "arrive" when this close to convergence

    fragments.forEach(frag => {
      if (frag.arrived) {
        arrivedCount++;
        return;
      }

      const distToTarget = Math.sqrt(
        Math.pow(frag.x - convergenceX, 2) + Math.pow(frag.y - convergenceY, 2)
      );

      // Mark as arrived when close enough to convergence point
      if (distToTarget < arrivalThreshold) {
        frag.arrived = true;
        arrivedCount++;
      }
    });

    // Grow the main blob based on how many fragments have arrived
    // For interactive spawn, use targetFragmentCount as the total
    const totalCount = interactiveSpawn ? targetFragmentCount : fragments.length;
    const targetRadius = state.baseRadius * radiusMultiplier;
    if (arrivedCount > 0) {
      const arrivalRatio = arrivedCount / totalCount;
      state.opacity = 1;
      state.radius = targetRadius * arrivalRatio;
    } else {
      state.opacity = 0;
      state.radius = 0;
    }
    // Blob position follows convergence point
    state.x = convergenceX;
    state.y = convergenceY;

    // For interactive spawn, only emerge when ALL target fragments have spawned AND arrived
    // For normal spawn, emerge when all current fragments have arrived
    const allSpawned = interactiveSpawn ? (spawnedFragmentCount >= targetFragmentCount) : true;
    const allArrived = arrivedCount >= totalCount;

    if (allSpawned && allArrived) {
      state.emerged = true;
      state.emerging = false;
      state.opacity = 1;
      state.radius = targetRadius;
      fragments.length = 0;
      // If shouldExpandOnClick is set, blob waits for click to trigger expand (no auto-expand)
    }
  }

  function updateDespawn(dt) {
    if (!state.despawning) return;

    state.despawnProgress += dt;

    // Update and split fragments
    const newFragments = [];

    for (let i = fragments.length - 1; i >= 0; i--) {
      const frag = fragments[i];

      // Apply drift
      frag.x += frag.drift.x * dt;
      frag.y += frag.drift.y * dt;

      // Count down to split
      frag.splitTime -= dt;

      if (frag.splitTime <= 0) {
        // Time to split - create children and remove this fragment
        const children = splitFragment(frag);
        newFragments.push(...children);
        fragments.splice(i, 1);
      } else if (frag.radius < 1) {
        // Too small, just remove
        fragments.splice(i, 1);
      }
    }

    // Add new fragments from splits
    fragments.push(...newFragments);

    // Done when all fragments are gone
    if (fragments.length === 0) {
      state.despawning = false;
      state.visible = false;
    }
  }

  // Burst animation - RGB fragments explode outward then reform
  const BURST_EXPLODE_DURATION = 0.3; // seconds
  const BURST_REFORM_DURATION = 2.5; // seconds - same as spawn emergence
  const BURST_DISTANCE = 0.25; // fraction of screen width
  let burstStartX = 0, burstStartY = 0;
  let burstTime = 0;
  let burstConvergenceX = 0, burstConvergenceY = 0;

  function createBurstFragments() {
    fragments.length = 0;
    burstStartX = state.x;
    burstStartY = state.y;

    const baseExplodeDistance = width * BURST_DISTANCE;
    const count = Math.floor(FRAGMENT_COUNT * fragmentMultiplier);

    for (let i = 0; i < count; i++) {
      // Evenly distributed angles with slight randomness
      const angle = (i / FRAGMENT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;

      // Assign R, G, or B color
      const color = RGB_COLORS[i % 3];

      // Each fragment gets a different distance (0.4x to 1.4x base distance)
      const distanceMultiplier = 0.4 + Math.random() * 1.0;
      const explodeDistance = baseExplodeDistance * distanceMultiplier;

      // Target position when fully exploded
      const explodeX = burstStartX + Math.cos(angle) * explodeDistance;
      const explodeY = burstStartY + Math.sin(angle) * explodeDistance;

      fragments.push({
        // Start at blob center
        x: burstStartX,
        y: burstStartY,
        // Explode target (becomes start position for reform)
        explodeX: explodeX,
        explodeY: explodeY,
        // Fragment properties
        radius: 5 + Math.random() * 4,
        opacity: 1,
        color: color,
        angle: angle,
        // Reform properties
        progress: 0,
        speed: 0.8 + Math.random() * 0.4, // Slightly varied speeds
        arrived: false
      });
    }
  }

  function startBurst() {
    if (state.bursting || state.despawning || !state.visible) return;

    state.bursting = true;
    state.burstPhase = 'explode';
    state.emerged = false;
    state.opacity = 0; // Hide main blob during burst
    burstTime = 0;

    createBurstFragments();
  }

  function updateBurst(dt) {
    if (!state.bursting) return;

    burstTime += dt;

    if (state.burstPhase === 'explode') {
      // Explode outward
      const progress = Math.min(1, burstTime / BURST_EXPLODE_DURATION);
      const eased = 1 - Math.pow(1 - progress, 2); // Ease out

      fragments.forEach(frag => {
        frag.x = burstStartX + (frag.explodeX - burstStartX) * eased;
        frag.y = burstStartY + (frag.explodeY - burstStartY) * eased;
      });

      if (progress >= 1) {
        state.burstPhase = 'reform';
        burstTime = 0;
        // Initialize convergence point at current mouse position
        burstConvergenceX = mouseInitialized ? mouseX : burstStartX;
        burstConvergenceY = mouseInitialized ? mouseY : burstStartY;
        // Store start positions for reform (the exploded positions)
        fragments.forEach(frag => {
          frag.startX = frag.x;
          frag.startY = frag.y;
          frag.progress = 0;
          frag.arrived = false;
        });
      }
    } else if (state.burstPhase === 'reform') {
      // Move convergence point toward mouse (same as blob movement)
      if (mouseInitialized) {
        const dx = mouseX - burstConvergenceX;
        const dy = mouseY - burstConvergenceY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.5) {
          const referenceDistance = 200;
          const speedMultiplier = distance / referenceDistance;
          const actualSpeed = movement.speed * speedMultiplier;
          const moveDistance = actualSpeed * dt;
          const ratio = Math.min(moveDistance / distance, 1);

          burstConvergenceX += dx * ratio;
          burstConvergenceY += dy * ratio;
        }
      }

      // Update reform progress (same timing as spawn)
      const reformProgress = burstTime / BURST_REFORM_DURATION;

      // Move fragments toward convergence point (like spawn animation)
      let arrivedCount = 0;
      const arrivalThreshold = 15;

      fragments.forEach(frag => {
        if (frag.arrived) {
          arrivedCount++;
          return;
        }

        // No delay - start immediately with varied speeds
        const fragProgress = Math.min(1, reformProgress * frag.speed);
        frag.progress = fragProgress;

        // Ease in-out for smooth reversal - starts slow (continuing deceleration from explosion)
        // then accelerates toward the convergence point
        const eased = fragProgress < 0.5
          ? 2 * fragProgress * fragProgress
          : 1 - Math.pow(-2 * fragProgress + 2, 2) / 2;

        // Move toward convergence point
        frag.x = frag.startX + (burstConvergenceX - frag.startX) * eased;
        frag.y = frag.startY + (burstConvergenceY - frag.startY) * eased;

        // Check if arrived
        const distToTarget = Math.sqrt(
          Math.pow(frag.x - burstConvergenceX, 2) + Math.pow(frag.y - burstConvergenceY, 2)
        );

        if (distToTarget < arrivalThreshold) {
          frag.arrived = true;
          arrivedCount++;
        }
      });

      // Grow blob as fragments arrive (same as spawn)
      const targetRadius = state.baseRadius * radiusMultiplier;
      if (arrivedCount > 0) {
        const arrivalRatio = arrivedCount / fragments.length;
        state.opacity = 1;
        state.radius = targetRadius * arrivalRatio;
      }
      state.x = burstConvergenceX;
      state.y = burstConvergenceY;

      // Complete when all fragments have arrived
      if (arrivedCount >= fragments.length) {
        state.bursting = false;
        state.burstPhase = 'none';
        state.emerged = true;
        state.opacity = 1;
        state.radius = targetRadius;
        fragments.length = 0;
      }
    }
  }

  // Expand animation - blob grows to fill screen
  const EXPAND_DURATION = 3.0; // seconds to fill screen
  const EXPAND_LINGER = 1.0; // seconds to stay white
  let expandCallback = null;
  let expandCallbackFired = false;

  function startExpand(onComplete) {
    if (state.expanding || state.despawning || !state.visible) return;

    state.expanding = true;
    state.expandProgress = 0;
    expandCallback = onComplete;
    expandCallbackFired = false;

    // Notify expand start handlers
    expandStartHandlers.forEach(fn => fn());

    // Trigger heavy glitch during expand
    if (typeof Glitch !== 'undefined') {
      Glitch.triggerHeavy();
    }
  }

  function updateExpand(dt) {
    if (!state.expanding) return;

    state.expandProgress += dt;

    if (state.expandProgress < EXPAND_DURATION) {
      // Expanding phase - grow to fill screen
      const progress = state.expandProgress / EXPAND_DURATION;
      // Ease out - fast at first, slow at end
      const eased = 1 - Math.pow(1 - progress, 2);

      // Calculate radius needed to fill screen from current position
      const maxDist = Math.max(
        Math.sqrt(state.x * state.x + state.y * state.y),
        Math.sqrt((width - state.x) * (width - state.x) + state.y * state.y),
        Math.sqrt(state.x * state.x + (height - state.y) * (height - state.y)),
        Math.sqrt((width - state.x) * (width - state.x) + (height - state.y) * (height - state.y))
      );

      const startRadius = state.baseRadius * radiusMultiplier;
      state.radius = startRadius + (maxDist * 1.5 - startRadius) * eased;
    } else if (state.expandProgress < EXPAND_DURATION + EXPAND_LINGER) {
      // Lingering phase - stay expanded, trigger callback early so next section shows
      // This ensures the white conclusion section appears while blob is still visible

      // Maintain full-screen radius during linger
      const maxDist = Math.max(
        Math.sqrt(state.x * state.x + state.y * state.y),
        Math.sqrt((width - state.x) * (width - state.x) + state.y * state.y),
        Math.sqrt(state.x * state.x + (height - state.y) * (height - state.y)),
        Math.sqrt((width - state.x) * (width - state.x) + (height - state.y) * (height - state.y))
      );
      state.radius = maxDist * 1.5;

      if (!expandCallbackFired && expandCallback) {
        expandCallbackFired = true;
        expandCallback();
        expandCallback = null;
      }
    } else {
      // Done - blob can disappear now (conclusion section has white bg)
      state.expanding = false;
      state.visible = false;
      state.emerged = false;
    }
  }

  function renderFragments() {
    // Use additive blending for RGB light pulses during spawn or burst
    const useAdditive = (state.emerging && !state.emerged) || state.bursting;
    if (useAdditive) {
      ctx.globalCompositeOperation = 'lighter';
    }

    fragments.forEach(frag => {
      // Don't render fragments that have arrived (they're under the main blob)
      if (frag.opacity <= 0 || frag.radius <= 0 || frag.arrived) return;

      ctx.save();
      ctx.globalAlpha = frag.opacity;

      // Get color (RGB for spawn, white for despawn)
      const color = frag.color || { r: 255, g: 255, b: 255 };
      const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;
      const colorAlpha = (a) => `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;

      // Light pulse glow - larger and more intense
      const glowRadius = frag.radius * 4;
      const gradient = ctx.createRadialGradient(frag.x, frag.y, 0, frag.x, frag.y, glowRadius);
      gradient.addColorStop(0, colorAlpha(0.8));
      gradient.addColorStop(0.3, colorAlpha(0.4));
      gradient.addColorStop(1, colorAlpha(0));
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Fragment core - bright center
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
      ctx.fillStyle = colorStr;
      ctx.fill();

      ctx.restore();
    });

    // Reset composite operation
    if (useAdditive) {
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function renderMainBlob() {
    if (state.opacity <= 0 || state.radius <= 0) return;

    let wobbleX = 0;
    let wobbleY = 0;

    // Use glitch effect for reprise blob building, normal wobble otherwise
    if (glitchIntensity > 0) {
      wobbleX = glitchOffsetX;
      wobbleY = glitchOffsetY;
    } else if (state.emerged) {
      // Normal wobble when fully emerged
      wobbleX = Math.sin(state.wobblePhase) * movement.wobbleAmount;
      wobbleY = Math.cos(state.wobblePhase * 0.7) * movement.wobbleAmount;
    }

    const x = state.x + wobbleX;
    const y = state.y + wobbleY;

    // Cursor proximity effect - uses smooth hoverGlow transition
    const proximityGlow = state.hoverGlow * 0.15;

    ctx.save();
    ctx.globalAlpha = state.opacity;

    if (glitchIntensity > 0) {
      // RGB separation glitch effect
      ctx.globalCompositeOperation = 'lighter';

      const rgbColors = [
        { r: 255, g: 80, b: 80 },   // Red
        { r: 80, g: 255, b: 80 },   // Green
        { r: 80, g: 80, b: 255 }    // Blue
      ];

      for (let i = 0; i < 3; i++) {
        const color = rgbColors[i];
        const offsetX = x + glitchRGBOffsets[i].x;
        const offsetY = y + glitchRGBOffsets[i].y;

        // Glow
        const glowSize = 2;
        const gradient = ctx.createRadialGradient(offsetX, offsetY, state.radius * 0.5, offsetX, offsetY, state.radius * glowSize);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, state.radius * glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, state.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Normal white blob rendering
      // Outer glow (smoothly enhanced when cursor near)
      const glowIntensity = 0.2 + proximityGlow;
      const glowSize = 2 + state.hoverGlow * 0.5; // 2 -> 2.5
      const gradient = ctx.createRadialGradient(x, y, state.radius * 0.5, x, y, state.radius * glowSize);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glowIntensity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(x, y, state.radius * glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(x, y, state.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Trail fragments render even when blob is not visible (for reprise mouse feedback)
    renderTrailFragments();

    if (!state.visible) return;

    // Draw fragments first (behind main blob)
    if (fragments.length > 0) {
      renderFragments();
    }

    // Draw main blob on top (covers arriving fragments)
    renderMainBlob();
  }

  let lastTime = 0;

  function animate(time) {
    const dt = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    updateEmergence(dt);
    updateDespawn(dt);
    updateBurst(dt);
    updateExpand(dt);
    updateMovement(dt);
    updatePersonality(dt);
    updateGlitch(dt);
    updateTrailFragments(dt);
    updateCursorState();
    render();

    requestAnimationFrame(animate);
  }

  function startEmergence() {
    state.visible = true;
    state.emerging = true;
    state.emerged = false;
    state.emergenceProgress = 0;
    state.opacity = 0;

    // Start position: center of screen
    state.x = width / 2;
    state.y = height / 2;
    state.targetX = width / 2;
    state.targetY = height / 2;

    // Create spawn fragments
    createSpawnFragments();
  }

  function startDespawn() {
    if (state.despawning || !state.visible) return;

    // Hide main blob immediately
    state.despawning = true;
    state.despawnProgress = 0;
    state.emerged = false;
    state.opacity = 0;

    // Create despawn fragments at current blob position
    createDespawnFragments();
  }

  function spawnAt(x, y) {
    // Instantly spawn blob at given position (no emergence animation)
    state.visible = true;
    state.emerging = false;
    state.emerged = true;
    state.opacity = 1;
    state.x = x;
    state.y = y;
    state.targetX = x;
    state.targetY = y;
    state.radius = state.baseRadius * radiusMultiplier;
    state.despawning = false;
    state.bursting = false;
    state.expanding = false;
    fragments.length = 0;
  }

  function init() {
    createCanvas();
    resize();

    // Track mouse position from the start
    document.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('resize', resize);

    // Mobile-only: touch event listeners
    if (isMobile) {
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: true });
      document.addEventListener('touchend', onTouchEnd);
      // Tap handler for blob interaction (document-level to avoid pointer-events issues)
      document.addEventListener('touchend', onTouchTap);
    }

    // Start animation loop
    requestAnimationFrame(animate);

    // Schedule emergence after intro animation
    emergenceTimeout = setTimeout(startEmergence, EMERGENCE_DELAY);
  }

  // Public API
  function setTarget(x, y) {
    state.targetX = x;
    state.targetY = y;
  }

  function setMood(mood) {
    state.mood = mood;

    // Adjust movement parameters based on mood
    switch (mood) {
      case 'curious':
        movement.speed = 60;
        movement.wobbleAmount = 3;
        break;
      case 'purposeful':
        movement.speed = 100;
        movement.wobbleAmount = 1;
        break;
      case 'searching':
        movement.speed = 40;
        movement.wobbleAmount = 5;
        break;
      case 'peaceful':
        movement.speed = 30;
        movement.wobbleAmount = 2;
        break;
    }
  }

  function onBlobClick(fn) {
    clickHandlers.push(fn);
  }

  function onExpandStart(fn) {
    expandStartHandlers.push(fn);
  }

  function getPosition() {
    return { x: state.x, y: state.y };
  }

  function isVisible() {
    return state.visible && state.emerged;
  }

  function respawn() {
    // Respawn after a despawn
    if (state.despawning) return;
    startEmergence();
  }

  function setShouldDespawn(value) {
    shouldDespawnOnClick = value;
  }

  function setShouldExpand(value) {
    shouldExpandOnClick = value;
  }

  function setFragmentMultiplier(value) {
    fragmentMultiplier = value;
  }

  function setInteractiveSpawn(value) {
    interactiveSpawn = value;
  }

  function setRadiusMultiplier(value) {
    radiusMultiplier = value;
  }

  function setDespawnLingerTime(value) {
    despawnLingerTime = value;
  }

  function isExpanding() {
    return state.expanding;
  }

  function addInteractiveMovement(amount) {
    // Add movement to the interactive spawn accumulator
    // Used for clicks during reprise blob building
    if (interactiveSpawn && state.emerging && !state.emerged) {
      mouseMovementAccumulator += amount;
    }
  }

  function hide() {
    // Instantly hide the blob without animation
    state.visible = false;
    state.emerged = false;
    state.emerging = false;
    state.despawning = false;
    state.bursting = false;
    state.expanding = false;
    state.opacity = 0;
    fragments.length = 0;
    // Cancel any pending emergence
    if (emergenceTimeout) {
      clearTimeout(emergenceTimeout);
      emergenceTimeout = null;
    }
  }

  // Getters for touch/gyro state (used by journey.js)
  function getTouchPosition() {
    return { x: touchX, y: touchY, active: touchActive };
  }

  function getGyroTilt() {
    return { x: gyroX, y: gyroY, supported: gyroSupported };
  }

  function isMobileDevice() {
    return isMobile;
  }

  return {
    init,
    setTarget,
    setMood,
    onBlobClick,
    onExpandStart,
    getPosition,
    isVisible,
    despawn: startDespawn,
    hide,
    respawn,
    spawnAt,
    setShouldDespawn,
    setShouldExpand,
    setFragmentMultiplier,
    setInteractiveSpawn,
    setRadiusMultiplier,
    setDespawnLingerTime,
    isExpanding,
    spawnTrailFragment,
    addInteractiveMovement,
    // Mobile API
    getTouchPosition,
    getGyroTilt,
    requestGyroPermission,
    isMobileDevice
  };
})();
