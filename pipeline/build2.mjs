// Visible Human data pipeline v2.
// Reads the full-resolution Z-Anatomy models (converted to GLB), and writes:
//   out2/base/<sys>.mvb        decimated geometry loaded at startup (one per system)
//   out2/hi/<sys>-<region>.mvb full-resolution geometry streamed in on zoom
//   out2/manifest.json         parts, packs, animation metadata
// .mvb = gzip( meshopt vertex stream + meshopt index stream )
import fs from 'node:fs';
import zlib from 'node:zlib';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import { extract } from './extract.mjs';
import { femaleParts } from './female.mjs';

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const OUT = process.argv[2] || 'out2';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(`${OUT}/base`, { recursive: true });
fs.mkdirSync(`${OUT}/hi`, { recursive: true });

const QMIN = [-0.4, -0.02, -0.2];
const QMAX = [0.4, 1.78, 0.2];
const STRIDE = 20;

// ---------------------------------------------------------------------------
// Tissue table: color (sRGB), roughness, shader class
// ---------------------------------------------------------------------------
export const TISSUE = {
  generic: 0, bone: 1, cartilage: 2, enamel: 3, muscle: 4, tendon: 5, artery: 6, vein: 7, nerve: 8, cortex: 9, whitematter: 10,
  organ: 11, lung: 12, mucosa: 13, gland: 14, fat: 15, skin: 16, eye: 17, heart: 18, lymph: 19, airway: 20, capsule: 21, cornea: 22,
};
const T = TISSUE;
function cat(mat) {
  return mat.replace(/\.\d+$/, '').replace(/-\d+'*$/, '').replace(/'+$/, '').trim();
}
function hashf(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
function vary(c, name, amt = 0.06) { const f = 1 + (hashf(name) - 0.5) * 2 * amt; return c.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))); }
function look(sys, mat, name) {
  const m = cat(mat), n = name.toLowerCase();
  const R = (rgb, rough, cls) => ({ rgb, rough, cls });
  switch (m) {
    case 'Bone': return R(vary([226, 213, 186], name, 0.03), 0.62, T.bone);
    case 'Suture': return R([206, 190, 160], 0.7, T.bone);
    case 'Cartilage':
      if (sys === 'vessels') return R([232, 214, 196], 0.38, T.capsule);
      if (sys === 'nerves') return R([214, 204, 186], 0.45, T.capsule);
      if (sys === 'organs') return R([206, 214, 206], 0.36, T.cartilage);
      return R([196, 214, 214], 0.34, T.cartilage);
    case 'Teeth': return R([242, 238, 226], 0.16, T.enamel);
    case 'Teeth-roots': return R([226, 206, 168], 0.42, T.bone);
    case 'Dentine': return R([236, 222, 186], 0.36, T.bone);
    case 'Tendon': return R([224, 216, 198], 0.3, T.tendon);
    case 'Ligament': return R(sys === 'organs' ? [226, 196, 160] : [214, 204, 182], 0.36, T.tendon);
    case 'Articular capsule': return R([206, 200, 182], 0.4, T.capsule);
    case 'Bursa': return R([226, 222, 204], 0.25, T.capsule);
    case 'Fat': return R([236, 204, 118], 0.45, T.fat);
    case 'Fascia': return R([226, 220, 208], 0.4, T.tendon);
    case 'Skin': return R([224, 178, 150], 0.55, T.skin);
    case 'Nail': return R([236, 206, 196], 0.25, T.enamel);
    case 'Artery': return R(vary([176, 26, 32], name, 0.04), 0.28, T.artery);
    case 'Vein': return R(vary([54, 70, 140], name, 0.04), 0.3, T.vein);
    case 'Pulmonary artery': return R([66, 86, 168], 0.28, T.vein);
    case 'Pulmonary vein': return R([180, 32, 40], 0.28, T.artery);
    case 'Trapezius': return sys === 'vessels' ? R([146, 40, 38], 0.4, T.heart) : R([214, 206, 196], 0.36, T.capsule);
    case 'Nerve': return R(vary([234, 210, 150], name, 0.04), 0.42, T.nerve);
    case 'Brain': case 'Frontal lobe': case 'Parietal lobe': case 'Temporal lobe': case 'Occipital lobe': case 'Limbic lobe': case 'Insula':
      return R([212, 168, 160], 0.38, T.cortex);
    case 'Brain-Inner': return R([186, 140, 136], 0.45, T.cortex);
    case 'White matter': return R([238, 228, 214], 0.42, T.whitematter);
    case 'Cerebellum': return R([206, 158, 152], 0.4, T.cortex);
    case 'Nucleus': case 'Nucleus (efferent fibers)': case 'Nucleus (afferent fibers)': case 'Nucleus (mixte)': return R([186, 146, 150], 0.42, T.whitematter);
    case 'Eye': return R([240, 238, 230], 0.18, T.eye);
    case 'Cornea': return R([200, 226, 240], 0.05, T.cornea);
    case 'Iris': return R([84, 110, 136], 0.4, T.eye);
    case 'LCR': return R([170, 206, 228], 0.1, T.cornea);
    case 'Mucosa':
      if (/testis/.test(n)) return R([228, 212, 200], 0.36, T.organ);
      if (/penis|glans/.test(n)) return R([200, 134, 124], 0.45, T.mucosa);
      return R([200, 108, 106], 0.35, T.mucosa);
    case 'Gland':
      if (/thyroid/.test(n)) return R([150, 52, 48], 0.34, T.organ);
      if (/thymus/.test(n)) return R([226, 198, 168], 0.45, T.gland);
      if (/duct/.test(n)) return R([222, 200, 136], 0.36, T.gland);
      return R([212, 160, 100], 0.42, T.gland);
    case 'Organ':
      if (/liver/.test(n)) return R([106, 34, 28], 0.3, T.organ);
      if (/kidney/.test(n)) return R([122, 42, 36], 0.32, T.organ);
      if (/spleen/.test(n)) return R([98, 34, 58], 0.34, T.organ);
      if (/bladder/.test(n)) return R([214, 168, 120], 0.34, T.mucosa);
      return R([190, 100, 92], 0.35, T.organ);
    case 'Gallbladder': return R([66, 118, 52], 0.25, T.organ);
    case 'Intestine':
      if (/stomach/.test(n)) return R([206, 122, 110], 0.34, T.mucosa);
      if (/colon|appendix|rect|caec/.test(n)) return R([196, 138, 108], 0.36, T.mucosa);
      return R([214, 142, 122], 0.34, T.mucosa);
    case 'Ductus': return R([226, 204, 120], 0.36, T.gland);
    case 'Bronchi': return R([220, 202, 182], 0.4, T.airway);
    case 'Lung': case 'Lung-base': return R([212, 138, 140], 0.62, T.lung);
    case 'Peritoneum': return R([236, 212, 140], 0.5, T.fat);
    case 'Lymph': return R(vary([206, 172, 138], name, 0.05), 0.42, T.lymph);
    case 'Muscular origin': return R([150, 40, 40], 0.45, T.muscle);
    case 'Myometrium': return R([196, 116, 116], 0.36, T.organ);
    case 'Cervix': return R([214, 150, 146], 0.32, T.mucosa);
    case 'Endometrium': return R([146, 44, 56], 0.3, T.mucosa);
    case 'Ovary': return R([226, 200, 186], 0.42, T.organ);
    case 'Uterine tube': return R([212, 140, 132], 0.34, T.mucosa);
    case 'Vagina': return R([204, 128, 130], 0.36, T.mucosa);
    case 'Vaginal mucosa': return R([186, 92, 104], 0.3, T.mucosa);
    case 'Urethra': return R([214, 168, 136], 0.34, T.mucosa);
    case 'Clitoris': return R([176, 84, 96], 0.36, T.mucosa);
    case 'Labia': return R([170, 96, 104], 0.36, T.mucosa);
    case 'Breast fat': return R([238, 212, 150], 0.45, T.skin);
    case 'Nipple': return R([170, 108, 96], 0.5, T.skin);
    case 'Mammary gland': return R([236, 206, 196], 0.42, T.gland);
    case 'Lactiferous duct': return R([238, 222, 196], 0.36, T.gland);
  }
  if (sys === 'muscles') return R(vary([150, 42, 38], name, 0.07), 0.44, T.muscle);
  if (sys === 'vessels') return R([176, 26, 32], 0.3, T.artery);
  return R([196, 176, 166], 0.5, T.generic);
}

