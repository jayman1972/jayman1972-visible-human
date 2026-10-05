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
import { VULVA } from '../app/src/warp.js';
import { makeFemaleTransfer, smoothField, REG } from './mhfemale.mjs';
import { liftPatch } from './pudlift.mjs';

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
    // clear media (lens, vitreous, cornea): dark and glassy, so the pupil reads black
    case 'Cornea': return R(n === 'vitreous body' ? [44, 52, 58] : [20, 24, 28], 0.04, T.cornea);
    case 'Iris': return n === 'retina' ? R([206, 122, 104], 0.4, T.organ) : R([96, 122, 140], 0.3, T.eye); // the iris pattern is painted in the shader
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
// The aqueous chamber is clear in life (drawn opaque it clouds the iris) and the zonular fibres sit behind the iris; both start hidden.
const HIDDEN_DEFAULT = /^(Anterior chamber of eyeball|Zonular fibres|Pleura|Pericardium|Greater omentum|Lesser omentum|Mesocolon|Spinal dura|Falx cerebri|Tentorium cerebelli|Choroid plexus|Arachnoid|Cranial dura|.*bursa)/i;
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
// Skin chunks also carry a female stream: offset to the female shape (int16, 0.1 mm) + female normal (oct)
const FEM_STRIDE = 8;
function writePack(path, chunks, { femNormals = false } = {}) {
  let vCount = 0, iCount = 0;
  const hasFem = chunks.some((c) => c.femD);
  const prepared = [];
  for (const ch of chunks) {
    const { mesh, I, id } = ch;
    const remap = new Int32Array(mesh.P.length / 3).fill(-1);
    const used = [];
    const I2 = new Uint32Array(I.length);
    for (let k = 0; k < I.length; k++) { let r = remap[I[k]]; if (r < 0) { r = remap[I[k]] = used.length; used.push(I[k]); } I2[k] = r; }
    prepared.push({ mesh, used, I2, id, flow: ch.flow, femD: ch.femD, femN: ch.femN });
    vCount += used.length; iCount += I2.length;
  }
  const vb = new ArrayBuffer(vCount * STRIDE);
  const dv = new DataView(vb);
  const fb = hasFem ? new ArrayBuffer(vCount * FEM_STRIDE) : null, fdv = fb && new DataView(fb);
  const ib = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const { mesh, used, I2, id, flow, femD, femN } of prepared) {
    for (let k = 0; k < used.length; k++) {
      const s = used[k], o = (vo + k) * STRIDE;
      if (fdv) {
        const fo = (vo + k) * FEM_STRIDE;
        for (let a = 0; a < 3; a++) fdv.setInt16(fo + a * 2, femD ? Math.max(-32767, Math.min(32767, Math.round(femD[s * 3 + a] * 1e4))) : 0, true);
        const [fu, fv] = !femNormals ? [0, 0] : femN ? octEncode(femN[s * 3], femN[s * 3 + 1], femN[s * 3 + 2]) : octEncode(mesh.N[s * 3], mesh.N[s * 3 + 1], mesh.N[s * 3 + 2]);
        fdv.setInt8(fo + 6, fu); fdv.setInt8(fo + 7, fv);
      }
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
  const encF = fb ? MeshoptEncoder.encodeVertexBuffer(new Uint8Array(fb), vCount, FEM_STRIDE) : new Uint8Array(0);
  const raw = new Uint8Array(encV.length + encI.length + encF.length);
  raw.set(encV, 0); raw.set(encI, encV.length); raw.set(encF, encV.length + encI.length);
  const gz = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(path, gz);
  return { vCount, iCount, vBytes: encV.length, iBytes: encI.length, ...(fb ? { femBytes: encF.length, femAbs: femNormals ? 1 : 0 } : {}), bytes: gz.length };
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
    });
    kept++;
  }
  console.log(`${sys.id}: kept ${kept}, dropped ${dropped}`);
}

