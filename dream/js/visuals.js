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

  // Pick effect
  const effectNames = Object.keys(EFFECTS);
  const debugModeStored = localStorage.getItem('dream-debug') === 'true';
  const lastEffect = localStorage.getItem('dream-effect');

  let currentEffect;
  if (debugModeStored && lastEffect && EFFECTS[lastEffect]) {
    currentEffect = lastEffect;
  } else {
    currentEffect = effectNames[Math.floor(Math.random() * effectNames.length)];
  }
  localStorage.setItem('dream-effect', currentEffect);

  let currentParams = EFFECTS[currentEffect].params();
  let program = programs[currentEffect];

  const startTime = performance.now();

  // Debug mode
  const debugEl = document.getElementById('debug');
  const debugContent = document.getElementById('debug-content');
  let debugMode = localStorage.getItem('dream-debug') === 'true';
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let fps = 0;
  let selectedParamIndex = 0;

  debugEl.style.display = debugMode ? 'block' : 'none';

  function switchEffect(name) {
    if (EFFECTS[name] && programs[name]) {
      currentEffect = name;
      currentParams = EFFECTS[name].params();
      program = programs[name];
      selectedParamIndex = 0;
      localStorage.setItem('dream-effect', name);
    }
  }

  function adjustParam(delta) {
    const keys = Object.keys(currentParams);
    if (keys.length === 0) return;
    const key = keys[selectedParamIndex];
    const value = currentParams[key];
    if (typeof value === 'number') {
      let step;
      if (Math.abs(value) < 0.001) step = 0.0002;
      else if (Math.abs(value) < 0.01) step = 0.001;
      else if (Math.abs(value) < 0.1) step = 0.005;
      else if (Math.abs(value) < 1) step = 0.02;
      else step = Math.abs(value) * 0.05;
      currentParams[key] = value + step * delta;
    }
  }

  function formatParams(params) {
    const keys = Object.keys(params);
    return keys.map((k, i) => {
      const v = params[k];
      const prefix = debugMode && i === selectedParamIndex ? '> ' : '  ';
      if (typeof v !== 'number') return `${prefix}${k}: ${v}`;
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
      debugContent.textContent = [
        `effect: ${currentEffect} [1-0, n/p to switch]`,
        `fps: ${fps}`,
        `time: ${t.toFixed(2)}s`,
        `resolution: ${canvas.width}x${canvas.height}`,
        ``,
        `params: [↑↓ select, ←→ adjust, R reset]`,
        formatParams(currentParams)
      ].join('\n');
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

    if (!debugMode) return;

    const keys = Object.keys(currentParams);

    if (e.key >= '0' && e.key <= '9') {
      const num = e.key === '0' ? 10 : parseInt(e.key);
      const effectName = effectNames[num - 1];
      if (effectName) switchEffect(effectName);
      return;
    }

    if (e.key === 'n' || e.key === 'N') {
      const idx = (effectNames.indexOf(currentEffect) + 1) % effectNames.length;
      switchEffect(effectNames[idx]);
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      const idx = (effectNames.indexOf(currentEffect) - 1 + effectNames.length) % effectNames.length;
      switchEffect(effectNames[idx]);
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        selectedParamIndex = Math.max(0, selectedParamIndex - 1);
        break;
      case 'ArrowDown':
        selectedParamIndex = Math.min(keys.length - 1, selectedParamIndex + 1);
        break;
      case 'ArrowRight':
        adjustParam(1);
        break;
      case 'ArrowLeft':
        adjustParam(-1);
        break;
      case 'r':
      case 'R':
        currentParams = EFFECTS[currentEffect].params();
        break;
    }
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render() {
    const t = (performance.now() - startTime) / 1000;

    gl.useProgram(program);

    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);

    for (const [key, value] of Object.entries(currentParams)) {
      const loc = gl.getUniformLocation(program, `u_${key}`);
      if (loc) gl.uniform1f(loc, value);
    }

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    updateDebug(t);
    requestAnimationFrame(render);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    render();
  }

  return { init };
})();
