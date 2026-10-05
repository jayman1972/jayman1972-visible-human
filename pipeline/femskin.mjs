// Female skin: per-vertex offsets from the male skin to the female shape (MakeHuman transfer,
// mhfemale.mjs), made continuous across the skin's many pieces, with the hands, face and body
// contour finishing passes.
import { smoothField, REG } from './mhfemale.mjs';
import { femaleFaceOffset, femaleBrowOffset } from './face.mjs';

const ARM_RE = /^(Deltoid region|Anterior region of arm|Posterior region of arm|Lateral bicipital groove|Medial bicipital groove|Palm|Dorsum of hand|Palmar surfaces of digits of hand|Dorsal surfaces of digits of hand|Nail plate|Perionyx|Anterior region of elbow|Cubital fossa|Posterior region of elbow|Posterior region of forearm|Lateral border of forearm|Medial border of forearm|Anterior region of forearm|Anterior region of wrist|Posterior region of wrist|Radial foveola)$/;
const LEG_RE = /(thigh|Femoral triangle|knee|Popliteal|malleol|ankle|retromalleolar|^Sole$|arch of foot|Metatarsal|Hallucial|Heel|Dorsum of foot|border of foot|digits of foot|\(foot\)|region of leg)/;
// The female build: MakeHuman's average woman made slimmer and less muscular with "ideal"
// proportions (breasts kept at the fuller build's size), slimmer arms, legs and belly, and the
// finishing passes below (relief smoothing, neck, waist, head).
export const FEMALE_BODY = {
  age: 30, breastSize: 0.78, breastFirmness: 0.62, weight: 0.42, muscle: 0.3, proportions: 1, heightRatio: 0.94,
  breastFrom: { weight: 0.55 },
  extra: [
    ["armslegs/*-upperarm-muscle-decr.target", 1],
    ["armslegs/*-upperarm-fat-decr.target", 0.6],
    ["armslegs/*-upperarm-shoulder-muscle-decr.target", 1],
    ["armslegs/*-upperarm-scale-depth-decr.target", 0.6],
    ["armslegs/*-upperarm-scale-horiz-decr.target", 0.4],
    ["armslegs/*-lowerarm-muscle-decr.target", 1],
    ["armslegs/*-lowerarm-fat-decr.target", 0.4],
    ["armslegs/*-lowerarm-scale-depth-decr.target", 0.4],
    ["armslegs/*-lowerarm-scale-horiz-decr.target", 0.3],
    ["armslegs/*-upperleg-fat-decr.target", 0.25],
    ["armslegs/*-upperleg-muscle-decr.target", 0.5],
    ["armslegs/*-lowerleg-fat-decr.target", 0.3],
    ["armslegs/*-lowerleg-muscle-decr.target", 0.6],
    ["hip/hip-scale-horiz-decr.target", 0.15],
    ["stomach/stomach-pregnant-decr.target", 0.6],
    ["torso/torso-muscle-dorsi-decr.target", 1],
    ["torso/torso-muscle-pectoral-decr.target", 0.5],
    ["torso/torso-vshape-decr.target", 0.5],
  ],
};
export const FEMALE_SHAPE = { reliefOpts: { iters: 220, lambda: 0.55, mu: -0.565 } };

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// A slightly larger head (the male model's is small for a woman: 8.2 heads tall), scaled about the
// top of the neck and blended in under the jaw. Applied to everything (skin and the field inside),
// so the skull, brain and eyes grow with it.
export const HEAD = { s: 1.065, c: [0, 1.47, -0.01], y0: 1.42, y1: 1.5 };
export function headScaleOffset(q, H = HEAD) {
  const w = sstep(H.y0, H.y1, q[1]); if (!w) return [0, 0, 0];
  const k = (H.s - 1) * w; return [(q[0] - H.c[0]) * k, (q[1] - H.c[1]) * k, (q[2] - H.c[2]) * k];
}
// A longer, slimmer neck: the trapezius line from the neck to the shoulder tip lowered (up to 1.2 cm)
// and the neck itself narrowed. q: male-space skin point. Returns metres.
function neckOffset(q) {
  const x = q[0], ax = Math.abs(x), y = q[1], z = q[2], d = [0, 0, 0];
  if (y < 1.3 || y > 1.56) return d;
  const yTop = 1.468 - (Math.min(0.2, Math.max(0.08, ax)) - 0.08) * (0.05 / 0.12);
  const trap = sstep(0.055, 0.085, ax) * (1 - sstep(0.15, 0.19, ax)) * sstep(yTop - 0.07, yTop - 0.005, y) * (1 - sstep(0.04, 0.075, Math.abs(z + 0.025)));
  d[1] -= 0.012 * trap;
  const neck = (1 - sstep(0.06, 0.085, ax)) * sstep(1.37, 1.41, y) * (1 - sstep(1.47, 1.51, y));
  d[0] -= x * 0.08 * neck; d[2] -= (z + 0.02) * 0.05 * neck;
  return d;
}

