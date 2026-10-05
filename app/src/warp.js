// Female body: the overall shape comes from data (per-vertex skin offsets and a smooth 3D field
// for everything inside, built from MakeHuman's male -> female difference; see build/mhfemale.mjs).
// This file holds the small analytic touches applied on top, in male space, shared by the build
// (JS) and the shaders (GLSL): the pudendal cleft and labia, and the doll-mode nipple flattening.
// Coordinates are metres, +y up, +z anterior, +x = body's left.

// Pudendal shaping (female only, skin layer): mons pubis, labia majora, pudendal cleft.
// Parameterized by angle around an axis along x through (y=yc, z=zc).
export const VULVA = { yc: 0.83, zc: -0.01, top: 0.02, bot: -1.52, mons: 0.2 };
export function vulvaAmount(x, th) {
  const along = sstepF(VULVA.bot - 0.04, VULVA.bot + 0.18, th) * (1 - sstepF(VULVA.top - 0.08, VULVA.top + 0.08, th));
  const lab = Math.exp(-(((Math.abs(x) - 0.0105) / 0.007) ** 2)) * 0.0052 * along;
  const groove = Math.exp(-((x / 0.0024) ** 2)) * 0.0075 * along;
  const mons = Math.exp(-(((th - VULVA.mons) / 0.22) ** 2)) * Math.exp(-((x / 0.03) ** 2)) * 0.004;
  return lab + mons - groove;
}
function sstepF(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export const WARP_GLSL = /* glsl */ `
uniform float uFemale;
uniform float uPG;      // 1 = doll mode (Ken / Barbie): genitals smoothed over
float vulvaAmount(float x, float th) {
  float along = smoothstep(${(VULVA.bot - 0.04).toFixed(4)}, ${(VULVA.bot + 0.18).toFixed(4)}, th) * (1.0 - smoothstep(${(VULVA.top - 0.08).toFixed(4)}, ${(VULVA.top + 0.08).toFixed(4)}, th));
  float a = (abs(x) - 0.0105) / 0.007;
  float lab = exp(-a * a) * 0.0052 * along;
  float b = x / 0.0024;
  float groove = exp(-b * b) * 0.0075 * along;
  float c = (th - ${VULVA.mons.toFixed(4)}) / 0.22; float e = x / 0.03;
  float mons = exp(-c * c) * exp(-e * e) * 0.004;
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
vec3 vulvaDisp(vec3 p) {
  float dy = p.y - ${VULVA.yc.toFixed(4)}, dz = p.z - ${VULVA.zc.toFixed(4)}, r = length(vec2(dy, dz));
  if (r < 0.03 || r > 0.12 || abs(p.x) > 0.05) return vec3(0.0);
  float amt = vulvaAmount(p.x, atan(dy, dz)) * smoothstep(0.03, 0.04, r) * (1.0 - smoothstep(0.1, 0.12, r));
  return vec3(0.0, dy / r * amt, dz / r * amt);
}
// Male nipples pressed flat (uNip = [tip.xyz, height above the chest], [normal.xyz, radius] per side):
// in the doll modes, and in the female body (whose own nipples are modelled separately)
uniform vec4 uNip[4];
vec3 dollFlatten(vec3 p, float amount) {
  for (int i = 0; i < 2; i++) {
    vec4 a = uNip[i * 2], b = uNip[i * 2 + 1];
    if (a.w <= 0.0) continue;
    vec3 d = p - (a.xyz - b.xyz * a.w); float h = dot(d, b.xyz);
    if (abs(h) > 0.015) continue;
    float rr = length(d - b.xyz * h);
    float w = 1.0 - smoothstep(0.6 * b.w, b.w, rr);
    p -= b.xyz * (h + rr * rr * 5.0) * w * amount;
  }
  return p;
}
bool nearSkinFeature(vec3 p) {
  bool nip = false;
  for (int i = 0; i < 2; i++) if (uNip[i * 2].w > 0.0 && distance(p, uNip[i * 2].xyz) < uNip[i * 2 + 1].w * 1.6 + 0.01) nip = true;
  return nip || (abs(p.x) < 0.06 && p.y > 0.68 && p.y < 0.97 && p.z > -0.08);
}
`;
