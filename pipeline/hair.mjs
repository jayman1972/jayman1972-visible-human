// Hair for the skin view: strands grown from the scalp, eyebrows and eyelashes, for both bodies.
// Female: long hair with a centre parting, falling behind the shoulders to the upper back.
// Male: short hair combed back. Strands drape under gravity and slide over the head, ears, neck
// and shoulders (they are kept just outside the skin), then are stored as fixed-length polylines.
// Everything is in the body's own space (female strands in female space).

const g = (u) => Math.exp(-u * u);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Hairline: the lowest hair (height above the eyes) by angle around the head, 0 = front, 180 = back
export const HAIRLINE = {
  female: [[0, 0.07], [25, 0.065], [45, 0.05], [62, 0.026], [74, 0.004], [84, 0.002], [94, 0.03], [108, 0.0], [125, -0.04], [150, -0.072], [180, -0.085]],
  male: [[0, 0.077], [22, 0.073], [38, 0.063], [55, 0.036], [70, -0.008], [82, -0.018], [92, 0.028], [108, -0.004], [125, -0.044], [150, -0.074], [180, -0.084]],
};
function lineAt(tab, deg) { for (let i = 1; i < tab.length; i++) if (deg <= tab[i][0]) { const [a0, h0] = tab[i - 1], [a1, h1] = tab[i]; const t = (deg - a0) / (a1 - a0); return h0 + (h1 - h0) * t; } return tab[tab.length - 1][1]; }

// head frame (male space): o = between the eyes, hc = centre of the cranium
export function headFrame(face) { return { o: face.o, hc: [face.o[0], face.o[1] + 0.02, face.o[2] - 0.08] }; }
export function hairDensity(q, H, sex) {
  const x = q[0] - H.o[0], y = q[1] - H.o[1], z = q[2] - H.o[2];
  if (y < -0.12 || z > 0.04) return 0;
  const deg = Math.atan2(Math.abs(x), q[2] - H.hc[2]) * 180 / Math.PI;
  const h = lineAt(HAIRLINE[sex], deg);
  let d = sstep(h - 0.003, h + 0.008, y);
  if (Math.abs(x) > 0.05) d *= sstep(0.028, 0.038, Math.hypot(y + 0.01, z + 0.08)); // no hair on the ears
  return d;
}

// nearest skin point lookup (position, normal) for keeping strands outside the body
function makeBody(pts, nrm) {
  const C = 0.01, map = new Map();
  for (let i = 0; i < pts.length; i++) { const p = pts[i], k = Math.floor(p[0] / C) + ',' + Math.floor(p[1] / C) + ',' + Math.floor(p[2] / C); (map.get(k) || map.set(k, []).get(k)).push(i); }
  return (q, R = 2) => {
    const gx = Math.floor(q[0] / C), gy = Math.floor(q[1] / C), gz = Math.floor(q[2] / C);
    let best = -1, bd = Infinity;
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k++) for (const v of map.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) { const p = pts[v], d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < bd) { bd = d; best = v; } }
    if (best < 0) return null;
    const n = nrm[best];
    return { p: pts[best], n, sd: dot(sub(q, pts[best]), n), dist: Math.sqrt(bd) };
  };
}
// resample a polyline to n points evenly spaced along its length
function resample(pl, n) {
  const L = [0]; for (let i = 1; i < pl.length; i++) L.push(L[i - 1] + len(sub(pl[i], pl[i - 1])));
  const total = L[L.length - 1], out = [];
  for (let k = 0; k < n; k++) {
    const s = (total * k) / (n - 1); let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const t = (s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]); out.push(add(pl[i - 1], sub(pl[i], pl[i - 1]), Math.min(1, Math.max(0, t))));
  }
  return out;
}

