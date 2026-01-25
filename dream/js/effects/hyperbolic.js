// Poincaré disk with hyperbolic tiling

EFFECTS.hyperbolic = {
  params: () => ({
    pValue: Math.floor(rand(4, 8)),
    qValue: Math.floor(rand(4, 8)),
    rotSpeed: rand(0.05, 0.15),
    colorSpeed: rand(0.02, 0.05),
    innerZoom: rand(0.5, 0.8)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_pValue;
    uniform float u_qValue;
    uniform float u_rotSpeed;
    uniform float u_colorSpeed;
    uniform float u_innerZoom;

    void main() {
      float aspect = u_resolution.x / u_resolution.y;
      vec2 uv = (v_uv - 0.5) * 2.0;
      uv.x *= aspect;

      float maxExtent = max(aspect, 1.0);
      uv *= u_innerZoom / maxExtent;

      float angle = u_time * u_rotSpeed;
      float c = cos(angle), s = sin(angle);
      uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

      float r = length(uv);
      r = min(r, 0.999);

      float theta = atan(uv.y, uv.x);
      float rho = log((1.0 + r) / (1.0 - r));

      float pAngle = TAU / u_pValue;
      float qAngle = TAU / u_qValue;

      float tileTheta = mod(theta + PI, pAngle);
      float tileRho = mod(rho + u_time * 0.5, qAngle);

      float pattern = sin(tileTheta * u_pValue * 2.0) * sin(tileRho * u_qValue);

      float hue = rho * 0.2 + theta / TAU + u_time * u_colorSpeed;
      float sat = 0.8 + 0.2 * pattern;
      float val = 0.4 + 0.4 * (1.0 - r) + 0.2 * pattern;

      vec3 col = hsv2rgb(vec3(hue, sat, val));
      col += vec3(0.3) * smoothstep(0.8, 1.0, r);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
