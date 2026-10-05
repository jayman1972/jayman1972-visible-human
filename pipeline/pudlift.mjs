// The female pudendal patch fills the hole the male genitals leave, which dips well below the
// crotch. In the female body it is pulled in toward the cleft's axis, onto MakeHuman's female
// crotch. The patch was built as a radius over (x, angle) around that axis in male space
// (female.mjs), so it is moved along those same radial lines: it can't fold.
import { VULVA } from '../app/src/warp.js';

export function liftPatch(patch, MF, MT) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // MakeHuman female triangles around the crotch, with outward normals
  const cand = [];
  for (const t of MT) {
    const a = MF[t[0]], b = MF[t[1]], c = MF[t[2]];
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
    if (Math.abs(cx) < 0.1 && cy > 0.5 && cy < 0.95 && cz > -0.14 && cz < 0.18) { const e1 = sub(b, a), e2 = sub(c, a), n = cross(e1, e2), l = Math.hypot(...n) || 1; cand.push({ a, e1, e2, n: n.map((v) => v / l), cz, cy }); }
  }
  let sgn = 0; for (const t of cand) if (t.cz > 0.08 && t.cy > 0.82) sgn += t.n[2];
  const flip = sgn < 0 ? -1 : 1;
  const ray = (o, d, t) => { // Moller-Trumbore
    const pv = cross(d, t.e2), det = dot(t.e1, pv); if (Math.abs(det) < 1e-12) return -1;
    const inv = 1 / det, tv = sub(o, t.a), u = dot(tv, pv) * inv; if (u < 0 || u > 1) return -1;
    const qv = cross(tv, t.e1), v = dot(d, qv) * inv; if (v < 0 || u + v > 1) return -1;
    return dot(t.e2, qv) * inv;
  };
  // first exit from the female body going out from o along d (Infinity if none)
  const exitDist = (o, d) => { let best = Infinity, bn = null; for (const t of cand) { const h = ray(o, d, t); if (h > 0.003 && h < best) { best = h; bn = t.n; } } return best < Infinity && dot(bn, d) * flip > 0 ? best : Infinity; };

  const M = patch.mesh, n = M.P.length / 3, D = patch.femD, { yc, zc } = VULVA;
  const X = new Float64Array(n), TH = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = M.P[i * 3]; TH[i] = Math.atan2(M.P[i * 3 + 1] - yc, M.P[i * 3 + 2] - zc); R[i] = Math.hypot(M.P[i * 3 + 1] - yc, M.P[i * 3 + 2] - zc); }
  // a regular (x, angle) grid: the female offset there (smoothed from the patch vertices), and the
  // distance from the axis (carried by that offset) out to MakeHuman's female surface
  const GX0 = -0.05, GXS = 0.001, NX = 101, GT0 = -2.0, GTS = 0.01, NT = 250, N = NX * NT;
  const bins = new Map();
  for (let i = 0; i < n; i++) { const bi = Math.round((X[i] - GX0) / GXS / 4), bj = Math.round((TH[i] - GT0) / GTS / 4); const k = bi + ',' + bj; (bins.get(k) || bins.set(k, []).get(k)).push(i); }
  let mean = [0, 0, 0]; for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) mean[a] += D[i * 3 + a] / n;
  const G = new Float64Array(N), has = new Uint8Array(N);
  for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) {
    const x = GX0 + i * GXS, t0 = GT0 + j * GTS;
    let sw = 0; const dd = [0, 0, 0];
    const bi = Math.round(i / 4), bj = Math.round(j / 4);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (const v of bins.get((bi + a) + ',' + (bj + b)) || []) {
      const w = Math.exp(-(((X[v] - x) / 0.004) ** 2) - (((TH[v] - t0) / 0.05) ** 2)); sw += w; dd[0] += w * D[v * 3]; dd[1] += w * D[v * 3 + 1]; dd[2] += w * D[v * 3 + 2];
    }
    const off = sw > 1e-3 ? dd.map((v) => v / sw) : mean;
    has[j * NX + i] = sw > 1e-3 ? 1 : 0;
    const r = exitDist([x + off[0], yc + off[1], zc + off[2]], [0, Math.sin(t0), Math.cos(t0)]);
    G[j * NX + i] = Math.min(r, 0.2);
  }
  // blur (x: 3 mm, angle: 0.04 rad) so MakeHuman's coarse facets don't show
  const blur = (src, sx, st) => {
    const k1 = (s) => { const r = Math.ceil(s * 3), w = []; for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * s * s))); return { r, w }; };
    const kx = k1(sx), kt = k1(st), tmp = new Float64Array(N), out = new Float64Array(N);
    for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) { let sw = 0, sv = 0; for (let k = -kx.r; k <= kx.r; k++) { const ii = i + k; if (ii < 0 || ii >= NX) continue; sw += kx.w[k + kx.r]; sv += kx.w[k + kx.r] * src[j * NX + ii]; } tmp[j * NX + i] = sv / sw; }
    for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) { let sw = 0, sv = 0; for (let k = -kt.r; k <= kt.r; k++) { const jj = j + k; if (jj < 0 || jj >= NT) continue; sw += kt.w[k + kt.r]; sv += kt.w[k + kt.r] * tmp[jj * NX + i]; } out[j * NX + i] = sv / sw; }
    return out;
  };
  const Gs = blur(G, +(process.env.BX || 4), +(process.env.BT || 12));
  const rMH = (x, t) => {
    const fi = Math.min(NX - 1.001, Math.max(0, (x - GX0) / GXS)), fj = Math.min(NT - 1.001, Math.max(0, (t - GT0) / GTS));
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
    return (Gs[j * NX + i] * (1 - u) + Gs[j * NX + i + 1] * u) * (1 - v) + (Gs[(j + 1) * NX + i] * (1 - u) + Gs[(j + 1) * NX + i + 1] * u) * v;
  };
  // MakeHuman's crotch is a narrow notch between thighs that nearly touch; this body's thighs stand
  // further apart, so the patch becomes a smooth trough instead: as deep as MakeHuman's crotch on the
  // midline, easing to nothing at the patch's sides (where it meets the thighs)
  const NB = 120, B0 = -2.0, BS = 0.02, deep = new Float64Array(NB).fill(0.2), rMid = new Float64Array(NB), rMidW = new Float64Array(NB), xe = new Float64Array(NB);
  for (let b = 0; b < NB; b++) { const t0 = B0 + b * BS; for (let x = -0.003; x <= 0.003; x += 0.001) deep[b] = Math.min(deep[b], rMH(x, t0)); }
  for (let i = 0; i < n; i++) {
    const b = Math.round((TH[i] - B0) / BS); if (b < 0 || b >= NB) continue;
    xe[b] = Math.max(xe[b], Math.abs(X[i]));
    const w = Math.exp(-((X[i] / 0.003) ** 2)); rMid[b] += w * R[i]; rMidW[b] += w;
  }
  const smooth1 = (a, s, valid) => { const out = new Float64Array(NB); for (let b = 0; b < NB; b++) { let sw = 0, sv = 0; for (let k = -3 * s; k <= 3 * s; k++) { const c = b + k; if (c < 0 || c >= NB || (valid && !valid(c))) continue; const w = Math.exp(-(k * k) / (2 * s * s)); sw += w; sv += w * a[c]; } out[b] = sw ? sv / sw : a[b]; } return out; };
  for (let b = 0; b < NB; b++) rMid[b] = rMidW[b] > 1e-6 ? rMid[b] / rMidW[b] : 0;
  const rMidS = smooth1(rMid, 2, (c) => rMidW[c] > 1e-6), deepS = smooth1(deep, 3), xeS = smooth1(xe, 2, (c) => xe[c] > 0);
  const at = (arr, t) => { const f = Math.min(NB - 1.001, Math.max(0, (t - B0) / BS)), b = Math.floor(f), u = f - b; return arr[b] * (1 - u) + arr[b + 1] * u; };
  const dr = new Float64Array(n);
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const d0 = Math.max(0, at(rMidS, TH[i]) - at(deepS, TH[i])), w = at(xeS, TH[i]);
    if (d0 <= 0 || w <= 0) continue;
    const s2 = Math.min(1, (X[i] / w) ** 2);
    dr[i] = Math.min(d0 * (1 - s2) ** 2, R[i] - 0.025); if (dr[i] > 0) hits++; else dr[i] = 0;
  }
  // keep the rim attached (taper over 8 mm from the border), then smooth the radial change
  const cnt = new Map();
  for (let t = 0; t < M.I.length; t += 3) for (const [u, v] of [[M.I[t], M.I[t + 1]], [M.I[t + 1], M.I[t + 2]], [M.I[t + 2], M.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const border = []; for (const [k, c] of cnt) if (c === 1) { const [u, v] = k.split(':'); border.push(+u, +v); }
  const adj = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t], b = M.I[t + 1], c = M.I[t + 2]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
  const wB = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let db = Infinity; for (const j of border) db = Math.min(db, Math.hypot(M.P[i * 3] - M.P[j * 3], M.P[i * 3 + 1] - M.P[j * 3 + 1], M.P[i * 3 + 2] - M.P[j * 3 + 2]));
    const t = Math.min(1, db / 0.008); wB[i] = t * t * (3 - 2 * t);
  }
  for (let i = 0; i < n; i++) dr[i] *= wB[i];
  for (let it = 0; it < +(process.env.LIT || 30); it++) {
    const prev = dr.slice();
    for (let i = 0; i < n; i++) { if (!adj[i].size || wB[i] === 0) continue; let s0 = 0; for (const j of adj[i]) s0 += prev[j]; dr[i] = 0.5 * prev[i] + 0.5 * s0 / adj[i].size; }
  }
  let maxMove = 0;
  for (let i = 0; i < n; i++) { D[i * 3 + 1] -= Math.sin(TH[i]) * dr[i]; D[i * 3 + 2] -= Math.cos(TH[i]) * dr[i]; maxMove = Math.max(maxMove, dr[i]); }
  return { hits, maxMove, n };
}