// skin: [{ name, side, P (male), D (female offsets), N (male normals), FN (female normals), I }]
export function buildHair({ skin, face, eyes }) {
  const H = headFrame(face);
  const out = [];
  for (const sex of ['female', 'male']) {
    const F = sex === 'female';
    const rnd = rng32(F ? 7 : 11);
    // body proxy for this sex: head, neck, shoulders and upper torso
    const pts = [], nrm = [];
    for (const s of skin) for (let i = 0; i < s.P.length / 3; i++) {
      const y = s.P[i * 3 + 1]; if (y < 1.0) continue;
      pts.push(F ? [s.P[i * 3] + s.D[i * 3], s.P[i * 3 + 1] + s.D[i * 3 + 1], s.P[i * 3 + 2] + s.D[i * 3 + 2]] : [s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2]]);
      nrm.push(F ? [s.FN[i * 3], s.FN[i * 3 + 1], s.FN[i * 3 + 2]] : [s.N[i * 3], s.N[i * 3 + 1], s.N[i * 3 + 2]]);
    }
    const body = makeBody(pts, nrm);
    // where things are in this body: the head frame moved by the female offset at the eyes
    let shift = [0, 0, 0];
    if (F) { let w = 0; for (const s of skin) for (let i = 0; i < s.P.length / 3; i++) { const q = [s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2]]; const d = len(sub(q, H.hc)); if (d < 0.09) { const k = 1 / (d + 0.01); w += k; shift = add(shift, [s.D[i * 3] * k, s.D[i * 3 + 1] * k, s.D[i * 3 + 2] * k]); } } shift = shift.map((v) => v / w); }
    const hc = add(H.hc, shift), o = add(H.o, shift);
    // root sampling on the scalp, area-weighted by hair density
    const tris = [];
    let total = 0;
    for (const s of skin) {
      if (/helix|lobule|tragus|concha|auric|scapha|fossa|crus|crura|eminentia|incisure|tubercle/i.test(s.name) && !/region/i.test(s.name)) continue;
      for (let t = 0; t < s.I.length; t += 3) {
        const v = [s.I[t], s.I[t + 1], s.I[t + 2]], P = v.map((i) => [s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2]]);
        if (P[0][1] < 1.42) continue;
        const c = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3];
        const dn = hairDensity(c, H, sex); if (dn < 0.02) continue;
        const area = len(cross(sub(P[1], P[0]), sub(P[2], P[0]))) / 2;
        total += area * dn; tris.push({ s, v, P, acc: total });
      }
    }
    const pick = () => { const r = rnd() * total; let lo = 0, hi = tris.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (tris[m].acc < r) lo = m + 1; else hi = m; } return tris[lo]; };
    const pointOn = (T) => {
      let a = rnd(), b = rnd(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const w = [1 - a - b, a, b], s = T.s, at = (arr, i, k) => arr[T.v[i] * 3 + k];
      const pm = [0, 1, 2].map((k) => w[0] * at(s.P, 0, k) + w[1] * at(s.P, 1, k) + w[2] * at(s.P, 2, k));
      const dd = [0, 1, 2].map((k) => w[0] * at(s.D, 0, k) + w[1] * at(s.D, 1, k) + w[2] * at(s.D, 2, k));
      const nn = norm([0, 1, 2].map((k) => w[0] * at(F ? s.FN : s.N, 0, k) + w[1] * at(F ? s.FN : s.N, 1, k) + w[2] * at(F ? s.FN : s.N, 2, k)));
      return { pm, p: F ? add(pm, dd) : pm, n: nn };
    };
    const tangent = (f, n) => norm(sub(f, [n[0] * dot(f, n), n[1] * dot(f, n), n[2] * dot(f, n)]));

    // ---- scalp hair
    const strands = [];
    const N = F ? 3200 : 6000, NP = F ? 18 : 5; // impression of hair, not individual hairs: wide strands over a hair-coloured scalp
    for (let k = 0; k < N; k++) {
      const T = pick(), r = pointOn(T);
      const rel = sub(r.p, hc), ax = Math.abs(rel[0]), sx = Math.sign(rel[0]) || 1;
      const yr = r.p[1] - o[1];
      let pl, layer;
      if (F) {
        // flow: away from the centre parting, down the sides, swept back from the face
        // the parting runs from the hairline to the crown; behind the crown the hair falls straight down
        const front = sstep(-0.075, -0.035, rel[2]) * sstep(0.02, 0.06, yr);
        const flow = add(add([sx * (1 - sstep(0.015, 0.07, ax)) * front, 0, 0], [0, -(0.25 + 0.75 * Math.max(1 - front, sstep(0.02, 0.07, ax))), 0]), [0, 0, -0.6 * sstep(-0.02, 0.07, rel[2])]);
        let dir = tangent(flow, r.n);
        const h0 = 0.0015 + rnd() * 0.012; layer = h0 / 0.0135;
        // the ends: a soft U across the upper back, shorter toward the front
        const deg = Math.atan2(ax, rel[2]) * 180 / Math.PI;
        const yEnd = o[1] - 0.31 + 0.07 * sstep(130, 50, deg) + (rnd() - 0.5) * 0.025; // front sections end near the shoulders
        let p = add(r.p, r.n, 0.0006); pl = [p];
        let arc = 0;
        for (let i = 0; i < 70; i++) {
          const seg = 0.011;
          let q = add(p, dir, seg); arc += seg;
          const hmin = 0.0006 + (h0 - 0.0006) * sstep(0, 0.035, arc);
          const c = body(q) || body(q, 5);
          const hmax = hmin + 0.006; // close to the head (no flyaways); free below it
          if (c && c.sd < hmin) q = add(q, c.n, hmin - c.sd);
          else if (c && arc < 0.11 && q[1] > o[1] - 0.06 && c.sd > hmax) q = add(q, c.n, -(c.sd - hmax) * 0.7);
          let nd = norm(sub(q, p));
          const wg = 0.05 + 0.32 * sstep(0.01, 0.08, arc);
          let bias = [0, -wg, 0];
          // below the ears, everything in front of the back of the neck is steered behind the shoulders
          if (q[1] < o[1] - 0.04 && q[2] > hc[2] - 0.07) bias = add(bias, [0, 0, -0.55 * sstep(o[1] - 0.04, o[1] - 0.1, q[1]) * sstep(hc[2] - 0.07, hc[2] - 0.02, q[2])]);
          dir = norm(add(nd, bias));
          p = q; pl.push(p);
          if (p[1] < yEnd) break;
        }
      } else {
        // flow: combed back over the top, down and back at the sides and back
        const top = sstep(0.03, 0.08, yr);
        const flow = add(add([0, 0, -1.0 * top - 0.3], [0, -(0.15 + 0.9 * (1 - top)), 0]), [sx * 0.15 * top, 0, 0]);
        let dir = tangent(flow, r.n);
        const L = 0.022 + 0.04 * top + rnd() * 0.012, rise = 0.05 + 0.07 * rnd();
        layer = rnd();
        let p = add(r.p, r.n, 0.0006); pl = [p];
        const steps = 10, seg = L / steps;
        for (let i = 1; i <= steps; i++) {
          let q = add(p, dir, seg);
          const c = body(q);
          const h = 0.0007 + (i * seg) * rise;
          if (c) q = add(q, c.n, h - c.sd); // follow the head at a set height
          const nd = norm(sub(q, p));
          const f2 = c ? tangent(flow, c.n) : flow;
          dir = norm(add(add(nd, f2, 0.35), [0, -0.05, 0]));
          p = q; pl.push(p);
        }
      }
      if (pl.length < 3) continue;
      // drop strays: strands that double back, or wander away from the head above the shoulders
      let stray = false;
      for (let i = 2; i < pl.length && !stray; i++) { if (dot(norm(sub(pl[i], pl[i - 1])), norm(sub(pl[i - 1], pl[i - 2]))) < 0.2) stray = true; }
      for (const q of pl) { if (stray || q[1] < o[1] - 0.03) continue; const c = body(q, 4); if (!c || c.sd > 0.03) stray = true; }
      if (stray) continue;
      strands.push({ pts: resample(pl, NP), width: F ? 0.0018 + rnd() * 0.0012 : 0.0012 + rnd() * 0.0006, shade: rnd(), layer, kind: 0 });
    }
    out.push({ id: sex + '-scalp', sex, kind: 'scalp', points: NP, strands });

    // ---- eyebrows: a band over each brow ridge (arched and finer on the woman)
    const browTris = [];
    for (const s of skin) {
      if (!/^(Frontal region|Eyebrow|Orbital region)$/.test(s.name)) continue;
      for (let t = 0; t < s.I.length; t += 3) { const v = [s.I[t], s.I[t + 1], s.I[t + 2]]; browTris.push({ s, v, P: v.map((i) => [s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2]]) }); }
    }
    const rayZ = (x, y) => { // the skin under (x, y), seen from the front (male space)
      let best = null;
      for (const T of browTris) {
        const [A, B, C] = T.P;
        const d = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]); if (Math.abs(d) < 1e-12) continue;
        const u = ((x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (y - A[1])) / d, v = ((B[0] - A[0]) * (y - A[1]) - (x - A[0]) * (B[1] - A[1])) / d;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const z = A[2] + u * (B[2] - A[2]) + v * (C[2] - A[2]);
        if (!best || z > best.z) best = { z, T, w: [1 - u - v, u, v] };
      }
      return best;
    };
    const brows = [];
    const NB = F ? 170 : 300;
    for (const sd of [1, -1]) for (let k = 0; k < NB; k++) {
      const u = Math.pow(rnd(), 0.8), v = rnd() - 0.5;
      const yc = F ? 0.0265 + 0.0075 * g((u - 0.68) / 0.34) - 0.0045 * u * u * u : 0.0255 + 0.0035 * Math.sin(Math.PI * u * 0.9) - 0.002 * u;
      const th = F ? 0.0062 * (1 - 0.62 * Math.pow(u, 1.4)) : 0.0098 * (1 - 0.45 * u);
      const xm = H.o[0] + sd * (0.012 + u * (F ? 0.041 : 0.043)), ym = H.o[1] + yc + v * th;
      const hit = rayZ(xm, ym); if (!hit) continue;
      const s = hit.T.s, w = hit.w, at = (arr, i, k2) => arr[hit.T.v[i] * 3 + k2];
      const pm = [xm, ym, hit.z];
      const dd = [0, 1, 2].map((k2) => w[0] * at(s.D, 0, k2) + w[1] * at(s.D, 1, k2) + w[2] * at(s.D, 2, k2));
      const n = norm([0, 1, 2].map((k2) => w[0] * at(F ? s.FN : s.N, 0, k2) + w[1] * at(F ? s.FN : s.N, 1, k2) + w[2] * at(F ? s.FN : s.N, 2, k2)));
      const root = F ? add(pm, dd) : pm;
      const ang = (1 - u) * 1.0 + 0.12 - (F ? 0.0 : 0.05) - u * 0.25; // medial hairs point up, the tail flattens
      const dir = tangent([sd * Math.cos(ang), Math.sin(ang), 0], n);
      const L = (F ? 0.0055 : 0.0075) + rnd() * 0.003;
      const pl = [add(root, n, 0.0002)];
      for (let i = 1; i <= 3; i++) pl.push(add(add(root, dir, (L * i) / 3), n, 0.0002 + 0.0005 * i));
      brows.push({ pts: pl, width: F ? 0.0002 : 0.0003, shade: rnd(), layer: 0.6 + 0.4 * rnd(), kind: 1 });
    }
    out.push({ id: sex + '-brows', sex, kind: 'brows', points: 4, strands: brows });

    // ---- eyelashes along the eye openings (the skin's open edge around each eye)
    const lashes = [];
    for (const e of eyes) {
      const ec = e.c;
      // open edge: border vertices of the orbital skin not shared with other skin pieces
      const key = (x, y, z) => Math.round(x * 2e4) + ',' + Math.round(y * 2e4) + ',' + Math.round(z * 2e4);
      const elsewhere = new Set();
      for (const s of skin) { if (/^Orbital region$/.test(s.name)) continue; for (let i = 0; i < s.P.length / 3; i++) if (Math.abs(s.P[i * 3 + 1] - ec[1]) < 0.04) elsewhere.add(key(s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2])); }
      const edge = [];
      for (const s of skin) {
        if (!/^Orbital region$/.test(s.name)) continue;
        const cnt = new Map();
        for (let t = 0; t < s.I.length; t += 3) for (const [a, b] of [[s.I[t], s.I[t + 1]], [s.I[t + 1], s.I[t + 2]], [s.I[t + 2], s.I[t]]]) { const k2 = a < b ? a + ':' + b : b + ':' + a; cnt.set(k2, (cnt.get(k2) || 0) + 1); }
        for (const [k2, c] of cnt) {
          if (c !== 1) continue;
          for (const i of k2.split(':').map(Number)) {
            const q = [s.P[i * 3], s.P[i * 3 + 1], s.P[i * 3 + 2]];
            if (len(sub(q, ec)) > 0.025 || elsewhere.has(key(...q))) continue;
            edge.push({ q, d: [s.D[i * 3], s.D[i * 3 + 1], s.D[i * 3 + 2]] });
          }
        }
      }
      if (edge.length < 6) continue;
      // canthi = the two ends along x; upper / lower lids by height relative to the line between them
      edge.sort((a, b) => a.q[0] - b.q[0]);
      const A = edge[0].q, B = edge[edge.length - 1].q;
      const medial = Math.abs(A[0]) < Math.abs(B[0]) ? A : B, lateral = medial === A ? B : A;
      const lineY = (x) => medial[1] + (lateral[1] - medial[1]) * (x - medial[0]) / (lateral[0] - medial[0]);
      for (const upper of [true]) {
        const lid = edge.filter((v) => (v.q[1] > lineY(v.q[0])) === upper).sort((a, b) => Math.abs(a.q[0] - medial[0]) - Math.abs(b.q[0] - medial[0]));
        if (lid.length < 3) continue;
        const span = Math.abs(lateral[0] - medial[0]);
        const count = F ? 42 : 28;
        for (let k = 0; k < count; k++) {
          const tt = 0.12 + 0.86 * (k + rnd() * 0.8) / count; // skip the inner corner
          const xq = medial[0] + (lateral[0] - medial[0]) * tt;
          let bi = 0; for (let i = 1; i < lid.length; i++) if (Math.abs(lid[i].q[0] - xq) < Math.abs(lid[bi].q[0] - xq)) bi = i;
          const v = lid[bi], rootM = [xq, v.q[1], v.q[2]], root = F ? add(rootM, v.d) : rootM;
          const out0 = norm(sub(rootM, [ec[0], ec[1], ec[2] - 0.006]));
          const up = upper ? 1 : -1;
          const lat = Math.sign(lateral[0] - medial[0]);
          const L = (F ? 0.0068 + 0.0025 * tt : 0.0052) * (0.85 + 0.3 * rnd());
          const d0 = norm(add(add(out0, [0, up * 0.3, 0.25]), [lat * 0.2 * tt, 0, 0]));
          const pl = [root];
          for (let i = 1; i <= 3; i++) { const s = i / 3; pl.push(add(add(root, d0, L * s), [0, up, 0], L * 0.35 * s * s)); }
          lashes.push({ pts: pl, width: F ? 0.00014 : 0.00011, shade: rnd(), layer: 1, kind: 2 });
        }
      }
    }
    out.push({ id: sex + '-lashes', sex, kind: 'lashes', points: 4, strands: lashes });
  }
  return { groups: out, frame: H };
}

