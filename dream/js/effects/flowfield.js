// Particles advected by noise-based vector field

EFFECTS.flowfield = {
  params: () => ({
    scale: rand(2, 5),
    flowSpeed: rand(0.05, 0.2),
    advectStrength: rand(0.05, 0.15),
    colorSpeed: rand(0.03, 0.08),
    saturation: rand(0.7, 1.0)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_scale;
    uniform float u_flowSpeed;
    uniform float u_advectStrength;
    uniform float u_colorSpeed;
    uniform float u_saturation;

    void main() {
      vec2 uv = v_uv;
      uv.x *= u_resolution.x / u_resolution.y;

      vec2 p = uv * u_scale;
      for (int i = 0; i < 8; i++) {
        float angle = fbm(p + u_time * u_flowSpeed, 5) * TAU;
        p -= vec2(cos(angle), sin(angle)) * u_advectStrength;
      }

      float v = fbm(p, 5);
      vec3 col = hsv2rgb(vec3(v + u_time * u_colorSpeed, u_saturation, 0.6));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