export const skinRegion = (name, x) => { const L = x >= 0; return ARM_RE.test(name) ? (L ? REG.armL : REG.armR) : LEG_RE.test(name) ? (L ? REG.legL : REG.legR) : REG.axial; };

// per-vertex skin offsets (continuous across the skin's many pieces)
export function computeSkinField(parts, fem, skinRegion) {
  let n = 0; for (const p of parts) n += p.mesh.P.length / 3;
  const P = new Float64Array(n * 3), D = new Float64Array(n * 3), B = new Float32Array(n), tris = [], free = new Uint8Array(n), regionOfV = new Uint8Array(n), NN = new Float64Array(n * 3), brow = new Int32Array(n).fill(-1);
  let o = 0, miss = 0;
  for (const p of parts) {
    const M = p.mesh, m = M.P.length / 3;
    for (let k = 0; k < m; k++) {
      const q = [M.P[k * 3], M.P[k * 3 + 1], M.P[k * 3 + 2]];
      const r = fem.T.dispAt(q, skinRegion(p.name, q[0])) || fem.T.dispAt(q);
      if (!r) miss++;
      for (let a = 0; a < 3; a++) { P[(o + k) * 3 + a] = q[a]; D[(o + k) * 3 + a] = r ? r.d[a] : 0; }
      B[o + k] = r ? r.breast : 0;
      free[o + k] = p.sex === 2 ? 1 : 0; // the female pudendal fill follows its surroundings
      regionOfV[o + k] = skinRegion(p.name, q[0]);
      for (let a = 0; a < 3; a++) NN[(o + k) * 3 + a] = M.N[k * 3 + a];
      if (/^Eyebrow$/.test(p.name)) brow[o + k] = p.side === 'L' ? 0 : 1;
    }
    for (let t = 0; t < M.I.length; t++) tris.push(M.I[t] + o);
    p._fo = o; o += m;
  }
  smoothField(P, D, tris, { free });
  // Hands: the closest-point transfer mixes up fingers (the poses differ), so each hand takes one
  // affine map fitted to its skin's offsets, blended in over the 3 cm before the wrist
  for (const sgn of [1, -1]) {
    const J = fem.joints, el = [J.elbow[0] * sgn, J.elbow[1], J.elbow[2]], wr = [J.wrist[0] * sgn, J.wrist[1], J.wrist[2]];
    const ax = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]], L = Math.hypot(...ax); for (let a = 0; a < 3; a++) ax[a] /= L;
    const wOf = (i) => { const t = (P[i * 3] - el[0]) * ax[0] + (P[i * 3 + 1] - el[1]) * ax[1] + (P[i * 3 + 2] - el[2]) * ax[2] - L; const u = Math.min(1, Math.max(0, (t + 0.03) / 0.03)); return u * u * (3 - 2 * u); };
    const reg = sgn > 0 ? REG.armL : REG.armR, idx = [];
    for (let i = 0; i < n; i++) if (regionOfV[i] === reg && wOf(i) > 0) idx.push(i);
    // least squares: [x y z 1] * M (4x3) = x + d, over the hand proper
    const AtA = Array.from({ length: 4 }, () => new Float64Array(4)), AtB = Array.from({ length: 4 }, () => new Float64Array(3));
    let used = 0;
    for (const i of idx) { if (wOf(i) < 1) continue; const r = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 1]; for (let a = 0; a < 4; a++) { for (let b = 0; b < 4; b++) AtA[a][b] += r[a] * r[b]; for (let c = 0; c < 3; c++) AtB[a][c] += r[a] * (P[i * 3 + c] + D[i * 3 + c]); } used++; }
    if (used < 50) continue;
    // solve 4x4 (Gauss-Jordan) for the 3 columns
    const Mx = AtA.map((row, a) => [...row, ...AtB[a]]);
    for (let c = 0; c < 4; c++) { let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[piv][c])) piv = r; [Mx[c], Mx[piv]] = [Mx[piv], Mx[c]]; const d = Mx[c][c]; for (let k = 0; k < 7; k++) Mx[c][k] /= d; for (let r = 0; r < 4; r++) if (r !== c) { const f = Mx[r][c]; for (let k = 0; k < 7; k++) Mx[r][k] -= f * Mx[c][k]; } }
    const Aff = (q) => [0, 1, 2].map((c) => q[0] * Mx[0][4 + c] + q[1] * Mx[1][4 + c] + q[2] * Mx[2][4 + c] + Mx[3][4 + c]);
    for (const i of idx) { const w = wOf(i), q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], t = Aff(q); for (let a = 0; a < 3; a++) D[i * 3 + a] = D[i * 3 + a] * (1 - w) + (t[a] - q[a]) * w; }
    if (!parts.handLogged) console.log(`hand ${sgn > 0 ? 'L' : 'R'}: affine offsets on ${idx.length} skin vertices (fit to ${used})`);
  }
  // female face touches and thinner, arched eyebrows (face.mjs)
  {
    const FF = fem.face, line = new Map();
    for (let i = 0; i < n; i++) if (brow[i] >= 0) { const key = brow[i] + ':' + Math.round(P[i * 3] / 0.003); const e = line.get(key) || [0, 0]; e[0] += P[i * 3 + 1]; e[1]++; line.set(key, e); }
    for (let i = 0; i < n; i++) {
      const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      if (q[1] < 1.4) continue;
      const d = femaleFaceOffset(q, [NN[i * 3], NN[i * 3 + 1], NN[i * 3 + 2]], FF);
      if (brow[i] >= 0) { const e = line.get(brow[i] + ':' + Math.round(q[0] / 0.003)); const b = femaleBrowOffset(q, e[0] / e[1], FF); for (let a = 0; a < 3; a++) d[a] += b[a]; }
      for (let a = 0; a < 3; a++) D[i * 3 + a] += d[a];
    }
  }
  // longer, slimmer neck; a slightly narrower waist (the trunk only: the arms hang beside it)
  const cinch = fem.shape?.waist ?? 0.05;
  for (let i = 0; i < n; i++) {
    if (free[i]) continue;
    const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
    if (fem.shape?.neck !== false) { const o2 = neckOffset(q); for (let a = 0; a < 3; a++) D[i * 3 + a] += o2[a]; }
    if (cinch && regionOfV[i] === REG.axial) { const g = Math.exp(-(((q[1] - 1.14) / 0.075) ** 2)); D[i * 3] -= (q[0] + D[i * 3]) * cinch * g; D[i * 3 + 2] -= (q[2] + D[i * 3 + 2] - 0.01) * cinch * 0.4 * g; }
  }
  // contour: the male model's muscle relief smoothed out of the female body (not the head, hands,
  // feet, breasts, navel, genitals or the buttock cleft)
  if (fem.shape?.relief !== false) {
    const J = fem.joints, ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const W = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], ax = Math.abs(x), r = regionOfV[i];
      if (free[i]) continue;
      let w = 1 - ss(1.43, 1.47, y);                                                    // head
      if (r === REG.armL || r === REG.armR) {                                           // hands
        const sg = r === REG.armL ? 1 : -1, el = [J.elbow[0] * sg, J.elbow[1], J.elbow[2]], wr = [J.wrist[0] * sg, J.wrist[1], J.wrist[2]];
        const a = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]], L = Math.hypot(...a), t = ((x - el[0]) * a[0] + (y - el[1]) * a[1] + (z - el[2]) * a[2]) / L - L;
        w *= 1 - ss(-0.05, -0.015, t);
      }
      if (r === REG.legL || r === REG.legR) w *= ss(J.ankle[1] + 0.03, J.ankle[1] + 0.1, y); // feet
      w *= 1 - ss(0.02, 0.25, B[i]);                                                     // breasts
      w *= ss(0.018, 0.03, Math.hypot(x, y - 1.023, z - 0.11));                          // navel
      w *= 1 - (1 - ss(0.075, 0.1, ax)) * ss(0.64, 0.68, y) * (1 - ss(0.9, 0.94, y)) * ss(-0.05, -0.02, z); // genitals
      w *= 1 - (1 - ss(0.03, 0.045, ax)) * ss(0.68, 0.72, y) * (1 - ss(0.92, 0.96, y)) * (1 - ss(-0.07, -0.05, z)); // buttock cleft
      W[i] = w * (fem.shape?.reliefAmount ?? 1);
    }
    const limbW = limbContour(P, D, regionOfV, J, fem.shape?.limbs);
    for (let i = 0; i < n; i++) W[i] *= 1 - limbW[i];
    const piece = new Int32Array(n); parts.forEach((p, k) => piece.fill(k, p._fo, p._fo + p.mesh.P.length / 3));
    smoothRelief(P, D, tris, W, piece, fem.shape?.reliefOpts);
  }
  // larger head
  if (fem.shape?.head !== false) for (let i = 0; i < n; i++) { const h = headScaleOffset([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]); for (let a = 0; a < 3; a++) D[i * 3 + a] += h[a]; }
  // vertices that coincide (within 0.1 mm) in the male skin share one offset, so no piece separates
  {
    const C = 0.0002, G = new Map(), par = Int32Array.from({ length: n }, (_, i) => i), find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
    for (let i = 0; i < n; i++) { const k = Math.floor(P[i * 3] / C) + ',' + Math.floor(P[i * 3 + 1] / C) + ',' + Math.floor(P[i * 3 + 2] / C); (G.get(k) || G.set(k, []).get(k)).push(i); }
    for (let i = 0; i < n; i++) { const gx = Math.floor(P[i * 3] / C), gy = Math.floor(P[i * 3 + 1] / C), gz = Math.floor(P[i * 3 + 2] / C); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of G.get((gx + a) + ',' + (gy + b) + ',' + (gz + c)) || []) if (j > i && Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]) < 1e-4) { const x = find(i), y = find(j); if (x !== y) par[x] = y; } }
    const acc = new Map(); for (let i = 0; i < n; i++) { const r = find(i); if (r === i && par[i] === i) { /* root */ } const e = acc.get(r) || [0, 0, 0, 0]; e[0] += D[i * 3]; e[1] += D[i * 3 + 1]; e[2] += D[i * 3 + 2]; e[3]++; acc.set(r, e); }
    for (let i = 0; i < n; i++) { const e = acc.get(find(i)); if (e[3] > 1) for (let a = 0; a < 3; a++) D[i * 3 + a] = e[a] / e[3]; }
  }
  for (const p of parts) { const m = p.mesh.P.length / 3; p.femD = Float32Array.from(D.subarray(p._fo * 3, (p._fo + m) * 3)); p.femB = B.slice(p._fo, p._fo + m); }
  if (miss) console.log(`  ${miss} skin vertices without a MakeHuman match`);
}