// ---------------------------------------------------------------------------
// Systems
// ---------------------------------------------------------------------------
const SYSTEMS = [
  { id: 'skin', file: 'Regions_of_human_body100', ratio: 1.0, keepMat: (m) => /^(Skin|Nail|Ligament)$/.test(cat(m)) },
  { id: 'muscles', file: 'MuscularSystem100', ratio: 0.3, keepMat: (m) => !/^(Fascia|Articular capsule)$/.test(cat(m)), dropPart: (p) => /intermuscular septum|^Fascia lata|fascia\b/i.test(p.name) && !/Tensor fasciae/i.test(p.name) },
  { id: 'skeleton', file: 'SkeletalSystem100', ratio: 0.55, keepMat: (m) => !/^(Origin|End)-/.test(m) },
  { id: 'joints', file: 'Joints100', ratio: 0.4 },
  { id: 'organs', file: 'VisceralSystem100', ratio: 0.6, dropPart: (p) => /segment of liver/i.test(p.name) },
  { id: 'lymph', file: 'LymphoidOrgans100', ratio: 0.6, dropPart: (p) => /^(Spleen|Left lobe of thymus|Right lobe of thymus)$/.test(p.name) },
  { id: 'vessels', file: 'CardioVascular41', ratio: 0.35 },
  { id: 'nerves', file: 'NervousSystem100', ratio: 0.3 },
];
const HIDDEN_DEFAULT = /^(Pleura|Pericardium|Greater omentum|Lesser omentum|Mesocolon|Spinal dura|Falx cerebri|Tentorium cerebelli|Choroid plexus|Arachnoid|Cranial dura|.*bursa)/i;
const MALE_ONLY = /^(Testis|Epididymis|Ductus deferens|Seminal gland|Prostate|Ejaculatory duct|Glans penis|Corpus cavernosum of penis|Corpus spongiosum of penis|Urethra|Dorsal artery of penis|Deep artery of penis|Deep dorsal vein of penis|Superficial dorsal veins of penis|Testicular|Right testicular|Left testicular)/;

