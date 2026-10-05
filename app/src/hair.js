// Hair for the solid-skin view: wide camera-facing strands (scalp hair, eyebrows, eyelashes) with
// hair-style highlights, one mesh per body. Just enough to read as hair; the scalp under it is tinted
// to the hair colour by the skin shader (render.js), so it never looks bald between strands.
import * as THREE from 'three';

const VERT = /* glsl */ `
attribute vec3 aTan;
attribute vec2 aUV;      // x: side of the ribbon (-1 / 1), y: 0 at the root .. 1 at the tip
attribute vec4 aInfo;    // width (2 um steps), shade, layer (outer = 1), kind (0 scalp, 1 brow, 2 lash)
uniform vec3 uOffset;
uniform float uPx;       // world size of a pixel at unit distance
varying vec3 vT; varying vec3 vW; varying vec2 vUV; varying vec4 vInfo;
void main() {
  vec3 p = position + uOffset;
  vec3 T = normalize(aTan);
  vec3 V = normalize(cameraPosition - p);
  vec3 B = cross(T, V); float bl = length(B); B = bl > 1e-4 ? B / bl : vec3(1.0, 0.0, 0.0);
  float kind = aInfo.w * 255.0;
  float w = aInfo.x * 255.0 * 2e-6 * mix(1.0, kind > 0.5 ? 0.25 : 0.45, aUV.y);
  w = max(w, length(cameraPosition - p) * uPx * (kind > 1.5 ? 0.3 : kind > 0.5 ? 0.45 : 1.3)); // scalp hair stays solid from afar; brows and lashes stay fine
  p += B * aUV.x * w * 0.5;
  vT = T; vW = p; vUV = aUV; vInfo = aInfo;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uBrow;
uniform vec3 uLash;
uniform float uVis;
uniform vec4 uCut;
varying vec3 vT; varying vec3 vW; varying vec2 vUV; varying vec4 vInfo;
float hash(float n) { return fract(sin(n) * 43758.5453); }
float cutaway(vec3 wp) {
  if (uCut.w <= 0.0) return 1.0;
  vec3 toC = uCut.xyz - cameraPosition; float dC = length(toC); vec3 dir = toC / dC;
  vec3 toF = wp - cameraPosition; float along = dot(toF, dir);
  if (along > dC - uCut.w * 0.35) return 1.0;
  float rad = length(toF - dir * along) * dC / max(along, 1e-4);
  return smoothstep(uCut.w, uCut.w * 1.14, rad);
}
// Kajiya-Kay strand lighting with two shifted highlights
vec3 strand(vec3 T, vec3 V, vec3 N, vec3 L, vec3 lc, vec3 base, float spec) {
  float tl = dot(T, L);
  float diff = mix(0.3, 1.0, sqrt(max(0.0, 1.0 - tl * tl))) * clamp(dot(N, L) * 0.5 + 0.6, 0.0, 1.0);
  vec3 H = normalize(L + V);
  vec3 T1 = normalize(T + N * 0.1), T2 = normalize(T - N * 0.15);
  float h1 = dot(T1, H), h2 = dot(T2, H);
  float s1 = pow(sqrt(max(0.0, 1.0 - h1 * h1)), 70.0), s2 = pow(sqrt(max(0.0, 1.0 - h2 * h2)), 16.0);
  return lc * (base * diff + (vec3(0.06) * s1 + base * 0.5 * s2) * spec);
}
void main() {
  if (hash(vInfo.y * 91.7 + vInfo.z * 13.1 + vInfo.x * 3.3) > uVis) discard;  // dissolve in / out
  if (cutaway(vW) < 0.5) discard;
  vec3 T = normalize(vT), V = normalize(cameraPosition - vW);
  vec3 N = normalize(V - T * dot(V, T));
  float kind = vInfo.w * 255.0;
  vec3 base = (kind > 1.5 ? uLash : kind > 0.5 ? uBrow : uColor) * mix(0.72, 1.25, vInfo.y);
  float ao = mix(0.5, 1.0, vInfo.z) * mix(0.6, 1.0, smoothstep(0.0, 0.3, vUV.y));
  float spec = kind > 0.5 ? 0.15 : 1.0; // brows and lashes stay matte
  vec3 c = strand(T, V, N, normalize(vec3(1.4, 2.8, 2.6)), vec3(1.0, 0.957, 0.918) * 1.9, base, spec);
  c += strand(T, V, N, normalize(vec3(-2.2, 1.6, -2.4)), vec3(0.62, 0.85, 1.0) * 1.0, base, spec);
  c += strand(T, V, N, normalize(vec3(-2.0, 0.4, 1.5)), vec3(1.0, 0.89, 0.82) * 0.35, base, spec);
  c += base * mix(vec3(0.23, 0.17, 0.14), vec3(0.87, 0.91, 1.0), N.y * 0.5 + 0.5) * 0.75;
  gl_FragColor = vec4(c * ao, 1.0);
}`;

