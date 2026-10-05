// Modeled female anatomy, authored in the male model's coordinate space (the app's
// warp field reshapes it together with the rest of the body). Dimensions follow
// standard adult (nulliparous) reference values.
import { createNoise3D } from 'simplex-noise';
import cdt2d from 'cdt2d';
import { skinBulge, BREAST, VULVA, vulvaAmount } from '../app/src/warp.js';
import { createRequire } from 'module';
const require_fs = () => createRequire(import.meta.url)('fs');

// ---------------------------------------------------------------------------
// small vector kit
// ---------------------------------------------------------------------------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mirrorX = (p) => [-p[0], p[1], p[2]];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let seed = 1234567;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise3 = createNoise3D(() => rand());

// Centripetal Catmull-Rom through control points
function spline(pts, n) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * segs;
    const k = Math.min(segs - 1, Math.floor(u));
    const t = u - k;
    const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
    const t2 = t * t, t3 = t2 * t;
    out.push([0, 1, 2].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
  }
  return out;
}
// parallel-transport frames
function frames(path, up = [0, 0, 1]) {
  const T = path.map((p, i) => norm(sub(path[Math.min(path.length - 1, i + 1)], path[Math.max(0, i - 1)])));
  let N = norm(cross(cross(T[0], up), T[0]));
  if (len(cross(T[0], up)) < 1e-4) N = norm(cross(T[0], [1, 0, 0]));
  const out = [];
  for (let i = 0; i < path.length; i++) {
    if (i > 0) { const b = cross(T[i - 1], T[i]); if (len(b) > 1e-6) { const ax = norm(b); const ang = Math.acos(Math.max(-1, Math.min(1, dot(T[i - 1], T[i])))); N = rotate(N, ax, ang); } }
    N = norm(sub(N, mul(T[i], dot(N, T[i]))));
    out.push({ T: T[i], N, B: cross(T[i], N) });
  }
  return out;
}
function rotate(v, ax, a) { const c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(ax, v), s)), mul(ax, dot(ax, v) * (1 - c))); }

class Mesh {
  constructor() { this.P = []; this.I = []; }
  v(p) { this.P.push(p[0], p[1], p[2]); return this.P.length / 3 - 1; }
  tri(a, b, c) { this.I.push(a, b, c); }
  quad(a, b, c, d) { this.I.push(a, b, c, a, c, d); }
  flip() { for (let k = 0; k < this.I.length; k += 3) { const t = this.I[k + 1]; this.I[k + 1] = this.I[k + 2]; this.I[k + 2] = t; } return this; }
  append(m) { const o = this.P.length / 3; this.P.push(...m.P); for (const i of m.I) this.I.push(i + o); return this; }
  map(fn) { for (let k = 0; k < this.P.length; k += 3) { const q = fn([this.P[k], this.P[k + 1], this.P[k + 2]]); this.P[k] = q[0]; this.P[k + 1] = q[1]; this.P[k + 2] = q[2]; } return this; }
  prim(mat) { return { mat, P: Float32Array.from(this.P), N: null, I: Uint32Array.from(this.I) }; }
}