// Regions for hi-res packs and explode shaping (kept in sync with the app).
const REGIONS = [
  { id: 'head', a: [0, 1.52, 0], b: [0, 1.76, 0], rad: 0.11 },
  { id: 'neck', a: [0, 1.43, -0.01], b: [0, 1.52, 0], rad: 0.07 },
  { id: 'torso', a: [0, 0.84, 0], b: [0, 1.43, 0], rad: 0.17 },
  { id: 'armL', a: [0.18, 1.4, -0.03], b: [0.285, 0.7, 0.08], rad: 0.06 },
  { id: 'armR', a: [-0.18, 1.4, -0.03], b: [-0.285, 0.7, 0.08], rad: 0.06 },
  { id: 'legL', a: [0.085, 0.9, -0.01], b: [0.095, 0.0, 0.03], rad: 0.085 },
  { id: 'legR', a: [-0.085, 0.9, -0.01], b: [-0.095, 0.0, 0.03], rad: 0.085 },
];
const PACK_REGIONS = ['head', 'neck', 'thorax', 'abdomen', 'armL', 'armR', 'legL', 'legR'];
function regionOf(c) {
  let best = null, bd = Infinity;
  for (const g of REGIONS) {
    const ab = g.b.map((v, i) => v - g.a[i]);
    const ap = c.map((v, i) => v - g.a[i]);
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
    const d = Math.hypot(...c.map((v, i) => v - (g.a[i] + ab[i] * t))) / g.rad;
    if (d < bd) { bd = d; best = g.id; }
  }
  if (best === 'torso') return c[1] > 1.12 ? 'thorax' : 'abdomen';
  return best;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
// Merge a part's primitives into one welded mesh: P (float32 xyz), N (normals), I (uint32), per-vertex look
function weldPart(prims, sys, name) {
  const key = (x, y, z) => Math.round(x * 2e5) + ',' + Math.round(y * 2e5) + ',' + Math.round(z * 2e5);
  const map = new Map();
  const P = [], N = [], L = [];
  const I = [];
  for (const pr of prims) {
    const lk = look(sys, pr.mat, name);
    const remap = new Uint32Array(pr.P.length / 3);
    for (let k = 0; k < pr.P.length / 3; k++) {
      const x = pr.P[k * 3], y = pr.P[k * 3 + 1], z = pr.P[k * 3 + 2];
      const kk = key(x, y, z) + '|' + lk.cls + '|' + lk.rgb.join(',');
      let id = map.get(kk);
      if (id === undefined) {
        id = P.length / 3; map.set(kk, id);
        P.push(x, y, z);
        N.push(pr.N ? pr.N[k * 3] : 0, pr.N ? pr.N[k * 3 + 1] : 0, pr.N ? pr.N[k * 3 + 2] : 0);
        L.push(lk);
      } else if (pr.N) { N[id * 3] += pr.N[k * 3]; N[id * 3 + 1] += pr.N[k * 3 + 1]; N[id * 3 + 2] += pr.N[k * 3 + 2]; }
      remap[k] = id;
    }
    for (let k = 0; k < pr.I.length; k += 3) {
      const a = remap[pr.I[k]], b = remap[pr.I[k + 1]], c = remap[pr.I[k + 2]];
      if (a !== b && b !== c && a !== c) I.push(a, b, c);
    }
  }
  const Pf = new Float32Array(P), Nf = new Float32Array(N);
  // recompute area-weighted normals where missing, normalize
  const needN = prims.some((p) => !p.N);
  if (needN) {
    Nf.fill(0);
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const ux = Pf[b] - Pf[a], uy = Pf[b + 1] - Pf[a + 1], uz = Pf[b + 2] - Pf[a + 2];
      const vx = Pf[c] - Pf[a], vy = Pf[c + 1] - Pf[a + 1], vz = Pf[c + 2] - Pf[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) { Nf[o] += nx; Nf[o + 1] += ny; Nf[o + 2] += nz; }
    }
  }
  for (let k = 0; k < Nf.length; k += 3) { const l = Math.hypot(Nf[k], Nf[k + 1], Nf[k + 2]) || 1; Nf[k] /= l; Nf[k + 1] /= l; Nf[k + 2] /= l; }
  return { P: Pf, N: Nf, I: new Uint32Array(I), L };
}

function pca(P) {
  const n = P.length / 3; let cx = 0, cy = 0, cz = 0;
  for (let k = 0; k < P.length; k += 3) { cx += P[k]; cy += P[k + 1]; cz += P[k + 2]; }
  cx /= n; cy /= n; cz /= n;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let k = 0; k < P.length; k += 3) { const x = P[k] - cx, y = P[k + 1] - cy, z = P[k + 2] - cz; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
  let v = [0.3, 0.9, 0.2];
  for (let it = 0; it < 30; it++) {
    const w = [xx * v[0] + xy * v[1] + xz * v[2], xy * v[0] + yy * v[1] + yz * v[2], xz * v[0] + yz * v[1] + zz * v[2]];
    const l = Math.hypot(...w) || 1; v = w.map((a) => a / l);
  }
  return v;
}

function octEncode(x, y, z) {
  const l1 = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
  let u = x / l1, v = y / l1;
  if (z < 0) { const ou = u; u = (1 - Math.abs(v)) * (ou >= 0 ? 1 : -1); v = (1 - Math.abs(ou)) * (v >= 0 ? 1 : -1); }
  return [Math.round(u * 127), Math.round(v * 127)];
}

// Pack a list of {id, mesh, idx (indices into mesh), flow} chunks into an .mvb file
function writePack(path, chunks) {
  let vCount = 0, iCount = 0;
  const prepared = [];
  for (const ch of chunks) {
    const { mesh, I, id } = ch;
    const remap = new Int32Array(mesh.P.length / 3).fill(-1);
    const used = [];
    const I2 = new Uint32Array(I.length);
    for (let k = 0; k < I.length; k++) { let r = remap[I[k]]; if (r < 0) { r = remap[I[k]] = used.length; used.push(I[k]); } I2[k] = r; }
    prepared.push({ mesh, used, I2, id, flow: ch.flow });
    vCount += used.length; iCount += I2.length;
  }
  const vb = new ArrayBuffer(vCount * STRIDE);
  const dv = new DataView(vb);
  const ib = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const { mesh, used, I2, id, flow } of prepared) {
    for (let k = 0; k < used.length; k++) {
      const s = used[k], o = (vo + k) * STRIDE;
      for (let a = 0; a < 3; a++) {
        const q = Math.round(((mesh.P[s * 3 + a] - QMIN[a]) / (QMAX[a] - QMIN[a])) * 65535);
        dv.setUint16(o + a * 2, Math.max(0, Math.min(65535, q)), true);
      }
      dv.setUint16(o + 6, id, true);
      const [u, v] = octEncode(mesh.N[s * 3], mesh.N[s * 3 + 1], mesh.N[s * 3 + 2]);
      dv.setInt8(o + 8, u); dv.setInt8(o + 9, v);
      const lk = mesh.L[s];
      dv.setUint8(o + 10, lk.cls);
      dv.setUint8(o + 11, Math.round(lk.rough * 255));
      dv.setUint8(o + 12, lk.rgb[0]); dv.setUint8(o + 13, lk.rgb[1]); dv.setUint8(o + 14, lk.rgb[2]);
      dv.setUint8(o + 15, 255);
      const f = flow ? flow[s] : 65535;
      dv.setUint16(o + 16, f, true);
      dv.setUint16(o + 18, 0, true);
    }
    for (let k = 0; k < I2.length; k++) ib[io + k] = I2[k] + vo;
    vo += used.length; io += I2.length;
  }
  const encV = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(vb), vCount, STRIDE);
  const encI = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(ib.buffer), iCount, 4);
  const raw = new Uint8Array(encV.length + encI.length);
  raw.set(encV, 0); raw.set(encI, encV.length);
  const gz = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(path, gz);
  return { vCount, iCount, vBytes: encV.length, iBytes: encI.length, bytes: gz.length };
}

