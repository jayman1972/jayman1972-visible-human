// GLSL shared by the anatomy materials and the picking material.
import { WARP_GLSL } from './warp.js';

// Tissue classes (must match build2.mjs TISSUE).
export const TISSUE_COUNT = 24;
// A: clearcoat, clearcoatRoughness, sheen, bumpScale
// B: bumpFreq, striation, colorVariation, subsurface
// C: subsurface tint (linear)
const T = [
  /* 0 generic   */ [[0.15, 0.4, 0.0, 0.2], [40, 0, 0.06, 0.12], [0.6, 0.3, 0.25]],
  /* 1 bone      */ [[0.04, 0.5, 0.0, 0.55], [95, 0.0, 0.07, 0.06], [0.7, 0.55, 0.42]],
  /* 2 cartilage */ [[0.55, 0.22, 0.0, 0.14], [60, 0.0, 0.04, 0.38], [0.6, 0.72, 0.78]],
  /* 3 enamel    */ [[0.85, 0.07, 0.0, 0.08], [120, 0.0, 0.03, 0.22], [0.9, 0.85, 0.72]],
  /* 4 muscle    */ [[0.28, 0.32, 0.4, 0.42], [230, 0.9, 0.09, 0.38], [0.85, 0.12, 0.08]],
  /* 5 tendon    */ [[0.55, 0.2, 0.25, 0.32], [320, 0.92, 0.05, 0.22], [0.82, 0.76, 0.66]],
  /* 6 artery    */ [[0.78, 0.12, 0.0, 0.1], [70, 0.25, 0.05, 0.32], [0.9, 0.1, 0.1]],
  /* 7 vein      */ [[0.78, 0.12, 0.0, 0.1], [70, 0.25, 0.05, 0.26], [0.3, 0.26, 0.75]],
  /* 8 nerve     */ [[0.45, 0.25, 0.22, 0.32], [240, 0.9, 0.06, 0.32], [0.92, 0.8, 0.5]],
  /* 9 cortex    */ [[0.7, 0.16, 0.15, 0.22], [130, 0.0, 0.07, 0.42], [0.88, 0.42, 0.36]],
  /* 10 white m. */ [[0.5, 0.24, 0.1, 0.14], [60, 0.3, 0.04, 0.32], [0.82, 0.76, 0.66]],
  /* 11 organ    */ [[0.85, 0.1, 0.0, 0.12], [55, 0.0, 0.08, 0.42], [0.75, 0.15, 0.1]],
  /* 12 lung     */ [[0.32, 0.35, 0.28, 0.38], [150, 0.0, 0.16, 0.42], [0.92, 0.42, 0.42]],
  /* 13 mucosa   */ [[0.88, 0.09, 0.1, 0.26], [85, 0.0, 0.08, 0.46], [0.92, 0.36, 0.3]],
  /* 14 gland    */ [[0.62, 0.2, 0.1, 0.36], [115, 0.0, 0.1, 0.36], [0.82, 0.52, 0.32]],
  /* 15 fat      */ [[0.7, 0.14, 0.1, 0.42], [75, 0.0, 0.12, 0.52], [0.96, 0.8, 0.4]],
  /* 16 skin     */ [[0.18, 0.35, 0.32, 0.16], [260, 0.0, 0.05, 0.48], [0.92, 0.36, 0.26]],
  /* 17 eye      */ [[1.0, 0.04, 0.0, 0.02], [20, 0.0, 0.02, 0.2], [0.8, 0.8, 0.8]],
  /* 18 heart    */ [[0.65, 0.16, 0.15, 0.3], [210, 0.6, 0.07, 0.36], [0.82, 0.1, 0.08]],
  /* 19 lymph    */ [[0.62, 0.2, 0.1, 0.26], [100, 0.0, 0.08, 0.36], [0.86, 0.6, 0.45]],
  /* 20 airway   */ [[0.6, 0.2, 0.0, 0.3], [160, 0.3, 0.05, 0.3], [0.82, 0.7, 0.6]],
  /* 21 capsule  */ [[0.6, 0.18, 0.1, 0.16], [80, 0.4, 0.04, 0.3], [0.85, 0.8, 0.7]],
  /* 22 cornea   */ [[1.0, 0.03, 0.0, 0.0], [10, 0.0, 0.0, 0.1], [0.8, 0.9, 1.0]],
  /* 23 spare    */ [[0.2, 0.4, 0.0, 0.2], [40, 0, 0.05, 0.1], [0.6, 0.3, 0.25]],
];
export function tissueUniforms(THREE) {
  return {
    uTisA: { value: T.map((t) => new THREE.Vector4(...t[0])) },
    uTisB: { value: T.map((t) => new THREE.Vector4(...t[1])) },
    uTisC: { value: T.map((t) => new THREE.Vector3(...t[2])) },
  };
}