// Loft: path + per-ring section function (angle, t) -> [u, v] offsets in (N, B) plane. Capped ends.
function loft(path, section, { seg = 32, capStart = true, capEnd = true, up } = {}) {
  const F = frames(path, up);
  const m = new Mesh();
  const rings = [];
  path.forEach((p, i) => {
    const t = i / (path.length - 1);
    const ring = [];
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const [u, v] = section(a, t, p);
      ring.push(m.v(add(p, add(mul(F[i].N, u), mul(F[i].B, v)))));
    }
    rings.push(ring);
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % seg], c = rings[i + 1][(j + 1) % seg], d = rings[i + 1][j];
    m.quad(a, d, c, b);
  }
  if (capStart) { const c = m.v(path[0]); for (let j = 0; j < seg; j++) m.tri(c, rings[0][j], rings[0][(j + 1) % seg]); }
  if (capEnd) { const L = rings.length - 1; const c = m.v(path[L]); for (let j = 0; j < seg; j++) m.tri(c, rings[L][(j + 1) % seg], rings[L][j]); }
  return m;
}
// Tube with radius profile r(t); rounded (hemispherical-ish) ends by tapering
function tube(ctrl, r, { n = 64, seg = 16, round = true, up } = {}) {
  const path = spline(ctrl, n);
  return loft(path, (a, t) => { let rr = typeof r === 'function' ? r(t) : r; if (round) { const e = Math.min(t, 1 - t) * n; if (e < 3) rr *= Math.sqrt(Math.max(0.05, e / 3)); } return [Math.cos(a) * rr, Math.sin(a) * rr]; }, { seg, up });
}
// Deformed ellipsoid
function blob(center, axes, { u = 40, v = 28, bump } = {}) {
  const m = new Mesh();
  const [ax, ay, az] = axes; // vectors (already scaled)
  const ring = [];
  for (let i = 0; i <= v; i++) {
    const th = (i / v) * Math.PI;
    const row = [];
    for (let j = 0; j < u; j++) {
      const ph = (j / u) * Math.PI * 2;
      const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const k = bump ? bump(d) : 1;
      const p = add(center, add(add(mul(ax, d[0] * k), mul(ay, d[1] * k)), mul(az, d[2] * k)));
      if ((i === 0 || i === v) && j > 0) { row.push(row[0]); continue; }
      row.push(m.v(p));
    }
    ring.push(row);
  }
  for (let i = 0; i < v; i++) for (let j = 0; j < u; j++) {
    const a = ring[i][j], b = ring[i][(j + 1) % u], c = ring[i + 1][(j + 1) % u], d = ring[i + 1][j];
    if (i !== 0) m.tri(a, b, d);
    if (i !== v - 1) m.tri(b, c, d);
  }
  return m;
}
const GROUPS_INT = ['Visceral systems', 'Genital systems', 'Female genital system', 'Female internal genitalia'];
const GROUPS_EXT = ['Visceral systems', 'Genital systems', 'Female genital system', 'Female external genitalia'];
const GROUPS_BREAST = ['Visceral systems', 'Breast'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function femaleParts(ctx) {
  const out = [];
  const part = (name, sys, groups, mesh, mat, extra = {}) => out.push({ name, sys, groups: groups.slice(1), prims: Array.isArray(mesh) ? mesh : [mesh.prim(mat)], ...extra });

  // ---- anchors (male coordinates; see README for reference values) ----
  const A = {
    introitus: [0, 0.787, 0.03],
    fornix: [0, 0.851, -0.033],
    os: [0, 0.848, -0.022],
    isthmus: [0, 0.876, -0.01],
    bodyMid: [0, 0.902, 0.006],
    fundus: [0, 0.93, 0.024],
  };

  // ---- Uterus: loft along an anteverted, anteflexed axis ----
  const uAxis = spline([A.os, A.isthmus, A.bodyMid, A.fundus], 80);
  const halfW = (t) => (t < 0.36 ? 0.0125 + 0.001 * t : t < 0.46 ? 0.0128 - 0.012 * (t - 0.36) : 0.0118 + 0.0135 * smooth(0.46, 0.86, t)); // lateral half-width
  const halfD = (t) => (t < 0.36 ? 0.0115 : t < 0.46 ? 0.0112 - 0.012 * (t - 0.36) : 0.0105 + 0.0062 * smooth(0.46, 0.8, t)); // AP half-thickness
  const tipR = (t) => Math.sqrt(Math.max(0, Math.min(1, t / 0.045))) * Math.sqrt(Math.max(0, Math.min(1, (1 - t) / 0.13)));
  const uterusOuter = loft(uAxis, (a, t) => {
    const k = tipR(t);
    const corn = t > 0.7 ? 1 + 0.12 * Math.pow(Math.abs(Math.cos(a)), 6) * smooth(0.7, 0.92, t) : 1; // cornua
    return [Math.sin(a) * halfD(t) * k, Math.cos(a) * halfW(t) * k * corn];
  }, { seg: 48, up: [1, 0, 0] });
  // cavity (endometrial, triangular in the coronal plane) + cervical canal
  const uterusCavity = loft(uAxis.slice(4, 76), (a, t0) => {
    const t = 0.05 + t0 * 0.9;
    const w = t < 0.4 ? 0.0028 + 0.0015 * Math.sin(Math.PI * t / 0.4) : 0.0025 + 0.0145 * smooth(0.45, 0.88, t);
    const d = t < 0.4 ? 0.0022 : 0.0016 + 0.001 * smooth(0.5, 0.8, t);
    const k = Math.sqrt(Math.max(0.02, Math.min(1, (1 - t0) / 0.1))) * Math.sqrt(Math.max(0.02, Math.min(1, t0 / 0.04)));
    return [Math.sin(a) * d * k, Math.cos(a) * w * k];
  }, { seg: 32, up: [1, 0, 0] }).flip();
  const cervixSplit = 0.36;
  // Split outer mesh into cervix / body by axis parameter: build two lofts instead for clean parts
  const cervixPath = uAxis.slice(0, Math.round(80 * cervixSplit) + 1);
  const bodyPath = uAxis.slice(Math.round(80 * cervixSplit));
  const cervix = loft(cervixPath, (a, t0) => { const t = t0 * cervixSplit; const k = tipR(t); return [Math.sin(a) * halfD(t) * k, Math.cos(a) * halfW(t) * k]; }, { seg: 48, capEnd: false, up: [1, 0, 0] });
  const body = loft(bodyPath, (a, t0) => {
    const t = cervixSplit + t0 * (1 - cervixSplit);
    const k = tipR(t);
    const corn = t > 0.7 ? 1 + 0.12 * Math.pow(Math.abs(Math.cos(a)), 6) * smooth(0.7, 0.92, t) : 1;
    return [Math.sin(a) * halfD(t) * k, Math.cos(a) * halfW(t) * k * corn];
  }, { seg: 48, capStart: false, up: [1, 0, 0] });
  void uterusOuter;
  part('Uterus', 'organs', GROUPS_INT, body, 'Myometrium', { anim: 'uterus' });
  part('Cervix of uterus', 'organs', GROUPS_INT, cervix, 'Cervix', { anim: 'uterus' });
  part('Endometrium', 'organs', GROUPS_INT, uterusCavity, 'Endometrium', { anim: 'uterus' });

  // Fundus frame for attachments
  const F = frames(uAxis, [1, 0, 0]);
  const at = (t, lat, ap = 0) => { const i = Math.round(t * 80); return add(uAxis[i], add(mul(F[i].B, lat), mul(F[i].N, ap))); };
  // F[i].B is lateral (+x) given up=[1,0,0]? verify sign
  const latSign = Math.sign(F[60].B[0]) || 1;
  const cornu = (s) => at(0.86, s * latSign * 0.025, -0.002);

  // ---- Ovaries ----
  for (const s of [1, -1]) {
    const c = [s * 0.06, 0.9, -0.022];
    const long = norm([s * 0.25, 1, 0.15]);
    const lat = norm(cross(long, [0, 0, 1]));
    const ap = norm(cross(lat, long));
    const follicles = Array.from({ length: 16 }, () => ({ d: norm([rand() - 0.5, rand() - 0.5, rand() - 0.5]), r: 0.12 + rand() * 0.2, h: 0.04 + rand() * 0.06 }));
    const ov = blob(c, [mul(lat, 0.0105), mul(long, 0.017), mul(ap, 0.0075)], {
      u: 56, v: 40,
      bump: (d) => { let k = 1 + 0.035 * noise3(d[0] * 3, d[1] * 3, d[2] * 3); for (const f of follicles) { const q = 1 - dot(d, f.d); if (q < f.r * f.r) k += f.h * Math.cos((Math.sqrt(q) / f.r) * Math.PI * 0.5) ** 2; } return k; },
    });
    part('Ovary', 'organs', GROUPS_INT, ov, 'Ovary', { side: s > 0 ? 'L' : 'R', anim: 'ovary' });
    // Ovarian ligament (to uterus) and suspensory ligament (to pelvic wall)
    const medPole = add(c, mul(long, -0.014));
    const latPole = add(c, mul(long, 0.016));
    part('Ligament of ovary', 'organs', GROUPS_INT, tube([medPole, lerp(medPole, at(0.78, s * latSign * 0.02, -0.006), 0.5), at(0.78, s * latSign * 0.019, -0.006)], 0.0022, { seg: 10 }), 'Ligament', { side: s > 0 ? 'L' : 'R' });
    part('Suspensory ligament of ovary', 'organs', GROUPS_INT, tube([latPole, [s * 0.074, 0.918, -0.02], [s * 0.081, 0.94, -0.012], [s * 0.084, 0.958, -0.004]], (t) => 0.0019 - 0.0006 * t, { seg: 10 }), 'Peritoneum', { side: s > 0 ? 'L' : 'R' });

    // ---- Uterine (fallopian) tube with fimbriae ----
    const tubePts = [cornu(s), add(cornu(s), [s * 0.012, 0.004, -0.002]), [s * 0.05, 0.928, -0.006], [s * 0.071, 0.92, -0.016], [s * 0.078, 0.905, -0.03], [s * 0.071, 0.894, -0.04]];
    const tubeR = (t) => (t < 0.28 ? 0.0019 : t < 0.86 ? 0.0019 + 0.0028 * smooth(0.28, 0.75, t) : 0.0047 + 0.0055 * smooth(0.86, 1, t));
    const tpath = spline(tubePts, 90);
    const tubeMesh = loft(tpath, (a, t) => [Math.cos(a) * tubeR(t), Math.sin(a) * tubeR(t)], { seg: 18, capEnd: false });
    // inner lining of the funnel so the opening reads as an opening
    const inner = loft(tpath.slice(78), (a, t) => { const r = tubeR(0.86 + t * 0.14) * 0.8; return [Math.cos(a) * r, Math.sin(a) * r]; }, { seg: 18, capStart: true, capEnd: false }).flip();
    tubeMesh.append(inner);
    const end = tpath[tpath.length - 1], endF = frames(tpath)[tpath.length - 1];
    const fimb = new Mesh();
    const nF = 15;
    for (let k = 0; k < nF; k++) {
      const a = (k / nF) * Math.PI * 2 + rand() * 0.2;
      const base = add(end, add(mul(endF.N, Math.cos(a) * 0.0095), mul(endF.B, Math.sin(a) * 0.0095)));
      const outward = norm(add(mul(endF.N, Math.cos(a)), mul(endF.B, Math.sin(a))));
      const Lf = 0.008 + rand() * 0.006 + (k === 0 ? 0.01 : 0);
      const dir = norm(add(mul(endF.T, 0.7), mul(outward, 0.7)));
      const curl = norm(add(dir, [0, -0.6, 0]));
      const p1 = add(base, mul(dir, Lf * 0.5)), p2 = add(p1, mul(curl, Lf * 0.5));
      fimb.append(tube([base, p1, p2], (t) => 0.0011 * (1 - 0.55 * t), { n: 14, seg: 8 }));
    }
    tubeMesh.append(fimb);
    part('Uterine tube', 'organs', GROUPS_INT, tubeMesh, 'Uterine tube', { side: s > 0 ? 'L' : 'R', anim: 'tube' });

    // Round ligament: cornu -> deep inguinal ring
    part('Round ligament of uterus', 'organs', GROUPS_INT, tube([at(0.8, s * latSign * 0.022, 0.006), [s * 0.04, 0.905, 0.03], [s * 0.058, 0.892, 0.05], [s * 0.064, 0.885, 0.06]], 0.0022, { seg: 10 }), 'Ligament', { side: s > 0 ? 'L' : 'R' });
  }

  function buildVagina() {
  const vAxis = spline([A.introitus, lerp(A.introitus, A.fornix, 0.5), A.fornix], 60);
  const vagOuter = loft(vAxis, (a, t) => {
    const w = 0.006 + 0.0065 * smooth(0, 0.25, t) + 0.004 * smooth(0, 0.7, t), d = 0.0035 + 0.004 * smooth(0, 0.25, t) + 0.0045 * smooth(0.5, 1, t);
    const k = t > 0.9 ? Math.sqrt(Math.max(0.05, (1 - t) / 0.1)) : 1;
    return [Math.sin(a) * d * k, Math.cos(a) * w * k];
  }, { seg: 40, capStart: false, up: [1, 0, 0] });
  const vagInner = loft(vAxis.slice(0, 55), (a, t0) => {
    const t = t0 * (55 / 60);
    const rug = 1 + 0.18 * Math.sin(t * 60) * Math.pow(Math.abs(Math.sin(a)), 0.5);
    const w = (0.0045 + 0.006 * smooth(0, 0.25, t) + 0.0035 * smooth(0, 0.7, t)) * rug, d = 0.0012 + 0.0006 * smooth(0, 0.25, t) + 0.0025 * smooth(0.6, 1, t);
    const k = t0 > 0.9 ? Math.sqrt(Math.max(0.05, (1 - t0) / 0.1)) : 1;
    return [Math.sin(a) * d * k, Math.cos(a) * w * k];
  }, { seg: 40, capStart: false, up: [1, 0, 0] }).flip();
  // join the two at the introitus with a ring strip
  part('Vagina', 'organs', GROUPS_INT, [vagOuter.prim('Vagina'), vagInner.prim('Vaginal mucosa')], null, { anim: 'uterus' });

  }
  // ---- External genitalia, positioned along the shaped pudendal cleft ----
  const vul = ctx.urogenitalSkin ? buildVulvaSkin(ctx.urogenitalSkin, ctx.otherSkin || []) : null;
  if (vul) {
    // the smooth fill doubles as the doll-mode crotch for both bodies (pg 2)
    part('Pudendal region', 'skin', ['Regions of human body', 'Regions of perineum'], vul.skin, 'Skin', { pg: 2 });
    for (const s of [1, -1]) {
      const minora = new Mesh();
      const n = 44, rows = 6, idx = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const g = vul.at(0.07 + t * 0.85, 0.0022);
        const h = 0.0064 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.65);
        const row = [];
        for (let r = 0; r <= rows; r++) {
          const q = r / rows;
          row.push(minora.v(add(g.p, add(mul(g.n, h * q), [s * (0.0012 + 0.0013 * Math.sin(Math.PI * q) + 0.0025 * q), 0, 0]))));
        }
        idx.push(row);
      }
      for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
        if (s > 0) minora.quad(idx[i][r], idx[i + 1][r], idx[i + 1][r + 1], idx[i][r + 1]);
        else minora.quad(idx[i][r], idx[i][r + 1], idx[i + 1][r + 1], idx[i + 1][r]);
      }
      const back = new Mesh(); back.P = minora.P.slice(); back.I = minora.I.slice(); back.map((pp) => [pp[0] - s * 0.0016, pp[1], pp[2]]); back.flip();
      minora.append(back);
      part('Labium minus', 'organs', GROUPS_EXT, minora, 'Labia', { side: s > 0 ? 'L' : 'R' });
    }
    const gl = vul.at(0.13, 0.0048);
    part('Glans of clitoris', 'organs', GROUPS_EXT, blob(gl.p, [[0.0024, 0, 0], mul(gl.n, 0.0022), norm(cross([1, 0, 0], gl.n)).map((v) => v * 0.003)], { u: 24, v: 18 }), 'Clitoris');
    const bodyEnd = [0, 0.834, 0.046];
    const clit = tube([sub(gl.p, mul(gl.n, 0.002)), lerp(gl.p, bodyEnd, 0.5), bodyEnd], (t) => 0.0026 + 0.0008 * t, { seg: 14 });
    for (const s of [1, -1]) clit.append(tube([[s * 0.002, 0.834, 0.045], [s * 0.012, 0.824, 0.038], [s * 0.024, 0.81, 0.024], [s * 0.031, 0.8, 0.012]], (t) => 0.003 - 0.0016 * t, { seg: 12 }));
    part('Body and crura of clitoris', 'organs', GROUPS_EXT, clit, 'Clitoris');
    const intro = vul.at(0.64, 0.006);
    for (const s of [1, -1]) {
      const c = add(vul.at(0.47, 0.007).p, [s * 0.0105, 0, 0]);
      part('Bulb of vestibule', 'organs', GROUPS_EXT, blob(c, [[0.0034, 0, 0], [0, 0.0125, 0.008], [0, -0.003, 0.0045]], { u: 24, v: 18, bump: (d) => 1 + 0.04 * noise3(d[0] * 4, d[1] * 4, d[2] * 4) }), 'Clitoris', { side: s > 0 ? 'L' : 'R' });
      part('Greater vestibular gland', 'organs', GROUPS_EXT, blob(add(vul.at(0.8, 0.008).p, [s * 0.0095, 0, 0]), [[0.0036, 0, 0], [0, 0.0045, 0], [0, 0, 0.0036]], { u: 18, v: 12, bump: (d) => 1 + 0.08 * noise3(d[0] * 5, d[1] * 5, d[2] * 5) }), 'Gland', { side: s > 0 ? 'L' : 'R' });
    }
    const uo = vul.at(0.4, 0.003);
    part('Female urethra', 'organs', GROUPS_EXT, tube([[0, 0.818, 0.012], lerp([0, 0.818, 0.012], uo.p, 0.5), uo.p], 0.0026, { seg: 14 }), 'Urethra', { anim: 'urinary' });
    // superficial external pudendal vessels and genital nerve: upper course from the male
    // model, then down into the labium majus
    for (const pv of ctx.pudendal || []) {
      const s = pv.side === 'L' ? 1 : -1;
      const cut = pv.path.findIndex((q) => q[1] < 0.826 && Math.abs(q[0]) < 0.034);
      const keep = pv.path.slice(0, cut < 0 ? pv.path.length : cut).filter((q, i, a) => i % 2 === 0 || i === a.length - 1);
      if (keep.length < 2) continue;
      const g = vul.at(pv.sys === 'nerves' ? 0.12 : 0.22, 0);
      const end = add(add(g.p, mul(g.n, -0.006)), [s * 0.0135, 0, 0]);
      const last = keep[keep.length - 1];
      const pts = [...keep, lerp(last, end, 0.5), end];
      const mat = pv.sys === 'nerves' ? 'Nerve' : pv.mat;
      part(pv.name, pv.sys, ['_', ...pv.groups], tube(pts, Math.min(pv.radius, 0.0018), { n: 90, seg: 10 }), mat, { side: pv.side, pg: 2 });
    }
    A.introitus = intro.p;
  } else {
    part('Female urethra', 'organs', GROUPS_EXT, tube([[0, 0.818, 0.012], [0, 0.808, 0.03], [0, 0.8, 0.046]], 0.0028, { seg: 14 }), 'Urethra', { anim: 'urinary' });
  }
  buildVagina();

  // ---- Breasts ----
  if (ctx.skinZ && ctx.muscleZ) {
    for (const s of [1, -1]) out.push(...buildBreast(s, ctx));
  }

  // ---- Ovarian and uterine vessels ----
  if (ctx.vesselPaths) {
    const vp = ctx.vesselPaths;
    for (const s of [1, -1]) {
      const sideName = s > 0 ? 'L' : 'R';
      const ov = [s * 0.06, 0.902, -0.022];
      if (vp.artery[sideName]) {
        const pts = [...vp.artery[sideName], [s * 0.078, 0.95, -0.006], [s * 0.072, 0.925, -0.013], add(ov, [s * 0.01, 0.012, 0])];
        part('Ovarian artery', 'vessels', ['Cardiovascular system', 'Systemic arteries', 'Aorta'], tube(pts, 0.0016, { n: 160, seg: 10 }), 'Artery', { side: sideName });
      }
      if (vp.vein[sideName]) {
        const pts = [...vp.vein[sideName], [s * 0.082, 0.952, -0.01], [s * 0.075, 0.926, -0.017], add(ov, [s * 0.011, 0.01, -0.004])];
        part('Ovarian vein', 'vessels', ['Cardiovascular system', 'Systemic veins'], tube(pts, 0.0022, { n: 160, seg: 10 }), 'Vein', { side: sideName });
      }
      if (vp.internalIliac[sideName]) {
        // uterine artery: from internal iliac, medially over the ureter to the isthmus, then tortuous up the side of the uterus
        const start = vp.internalIliac[sideName];
        const isth = at(0.42, s * latSign * 0.016, 0);
        const pts = [start, lerp(start, isth, 0.5), isth];
        for (let k = 1; k <= 8; k++) { const t = 0.42 + k * 0.055; pts.push(at(Math.min(0.86, t), s * latSign * (0.0185 + 0.006 * smooth(0.45, 0.85, t)) + s * latSign * 0.003 * Math.sin(k * 2.4), 0.003 * Math.cos(k * 2.4))); }
        part('Uterine artery', 'vessels', ['Cardiovascular system', 'Systemic arteries', 'Aorta', 'Aortic bifurcation'], tube(pts, 0.0017, { n: 140, seg: 10 }), 'Artery', { side: sideName });
      }
    }
  }
  // genital structures that the doll modes hide (pg 1)
  for (const q of out) if (/^(Labium minus|Glans of clitoris|Body and crura of clitoris|Bulb of vestibule|Greater vestibular gland|Vagina|Nipple)$/.test(q.name)) q.pg = 1;
  out.protrudes = vul ? vul.protrudes : null;
  return out;
}

