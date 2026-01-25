// Interference patterns from multiple wave sources

EFFECTS.waves = {
  params: () => ({
    palette: randomPalette(),
    frequency: rand(20, 50),
    speed: rand(2, 5),
    numSources: Math.floor(rand(3, 6)),
    colorSpeed: rand(0.03, 0.08)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_frequency;
    uniform float u_speed;
    uniform float u_numSources;
    uniform float u_colorSpeed;

    void main() {
      vec2 uv = glitchUV(v_uv);
      uv.x *= u_resolution.x / u_resolution.y;

      float v = 0.0;
      for (int i = 0; i < 6; i++) {
        if (float(i) >= u_numSources) break;
        float fi = float(i);
        vec2 source = vec2(
          0.5 + 0.3 * cos(fi * 2.1 + 0.5),
          0.5 + 0.3 * sin(fi * 1.7 + 0.3)
        );
        source.x *= u_resolution.x / u_resolution.y;
        v += sin(length(uv - source) * u_frequency - u_time * u_speed + fi * 1.047);
      }
      v /= u_numSources;

      vec3 col = palette(v * 0.5 + 0.5 + u_time * u_colorSpeed, 0.5 + v * 0.2);
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