// ---------------------------------------------------------------------------
// Female body shape. MakeHuman's average adult male -> female difference (CC0 data), fitted to
// this body (see mhfemale.mjs). Skin gets an exact per-vertex offset; everything inside follows a
// smooth 3D offset field (breast tissue masked out so the ribs don't bulge with the breasts).
// ---------------------------------------------------------------------------
const ARM_RE = /^(Deltoid region|Anterior region of arm|Posterior region of arm|Lateral bicipital groove|Medial bicipital groove|Palm|Dorsum of hand|Palmar surfaces of digits of hand|Dorsal surfaces of digits of hand|Nail plate|Perionyx|Anterior region of elbow|Cubital fossa|Posterior region of elbow|Posterior region of forearm|Lateral border of forearm|Medial border of forearm|Anterior region of forearm|Anterior region of wrist|Posterior region of wrist|Radial foveola)$/;
const LEG_RE = /(thigh|Femoral triangle|knee|Popliteal|malleol|ankle|retromalleolar|^Sole$|arch of foot|Metatarsal|Hallucial|Heel|Dorsum of foot|border of foot|digits of foot|\(foot\)|region of leg)/;
const skinRegion = (name, x) => { const L = x >= 0; return ARM_RE.test(name) ? (L ? REG.armL : REG.armR) : LEG_RE.test(name) ? (L ? REG.legL : REG.legR) : REG.axial; };
const maleSkin = () => allParts.filter((p) => p.sys === 'skin' && p.sex !== 1 && !p.femSpace && !/hair/i.test(p.name) && !/^Urogenital region$/.test(p.name));
// 1) refine the skin where the female shape bends it sharply (breasts, groin) before measuring it
{
  const zones = [
    (q) => Math.abs(q[0]) < 0.07 && q[1] > 0.71 && q[1] < 0.93 && q[2] > -0.04,
    (q) => Math.abs(q[0]) < 0.2 && q[1] > 1.08 && q[1] < 1.42 && q[2] > 0.0,
  ];
  const inZone = (q) => zones.some((z) => z(q));
  const split = (maxLen) => (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > maxLen && (inZone(a) || inZone(b) || inZone([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]));
  let before = 0, after = 0;
  for (const p of maleSkin()) {
    const groin = !(p.mx[1] < 0.71 || p.mn[1] > 0.93 || p.mn[0] > 0.07 || p.mx[0] < -0.07);
    const chest = !(p.mx[1] < 1.08 || p.mn[1] > 1.42 || p.mn[0] > 0.2 || p.mx[0] < -0.2 || p.mx[2] < 0);
    if (!groin && !chest) continue;
    before += p.mesh.I.length / 3;
    for (const maxLen of [0.007, 0.0035]) p.mesh = refineMesh(p.mesh, split(maxLen));
    after += p.mesh.I.length / 3;
  }
  console.log(`skin refine: ${before} -> ${after} tris`);
}
// 2) fit MakeHuman to this body
const fem = {};
{
  const bone = (name) => { const p = allParts.find((q) => q.sys === 'skeleton' && q.name === name && q.side === 'L'); const P = p.mesh.P, out = []; for (let k = 0; k < P.length; k += 3) out.push([P[k], P[k + 1], P[k + 2]]); return out; };
  const endC = (P, top, frac) => { let mn = Infinity, mx = -Infinity; for (const q of P) { mn = Math.min(mn, q[1]); mx = Math.max(mx, q[1]); } const h = mx - mn; const sel = P.filter((q) => (top ? q[1] > mx - h * frac : q[1] < mn + h * frac)); return [0, 1, 2].map((a) => sel.reduce((t, q) => t + q[a], 0) / sel.length); };
  const hum = bone('Humerus'), rad = bone('Radius'), fem_ = bone('Femur'), tib = bone('Tibia');
  const joints = { shoulder: endC(hum, true, 0.07), elbow: endC(hum, false, 0.06), wrist: endC(rad, false, 0.04), hip: endC(fem_, true, 0.06), knee: endC(fem_, false, 0.05), ankle: endC(tib, false, 0.04) };
  const P = [], N = [], R = [];
  let top = 0;
  for (const p of maleSkin()) {
    if (/^(Eyebrow|Nail plate|Perionyx|Nail plate \(foot\)|Perionyx \(foot\))$/.test(p.name)) continue;
    const M = p.mesh;
    for (let k = 0; k < M.P.length; k += 3) { P.push([M.P[k], M.P[k + 1], M.P[k + 2]]); N.push([M.N[k], M.N[k + 1], M.N[k + 2]]); R.push(skinRegion(p.name, M.P[k])); top = Math.max(top, M.P[k + 1]); }
  }
  fem.joints = joints;
  fem.T = makeFemaleTransfer({ joints, height: top, skin: { P, N, R } }, { age: 30, breastSize: 0.78, breastFirmness: 0.45, weight: 0.55, heightRatio: 0.94 });
}
// per-vertex skin offsets (continuous across the skin's many pieces)
function computeSkinField(parts) {
  let n = 0; for (const p of parts) n += p.mesh.P.length / 3;
  const P = new Float64Array(n * 3), D = new Float64Array(n * 3), B = new Float32Array(n), tris = [], free = new Uint8Array(n), regionOfV = new Uint8Array(n);
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
  for (const p of parts) { const m = p.mesh.P.length / 3; p.femD = Float32Array.from(D.subarray(p._fo * 3, (p._fo + m) * 3)); p.femB = B.slice(p._fo, p._fo + m); }
  if (miss) console.log(`  ${miss} skin vertices without a MakeHuman match`);
}
computeSkinField(maleSkin());
// 3) smooth offset field for everything inside the body (3D grid, 2 cm)
{
  const F = { min: [-0.42, -0.05, -0.21], cell: 0.015, dims: [57, 122, 28] };
  const pts = [];
  for (const p of maleSkin()) { const P = p.mesh.P; for (let k = 0; k < P.length / 3; k++) pts.push([P[k * 3], P[k * 3 + 1], P[k * 3 + 2], p.femD[k * 3], p.femD[k * 3 + 1], p.femD[k * 3 + 2], (1 - p.femB[k]) ** 2]); }
  const hash = (list, cell) => { const m = new Map(); for (const q of list) { const k = Math.floor(q[0] / cell) + ',' + Math.floor(q[1] / cell) + ',' + Math.floor(q[2] / cell); (m.get(k) || m.set(k, []).get(k)).push(q); } return { m, cell }; };
  const near = (h, c, r, fn) => { const n = Math.ceil(r / h.cell), gx = Math.floor(c[0] / h.cell), gy = Math.floor(c[1] / h.cell), gz = Math.floor(c[2] / h.cell); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) { const a = h.m.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)); if (a) for (const q of a) fn(q); } };
  const hNear = hash(pts, 0.02), hFar = hash(pts.filter((_, i) => i % 3 === 0), 0.04), hWide = hash(pts.filter((_, i) => i % 9 === 0), 0.09);
  const [nx, ny, nz] = F.dims, data = new Float32Array(nx * ny * nz * 3);
  const gauss = (h, c, sig) => { let sw = 0, sx = 0, sy = 0, sz = 0; const s2 = sig * sig; near(h, c, sig * 3, (q) => { const d2 = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2; const w = Math.exp(-d2 / s2) * q[6]; sw += w; sx += w * q[3]; sy += w * q[4]; sz += w * q[5]; }); return [sw, sx, sy, sz]; };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = [F.min[0] + (i + 0.5) * F.cell, F.min[1] + (j + 0.5) * F.cell, F.min[2] + (k + 0.5) * F.cell];
    // near the skin: inverse-distance (4th power) over skin within 4 cm, so it follows the closest skin
    let dmin = Infinity, nw = 0, n0 = 0, n1 = 0, n2 = 0;
    near(hNear, c, 0.04, (q) => { const d = Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]); if (d > 0.04) return; if (d < dmin) dmin = d; const w = q[6] / (d ** 4 + 1.6e-9); nw += w; n0 += w * q[3]; n1 += w * q[4]; n2 += w * q[5]; });
    // deeper: a smooth average (opposite sides of a limb average to its overall shift)
    let [sw, sx, sy, sz] = gauss(hFar, c, 0.04);
    if (sw < 0.05) { const b = gauss(hWide, c, 0.1); const t = sw / 0.05; sw += b[0] * (1 - t); sx += b[1] * (1 - t); sy += b[2] * (1 - t); sz += b[3] * (1 - t); }
    const far = sw > 1e-9 ? [sx / sw, sy / sw, sz / sw] : [0, 0, 0];
    const t0 = nw > 0 ? Math.min(1, Math.max(0, (dmin - 0.008) / 0.03)) : 1, t = t0 * t0 * (3 - 2 * t0);
    const o = ((k * ny + j) * nx + i) * 3;
    for (let a = 0; a < 3; a++) data[o + a] = (nw > 0 ? [n0, n1, n2][a] / nw : 0) * (1 - t) + far[a] * t;
  }
  fem.F = F; fem.field = data;
  fem.at = (p) => { // trilinear, clamped (matches the GPU's linear filtering of the 3D texture)
    const f = [0, 1, 2].map((a) => Math.min(F.dims[a] - 1.0001, Math.max(0, (p[a] - F.min[a]) / F.cell - 0.5)));
    const i0 = f.map(Math.floor), t = f.map((v, a) => v - i0[a]);
    const out = [0, 0, 0];
    for (let c = 0; c < 8; c++) {
      const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
      const w = (di ? t[0] : 1 - t[0]) * (dj ? t[1] : 1 - t[1]) * (dk ? t[2] : 1 - t[2]);
      const ii = Math.min(F.dims[0] - 1, i0[0] + di), jj = Math.min(F.dims[1] - 1, i0[1] + dj), kk = Math.min(F.dims[2] - 1, i0[2] + dk);
      const o = ((kk * ny + jj) * nx + ii) * 3; out[0] += w * data[o]; out[1] += w * data[o + 1]; out[2] += w * data[o + 2];
    }
    return out;
  };
  console.log(`female field: ${nx}x${ny}x${nz} grid (${F.cell * 100} cm) from ${pts.length} skin samples`);
}
// 4) female-space samplers for building the breasts: skin height (front), chest muscle height,
//    and each breast's footprint (MakeHuman's breast bone weights)
{
  const torso = maleSkin().filter((p) => skinRegion(p.name, 0) === REG.axial && !/Deltoid/.test(p.name));
  const C = 0.004, x0 = -0.26, y0 = 1.0, nx = 130, ny = 125;
  const heightField = (sets) => {
    const g = new Float32Array(nx * ny).fill(-1);
    for (const P of sets) for (let k = 0; k < P.length; k += 3) { const i = Math.floor((P[k] - x0) / C), j = Math.floor((P[k + 1] - y0) / C); if (i < 0 || j < 0 || i >= nx || j >= ny || P[k + 2] < 0) continue; g[j * nx + i] = Math.max(g[j * nx + i], P[k + 2]); }
    for (let it = 0; it < 60; it++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (g[j * nx + i] >= 0) continue; let t = 0, n = 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const v = g[b * nx + a]; if (v >= 0) { t += v; n++; } } if (n) g[j * nx + i] = t / n; }
    for (let it = 0; it < 2; it++) { const h = g.slice(); for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { let t = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) t += h[(j + dj) * nx + i + di]; g[j * nx + i] = t / 9; } }
    return (x, y) => { const fi = (x - x0) / C - 0.5, fj = (y - y0) / C - 0.5; const i = Math.max(0, Math.min(nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(ny - 2, Math.floor(fj))); const u = Math.min(1, Math.max(0, fi - i)), v = Math.min(1, Math.max(0, fj - j)); const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i], d = g[(j + 1) * nx + i + 1]; return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; };
  };
  const femP = (p) => { const P = p.mesh.P, out = new Float32Array(P.length); for (let k = 0; k < P.length; k++) out[k] = P[k] + p.femD[k]; return out; };
  fem.skinZf = heightField(torso.map(femP));
  const musc = allParts.filter((p) => p.sys === 'muscles' && /pectoralis|serratus anterior|external abdominal oblique|rectus abdominis|latissimus/i.test(p.name));
  const muscZ0 = heightField(musc.map((p) => { const P = p.mesh.P, out = new Float32Array(P.length); for (let k = 0; k < P.length; k += 3) { const d = fem.at([P[k], P[k + 1], P[k + 2]]); out[k] = P[k] + d[0]; out[k + 1] = P[k + 1] + d[1]; out[k + 2] = P[k + 2] + d[2]; } return out; }));
  fem.muscleZf = (x, y) => Math.min(muscZ0(x, y), fem.skinZf(x, y) - 0.006);
  fem.breast = {};
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1; let mn = [1e9, 1e9], mx = [-1e9, -1e9], apex = null;
    for (const p of torso) { const P = p.mesh.P; for (let k = 0; k < P.length / 3; k++) { if (p.femB[k] < 0.35) continue; const x = P[k * 3] + p.femD[k * 3], y = P[k * 3 + 1] + p.femD[k * 3 + 1], z = P[k * 3 + 2] + p.femD[k * 3 + 2]; if (x * s < 0.02) continue; mn = [Math.min(mn[0], x), Math.min(mn[1], y)]; mx = [Math.max(mx[0], x), Math.max(mx[1], y)]; if (!apex || z > apex[2]) apex = [x, y, z]; } }
    fem.breast[side] = { cx: (mn[0] + mx[0]) / 2, cy: (mn[1] + mx[1]) / 2, rx: (mx[0] - mn[0]) / 2, ryUp: mx[1] - (mn[1] + mx[1]) / 2, ryDown: (mn[1] + mx[1]) / 2 - mn[1], apex };
    console.log(`breast ${side}: centre ${fem.breast[side].cx.toFixed(3)},${fem.breast[side].cy.toFixed(3)} half-width ${(fem.breast[side].rx * 100).toFixed(1)} cm, apex ${apex.map((v) => v.toFixed(3))}`);
  }
}