// ---------------------------------------------------------------------------
// Flow coordinates (geodesic distance along a network of tube-like parts)
// ---------------------------------------------------------------------------
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() { const k = this.k, v = this.v; const rk = k[0], rv = v[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { let i = 0; const n = k.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return [rk, rv]; }
  get size() { return this.k.length; }
}
// members: [{part, mesh}], seeds: function(x,y,z,part)->initial distance or Infinity
function computeFlow(members, seedFn, bridgeTol) {
  const offs = []; let n = 0;
  for (const m of members) { offs.push(n); n += m.mesh.P.length / 3; }
  const X = new Float32Array(n * 3), owner = new Int32Array(n);
  members.forEach((m, mi) => { X.set(m.mesh.P, offs[mi] * 3); owner.fill(mi, offs[mi], offs[mi] + m.mesh.P.length / 3); });
  const adj = Array.from({ length: n }, () => []);
  const addE = (a, b, w) => { adj[a].push(b, w); adj[b].push(a, w); };
  members.forEach((m, mi) => {
    const I = m.mesh.I, o = offs[mi];
    const seen = new Set();
    for (let k = 0; k < I.length; k += 3) for (let e = 0; e < 3; e++) {
      const a = I[k + e] + o, b = I[k + (e + 1) % 3] + o;
      const key = a < b ? a * 8388608 + b : b * 8388608 + a;
      if (seen.has(key)) continue; seen.add(key);
      addE(a, b, Math.hypot(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]));
    }
  });
  // bridges between different parts
  const cell = bridgeTol, grid = new Map();
  const ck = (x, y, z) => Math.floor(x / cell) + ':' + Math.floor(y / cell) + ':' + Math.floor(z / cell);
  for (let i = 0; i < n; i++) { const k = ck(X[i * 3], X[i * 3 + 1], X[i * 3 + 2]); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i); }
  for (let i = 0; i < n; i++) {
    const x = X[i * 3], y = X[i * 3 + 1], z = X[i * 3 + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    const best = new Map();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const a = grid.get((cx + dx) + ':' + (cy + dy) + ':' + (cz + dz)); if (!a) continue;
      for (const j of a) {
        if (j <= i || owner[j] === owner[i]) continue;
        const d = Math.hypot(X[j * 3] - x, X[j * 3 + 1] - y, X[j * 3 + 2] - z);
        if (d > bridgeTol) continue;
        const prev = best.get(owner[j]);
        if (!prev || d < prev[1]) best.set(owner[j], [j, d]);
      }
    }
    for (const [, [j, d]] of best) addE(i, j, d + 0.001);
  }
  const dist = new Float64Array(n).fill(Infinity);
  const h = new Heap();
  for (let i = 0; i < n; i++) { const d0 = seedFn(X[i * 3], X[i * 3 + 1], X[i * 3 + 2], members[owner[i]].part); if (d0 < Infinity) { dist[i] = d0; h.push(d0, i); } }
  while (h.size) {
    const [d, i] = h.pop();
    if (d > dist[i]) continue;
    const a = adj[i];
    for (let k = 0; k < a.length; k += 2) { const j = a[k], nd = d + a[k + 1]; if (nd < dist[j]) { dist[j] = nd; h.push(nd, j); } }
  }
  // per member: Uint16 mm
  let reached = 0;
  const out = members.map((m, mi) => {
    const len = m.mesh.P.length / 3, f = new Uint16Array(len);
    for (let k = 0; k < len; k++) { const d = dist[offs[mi] + k]; if (d < Infinity) { f[k] = Math.min(65534, Math.round(d * 1000)); reached++; } else f[k] = 65535; }
    return f;
  });
  return { flows: out, reached, total: n };
}

