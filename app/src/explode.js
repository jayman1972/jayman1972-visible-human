// Exploded view. The body comes apart in three overlapping phases of the explode slider (t):
//   1 regions  - the head, arms and legs pull away from the torso as whole units (every layer together)
//   2 groups   - within each region, groups move apart as units: the skull, a hand, the ribcage, the
//                pelvis, the heart, the brain, a lung, a muscle compartment... Inner layers travel
//                further out than outer ones, so organs come out from behind the bones.
//   3 pieces   - the parts of each group separate (finger bones, skull bones, vertebrae, heart chambers)
// Parts only move (they are never scaled), so the exploded body keeps true proportions.
import * as THREE from 'three';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep: gentle starts and stops

// [start, duration] in t. Groups and pieces start a little later for inner layers (LAYER delay).
export const PHASES = { region: [0.02, 0.3], group: [0.24, 0.32], piece: [0.5, 0.41] };
export function phase(which, t, delay = 0) {
  const [s, d] = PHASES[which];
  return smoother(clamp01((t - s - (which === 'region' ? 0 : delay)) / d));
}

// Body regions: an axis per region, how far it moves away as a unit (off), and how much its
// groups spread along (along) and away from (radial) its axis.
export const REGIONS = (() => {
  const r = [
    { id: 'head', a: [0, 1.52, 0.0], b: [0, 1.76, 0.0], rad: 0.11, off: [0, 0.25, 0], along: 0.4, radial: 0.85, pivot: 'mid' },
    { id: 'neck', a: [0, 1.43, -0.01], b: [0, 1.52, 0.0], rad: 0.07, off: [0, 0.12, 0], along: 0.6, radial: 0.8, pivot: 'mid' },
    { id: 'torso', a: [0, 0.84, 0.0], b: [0, 1.43, 0.0], rad: 0.17, off: [0, 0, 0], along: 0.38, radial: 0.85, pivot: 'mid' },
  ];
  const arm = { a: [0.18, 1.4, -0.03], b: [0.285, 0.7, 0.08], rad: 0.06, off: [0.18, 0.06, 0], along: 0.3, radial: 0.95, pivot: 'a' };
  const leg = { a: [0.085, 0.9, -0.01], b: [0.095, 0.0, 0.03], rad: 0.085, off: [0.07, -0.19, 0], along: 0.22, radial: 0.95, pivot: 'a' };
  const mirror = (o, id, s) => ({ ...o, id, a: [o.a[0] * s, o.a[1], o.a[2]], b: [o.b[0] * s, o.b[1], o.b[2]], off: [o.off[0] * s, o.off[1], o.off[2]] });
  r.push(mirror(arm, 'armL', 1), mirror(arm, 'armR', -1), mirror(leg, 'legL', 1), mirror(leg, 'legR', -1));
  return r.map((g) => {
    const A = new THREE.Vector3(...g.a), B = new THREE.Vector3(...g.b);
    return { ...g, A, B, OFF: new THREE.Vector3(...g.off), U: B.clone().sub(A).normalize(), P: g.pivot === 'a' ? A.clone() : A.clone().add(B).multiplyScalar(0.5) };
  });
})();

const _ab = new THREE.Vector3(), _p = new THREE.Vector3();
function closestOnSeg(c, A, B, out) {
  _ab.subVectors(B, A);
  const s = THREE.MathUtils.clamp(_p.subVectors(c, A).dot(_ab) / _ab.lengthSq(), 0, 1);
  return out.copy(A).addScaledVector(_ab, s);
}
function regionOf(c) {
  let best = null, bestD = Infinity;
  const q = new THREE.Vector3();
  for (const g of REGIONS) { closestOnSeg(c, g.A, g.B, q); const d = q.distanceTo(c) / g.rad; if (d < bestD) { bestD = d; best = g; } }
  return best;
}