// ---------------------------------------------------------------------------
// Vertex: data fetch, physiology animation, female warp, explode, culling
// ---------------------------------------------------------------------------
export const VERT_PARS = /* glsl */ `
attribute float partId;
attribute float aRough;
attribute float aTissue;
attribute float aFlow;
uniform highp sampler2D uPartTex;
uniform highp sampler2D uAnimTex;
uniform highp sampler2D uAxisTex;
uniform highp sampler2D uFemTex;
uniform int uTexW;
uniform vec3 uQScale;
uniform vec3 uQMin;
uniform float uIsSkin;
uniform float uLodPass;
uniform float uTime;
uniform vec4 uHeart;   // x phase, y atrial contraction, z ventricular contraction, w seconds since ventricular systole
uniform vec4 uBreath;  // x inhale amount 0..1, y d/dt sign, z cycle phase
uniform vec4 uAnimA;   // heart, breathing, blood flow, nerves
uniform vec4 uAnimB;   // digestion, urine, brain, airflow
uniform float uBladder;
${WARP_GLSL}
varying vec3 vMalePos;
varying vec3 vWPos;
varying float vFlow;
varying float vTissue;
varying float vAnimCode;
varying vec3 vAxis;
varying float vRough;
varying float vFlags;
varying float vPid;
varying float vState;
varying float vCavity;

vec3 anatAnimate(vec3 p, vec3 n, float code, vec3 pivot, float flow) {
  int c = int(code + 0.5);
  if (c == 5) { p = pivot + (p - pivot) * (1.0 - 0.075 * uHeart.y * uAnimA.x); }
  else if (c == 6) { p = pivot + (p - pivot) * (1.0 - 0.095 * uHeart.z * uAnimA.x); }
  else if (c == 7) { p = pivot + (p - pivot) * (1.0 - 0.05 * uHeart.z * uAnimA.x); }
  else if (c == 8) { float b = uBreath.x * uAnimA.y; vec3 d = p - pivot; p = pivot + d * vec3(1.0 + 0.055 * b, 1.0 + 0.08 * b, 1.0 + 0.065 * b); }
  else if (c == 9) { float b = uBreath.x * uAnimA.y; p += n * 0.0005 * b; }
  else if (c == 10) { float b = uBreath.x * uAnimA.y; float w = 1.0 - smoothstep(0.03, 0.15, length((p - pivot).xz)); p.y -= 0.017 * b * (0.3 + 0.7 * w); }
  else if (c == 11 || c == 17) { float b = uBreath.x * uAnimA.y; float f = smoothstep(-0.06, 0.1, p.z); p += vec3(0.0, 0.006, 0.005) * b * f; }
  else if ((c == 12 || c == 20) && flow < 65000.0) {
    float s = flow * 0.001;
    float ph = fract((s - uTime * 0.025) / 0.07);
    float w = exp(-pow((ph - 0.5) / 0.11, 2.0));
    p -= n * (c == 20 ? 0.003 : 0.0022) * w * uAnimB.x;
  }
  else if (c == 16) { p = pivot + (p - pivot) * (1.0 + 0.12 * uBladder * uAnimB.y); }
  return p;
}

void anatomyVertex(out vec3 outPos, inout vec3 n, out float cull) {
  int pid = int(partId + 0.5);
  ivec2 tc = ivec2(pid % uTexW, pid / uTexW);
  vec4 pd = texelFetch(uPartTex, tc, 0);
  vec4 ad = texelFetch(uAnimTex, tc, 0);
  vec4 xd = texelFetch(uAxisTex, tc, 0);
  vec4 fd = texelFetch(uFemTex, tc, 0);
  float hi = floor(pd.w / 10.0 + 0.001);
  float st = pd.w - hi * 10.0;
  vState = st;
  float pgc = floor(fd.w / 4.0 + 0.01);           // doll-mode class: 1 hide, 2 always show
  float sex = fd.w - pgc * 4.0;
  bool dolls = uPG >= 0.5;
  bool sexHidden = (dolls && pgc > 0.5 && pgc < 1.5) ||
    (!(dolls && pgc > 1.5) && ((sex > 0.5 && sex < 1.5 && uFemale >= 0.5) || (sex > 1.5 && uFemale < 0.5)));
  bool lodHidden = (hi > 0.5) != (uLodPass > 0.5);
  cull = (st < 0.5 || sexHidden || lodHidden) ? 1.0 : 0.0;
  vec3 p = position * uQScale + uQMin;
  vMalePos = p;
  p = anatAnimate(p, n, ad.x, ad.yzw, aFlow);
  p += fd.xyz * uFemale;
  bool skin = uIsSkin > 0.5 && mod(xd.w, 2.0) < 0.5;
  vec3 pw = warpPoint(p, skin);
  vCavity = skin ? uFemale * vulvaCavity(p) : 0.0;
  if (uFemale > 0.0 || (skin && uPG > 0.0)) {
    vec3 t1 = normalize(abs(n.y) < 0.9 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(n, t1);
    float e = 0.001;
    vec3 a = warpPoint(p + t1 * e, skin) - pw;
    vec3 b = warpPoint(p + t2 * e, skin) - pw;
    vec3 nn = cross(a, b);
    if (dot(nn, nn) > 1e-14) n = normalize(nn);
  }
  outPos = pw + pd.xyz;
  vWPos = outPos;
  vFlow = aFlow; vTissue = aTissue; vAnimCode = ad.x; vAxis = xd.xyz; vRough = aRough; vFlags = xd.w; vPid = float(pid);
}
`;