// ---------------------------------------------------------------------------
// Animation classes
// ---------------------------------------------------------------------------
export const ANIM = { none: 0, artery: 1, vein: 2, pulmArtery: 3, pulmVein: 4, atrium: 5, ventricle: 6, valve: 7, lung: 8, airway: 9, diaphragm: 10, ribcage: 11, gut: 12, nerve: 13, cortex: 14, urinary: 15, bladder: 16, intercostal: 17, stomach: 20, kidney: 21, spinalcord: 19, uterus: 22, tube: 23, ovary: 24 };
function animOf(sys, p, mainCat) {
  const n = p.name;
  if (sys === 'vessels') {
    if (/atrium$/i.test(n)) return ANIM.atrium;
    if (/ventricle$/i.test(n) || /papillary muscle/i.test(n)) return ANIM.ventricle;
    if (/leaflet/i.test(n)) return ANIM.valve;
    if (mainCat === 'Pulmonary artery') return ANIM.pulmArtery;
    if (mainCat === 'Pulmonary vein') return ANIM.pulmVein;
    if (mainCat === 'Vein') return ANIM.vein;
    if (mainCat === 'Artery') return ANIM.artery;
  }
  if (sys === 'organs') {
    if (/lobe of (left|right) lung/i.test(n)) return ANIM.lung;
    if (/trachea|bronch/i.test(n)) return ANIM.airway;
    if (/^stomach$/i.test(n)) return ANIM.stomach;
    if (/oesophagus|duodenum|jejunum|ileum|colon|appendix|rectum|caecum|cecum/i.test(n)) return ANIM.gut;
    if (/renal pelvis|ureter|urethra/i.test(n)) return ANIM.urinary;
    if (/urinary bladder/i.test(n)) return ANIM.bladder;
    if (/^kidney/i.test(n)) return ANIM.kidney;
  }
  if (sys === 'muscles') {
    if (/^diaphragm$/i.test(n)) return ANIM.diaphragm;
    if (/intercostal/i.test(n)) return ANIM.intercostal;
  }
  if (sys === 'skeleton' && (/rib$|costal cartilage|sternum|xiphoid|manubrium/i.test(n))) return ANIM.ribcage;
  if (sys === 'nerves') {
    const g0 = p.groups[0] || '', g = p.groups.join('>');
    if (g0 === 'Spinal cord') return ANIM.spinalcord;
    if (g0 === 'Brain' && /Cerebrum|Cerebellum/.test(g) && /lobe|Brain|Cerebellum|Insula/i.test(mainCat)) return ANIM.cortex;
    if (/^(Cranial nerves|Spinal nerves|Autonomic division|Roots of nerves|Ganglia)/.test(g0)) return ANIM.nerve;
  }
  return ANIM.none;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const manifest = { version: 2, qmin: QMIN, qmax: QMAX, stride: STRIDE, systems: [], packs: [], parts: [] };
let gid = 0;
const allParts = []; // {id, sys, name, side, groups, mesh, base I, region, ...}

function cleanName(raw) {
  let s = raw.replace(/\.\d{3}$/, '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
  let side = null;
  const m = s.match(/\.(l|r)$/);
  if (m) { side = m[1] === 'l' ? 'L' : 'R'; s = s.slice(0, -2); }
  s = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return { base: s, side };
}

for (const sys of SYSTEMS) {
  const raw = await extract(`glbhi/${sys.file}.glb`);
  if (sys.id === 'skin') {
    // The left thigh tiles carry a stray copy of their inner layer (it shows as seams on the
    // thigh); their right-side twins are clean, so rebuild them as mirror images.
    for (const name of ['Anterior region of thigh', 'Posterior region of thigh']) {
      const L = raw.find((q) => q.name === name + '.l'), R = raw.find((q) => q.name === name + '.r');
      if (!L || !R) continue;
      L.prims = R.prims.map((pr) => {
        const P = Float32Array.from(pr.P); for (let k = 0; k < P.length; k += 3) P[k] = -P[k];
        const N = pr.N ? Float32Array.from(pr.N) : null; if (N) for (let k = 0; k < N.length; k += 3) N[k] = -N[k];
        const I = Uint32Array.from(pr.I); for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
        return { mat: pr.mat, P, N, I };
      });
    }
  }
  let kept = 0, dropped = 0;
  for (const p of raw) {
    if (sys.dropPart && sys.dropPart(p)) { dropped++; continue; }
    const prims = p.prims.filter((pr) => !/^(Text|DefaultMaterial)$/.test(pr.mat) && (!sys.keepMat || sys.keepMat(pr.mat)));
    if (!prims.length) { dropped++; continue; }
    const { base, side } = cleanName(p.name);
    const mesh = weldPart(prims, sys.id, base);
    if (mesh.I.length < 3) { dropped++; continue; }
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < mesh.P.length; k += 3) for (let a = 0; a < 3; a++) { const v = mesh.P[k + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    if (mn.some((v, a) => v < QMIN[a]) || mx.some((v, a) => v > QMAX[a])) { dropped++; continue; }
    const counts = {};
    for (const pr of prims) counts[cat(pr.mat)] = (counts[cat(pr.mat)] || 0) + pr.I.length;
    const mainCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    allParts.push({
      id: gid++, sys: sys.id, name: base, side, groups: p.groups.slice(1), mesh, mn, mx, c,
      ext: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], mainCat, ratio: sys.ratio,
      hidden: HIDDEN_DEFAULT.test(base) || (sys.id === 'muscles' && mainCat === 'Bursa'), sex: MALE_ONLY.test(base) && (sys.id === 'organs' || sys.id === 'vessels') ? 1 : 0,
      // arm and hand skin hangs beside the hips and chest: keep it out of the soft-tissue bulges
      noBulge: sys.id === 'skin' && /(region of arm|bicipital groove|elbow|cubital|forearm|wrist|radial foveola|palm|hand|digits|nail plate|perionyx)/i.test(base) ? 1 : 0,
    });
    kept++;
  }
  console.log(`${sys.id}: kept ${kept}, dropped ${dropped}`);
}

// Female-only parts (modeled) and their metadata
{
  const skinParts = allParts.filter((p) => p.sys === 'skin');
  const musc = allParts.filter((p) => p.sys === 'muscles' && /pectoralis|serratus anterior|external abdominal oblique|rectus abdominis|latissimus/i.test(p.name));
  // height-field samplers over the front of the chest (4 mm cells, max z)
  function sampler(ps, fallback) {
    const C = 0.004, x0 = -0.26, y0 = 1.05, nx = 130, ny = 110;
    const g = new Float32Array(nx * ny).fill(-1);
    for (const p of ps) { const P = p.mesh.P; for (let k = 0; k < P.length; k += 3) { const i = Math.floor((P[k] - x0) / C), j = Math.floor((P[k + 1] - y0) / C); if (i < 0 || j < 0 || i >= nx || j >= ny || P[k + 2] < 0) continue; g[j * nx + i] = Math.max(g[j * nx + i], P[k + 2]); } }
    // fill holes by iterative averaging, then smooth twice
    for (let it = 0; it < 60; it++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (g[j * nx + i] >= 0) continue; let s = 0, n = 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const v = g[b * nx + a]; if (v >= 0) { s += v; n++; } } if (n) g[j * nx + i] = s / n; }
    for (let it = 0; it < 2; it++) { const h = g.slice(); for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { let s = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += h[(j + dj) * nx + i + di]; g[j * nx + i] = s / 9; } }
    return (x, y) => { const fi = (x - x0) / C - 0.5, fj = (y - y0) / C - 0.5; const i = Math.max(0, Math.min(nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(ny - 2, Math.floor(fj))); const u = Math.min(1, Math.max(0, fi - i)), v = Math.min(1, Math.max(0, fj - j)); const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i], d = g[(j + 1) * nx + i + 1]; const z = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; return z < 0 ? fallback(x, y) : z; };
  }
  // torso skin only: the arms hang in front of the chest's side in this projection
  const skinZ = sampler(skinParts.filter((p) => !p.noBulge && !/Deltoid/.test(p.name)), () => 0.1);
  const muscleZ0 = sampler(musc, (x, y) => skinZ(x, y) - 0.008);
  const muscleZ = (x, y) => Math.min(muscleZ0(x, y), skinZ(x, y) - 0.004);
  // male urogenital skin -> female pudendal skin
  const ug = allParts.filter((p) => p.sys === 'skin' && /^Urogenital region$/.test(p.name));
  ug.forEach((p) => { p.sex = 1; });
  const urogenitalSkin = ug.map((p) => ({ P: p.mesh.P, I: p.mesh.I }));
  // vessel paths: upper course of the testicular vessels (aorta / IVC / renal vein down to the pelvic brim)
  const centerline = (p, yMin) => {
    const bins = new Map(); const P = p.mesh.P;
    for (let k = 0; k < P.length; k += 3) { if (P[k + 1] < yMin) continue; const b = Math.round(P[k + 1] / 0.012); const e = bins.get(b) || [0, 0, 0, 0]; e[0] += P[k]; e[1] += P[k + 1]; e[2] += P[k + 2]; e[3]++; bins.set(b, e); }
    return [...bins.entries()].sort((a, b) => b[0] - a[0]).map(([, e]) => [e[0] / e[3], e[1] / e[3], e[2] / e[3]]);
  };
  const find = (re) => allParts.find((p) => re.test(p.name + (p.side ? '.' + p.side : '')));
  const vesselPaths = { artery: {}, vein: {}, internalIliac: {} };
  for (const [sd, L] of [['L', 'Left'], ['R', 'Right']]) {
    const a = find(new RegExp('^' + L + ' testicular artery')); if (a) vesselPaths.artery[sd] = centerline(a, 0.96);
    const v = find(new RegExp('^' + L + ' testicular vein')); if (v) vesselPaths.vein[sd] = centerline(v, 0.96);
    const ii = allParts.find((p) => p.name === 'Internal iliac artery' && p.side === sd);
    if (ii) { let lo = null; const P = ii.mesh.P; for (let k = 0; k < P.length; k += 3) if (!lo || P[k + 1] < lo[1]) lo = [P[k], P[k + 1], P[k + 2]]; vesselPaths.internalIliac[sd] = lo; }
  }
  // Superficial pudendal vessels and the genital branch of the genitofemoral nerve run down
  // into the scrotum in the male model. The female body gets copies of their upper course
  // that end in the labia majora.
  const skeletonPath = (P, cell = 0.005) => {
    const vox = new Map();
    for (let k = 0; k < P.length; k += 3) { const key = [0, 1, 2].map((a) => Math.floor(P[k + a] / cell)).join(','); const e = vox.get(key) || [0, 0, 0, 0]; e[0] += P[k]; e[1] += P[k + 1]; e[2] += P[k + 2]; e[3]++; vox.set(key, e); }
    const C = [...vox.values()].map((e) => [e[0] / e[3], e[1] / e[3], e[2] / e[3]]);
    const n = C.length, inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), par = new Int32Array(n).fill(-1), adj = Array.from({ length: n }, () => []);
    const d = (a, b) => Math.hypot(C[a][0] - C[b][0], C[a][1] - C[b][1], C[a][2] - C[b][2]);
    best[0] = 0;
    for (let it = 0; it < n; it++) { let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i; inT[u] = 1; if (par[u] >= 0) { adj[u].push(par[u]); adj[par[u]].push(u); } for (let v = 0; v < n; v++) if (!inT[v]) { const w = d(u, v); if (w < best[v]) { best[v] = w; par[v] = u; } } }
    const far = (s) => { const dist = new Float64Array(n).fill(-1), from = new Int32Array(n).fill(-1); dist[s] = 0; const q = [s]; while (q.length) { const u = q.shift(); for (const v of adj[u]) if (dist[v] < 0) { dist[v] = dist[u] + d(u, v); from[v] = u; q.push(v); } } let e = s; for (let i = 0; i < n; i++) if (dist[i] > dist[e]) e = i; return { e, from }; };
    const a = far(0).e, { e: b, from } = far(a);
    const path = []; for (let v = b; v >= 0; v = v === a ? -1 : from[v]) path.push(C[v]);
    if (path[0][1] < path[path.length - 1][1]) path.reverse();
    return path;
  };
  const pudendal = [];
  for (const p of allParts.filter((q) => /^(Superficial external pudendal artery|External pudendal veins|Genital branch of genitofemoral nerve)$/.test(q.name))) {
    p.sex = 1;
    const path = skeletonPath(p.mesh.P);
    let rs = 0; for (let k = 0; k < p.mesh.P.length; k += 3) { let m = Infinity; for (const c of path) m = Math.min(m, Math.hypot(p.mesh.P[k] - c[0], p.mesh.P[k + 1] - c[1], p.mesh.P[k + 2] - c[2])); rs += m; }
    pudendal.push({ name: p.name, side: p.side, sys: p.sys, groups: p.groups, mat: p.mainCat, path, radius: Math.max(0.0007, rs / (p.mesh.P.length / 3)) });
  }
  const FANIM = { uterus: ANIM.uterus, tube: ANIM.tube, ovary: ANIM.ovary, urinary: ANIM.urinary };
  const otherSkin = skinParts.filter((p) => !/^Urogenital region$/.test(p.name)).map((p) => ({ P: p.mesh.P, I: p.mesh.I }));
  for (const fp of femaleParts({ skinZ, muscleZ, urogenitalSkin, vesselPaths, otherSkin, pudendal })) {
    const mesh = weldPart(fp.prims, fp.sys, fp.name);
    if (mesh.I.length < 3) continue;
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < mesh.P.length; k += 3) for (let a = 0; a < 3; a++) { const v = mesh.P[k + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    const mainCat = cat(fp.prims[0].mat);
    const anim = typeof fp.anim === 'string' ? FANIM[fp.anim] : fp.sys === 'vessels' ? (mainCat === 'Vein' ? ANIM.vein : ANIM.artery) : undefined;
    allParts.push({ id: gid++, sys: fp.sys, name: fp.name, side: fp.side || null, groups: fp.groups, mesh, mn, mx, c: mn.map((v, i) => (v + mx[i]) / 2), ext: mx.map((v, i) => v - mn[i]), mainCat, ratio: fp.sys === 'skin' ? 1.0 : 0.6, hidden: false, sex: 2, anim, noBulge: fp.noBulge || 0 });
  }
  console.log('female parts', allParts.filter((p) => p.sex === 2).length);
}

// ---------------------------------------------------------------------------
// Skin finishing
// 1) Refine the coarse regional skin where the female shape field bends it sharply
//    (mons, labia, groin). Edges are split by a rule that depends only on their end
//    points, so neighbouring parts split shared border edges identically (no cracks).
// 2) Average normals across the borders between skin regions so the tiles shade as
//    one continuous surface.
// ---------------------------------------------------------------------------
function refineMesh(mesh, wantSplit) {
  const P = Array.from(mesh.P), N = Array.from(mesh.N), L = mesh.L.slice(), I = mesh.I;
  const mid = new Map();
  const midOf = (a, b) => {
    const k = a < b ? a + ':' + b : b + ':' + a;
    let m = mid.get(k);
    if (m !== undefined) return m;
    const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], pb = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]];
    if (!wantSplit(pa, pb)) { mid.set(k, -1); return -1; }
    m = P.length / 3;
    P.push((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2);
    const nx = N[a * 3] + N[b * 3], ny = N[a * 3 + 1] + N[b * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2], l = Math.hypot(nx, ny, nz) || 1;
    N.push(nx / l, ny / l, nz / l); L.push(L[a]);
    mid.set(k, m); return m;
  };
  const out = [];
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    const m = [midOf(v[0], v[1]), midOf(v[1], v[2]), midOf(v[2], v[0])];
    const n = m.filter((x) => x >= 0).length;
    if (n === 0) { out.push(...v); continue; }
    if (n === 3) { out.push(v[0], m[0], m[2], m[0], v[1], m[1], m[2], m[1], v[2], m[0], m[1], m[2]); continue; }
    // rotate so the first split edge is edge 0 (v0-v1)
    let r = m.findIndex((x) => x >= 0);
    if (n === 2 && m[(r + 2) % 3] >= 0) r = (r + 2) % 3; // pick r such that edges r and r+1 are split
    const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3], mab = m[r], mbc = m[(r + 1) % 3];
    if (n === 1) out.push(a, mab, c, mab, b, c);
    else out.push(a, mab, c, mab, b, mbc, mab, mbc, c);
  }
  return { P: new Float32Array(P), N: new Float32Array(N), I: new Uint32Array(out), L };
}
{
  const inPelvis = (q) => Math.abs(q[0]) < 0.07 && q[1] > 0.71 && q[1] < 0.93 && q[2] > -0.04;
  const split = (maxLen) => (a, b) => {
    const len = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    return len > maxLen && (inPelvis(a) || inPelvis(b) || inPelvis([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]));
  };
  let before = 0, after = 0;
  for (const p of allParts) {
    if (p.sys !== 'skin' || p.sex === 1 || /hair/i.test(p.name)) continue;
    if (p.mx[1] < 0.71 || p.mn[1] > 0.93 || p.mn[0] > 0.07 || p.mx[0] < -0.07) continue;
    before += p.mesh.I.length / 3;
    for (const maxLen of [0.006, 0.003]) p.mesh = refineMesh(p.mesh, split(maxLen));
    after += p.mesh.I.length / 3;
  }
  console.log(`skin refine: ${before} -> ${after} tris`);

  // border normal unification
  const skin = allParts.filter((p) => p.sys === 'skin' && !/hair|Nail|Perionyx/i.test(p.name));
  const C = 0.001, grid = new Map(), recs = [];
  for (const p of skin) {
    const I = p.mesh.I, cnt = new Map();
    for (let t = 0; t < I.length; t += 3) for (const [u, v] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
    const border = new Set(); for (const [k, n] of cnt) if (n === 1) { const [u, v] = k.split(':'); border.add(+u); border.add(+v); }
    for (const i of border) {
      const r = { p, i, x: p.mesh.P[i * 3], y: p.mesh.P[i * 3 + 1], z: p.mesh.P[i * 3 + 2], n: [p.mesh.N[i * 3], p.mesh.N[i * 3 + 1], p.mesh.N[i * 3 + 2]] };
      recs.push(r);
      const k = Math.floor(r.x / C) + ',' + Math.floor(r.y / C) + ',' + Math.floor(r.z / C);
      (grid.get(k) || grid.set(k, []).get(k)).push(r);
    }
  }
  let fixed = 0;
  const newN = recs.map((r) => {
    const acc = r.n.slice(); let m = 0;
    const gx = Math.floor(r.x / C), gy = Math.floor(r.y / C), gz = Math.floor(r.z / C);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const o of grid.get((gx + dx) + ',' + (gy + dy) + ',' + (gz + dz)) || []) {
        if (o.p === r.p || (o.p.sex | r.p.sex) === 3) continue;
        if (Math.hypot(o.x - r.x, o.y - r.y, o.z - r.z) > 0.0008) continue;
        if (o.n[0] * r.n[0] + o.n[1] * r.n[1] + o.n[2] * r.n[2] < 0.8) continue;
        acc[0] += o.n[0]; acc[1] += o.n[1]; acc[2] += o.n[2]; m++;
      }
    }
    if (m) fixed++;
    const l = Math.hypot(...acc) || 1; return acc.map((v) => v / l);
  });
  recs.forEach((r, k) => { r.p.mesh.N[r.i * 3] = newN[k][0]; r.p.mesh.N[r.i * 3 + 1] = newN[k][1]; r.p.mesh.N[r.i * 3 + 2] = newN[k][2]; });
  console.log(`skin border normals: ${fixed} of ${recs.length} border vertices blended`);
  for (const p of allParts) if (p.mesh.P.length) { const P = p.mesh.P; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let k = 0; k < P.length; k += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[k + a]); mx[a] = Math.max(mx[a], P[k + a]); } p.mn = mn; p.mx = mx; }
}