// Groups that come apart as a unit before their pieces separate. Returns a tag, or null to group
// by region segment (upper arm, forearm, hand, thigh...).
function groupTag(p, side) {
  const n = p.name, g0 = p.groups[0] || '', g1 = p.groups[1] || '';
  switch (p.sys) {
    case 'skeleton':
      if (/rib$|^Costal cartilage|sternum$|^Xiphoid/i.test(n)) return 'ribcage';
      if (/^Vertebra T/.test(n)) return 'spineT';
      if (/^Vertebra L/.test(n)) return 'spineL';
      if (/^(Vertebra C|Atlas|Axis)/.test(n)) return 'spineC';
      if (/^(Hip bone|Sacrum|Coccyx)$/.test(n)) return 'pelvis';
      if (/^(Clavicle|Scapula)$/.test(n)) return 'girdle' + side;
      if (/finger of hand|metacarpal|^(Capitate|Hamate|Lunate|Pisiform|Scaphoid|Trapezium|Trapezoid|Triquetrum) bone$/.test(n)) return 'hand' + side;
      if (/finger of foot|metatarsal|^Sesamoid bones of foot$|^(Talus|Calcaneus|Navicular bone|Cuboid bone)$|cuneiform bone$/.test(n)) return 'foot' + side;
      if (/^(Radius|Ulna)$/.test(n)) return 'forearm' + side;
      if (/^(Tibia|Fibula)$/.test(n)) return 'shank' + side;
      if (/^(Femur|Patella)$/.test(n)) return 'thigh' + side;
      if (/^(Thyroid|Cricoid|Arytenoid|Corniculate) cartilage$|^Hyoid bone$/.test(n)) return 'larynx';
      return null;
    case 'organs':
      if (/^Trachea$/.test(n)) return 'airway';
      if (/lung|bronch/i.test(n)) return /left/i.test(n) ? 'lungL' : /right|Intermediate|Middle lobar/i.test(n) ? 'lungR' : 'lung' + side;
      if (/^(Liver|Gallbladder|Bile duct|Lesser omentum)$/.test(n)) return 'liver';
      if (/^(Stomach|Greater omentum)$/.test(n)) return 'stomach';
      if (/^(Duodenum|Jejunum|Ileum|Pancreas|Pancreatic duct|Accessory pancreatic duct)$/.test(n)) return 'smallgut';
      if (/colon|appendix|taenia|^Mesocolon$|^Meso-appendix$|^(Caecum|Cecum|Rectum|Anal canal)$/i.test(n)) return 'largegut';
      if (/^(Kidney|Renal pelvis|Ureter|Suprarenal gland)$/.test(n)) return 'kidney' + side;
      if (/^(Testis|Epididymis|Glans penis|Corpus cavernosum of penis|Corpus spongiosum of penis)$/.test(n)) return 'extgen';
      if (/^(Urinary bladder|Urethra|Prostate|Seminal gland|Ejaculatory duct|Ductus deferens|Uterus|Cervix of uterus|Endometrium|Ovary|Ligament of ovary|Suspensory ligament of ovary|Uterine tube|Round ligament of uterus|Vagina|Female urethra|Labium minus|Glans of clitoris|Body and crura of clitoris|Bulb of vestibule|Greater vestibular gland)$/.test(n)) return 'pelvicorg';
      if (/^(Mammary gland lobes|Lactiferous ducts)$/.test(n)) return 'breast' + side;
      return null;
    case 'vessels':
      if (/^(Heart|Arteries of heart|Cardiac veins)$/.test(g0) || /atrium|ventricle|leaflet|cusp|papillary|chorda|auricle|pericard/i.test(n)) return 'heart';
      return null;
    case 'nerves':
      if (g0 === 'Brain') return 'brain';
      if (g0 === 'Eye') return 'eye' + side;
      if (g0 === 'Ear') return 'ear' + side;
      if (g0 === 'Spinal cord') return 'cord';
      return null;
    case 'muscles':
    case 'lymph':
      // left and right halves are separate groups, except in the head and neck (one face, one throat)
      return g0 ? (g1 ? `${g0}>${g1}` : g0) + (p.side && p.c.y < 1.45 ? side : '') : null;
    default:
      return null;
  }
}

// How far a group's pieces separate in phase 3, along the region axis and away from it
// (multiples of their distance from the group's centre).
const PIECES = [
  [/^brain/, 0.3, 0.42], [/^cord/, 0.12, 0.3], [/^spine/, 0.7, 0.25], [/^ribcage/, 0.28, 0.5],
  [/^pelvis/, 0.45, 0.55], [/^(hand|foot)/, 0.7, 0.9], [/^heart/, 0.55, 0.7], [/^(eye|ear)/, 0.9, 0.9],
  [/^lung/, 0.3, 0.4], [/gut$/, 0.35, 0.45], [/^(skull|head)/, 0.85, 0.85],
];
const PIECE_DEFAULT = { skin: [0.4, 0.5], muscles: [0.35, 0.6], joints: [0.5, 0.7], skeleton: [0.6, 0.7], lymph: [0.5, 0.8], vessels: [0.3, 0.5], nerves: [0.3, 0.5], organs: [0.45, 0.6] };