// ---------------------------------------------------------------------------
// Female pudendal skin: smooth fills for the openings left by the male genital
// skin. The labia/cleft/mons shape comes from the shared skin deformation field
// (warp.js), so the patch and the surrounding skin deform together seamlessly.
// ---------------------------------------------------------------------------
function buildVulvaSkin(maleParts, otherSkin) {
  const keyOf = (x, y, z) => Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5);
  const map = new Map(); const P = []; const I = [];
  for (const prim of maleParts) {
    const rem = [];
    for (let k = 0; k < prim.P.length; k += 3) { const key = keyOf(prim.P[k], prim.P[k + 1], prim.P[k + 2]); let id = map.get(key); if (id === undefined) { id = P.length; map.set(key, id); P.push([prim.P[k], prim.P[k + 1], prim.P[k + 2]]); } rem.push(id); }
    for (let k = 0; k < prim.I.length; k += 3) { const a = rem[prim.I[k]], b = rem[prim.I[k + 1]], c = rem[prim.I[k + 2]]; if (a !== b && b !== c && a !== c) I.push([a, b, c]); }
  }
  const ec = new Map();
  for (const [a, b, c] of I) for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u + ':' + v : v + ':' + u; ec.set(k, (ec.get(k) || 0) + 1); }
  const nb = new Map();
  for (const [k, n] of ec) { if (n !== 1) continue; const [u, v] = k.split(':').map(Number); (nb.get(u) || nb.set(u, []).get(u)).push(v); (nb.get(v) || nb.set(v, []).get(v)).push(u); }
  const seen = new Set(), loops = [];
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const loop = [start]; seen.add(start); let prev = -1, cur = start;
    for (;;) { const nx = (nb.get(cur) || []).find((w) => w !== prev && !seen.has(w)); if (nx === undefined) break; loop.push(nx); seen.add(nx); prev = cur; cur = nx; }
    if (loop.length >= 3) loops.push(loop.map((i) => P[i]));
  }
  const { yc, zc } = VULVA;
  // The male urogenital skin is an annulus: an upper ring around the penile root and a
  // lower one over the perineum. They almost touch on each side, and the sliver between
  // them is not covered by any other skin, so the female opening is their outer contour.
  let contours = loops;
  if (loops.length === 2) {
    const ymax = (L) => Math.max(...L.map((q) => q[1]));
    const [A, B] = ymax(loops[0]) > ymax(loops[1]) ? loops : [loops[1], loops[0]];
    const pinch = (sgn) => { let best = null; for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) { if (Math.sign(A[i][0]) !== sgn || Math.sign(B[j][0]) !== sgn) continue; const d = Math.hypot(A[i][0] - B[j][0], A[i][1] - B[j][1], A[i][2] - B[j][2]); if (!best || d < best.d) best = { i, j, d }; } return best; };
    const arc = (L, i0, i1, via) => { const n = L.length, f = [], b = []; for (let k = i0; ; k = (k + 1) % n) { f.push(k); if (k === i1) break; } for (let k = i0; ; k = (k - 1 + n) % n) { b.push(k); if (k === i1) break; } return f.includes(via) ? f : b; };
    const iTop = A.reduce((bi, q, i) => (q[1] > A[bi][1] ? i : bi), 0), iBot = B.reduce((bi, q, i) => (q[1] < B[bi][1] ? i : bi), 0);
    const pl = pinch(1), pr = pinch(-1);
    contours = [[...arc(A, pr.i, pl.i, iTop).map((i) => A[i]), ...arc(B, pl.j, pr.j, iBot).map((i) => B[i])]];
  }
  // triangles of the surrounding skin, for radial ray casts
  const nearT = [];
  for (const { P: P2, I: I2 } of otherSkin) for (let t = 0; t < I2.length; t += 3) {
    const a = I2[t] * 3, b = I2[t + 1] * 3, c = I2[t + 2] * 3;
    const cx = (P2[a] + P2[b] + P2[c]) / 3, cy = (P2[a + 1] + P2[b + 1] + P2[c + 1]) / 3, cz = (P2[a + 2] + P2[b + 2] + P2[c + 2]) / 3;
    if (Math.abs(cx) > 0.09 || cy < 0.66 || cy > 0.98 || cz < -0.12) continue;
    const e1 = [P2[b] - P2[a], P2[b + 1] - P2[a + 1], P2[b + 2] - P2[a + 2]], e2 = [P2[c] - P2[a], P2[c + 1] - P2[a + 1], P2[c + 2] - P2[a + 2]];
    const nn = norm(cross(e1, e2)), radial = norm([0, cy - VULVA.yc, cz - VULVA.zc]);
    // keep outward-facing surface only: drops the rim walls between skin tiles and inner faces
    if (dot(nn, radial) < 0.35) continue;
    nearT.push([P2[a], P2[a + 1], P2[a + 2], ...e1, ...e2]);
  }
  const rayR = (x, th) => {
    const dy = Math.sin(th), dz = Math.cos(th); const hits = [];
    for (const T of nearT) {
      // Möller–Trumbore with d = (0, dy, dz), o = (x, yc, zc)
      const px = dy * T[8] - dz * T[7], py = dz * T[6], pz = -dy * T[6];
      const det = T[3] * px + T[4] * py + T[5] * pz; if (Math.abs(det) < 1e-14) continue;
      const inv = 1 / det, sx = x - T[0], sy = yc - T[1], sz = zc - T[2];
      const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = sy * T[5] - sz * T[4], qy = sz * T[3] - sx * T[5], qz = sx * T[4] - sy * T[3];
      const v = (dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      const t = (T[6] * qx + T[7] * qy + T[8] * qz) * inv;
      if (t > 0.02 && t < 0.16) hits.push(t);
    }
    if (!hits.length) return Infinity;
    return Math.min(...hits);
  };
  const toParam = (p) => [p[0], Math.atan2(p[1] - yc, p[2] - zc)];
  const rOf = (p) => Math.hypot(p[1] - yc, p[2] - zc);
  const m = new Mesh();
  let fieldAt = null, inDomain = null;
  for (const bnd0 of contours) {
    // densify the contour so the fill has no long fans at the rim (T-junctions are hidden by the skirt)
    const bnd = [];
    for (let i = 0; i < bnd0.length; i++) { const a = bnd0[i], b = bnd0[(i + 1) % bnd0.length]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.0022)); for (let k = 0; k < n; k++) bnd.push(lerp(a, b, k / n)); }
    const b2 = bnd.map(toParam);
    let crossings = 0;
    const segX = (p1, p2, p3, p4) => { const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]); return ((d(p3, p4, p1) > 0) !== (d(p3, p4, p2) > 0)) && ((d(p1, p2, p3) > 0) !== (d(p1, p2, p4) > 0)); };
    for (let i = 0; i < b2.length; i++) for (let j = i + 2; j < b2.length; j++) { if (i === 0 && j === b2.length - 1) continue; if (segX(b2[i], b2[(i + 1) % b2.length], b2[j], b2[(j + 1) % b2.length])) crossings++; }
    if (crossings) console.warn('vulva contour self-intersects in parameter space:', crossings);
    const inside = (q) => { let c = false; for (let i = 0, j = b2.length - 1; i < b2.length; j = i++) { const a = b2[i], b = b2[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const pts2 = b2.slice(); const edges = b2.map((_, i) => [i, (i + 1) % b2.length]);
    let minX = Infinity, maxX = -Infinity, minT = Infinity, maxT = -Infinity;
    for (const [x, t] of b2) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minT = Math.min(minT, t); maxT = Math.max(maxT, t); }
    const hx = 0.0012, ht = 0.016;
    const minDistB = (q) => { let d = Infinity; for (const b of b2) d = Math.min(d, Math.hypot((q[0] - b[0]) / hx, (q[1] - b[1]) / ht)); return d; };
    for (let t = minT; t <= maxT; t += ht) for (let x = minX; x <= maxX; x += hx) { const q = [x + (Math.round((t - minT) / ht) % 2 ? hx / 2 : 0), t]; if (inside(q) && minDistB(q) > 0.8) pts2.push(q); }
    const tris = cdt2d(pts2, edges, { exterior: false });
    const nB = b2.length, nV = pts2.length;
    // Radius field: biharmonic fill on a regular (x, θ) grid whose outer band is ray-cast
    // from the surrounding skin, so the patch meets its neighbours with matching slope.
    const R = new Float64Array(nV);
    for (let i = 0; i < nB; i++) R[i] = rOf(bnd[i]);
    {
      const gh = 0.0012, gt = 0.017, pad = 5;
      const gx0 = minX - pad * gh, gt0 = minT - pad * gt;
      const NX = Math.ceil((maxX - minX) / gh) + 2 * pad + 1, NT = Math.ceil((maxT - minT) / gt) + 2 * pad + 1, NN = NX * NT;
      const val = new Float64Array(NN), kind = new Uint8Array(NN); // 0 unused, 1 known, 2 unknown
      // distance (in grid cells) to the contour and the boundary radius interpolated along it
      const nearestB = (q) => {
        let d = Infinity, r = 0;
        for (let i = 0; i < nB; i++) {
          const a = b2[i], b = b2[(i + 1) % nB], ax = a[0] / gh, at = a[1] / gt, bx = b[0] / gh, bt = b[1] / gt, qx = q[0] / gh, qt = q[1] / gt;
          const ex = bx - ax, et = bt - at, l2 = ex * ex + et * et;
          const u = l2 ? Math.min(1, Math.max(0, ((qx - ax) * ex + (qt - at) * et) / l2)) : 0;
          const e = Math.hypot(qx - ax - u * ex, qt - at - u * et);
          if (e < d) { d = e; r = R[i] * (1 - u) + R[(i + 1) % nB] * u; }
        }
        return [d, r];
      };
      for (let j = 0; j < NT; j++) for (let i = 0; i < NX; i++) {
        const q = [gx0 + i * gh, gt0 + j * gt], k = j * NX + i, [d, rb] = nearestB(q);
        if (inside(q)) { kind[k] = 2; val[k] = rb; continue; }
        if (d > pad + 1) continue;
        const r = rayR(q[0], q[1]);
        if (d <= 2) { kind[k] = 1; val[k] = rb; } else if (Number.isFinite(r) && Math.abs(r - rb) < 0.004 + 0.001 * d) { kind[k] = 1; val[k] = r; }
      }
      const unk = []; const uidx = new Int32Array(NN).fill(-1);
      for (let k = 0; k < NN; k++) if (kind[k] === 2) { uidx[k] = unk.length; unk.push(k); }
      const active = [];
      for (let j = 1; j < NT - 1; j++) for (let i = 1; i < NX - 1; i++) {
        const k = j * NX + i, st = [k, k - 1, k + 1, k - NX, k + NX];
        if (st.every((s2) => kind[s2]) && st.some((s2) => kind[s2] === 2)) active.push(k);
      }
      const lap = (f, out) => { out.fill(0); for (const k of active) out[k] = f[k - 1] + f[k + 1] + f[k - NX] + f[k + NX] - 4 * f[k]; };
      const lapT = (g, out) => { out.fill(0); for (const k of active) { const v = g[k]; out[k] -= 4 * v; out[k - 1] += v; out[k + 1] += v; out[k - NX] += v; out[k + NX] += v; } };
      const full = new Float64Array(NN), t1 = new Float64Array(NN), t2 = new Float64Array(NN);
      const LAMBDA = 1e-4; // weak pull toward the initial guess keeps the system well posed
      const A = (x) => { full.fill(0); unk.forEach((k, n) => { full[k] = x[n]; }); lap(full, t1); lapT(t1, t2); return Float64Array.from(unk, (k, n) => t2[k] + LAMBDA * x[n]); };
      full.fill(0); for (let k = 0; k < NN; k++) if (kind[k] === 1) full[k] = val[k];
      lap(full, t1); lapT(t1, t2);
      const b = Float64Array.from(unk, (k) => -t2[k] + LAMBDA * val[k]);
      const x = Float64Array.from(unk, (k) => val[k]);
      const Ax0 = A(x), r = b.map((v, n) => v - Ax0[n]);
      let pv = r.slice(), rr = r.reduce((s2, v) => s2 + v * v, 0); const rr0 = rr;
      let it = 0;
      for (; it < 3000 && rr > rr0 * 1e-20; it++) {
        const Ap = A(pv); const alpha = rr / pv.reduce((s2, v, n) => s2 + v * Ap[n], 0);
        for (let n = 0; n < x.length; n++) { x[n] += alpha * pv[n]; r[n] -= alpha * Ap[n]; }
        const rr2 = r.reduce((s2, v) => s2 + v * v, 0); const beta = rr2 / rr; rr = rr2;
        for (let n = 0; n < x.length; n++) pv[n] = r[n] + beta * pv[n];
      }
      unk.forEach((k, n) => { val[k] = x[n]; });
      if (process.env.VULVA_DEBUG) {
        const fs = require_fs(); let mnv = Infinity, mxv = -Infinity; for (let k = 0; k < NN; k++) if (kind[k]) { mnv = Math.min(mnv, val[k]); mxv = Math.max(mxv, val[k]); }
        const img = Buffer.alloc(NN * 3); for (let k = 0; k < NN; k++) { const sh = kind[k] && kind[k + 1] && kind[k + NX] ? 0.5 + ((val[k + 1] - val[k]) * 0.5 + (val[k + NX] - val[k]) * 1.0) * 400 : 0; const g = Math.max(0, Math.min(255, Math.round(255 * sh))); img[k * 3] = kind[k] === 1 ? g : g >> 1; img[k * 3 + 1] = g; img[k * 3 + 2] = kind[k] === 2 ? g : g >> 1; }
        fs.writeFileSync('vulva_field.ppm', Buffer.concat([Buffer.from(`P6 ${NX} ${NT} 255\n`), img])); console.log('field range', mnv, mxv);
      }
      console.log(`vulva fill: grid ${NX}x${NT}, unknowns ${unk.length}, known ${kind.filter((v) => v === 1).length}, CG ${it} its`);
      const at2 = (q) => {
        const fi = (q[0] - gx0) / gh, fj = (q[1] - gt0) / gt, i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
        let sw = 0, sr = 0;
        for (const [di, dj, w] of [[0, 0, (1 - u) * (1 - v)], [1, 0, u * (1 - v)], [0, 1, (1 - u) * v], [1, 1, u * v]]) { const k = (j + dj) * NX + i + di; if (kind[k] && w > 0) { sw += w; sr += w * val[k]; } }
        return sw ? sr / sw : nearestB(q)[1];
      };
      fieldAt = at2; inDomain = inside;
      for (let i = nB; i < nV; i++) { const [d, rb] = nearestB(pts2[i]); const w = Math.min(1, Math.max(0, (d - 0.6) / 1.6)); R[i] = rb + (at2(pts2[i]) - rb) * w * w * (3 - 2 * w); }
    }
    const base = m.P.length / 3;
    const verts = pts2.map(([x, t], i) => (i < nB ? bnd[i] : [x, yc + Math.sin(t) * R[i], zc + Math.cos(t) * R[i]]));
    for (const v of verts) m.v(v);
    for (const [a, b, c] of tris) {
      const n = cross(sub(verts[b], verts[a]), sub(verts[c], verts[a]));
      const mid = mul(add(add(verts[a], verts[b]), verts[c]), 1 / 3);
      if (dot(n, [0, mid[1] - yc, mid[2] - zc]) >= 0) m.tri(base + a, base + b, base + c); else m.tri(base + a, base + c, base + b);
    }
    // hidden skirt: a 3 mm flap tucked just under the neighbouring skin closes hairline cracks
    let area = 0; for (let i = 0; i < nB; i++) { const a = b2[i], b = b2[(i + 1) % nB]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1, sk = [];
    for (let i = 0; i < nB; i++) {
      const a = b2[(i - 1 + nB) % nB], b = b2[(i + 1) % nB], q = bnd[i], th = b2[i][1], r = rOf(q);
      // outward normal of the contour in (x, arc) space, mapped back to 3D
      let ox = (b[1] - a[1]) * r * sgn, oa = -(b[0] - a[0]) * sgn; const l = Math.hypot(ox, oa) || 1; ox /= l; oa /= l;
      const tang = [0, Math.cos(th), -Math.sin(th)], rad = [0, Math.sin(th), Math.cos(th)];
      sk.push(m.v(add(add(q, add([ox * 0.003, 0, 0], mul(tang, oa * 0.003))), mul(rad, -0.0012))));
    }
    for (let i = 0; i < nB; i++) {
      const j = (i + 1) % nB, a = base + i, b = base + j;
      const n = cross(sub(bnd[j], bnd[i]), sub(m.P.slice(sk[i] * 3, sk[i] * 3 + 3), bnd[i]));
      const mid = bnd[i];
      if (dot(n, [0, mid[1] - yc, mid[2] - zc]) >= 0) { m.tri(a, b, sk[j]); m.tri(a, sk[j], sk[i]); } else { m.tri(a, sk[j], b); m.tri(a, sk[i], sk[j]); }
    }
  }
  // midline radius profile (male space, before the pudendal shaping)
  const own = [], other = [];
  for (let k = 0; k < m.P.length; k += 3) if (Math.abs(m.P[k]) < 0.003) own.push([Math.atan2(m.P[k + 1] - yc, m.P[k + 2] - zc), Math.hypot(m.P[k + 1] - yc, m.P[k + 2] - zc)]);
  for (const { P: P2 } of otherSkin) for (let k = 0; k < P2.length; k += 3) { if (Math.abs(P2[k]) > 0.003) continue; const r = Math.hypot(P2[k + 1] - yc, P2[k + 2] - zc); if (r < 0.12 && r > 0.03) other.push([Math.atan2(P2[k + 1] - yc, P2[k + 2] - zc), r]); }
  const tMin = Math.min(...own.map((q) => q[0])), tMax = Math.max(...own.map((q) => q[0]));
  const radiusAt = (th) => {
    const src = th >= tMin && th <= tMax ? own : other;
    // inverse-distance blend of the nearest samples in angle
    let sw = 0, sr = 0; for (const [t, r] of src) { const d = Math.abs(t - th); if (d > 0.05) continue; const w = 1 / (d + 0.004); sw += w; sr += w * r; }
    if (sw) return sr / sw;
    let best = 0.06, bd = Infinity; for (const [t, r] of src) { const d = Math.abs(t - th); if (d < bd) { bd = d; best = r; } } return best;
  };
  const grooveAt = (th, extra = 0) => { const r = radiusAt(th) + vulvaAmount(0, th) - extra; const n = [0, Math.sin(th), Math.cos(th)]; return { p: [0, yc + n[1] * r, zc + n[2] * r], n }; };
  // arc-length parameter along the pudendal cleft: 0 = anterior commissure, 1 = posterior commissure
  const thA = VULVA.top - 0.03, thP = VULVA.bot + 0.07;
  const tab = [[thA, 0]]; let len = 0, prev = grooveAt(thA).p;
  for (let k = 1; k <= 240; k++) { const th = thA + ((thP - thA) * k) / 240; const p = grooveAt(th).p; len += Math.hypot(p[1] - prev[1], p[2] - prev[2]); tab.push([th, len]); prev = p; }
  const thAt = (f) => { const s = Math.min(1, Math.max(0, f)) * len; for (let k = 1; k < tab.length; k++) if (tab[k][1] >= s) { const u = (s - tab[k - 1][1]) / (tab[k][1] - tab[k - 1][1] || 1); return tab[k - 1][0] + (tab[k][0] - tab[k - 1][0]) * u; } return thP; };
  const at = (f, extra = 0) => grooveAt(thAt(f), extra);
  console.log('pudendal cleft length', (len * 100).toFixed(1), 'cm; contour verts', contours.map((c) => c.length).join('+'), 'fill tris', m.I.length / 3);
  for (const f of [0, 0.15, 0.42, 0.64, 1]) console.log('  cleft', f, at(f).p.map((v) => v.toFixed(3)).join(','));
  // Doll modes: does a point stick out past the smooth crotch (the fill plus the surrounding skin)?
  const allT = [];
  for (const { P: P2, I: I2 } of otherSkin) for (let t = 0; t < I2.length; t += 3) {
    const a = I2[t] * 3, b = I2[t + 1] * 3, c = I2[t + 2] * 3;
    const cx = (P2[a] + P2[b] + P2[c]) / 3, cy = (P2[a + 1] + P2[b + 1] + P2[c + 1]) / 3, cz = (P2[a + 2] + P2[b + 2] + P2[c + 2]) / 3;
    if (Math.abs(cx) > 0.1 || cy < 0.62 || cy > 0.97 || cz < -0.12) continue;
    allT.push([P2[a], P2[a + 1], P2[a + 2], P2[b] - P2[a], P2[b + 1] - P2[a + 1], P2[b + 2] - P2[a + 2], P2[c] - P2[a], P2[c + 1] - P2[a + 1], P2[c + 2] - P2[a + 2]]);
  }
  const firstExit = (x, th) => {
    const dy = Math.sin(th), dz = Math.cos(th); let best = Infinity;
    for (const T of allT) {
      const px = dy * T[8] - dz * T[7], py = dz * T[6], pz = -dy * T[6];
      const det = T[3] * px + T[4] * py + T[5] * pz; if (Math.abs(det) < 1e-14) continue;
      const inv = 1 / det, sx = x - T[0], sy = yc - T[1], sz = zc - T[2];
      const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = sy * T[5] - sz * T[4], qy = sz * T[3] - sx * T[5], qz = sx * T[4] - sy * T[3];
      const v = (dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      const t = (T[6] * qx + T[7] * qy + T[8] * qz) * inv;
      if (t > 0.02 && t < best) best = t;
    }
    return best;
  };
  const protrudes = (p, tol = 0.003) => {
    if (Math.abs(p[0]) > 0.06 || p[1] < 0.66 || p[1] > 0.88 || p[2] < -0.03) return false;
    const dy = p[1] - yc, dz = p[2] - zc, r = Math.hypot(dy, dz), q = [p[0], Math.atan2(dy, dz)];
    if (inDomain && inDomain(q)) return r > fieldAt(q) + tol;
    const rb = firstExit(q[0], q[1]);
    return Number.isFinite(rb) && r > rb + tol;
  };
  return { skin: m, grooveAt, at, radiusAt, protrudes };
}

// ---------------------------------------------------------------------------
// Breast: adipose body (skin layer), glandular lobes, lactiferous ducts, nipple
// ---------------------------------------------------------------------------
function buildBreast(s, ctx) {
  const side = s > 0 ? 'L' : 'R';
  const res = [];
  const cx = s * BREAST.x, cy = BREAST.y;
  // footprint grid in (u,v) unit disk
  const N = 34;
  const foot = (u, v) => [cx + u * BREAST.rx * 1.02, cy + v * (v < 0 ? BREAST.ryDown : BREAST.ryUp) * 1.02];
  const surfFront = (x, y) => { const z0 = ctx.skinZ(x, y); const b = skinBulge(x, y, z0); const n = norm([b[0] * 0.3, b[1] * 0.3, 1]); return [x + b[0] - n[0] * 0.0045, y + b[1] - n[1] * 0.0045, z0 + b[2] - 0.0045]; };
  const surfBack = (x, y) => [x, y, ctx.muscleZ(x, y) + 0.0015];
  const fat = new Mesh();
  const grid = [], gridB = [];
  for (let i = 0; i <= N; i++) {
    const row = [], rowB = [];
    for (let j = 0; j <= N; j++) {
      // map square to disk (elliptical grid mapping)
      const a = (i / N) * 2 - 1, b = (j / N) * 2 - 1;
      const u = a * Math.sqrt(1 - (b * b) / 2), v = b * Math.sqrt(1 - (a * a) / 2);
      const [x, y] = foot(u, v);
      const f = surfFront(x, y), bk = surfBack(x, y);
      const edge = Math.max(Math.abs(a), Math.abs(b));
      const taper = 1 - smooth(0.82, 1.0, edge);
      const front = lerp(bk, f, Math.max(0.02, taper));
      row.push(fat.v(front)); rowB.push(fat.v(bk));
    }
    grid.push(row); gridB.push(rowB);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const [a, b, c, d] = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
    const [e, f, g, h] = [gridB[i][j], gridB[i + 1][j], gridB[i + 1][j + 1], gridB[i][j + 1]];
    if (s > 0) { fat.quad(a, b, c, d); fat.quad(e, h, g, f); } else { fat.quad(a, d, c, b); fat.quad(e, f, g, h); }
  }
  // stitch the rim
  const rim = [];
  for (let j = 0; j < N; j++) rim.push([0, j]); for (let i = 0; i < N; i++) rim.push([i, N]); for (let j = N; j > 0; j--) rim.push([N, j]); for (let i = N; i > 0; i--) rim.push([i, 0]);
  for (let k = 0; k < rim.length; k++) {
    const [i0, j0] = rim[k], [i1, j1] = rim[(k + 1) % rim.length];
    if (s > 0) fat.quad(grid[i0][j0], gridB[i0][j0], gridB[i1][j1], grid[i1][j1]); else fat.quad(grid[i0][j0], grid[i1][j1], gridB[i1][j1], gridB[i0][j0]);
  }
  res.push({ name: 'Breast adipose tissue', sys: 'skin', side, groups: ['Breast'], prims: [fat.prim('Breast fat')], noBulge: 1 });

  // apex (nipple base) and depth
  const apex = surfFront(cx, cy);
  const backC = surfBack(cx, cy);
  const axisOut = norm(sub(apex, backC));
  // nipple + areola disc (skin layer)
  // nipple: a lathe with a rounded dome (no pole pinching), rising ~4 mm above the areola
  const nipAxis = spline([add(apex, mul(axisOut, 0.0035)), add(apex, mul(axisOut, 0.0095))], 24);
  const nip = loft(nipAxis, (a, t) => { const r = 0.0046 * Math.pow(Math.max(0, 1 - Math.pow(t, 3)), 0.5) * (1 + 0.06 * (1 - t)) + 1e-5; return [Math.sin(a) * r, Math.cos(a) * r]; }, { seg: 36, capStart: true, capEnd: false, up: [0, 1, 0] });
  res.push({ name: 'Nipple', sys: 'skin', side, groups: ['Breast'], prims: [nip.prim('Nipple')], noBulge: 1 });

  // glandular lobes radiating from the nipple, each a cluster of small lobules, mid-depth in the fat
  const lobes = new Mesh(), ducts = new Mesh();
  const nL = 16;
  for (let k = 0; k < nL; k++) {
    const ang = (k / nL) * Math.PI * 2 + 0.2 * Math.sin(k * 7.1);
    const u = Math.cos(ang), v = Math.sin(ang);
    const reach = 0.5 + 0.14 * rand() + (u * s > 0.35 && v > 0.15 ? 0.16 : 0); // axillary tail
    let [x1, y1] = foot(u * reach, v * reach);
    // stay on the front of the chest wall (its side turns away at |x| ~ 0.16)
    x1 = Math.sign(x1) * Math.min(Math.abs(x1), 0.14);
    const tip = lerp(surfBack(x1, y1), surfFront(x1, y1), 0.42);
    const [x0, y0] = foot(u * 0.14, v * 0.14);
    const near = lerp(surfBack(x0, y0), surfFront(x0, y0), 0.55);
    const dir = norm(sub(tip, near));
    const side2 = norm(cross(dir, axisOut));
    const up2 = norm(cross(side2, dir));
    // 5-8 lobules along the lobe's main duct
    const nb = 5 + Math.floor(rand() * 4);
    for (let j = 0; j < nb; j++) {
      const t = 0.35 + 0.6 * (j / (nb - 1));
      const c = add(lerp(near, tip, t), add(mul(side2, (rand() - 0.5) * 0.008), mul(up2, (rand() - 0.5) * 0.004)));
      // keep each lobule inside the fat: limit its size by the clearance to the skin above it
      const z0 = ctx.skinZ(c[0], c[1]), zs = z0 + skinBulge(c[0], c[1], z0)[2];
      const r = Math.max(0.0012, Math.min(0.0032 + rand() * 0.0022, (zs - c[2] - 0.002) * 0.8));
      lobes.append(blob(c, [mul(side2, r * 1.2), mul(dir, r * 1.5), mul(up2, r * 0.8)], { u: 14, v: 10, bump: (d) => 1 + 0.16 * noise3(d[0] * 3 + k * 1.7 + j, d[1] * 3, d[2] * 3) }));
    }
    // duct: lobe -> lactiferous sinus -> nipple
    const sinus = add(apex, add(mul(axisOut, -0.008), mul(norm(sub(near, apex)), 0.0055)));
    const nipTip = add(apex, add(mul(axisOut, 0.0055), mul(norm(sub(near, apex)), 0.0012)));
    ducts.append(tube([lerp(near, tip, 0.85), lerp(near, tip, 0.4), near, sinus, nipTip], (t) => (t > 0.55 && t < 0.8 ? 0.0014 : 0.0007), { n: 40, seg: 8 }));
  }
  res.push({ name: 'Mammary gland lobes', sys: 'organs', side, groups: GROUPS_BREAST.slice(1), prims: [lobes.prim('Mammary gland')] });
  res.push({ name: 'Lactiferous ducts', sys: 'organs', side, groups: GROUPS_BREAST.slice(1), prims: [ducts.prim('Lactiferous duct')] });
  return res;
}

export { mirrorX };
