// Journey - state machine for the dream experience

const Journey = (function() {
  // Mobile detection - set once at load, never changes
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Section definitions
  const sections = [
    {
      id: 'intro',
      text: 'dream',
      blob: { mood: 'curious', behavior: 'emerge' }
    },
    {
      id: 'believe',
      text: 'believe',
      blob: { mood: 'curious' }
    },
    {
      id: 'endeavor',
      text: 'endeavor',
      blob: { mood: 'purposeful' }
    },
    {
      id: 'desire',
      text: 'desire',
      blob: { mood: 'searching' }
    },
    {
      id: 'reprise',
      text: 'dream',
      revealText: 'something worth dying for',
      blob: { mood: 'peaceful', behavior: 'focus' }
    },
    {
      id: 'conclusion',
      text: "let's build our dreams together",
      blob: { mood: 'peaceful', behavior: 'presence' }
    }
  ];

  // State
  let currentSectionIndex = 0;
  let currentSubsectionIndex = 0;
  let transitioning = false;
  let transitionHandlers = [];

  // DOM elements
  let sectionElements = {};
  let dreamOverlay = null;

  // Timing
  const TRANSITION_DURATION = 1600; // Accounts for two-phase text transitions

  function getCurrentSection() {
    return sections[currentSectionIndex];
  }

  function getCurrentSubsection() {
    const section = getCurrentSection();
    if (section.subsections) {
      return section.subsections[currentSubsectionIndex];
    }
    return null;
  }

  function getCurrentBlobConfig() {
    const subsection = getCurrentSubsection();
    if (subsection) {
      return subsection.blob;
    }
    return getCurrentSection().blob;
  }

  function canAdvance() {
    if (transitioning) return false;

    const section = getCurrentSection();

    // If section has subsections, check if we're at the end
    if (section.subsections) {
      if (currentSubsectionIndex < section.subsections.length - 1) {
        return true;
      }
    }

    // Check if there's another main section
    return currentSectionIndex < sections.length - 1;
  }

  // Timing for two-phase text transitions
  const TEXT_TRANSITION_GAP = 400; // Pause between hide and reveal

  // Reprise mouse movement tracking
  let repriseMouseX = 0, repriseMouseY = 0;
  let repriseMovement = 0;
  let repriseTrailAccumulator = 0; // Accumulates movement for trail fragment spawning
  const TRAIL_SPAWN_DISTANCE_MAX = 40; // Pixels per fragment at 0% progress
  const TRAIL_SPAWN_DISTANCE_MIN = 10; // Pixels per fragment at 100% progress
  let repriseStage = 0; // 0=waiting, 1=dream shown, 2=living for shown, 3=dying for shown, 4=blob spawning
  let repriseTransitioning = false; // Prevent multiple triggers during glitch
  let repriseClickReady = false; // True when enough movement accumulated, waiting for click
  let repriseReadySpawnInterval = null; // Interval for spawning fragments while waiting for click
  const READY_SPAWN_INTERVAL = 50; // ms between fragment spawns when click-ready
  const READY_SPAWN_COUNT = 2; // Number of fragments per interval when click-ready
  let repriseContainer = null; // Cached container reference
  let repriseSetText = null; // Cached setText function

  // Mobile thresholds are lower for better pacing with touch/gyro input
  const REPRISE_THRESHOLD_BASE = isMobile ? 800 : 1500;
  const REPRISE_THRESHOLDS = [
    REPRISE_THRESHOLD_BASE,  // Stage 0→1: blackness → "dream"
    REPRISE_THRESHOLD_BASE,  // Stage 1→2: "dream" → "something worth living for"
    REPRISE_THRESHOLD_BASE,  // Stage 2→3: "living for" → "dying for"
    REPRISE_THRESHOLD_BASE   // Stage 3→4: spawn blob
  ];

  // Mobile touch tracking for reprise
  let lastRepriseTouchX = 0, lastRepriseTouchY = 0;

  // Skip interactions shortly after entering reprise (the click/tap that triggered the transition)
  let repriseEnteredAt = 0;

  // Gyroscope movement accumulation
  let gyroTrailAccumulator = 0;
  let gyroUpdateInterval = null;

  function startReadySpawnInterval() {
    if (repriseReadySpawnInterval) return; // Already running
    repriseReadySpawnInterval = setInterval(() => {
      if (repriseMouseX !== 0 && repriseMouseY !== 0 && typeof Blob !== 'undefined') {
        // Spawn multiple fragments per interval for vigorous effect
        // On mobile, offset upward so fragments are visible above finger
        const baseY = isMobile ? repriseMouseY - 60 : repriseMouseY;
        for (let i = 0; i < READY_SPAWN_COUNT; i++) {
          const angle = Math.random() * Math.PI * 2;
          const offset = Math.random() * 30;
          const spawnX = repriseMouseX + Math.cos(angle) * offset;
          const spawnY = baseY + Math.sin(angle) * offset;
          Blob.spawnTrailFragment(spawnX, spawnY, false); // White when ready
        }
      }
    }, READY_SPAWN_INTERVAL);
  }

  function stopReadySpawnInterval() {
    if (repriseReadySpawnInterval) {
      clearInterval(repriseReadySpawnInterval);
      repriseReadySpawnInterval = null;
    }
  }

  function updateRepriseCursor() {
    // Cursor is handled by the blob (shows pointer on hover)
    const currentSection = getCurrentSection();
    if (currentSection.id === 'reprise') {
      document.body.style.cursor = '';
    }
  }

  function onRepriseMouseMove(e) {
    const currentSection = getCurrentSection();
    if (currentSection.id !== 'reprise') return;

    // Skip interactions within 100ms of entering reprise
    if (performance.now() - repriseEnteredAt < 100) return;

    // Only accumulate if we have previous position (skip first move)
    const hasPrevious = repriseMouseX !== 0 || repriseMouseY !== 0;
    if (hasPrevious) {
      const dx = e.clientX - repriseMouseX;
      const dy = e.clientY - repriseMouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Spawn RGB trail fragments as feedback during charging (before stage 4, not yet click-ready)
      if (repriseStage < 4 && !repriseClickReady && typeof Blob !== 'undefined') {
        repriseTrailAccumulator += distance;

        // Calculate progress toward threshold (0 to 1)
        const threshold = REPRISE_THRESHOLDS[repriseStage];
        const progress = Math.min(1, repriseMovement / threshold);

        // Spawn distance decreases as we approach threshold (more dense trail)
        const spawnDistance = TRAIL_SPAWN_DISTANCE_MAX - (TRAIL_SPAWN_DISTANCE_MAX - TRAIL_SPAWN_DISTANCE_MIN) * progress;

        while (repriseTrailAccumulator >= spawnDistance) {
          repriseTrailAccumulator -= spawnDistance;
          // Random offset up to 30px from mouse position
          const angle = Math.random() * Math.PI * 2;
          const offset = Math.random() * 30;
          const spawnX = e.clientX + Math.cos(angle) * offset;
          const spawnY = e.clientY + Math.sin(angle) * offset;
          Blob.spawnTrailFragment(spawnX, spawnY, true); // RGB during charging
        }
      }

      // Accumulate movement for text transitions (stages 0-3, not yet click-ready)
      if (!repriseTransitioning && repriseStage < 4 && !repriseClickReady) {
        repriseMovement += distance;

        // Check if threshold reached - spawn blob for them to click
        const threshold = REPRISE_THRESHOLDS[repriseStage];
        if (repriseMovement >= threshold) {
          repriseClickReady = true;

          // Burst of white fragments exploding outward to signal ready state
          if (typeof Blob !== 'undefined') {
            Blob.setClickReadyGlitch(true);
            const burstCount = 15 + Math.floor(Math.random() * 6); // 15-20 fragments
            const center = { x: e.clientX, y: e.clientY };
            for (let i = 0; i < burstCount; i++) {
              const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3; // Even spread with slight randomness
              const offset = 10 + Math.random() * 20; // Start slightly away from center
              const spawnX = e.clientX + Math.cos(angle) * offset;
              const spawnY = e.clientY + Math.sin(angle) * offset;
              Blob.spawnTrailFragment(spawnX, spawnY, false, center); // White, explode from center
            }

            // Spawn blob at cursor position - clicking it advances the stage
            Blob.setShouldDespawn(true);
            Blob.spawnAt(e.clientX, e.clientY);
          }
        }
      }

      // Stage 4: blob building - continue accumulating for interactive spawn
      if (repriseStage >= 4 && typeof Blob !== 'undefined') {
        Blob.addInteractiveMovement(distance);
      }
    }

    // Update position for next frame
    repriseMouseX = e.clientX;
    repriseMouseY = e.clientY;
  }

  // Touch movement handler for reprise (mobile only)
  function onRepriseTouchMove(e) {
    const currentSection = getCurrentSection();
    if (currentSection.id !== 'reprise') return;

    // Skip interactions within 100ms of entering reprise
    if (performance.now() - repriseEnteredAt < 100) return;

    const touch = e.touches[0];

    // Only accumulate if we have previous position (skip first move)
    if (lastRepriseTouchX !== 0 || lastRepriseTouchY !== 0) {
      const dx = touch.clientX - lastRepriseTouchX;
      const dy = touch.clientY - lastRepriseTouchY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Spawn RGB trail fragments as feedback during charging (before stage 4, not yet click-ready)
      if (repriseStage < 4 && !repriseClickReady && typeof Blob !== 'undefined') {
        repriseTrailAccumulator += distance;

        // Calculate progress toward threshold (0 to 1)
        const threshold = REPRISE_THRESHOLDS[repriseStage];
        const progress = Math.min(1, repriseMovement / threshold);

        // Spawn distance decreases as we approach threshold (more dense trail)
        const spawnDistance = TRAIL_SPAWN_DISTANCE_MAX - (TRAIL_SPAWN_DISTANCE_MAX - TRAIL_SPAWN_DISTANCE_MIN) * progress;

        while (repriseTrailAccumulator >= spawnDistance) {
          repriseTrailAccumulator -= spawnDistance;
          // Random offset from touch position, biased upward so fragments are visible above finger
          const angle = Math.random() * Math.PI * 2;
          const offset = Math.random() * 30;
          const spawnX = touch.clientX + Math.cos(angle) * offset;
          const spawnY = touch.clientY - 60 + Math.sin(angle) * offset; // 60px above touch
          Blob.spawnTrailFragment(spawnX, spawnY, true); // RGB during charging
        }
      }

      // Accumulate movement for text transitions (stages 0-3, not yet click-ready)
      if (!repriseTransitioning && repriseStage < 4 && !repriseClickReady) {
        repriseMovement += distance;

        // Check if threshold reached - spawn blob for them to tap
        const threshold = REPRISE_THRESHOLDS[repriseStage];
        if (repriseMovement >= threshold) {
          repriseClickReady = true;

          // Burst of white fragments exploding outward to signal ready state (above finger)
          if (typeof Blob !== 'undefined') {
            Blob.setClickReadyGlitch(true);
            const burstCount = 15 + Math.floor(Math.random() * 6);
            const burstY = touch.clientY - 60; // 60px above touch
            const center = { x: touch.clientX, y: burstY };
            for (let i = 0; i < burstCount; i++) {
              const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
              const offset = 10 + Math.random() * 20;
              const spawnX = touch.clientX + Math.cos(angle) * offset;
              const spawnY = burstY + Math.sin(angle) * offset;
              Blob.spawnTrailFragment(spawnX, spawnY, false, center);
            }

            // Spawn blob above touch position (visible above finger)
            Blob.setShouldDespawn(true);
            Blob.spawnAt(touch.clientX, burstY);
          }
        }
      }

      // Stage 4: blob building - continue accumulating for interactive spawn
      if (repriseStage >= 4 && typeof Blob !== 'undefined') {
        Blob.addInteractiveMovement(distance);
      }
    }

    // Update position for next frame
    lastRepriseTouchX = touch.clientX;
    lastRepriseTouchY = touch.clientY;
    // Also update mouse position for compatibility (in case other code uses it)
    repriseMouseX = touch.clientX;
    repriseMouseY = touch.clientY;
  }

  function onRepriseTouchEnd(e) {
    // Reset touch position tracking on touch end
    lastRepriseTouchX = 0;
    lastRepriseTouchY = 0;
  }

  // Tap handler for reprise (mobile only) - adds movement chunk on tap
  function onRepriseTap(e) {
    const currentSection = getCurrentSection();
    if (currentSection.id !== 'reprise' || repriseTransitioning) return;

    // Skip interactions within 100ms of entering reprise (the tap that triggered the transition)
    if (performance.now() - repriseEnteredAt < 100) return;

    // Get tap position from changedTouches
    const touch = e.changedTouches[0];
    if (!touch) return;

    const fragmentCount = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const spawnY = touch.clientY - 60; // 60px above touch

    // Stages 0-3: taps accumulate movement toward threshold (like dragging)
    if (repriseStage < 4 && !repriseClickReady && typeof Blob !== 'undefined') {
      const movementPerTap = 80; // Each tap adds this much "movement"
      repriseMovement += movementPerTap;

      // Spawn RGB trail fragments as visual feedback (above finger)
      for (let i = 0; i < fragmentCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = Math.random() * 40;
        const spawnX = touch.clientX + Math.cos(angle) * offset;
        const fragY = spawnY + Math.sin(angle) * offset;
        Blob.spawnTrailFragment(spawnX, fragY, true); // RGB during charging
      }

      // Check if threshold reached - spawn blob for them to tap
      const threshold = REPRISE_THRESHOLDS[repriseStage];
      if (repriseMovement >= threshold) {
        repriseClickReady = true;
        if (typeof Blob !== 'undefined') Blob.setClickReadyGlitch(true);

        // Burst of white fragments above finger
        const burstCount = 15 + Math.floor(Math.random() * 6);
        const center = { x: touch.clientX, y: spawnY };
        for (let i = 0; i < burstCount; i++) {
          const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
          const offset = 10 + Math.random() * 20;
          const bx = touch.clientX + Math.cos(angle) * offset;
          const by = spawnY + Math.sin(angle) * offset;
          Blob.spawnTrailFragment(bx, by, false, center);
        }

        // Spawn blob above tap position
        Blob.setShouldDespawn(true);
        Blob.spawnAt(touch.clientX, spawnY);
      }
    }

    // Stage 4: blob building - taps add to interactive spawn movement (no trail fragments - just the blob building)
    if (repriseStage >= 4 && typeof Blob !== 'undefined') {
      const BLOB_MOVEMENT_PER_FRAGMENT = 35;
      const movementValue = fragmentCount * BLOB_MOVEMENT_PER_FRAGMENT;
      Blob.addInteractiveMovement(movementValue);
    }
    // Stages 0-3 with clickReady: tapping the blob handles advancement (via Blob's onTouchTap)
  }

  // Gyroscope movement accumulation (mobile only)
  function updateGyroMovement(dt) {
    if (typeof Blob === 'undefined') return;
    if (!Blob.getGyroTilt().supported) return;
    if (getCurrentSection().id !== 'reprise') return;

    const { x, y } = Blob.getGyroTilt();
    const tiltMagnitude = Math.sqrt(x * x + y * y);

    // Convert tilt to movement: more tilt = faster accumulation
    // Max ~200px/sec at full tilt
    const gyroMovement = tiltMagnitude * 200 * dt;

    if (gyroMovement <= 0) return;

    // Stages 0-3: accumulate movement and spawn trail fragments
    if (repriseStage < 4 && !repriseClickReady && !repriseTransitioning) {
      repriseMovement += gyroMovement;

      // Spawn fragments randomly across screen (gyro has no specific position)
      gyroTrailAccumulator += gyroMovement;

      // Calculate progress toward threshold
      const threshold = REPRISE_THRESHOLDS[repriseStage];
      const progress = Math.min(1, repriseMovement / threshold);
      const spawnDistance = TRAIL_SPAWN_DISTANCE_MAX - (TRAIL_SPAWN_DISTANCE_MAX - TRAIL_SPAWN_DISTANCE_MIN) * progress;

      while (gyroTrailAccumulator >= spawnDistance) {
        gyroTrailAccumulator -= spawnDistance;
        // Spawn at random position on screen
        const spawnX = Math.random() * window.innerWidth;
        const spawnY = Math.random() * window.innerHeight;
        Blob.spawnTrailFragment(spawnX, spawnY, true);
      }

      // Check if threshold reached
      if (repriseMovement >= threshold) {
        repriseClickReady = true;
        if (typeof Blob !== 'undefined') Blob.setClickReadyGlitch(true);

        // Spawn below the reprise text container (or screen center as fallback)
        let spawnCenterX = window.innerWidth / 2;
        let spawnCenterY = window.innerHeight / 2;
        const repriseText = document.querySelector('.reprise-text');
        if (repriseText) {
          const rect = repriseText.getBoundingClientRect();
          spawnCenterY = rect.bottom + 60; // 60px below the text
        }

        // Burst of white fragments
        const burstCount = 15 + Math.floor(Math.random() * 6);
        const center = { x: spawnCenterX, y: spawnCenterY };
        for (let i = 0; i < burstCount; i++) {
          const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
          const offset = 10 + Math.random() * 20;
          const spawnX = spawnCenterX + Math.cos(angle) * offset;
          const spawnY = spawnCenterY + Math.sin(angle) * offset;
          Blob.spawnTrailFragment(spawnX, spawnY, false, center);
        }

        // Spawn blob below the text
        Blob.setShouldDespawn(true);
        Blob.spawnAt(spawnCenterX, spawnCenterY);
      }
    }

    // Stage 4: add to blob building
    if (repriseStage >= 4) {
      Blob.addInteractiveMovement(gyroMovement);
    }
  }

  function startGyroUpdateLoop() {
    if (gyroUpdateInterval) return;
    // 60fps update loop for gyro movement
    gyroUpdateInterval = setInterval(() => updateGyroMovement(1/60), 1000/60);
  }

  function stopGyroUpdateLoop() {
    if (gyroUpdateInterval) {
      clearInterval(gyroUpdateInterval);
      gyroUpdateInterval = null;
    }
  }

  function advanceRepriseStage() {
    if (!repriseContainer || !repriseSetText || repriseTransitioning) return;
    repriseTransitioning = true;

    const container = repriseContainer;
    const setRepriseText = repriseSetText;

    function hideRepriseText() {
      container.classList.remove('visible');
      setRepriseText('');
    }

    if (repriseStage === 0) {
      // Show "dream"
      if (typeof Glitch !== 'undefined') {
        Glitch.triggerHeavy(() => {
          setRepriseText('dream');
          container.classList.add('visible');
          repriseStage = 1;
          repriseTransitioning = false;
        });
      } else {
        setRepriseText('dream');
        container.classList.add('visible');
        repriseStage = 1;
        repriseTransitioning = false;
      }
    } else if (repriseStage === 1) {
      // Transition to "something worth living for"
      const livingForText = 'something worth\nliving for';
      if (typeof Glitch !== 'undefined') {
        Glitch.triggerQuick(() => {
          hideRepriseText();
        });
        setTimeout(() => {
          Glitch.triggerHeavy(() => {
            setRepriseText(livingForText, true);
            container.classList.add('visible');
            repriseStage = 2;
            repriseTransitioning = false;
          });
        }, 250 + TEXT_TRANSITION_GAP);
      } else {
        setRepriseText(livingForText, true);
        repriseStage = 2;
        repriseTransitioning = false;
      }
    } else if (repriseStage === 2) {
      // Transition to "something worth dying for" then immediately start blob building
      const dyingForText = 'something worth\ndying for';
      if (typeof Glitch !== 'undefined') {
        const currentWidth = container.offsetWidth;
        container.style.minWidth = currentWidth + 'px';
        container.style.textAlign = 'left';

        Glitch.triggerQuick(() => {
          setRepriseText('something worth\n\u00A0', true); // Keep two lines to prevent layout shift
        });
        setTimeout(() => {
          Glitch.triggerHeavy(() => {
            setRepriseText(dyingForText, true);
            container.style.minWidth = '';
            container.style.textAlign = '';
            repriseStage = 3;
            repriseTransitioning = false;

            // Immediately start blob building (no extra move+click needed)
            startBlobBuilding();
          });
        }, 250 + TEXT_TRANSITION_GAP);
      } else {
        setRepriseText(dyingForText, true);
        repriseStage = 3;
        repriseTransitioning = false;
        startBlobBuilding();
      }
    }
  }

  function startBlobBuilding() {
    if (typeof Blob !== 'undefined') {
      Blob.setFragmentMultiplier(12);
      Blob.setInteractiveSpawn(true);
      Blob.setShouldExpand(true);
      Blob.setRadiusMultiplier(2);
      Blob.respawn();
    }
    repriseStage = 4;
  }

  function resetRepriseState() {
    repriseMovement = 0;
    repriseTrailAccumulator = 0;
    repriseStage = 0;
    repriseTransitioning = false;
    repriseClickReady = false;
    if (typeof Blob !== 'undefined') Blob.setClickReadyGlitch(false);
    repriseMouseX = 0;
    repriseMouseY = 0;
    document.body.style.cursor = '';
    stopReadySpawnInterval();

    // Mobile-specific resets
    lastRepriseTouchX = 0;
    lastRepriseTouchY = 0;
    gyroTrailAccumulator = 0;

    // Record when we entered reprise to skip the triggering interaction
    repriseEnteredAt = performance.now();
  }

  function advance() {
    if (!canAdvance()) return false;

    const section = getCurrentSection();
    const prevSection = section.id;
    let prevSubsection = null;

    // Start transition
    transitioning = true;

    // Special case: desire → reprise should be instant black (no glitch delay)
    // The blob despawn fragments will be visible on the black background
    const isDesireToReprise = section.id === 'desire';

    // Text sections use two-phase glitch (hide current, pause, reveal new)
    const textSections = ['intro', 'believe', 'endeavor'];
    const isTextTransition = textSections.includes(section.id);

    if (isDesireToReprise) {
      // Instant transition to black - no glitch
      currentSubsectionIndex = 0;
      currentSectionIndex++;

      const newSection = getCurrentSection();
      const blobConfig = getCurrentBlobConfig();
      if (typeof Blob !== 'undefined' && blobConfig) {
        Blob.setMood(blobConfig.mood);
      }

      // Update DOM immediately (shows black)
      updateDOM();
    } else if (isTextTransition && typeof Glitch !== 'undefined') {
      // Two-phase transition: quick glitch out → pause → glitch in
      // Phase 1: Quick glitch to hide current text (almost instant)
      Glitch.triggerQuick(() => {
        // Hide current section mid-glitch
        const currentEl = sectionElements[section.id];
        if (currentEl) currentEl.classList.remove('active');
      });

      // Phase 2: After pause, glitch to reveal new text
      setTimeout(() => {
        // Advance state
        if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
          prevSubsection = section.subsections[currentSubsectionIndex].id;
          currentSubsectionIndex++;
        } else {
          currentSubsectionIndex = 0;
          currentSectionIndex++;
        }

        const newSection = getCurrentSection();
        const newSubsection = getCurrentSubsection();

        // Update blob mood
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
        }

        // Notify handlers
        const event = {
          from: { section: prevSection, subsection: prevSubsection },
          to: {
            section: newSection.id,
            subsection: newSubsection ? newSubsection.id : null
          },
          blobConfig: blobConfig
        };
        transitionHandlers.forEach(fn => fn(event));

        // Glitch to reveal new text
        Glitch.triggerHeavy(() => {
          // Show new section mid-glitch
          const newEl = sectionElements[newSection.id];
          if (newEl) newEl.classList.add('active');

          // Set blob behavior for new section
          if (typeof Blob !== 'undefined') {
            Blob.setShouldDespawn(newSection.id === 'desire');
            Blob.setDespawnLingerTime(newSection.id === 'desire' ? 1.2 : 0);
          }
        });
      }, 250 + TEXT_TRANSITION_GAP); // 250ms for quick glitch + gap
    } else if (typeof Glitch !== 'undefined') {
      // Normal transition with heavy glitch (for non-text sections)
      Glitch.triggerHeavy(() => {
        // This fires mid-glitch - do the actual section change here
        if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
          prevSubsection = section.subsections[currentSubsectionIndex].id;
          currentSubsectionIndex++;
        } else {
          currentSubsectionIndex = 0;
          currentSectionIndex++;
        }

        const newSection = getCurrentSection();
        const newSubsection = getCurrentSubsection();

        // Update blob mood
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
        }

        // Notify handlers
        const event = {
          from: { section: prevSection, subsection: prevSubsection },
          to: {
            section: newSection.id,
            subsection: newSubsection ? newSubsection.id : null
          },
          blobConfig: blobConfig
        };

        transitionHandlers.forEach(fn => fn(event));

        // Update DOM
        updateDOM();
      });
    } else {
      // Fallback if Glitch not available
      if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
        prevSubsection = section.subsections[currentSubsectionIndex].id;
        currentSubsectionIndex++;
      } else {
        currentSubsectionIndex = 0;
        currentSectionIndex++;
      }
      updateDOM();
    }

    // For reprise, blob spawns later after "something worth dying for" appears (handled in updateDOM)
    // For other sections, blob uses burst animation which reforms automatically - no respawn needed

    // End transition after duration
    setTimeout(() => {
      transitioning = false;
    }, TRANSITION_DURATION);

    return true;
  }

  function onTransition(fn) {
    transitionHandlers.push(fn);
  }

  function getSections() {
    return sections.map(s => ({
      id: s.id,
      subsections: s.subsections ? s.subsections.map(sub => sub.id) : null
    }));
  }

  function getProgress() {
    // Calculate overall progress through the journey
    let totalSteps = 0;
    let currentStep = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const steps = section.subsections ? section.subsections.length : 1;

      if (i < currentSectionIndex) {
        currentStep += steps;
      } else if (i === currentSectionIndex) {
        currentStep += currentSubsectionIndex;
      }

      totalSteps += steps;
    }

    return {
      current: currentStep,
      total: totalSteps,
      percent: currentStep / totalSteps
    };
  }

  function cacheDOMElements() {
    // Cache section elements (including reprise which is outside dream-overlay)
    document.querySelectorAll('[data-section]').forEach(el => {
      const id = el.dataset.section;
      sectionElements[id] = el;
    });

    dreamOverlay = document.querySelector('.dream-overlay');
  }

  function updateDOM() {
    const currentSection = getCurrentSection();
    const isBlackPhase = currentSection.id === 'reprise' || currentSection.id === 'conclusion';

    // Reset cursor when leaving reprise
    if (currentSection.id !== 'reprise') {
      document.body.style.cursor = '';
    }

    // Hide dream-overlay during black phase, show it otherwise
    if (isBlackPhase) {
      dreamOverlay.classList.add('hidden');
    } else {
      dreamOverlay.classList.remove('hidden');
    }

    // Reset reprise/conclusion visibility states when not in those sections
    if (!isBlackPhase) {
      const repriseContainer = sectionElements['reprise']?.querySelector('.reprise-text');
      const conclusionWord = sectionElements['conclusion']?.querySelector('.journey-word');
      if (repriseContainer) {
        repriseContainer.classList.remove('visible');
        repriseContainer.removeAttribute('data-text-size');
        // Clear all text elements
        repriseContainer.querySelectorAll('.dream-parallax, .dream-slice').forEach(el => {
          el.textContent = '';
          if (el.classList.contains('dream-slice')) {
            el.setAttribute('data-text', '');
          }
        });
      }
      if (conclusionWord) conclusionWord.classList.remove('visible');
    }

    // Update section visibility
    Object.keys(sectionElements).forEach(id => {
      const el = sectionElements[id];
      if (id === currentSection.id) {
        el.classList.add('active');
      } else {
        // Keep reprise visible during conclusion transition, then hide after
        if (id === 'reprise' && currentSection.id === 'conclusion') {
          setTimeout(() => {
            el.classList.remove('active');
          }, 2000); // Hide after conclusion has faded in
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Special handling for reprise - mouse movement triggers text transitions
    if (currentSection.id === 'reprise') {
      const container = sectionElements['reprise'].querySelector('.reprise-text');

      // Helper to update all text elements in the container
      function setRepriseText(text, isLong = false) {
        if (!container) return;
        // Set size attribute for CSS
        container.setAttribute('data-text-size', isLong ? 'long' : 'short');
        // Convert \n to <br> for HTML rendering
        const htmlText = text.replace(/\n/g, '<br>');
        const plainText = text.replace(/\n/g, ' ');
        // Update glow layer
        const glow = container.querySelector('.dream-glow');
        if (glow) glow.innerHTML = htmlText;
        // Update parallax layers
        container.querySelectorAll('.dream-parallax').forEach(el => {
          el.innerHTML = htmlText;
        });
        // Update slices (both content and data-text attribute for ::before)
        container.querySelectorAll('.dream-slice').forEach(el => {
          el.innerHTML = htmlText;
          el.setAttribute('data-text', plainText);
        });
      }

      if (container) {
        // Reset reprise state and cache references for mouse handler
        resetRepriseState();
        repriseContainer = container;
        repriseSetText = setRepriseText;
      }
    }

    // Special handling for conclusion - glitch in text on white screen
    if (currentSection.id === 'conclusion') {
      const wordEl = sectionElements['conclusion'].querySelector('.journey-word');

      if (wordEl) {
        // Glitch the text into existence on the white screen
        setTimeout(() => {
          if (typeof Glitch !== 'undefined') {
            Glitch.triggerHeavy(() => {
              wordEl.classList.add('visible');
            });
          } else {
            wordEl.classList.add('visible');
          }
        }, 500); // Short delay after white screen
      }
    }

    // Set blob behavior based on section
    if (typeof Blob !== 'undefined') {
      Blob.setShouldDespawn(currentSection.id === 'desire');
      // Set linger time for desire so fragments are visible on black before evaporating
      Blob.setDespawnLingerTime(currentSection.id === 'desire' ? 1.2 : 0);
      // Reset expand mode, fragment multiplier, interactive spawn, and radius when not in reprise
      if (currentSection.id !== 'reprise') {
        Blob.setShouldExpand(false);
        Blob.setFragmentMultiplier(1);
        Blob.setInteractiveSpawn(false);
        Blob.setRadiusMultiplier(1);
      }
    }
  }

  function init() {
    cacheDOMElements();

    // Wire up blob click to advance
    if (typeof Blob !== 'undefined') {
      Blob.onBlobClick(() => {
        const currentSection = getCurrentSection();
        if (currentSection.id === 'reprise' && repriseClickReady && repriseStage < 3) {
          // In reprise, clicking blob advances the reprise stage
          repriseClickReady = false;
          Blob.setClickReadyGlitch(false);
          repriseMovement = 0;
          repriseTrailAccumulator = 0;
          advanceRepriseStage();
        } else {
          // Normal section advancement
          advance();
        }
      });

      // Reset cursor when blob expand (whitewash) starts
      Blob.onExpandStart(() => {
        document.body.style.cursor = '';
      });
    }

    // Set initial blob mood
    const blobConfig = getCurrentBlobConfig();
    if (typeof Blob !== 'undefined' && blobConfig) {
      // Wait for blob to emerge before setting mood
      setTimeout(() => {
        Blob.setMood(blobConfig.mood);
      }, 6000);
    }

    // Mouse movement handler for reprise section (desktop only - mobile uses touch handlers)
    if (!isMobile) {
      document.addEventListener('mousemove', onRepriseMouseMove);
    }

    // Click handler for reprise section
    document.addEventListener('click', onRepriseClick);

    // Mobile-only: touch events for reprise
    if (isMobile) {
      document.addEventListener('touchmove', onRepriseTouchMove, { passive: true });
      document.addEventListener('touchend', onRepriseTouchEnd);
      document.addEventListener('touchend', onRepriseTap);

      // Start gyro movement update loop (will only accumulate when in reprise section)
      startGyroUpdateLoop();
    }
  }

  function onRepriseClick(e) {
    const currentSection = getCurrentSection();
    if (currentSection.id !== 'reprise' || repriseTransitioning) return;

    // Skip interactions within 100ms of entering reprise
    if (performance.now() - repriseEnteredAt < 100) return;

    const fragmentCount = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5

    // Stages 0-3: clicks accumulate movement toward threshold (like moving mouse)
    if (repriseStage < 4 && !repriseClickReady && typeof Blob !== 'undefined') {
      const movementPerClick = 80; // Each click adds this much "movement"
      repriseMovement += movementPerClick;

      // Spawn RGB trail fragments as visual feedback
      for (let i = 0; i < fragmentCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = Math.random() * 40;
        const spawnX = e.clientX + Math.cos(angle) * offset;
        const spawnY = e.clientY + Math.sin(angle) * offset;
        Blob.spawnTrailFragment(spawnX, spawnY, true); // RGB during charging
      }

      // Check if threshold reached - spawn blob for them to click
      const threshold = REPRISE_THRESHOLDS[repriseStage];
      if (repriseMovement >= threshold) {
        repriseClickReady = true;
        Blob.setClickReadyGlitch(true);

        // Burst of white fragments exploding outward to signal ready state
        const burstCount = 15 + Math.floor(Math.random() * 6);
        const center = { x: e.clientX, y: e.clientY };
        for (let i = 0; i < burstCount; i++) {
          const burstAngle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
          const burstOffset = 10 + Math.random() * 20;
          const spawnX = e.clientX + Math.cos(burstAngle) * burstOffset;
          const spawnY = e.clientY + Math.sin(burstAngle) * burstOffset;
          Blob.spawnTrailFragment(spawnX, spawnY, false, center);
        }

        // Spawn blob at click position
        Blob.setShouldDespawn(true);
        Blob.spawnAt(e.clientX, e.clientY);
      }
    }

    // Stage 4: blob is building - clicks add to interactive spawn movement
    if (repriseStage >= 4 && typeof Blob !== 'undefined') {
      const BLOB_MOVEMENT_PER_FRAGMENT = 35;
      const movementValue = fragmentCount * BLOB_MOVEMENT_PER_FRAGMENT;
      Blob.addInteractiveMovement(movementValue);
    }
    // When click-ready (stages 0-3), clicking the blob handles advancement (via onBlobClick handler)
  }

  function jumpTo(sectionId) {
    // Find the section index
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) {
      console.log('Unknown section. Available:', sections.map(s => s.id).join(', '));
      return false;
    }

    // Use heavy glitch for transition
    if (typeof Glitch !== 'undefined') {
      Glitch.triggerHeavy(() => {
        // Jump mid-glitch
        currentSectionIndex = index;
        currentSubsectionIndex = 0;

        // Update blob
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
          Blob.setDespawnLingerTime(0);

          // Set blob state based on target section
          if (sectionId === 'reprise') {
            // Hide any existing blob - spawn and settings are handled by updateDOM's reprise sequence
            Blob.hide();
            // Reset to defaults, updateDOM setTimeout will set reprise-specific values before respawn
            Blob.setShouldDespawn(false);
            Blob.setFragmentMultiplier(1);
            Blob.setInteractiveSpawn(false);
            Blob.setShouldExpand(false);
            Blob.setRadiusMultiplier(1);
          } else if (sectionId === 'conclusion') {
            // Conclusion starts with white screen, no blob
            Blob.hide();
            Blob.setShouldDespawn(false);
            Blob.setShouldExpand(false);
            Blob.setFragmentMultiplier(1);
            Blob.setInteractiveSpawn(false);
            Blob.setRadiusMultiplier(1);
          } else {
            // Reset blob behavior flags for other sections
            Blob.setShouldDespawn(sectionId === 'desire');
            Blob.setShouldExpand(false);
            Blob.setFragmentMultiplier(1);
            Blob.setInteractiveSpawn(false);
            Blob.setRadiusMultiplier(1);
          }
        }

        // Update DOM
        updateDOM();
      });
    } else {
      // Fallback without glitch
      currentSectionIndex = index;
      currentSubsectionIndex = 0;
      if (typeof Blob !== 'undefined') {
        Blob.setDespawnLingerTime(0);
        if (sectionId === 'reprise') {
          // Hide any existing blob - spawn and settings are handled by updateDOM's reprise sequence
          Blob.hide();
          Blob.setShouldDespawn(false);
          Blob.setFragmentMultiplier(1);
          Blob.setInteractiveSpawn(false);
          Blob.setShouldExpand(false);
          Blob.setRadiusMultiplier(1);
        } else if (sectionId === 'conclusion') {
          Blob.hide();
          Blob.setShouldDespawn(false);
          Blob.setShouldExpand(false);
          Blob.setFragmentMultiplier(1);
          Blob.setInteractiveSpawn(false);
          Blob.setRadiusMultiplier(1);
        } else {
          Blob.setShouldDespawn(sectionId === 'desire');
          Blob.setShouldExpand(false);
          Blob.setFragmentMultiplier(1);
          Blob.setInteractiveSpawn(false);
          Blob.setRadiusMultiplier(1);
        }
      }
      updateDOM();
    }

    console.log('Jumped to:', sectionId);
    return true;
  }

  return {
    init,
    advance,
    canAdvance,
    onTransition,
    getCurrentSection,
    getCurrentSubsection,
    getCurrentBlobConfig,
    getSections,
    getProgress,
    jumpTo
  };
})();