// Taubin smoothing (alternating shrink / inflate steps, so the body keeps its volume) of the female
// surface P + D over the welded skin, each vertex moving by its weight W; writes D back
function smoothRelief(P, D, tris, W, piece, { iters = 60, lambda = 0.5, mu = -0.53 } = {}) {
  const n = P.length / 3, key = new Map(), weld = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 2e4) + ',' + Math.round(P[i * 3 + 1] * 2e4) + ',' + Math.round(P[i * 3 + 2] * 2e4); let w = key.get(k); if (w === undefined) { w = key.size; key.set(k, w); } weld[i] = w; }
  const m = key.size, X = new Float64Array(m * 3), cnt = new Float64Array(m), wt = new Float64Array(m);
  for (let i = 0; i < n; i++) { const w = weld[i]; for (let a = 0; a < 3; a++) X[w * 3 + a] += P[i * 3 + a] + D[i * 3 + a]; wt[w] += W[i]; cnt[w]++; }
  for (let w = 0; w < m; w++) { for (let a = 0; a < 3; a++) X[w * 3 + a] /= cnt[w]; wt[w] /= cnt[w]; }
  const adj = Array.from({ length: m }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) { const a = weld[tris[t]], b = weld[tris[t + 1]], c = weld[tris[t + 2]]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
  // open edges: a seam where two pieces meet without shared vertices is bridged (each border vertex
  // linked to the nearest border vertex of another piece within 4 mm); real openings stay put,
  // easing in over 2.5 cm
  const ec = new Map();
  for (let t = 0; t < tris.length; t += 3) for (const [a, b] of [[tris[t], tris[t + 1]], [tris[t + 1], tris[t + 2]], [tris[t + 2], tris[t]]]) { const u = weld[a], v = weld[b], k = u < v ? u * m + v : v * m + u; ec.set(k, (ec.get(k) || 0) + 1); }
  const bnd = []; for (const [k, c] of ec) if (c === 1) bnd.push(Math.floor(k / m), k % m);
  const Pw = new Float64Array(m * 3), pc = new Int32Array(m); for (let i = 0; i < n; i++) { for (let a = 0; a < 3; a++) Pw[weld[i] * 3 + a] = P[i * 3 + a]; pc[weld[i]] = piece[i]; }
  const ball = [...new Set(bnd)], BG = new Map(), BC = 0.004;
  for (const w of ball) { const k = Math.floor(Pw[w * 3] / BC) + ',' + Math.floor(Pw[w * 3 + 1] / BC) + ',' + Math.floor(Pw[w * 3 + 2] / BC); (BG.get(k) || BG.set(k, []).get(k)).push(w); }
  const linked = new Set();
  for (const w of ball) {
    let best = -1, bd = 0.004; const gx = Math.floor(Pw[w * 3] / BC), gy = Math.floor(Pw[w * 3 + 1] / BC), gz = Math.floor(Pw[w * 3 + 2] / BC);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const u of BG.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) { if (pc[u] === pc[w]) continue; const d = Math.hypot(Pw[u * 3] - Pw[w * 3], Pw[u * 3 + 1] - Pw[w * 3 + 1], Pw[u * 3 + 2] - Pw[w * 3 + 2]); if (d < bd) { bd = d; best = u; } }
    if (best >= 0) { adj[w].add(best); adj[best].add(w); linked.add(w); linked.add(best); }
  }
  // a border with another piece's skin within 1 cm is a seam (tucked or touching), not an opening
  const AG = new Map(), AC = 0.01; for (let w = 0; w < m; w++) { const k = Math.floor(Pw[w * 3] / AC) + ',' + Math.floor(Pw[w * 3 + 1] / AC) + ',' + Math.floor(Pw[w * 3 + 2] / AC); (AG.get(k) || AG.set(k, []).get(k)).push(w); }
  for (const w of ball) {
    if (linked.has(w)) continue;
    const gx = Math.floor(Pw[w * 3] / AC), gy = Math.floor(Pw[w * 3 + 1] / AC), gz = Math.floor(Pw[w * 3 + 2] / AC); let hit = false;
    for (let i = -1; i <= 1 && !hit; i++) for (let j = -1; j <= 1 && !hit; j++) for (let k = -1; k <= 1 && !hit; k++) for (const u of AG.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) if (pc[u] !== pc[w] && Math.hypot(Pw[u * 3] - Pw[w * 3], Pw[u * 3 + 1] - Pw[w * 3 + 1], Pw[u * 3 + 2] - Pw[w * 3 + 2]) < 0.01) { hit = true; break; }
    if (hit) linked.add(w);
  }
  const bset = ball.filter((w) => !linked.has(w));
  for (let w = 0; w < m; w++) {
    if (!wt[w]) continue;
    let d = Infinity; for (const b of bset) { const dx = Pw[b * 3] - Pw[w * 3]; if (dx > d || -dx > d) continue; d = Math.min(d, Math.hypot(dx, Pw[b * 3 + 1] - Pw[w * 3 + 1], Pw[b * 3 + 2] - Pw[w * 3 + 2])); }
    const t = Math.min(1, Math.max(0, (d - 0.003) / 0.022)); wt[w] *= t * t * (3 - 2 * t);
  }
  const nb = adj.map((s) => Int32Array.from(s)), act = []; for (let w = 0; w < m; w++) if (wt[w] > 0 && nb[w].length) act.push(w);
  const step = (f) => {
    const Y = Float64Array.from(X);
    for (const w of act) { const L = nb[w], k = f * wt[w] / L.length; let s0 = 0, s1 = 0, s2 = 0; for (const j of L) { s0 += X[j * 3]; s1 += X[j * 3 + 1]; s2 += X[j * 3 + 2]; } Y[w * 3] += k * (s0 - L.length * X[w * 3]); Y[w * 3 + 1] += k * (s1 - L.length * X[w * 3 + 1]); Y[w * 3 + 2] += k * (s2 - L.length * X[w * 3 + 2]); }
    X.set(Y);
  };
  const X0 = Float64Array.from(X);
  for (let it = 0; it < iters; it++) { step(lambda); step(mu); }
  // near seams, each vertex takes the average move of everything within 8 mm (both sides of the
  // seam), so pieces that only touch move together and no gap opens between them
  if (linked.size) {
    const H = new Map(), HC = 0.008, key3 = (x, y, z) => Math.floor(x / HC) + ',' + Math.floor(y / HC) + ',' + Math.floor(z / HC);
    for (let w = 0; w < m; w++) (H.get(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2])) || H.set(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2]), []).get(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2]))).push(w);
    const LG = new Map(); for (const w of linked) (LG.get(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2])) || LG.set(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2]), []).get(key3(Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2]))).push(w);
    const near = (h, x, y, z, r, fn) => { const gx = Math.floor(x / HC), gy = Math.floor(y / HC), gz = Math.floor(z / HC), R = Math.ceil(r / HC); for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k++) for (const u of h.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) fn(u); };
    const Y = Float64Array.from(X);
    for (let w = 0; w < m; w++) {
      let ds = Infinity; near(LG, Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2], 0.024, (u) => { ds = Math.min(ds, Math.hypot(Pw[u * 3] - Pw[w * 3], Pw[u * 3 + 1] - Pw[w * 3 + 1], Pw[u * 3 + 2] - Pw[w * 3 + 2])); });
      if (ds > 0.022) continue;
      let sw = 0; const acc = [0, 0, 0];
      near(H, Pw[w * 3], Pw[w * 3 + 1], Pw[w * 3 + 2], 0.012, (u) => { const d = Math.hypot(Pw[u * 3] - Pw[w * 3], Pw[u * 3 + 1] - Pw[w * 3 + 1], Pw[u * 3 + 2] - Pw[w * 3 + 2]); if (d > 0.012) return; const g = Math.exp(-((d / 0.006) ** 2)); sw += g; for (let a = 0; a < 3; a++) acc[a] += g * (X[u * 3 + a] - X0[u * 3 + a]); });
      const t = 1 - Math.min(1, Math.max(0, (ds - 0.006) / 0.016)), k = t * t * (3 - 2 * t);
      for (let a = 0; a < 3; a++) Y[w * 3 + a] = X0[w * 3 + a] + (X[w * 3 + a] - X0[w * 3 + a]) * (1 - k) + (acc[a] / sw) * k;
    }
    X.set(Y);
  }
  for (let i = 0; i < n; i++) { const w = weld[i]; for (let a = 0; a < 3; a++) D[i * 3 + a] = X[w * 3 + a] - P[i * 3 + a]; }
}

