// Female body shape from MakeHuman (CC0 base mesh and targets, makehumancommunity.org).
//
// MakeHuman's average adult male and female share one mesh, so their per-vertex difference is a
// realistic "male -> female" body change (narrower shoulders and ribcage, waist, wider pelvis and
// hips, gluteofemoral fat, breasts, softer face and neck). We pose both into this model's posture,
// fit the male non-rigidly onto our male skin, and read the difference off at our skin points.
import fs from 'node:fs';

const MH = process.env.MH_DATA || new URL('./makehuman/data/', import.meta.url).pathname;
const BASE = process.env.MH_BASE || MH + '3dobjs/base.obj';

function loadObj(path) {
  const V = [], groups = {}; let g = null;
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('v ')) { const [, x, y, z] = line.split(/\s+/); V.push([+x, +y, +z]); }
    else if (line.startsWith('g ')) g = line.slice(2).trim();
    else if (line.startsWith('f ')) (groups[g] || (groups[g] = [])).push(line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1));
  }
  return { V, groups };
}
function loadTarget(rel) {
  const d = new Map();
  for (const line of fs.readFileSync(MH + 'targets/' + rel, 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const [i, x, y, z] = line.trim().split(/\s+/); d.set(+i, [+x, +y, +z]);
  }
  return d;
}
function applyTargets(V, list) {
  const out = V.map((v) => v.slice());
  for (const [rel, w] of list) { if (!w) continue; for (const [i, d] of loadTarget(rel)) { out[i][0] += d[0] * w; out[i][1] += d[1] * w; out[i][2] += d[2] * w; } }
  return out;
}
const ETH = ['african', 'asian', 'caucasian'];
// MakeHuman macro blend: equal ethnic mix; age in years (25 = "young", 90 = "old")
function genderList(g, age) { const o = Math.max(0, Math.min(1, (age - 25) / 65)); return ETH.flatMap((e) => [[`macrodetails/${e}-${g}-young.target`, (1 - o) / 3], [`macrodetails/${e}-${g}-old.target`, o / 3]]); }
// breast size / firmness sliders (0..1, 0.5 = average) as MakeHuman blends its cup/firmness targets
function breastList(size, firm) {
  const cup = size > 0.5 ? ['maxcup', (size - 0.5) * 2] : ['mincup', (0.5 - size) * 2], fm = firm > 0.5 ? ['maxfirmness', (firm - 0.5) * 2] : ['minfirmness', (0.5 - firm) * 2];
  const pre = 'breast/female-young-averagemuscle-averageweight-';
  return [[`${pre}${cup[0]}-averagefirmness.target`, cup[1] * (1 - fm[1])], [`${pre}${cup[0]}-${fm[0]}.target`, cup[1] * fm[1]], [`${pre}averagecup-${fm[0]}.target`, (1 - cup[1]) * fm[1]]];
}

// body build as MakeHuman's macro sliders blend it (0..1, 0.5 = average): muscle and weight pick
// among its universal targets bilinearly; proportions above 0.5 blend in its "ideal proportions"
function bodyList(muscle, weight, proportions) {
  const lv = (v, nm) => (v < 0.5 ? [[`min${nm}`, (0.5 - v) * 2], [`average${nm}`, 1 - (0.5 - v) * 2]] : [[`average${nm}`, 1 - (v - 0.5) * 2], [`max${nm}`, (v - 0.5) * 2]]);
  const pw = Math.max(0, (proportions - 0.5) * 2), out = [];
  for (const [m, wm] of lv(muscle, 'muscle')) for (const [w, ww] of lv(weight, 'weight')) {
    if (!(wm * ww)) continue;
    if (m !== 'averagemuscle' || w !== 'averageweight') out.push([`macrodetails/universal-female-young-${m}-${w}.target`, wm * ww]);
    if (pw) out.push([`macrodetails/proportions/female-young-${m}-${w}-idealproportions.target`, wm * ww * pw]);
  }
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// rotation matrix taking unit vector a onto unit vector b
function rotBetween(a, b) {
  a = norm(a); b = norm(b);
  const v = cross(a, b), c = dot(a, b), s = len(v);
  if (s < 1e-9) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const k = mul(v, 1 / s), K = [[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]];
  const KK = [0, 1, 2].map((i) => [0, 1, 2].map((j) => K[i][0] * K[0][j] + K[i][1] * K[1][j] + K[i][2] * K[2][j]));
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) + K[i][j] * s + KK[i][j] * (1 - c)));
}
const mv = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];

