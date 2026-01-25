// Organic blobs with implicit surface rendering

EFFECTS.metaballs = {
  params: () => ({
    numBalls: Math.floor(rand(5, 10)),
    threshold: rand(0.8, 1.2),
    speed: rand(0.4, 1.0),
    colorSpeed: rand(0.02, 0.06),
    saturation: rand(0.7, 1.0)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_numBalls;
    uniform float u_threshold;
    uniform float u_speed;
    uniform float u_colorSpeed;
    uniform float u_saturation;

    void main() {
      vec2 uv = v_uv - 0.5;
      uv.x *= u_resolution.x / u_resolution.y;

      float sum = 0.0;
      float colorMix = 0.0;

      for (int i = 0; i < 10; i++) {
        if (float(i) >= u_numBalls) break;
        float fi = float(i);

        vec2 center = vec2(
          0.3 * sin(u_time * u_speed * (0.7 + fi * 0.1) + fi * 2.1),
          0.3 * cos(u_time * u_speed * (0.5 + fi * 0.15) + fi * 1.7)
        );

        float radius = 0.08 + 0.04 * sin(fi * 1.5);
        float dist = length(uv - center);
        float influence = radius / (dist + 0.01);
        sum += influence;
        colorMix += influence * fi / u_numBalls;
      }

      colorMix /= sum;

      float v = smoothstep(u_threshold - 0.3, u_threshold + 0.3, sum);
      float edge = smoothstep(u_threshold - 0.1, u_threshold, sum) -
                   smoothstep(u_threshold, u_threshold + 0.1, sum);

      float hue = colorMix + u_time * u_colorSpeed;
      vec3 col = hsv2rgb(vec3(hue, u_saturation, 0.5 + 0.3 * v));
      col += edge * 0.5;

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
