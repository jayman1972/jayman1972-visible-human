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

// The female crotch as a smooth membrane: the patch's inside is re-made as a harmonic fill of its
// rim in the female shape (a soap-film saddle between the thighs, so it can't hang below them), with
// the rim tucked 1.5 mm under the neighbouring skin and the mons pubis rounded out in front.
// Writes the patch's female offsets (D) in place; returns stats.
export function membranePatch(patch, { tuck = 0.0015, mons = 0.006, iters = 3000 } = {}) {
  const M = patch.mesh, n = M.P.length / 3, D = patch.femD;
  const cnt = new Map();
  for (let t = 0; t < M.I.length; t += 3) for (const [u, v] of [[M.I[t], M.I[t + 1]], [M.I[t + 1], M.I[t + 2]], [M.I[t + 2], M.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const rim = new Uint8Array(n); for (const [k, c] of cnt) if (c === 1) { const [u, v] = k.split(':'); rim[+u] = 1; rim[+v] = 1; }
  const adj = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t], b = M.I[t + 1], c = M.I[t + 2]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
  const nb = adj.map((s) => Int32Array.from(s));
  const X = new Float64Array(n * 3); for (let k = 0; k < n * 3; k++) X[k] = M.P[k] + D[k];
  // female normals of the current patch (to tuck the rim in)
  const N = new Float64Array(n * 3);
  for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t] * 3, b = M.I[t + 1] * 3, c = M.I[t + 2] * 3; const u = [X[b] - X[a], X[b + 1] - X[a + 1], X[b + 2] - X[a + 2]], v = [X[c] - X[a], X[c + 1] - X[a + 1], X[c + 2] - X[a + 2]]; const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; for (const o of [a, b, c]) for (let k = 0; k < 3; k++) N[o + k] += f[k]; }
  for (let i = 0; i < n; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) N[i * 3 + k] /= l; }
  // outward = away from the body's centre line at crotch height
  let sgn = 0; for (let i = 0; i < n; i++) sgn += N[i * 3 + 2] * (X[i * 3 + 2] > 0.02 ? 1 : 0); const out = sgn < 0 ? -1 : 1;
  for (let i = 0; i < n; i++) if (rim[i]) for (let k = 0; k < 3; k++) X[i * 3 + k] -= N[i * 3 + k] * out * tuck;
  // harmonic fill (Gauss-Seidel)
  for (let it = 0; it < iters; it++) for (let i = 0; i < n; i++) { if (rim[i] || !nb[i].length) continue; let s0 = 0, s1 = 0, s2 = 0; for (const j of nb[i]) { s0 += X[j * 3]; s1 += X[j * 3 + 1]; s2 += X[j * 3 + 2]; } const k = nb[i].length; X[i * 3] = s0 / k; X[i * 3 + 1] = s1 / k; X[i * 3 + 2] = s2 / k; }
  // distance (in rings) from the rim, for a gentle outward dome (the film itself is flat)
  const ring = new Int32Array(n).fill(-1), q = []; for (let i = 0; i < n; i++) if (rim[i]) { ring[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of nb[i]) if (ring[j] < 0) { ring[j] = ring[i] + 1; q.push(j); } }
  let maxR = 0; for (let i = 0; i < n; i++) maxR = Math.max(maxR, ring[i]);
  const N2 = new Float64Array(n * 3);
  for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t] * 3, b = M.I[t + 1] * 3, c = M.I[t + 2] * 3; const u = [X[b] - X[a], X[b + 1] - X[a + 1], X[b + 2] - X[a + 2]], v = [X[c] - X[a], X[c + 1] - X[a + 1], X[c + 2] - X[a + 2]]; const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; for (const o of [a, b, c]) for (let k = 0; k < 3; k++) N2[o + k] += f[k]; }
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(N2[i * 3], N2[i * 3 + 1], N2[i * 3 + 2]) || 1, t = Math.min(1, ring[i] / Math.max(1, maxR * 0.45)), h = mons * t * t * (3 - 2 * t);
    for (let k = 0; k < 3; k++) D[i * 3 + k] = X[i * 3 + k] + N2[i * 3 + k] / l * out * h - M.P[i * 3 + k];
  }
  let ymin = Infinity; for (let i = 0; i < n; i++) ymin = Math.min(ymin, M.P[i * 3 + 1] + D[i * 3 + 1]);
  return { rim: rim.reduce((a, b) => a + b, 0), n, ymin, maxRing: maxR };
}

