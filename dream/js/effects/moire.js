// Overlapping line patterns creating interference

EFFECTS.moire = {
  params: () => ({
    lineFreq: rand(40, 80),
    rotSpeed: rand(0.1, 0.3),
    offset: rand(0.1, 0.3),
    colorSpeed: rand(0.02, 0.06),
    layers: Math.floor(rand(2, 4))
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_lineFreq;
    uniform float u_rotSpeed;
    uniform float u_offset;
    uniform float u_colorSpeed;
    uniform float u_layers;

    float pattern(vec2 uv, float angle) {
      float c = cos(angle), s = sin(angle);
      vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
      return sin(rotUV.x * u_lineFreq) * 0.5 + 0.5;
    }

    void main() {
      vec2 uv = v_uv - 0.5;
      uv.x *= u_resolution.x / u_resolution.y;

      float v = 0.0;

      for (int i = 0; i < 4; i++) {
        if (float(i) >= u_layers) break;
        float fi = float(i);
        float angle = u_time * u_rotSpeed * (1.0 + fi * 0.3);
        vec2 layerUV = uv + vec2(
          u_offset * sin(u_time * 0.5 + fi),
          u_offset * cos(u_time * 0.5 + fi)
        );
        v += pattern(layerUV, angle + fi * PI / u_layers);
      }
      v /= u_layers;

      float circles = sin(length(uv) * u_lineFreq * 0.5 - u_time) * 0.5 + 0.5;
      v = v * 0.7 + circles * 0.3;

      float hue = v + u_time * u_colorSpeed;
      vec3 col = hsv2rgb(vec3(hue, 0.85, 0.5 + 0.3 * v));

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