// Builds per-part explode offsets for each phase, for the male and female shapes.
// layer: { [sys]: { base, rmul, amul, delay } }; spread: overall scale; kx: extra sideways spread
// (wide screens have room to spare).
export function buildExplode(parts, layer, { spread = 1.9, kx = 1 } = {}) {
  // landmarks: elbow, wrist, knee and ankle heights, for splitting limbs into segments
  const lm = { elbow: 1.07, wrist: 0.84, knee: 0.5, ankle: 0.08 };
  const low = (name) => { const ps = parts.filter((p) => p.sys === 'skeleton' && p.name === name); return ps.length ? ps.reduce((a, p) => a + p.c.y - p.ext[1] / 2, 0) / ps.length : null; };
  lm.elbow = low('Humerus') ?? lm.elbow; lm.wrist = (low('Radius') ?? lm.wrist) + 0.01; lm.knee = low('Femur') ?? lm.knee; lm.ankle = (low('Tibia') ?? lm.ankle) + 0.005;
  const segment = (g, y) => {
    if (g.id === 'torso') return y > 1.12 ? 'thorax' : y > 0.93 ? 'abdomen' : 'pelvis';
    if (g.id.startsWith('arm')) return y > lm.elbow ? 'upperarm' : y > lm.wrist ? 'forearm' : 'hand';
    if (g.id.startsWith('leg')) return y > lm.knee ? 'thigh' : y > lm.ankle ? 'shank' : 'foot';
    return g.id;
  };
  // 1) groups
  const groups = new Map();
  for (const p of parts) {
    const side = p.side || (p.c.x >= 0 ? 'L' : 'R');
    const tag = groupTag(p, side);
    const key = tag ? `${p.sys}|${tag}` : (() => { const g = regionOf(p.c); return `${p.sys}|${g.id}:${segment(g, p.c.y)}`; })();
    let G = groups.get(key);
    if (!G) { G = { key, tag: tag || key.split('|')[1].split(':')[1], sys: p.sys, members: [] }; groups.set(key, G); }
    G.members.push(p); p.group = G;
  }
  for (const G of groups.values()) {
    const mean = (sel, f) => { const v = new THREE.Vector3(); let n = 0; for (const p of G.members) if (sel(p)) { v.add(f(p)); n++; } return n ? v.divideScalar(n) : null; };
    G.cm = mean((p) => p.sex !== 2, (p) => p.c) || mean(() => true, (p) => p.c);
    G.cf = mean((p) => p.sex !== 1, (p) => p.cF) || mean(() => true, (p) => p.cF);
    G.region = regionOf(G.cm);
  }
  // 2) offsets
  const q = new THREE.Vector3(), r = new THREE.Vector3(), v = new THREE.Vector3();
  const X = (o) => { o.x *= kx; return o; };
  const groupMove = (G, C, L) => { // phase 2: the group centre spreads along and away from its region axis
    const g = G.region;
    closestOnSeg(C, g.A, g.B, q); r.subVectors(C, q);
    const rl = r.length(), rhat = rl > 1e-3 ? r.clone().divideScalar(rl) : new THREE.Vector3(0, 0, 1);
    const nq = g.P.clone().addScaledVector(q.clone().sub(g.P), 1 + g.along * L.amul * spread);
    return X(nq.addScaledVector(r, 1 + g.radial * L.rmul * spread).addScaledVector(rhat, L.base * spread).sub(C));
  };
  for (const G of groups.values()) {
    const L = layer[G.sys], g = G.region;
    G.d1 = X(g.OFF.clone().multiplyScalar(spread));
    G.d2m = groupMove(G, G.cm, L); G.d2f = groupMove(G, G.cf, L);
    const [pa, pr] = (PIECES.find(([re]) => re.test(G.tag)) || [null, ...PIECE_DEFAULT[G.sys]]).slice(1);
    G.pa = pa; G.pr = pr;
  }
  const kp = 1 + (kx - 1) * 0.3; // pieces stay closer to their group than the wide-screen spread
  const pieceMove = (G, c, C) => { // phase 3: away from the group centre, mostly sideways to the region axis
    v.subVectors(c, C); const u = G.region.U, ax = v.dot(u);
    const rad = v.clone().addScaledVector(u, -ax);
    const o = u.clone().multiplyScalar(ax * G.pa * spread * 0.55).addScaledVector(rad, G.pr * spread * 0.55);
    o.x *= kp; return o;
  };
  for (const p of parts) {
    const G = p.group;
    p.ex = { d1: G.d1, d2m: G.d2m, d2f: G.d2f, d3m: pieceMove(G, p.c, G.cm), d3f: pieceMove(G, p.cF, G.cf), delay: layer[p.sys].delay };
  }
  return { groups: [...groups.values()], landmarks: lm };
}

// Explode offset of a part at slider position t, blended between the male (0) and female (1) shape.
export function explodeOffset(p, t, f, out) {
  const e = p.ex, k1 = phase('region', t), k2 = phase('group', t, e.delay), k3 = phase('piece', t, e.delay);
  out.copy(e.d1).multiplyScalar(k1);
  out.x += (e.d2m.x + (e.d2f.x - e.d2m.x) * f) * k2 + (e.d3m.x + (e.d3f.x - e.d3m.x) * f) * k3;
  out.y += (e.d2m.y + (e.d2f.y - e.d2m.y) * f) * k2 + (e.d3m.y + (e.d3f.y - e.d3m.y) * f) * k3;
  out.z += (e.d2m.z + (e.d2f.z - e.d2m.z) * f) * k2 + (e.d3m.z + (e.d3f.z - e.d3m.z) * f) * k3;
  return out;
}