// Animation metadata (needs global context: heart valve centres etc.)
const byName = (re, sys) => allParts.filter((p) => re.test(p.name) && (!sys || p.sys === sys));
const centroidOf = (ps) => { const c = [0, 0, 0]; let n = 0; for (const p of ps) { for (let k = 0; k < p.mesh.P.length; k += 3) { c[0] += p.mesh.P[k]; c[1] += p.mesh.P[k + 1]; c[2] += p.mesh.P[k + 2]; n++; } } return c.map((v) => v / n); };
const aorticValve = centroidOf(byName(/coronary leaflet$/));
const pulmValve = centroidOf(byName(/leaflet of pulmonary valve/));
const rightAtrium = centroidOf(byName(/^Right atrium$/));
const leftAtrium = centroidOf(byName(/^Left atrium$/));
console.log('heart landmarks', { aorticValve, pulmValve, rightAtrium, leftAtrium });

for (const p of allParts) {
  if (p.anim === undefined) p.anim = animOf(p.sys, p, p.mainCat);
  p.pivot = p.c.slice();
  if (p.anim === ANIM.lung) { // pivot at the hilum: medial, slightly posterior
    p.pivot = [Math.sign(p.c[0]) * 0.035, p.c[1] + 0.02, p.c[2] - 0.01];
  }
  if (p.anim === ANIM.diaphragm) p.pivot = [p.c[0], p.mx[1], p.c[2]];
  p.axis = pca(p.mesh.P);
  p.region = regionOf(p.c);
}

