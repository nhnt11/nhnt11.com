// Lightning bolts with smooth wandering paths

EFFECTS.electric = {
  params: () => ({
    branches: Math.floor(rand(5, 9)),
    speed: rand(0.3, 0.8),
    intensity: rand(0.6, 1.0),
    thickness: rand(0.025, 0.045),
    colorSpeed: rand(0.02, 0.06)
  }),
  shader: `
    ${GLSL_COMMON}
    uniform float u_branches;
    uniform float u_speed;
    uniform float u_intensity;
    uniform float u_thickness;
    uniform float u_colorSpeed;

    float lightning(vec2 uv, float seed, float time, vec2 center, float angle) {
      float line = 0.0;

      float len = 0.8;
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 start = center + dir * len;
      vec2 end = center - dir * len;

      float segments = 16.0;
      vec2 pos = start;

      vec2 perp = vec2(-dir.y, dir.x);

      for (float i = 0.0; i < 16.0; i++) {
        vec2 nextPos = mix(start, end, (i + 1.0) / segments);

        float t1 = time * u_speed + i * 0.7 + seed;
        float t2 = time * u_speed * 0.7 + i * 1.1 + seed * 2.0;
        float offset = sin(t1) * 0.15 + sin(t2 * 1.7) * 0.1;
        offset *= (1.0 - i / segments) * (0.3 + i / segments);

        nextPos += perp * offset;

        vec2 pa = uv - pos;
        vec2 ba = nextPos - pos;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float d = length(pa - ba * h);

        line += u_thickness / (d + 0.002) * 0.015;

        pos = nextPos;
      }

      return line * u_intensity;
    }

    void main() {
      vec2 uv = v_uv;
      uv.x *= u_resolution.x / u_resolution.y;

      float t = u_time;
      vec3 col = vec3(0.0);

      float aspect = u_resolution.x / u_resolution.y;

      for (int i = 0; i < 9; i++) {
        if (float(i) >= u_branches) break;
        float fi = float(i);

        float angle = noise(vec2(fi * 17.3, 42.7)) * TAU;

        vec2 center = vec2(
          (fi + 0.5) / u_branches * aspect,
          0.5
        );
        center += vec2(
          sin(fi * 2.5 + t * 0.1) * 0.04,
          cos(fi * 1.8 + t * 0.08) * 0.03
        );

        float pulse = 0.6 + 0.4 * sin(t * 0.8 + fi * 1.5);
        pulse *= 0.7 + 0.3 * sin(t * 1.3 + fi * 2.7);

        float bolt = lightning(uv, fi * 13.7, t + fi * 0.5, center, angle) * pulse;

        float hue = 0.58 + fi * 0.035 + sin(t * 0.2) * 0.05 + u_time * u_colorSpeed;
        vec3 boltCol = hsv2rgb(vec3(hue, 0.9, 1.0));

        col += bolt * boltCol;
      }

      col = pow(col, vec3(0.7));

      float ambientPulse = 0.02 + 0.01 * sin(t * 0.5);
      col += vec3(ambientPulse * 0.8, ambientPulse * 0.4, ambientPulse * 1.2);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
