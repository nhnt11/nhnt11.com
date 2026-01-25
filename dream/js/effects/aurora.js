// Northern lights with layered curtains

EFFECTS.aurora = {
  params: () => ({
    palette: randomPalette(),
    layers: Math.floor(rand(3, 6)),
    speed: rand(0.2, 0.5),
    waveFreq: rand(2, 5),
    verticalStretch: rand(1.5, 3.0),
    colorSpeed: rand(0.02, 0.05)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_layers;
    uniform float u_speed;
    uniform float u_waveFreq;
    uniform float u_verticalStretch;
    uniform float u_colorSpeed;

    void main() {
      vec2 uv = glitchUV(v_uv);
      uv.x *= u_resolution.x / u_resolution.y;

      vec3 col = vec3(0.0);

      for (int i = 0; i < 6; i++) {
        if (float(i) >= u_layers) break;
        float fi = float(i);

        float phase = fi * 0.5 + u_time * u_speed * (1.0 + fi * 0.2);

        float wave = 0.0;
        wave += sin(uv.x * u_waveFreq + phase) * 0.15;
        wave += sin(uv.x * u_waveFreq * 2.3 + phase * 1.3) * 0.08;
        wave += sin(uv.x * u_waveFreq * 0.7 + phase * 0.7) * 0.12;

        float curtainY = 0.3 + fi * 0.12 + wave;

        float dist = abs(uv.y - curtainY);
        float brightness = exp(-dist * u_verticalStretch * 4.0);

        brightness *= 0.7 + 0.3 * sin(uv.x * 20.0 + u_time * 2.0 + fi);

        float t = 0.4 + fi * 0.08 + uv.x * 0.1 + u_time * u_colorSpeed;
        vec3 layerCol = palette(t, brightness);

        col += layerCol * (1.0 - fi / u_layers * 0.5);
      }

      float stars = step(0.998, noise(uv * 500.0)) * 0.3;
      col += vec3(stars);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
