// Classic plasma with overlapping sine waves

EFFECTS.plasma = {
  params: () => ({
    scale: rand(6, 14),
    speed: rand(0.7, 1.5),
    complexity: rand(0.5, 1.0),
    colorSpeed: rand(0.03, 0.1),
    saturation: rand(0.7, 1.0)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_scale;
    uniform float u_speed;
    uniform float u_complexity;
    uniform float u_colorSpeed;
    uniform float u_saturation;

    void main() {
      vec2 uv = v_uv * u_scale;
      float t = u_time * u_speed;

      float v1 = sin(uv.x + t);
      float v2 = sin(uv.y + t * 1.1);
      float v3 = sin((uv.x + uv.y) * u_complexity + t);
      float v4 = sin(length(uv - u_scale * 0.5) * u_complexity - t);
      float v = (v1 + v2 + v3 + v4) * 0.25;

      vec3 col = hsv2rgb(vec3(v * 0.5 + 0.5 + u_time * u_colorSpeed, u_saturation, 0.55));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