// Region classes, so arms are only matched with arms, legs with legs: 0 axial, 1 armL, 2 armR, 3 legL, 4 legR
export const REG = { axial: 0, armL: 1, armR: 2, legL: 3, legR: 4 };

class Grid {
  constructor(cell) { this.c = cell; this.m = new Map(); }
  key(x, y, z) { return Math.floor(x / this.c) + ',' + Math.floor(y / this.c) + ',' + Math.floor(z / this.c); }
  add(p, v) { const k = this.key(p[0], p[1], p[2]); (this.m.get(k) || this.m.set(k, []).get(k)).push(v); }
  near(p, r, fn) { const c = this.c, n = Math.ceil(r / c), gx = Math.floor(p[0] / c), gy = Math.floor(p[1] / c), gz = Math.floor(p[2] / c); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) { const a = this.m.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)); if (a) for (const v of a) fn(v); } }
}

// closest point on triangle (Ericson)
function closestOnTri(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return [a, 1, 0, 0];
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return [b, 0, 1, 0];
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [add(a, mul(ab, v)), 1 - v, v, 0]; }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return [c, 0, 0, 1];
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [add(a, mul(ac, w)), 1 - w, 0, w]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return [add(b, mul(sub(c, b), w)), 0, 1 - w, w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return [add(a, add(mul(ab, v), mul(ac, w))), 1 - v - w, v, w];
}

/**
 * our: { joints: {shoulder, elbow, wrist, hip, knee, ankle} (left side, metres),
 *        skin: { P: [[x,y,z]], N: [[nx,ny,nz]], R: [region] } (male skin samples), height }
 * opts: female age, breast size/firmness, weight, height ratio
 */