// colours (linear): golden blond for the woman (honey-blond brows, dark lashes), dark brown for the man
export const HAIR_COLORS = { female: new THREE.Color(0.42, 0.27, 0.11), male: new THREE.Color(0.038, 0.021, 0.012) };
const BROW_COLORS = { female: new THREE.Color(0.17, 0.1, 0.045), male: new THREE.Color(0.03, 0.017, 0.01) };
const LASH_COLORS = { female: new THREE.Color(0.018, 0.011, 0.008), male: new THREE.Color(0.012, 0.008, 0.006) };

export function buildHair(bytes, H) {
  const [mn, mx] = H.bbox, ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  let off = 0;
  const bySex = { female: [], male: [] };
  for (const g of H.groups) {
    const pos = new Uint16Array(bytes.buffer, bytes.byteOffset + off, g.posBytes / 2); off += g.posBytes;
    const info = new Uint8Array(bytes.buffer, bytes.byteOffset + off, g.infoBytes); off += g.infoBytes;
    bySex[g.sex].push({ g, pos, info });
  }
  const meshes = {};
  for (const sex of ['female', 'male']) {
    let nv = 0, ni = 0;
    for (const { g } of bySex[sex]) { nv += g.strands * g.points * 2; ni += g.strands * (g.points - 1) * 6; }
    const P = new Float32Array(nv * 3), Tn = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), INF = new Uint8Array(nv * 4), IDX = new Uint32Array(ni);
    let v = 0, ix = 0;
    const p = [];
    for (const { g, pos, info } of bySex[sex]) {
      for (let s = 0; s < g.strands; s++) {
        p.length = 0;
        for (let k = 0; k < g.points; k++) { const o = (s * g.points + k) * 3; p.push([mn[0] + (pos[o] / 65535) * ext[0], mn[1] + (pos[o + 1] / 65535) * ext[1], mn[2] + (pos[o + 2] / 65535) * ext[2]]); }
        for (let k = 0; k < g.points; k++) {
          const a = p[Math.max(0, k - 1)], b = p[Math.min(g.points - 1, k + 1)];
          let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; t = t.map((x) => x / l);
          for (const side of [-1, 1]) {
            P.set(p[k], v * 3); Tn.set(t, v * 3); UV[v * 2] = side; UV[v * 2 + 1] = k / (g.points - 1);
            INF.set(info.subarray(s * 4, s * 4 + 4), v * 4); v++;
          }
          if (k < g.points - 1) { const base = v - 2; IDX.set([base, base + 1, base + 2, base + 1, base + 3, base + 2], ix); ix += 6; }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('aTan', new THREE.BufferAttribute(Tn, 3));
    geo.setAttribute('aUV', new THREE.BufferAttribute(UV, 2));
    geo.setAttribute('aInfo', new THREE.BufferAttribute(INF, 4, true));
    geo.setIndex(new THREE.BufferAttribute(IDX, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.55, -0.05), 0.6);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
      uniforms: { uOffset: { value: new THREE.Vector3() }, uPx: { value: 0.001 }, uVis: { value: 0 }, uColor: { value: HAIR_COLORS[sex].clone() }, uBrow: { value: BROW_COLORS[sex].clone() }, uLash: { value: LASH_COLORS[sex].clone() }, uCut: { value: new THREE.Vector4() } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 11;
    meshes[sex] = mesh;
  }
  return meshes;
}