// Arms (and optionally legs): the radius around each limb's axis (male space) is smoothed over a window along the
// limb and around it, which takes out muscle bulges and grooves but keeps the limb's thickness and
// taper; the female limb is scaled about its own centre line by that ratio (times a slimming
// profile). Fades out where the limb meets the trunk and before the hand / foot.
// Returns each vertex's weight (so the trunk pass can leave the limbs alone).
function limbContour(P, D, regionOfV, J, opts = {}) {
  const n = P.length / 3, out = new Float64Array(n);
  const { sigS = 0.05, sigT = 0.5, armSlim = [[0, 1], [0.08, 0.95], [0.16, 0.93], [0.27, 0.97], [0.36, 0.95], [0.5, 1]], legSlim = [[0, 1], [0.15, 0.98], [0.42, 1], [0.6, 0.97], [0.8, 1]] } = opts;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const prof = (tab, s) => { if (s <= tab[0][0]) return tab[0][1]; for (let k = 1; k < tab.length; k++) if (s <= tab[k][0]) { const [s0, v0] = tab[k - 1], [s1, v1] = tab[k]; return v0 + (v1 - v0) * ss(0, 1, (s - s0) / (s1 - s0)); } return tab[tab.length - 1][1]; };
  // trunk vertices (for the fade where a limb joins it)
  const G = new Map(), GC = 0.02;
  for (let i = 0; i < n; i++) if (regionOfV[i] === REG.axial) { const k = Math.floor(P[i * 3] / GC) + ',' + Math.floor(P[i * 3 + 1] / GC) + ',' + Math.floor(P[i * 3 + 2] / GC); (G.get(k) || G.set(k, []).get(k)).push(i); }
  const trunkDist = (q) => { let d = Infinity; const gx = Math.floor(q[0] / GC), gy = Math.floor(q[1] / GC), gz = Math.floor(q[2] / GC); for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) for (let c = -4; c <= 4; c++) for (const i of G.get((gx + a) + ',' + (gy + b) + ',' + (gz + c)) || []) d = Math.min(d, Math.hypot(P[i * 3] - q[0], P[i * 3 + 1] - q[1], P[i * 3 + 2] - q[2])); return d; };
  const limbs = [];
  for (const sg of [1, -1]) {
    const m = (p) => [p[0] * sg, p[1], p[2]];
    limbs.push({ r: sg > 0 ? REG.armL : REG.armR, A: m(J.shoulder), C: m(J.wrist), slim: armSlim, end: 0.015 });
    if (opts.legs) limbs.push({ r: sg > 0 ? REG.legL : REG.legR, A: m(J.hip), C: m(J.ankle), slim: legSlim, end: -0.04 }); // (the legs are smooth enough in the male; the trunk pass covers them)
  }
  for (const L of limbs) {
    const idx = []; for (let i = 0; i < n; i++) if (regionOfV[i] === L.r) idx.push(i);
    const u = [L.C[0] - L.A[0], L.C[1] - L.A[1], L.C[2] - L.A[2]], len = Math.hypot(...u); for (let a = 0; a < 3; a++) u[a] /= len;
    let e1 = [0, 0, 1]; const dz = u[2]; e1 = [e1[0] - u[0] * dz, e1[1] - u[1] * dz, e1[2] - u[2] * dz]; const l1 = Math.hypot(...e1); e1 = e1.map((v) => v / l1);
    const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
    const sOf = (q) => (q[0] - L.A[0]) * u[0] + (q[1] - L.A[1]) * u[1] + (q[2] - L.A[2]) * u[2];
    // slice centres (male and female), 1 cm bins smoothed along the limb
    const B0 = -0.15, NB = Math.ceil((len + 0.35) / 0.01), cm = new Float64Array(NB * 3), cf = new Float64Array(NB * 3), cnt = new Float64Array(NB);
    const bin = (s) => Math.min(NB - 1, Math.max(0, Math.round((s - B0) / 0.01)));
    for (const i of idx) { const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], b = bin(sOf(q)); for (let a = 0; a < 3; a++) { cm[b * 3 + a] += q[a]; cf[b * 3 + a] += q[a] + D[i * 3 + a]; } cnt[b]++; }
    const smoothC = (c) => { const o = new Float64Array(NB * 3); for (let b = 0; b < NB; b++) { let sw = 0; for (let k = -4; k <= 4; k++) { const bb = b + k; if (bb < 0 || bb >= NB || !cnt[bb]) continue; const w = Math.exp(-(k * k) / 4.5) * cnt[bb]; sw += w; for (let a = 0; a < 3; a++) o[b * 3 + a] += w * c[bb * 3 + a] / cnt[bb]; } if (sw) for (let a = 0; a < 3; a++) o[b * 3 + a] /= sw; } return o; };
    const CM = smoothC(cm), CF = smoothC(cf);
    const at = (C, s) => { const f = Math.min(NB - 1.001, Math.max(0, (s - B0) / 0.01)), b = Math.floor(f), t = f - b; return [0, 1, 2].map((a) => C[b * 3 + a] * (1 - t) + C[(b + 1) * 3 + a] * t); };
    // cylindrical coordinates in male space
    const S = new Float64Array(idx.length), TH = new Float64Array(idx.length), RH = new Float64Array(idx.length);
    idx.forEach((i, k) => {
      const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], s = sOf(q), c = at(CM, s), d = [q[0] - c[0], q[1] - c[1], q[2] - c[2]], h = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
      const pp = [d[0] - u[0] * h, d[1] - u[1] * h, d[2] - u[2] * h];
      S[k] = s; RH[k] = Math.hypot(...pp); TH[k] = Math.atan2(pp[0] * e2[0] + pp[1] * e2[1] + pp[2] * e2[2], pp[0] * e1[0] + pp[1] * e1[1] + pp[2] * e1[2]);
    });
    // where the limb's skin meets the trunk's, per 30-degree sector around the limb (the fade runs
    // along the limb from there, so an arm hanging against the chest still counts as arm)
    // (the seam: limb vertices shared with the trunk; the nearest to the limb's root in each sector,
    // since an arm also touches the chest further down)
    const NS = 12, sb = new Float64Array(NS).fill(Infinity);
    idx.forEach((i, k) => { if (trunkDist([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]) > 0.002) return; const sc = Math.floor(((TH[k] + Math.PI) / (2 * Math.PI)) * NS) % NS; sb[sc] = Math.min(sb[sc], S[k]); });
    const known = [...sb].filter(Number.isFinite), sbMax = known.length ? Math.max(...known) : 0;
    for (let k = 0; k < NS; k++) if (!Number.isFinite(sb[k])) sb[k] = sbMax;
    const sbs = sb.map((_, k) => (sb[(k + NS - 1) % NS] + 2 * sb[k] + sb[(k + 1) % NS]) / 4);
    const ring = sbMax; // below the lowest seam point the limb is a whole tube (its centre line is sound)
    const rootAt = (th) => { const f = ((th + Math.PI) / (2 * Math.PI)) * NS - 0.5, k0 = Math.floor(f), t = f - k0; return sbs[((k0 % NS) + NS) % NS] * (1 - t) + sbs[(((k0 + 1) % NS) + NS) % NS] * t; };
    // smoothed radius over (s, angle)
    const grid = new Map(), cs = sigS, ct = sigT;
    idx.forEach((_, k) => { const key = Math.floor(S[k] / cs) + ',' + Math.floor((TH[k] + Math.PI) / ct); (grid.get(key) || grid.set(key, []).get(key)).push(k); });
    const nT = Math.ceil(2 * Math.PI / ct);
    idx.forEach((i, k) => {
      const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      // fades: where the limb joins the trunk, and before the hand / foot
      const tEnd = S[k] - len;
      let w = ss(ring, ring + 0.05, S[k]) * ss(0.0005, 0.012, trunkDist(q)) * (1 - ss(-0.06 + L.end, -0.02 + L.end, tEnd));
      if (!(w > 0) || RH[k] < 1e-4) return;
      const gs = Math.floor(S[k] / cs), gt = Math.floor((TH[k] + Math.PI) / ct);
      let sw = 0, sr = 0;
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (const j of grid.get((gs + a) + ',' + (((gt + b) % nT + nT) % nT)) || []) {
        let dt = Math.abs(TH[j] - TH[k]); if (dt > Math.PI) dt = 2 * Math.PI - dt;
        const ww = Math.exp(-(((S[j] - S[k]) / sigS) ** 2) - ((dt / sigT) ** 2)); sw += ww; sr += ww * RH[j];
      }
      const f = Math.min(1.3, Math.max(0.7, sr / sw / RH[k])) * prof(L.slim, S[k]);
      const c = at(CF, S[k]), X = [P[i * 3] + D[i * 3], P[i * 3 + 1] + D[i * 3 + 1], P[i * 3 + 2] + D[i * 3 + 2]], d = [X[0] - c[0], X[1] - c[1], X[2] - c[2]], h = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
      const g = 1 + w * (f - 1);
      for (let a = 0; a < 3; a++) D[i * 3 + a] += (d[a] - u[a] * h) * (g - 1);
      out[i] = w;
    });
  }
  return out;
}
