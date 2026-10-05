// Female body shape as a smooth deformation of the male model.
// The same field is implemented twice (JS for the CPU, GLSL for the GPU) and
// must stay in sync. Coordinates are meters, +y up, +z anterior, +x = body's left.
//
// Proportion changes (all layers): wider pelvis/hips, narrower waist, chest and
// shoulders, slightly smaller overall. Skin-only changes: breasts, fuller hips.

// Pudendal shaping (female only, skin layer): mons pubis, labia majora, pudendal cleft.
// Parameterized by angle around an axis along x through (y=0.8, z=0.02).
export const VULVA = { yc: 0.83, zc: -0.01, top: 0.02, bot: -1.52, mons: 0.2 };
export function vulvaAmount(x, th) {
  const along = sstepF(VULVA.bot - 0.04, VULVA.bot + 0.18, th) * (1 - sstepF(VULVA.top - 0.08, VULVA.top + 0.08, th));
  const lab = Math.exp(-(((Math.abs(x) - 0.0105) / 0.007) ** 2)) * 0.0052 * along;
  const groove = Math.exp(-((x / 0.0024) ** 2)) * 0.0075 * along;
  const mons = Math.exp(-(((th - VULVA.mons) / 0.22) ** 2)) * Math.exp(-((x / 0.03) ** 2)) * 0.007;
  return lab + mons - groove;
}
function sstepF(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export const BREAST = { x: 0.105, y: 1.262, rx: 0.09, ryUp: 0.085, ryDown: 0.074, amp: 0.046, sag: 0.012 };
export const FEMALE_SCALE = 0.95;

const g = (y, y0, s) => Math.exp(-(((y - y0) / s) ** 2));
const sclamp = (v, c) => c * Math.tanh(v / c);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Skin-only bulges, applied in male space before the proportion field.
export function skinBulge(x, y, z) {
  let dx = 0, dy = 0, dz = 0, dyAdd = 0, dzAdd = 0;
  const front = sstep(0.02, 0.075, z);
  if (front > 0) {
    for (const s of [-1, 1]) {
      const lx = (x - s * BREAST.x) / BREAST.rx;
      const ly = (y - BREAST.y) / (y < BREAST.y ? BREAST.ryDown : BREAST.ryUp);
      const r2 = lx * lx + ly * ly;
      if (r2 < 1) {
        const w = (1 - r2) * (1 - r2);
        const a = BREAST.amp * Math.pow(w, 0.75) * front;
        dx += a * 0.28 * s; dy += a * -0.12 - BREAST.sag * w * front; dz += a;
      }
    }
  }
  // vulva
  {
    const dy = y - VULVA.yc, dz2 = z - VULVA.zc, r = Math.hypot(dy, dz2);
    if (r > 0.03 && r < 0.12 && Math.abs(x) < 0.05) {
      const th = Math.atan2(dy, dz2);
      const amt = vulvaAmount(x, th) * sstep(0.03, 0.04, r) * (1 - sstep(0.1, 0.12, r));
      dyAdd += (dy / r) * amt; dzAdd += (dz2 / r) * amt;
    }
  }
  // gluteofemoral fullness: push outward from the vertical axis around hips/upper thighs
  const hipFat = g(y, 0.84, 0.075) * 0.012;
  const r = Math.hypot(x, z * 0.8) || 1;
  dx += (x / r) * hipFat * sstep(0.04, 0.12, Math.abs(x) + Math.max(0, -z));
  dz += (z / r) * hipFat * 0.7 * sstep(0.0, 0.08, -z);
  return [dx, dy + dyAdd, dz + dzAdd];
}

export function warpProportions(x, y, z) {
  const hip = g(y, 0.88, 0.11), waist = g(y, 1.07, 0.075), chest = g(y, 1.3, 0.12), neck = g(y, 1.48, 0.045);
  let dx = 0.1 * hip * sclamp(x, 0.16) - 0.08 * waist * sclamp(x, 0.15) - 0.035 * chest * sclamp(x, 0.15) - 0.06 * neck * sclamp(x, 0.06);
  let dz = -0.05 * waist * sclamp(z, 0.12) - 0.05 * neck * sclamp(z, 0.06);
  const sh = sstep(0.1, 0.2, Math.abs(x)) * sstep(0.62, 0.75, y) * (1 - sstep(1.48, 1.56, y));
  dx -= Math.sign(x) * 0.014 * sh;
  return [(x + dx) * FEMALE_SCALE, y * FEMALE_SCALE, (z + dz) * FEMALE_SCALE];
}

// Full warp for a point. f = 0 male .. 1 female.
export function warpPoint(p, f, skin = false, out = [0, 0, 0]) {
  if (f <= 0) { out[0] = p[0]; out[1] = p[1]; out[2] = p[2]; return out; }
  let x = p[0], y = p[1], z = p[2];
  if (skin) { const b = skinBulge(x, y, z); x += b[0]; y += b[1]; z += b[2]; }
  const w = warpProportions(x, y, z);
  out[0] = p[0] + (w[0] - p[0]) * f; out[1] = p[1] + (w[1] - p[1]) * f; out[2] = p[2] + (w[2] - p[2]) * f;
  return out;
}

export const WARP_GLSL = /* glsl */ `
uniform float uFemale;
uniform float uPG;      // 1 = doll mode (Ken / Barbie): genitals smoothed over
float wg(float y, float y0, float s) { float t = (y - y0) / s; return exp(-t * t); }
float wsclamp(float v, float c) { return c * tanh(v / c); }
float vulvaAmount(float x, float th) {
  float along = smoothstep(${(VULVA.bot - 0.04).toFixed(4)}, ${(VULVA.bot + 0.18).toFixed(4)}, th) * (1.0 - smoothstep(${(VULVA.top - 0.08).toFixed(4)}, ${(VULVA.top + 0.08).toFixed(4)}, th));
  float a = (abs(x) - 0.0105) / 0.007;
  float lab = exp(-a * a) * 0.0052 * along;
  float b = x / 0.0024;
  float groove = exp(-b * b) * 0.0075 * along;
  float c = (th - ${VULVA.mons.toFixed(4)}) / 0.22; float e = x / 0.03;
  float mons = exp(-c * c) * exp(-e * e) * 0.007;
  return (lab - groove) * (1.0 - uPG) + mons;
}
// 0..1 inside the pudendal cleft: used to occlude light in the crevice
float vulvaCavity(vec3 p) {
  float dy = p.y - ${VULVA.yc.toFixed(4)}, dz = p.z - ${VULVA.zc.toFixed(4)};
  float r = length(vec2(dy, dz));
  if (r < 0.03 || r > 0.12 || abs(p.x) > 0.02) return 0.0;
  float th = atan(dy, dz);
  float along = smoothstep(${(VULVA.bot - 0.04).toFixed(4)}, ${(VULVA.bot + 0.18).toFixed(4)}, th) * (1.0 - smoothstep(${(VULVA.top - 0.08).toFixed(4)}, ${(VULVA.top + 0.08).toFixed(4)}, th));
  float b = p.x / 0.0034;
  return exp(-b * b) * along * smoothstep(0.03, 0.04, r) * (1.0 - smoothstep(0.1, 0.12, r)) * (1.0 - uPG);
}
vec3 skinBulge(vec3 p) {
  vec3 d = vec3(0.0);
  {
    float dy = p.y - ${VULVA.yc.toFixed(4)}, dz = p.z - ${VULVA.zc.toFixed(4)};
    float r = length(vec2(dy, dz));
    if (r > 0.03 && r < 0.12 && abs(p.x) < 0.05) {
      float th = atan(dy, dz);
      float amt = vulvaAmount(p.x, th) * smoothstep(0.03, 0.04, r) * (1.0 - smoothstep(0.1, 0.12, r));
      d.y += dy / r * amt; d.z += dz / r * amt;
    }
  }
  float front = smoothstep(0.02, 0.075, p.z);
  if (front > 0.0) {
    for (int i = 0; i < 2; i++) {
      float s = i == 0 ? -1.0 : 1.0;
      float lx = (p.x - s * ${BREAST.x.toFixed(4)}) / ${BREAST.rx.toFixed(4)};
      float ly = (p.y - ${BREAST.y.toFixed(4)}) / (p.y < ${BREAST.y.toFixed(4)} ? ${BREAST.ryDown.toFixed(4)} : ${BREAST.ryUp.toFixed(4)});
      float r2 = lx * lx + ly * ly;
      if (r2 < 1.0) {
        float w = (1.0 - r2) * (1.0 - r2);
        float a = ${BREAST.amp.toFixed(4)} * pow(w, 0.75) * front;
        d += vec3(a * 0.28 * s, a * -0.12 - ${BREAST.sag.toFixed(4)} * w * front, a);
      }
    }
  }
  float hipFat = wg(p.y, 0.84, 0.075) * 0.012;
  float r = max(length(vec2(p.x, p.z * 0.8)), 1e-4);
  d.x += (p.x / r) * hipFat * smoothstep(0.04, 0.12, abs(p.x) + max(0.0, -p.z));
  d.z += (p.z / r) * hipFat * 0.7 * smoothstep(0.0, 0.08, -p.z);
  return d;
}
vec3 warpProportions(vec3 p) {
  float hip = wg(p.y, 0.88, 0.11), waist = wg(p.y, 1.07, 0.075), chest = wg(p.y, 1.3, 0.12), neck = wg(p.y, 1.48, 0.045);
  float dx = 0.1 * hip * wsclamp(p.x, 0.16) - 0.08 * waist * wsclamp(p.x, 0.15) - 0.035 * chest * wsclamp(p.x, 0.15) - 0.06 * neck * wsclamp(p.x, 0.06);
  float dz = -0.05 * waist * wsclamp(p.z, 0.12) - 0.05 * neck * wsclamp(p.z, 0.06);
  float sh = smoothstep(0.1, 0.2, abs(p.x)) * smoothstep(0.62, 0.75, p.y) * (1.0 - smoothstep(1.48, 1.56, p.y));
  dx -= sign(p.x) * 0.014 * sh;
  return vec3(p.x + dx, p.y, p.z + dz) * ${FEMALE_SCALE.toFixed(4)};
}
// Doll modes: press the nipples flat (uNip = [tip.xyz, height above the chest], [normal.xyz, radius] per side)
uniform vec4 uNip[4];
vec3 dollFlatten(vec3 p) {
  for (int i = 0; i < 2; i++) {
    vec4 a = uNip[i * 2], b = uNip[i * 2 + 1];
    if (a.w <= 0.0) continue;
    // replace the nipple (bump and the crease around it) with the smooth chest surface:
    // the tangent plane under the tip, curving away with the chest (radius ~10 cm)
    vec3 d = p - (a.xyz - b.xyz * a.w); float h = dot(d, b.xyz);
    if (abs(h) > 0.015) continue;
    float rr = length(d - b.xyz * h);
    float w = 1.0 - smoothstep(0.6 * b.w, b.w, rr);
    p -= b.xyz * (h + rr * rr * 5.0) * w * uPG;
  }
  return p;
}
vec3 warpPoint(vec3 p, bool skin) {
  if (skin && uPG > 0.0) p = dollFlatten(p);
  if (uFemale <= 0.0) return p;
  vec3 q = p;
  if (skin) q += skinBulge(p);
  return mix(p, warpProportions(q), uFemale);
}
`;
