// Shared GLSL utilities: color conversion, noise, and fractal brownian motion

const GLSL_COMMON = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;

  #define PI  3.14159265359
  #define TAU 6.28318530718

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
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