export function makeFemaleTransfer(our, opts = {}) {
  const { age = 30, breastSize = 0.68, breastFirmness = 0.42, weight = 0.56, muscle = 0.5, proportions = 0.5, heightRatio = 0.94, breastFrom = null, extra = [], log = console.log } = opts;
  const { V, groups } = loadObj(BASE);
  const quads = groups.body;
  const bodySet = new Set(quads.flat());
  const ids = [...bodySet].sort((a, b) => a - b);
  const rig = JSON.parse(fs.readFileSync(MH + 'rigs/default.mhskel', 'utf8'));
  const W = JSON.parse(fs.readFileSync(MH + 'rigs/default_weights.mhw', 'utf8')).weights;
  const chainW = (re) => { const w = new Float64Array(V.length); for (const [b, list] of Object.entries(W)) if (re.test(b)) for (const [i, x] of list) w[i] += x; return w; };
  const wArm = { L: chainW(/^(upperarm0[12]|lowerarm0[12]|wrist|metacarpal\d|finger\d-\d)\.L$/), R: chainW(/^(upperarm0[12]|lowerarm0[12]|wrist|metacarpal\d|finger\d-\d)\.R$/) };
  const wFore = { L: chainW(/^(lowerarm0[12]|wrist|metacarpal\d|finger\d-\d)\.L$/), R: chainW(/^(lowerarm0[12]|wrist|metacarpal\d|finger\d-\d)\.R$/) };
  const wLeg = { L: chainW(/^(upperleg0[12]|lowerleg0[12]|foot|toe\d-\d)\.L$/), R: chainW(/^(upperleg0[12]|lowerleg0[12]|foot|toe\d-\d)\.R$/) };
  const wShin = { L: chainW(/^(lowerleg0[12]|foot|toe\d-\d)\.L$/), R: chainW(/^(lowerleg0[12]|foot|toe\d-\d)\.R$/) };
  const wBreast = chainW(/^breast\.[LR]$/);
  const joint = (P, name) => { const vs = rig.joints[name]; const c = [0, 0, 0]; for (const i of vs) for (let a = 0; a < 3; a++) c[a] += P[i][a] / vs.length; return c; };

  // shapes
  const M = applyTargets(V, genderList('male', 25));
  const female = (b, more = []) => applyTargets(V, [...genderList('female', age), ...breastList(breastSize, breastFirmness), ...bodyList(b.muscle, b.weight, b.proportions), ...more]);
  // extra regional modifiers ([target, weight]; "armslegs/*-..." means both sides)
  const extras = extra.flatMap(([rel, w]) => (rel.includes('/*-') ? [[rel.replace('/*-', '/l-'), w], [rel.replace('/*-', '/r-'), w]] : [[rel, w]]));
  let F = female({ muscle, weight, proportions }, extras);
  // breasts kept as they are in another build (breastFrom): blended in by MakeHuman's breast weights
  if (breastFrom) {
    const F0 = female({ muscle: 0.5, proportions: 0.5, ...breastFrom });
    for (const i of ids) { const t = Math.min(1, Math.max(0, (wBreast[i] - 0.05) / 0.35)), k = t * t * (3 - 2 * t); if (k > 0) for (let a = 0; a < 3; a++) F[i][a] += (F0[i][a] - F[i][a]) * k; }
  }
  const heightOf = (P) => { let mn = Infinity, mx = -Infinity; for (const i of ids) { mn = Math.min(mn, P[i][1]); mx = Math.max(mx, P[i][1]); } return mx - mn; };
  // MakeHuman's average woman is ~8% shorter; nudge to the requested ratio with its height target
  const h0 = heightOf(F), hM = heightOf(M);
  const hT = loadTarget('macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target');
  const F1 = F.map((v) => v.slice()); for (const [i, d] of hT) { F1[i][0] += d[0]; F1[i][1] += d[1]; F1[i][2] += d[2]; }
  const hw = Math.max(0, Math.min(1, (heightRatio * hM - h0) / (heightOf(F1) - h0)));
  F = applyTargets(F, [['macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target', hw]]);
  log(`makehuman: male ${hM.toFixed(2)} dm, female ${heightOf(F).toFixed(2)} dm (height target ${hw.toFixed(2)}), age ${age}, breast ${breastSize}/${breastFirmness}, muscle ${muscle}, weight ${weight}, proportions ${proportions}`);

  // similarity transform male -> our space: scale by height, feet on the floor, centred, depth by hips+shoulders
  const s = our.height / hM;
  let minY = Infinity; for (const i of ids) minY = Math.min(minY, M[i][1]);
  const toOur = (p) => [p[0] * s, (p[1] - minY) * s, p[2] * s];
  let Mo = M.map(toOur), Fo = F.map(toOur);
  const jMid = (P) => mul(add(add(joint(P, 'upperleg01.L____head'), joint(P, 'upperleg01.R____head')), add(joint(P, 'upperarm01.L____head'), joint(P, 'upperarm01.R____head'))), 0.25);
  const ourMid = mul(add(add(our.joints.hip, [-our.joints.hip[0], our.joints.hip[1], our.joints.hip[2]]), add(our.joints.shoulder, [-our.joints.shoulder[0], our.joints.shoulder[1], our.joints.shoulder[2]])), 0.25);
  const dz = ourMid[2] - jMid(Mo)[2];
  Mo = Mo.map((p) => [p[0], p[1], p[2] + dz]); Fo = Fo.map((p) => [p[0], p[1], p[2] + dz]);

  // pose arms and legs to our posture (same rotations for both shapes, each about its own joints)
  const poseLimb = (P, Q, side, wUp, wLow, jA, jB, jC, oA, oB, oC) => {
    const sg = side === 'L' ? 1 : -1, mir = (q) => [q[0] * sg, q[1], q[2]];
    const A = joint(P, jA), B = joint(P, jB);
    const R1 = rotBetween(sub(B, A), sub(mir(oB), mir(oA)));
    const B1 = add(A, mv(R1, sub(B, A))), C1 = add(A, mv(R1, sub(joint(P, jC), A)));
    const R2 = rotBetween(sub(C1, B1), sub(mir(oC), mir(oB)));
    for (const X of [P, Q]) {
      const a = joint(X, jA), b = joint(X, jB), b1 = add(a, mv(R1, sub(b, a)));
      for (let i = 0; i < X.length; i++) {
        const w1 = wUp[side][i]; if (w1 <= 0) continue;
        let p = X[i];
        p = add(p, mul(sub(add(a, mv(R1, sub(p, a))), p), w1));
        const w2 = wLow[side][i]; if (w2 > 0) p = add(p, mul(sub(add(b1, mv(R2, sub(p, b1))), p), w2));
        X[i] = p;
      }
    }
  };
  // poseLimb reads joints from the shape it moves, so pose copies and read joints before moving
  const poseBoth = (side) => {
    poseLimb(Mo, Fo, side, wArm, wFore, `upperarm01.${side}____head`, `lowerarm01.${side}____head`, `wrist.${side}____head`, our.joints.shoulder, our.joints.elbow, our.joints.wrist);
    poseLimb(Mo, Fo, side, wLeg, wShin, `upperleg01.${side}____head`, `lowerleg01.${side}____head`, `foot.${side}____head`, our.joints.hip, our.joints.knee, our.joints.ankle);
  };
  poseBoth('L'); poseBoth('R');
  const D = Mo.map((p, i) => sub(Fo[i], p)); // female - male, in our space and pose

  // MakeHuman vertex regions and normals
  const reg = new Uint8Array(V.length), reg2 = new Uint8Array(V.length).fill(255);
  for (const i of ids) {
    reg[i] = wArm.L[i] > 0.5 ? REG.armL : wArm.R[i] > 0.5 ? REG.armR : wLeg.L[i] > 0.5 ? REG.legL : wLeg.R[i] > 0.5 ? REG.legR : REG.axial;
    // transition zones (shoulder, hip/buttock) may match either side of the boundary
    const wl = [[wArm.L[i], REG.armL], [wArm.R[i], REG.armR], [wLeg.L[i], REG.legL], [wLeg.R[i], REG.legR]].find(([w]) => w > 0.2 && w < 0.8);
    if (wl) reg2[i] = reg[i] === REG.axial ? wl[1] : REG.axial;
  }
  const tris = []; for (const q of quads) { tris.push([q[0], q[1], q[2]]); if (q.length === 4) tris.push([q[0], q[2], q[3]]); }
  const nbr = new Map(); for (const q of quads) for (let k = 0; k < q.length; k++) { const a = q[k], b = q[(k + 1) % q.length]; (nbr.get(a) || nbr.set(a, new Set()).get(a)).add(b); (nbr.get(b) || nbr.set(b, new Set()).get(b)).add(a); }
  const normals = (P) => { const n = P.map(() => [0, 0, 0]); for (const [a, b, c] of tris) { const f = cross(sub(P[b], P[a]), sub(P[c], P[a])); for (const v of [a, b, c]) n[v] = add(n[v], f); } return n.map(norm); };

  // non-rigid fit of the posed male onto our male skin (ICP with progressively less smoothing)
  const target = new Grid(0.02);
  our.skin.P.forEach((p, k) => target.add(p, k));
  const X = Mo.map((p) => p.slice());
  const schedule = [[0.12, 40, 0.8], [0.09, 30, 0.8], [0.06, 20, 0.8], [0.045, 12, 0.8], [0.03, 8, 0.85], [0.02, 5, 0.9], [0.014, 3, 0.9], [0.01, 2, 1.0], [0.008, 1, 1.0]];
  for (const [maxD, smooth, gain] of schedule) {
    const nX = normals(X), off = new Map(), wt = new Map();
    let used = 0, err = 0;
    for (const i of ids) {
      let best = -1, bd = maxD * maxD;
      target.near(X[i], maxD, (k) => {
        if (our.skin.R[k] !== reg[i] && our.skin.R[k] !== reg2[i]) return;
        if (dot(our.skin.N[k], nX[i]) < 0.2) return;
        const d = sub(our.skin.P[k], X[i]), d2 = dot(d, d); if (d2 < bd) { bd = d2; best = k; }
      });
      if (best < 0) continue;
      const d = sub(our.skin.P[best], X[i]), nq = our.skin.N[best];
      off.set(i, add(mul(d, 0.4), mul(nq, dot(d, nq) * 0.6))); wt.set(i, 1); used++; err += Math.sqrt(bd);
    }
    // smooth the offsets over the mesh (vertices without a match borrow from neighbours)
    let o = new Map(ids.map((i) => [i, off.get(i) || [0, 0, 0]])), w = new Map(ids.map((i) => [i, wt.get(i) || 0]));
    for (let it = 0; it < smooth; it++) {
      const o2 = new Map(), w2 = new Map();
      for (const i of ids) { let s3 = mul(o.get(i), w.get(i) + 1e-6), sw = w.get(i) + 1e-6; for (const j of nbr.get(i) || []) { if (!bodySet.has(j)) continue; s3 = add(s3, mul(o.get(j), w.get(j))); sw += w.get(j); } o2.set(i, mul(s3, 1 / sw)); w2.set(i, sw / ((nbr.get(i)?.size || 0) + 1)); }
      o = o2; w = w2;
    }
    for (const i of ids) X[i] = add(X[i], mul(o.get(i), gain));
    log(`  fit radius ${(maxD * 100).toFixed(1)} cm: matched ${used}/${ids.length}, mean distance ${(err / Math.max(1, used) * 1000).toFixed(1)} mm`);
  }

  // query structure over the fitted male triangles
  const triGrid = new Grid(0.03);
  tris.forEach((t, k) => { const c = mul(add(add(X[t[0]], X[t[1]]), X[t[2]]), 1 / 3); triGrid.add(c, k); });
  const triReg = tris.map((t) => reg[t[0]]), triReg2 = tris.map((t) => reg2[t[0]]);
  /** female displacement at a male-space skin point (region-restricted closest point on the fitted MakeHuman male) */
  function dispAt(p, region, maxR = 0.06) {
    let best = null, bd = Infinity;
    for (const r of [0.03, maxR]) {
      triGrid.near(p, r, (k) => {
        if (region !== undefined && triReg[k] !== region && triReg2[k] !== region) return;
        const t = tris[k]; const [q, u, v, w] = closestOnTri(p, X[t[0]], X[t[1]], X[t[2]]);
        const d = len(sub(q, p)); if (d < bd) { bd = d; best = [t, u, v, w]; }
      });
      if (best) break;
    }
    if (!best) return null;
    const [t, u, v, w] = best;
    return { d: add(add(mul(D[t[0]], u), mul(D[t[1]], v)), mul(D[t[2]], w)), breast: wBreast[t[0]] * u + wBreast[t[1]] * v + wBreast[t[2]] * w, dist: bd };
  }
  return { dispAt, fitted: X, female: X.map((p, i) => add(p, D[i])), tris, ids, reg, D, breastW: wBreast };
}