// ---------------------------------------------------------------------------
// Fragment helpers
// ---------------------------------------------------------------------------
export const FRAG_PARS = /* glsl */ `
uniform highp sampler3D uNoise;
uniform vec4 uTisA[${TISSUE_COUNT}];
uniform vec4 uTisB[${TISSUE_COUNT}];
uniform vec3 uTisC[${TISSUE_COUNT}];
uniform vec3 uHiColor;
uniform vec2 uSkinA;
uniform float uSkinFade;
uniform float uGhostA;
uniform float uSkinSolid;
uniform float uIsSkin;
uniform float uFemale;
uniform float uTime;
uniform vec4 uHeart;
uniform vec4 uBreath;
uniform vec4 uAnimA;
uniform vec4 uAnimB;
uniform vec4 uClipPlane;
uniform float uClipMode;
uniform float uHover;  // part id under the mouse (-1 none)
uniform vec4 uEye[4];  // per eye: [iris centre (male space), pupil radius], [facing axis, iris radius]
uniform vec4 uCut;   // cutaway window: centre of the selected organ (xyz), radius (w; 0 = off)
// 1 = keep, 0 = inside the window cut between the camera and the selected organ
float cutaway(vec3 wp) {
  if (uCut.w <= 0.0) return 1.0;
  vec3 toC = uCut.xyz - cameraPosition; float dC = length(toC); vec3 dir = toC / dC;
  vec3 toF = wp - cameraPosition; float along = dot(toF, dir);
  if (along > dC - uCut.w * 0.35) return 1.0;
  float rad = length(toF - dir * along) * dC / max(along, 1e-4);
  return smoothstep(uCut.w, uCut.w * 1.14, rad);
}
uniform float uPG;
uniform vec3 uKeyDir;   // view space
uniform float uDetail;  // 0..1 procedural detail strength
varying vec3 vMalePos;
varying vec3 vWPos;
varying float vFlow;
varying float vTissue;
varying float vAnimCode;
varying vec3 vAxis;
varying float vRough;
varying float vFlags;
varying float vPid;
varying float vState;
varying float vCavity;

vec4 nz(vec3 p) { return texture(uNoise, p); }               // rgb = gradient (0..1), a = value
vec3 nzGrad(vec3 p) { return nz(p).rgb * 2.0 - 1.0; }
float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
`;
