// WebGL renderer - compiles shaders and runs the render loop

const Visuals = (function() {
  const canvas = document.getElementById('psychedelic-canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createProgram(fragSource) {
    const vertShader = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragShader = compileShader(fragSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  // Create framebuffer with texture for multi-pass rendering
  function createFramebuffer(width, height) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { framebuffer: fb, texture };
  }

  // Composite shader for blending two effect textures
  const COMPOSITE_SHADER = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_effectA;
    uniform sampler2D u_effectB;
    uniform float u_blend;

    void main() {
      vec4 colorA = texture2D(u_effectA, v_uv);
      vec4 colorB = texture2D(u_effectB, v_uv);
      gl_FragColor = mix(colorA, colorB, u_blend);
    }
  `;

  // Feedback shader - blends new frame with transformed previous frame
  const FEEDBACK_SHADER = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_newFrame;
    uniform sampler2D u_prevFrame;
    uniform float u_feedbackAmount;
    uniform float u_feedbackZoom;
    uniform float u_feedbackRotation;
    uniform float u_feedbackDecay;

    void main() {
      // Transform UV for previous frame sampling (zoom toward center with rotation)
      vec2 center = vec2(0.5);
      vec2 uv = v_uv - center;

      // Apply zoom (scale toward center)
      uv *= u_feedbackZoom;

      // Apply rotation
      float s = sin(u_feedbackRotation);
      float c = cos(u_feedbackRotation);
      uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

      uv += center;

      // Sample frames
      vec4 newColor = texture2D(u_newFrame, v_uv);
      vec4 prevColor = texture2D(u_prevFrame, uv);

      // Apply decay to previous frame
      prevColor.rgb *= u_feedbackDecay;

      // Blend new frame with decayed, transformed previous frame
      gl_FragColor = mix(newColor, prevColor, u_feedbackAmount);
    }
  `;

  // Create full-screen quad
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  // Compile all programs
  const programs = {};
  for (const name in EFFECTS) {
    programs[name] = createProgram(EFFECTS[name].shader);
  }

  // Compile composite and feedback programs
  const compositeProgram = createProgram(COMPOSITE_SHADER);
  const feedbackProgram = createProgram(FEEDBACK_SHADER);

  // Create framebuffers for effect layering
  let fbA = null, fbB = null;
  let fbPrev = null, fbCurr = null; // For feedback loops

  // Utility functions
  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // Pick effect
  const effectNames = Object.keys(EFFECTS);
  // Effects excluded from random rotation (still accessible via console/debug)
  const excludedFromRotation = ['voronoi', 'fractal'];
  const rotationEffects = effectNames.filter(e => !excludedFromRotation.includes(e));
  const debugModeStored = localStorage.getItem('dream-debug') === 'true';
  const lastEffect = localStorage.getItem('dream-effect');

  function pickDifferentEffect(exclude) {
    const available = rotationEffects.filter(e => e !== exclude);
    return available[Math.floor(Math.random() * available.length)];
  }

  let primaryEffect, secondaryEffect;
  if (debugModeStored && lastEffect && EFFECTS[lastEffect]) {
    primaryEffect = lastEffect;
  } else {
    primaryEffect = rotationEffects[Math.floor(Math.random() * rotationEffects.length)];
  }
  // Pick a different secondary effect for portal
  secondaryEffect = pickDifferentEffect(primaryEffect);
  localStorage.setItem('dream-effect', primaryEffect);

  let primaryParams = EFFECTS[primaryEffect].params();
  let secondaryParams = EFFECTS[secondaryEffect].params();
  let program = programs[primaryEffect];

  // Crossfade state (triggered by glitch, not timed)
  let crossfadeProgress = 0;
  let crossfadeActive = false;
  let crossfadeStartTime = 0;
  const CROSSFADE_DURATION = 4000; // 4 seconds
  const CROSSFADE_PROBABILITY = 0.5; // 50% chance per glitch

  const startTime = performance.now();
  let glitchIntensity = 0;

  // Mouse tracking for parallax
  let mouseX = 0, mouseY = 0;
  let smoothMouseX = 0, smoothMouseY = 0;
  const MOUSE_LERP = 0.05;

  // Chaos mode state
  let chaosMode = false;
  let chaosEffects = [];
  let chaosLastSwitch = 0;
  const CHAOS_SWITCH_INTERVAL = 2500; // 2.5 seconds between effect switches
  let chaosParams = {};
  let chaosParamFrame = 0;
  let chaosParamPersist = 6; // Re-roll after this many frames (randomized 6-12)

  // Feedback loop state
  let feedbackEnabled = false;
  let feedbackAmount = 0.85;
  let feedbackZoom = 0.998;
  let feedbackRotation = 0.002;
  let feedbackDecay = 0.98;

  // Debug mode
  const debugEl = document.getElementById('debug');
  const debugContent = document.getElementById('debug-content');
  let debugMode = localStorage.getItem('dream-debug') === 'true';
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let fps = 0;
  let selectedParamIndex = 0;
  let jHeld = false; // For J + number journey jump

  debugEl.style.display = debugMode ? 'block' : 'none';

  function switchEffect(name) {
    if (EFFECTS[name] && programs[name]) {
      primaryEffect = name;
      primaryParams = EFFECTS[name].params();
      program = programs[name];
      selectedParamIndex = 0;
      localStorage.setItem('dream-effect', name);
      // Pick new secondary effect
      secondaryEffect = pickDifferentEffect(name);
      secondaryParams = EFFECTS[secondaryEffect].params();
    }
  }

  function adjustParam(delta) {
    const keys = Object.keys(primaryParams);
    if (keys.length === 0) return;
    const key = keys[selectedParamIndex];
    const value = primaryParams[key];
    if (typeof value === 'number') {
      if (key === 'palette') {
        primaryParams[key] = (value + delta + PALETTE_COUNT) % PALETTE_COUNT;
        return;
      }
      let step;
      if (Math.abs(value) < 0.001) step = 0.0002;
      else if (Math.abs(value) < 0.01) step = 0.001;
      else if (Math.abs(value) < 0.1) step = 0.005;
      else if (Math.abs(value) < 1) step = 0.02;
      else step = Math.abs(value) * 0.05;
      primaryParams[key] = value + step * delta;
    }
  }

  const PALETTE_NAMES = [
    'Lava', 'Purple', 'Ocean', 'Sunset',
    'Toxic', 'Ice', 'Neon', 'Ember'
  ];

  function formatParams(params) {
    const keys = Object.keys(params);
    return keys.map((k, i) => {
      const v = params[k];
      const prefix = debugMode && i === selectedParamIndex ? '> ' : '  ';
      if (typeof v !== 'number') return `${prefix}${k}: ${v}`;
      if (k === 'palette') return `${prefix}${k}: ${PALETTE_NAMES[Math.floor(v)] || v}`;
      if (Math.abs(v) < 0.01 && v !== 0) return `${prefix}${k}: ${v.toExponential(2)}`;
      return `${prefix}${k}: ${v.toFixed(3)}`;
    }).join('\n');
  }

  function updateDebug(t) {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      frameCount = 0;
      lastFpsTime = now;
    }

    if (debugMode) {
      const crossfadeStatus = crossfadeActive ? `fade ${(crossfadeProgress * 100).toFixed(0)}%` : 'stable';
      const fb = feedbackEnabled ? 'ON ' : 'off';

      const lines = [
        `  EFFECT   ${primaryEffect}`,
        `  portal   ${secondaryEffect} (${crossfadeStatus})`,
        ``,
        `  FEEDBACK [F] ${fb}`,
        `    amount ${feedbackAmount.toFixed(2)}  [[]]    zoom ${feedbackZoom.toFixed(3)}   [,.]`,
        `    rotate ${feedbackRotation.toFixed(3)} [;']    decay ${feedbackDecay.toFixed(2)}  [-=]`,
        ``,
        `  fps ${fps}  time ${t.toFixed(1)}s  ${canvas.width}x${canvas.height}`,
        ``,
        `  PARAMS   [↑↓] select  [←→] adjust  [R] reset`,
        ``
      ];

      const paramLines = formatParams(primaryParams).split('\n');
      lines.push(...paramLines.map(l => `  ${l}`));
      lines.push(``);

      // Journey section
      const sections = ['intro', 'believe', 'endeavor', 'desire', 'reprise', 'conclusion'];
      const currentSection = typeof Journey !== 'undefined' ? Journey.getCurrentSection().id : 'unknown';
      const sectionDisplay = sections.map((s, i) =>
        s === currentSection ? `[${i + 1}]` : ` ${i + 1} `
      ).join(' ');
      lines.push(`  JOURNEY  ${currentSection}`);
      lines.push(`  ${sectionDisplay}`);
      lines.push(`  [J + 1-6] jump to section`);
      lines.push(``);
      lines.push(`  [1-0] effect  [N/P] cycle  [\`] close`);

      // Calculate max width
      const maxLen = Math.max(...lines.map(l => l.length));
      const width = maxLen + 2;

      // Build bordered output
      const top = `┌${'─'.repeat(width)}┐`;
      const bot = `└${'─'.repeat(width)}┘`;
      const bordered = lines.map(l => `│ ${l.padEnd(maxLen)} │`);

      debugContent.textContent = [top, ...bordered, bot].join('\n');
    }
  }

  // Keyboard handling
  document.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
      debugMode = !debugMode;
      debugEl.style.display = debugMode ? 'block' : 'none';
      localStorage.setItem('dream-debug', debugMode);
      return;
    }

    // Toggle feedback with F key
    if (e.key === 'f' || e.key === 'F') {
      feedbackEnabled = !feedbackEnabled;
      return;
    }

    if (!debugMode) return;

    const keys = Object.keys(primaryParams);

    // Track J key for journey jumping
    if (e.key === 'j' || e.key === 'J') {
      jHeld = true;
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      const num = e.key === '0' ? 10 : parseInt(e.key);

      // J + number = jump to journey section
      if (jHeld && typeof Journey !== 'undefined') {
        const sections = ['intro', 'believe', 'endeavor', 'desire', 'reprise', 'conclusion'];
        if (num >= 1 && num <= sections.length) {
          Journey.jumpTo(sections[num - 1]);
        }
        return;
      }

      // Otherwise switch effect
      const effectName = effectNames[num - 1];
      if (effectName) switchEffect(effectName);
      return;
    }

    if (e.key === 'n' || e.key === 'N') {
      const idx = (effectNames.indexOf(primaryEffect) + 1) % effectNames.length;
      switchEffect(effectNames[idx]);
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      const idx = (effectNames.indexOf(primaryEffect) - 1 + effectNames.length) % effectNames.length;
      switchEffect(effectNames[idx]);
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        if (!debugMode) break;
        selectedParamIndex = Math.max(0, selectedParamIndex - 1);
        break;
      case 'ArrowDown':
        if (!debugMode) break;
        selectedParamIndex = Math.min(keys.length - 1, selectedParamIndex + 1);
        break;
      case 'ArrowRight':
        if (!debugMode) break;
        adjustParam(1);
        break;
      case 'ArrowLeft':
        if (!debugMode) break;
        adjustParam(-1);
        break;
      case 'r':
      case 'R':
        primaryParams = EFFECTS[primaryEffect].params();
        break;
      // Feedback controls
      case '[':
        feedbackAmount = Math.max(0, feedbackAmount - 0.05);
        break;
      case ']':
        feedbackAmount = Math.min(1, feedbackAmount + 0.05);
        break;
      case ',':
        feedbackZoom = Math.max(0.9, feedbackZoom - 0.002);
        break;
      case '.':
        feedbackZoom = Math.min(1.1, feedbackZoom + 0.002);
        break;
      case ';':
        feedbackRotation -= 0.002;
        break;
      case "'":
        feedbackRotation += 0.002;
        break;
      case '-':
        feedbackDecay = Math.max(0.8, feedbackDecay - 0.01);
        break;
      case '=':
        feedbackDecay = Math.min(1, feedbackDecay + 0.01);
        break;
    }
  });

  // Reset jHeld on key up
  document.addEventListener('keyup', (e) => {
    if (e.key === 'j' || e.key === 'J') {
      jHeld = false;
    }
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Recreate framebuffers at new size
    fbA = createFramebuffer(canvas.width, canvas.height);
    fbB = createFramebuffer(canvas.width, canvas.height);
    fbPrev = createFramebuffer(canvas.width, canvas.height);
    fbCurr = createFramebuffer(canvas.width, canvas.height);
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function renderEffect(effectName, params, t, framebuffer) {
    const prog = programs[effectName];
    if (!prog) return;

    if (framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.useProgram(prog);

    gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), t);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_glitch'), glitchIntensity);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_mouse'), smoothMouseX, smoothMouseY);

    for (const [key, value] of Object.entries(params)) {
      const loc = gl.getUniformLocation(prog, `u_${key}`);
      if (loc) gl.uniform1f(loc, value);
    }

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function compositeEffects(textureA, textureB, blend, targetFramebuffer) {
    if (targetFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer.framebuffer);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.useProgram(compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureA);
    gl.uniform1i(gl.getUniformLocation(compositeProgram, 'u_effectA'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.uniform1i(gl.getUniformLocation(compositeProgram, 'u_effectB'), 1);

    gl.uniform1f(gl.getUniformLocation(compositeProgram, 'u_blend'), blend);

    const posLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function applyFeedback(newFrameTexture, prevFrameTexture, targetFramebuffer) {
    if (targetFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer.framebuffer);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.useProgram(feedbackProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, newFrameTexture);
    gl.uniform1i(gl.getUniformLocation(feedbackProgram, 'u_newFrame'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, prevFrameTexture);
    gl.uniform1i(gl.getUniformLocation(feedbackProgram, 'u_prevFrame'), 1);

    gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'u_feedbackAmount'), feedbackAmount);
    gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'u_feedbackZoom'), feedbackZoom);
    gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'u_feedbackRotation'), feedbackRotation);
    gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'u_feedbackDecay'), feedbackDecay);

    const posLoc = gl.getAttribLocation(feedbackProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function updateCrossfade(now) {
    if (!crossfadeActive) return;

    // Update crossfade progress
    crossfadeProgress = Math.min(1, (now - crossfadeStartTime) / CROSSFADE_DURATION);

    if (crossfadeProgress >= 1) {
      // Crossfade complete - swap effects
      primaryEffect = secondaryEffect;
      primaryParams = secondaryParams;
      program = programs[primaryEffect];
      localStorage.setItem('dream-effect', primaryEffect);

      // Pick new secondary
      secondaryEffect = pickDifferentEffect(primaryEffect);
      secondaryParams = EFFECTS[secondaryEffect].params();

      crossfadeActive = false;
      crossfadeProgress = 0;
    }
  }

  function startCrossfade() {
    if (crossfadeActive || chaosMode) return;
    crossfadeActive = true;
    crossfadeStartTime = performance.now();
    crossfadeProgress = 0;
  }

  function render() {
    const now = performance.now();
    const t = (now - startTime) / 1000;

    // Smooth mouse position
    smoothMouseX += (mouseX - smoothMouseX) * MOUSE_LERP;
    smoothMouseY += (mouseY - smoothMouseY) * MOUSE_LERP;

    // Decay glitch intensity
    glitchIntensity *= 0.85;
    if (glitchIntensity < 0.01) glitchIntensity = 0;

    // Update crossfade timing
    updateCrossfade(now);

    // Clear
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (chaosMode) {
      renderChaos(t);
    } else if (feedbackEnabled) {
      // Render current effect to fbA
      renderEffect(primaryEffect, primaryParams, t, fbA);

      // Apply crossfade if active
      if (crossfadeActive) {
        renderEffect(secondaryEffect, secondaryParams, t, fbB);
        const easedBlend = crossfadeProgress < 0.5
          ? 2 * crossfadeProgress * crossfadeProgress
          : 1 - Math.pow(-2 * crossfadeProgress + 2, 2) / 2;
        // Composite effects into fbCurr
        compositeEffects(fbA.texture, fbB.texture, easedBlend, fbCurr);
      } else {
        // Copy fbA to fbCurr
        compositeEffects(fbA.texture, fbA.texture, 0, fbCurr);
      }

      // Apply feedback: blend new frame with transformed previous frame, output to screen
      applyFeedback(fbCurr.texture, fbPrev.texture, null);

      // Copy current result to fbPrev for next frame (ping-pong)
      // We need to render the final result to fbPrev as well
      applyFeedback(fbCurr.texture, fbPrev.texture, fbPrev);

      // Swap ping-pong buffers
      const temp = fbPrev;
      fbPrev = fbCurr;
      fbCurr = temp;
    } else if (crossfadeActive) {
      // Multi-pass rendering for crossfade only
      renderEffect(primaryEffect, primaryParams, t, fbA);
      renderEffect(secondaryEffect, secondaryParams, t, fbB);
      const easedBlend = crossfadeProgress < 0.5
        ? 2 * crossfadeProgress * crossfadeProgress
        : 1 - Math.pow(-2 * crossfadeProgress + 2, 2) / 2;
      compositeEffects(fbA.texture, fbB.texture, easedBlend, null);
    } else {
      // Simple single-pass rendering
      renderEffect(primaryEffect, primaryParams, t, null);
    }

    updateDebug(t);
    requestAnimationFrame(render);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    render();
    requestAnimationFrame(() => {
      document.body.classList.remove('page-loading');
    });
  }

  function randomizePalette() {
    if (primaryParams.palette !== undefined) {
      primaryParams.palette = Math.floor(Math.random() * PALETTE_COUNT);
    }
  }

  function triggerGlitch() {
    glitchIntensity = 1;
    // Chance to trigger effect transition
    if (Math.random() < CROSSFADE_PROBABILITY) {
      startCrossfade();
    }
  }

  function pickRandomEffects(count) {
    const shuffled = [...rotationEffects].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  function enterChaosMode() {
    chaosMode = true;
    chaosEffects = pickRandomEffects(3);
    chaosLastSwitch = performance.now();
    chaosParamFrame = chaosParamPersist; // Force param generation on first frame
    glitchIntensity = 1;
  }

  function exitChaosMode() {
    chaosMode = false;
    chaosEffects = [];
    primaryEffect = rotationEffects[Math.floor(Math.random() * rotationEffects.length)];
    primaryParams = EFFECTS[primaryEffect].params();
    program = programs[primaryEffect];
    secondaryEffect = pickDifferentEffect(primaryEffect);
    secondaryParams = EFFECTS[secondaryEffect].params();
  }

  function renderChaos(t) {
    const now = performance.now();

    if (now - chaosLastSwitch > CHAOS_SWITCH_INTERVAL) {
      chaosEffects = pickRandomEffects(3);
      chaosLastSwitch = now;
      glitchIntensity = Math.max(glitchIntensity, 0.5);
      chaosParamFrame = chaosParamPersist; // Force param re-roll on effect switch
    }

    // Only re-roll params every N frames (N randomized between 6-12)
    if (chaosParamFrame >= chaosParamPersist) {
      chaosParams = {};
      for (const name of chaosEffects) {
        const baseParams = EFFECTS[name].params();
        for (const key in baseParams) {
          if (typeof baseParams[key] === 'number' && key !== 'palette') {
            baseParams[key] *= 0.5 + Math.random();
          }
        }
        chaosParams[name] = baseParams;
      }
      chaosParamFrame = 0;
      chaosParamPersist = 6 + Math.floor(Math.random() * 7); // 6-12 frames
    }
    chaosParamFrame++;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    for (let i = 0; i < chaosEffects.length; i++) {
      const name = chaosEffects[i];
      const prog = programs[name];
      const params = chaosParams[name];

      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), t + i * 10);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_glitch'), glitchIntensity + 0.3);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_mouse'), smoothMouseX, smoothMouseY);

      for (const [key, value] of Object.entries(params)) {
        const loc = gl.getUniformLocation(prog, `u_${key}`);
        if (loc) gl.uniform1f(loc, value);
      }

      const posLoc = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.disable(gl.BLEND);
  }

  function getMouse() {
    return { x: smoothMouseX, y: smoothMouseY };
  }

  function getSecondaryEffect() {
    return { name: secondaryEffect, params: secondaryParams };
  }

  function getCurrentEffect() {
    return primaryEffect;
  }

  function setEffect(name) {
    if (EFFECTS[name] && programs[name]) {
      switchEffect(name);
      return true;
    }
    return false;
  }

  function getEffects() {
    return [...effectNames];
  }

  function getParams() {
    return { ...primaryParams };
  }

  function setParam(key, value) {
    if (key in primaryParams) {
      primaryParams[key] = value;
      return true;
    }
    return false;
  }

  function toggleFeedback() {
    feedbackEnabled = !feedbackEnabled;
    return feedbackEnabled;
  }

  function setFeedback(opts) {
    if (opts.amount !== undefined) feedbackAmount = opts.amount;
    if (opts.zoom !== undefined) feedbackZoom = opts.zoom;
    if (opts.rotation !== undefined) feedbackRotation = opts.rotation;
    if (opts.decay !== undefined) feedbackDecay = opts.decay;
    if (opts.enabled !== undefined) feedbackEnabled = opts.enabled;
  }

  function getFeedback() {
    return {
      enabled: feedbackEnabled,
      amount: feedbackAmount,
      zoom: feedbackZoom,
      rotation: feedbackRotation,
      decay: feedbackDecay
    };
  }

  return {
    init, randomizePalette, triggerGlitch, startCrossfade, enterChaosMode, exitChaosMode,
    getMouse, getSecondaryEffect, getCurrentEffect,
    setEffect, getEffects, getParams, setParam,
    toggleFeedback, setFeedback, getFeedback
  };
})();