// The patch is laid over the neighbouring skin where they overlap (its rim was tucked 1-3 mm under
// it, so the neighbours' jagged hole outline showed as a frill): every patch vertex that has
// neighbouring skin just outside it moves out to sit 0.3 mm above that skin, and the move is
// smoothed over the patch. Works in the female shape (P + D for both).
// others: [{ P, D, I }] neighbouring skin pieces. Writes the patch's D in place.
export function overlayPatch(patch, others, { above = 0.0003, reach = 0.005, smooth = 12 } = {}) {
  const M = patch.mesh, n = M.P.length / 3, D = patch.femD;
  const X = new Float64Array(n * 3); for (let k = 0; k < n * 3; k++) X[k] = M.P[k] + D[k];
  const N = new Float64Array(n * 3);
  for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t] * 3, b = M.I[t + 1] * 3, c = M.I[t + 2] * 3; const u = [X[b] - X[a], X[b + 1] - X[a + 1], X[b + 2] - X[a + 2]], v = [X[c] - X[a], X[c + 1] - X[a + 1], X[c + 2] - X[a + 2]]; const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; for (const o of [a, b, c]) for (let k = 0; k < 3; k++) N[o + k] += f[k]; }
  for (let i = 0; i < n; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) N[i * 3 + k] /= l; }
  let sg = 0; for (let i = 0; i < n; i++) if (X[i * 3 + 2] > 0.03) sg += N[i * 3 + 2]; const out = sg < 0 ? -1 : 1;
  // neighbouring triangles (female shape) near the patch, in a grid
  const C = 0.01, G = new Map(), tris = [];
  let mn = [9, 9, 9], mx = [-9, -9, -9]; for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], X[i * 3 + a] - 0.01); mx[a] = Math.max(mx[a], X[i * 3 + a] + 0.01); }
  for (const o of others) {
    const F = (k) => [o.P[k * 3] + o.D[k * 3], o.P[k * 3 + 1] + o.D[k * 3 + 1], o.P[k * 3 + 2] + o.D[k * 3 + 2]];
    for (let t = 0; t < o.I.length; t += 3) {
      const a = F(o.I[t]), b = F(o.I[t + 1]), c = F(o.I[t + 2]);
      if ([a, b, c].every((p) => p[0] < mn[0] || p[0] > mx[0] || p[1] < mn[1] || p[1] > mx[1] || p[2] < mn[2] || p[2] > mx[2])) continue;
      const id = tris.length; tris.push([a, b, c]);
      const lo = [0, 1, 2].map((k) => Math.floor(Math.min(a[k], b[k], c[k]) / C)), hi = [0, 1, 2].map((k) => Math.floor(Math.max(a[k], b[k], c[k]) / C));
      for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const key = i + ',' + j + ',' + k; (G.get(key) || G.set(key, []).get(key)).push(id); }
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ray = (o, d, T) => { const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]), p = cross(d, e2), det = dot(e1, p); if (Math.abs(det) < 1e-14) return null; const inv = 1 / det, tv = sub(o, T[0]), u = dot(tv, p) * inv; if (u < 0 || u > 1) return null; const q = cross(tv, e1), v = dot(d, q) * inv; if (v < 0 || u + v > 1) return null; return dot(e2, q) * inv; };
  const lift = new Float64Array(n); let moved = 0;
  for (let i = 0; i < n; i++) {
    const o = [X[i * 3], X[i * 3 + 1], X[i * 3 + 2]], d = [N[i * 3] * out, N[i * 3 + 1] * out, N[i * 3 + 2] * out];
    const seen = new Set(); let best = -Infinity;
    for (let s = -1; s <= Math.ceil(reach / C) + 1; s++) {
      const p = [o[0] + d[0] * s * C * 0.5, o[1] + d[1] * s * C * 0.5, o[2] + d[2] * s * C * 0.5], key = Math.floor(p[0] / C) + ',' + Math.floor(p[1] / C) + ',' + Math.floor(p[2] / C);
      for (const id of G.get(key) || []) { if (seen.has(id)) continue; seen.add(id); const t = ray(o, d, tris[id]); if (t !== null && t > -0.0015 && t < reach && t > best) best = t; }
    }
    if (best > -Infinity) { lift[i] = Math.max(0, best + above); if (lift[i] > 0) moved++; }
  }
  // spread the lift smoothly over the patch (never below what each vertex needs)
  const adj = Array.from({ length: n }, () => new Set()); for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t], b = M.I[t + 1], c = M.I[t + 2]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
  let L = Float64Array.from(lift);
  for (let it = 0; it < smooth; it++) { const L2 = Float64Array.from(L); for (let i = 0; i < n; i++) { if (!adj[i].size) continue; let s0 = 0; for (const j of adj[i]) s0 += L[j]; L2[i] = Math.max(lift[i], 0.5 * L[i] + 0.5 * s0 / adj[i].size); } L = L2; }
  let maxL = 0; for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) D[i * 3 + k] += N[i * 3 + k] * out * L[i]; maxL = Math.max(maxL, L[i]); }
  return { moved, n, maxLift: maxL };
}