// Packs the strand groups: per group, points (uint16 xyz in the bbox) then per-strand bytes
// (width in 2 µm steps, shade, layer, kind). Strand order is shuffled so a prefix is a random subset.
export function packHair(groups, bbox) {
  const chunks = [], meta = [];
  const q = (v, a) => Math.max(0, Math.min(65535, Math.round(((v - bbox[0][a]) / (bbox[1][a] - bbox[0][a])) * 65535)));
  for (const G of groups) {
    const rnd = rng32(G.id.length * 97 + G.strands.length);
    const S = G.strands.slice(); for (let i = S.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [S[i], S[j]] = [S[j], S[i]]; }
    const pos = new Uint16Array(S.length * G.points * 3), info = new Uint8Array(S.length * 4);
    S.forEach((s, i) => {
      s.pts.forEach((p, k) => { for (let a = 0; a < 3; a++) pos[(i * G.points + k) * 3 + a] = q(p[a], a); });
      info[i * 4] = Math.min(255, Math.round(s.width / 0.000002)); info[i * 4 + 1] = Math.round(s.shade * 255); info[i * 4 + 2] = Math.round(Math.min(1, s.layer) * 255); info[i * 4 + 3] = s.kind;
    });
    meta.push({ id: G.id, sex: G.sex, kind: G.kind, strands: S.length, points: G.points, posBytes: pos.byteLength, infoBytes: info.byteLength });
    chunks.push(Buffer.from(pos.buffer), Buffer.from(info.buffer));
  }
  return { buffer: Buffer.concat(chunks), meta };
}
