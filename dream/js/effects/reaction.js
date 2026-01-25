// Reaction-diffusion inspired warped noise

EFFECTS.reaction = {
  params: () => ({
    scale: rand(5, 12),
    warpIntensity: rand(2, 6),
    speed: rand(0.2, 0.5),
    colorSpeed: rand(0.01, 0.04),
    saturation: rand(0.7, 0.95)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_scale;
    uniform float u_warpIntensity;
    uniform float u_speed;
    uniform float u_colorSpeed;
    uniform float u_saturation;

    void main() {
      vec2 uv = v_uv * u_scale;

      float t = u_time * u_speed;
      vec2 q = vec2(fbm(uv + t, 6), fbm(uv + vec2(5.2, 1.3) + t, 6));
      vec2 r = vec2(
        fbm(uv + u_warpIntensity * q + vec2(1.7, 9.2) + t * 0.5, 6),
        fbm(uv + u_warpIntensity * q + vec2(8.3, 2.8) + t * 0.5, 6)
      );

      float v = fbm(uv + u_warpIntensity * r, 6);

      vec3 col = hsv2rgb(vec3(v * 0.5 + u_time * u_colorSpeed, u_saturation, 0.55));
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
