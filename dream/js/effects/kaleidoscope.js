// Mirrored radial segments with fractal noise

EFFECTS.kaleidoscope = {
  params: () => ({
    segments: Math.floor(rand(4, 12)),
    zoom: rand(2, 5),
    speed: rand(0.1, 0.5),
    colorSpeed: rand(0.05, 0.2),
    saturation: rand(0.6, 1.0)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_segments;
    uniform float u_zoom;
    uniform float u_speed;
    uniform float u_colorSpeed;
    uniform float u_saturation;

    void main() {
      vec2 uv = v_uv - 0.5;
      uv.x *= u_resolution.x / u_resolution.y;

      float angle = atan(uv.y, uv.x);
      float dist = length(uv);

      float segAngle = TAU / u_segments;
      angle = abs(mod(angle + PI, segAngle) - segAngle * 0.5);

      vec2 p = vec2(cos(angle), sin(angle)) * dist * u_zoom + u_time * u_speed;
      float v = fbm(p, 4);

      vec3 col = hsv2rgb(vec3(v + u_time * u_colorSpeed, u_saturation, 0.6));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