// The skin around the pudendal hole dips under the patch at the hole's edge (3.5 mm, easing out over
// 1 cm), so the patch's smooth outline is what shows rather than the hole's jagged one.
// others: [{ P, D, I }] (female offsets D are changed in place); patch: { mesh, femD }.
export function tuckHoleEdge(patch, others, { depth = 0.0035, width = 0.01 } = {}) {
  const PM = patch.mesh, np = PM.P.length / 3, PG = new Map(), C = 0.01;
  for (let i = 0; i < np; i++) { const k = Math.floor((PM.P[i * 3] + patch.femD[i * 3]) / C) + ',' + Math.floor((PM.P[i * 3 + 1] + patch.femD[i * 3 + 1]) / C) + ',' + Math.floor((PM.P[i * 3 + 2] + patch.femD[i * 3 + 2]) / C); (PG.get(k) || PG.set(k, []).get(k)).push(i); }
  const nearPatch = (x, y, z, r) => { const gx = Math.floor(x / C), gy = Math.floor(y / C), gz = Math.floor(z / C); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (const i of PG.get((gx + a) + ',' + (gy + b) + ',' + (gz + c)) || []) if (Math.hypot(PM.P[i * 3] + patch.femD[i * 3] - x, PM.P[i * 3 + 1] + patch.femD[i * 3 + 1] - y, PM.P[i * 3 + 2] + patch.femD[i * 3 + 2] - z) < r) return true; return false; };
  // the hole's edge: open edges of the neighbouring pieces lying within 1.5 cm of the patch
  const edge = [];
  for (const o of others) {
    const cnt = new Map(); for (let t = 0; t < o.I.length; t += 3) for (const [u, v] of [[o.I[t], o.I[t + 1]], [o.I[t + 1], o.I[t + 2]], [o.I[t + 2], o.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
    for (const [k, c] of cnt) if (c === 1) for (const v of k.split(':').map(Number)) { const f = [o.P[v * 3] + o.D[v * 3], o.P[v * 3 + 1] + o.D[v * 3 + 1], o.P[v * 3 + 2] + o.D[v * 3 + 2]]; if (nearPatch(f[0], f[1], f[2], 0.015)) edge.push(f); }
  }
  let moved = 0;
  for (const o of others) {
    const n = o.P.length / 3, F = new Float64Array(n * 3); for (let k = 0; k < n * 3; k++) F[k] = o.P[k] + o.D[k];
    const N = new Float64Array(n * 3);
    for (let t = 0; t < o.I.length; t += 3) { const a = o.I[t] * 3, b = o.I[t + 1] * 3, c = o.I[t + 2] * 3; const u = [F[b] - F[a], F[b + 1] - F[a + 1], F[b + 2] - F[a + 2]], v = [F[c] - F[a], F[c + 1] - F[a + 1], F[c + 2] - F[a + 2]]; const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; for (const q of [a, b, c]) for (let k = 0; k < 3; k++) N[q + k] += f[k]; }
    for (let i = 0; i < n; i++) {
      let d = Infinity; for (const e of edge) { const dd = Math.hypot(F[i * 3] - e[0], F[i * 3 + 1] - e[1], F[i * 3 + 2] - e[2]); if (dd < d) d = dd; }
      if (d >= width) continue;
      const t = d / width, w = 1 - t * t * (3 - 2 * t), l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
      for (let k = 0; k < 3; k++) o.D[i * 3 + k] -= N[i * 3 + k] / l * depth * w;
      moved++;
    }
  }
  return { edge: edge.length, moved };
}

// The skin around the genital hole: its open edge zigzags (the male mesh was cut along triangle
// edges), and that zigzag shows as a frill around the pudendal patch tucked underneath. Each loop of
// that edge is smoothed along itself (male space), with the next ring of vertices relaxed so no
// triangle folds. pieces: [{ P (Float32Array / Array, modified in place), I }]; near(p): is this
// open-edge vertex at the hole? Vertices shared by two pieces move together.
export function smoothHoleEdge(pieces, near, { iters = 25, ringIters = 6, follow = [], inward = null, maxMove: cap = 0.004 } = {}) {
  const key = (x, y, z) => Math.round(x * 2e4) + ',' + Math.round(y * 2e4) + ',' + Math.round(z * 2e4);
  // welded graph of the open-edge vertices at the hole
  const ids = new Map(), pos = [], members = [], edges = new Map();
  const vid = (p, i) => { const k = key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2]); let v = ids.get(k); if (v === undefined) { v = pos.length; ids.set(k, v); pos.push([p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2]]); members.push([]); } return v; };
  for (const p of pieces) {
    const cnt = new Map(); for (let t = 0; t < p.I.length; t += 3) for (const [u, v] of [[p.I[t], p.I[t + 1]], [p.I[t + 1], p.I[t + 2]], [p.I[t + 2], p.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
    for (const [k, c] of cnt) {
      if (c !== 1) continue; const [u, v] = k.split(':').map(Number);
      if (!near([p.P[u * 3], p.P[u * 3 + 1], p.P[u * 3 + 2]]) || !near([p.P[v * 3], p.P[v * 3 + 1], p.P[v * 3 + 2]])) continue;
      const a = vid(p, u), b = vid(p, v); (edges.get(a) || edges.set(a, new Set()).get(a)).add(b); (edges.get(b) || edges.set(b, new Set()).get(b)).add(a);
    }
  }
  // every vertex of every piece at a moved position moves too
  // (follow: pieces that share the edge, e.g. the male genital skin, and move with it without shaping it)
  for (const p of [...pieces, ...follow]) for (let i = 0; i < p.P.length / 3; i++) { const v = ids.get(key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2])); if (v !== undefined) members[v].push([p, i]); }
  // smooth along the edge: vertices with two edge neighbours move toward their midpoint
  // inward(p): unit direction from an edge point into the hole; when given, the edge only ever moves
  // that way (over the patch), so it can't uncover anything, and never more than the cap
  const dirIn = new Map(); if (inward) for (const [v] of edges) dirIn.set(v, inward(pos[v]));
  let X = pos.map((q) => q.slice());
  for (let it = 0; it < iters; it++) {
    const Y = X.map((q) => q.slice());
    for (const [v, nb] of edges) {
      if (nb.size !== 2) continue; const [a, b] = [...nb];
      for (let k = 0; k < 3; k++) Y[v][k] = X[v][k] * 0.5 + (X[a][k] + X[b][k]) * 0.25;
      const d = [Y[v][0] - pos[v][0], Y[v][1] - pos[v][1], Y[v][2] - pos[v][2]], u = dirIn.get(v);
      if (u) { const t = d[0] * u[0] + d[1] * u[1] + d[2] * u[2]; for (let k = 0; k < 3; k++) d[k] = u[k] * Math.max(0, t); }
      const m = Math.hypot(...d), sc = m > cap ? cap / m : 1;
      for (let k = 0; k < 3; k++) Y[v][k] = pos[v][k] + d[k] * sc;
    }
    X = Y;
  }
  let moved = 0, maxMove = 0;
  const moveOf = new Map();
  for (const [v] of edges) { const d = [X[v][0] - pos[v][0], X[v][1] - pos[v][1], X[v][2] - pos[v][2]], m = Math.hypot(...d); if (m < 1e-6) continue; moveOf.set(v, d); moved++; maxMove = Math.max(maxMove, m); for (const [p, i] of members[v]) for (let k = 0; k < 3; k++) p.P[i * 3 + k] += d[k]; }
  // relax the next ring inward of the edge in each piece (fixed edge), so the strip of triangles along it stays even
  // (vertices that another piece shares stay put, or the seam between them would open)
  const shared = new Map(); for (const p of [...pieces, ...follow]) for (let i = 0; i < p.P.length / 3; i++) { const k = key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2]); const e = shared.get(k); shared.set(k, e === undefined ? p : e === p ? p : null); }
  for (const p of pieces) {
    const n = p.P.length / 3, onEdge = new Uint8Array(n), adj = Array.from({ length: n }, () => new Set());
    for (let i = 0; i < n; i++) if (ids.has(key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2])) && edges.has(ids.get(key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2])))) onEdge[i] = 1;
    for (let t = 0; t < p.I.length; t += 3) { const a = p.I[t], b = p.I[t + 1], c = p.I[t + 2]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
    const ring = []; for (let i = 0; i < n; i++) if (!onEdge[i] && shared.get(key(p.P[i * 3], p.P[i * 3 + 1], p.P[i * 3 + 2])) === p && [...adj[i]].some((j) => onEdge[j])) ring.push(i);
    for (let it = 0; it < ringIters; it++) for (const i of ring) { const s = [0, 0, 0]; for (const j of adj[i]) for (let k = 0; k < 3; k++) s[k] += p.P[j * 3 + k]; for (let k = 0; k < 3; k++) p.P[i * 3 + k] = p.P[i * 3 + k] * 0.6 + (s[k] / adj[i].size) * 0.4; }
  }
  return { edgeVerts: edges.size, moved, maxMove };
}
