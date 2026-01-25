// Shared GLSL utilities: color conversion, noise, palettes, and fractal brownian motion

// Lava lamp inspired color palettes (RGB values 0-1)
const PALETTES = [
  // 0: Classic Lava (red, orange, yellow)
  [[0.9, 0.1, 0.1], [1.0, 0.4, 0.0], [1.0, 0.8, 0.0]],
  // 1: Purple Dream (deep purple, magenta, pink)
  [[0.3, 0.0, 0.5], [0.8, 0.0, 0.6], [1.0, 0.4, 0.7]],
  // 2: Ocean (deep blue, cyan, teal)
  [[0.0, 0.1, 0.4], [0.0, 0.5, 0.7], [0.0, 0.8, 0.7]],
  // 3: Sunset (deep orange, pink, magenta)
  [[0.9, 0.3, 0.0], [1.0, 0.4, 0.5], [0.7, 0.1, 0.5]],
  // 4: Toxic (lime green, yellow, orange)
  [[0.2, 0.9, 0.1], [0.8, 1.0, 0.0], [1.0, 0.5, 0.0]],
  // 5: Ice (white, light blue, deep blue)
  [[0.9, 0.95, 1.0], [0.4, 0.7, 1.0], [0.1, 0.2, 0.6]],
  // 6: Neon (hot pink, cyan, yellow)
  [[1.0, 0.0, 0.5], [0.0, 1.0, 0.9], [1.0, 1.0, 0.0]],
  // 7: Ember (dark red, orange, yellow-white)
  [[0.3, 0.0, 0.0], [0.9, 0.3, 0.0], [1.0, 0.9, 0.6]],
];

const PALETTE_COUNT = PALETTES.length;

// Generate GLSL code for palette colors
function generatePaletteGLSL() {
  let code = '';
  PALETTES.forEach((palette, i) => {
    palette.forEach((color, j) => {
      code += `const vec3 PAL${i}_${j} = vec3(${color[0].toFixed(3)}, ${color[1].toFixed(3)}, ${color[2].toFixed(3)});\n  `;
    });
  });
  return code;
}

// Pick a random palette (including full spectrum as last option)
const randomPalette = () => Math.floor(Math.random() * PALETTE_COUNT);

const GLSL_COMMON = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_palette;
  uniform float u_glitch;

  #define PI  3.14159265359
  #define TAU 6.28318530718
  #define PALETTE_COUNT ${PALETTE_COUNT}.0

  // Apply glitch distortion to UV coordinates
  vec2 glitchUV(vec2 uv) {
    float g = smoothstep(0.0, 0.05, u_glitch);
    if (g <= 0.0) return uv;

    float glitchStrength = g * 0.08;
    float t = u_time * 50.0;

    // Horizontal slice displacement
    float slice = floor(uv.y * 12.0);
    float offset = sin(slice * 4.0 + t) * glitchStrength;
    offset *= step(0.5, fract(sin(slice * 91.2) * 43758.5));

    // Vertical jitter
    float jitter = sin(t * 3.0) * glitchStrength * 0.3;

    return uv + vec2(offset, jitter);
  }

  ${generatePaletteGLSL()}

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  // Sample from a 3-color palette with smooth looping (c0 -> c1 -> c2 -> c0)
  vec3 samplePalette3(vec3 c0, vec3 c1, vec3 c2, float t) {
    t = fract(t) * 3.0;
    if (t < 1.0) {
      return mix(c0, c1, t);
    } else if (t < 2.0) {
      return mix(c1, c2, t - 1.0);
    } else {
      return mix(c2, c0, t - 2.0);
    }
  }

  // Get color from palette index and t value (0-1)
  vec3 palette(float t, float brightness) {
    int idx = int(u_palette);

    vec3 col;
    if (idx == 0) col = samplePalette3(PAL0_0, PAL0_1, PAL0_2, t);
    else if (idx == 1) col = samplePalette3(PAL1_0, PAL1_1, PAL1_2, t);
    else if (idx == 2) col = samplePalette3(PAL2_0, PAL2_1, PAL2_2, t);
    else if (idx == 3) col = samplePalette3(PAL3_0, PAL3_1, PAL3_2, t);
    else if (idx == 4) col = samplePalette3(PAL4_0, PAL4_1, PAL4_2, t);
    else if (idx == 5) col = samplePalette3(PAL5_0, PAL5_1, PAL5_2, t);
    else if (idx == 6) col = samplePalette3(PAL6_0, PAL6_1, PAL6_2, t);
    else col = samplePalette3(PAL7_0, PAL7_1, PAL7_2, t);

    return col * brightness;
  }

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
      mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p, int octaves) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      v += a * smoothNoise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }
`;