// Flow networks
function seedSphere(center, r) { return (x, y, z) => { const d = Math.hypot(x - center[0], y - center[1], z - center[2]); return d < r ? d : Infinity; }; }
const flowOf = new Map(); // part id -> Uint16Array
function runFlow(label, members, seedFn, tol, origin) {
  if (!members.length) return;
  const t0 = Date.now();
  const res = computeFlow(members.map((p) => ({ part: p, mesh: p.mesh })), seedFn, tol);
  members.forEach((p, i) => {
    const f = res.flows[i];
    if (origin) { // unreached vertices: approximate path length from straight-line distance
      const P = p.mesh.P;
      for (let k = 0; k < f.length; k++) if (f[k] === 65535) f[k] = Math.min(65534, Math.round(1300 * Math.hypot(P[k * 3] - origin[0], P[k * 3 + 1] - origin[1], P[k * 3 + 2] - origin[2])));
    }
    flowOf.set(p.id, f);
  });
  console.log(`flow ${label}: parts ${members.length}, verts ${res.total}, reached ${(100 * res.reached / res.total).toFixed(1)}% in ${Date.now() - t0}ms`);
}
runFlow('arteries', allParts.filter((p) => p.anim === ANIM.artery), seedSphere(aorticValve, 0.03), 0.005, aorticValve);
runFlow('pulmonary arteries', allParts.filter((p) => p.anim === ANIM.pulmArtery), seedSphere(pulmValve, 0.035), 0.007, pulmValve);
runFlow('veins', allParts.filter((p) => p.anim === ANIM.vein), seedSphere(rightAtrium, 0.045), 0.005, rightAtrium);
runFlow('pulmonary veins', allParts.filter((p) => p.anim === ANIM.pulmVein), seedSphere(leftAtrium, 0.05), 0.007, leftAtrium);
{
  const isCNS = (p) => p.groups[0] === 'Brain' || p.groups[0] === 'Spinal cord';
  const members = allParts.filter((p) => p.sys === 'nerves' && (p.anim === ANIM.nerve || isCNS(p)));
  const cns = new Set(members.filter(isCNS).map((p) => p.id));
  runFlow('nerves', members, (x, y, z, part) => (cns.has(part.id) ? 0 : Infinity), 0.005);
  for (const p of members) if (cns.has(p.id)) flowOf.delete(p.id);
}
{
  const gut = allParts.filter((p) => p.anim === ANIM.gut || p.anim === ANIM.stomach);
  const oes = gut.filter((p) => /oesophagus/i.test(p.name));
  const top = oes.length ? Math.max(...oes.map((p) => p.mx[1])) : 1.5;
  runFlow('gut', gut, (x, y, z, part) => (/oesophagus/i.test(part.name) && y > top - 0.01 ? 0 : Infinity), 0.008);
}
{
  const air = allParts.filter((p) => p.anim === ANIM.airway);
  const tr = air.filter((p) => /trachea/i.test(p.name));
  const top = tr.length ? Math.max(...tr.map((p) => p.mx[1])) : 1.45;
  const trTop = tr.length ? [0, top, tr[0].c[2]] : [0, 1.45, 0];
  runFlow('airway', air, (x, y, z, part) => (/trachea/i.test(part.name) && y > top - 0.008 ? 0 : Infinity), 0.007, trTop);
}
runFlow('urinary', allParts.filter((p) => p.anim === ANIM.urinary || p.anim === ANIM.bladder), (x, y, z, part) => (/renal pelvis/i.test(part.name) ? 0 : Infinity), 0.006);