/**
 * Make a per-vertex displacement field continuous and smooth over a skin made of many pieces:
 * coincident vertices (piece borders) get one value, then Laplacian smoothing over the welded mesh,
 * with extra smoothing on the head (face features of the two bodies don't line up exactly).
 * P: flat positions, D: flat displacements (modified in place), tris: flat indices into P
 */
export function smoothField(P, D, tris, { iters = 2, headIters = 24, headY = 1.47, free = null, freeIters = 800, log = console.log } = {}) {
  const n = P.length / 3, key = new Map(), weld = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 2e4) + ',' + Math.round(P[i * 3 + 1] * 2e4) + ',' + Math.round(P[i * 3 + 2] * 2e4); let w = key.get(k); if (w === undefined) { w = key.size; key.set(k, w); } weld[i] = w; }
  const m = key.size, acc = new Float64Array(m * 3), cnt = new Float64Array(m), yOf = new Float64Array(m);
  for (let i = 0; i < n; i++) { const w = weld[i]; for (let a = 0; a < 3; a++) acc[w * 3 + a] += D[i * 3 + a]; cnt[w]++; yOf[w] = P[i * 3 + 1]; }
  let F = new Float64Array(m * 3); for (let w = 0; w < m; w++) for (let a = 0; a < 3; a++) F[w * 3 + a] = acc[w * 3 + a] / cnt[w];
  const adj = Array.from({ length: m }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) { const a = weld[tris[t]], b = weld[tris[t + 1]], c = weld[tris[t + 2]]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
  const maxIt = Math.max(iters, headIters);
  for (let it = 0; it < maxIt; it++) {
    const G = new Float64Array(F);
    for (let w = 0; w < m; w++) {
      const head = Math.min(1, Math.max(0, (yOf[w] - headY) / 0.04));
      const active = it < iters ? 1 : head; if (!active || !adj[w].size) continue;
      let s0 = 0, s1 = 0, s2 = 0; for (const j of adj[w]) { s0 += F[j * 3]; s1 += F[j * 3 + 1]; s2 += F[j * 3 + 2]; }
      const k = adj[w].size, a = 0.6 * active;
      G[w * 3] = F[w * 3] * (1 - a) + (s0 / k) * a; G[w * 3 + 1] = F[w * 3 + 1] * (1 - a) + (s1 / k) * a; G[w * 3 + 2] = F[w * 3 + 2] * (1 - a) + (s2 / k) * a;
    }
    F = G;
  }
  // "free" vertices (a filled-in patch) take a harmonic blend of the surrounding skin's offsets
  if (free) {
    const isFree = new Uint8Array(m).fill(1), any = new Uint8Array(m);
    for (let i = 0; i < n; i++) { any[weld[i]] = 1; if (!free[i]) isFree[weld[i]] = 0; }
    const list = []; for (let w = 0; w < m; w++) if (any[w] && isFree[w] && adj[w].size) list.push(w);
    for (let it = 0; it < freeIters; it++) for (const w of list) { let s0 = 0, s1 = 0, s2 = 0; for (const j of adj[w]) { s0 += F[j * 3]; s1 += F[j * 3 + 1]; s2 += F[j * 3 + 2]; } const k = adj[w].size; F[w * 3] = s0 / k; F[w * 3 + 1] = s1 / k; F[w * 3 + 2] = s2 / k; }
    log(`  harmonic fill of ${list.length} patch vertices`);
  }
  for (let i = 0; i < n; i++) { const w = weld[i]; D[i * 3] = F[w * 3]; D[i * 3 + 1] = F[w * 3 + 1]; D[i * 3 + 2] = F[w * 3 + 2]; }
  log(`skin field smoothed: ${n} vertices, ${m} welded`);
}
