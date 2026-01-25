// Animated Voronoi cells with edge detection

EFFECTS.voronoi = {
  params: () => ({
    palette: randomPalette(),
    cellCount: Math.floor(rand(8, 20)),
    speed: rand(0.3, 0.8),
    colorSpeed: rand(0.03, 0.08),
    edgeWidth: rand(0.02, 0.06)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_cellCount;
    uniform float u_speed;
    uniform float u_colorSpeed;
    uniform float u_edgeWidth;

    void main() {
      vec2 uv = glitchUV(v_uv);
      uv.x *= u_resolution.x / u_resolution.y;
      uv *= u_cellCount;

      float minDist = 10.0;
      float secondMinDist = 10.0;
      float cellId = 0.0;
      vec2 closestPoint;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 cell = floor(uv) + neighbor;

          vec2 point = cell + 0.5 + 0.4 * sin(u_time * u_speed + cell * PI);

          float dist = length(uv - point);
          if (dist < minDist) {
            secondMinDist = minDist;
            minDist = dist;
            cellId = noise(cell);
            closestPoint = point;
          } else if (dist < secondMinDist) {
            secondMinDist = dist;
          }
        }
      }

      float edge = secondMinDist - minDist;
      float edgeLine = 1.0 - smoothstep(0.0, u_edgeWidth, edge);

      float t = cellId + u_time * u_colorSpeed;
      float val = 0.5 + 0.3 * (1.0 - minDist);

      vec3 col = palette(t, val);
      col = mix(col, vec3(1.0), edgeLine * 0.8);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