// Base geometry (decimated) and hi packs
function simplified(p) {
  const I = p.mesh.I;
  if (p.ratio >= 0.999 || I.length < 600) return I;
  const target = Math.max(60, Math.floor((I.length * p.ratio) / 3) * 3);
  const [out] = MeshoptSimplifier.simplify(I, p.mesh.P, 3, target, 0.002, ['LockBorder']);
  return out.length >= 36 ? out : I;
}
const SYS_IDS = [...new Set(allParts.map((p) => p.sys))];
for (const sys of SYS_IDS) {
  const ps = allParts.filter((p) => p.sys === sys);
  const info = writePack(`${OUT}/base/${sys}.mvb`, ps.map((p) => ({ id: p.id, mesh: p.mesh, I: simplified(p), flow: flowOf.get(p.id) })));
  manifest.systems.push({ id: sys, file: `base/${sys}.mvb`, ...info });
  console.log(`base ${sys}: verts ${info.vCount}, tris ${info.iCount / 3}, ${(info.bytes / 1e6).toFixed(2)} MB`);
  for (const r of PACK_REGIONS) {
    const rp = ps.filter((p) => p.region === r && p.ratio < 0.999);
    if (!rp.length) continue;
    const pinfo = writePack(`${OUT}/hi/${sys}-${r}.mvb`, rp.map((p) => ({ id: p.id, mesh: p.mesh, I: p.mesh.I, flow: flowOf.get(p.id) })));
    manifest.packs.push({ id: `${sys}-${r}`, sys, region: r, file: `hi/${sys}-${r}.mvb`, parts: rp.map((p) => p.id), ...pinfo });
  }
}
let hiBytes = 0; for (const pk of manifest.packs) hiBytes += pk.bytes;
console.log('hi packs', manifest.packs.length, (hiBytes / 1e6).toFixed(1), 'MB');

const r4 = (v) => +v.toFixed(4);
const FEMALE_OFFSET = { 'Urinary bladder': [0, -0.006, 0.012], 'Sigmoid colon': [0, 0.004, -0.01] };
manifest.partFields = ['id', 'sys', 'name', 'side', 'groups', 'center', 'extent', 'hidden', 'sex', 'anim', 'pivot', 'axis', 'region', 'flags', 'femaleOffset'];
manifest.parts = allParts.map((p) => [p.id, p.sys, p.name, p.side, p.groups.join('>'), p.c.map(r4), p.ext.map(r4), p.hidden ? 1 : 0, p.sex, p.anim, p.pivot.map(r4), p.axis.map((v) => +v.toFixed(3)), p.region, p.noBulge || 0, (FEMALE_OFFSET[p.name] || [0, 0, 0])]);
manifest.landmarks = { aorticValve, pulmValve, rightAtrium, leftAtrium };
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
let baseBytes = 0; for (const s of manifest.systems) baseBytes += s.bytes;
console.log('parts', allParts.length, 'base total', (baseBytes / 1e6).toFixed(1), 'MB', 'manifest', fs.statSync(`${OUT}/manifest.json`).size);