// Female-only parts (modeled) and their metadata
{
  const skinParts = allParts.filter((p) => p.sys === 'skin');
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
  const fparts = femaleParts({ skinZf: fem.skinZf, muscleZf: fem.muscleZf, breast: fem.breast, urogenitalSkin, vesselPaths, otherSkin, pudendal });
  fem.apex = fparts.apex;
  for (const fp of fparts) {
    const mesh = weldPart(fp.prims, fp.sys, fp.name);
    if (mesh.I.length < 3) continue;
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < mesh.P.length; k += 3) for (let a = 0; a < 3; a++) { const v = mesh.P[k + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    const mainCat = cat(fp.prims[0].mat);
    const anim = typeof fp.anim === 'string' ? FANIM[fp.anim] : fp.sys === 'vessels' ? (mainCat === 'Vein' ? ANIM.vein : ANIM.artery) : undefined;
    allParts.push({ id: gid++, sys: fp.sys, name: fp.name, side: fp.side || null, groups: fp.groups, mesh, mn, mx, c: mn.map((v, i) => (v + mx[i]) / 2), ext: mx.map((v, i) => v - mn[i]), mainCat, ratio: fp.sys === 'skin' ? 1.0 : 0.6, hidden: false, sex: 2, anim, femSpace: !!fp.femSpace, pg: fp.pg || 0 });
  }
  console.log('female parts', allParts.filter((p) => p.sex === 2).length);
  // Ken mode: hide the male genital skin and every structure that reaches outside the smooth crotch
  ug.forEach((p) => { p.pg = 1; });
  if (fparts.protrudes) {
    const flagged = [];
    for (const p of allParts) {
      if (p.sys === 'skin' || p.sex === 2) continue;
      if (p.mx[1] < 0.66 || p.mn[1] > 0.88 || p.mn[0] > 0.06 || p.mx[0] < -0.06) continue;
      const P = p.mesh.P, n = P.length / 3; let k = 0;
      for (let i = 0; i < P.length; i += 3) if (fparts.protrudes([P[i], P[i + 1], P[i + 2]])) k++;
      if (k >= 6 && k / n >= 0.01) { p.pg = 1; flagged.push(`${p.sys}:${p.name}${p.side ? '.' + p.side : ''} (${(100 * k / n).toFixed(0)}%)`); }
    }
    console.log('ken mode hides', flagged.length, 'parts:', flagged.join(', '));
  }
}

// ---------------------------------------------------------------------------
// Female shape for the new parts: the pudendal skin patch takes per-vertex offsets with the rest
// of the skin; the female-only organs are moved into the female shape here (near the skin they
// follow the skin's offsets, deeper inside the smooth field) and drawn as-is at runtime.
// ---------------------------------------------------------------------------
computeSkinField(maleSkin());
// The pudendal fill spans the hole the male genitals leave, which dips well below the crotch.
// In the female body it is pulled in (toward the cleft's axis) onto MakeHuman's female crotch,
// tapering to zero at its rim, so the thighs close around the cleft as they do in a woman.
{
  const patch = allParts.find((p) => p.sys === 'skin' && p.name === 'Pudendal region');
  if (patch) {
    // its outer edge (tucked 1-3 mm under the neighbouring skin, not welded to it) takes the
    // neighbours' offsets; the inside is a harmonic fill from that edge
    const M = patch.mesh, n = M.P.length / 3, D = patch.femD;
    const cnt = new Map();
    for (let t = 0; t < M.I.length; t += 3) for (const [u, v] of [[M.I[t], M.I[t + 1]], [M.I[t + 1], M.I[t + 2]], [M.I[t + 2], M.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
    const rim = new Set(); for (const [k, c] of cnt) if (c === 1) { const [u, v] = k.split(':'); rim.add(+u); rim.add(+v); }
    const nbs = maleSkin().filter((p) => p !== patch && p.mx[1] > 0.66 && p.mn[1] < 0.95 && Math.abs(p.c[0]) < 0.25);
    let snapped = 0;
    for (const i of rim) {
      const q = [M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2]]; let W = 0; const acc = [0, 0, 0];
      for (const o of nbs) { const P = o.mesh.P; for (let k = 0; k < P.length; k += 3) { const d = Math.hypot(P[k] - q[0], P[k + 1] - q[1], P[k + 2] - q[2]); if (d > 0.008) continue; const w = 1 / (d ** 2 + 1e-7); W += w; for (let a = 0; a < 3; a++) acc[a] += w * o.femD[k + a]; } }
      if (W) { for (let a = 0; a < 3; a++) D[i * 3 + a] = acc[a] / W; snapped++; }
    }
    const adj = Array.from({ length: n }, () => new Set());
    for (let t = 0; t < M.I.length; t += 3) { const a = M.I[t], b = M.I[t + 1], c = M.I[t + 2]; adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
    for (let it = 0; it < 1500; it++) for (let i = 0; i < n; i++) { if (rim.has(i) || !adj[i].size) continue; for (let a = 0; a < 3; a++) { let s0 = 0; for (const j of adj[i]) s0 += D[j * 3 + a]; D[i * 3 + a] = s0 / adj[i].size; } }
    console.log(`pudendal patch: edge snapped to its neighbours at ${snapped} of ${rim.size} vertices`);
    patch.femD0 = Float64Array.from(D);
    const L = liftPatch(patch, fem.T.female, fem.T.tris);
    patch.liftD = new Float64Array(D.length); for (let k = 0; k < D.length; k++) patch.liftD[k] = D[k] - patch.femD0[k];
    console.log(`pudendal patch: pulled onto the female crotch, ${L.hits} of ${L.n} vertices, up to ${(L.maxMove * 100).toFixed(1)} cm`);
  }
}
// Female offset for anything inside the body: near the skin it follows the closest skin (inverse
// distance over the skin of that body region, so a finger follows its own finger and not the
// thigh beside it); deeper it blends into the smooth field. Breast skin is ignored (weight).
const femInside = (() => {
  const S = [];
  // (the pudendal patch enters with its offsets from before it was pulled in; that move is added
  // separately below, to everything near it)
  for (const p of maleSkin()) { const P = p.mesh.P, D = p.femD0 || p.femD; for (let k = 0; k < P.length / 3; k++) S.push({ x: P[k * 3], y: P[k * 3 + 1], z: P[k * 3 + 2], d: [D[k * 3], D[k * 3 + 1], D[k * 3 + 2]], w: (1 - p.femB[k]) ** 2, r: skinRegion(p.name, P[k * 3]), patch: p.sex === 2 }); }
  const lifted = allParts.find((p) => p.liftD), LC = 0.01, LG = new Map();
  if (lifted) { const P = lifted.mesh.P; for (let k = 0; k < P.length / 3; k++) { const key = Math.floor(P[k * 3] / LC) + ',' + Math.floor(P[k * 3 + 1] / LC) + ',' + Math.floor(P[k * 3 + 2] / LC); (LG.get(key) || LG.set(key, []).get(key)).push(k); } }
  // the patch's pull, carried by whatever lies within 1.5 cm of it and fading out by 4.5 cm
  const liftAt = (q) => {
    if (!lifted || Math.abs(q[0]) > 0.09 || q[1] < 0.62 || q[1] > 0.95 || q[2] < -0.1) return null;
    const P = lifted.mesh.P, gx = Math.floor(q[0] / LC), gy = Math.floor(q[1] / LC), gz = Math.floor(q[2] / LC);
    let bd = 0.045, bk = -1;
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) for (let k = -5; k <= 5; k++) for (const v of LG.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) { const d = Math.hypot(P[v * 3] - q[0], P[v * 3 + 1] - q[1], P[v * 3 + 2] - q[2]); if (d < bd) { bd = d; bk = v; } }
    if (bk < 0) return null;
    const t = Math.min(1, Math.max(0, (bd - 0.015) / 0.03)), f = 1 - t * t * (3 - 2 * t), L = lifted.liftD;
    return f > 0 ? [L[bk * 3] * f, L[bk * 3 + 1] * f, L[bk * 3 + 2] * f] : null;
  };
  const C = 0.01, o = [-0.45, -0.06, -0.24], dims = [90, 190, 48], cells = dims[0] * dims[1] * dims[2];
  const cellOf = (x, y, z) => { const i = Math.floor((x - o[0]) / C), j = Math.floor((y - o[1]) / C), k = Math.floor((z - o[2]) / C); return i < 0 || j < 0 || k < 0 || i >= dims[0] || j >= dims[1] || k >= dims[2] ? -1 : (k * dims[1] + j) * dims[0] + i; };
  const start = new Int32Array(cells + 1);
  for (const s of S) { const c = cellOf(s.x, s.y, s.z); if (c >= 0) start[c + 1]++; }
  for (let c = 0; c < cells; c++) start[c + 1] += start[c];
  const fill = start.slice(0, cells), idx = new Int32Array(start[cells]);
  S.forEach((s, n) => { const c = cellOf(s.x, s.y, s.z); if (c >= 0) idx[fill[c]++] = n; });
  // cells with skin within 3 cells (Chebyshev), to skip deep points quickly
  let near = new Uint8Array(cells); for (let c = 0; c < cells; c++) near[c] = start[c + 1] > start[c] ? 1 : 0;
  for (let ax = 0; ax < 3; ax++) for (let pass = 0; pass < 3; pass++) {
    const nb = near.slice(), st = ax === 0 ? 1 : ax === 1 ? dims[0] : dims[0] * dims[1];
    for (let c = 0; c < cells; c++) { if (nb[c]) continue; const i = ax === 0 ? c % dims[0] : ax === 1 ? Math.floor(c / dims[0]) % dims[1] : Math.floor(c / (dims[0] * dims[1])); const n = dims[ax]; if ((i > 0 && nb[c - st]) || (i < n - 1 && nb[c + st])) near[c] = 1; }
  }
  const scan = (q, R, fn) => {
    const i0 = Math.floor((q[0] - o[0]) / C), j0 = Math.floor((q[1] - o[1]) / C), k0 = Math.floor((q[2] - o[2]) / C);
    for (let k = Math.max(0, k0 - R); k <= Math.min(dims[2] - 1, k0 + R); k++) for (let j = Math.max(0, j0 - R); j <= Math.min(dims[1] - 1, j0 + R); j++) for (let i = Math.max(0, i0 - R); i <= Math.min(dims[0] - 1, i0 + R); i++) {
      const c = (k * dims[1] + j) * dims[0] + i; for (let m = start[c]; m < start[c + 1]; m++) fn(S[idx[m]]);
    }
  };
  // residual (female offset minus the field) at a male-space point; null when it is the field
  const skinFollow = (q, withPatch) => {
    const c = cellOf(q[0], q[1], q[2]); if (c < 0 || !near[c]) return null;
    let dmin = Infinity, nr = null;
    const nearest = (s) => { if (s.patch && !withPatch) return; const d = Math.hypot(s.x - q[0], s.y - q[1], s.z - q[2]); if (d < dmin) { dmin = d; nr = s; } };
    scan(q, 1, nearest); if (dmin > C) scan(q, 3, nearest);
    if (!nr || dmin > 0.025) return null;
    const rI = Math.min(0.03, 2 * dmin + 0.004);
    let W = 0, W0 = 0; const acc = [0, 0, 0];
    scan(q, Math.ceil(rI / C), (s) => {
      if ((s.patch && !withPatch) || s.r !== nr.r) return;
      const d = Math.hypot(s.x - q[0], s.y - q[1], s.z - q[2]); if (d > rI) return;
      const w0 = 1 / (d ** 4 + 1.6e-11), w = w0 * s.w; W0 += w0; W += w; acc[0] += w * s.d[0]; acc[1] += w * s.d[1]; acc[2] += w * s.d[2];
    });
    if (W <= 0.05 * W0) return null; // breast skin: the body underneath keeps the field
    const f = fem.at(q), t0 = Math.min(1, Math.max(0, (dmin - 0.004) / 0.021)), k = 1 - t0 * t0 * (3 - 2 * t0);
    return [(acc[0] / W - f[0]) * k, (acc[1] / W - f[1]) * k, (acc[2] / W - f[2]) * k];
  };
  return (q, withPatch = false) => {
    const a = skinFollow(q, withPatch), b = liftAt(q);
    return a && b ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : a || b;
  };
})();
{
  let moved = 0;
  for (const p of allParts) {
    if (p.sex !== 2 || p.femSpace || p.sys === 'skin' || p.pg === 2) continue; // pg 2: shown in both doll bodies, so kept in male space
    const P = p.mesh.P;
    for (let k = 0; k < P.length; k += 3) {
      const q = [P[k], P[k + 1], P[k + 2]], dField = fem.at(q), res = femInside(q, true);
      for (let a = 0; a < 3; a++) P[k + a] += dField[a] + (res ? res[a] : 0);
    }
    p.femSpace = true; moved++;
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < P.length; k += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[k + a]); mx[a] = Math.max(mx[a], P[k + a]); }
    p.mn = mn; p.mx = mx; p.c = mn.map((v, i) => (v + mx[i]) / 2); p.ext = mx.map((v, i) => v - mn[i]);
  }
  console.log(`female-only organs moved into the female shape: ${moved}`);
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
  // female skin normals: from the offset positions, blended across piece borders the same way
  {
    const parts = maleSkin();
    for (const p of parts) {
      const M = p.mesh, n = M.P.length / 3, Pf = new Float64Array(n * 3), Nf = new Float32Array(n * 3);
      for (let k = 0; k < n * 3; k++) Pf[k] = M.P[k] + p.femD[k];
      for (let t = 0; t < M.I.length; t += 3) {
        const a = M.I[t] * 3, b = M.I[t + 1] * 3, c = M.I[t + 2] * 3;
        const ux = Pf[b] - Pf[a], uy = Pf[b + 1] - Pf[a + 1], uz = Pf[b + 2] - Pf[a + 2], vx = Pf[c] - Pf[a], vy = Pf[c + 1] - Pf[a + 1], vz = Pf[c + 2] - Pf[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (const o of [a, b, c]) { Nf[o] += nx; Nf[o + 1] += ny; Nf[o + 2] += nz; }
      }
      for (let k = 0; k < n; k++) { const l = Math.hypot(Nf[k * 3], Nf[k * 3 + 1], Nf[k * 3 + 2]) || 1; for (let a = 0; a < 3; a++) Nf[k * 3 + a] /= l; }
      p.femN = Nf;
    }
    const g = new Map(), key = (x, y, z) => Math.round(x * 2e4) + ',' + Math.round(y * 2e4) + ',' + Math.round(z * 2e4);
    for (const p of parts) { const P = p.mesh.P; for (let k = 0; k < P.length / 3; k++) { const kk = key(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); (g.get(kk) || g.set(kk, []).get(kk)).push([p, k]); } }
    let blended = 0;
    for (const list of g.values()) {
      if (list.length < 2) continue;
      const [p0, k0] = list[0], n0 = [p0.femN[k0 * 3], p0.femN[k0 * 3 + 1], p0.femN[k0 * 3 + 2]], acc = [0, 0, 0];
      const ok = list.filter(([p, k]) => p.femN[k * 3] * n0[0] + p.femN[k * 3 + 1] * n0[1] + p.femN[k * 3 + 2] * n0[2] > 0.5);
      for (const [p, k] of ok) for (let a = 0; a < 3; a++) acc[a] += p.femN[k * 3 + a];
      const l = Math.hypot(...acc) || 1;
      for (const [p, k] of ok) for (let a = 0; a < 3; a++) p.femN[k * 3 + a] = acc[a] / l;
      blended++;
    }
    console.log(`female skin normals: ${blended} shared vertices blended`);
  }
  // The pudendal fill meets its neighbours at a slight crease: feather its normals toward the
  // neighbouring skin over ~12 mm so it shades as one surface (it is a smooth doll crotch in Ken mode).
  {
    const patch = allParts.find((p) => p.sys === 'skin' && p.name === 'Pudendal region');
    if (patch) {
      const M = patch.mesh, cnt = new Map();
      for (let t = 0; t < M.I.length; t += 3) for (const [u, v] of [[M.I[t], M.I[t + 1]], [M.I[t + 1], M.I[t + 2]], [M.I[t + 2], M.I[t]]]) { const k = u < v ? u + ':' + v : v + ':' + u; cnt.set(k, (cnt.get(k) || 0) + 1); }
      const border = new Set(); for (const [k, n] of cnt) if (n === 1) { const [u, v] = k.split(':'); border.add(+u); border.add(+v); }
      const others = allParts.filter((p) => p.sys === 'skin' && p !== patch && p.sex !== 1 && p.mx[1] > 0.66 && p.mn[1] < 0.95 && Math.abs(p.c[0]) < 0.2);
      const bpts = [];
      for (const i of border) {
        const q = [M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2]]; let best = null, bd = 0.004;
        for (const o of others) { const P = o.mesh.P; for (let k = 0; k < P.length; k += 3) { const d = Math.hypot(P[k] - q[0], P[k + 1] - q[1], P[k + 2] - q[2]); if (d < bd) { bd = d; best = [o.mesh.N[k], o.mesh.N[k + 1], o.mesh.N[k + 2]]; } } }
        if (best) bpts.push({ q, n: best });
      }
      for (let i = 0; i < M.P.length / 3; i++) {
        let bd = Infinity, bn = null;
        for (const b of bpts) { const d = Math.hypot(M.P[i * 3] - b.q[0], M.P[i * 3 + 1] - b.q[1], M.P[i * 3 + 2] - b.q[2]); if (d < bd) { bd = d; bn = b.n; } }
        if (!bn) continue;
        const w0 = Math.min(1, bd / 0.012), w = w0 * w0 * (3 - 2 * w0);
        const n = [0, 1, 2].map((a) => bn[a] * (1 - w) + M.N[i * 3 + a] * w), l = Math.hypot(...n) || 1;
        for (let a = 0; a < 3; a++) M.N[i * 3 + a] = n[a] / l;
      }
      console.log(`pudendal patch: feathered normals from ${bpts.length} rim points`);
    }
  }
}
// Male nipples (part of the mammary skin): a plane through the surrounding ring lets the doll
// modes flatten them in the shader.
const nipples = [];
for (const side of ['L', 'R']) {
  const m = allParts.find((p) => p.sys === 'skin' && p.name === 'Mammary region' && p.side === side);
  if (!m) continue;
  // the tip: the vertex that stands highest (along its normal) above its one-ring neighbours
  const P = m.mesh.P, N = m.mesh.N, I = m.mesh.I, adj = Array.from({ length: P.length / 3 }, () => new Set());
  for (let t = 0; t < I.length; t += 3) { adj[I[t]].add(I[t + 1]).add(I[t + 2]); adj[I[t + 1]].add(I[t]).add(I[t + 2]); adj[I[t + 2]].add(I[t]).add(I[t + 1]); }
  let tip = null, bestH = -1;
  for (let i = 0; i < adj.length; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (Math.abs(x) < 0.07 || Math.abs(x) > 0.16 || y < 1.18 || y > 1.34 || adj[i].size < 4) continue;
    const c = [0, 0, 0]; for (const j of adj[i]) for (let a2 = 0; a2 < 3; a2++) c[a2] += P[j * 3 + a2] / adj[i].size;
    const h = (x - c[0]) * N[i * 3] + (y - c[1]) * N[i * 3 + 1] + (z - c[2]) * N[i * 3 + 2];
    if (h > bestH) { bestH = h; tip = [x, y, z]; }
  }
  // smooth chest around it: least-squares quadratic z(x, y) through the skin 8-25 mm away
  const ring = [];
  for (const o of allParts) { if (o.sys !== 'skin' || o.sex) continue; const Q = o.mesh.P; for (let k = 0; k < Q.length; k += 3) { const d = Math.hypot(Q[k] - tip[0], Q[k + 1] - tip[1]); if (d > 0.008 && d < 0.025 && Q[k + 2] > tip[2] - 0.04) ring.push([Q[k] - tip[0], Q[k + 1] - tip[1], Q[k + 2]]); } }
  const A = Array.from({ length: 6 }, () => new Float64Array(7));
  for (const [x, y, z] of ring) { const f = [1, x, y, x * x, x * y, y * y]; for (let i = 0; i < 6; i++) { for (let j = 0; j < 6; j++) A[i][j] += f[i] * f[j]; A[i][6] += f[i] * z; } }
  for (let i = 0; i < 6; i++) A[i][i] += 1e-12;
  for (let i = 0; i < 6; i++) { let piv = i; for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r; [A[i], A[piv]] = [A[piv], A[i]]; for (let r = 0; r < 6; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < 7; c++) A[r][c] -= f * A[i][c]; } }
  const co = A.map((row, i) => row[6] / row[i]);
  const H = tip[2] - co[0];               // tip height above the smooth surface (along z)
  const n = [-co[1], -co[2], 1], l = Math.hypot(...n);
  nipples.push({ side, tip: tip.map((v) => +v.toFixed(4)), n: n.map((v) => +(v / l).toFixed(4)), h: +Math.max(0, H * (1 / l) * 1.0).toFixed(4), r: 0.024 });
  console.log(`male nipple ${side}: tip ${tip.map((v) => v.toFixed(3))}, height above the chest ${(H * 1000).toFixed(1)} mm, ring ${ring.length}`);
}
{
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

// Per-vertex female residuals (on top of the field) for everything near the skin
{
  let parts = 0, verts = 0, nz = 0; const t0 = Date.now();
  for (const p of allParts) {
    if (p.sys === 'skin' || p.femSpace) continue;
    const P = p.mesh.P, n = P.length / 3; let R = null;
    for (let k = 0; k < n; k++) {
      const r = femInside([P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], p.sex === 2);
      if (!r || Math.abs(r[0]) + Math.abs(r[1]) + Math.abs(r[2]) < 0.0002) continue;
      if (!R) R = new Float32Array(n * 3);
      R[k * 3] = r[0]; R[k * 3 + 1] = r[1]; R[k * 3 + 2] = r[2]; nz++;
    }
    verts += n; if (R) { p.femR = R; parts++; }
  }
  console.log(`female residuals: ${parts} parts, ${nz} of ${verts} vertices near the skin (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
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
  const info = writePack(`${OUT}/base/${sys}.mvb`, ps.map((p) => ({ id: p.id, mesh: p.mesh, I: simplified(p), flow: flowOf.get(p.id), femD: sys === 'skin' ? p.femD || new Float32Array(p.mesh.P.length) : p.femR || null, femN: p.femN })), { femNormals: sys === 'skin' });
  manifest.systems.push({ id: sys, file: `base/${sys}.mvb`, ...info });
  console.log(`base ${sys}: verts ${info.vCount}, tris ${info.iCount / 3}, ${(info.bytes / 1e6).toFixed(2)} MB`);
  for (const r of PACK_REGIONS) {
    const rp = ps.filter((p) => p.region === r && p.ratio < 0.999);
    if (!rp.length) continue;
    const pinfo = writePack(`${OUT}/hi/${sys}-${r}.mvb`, rp.map((p) => ({ id: p.id, mesh: p.mesh, I: p.mesh.I, flow: flowOf.get(p.id), femD: sys === 'skin' ? p.femD || null : p.femR || null, femN: p.femN })), { femNormals: sys === 'skin' });
    manifest.packs.push({ id: `${sys}-${r}`, sys, region: r, file: `hi/${sys}-${r}.mvb`, parts: rp.map((p) => p.id), ...pinfo });
  }
}
let hiBytes = 0; for (const pk of manifest.packs) hiBytes += pk.bytes;
console.log('hi packs', manifest.packs.length, (hiBytes / 1e6).toFixed(1), 'MB');

const r4 = (v) => +v.toFixed(4);
const FEMALE_OFFSET = { 'Urinary bladder': [0, -0.006, 0.012], 'Sigmoid colon': [0, 0.004, -0.01] };
for (const p of allParts) { // centre of the part in the female body
  const P = p.mesh.P, n = P.length / 3, c = [0, 0, 0], fo = FEMALE_OFFSET[p.name] || [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const q = [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]];
    const d = p.femSpace ? [0, 0, 0] : p.sys === 'skin' && p.femD ? [p.femD[k * 3], p.femD[k * 3 + 1], p.femD[k * 3 + 2]] : fem.at(q);
    if (p.femR) for (let a = 0; a < 3; a++) d[a] += p.femR[k * 3 + a];
    for (let a = 0; a < 3; a++) c[a] += (q[a] + d[a]) / n;
  }
  p.cF = c.map((v, a) => v + fo[a]);
}
{
  const [nx, ny, nz] = fem.F.dims, buf = Buffer.alloc(nx * ny * nz * 6);
  for (let i = 0; i < nx * ny * nz * 3; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(fem.field[i] * 1e4))), i * 2);
  const gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(`${OUT}/base/femfield.mvb`, gz);
  manifest.femField = { file: 'base/femfield.mvb', dims: fem.F.dims, min: fem.F.min, cell: fem.F.cell, bytes: gz.length };
}
manifest.partFields = ['id', 'sys', 'name', 'side', 'groups', 'center', 'extent', 'hidden', 'sex', 'anim', 'pivot', 'axis', 'region', 'flags', 'femaleOffset', 'pg', 'femaleCenter'];
manifest.parts = allParts.map((p) => [p.id, p.sys, p.name, p.side, p.groups.join('>'), p.c.map(r4), p.ext.map(r4), p.hidden ? 1 : 0, p.sex, p.anim, p.pivot.map(r4), p.axis.map((v) => +v.toFixed(3)), p.region, p.femSpace ? 4 : 0, (FEMALE_OFFSET[p.name] || [0, 0, 0]), p.pg || 0, p.cF.map(r4)]);
// Eyes: iris centre, facing axis (least-variance direction of the iris disc) and radii, for the shader
const eyes = [];
for (const side of ['R', 'L']) {
  const ir = allParts.find((p) => p.sys === 'nerves' && p.name === 'Iris' && p.side === side);
  if (!ir) continue;
  const P = ir.mesh.P, n = P.length / 3, c = [0, 0, 0];
  for (let k = 0; k < P.length; k += 3) for (let a = 0; a < 3; a++) c[a] += P[k + a] / n;
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < P.length; k += 3) { const d = [P[k] - c[0], P[k + 1] - c[1], P[k + 2] - c[2]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j] / n; }
  const tr = C[0][0] + C[1][1] + C[2][2];
  let v = [0, 0, 1];
  for (let it = 0; it < 60; it++) { const w = [0, 1, 2].map((i) => tr * v[i] - (C[i][0] * v[0] + C[i][1] * v[1] + C[i][2] * v[2])); const l = Math.hypot(...w); v = w.map((x) => x / l); }
  if (v[2] < 0) v = v.map((x) => -x);
  let rMin = 1, rMax = 0;
  for (let k = 0; k < P.length; k += 3) { const d = [P[k] - c[0], P[k + 1] - c[1], P[k + 2] - c[2]]; const h = d[0] * v[0] + d[1] * v[1] + d[2] * v[2]; const r = Math.hypot(d[0] - v[0] * h, d[1] - v[1] * h, d[2] - v[2] * h); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); }
  eyes.push({ side, c: c.map((x) => +x.toFixed(5)), axis: v.map((x) => +x.toFixed(4)), pupil: +rMin.toFixed(5), outer: +rMax.toFixed(5) });
  console.log(`eye ${side}: iris centre ${c.map((x) => x.toFixed(4))}, axis ${v.map((x) => x.toFixed(3))}, pupil ${(rMin * 1000).toFixed(1)} mm, iris ${(rMax * 1000).toFixed(1)} mm`);
}
manifest.landmarks = { aorticValve, pulmValve, rightAtrium, leftAtrium, nipples, eyes, areolas: Object.values(fem.apex || {}).map((a) => ({ c: a.c.map(r4), n: a.n.map((v) => +v.toFixed(4)), r: 0.019 })) };
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
let baseBytes = 0; for (const s of manifest.systems) baseBytes += s.bytes;
console.log('parts', allParts.length, 'base total', (baseBytes / 1e6).toFixed(1), 'MB', 'manifest', fs.statSync(`${OUT}/manifest.json`).size);
