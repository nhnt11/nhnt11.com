// Rotating Julia set with smooth coloring

EFFECTS.fractal = {
  params: () => ({
    rotSpeed: rand(0.08, 0.15),
    zoomBase: rand(1.25, 1.75),
    zoomAmt: rand(0.15, 0.3),
    zoomSpeed: rand(0.04, 0.08),
    colorSpeed: rand(0.02, 0.04),
    maxIter: 200
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_rotSpeed;
    uniform float u_zoomBase;
    uniform float u_zoomAmt;
    uniform float u_zoomSpeed;
    uniform float u_colorSpeed;
    uniform float u_maxIter;

    void main() {
      float zoom = u_zoomBase + u_zoomAmt * sin(u_time * u_zoomSpeed);

      vec2 uv = (v_uv - 0.5) * zoom;
      uv.x *= u_resolution.x / u_resolution.y;

      float angle = u_time * u_rotSpeed;
      float ca = cos(angle), sa = sin(angle);
      uv = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);

      vec2 c = vec2(
        -0.75 + 0.02 * sin(u_time * 0.03),
         0.11 + 0.02 * cos(u_time * 0.04)
      );

      vec2 z = uv;

      float iter = 0.0;
      for (int i = 0; i < 200; i++) {
        if (float(i) >= u_maxIter || dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iter += 1.0;
      }

      float t = iter / u_maxIter;
      if (iter < u_maxIter) {
        float log_zn = log(dot(z, z)) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        t = (iter + 1.0 - nu) / u_maxIter;
      }

      float hue = t * 2.0 + u_time * u_colorSpeed + 0.55;
      float sat = 0.85 + 0.15 * t;
      float val = 0.5 + 0.5 * t;

      if (iter >= u_maxIter) {
        hue = u_time * u_colorSpeed + 0.7;
        sat = 0.9;
        val = 0.15;
      }

      vec3 col = hsv2rgb(vec3(hue, sat, val));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
