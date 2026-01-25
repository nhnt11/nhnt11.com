// Infinite tunnel with spiral patterns

EFFECTS.tunnel = {
  params: () => ({
    spiralFreq: Math.floor(rand(3, 7)),
    zoomSpeed: rand(1, 4),
    twist: rand(0.5, 2.0),
    colorSpeed: rand(0.05, 0.15),
    brightness: 0.65
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_spiralFreq;
    uniform float u_zoomSpeed;
    uniform float u_twist;
    uniform float u_colorSpeed;
    uniform float u_brightness;

    void main() {
      vec2 uv = v_uv - 0.5;
      uv.x *= u_resolution.x / u_resolution.y;

      float dist = length(uv) + 0.001;
      float angle = atan(uv.y, uv.x);

      float tu = (angle + PI) / TAU;
      float tv = 1.0 / dist + u_time * u_zoomSpeed;

      float pattern = sin(tu * TAU * u_spiralFreq + u_time * u_twist) * sin(tv * 2.0);
      float hue = fract(tu * u_spiralFreq + tv * 0.1 + u_time * u_colorSpeed);

      vec3 col = hsv2rgb(vec3(hue, 0.85, u_brightness + pattern * 0.2));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
