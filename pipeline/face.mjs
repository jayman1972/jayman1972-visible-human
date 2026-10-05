// Female face, on top of the MakeHuman body shape (whose face difference is mostly smoothed away with
// the fitting noise). A conventionally attractive feminine face, as soft local displacements in a
// face frame centred between the eyes (male space): a smooth brow and rounded forehead, a smaller,
// slightly upturned nose, fuller lips, a small defined chin, a tapered jaw (an oval face), high
// cheekbones, a shorter lower face and no Adam's apple.
// q: male-space skin point, n: its male normal, eyes: [{c}, {c}] (iris centres). Returns metres.
const g = (u) => Math.exp(-u * u);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function faceFrame(eyes) {
  const [a, b] = eyes.map((e) => e.c);
  return { o: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], iod: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), eyes: [a, b] };
}

export function femaleFaceOffset(q, n, F, k = 1) {
  const x = q[0] - F.o[0], y = q[1] - F.o[1], z = q[2] - F.o[2], ax = Math.abs(x), sx = Math.sign(x) || 1;
  if (y < -0.2 || y > 0.13 || z < -0.16) return [0, 0, 0];
  const front = sstep(0.1, 0.6, n[2]); // facing forward
  const d = [0, 0, 0];
  const add = (v, w) => { d[0] += v[0] * w; d[1] += v[1] * w; d[2] += v[2] * w; };
  // smooth brow: the ridge and glabella back 3.5 mm, the outer brow 2 mm; the brows sit 2 mm lower
  add([0, 0, -0.0035], g((y - 0.021) / 0.011) * g(x / 0.03) * front);
  add([0, 0, -0.002], g((y - 0.02) / 0.012) * g((ax - 0.038) / 0.015) * front);
  d[1] -= 0.002 * g((y - 0.022) / 0.012) * g((ax - 0.033) / 0.024) * front;
  // forehead: rounder and more upright
  add([0, 0, 0.0015], g((y - 0.06) / 0.022) * g(x / 0.045) * front);
  // eyes: almond-shaped (the lids close over the top and bottom of the iris) with the outer corners
  // lifted. The male opening is 28 x 13.4 mm, centred 1.1 mm below the iris centre.
  for (const c of F.eyes || []) {
    const ex = (q[0] - c[0]) * Math.sign(c[0]), ey = q[1] - c[1];
    if (Math.abs(ex) > 0.04 || Math.abs(ey) > 0.03 || q[2] < c[2] - 0.02) continue;
    const u = ex / 0.014, v = (ey + 0.0011) / 0.0067, r = Math.hypot(u, v), fall = 1 - sstep(1, 2.1, r);
    if (!fall) continue;
    const s = Math.max(0, 1 - u * u);
    d[1] += (v > 0 ? -0.0013 : 0.0019) * s * fall;
    d[1] += 0.0013 * sstep(0.15, 1, u) * fall;
  }
  // lower face (nose base to chin) 9% shorter
  const low = sstep(-0.14, -0.115, y) * (1 - sstep(-0.04, -0.03, y)) * sstep(-0.1, -0.03, z);
  d[1] += Math.max(0, -0.035 - y) * 0.09 * low;
  // nose: 16% smaller, narrower at the base and along the bridge, the tip turned up a little
  const nose = g(x / 0.018) * sstep(-0.054, -0.042, y) * (1 - sstep(-0.006, 0.004, y)) * sstep(0.012, 0.028, z);
  if (nose > 0) {
    add([-x, -0.015 - y, 0.02 - z], 0.16 * nose);
    d[0] -= x * 0.12 * nose;
    d[1] += 0.0016 * nose * sstep(-0.02, -0.035, y);
  }
  d[0] -= x * 0.2 * g(x / 0.012) * g((y + 0.006) / 0.02) * sstep(0.004, 0.014, z);
  // lips: fuller (taller, the lower lip forward), a narrower mouth with the corners a touch up
  const lip = g(x / 0.022) * g((y + 0.06) / 0.0105) * front;
  d[2] += 0.0003 * lip; d[1] += (y + 0.06) * 0.12 * lip;
  d[2] += 0.0006 * g(x / 0.017) * g((y + 0.069) / 0.006) * front;
  // the area around the mouth sits back a little and the cheeks beside it fill out (no muzzle)
  d[2] -= 0.0015 * g(x / 0.03) * g((y + 0.062) / 0.02) * front;
  add(n, 0.001 * g((ax - 0.036) / 0.01) * g((y + 0.06) / 0.015) * sstep(-0.02, 0.0, z));
  d[0] -= x * 0.11 * g(x / 0.032) * g((y + 0.06) / 0.014) * front;
  d[1] += 0.0012 * g(x / 0.02) * g((y + 0.051) / 0.007) * front; // shorter upper lip
  d[1] += 0.001 * g((ax - 0.024) / 0.008) * g((y + 0.062) / 0.008) * front;
  // chin: small, defined and a little forward (30% narrower)
  const chin = g(x / 0.026) * g((y + 0.095) / 0.016) * sstep(-0.02, 0.0, z);
  d[0] -= x * 0.3 * chin; d[2] += 0.002 * chin;
  // jaw: a V taper to the chin (the lower face narrower the lower it is), softer and higher angles
  const vt = 1 - sstep(-0.105, -0.035, y);
  d[0] -= x * 0.16 * vt * sstep(-0.13, -0.06, z) * (1 - sstep(-0.16, -0.13, y));
  const jaw = sstep(0.018, 0.05, ax) * g((y + 0.085) / 0.032) * sstep(-0.11, -0.04, z);
  d[0] -= sx * 0.007 * jaw;
  const angle = g((ax - 0.052) / 0.017) * g((y + 0.088) / 0.02) * g((z + 0.055) / 0.028);
  d[0] -= sx * 0.003 * angle; d[1] += 0.004 * angle;
  // a clean jaw-to-neck line: the skin under the chin drawn up
  d[1] += 0.004 * g(x / 0.035) * g((y + 0.118) / 0.012) * sstep(-0.085, -0.045, z) * (1 - sstep(-0.012, 0.006, z));
  // high cheekbones (out and up) and full cheeks
  const zyg = g((ax - 0.05) / 0.016) * g((y + 0.014) / 0.013) * sstep(-0.04, -0.005, z);
  add(n, 0.0026 * zyg); d[1] += 0.001 * zyg; d[0] += sx * 0.001 * zyg;
  add(n, 0.0012 * g((ax - 0.045) / 0.016) * g((y + 0.05) / 0.016) * sstep(-0.04, -0.005, z));
  add(n, 0.0016 * g((ax - 0.032) / 0.013) * g((y + 0.03) / 0.013) * sstep(-0.01, 0.01, z));
  // ears: 12% smaller and closer to the head
  const ear = sstep(0.056, 0.064, ax) * g((y + 0.01) / 0.035) * g((z + 0.082) / 0.03);
  if (ear > 0) { const R = [sx * 0.062, -0.006, -0.082]; d[0] += ((R[0] - x) * 0.12 + (R[0] - x) * 0.15) * ear; d[1] += (R[1] - y) * 0.12 * ear; d[2] += (R[2] - z) * 0.12 * ear; }
  // throat: no Adam's apple
  add([0, 0, -0.003], g(x / 0.016) * g((y + 0.14) / 0.014) * front);
  return [d[0] * k, d[1] * k, d[2] * k];
}

// Eyebrows: thinner (70% of the height) and arched, highest above the outer iris.
// y0: the brow's centre line height at this x (male space). Returns the change for an eyebrow vertex.
export function femaleBrowOffset(q, y0, F) {
  const x = q[0] - F.o[0], ax = Math.abs(x);
  const arch = 0.0026 * g((ax - 0.04) / 0.014) - 0.0008 * g((ax - 0.012) / 0.01);
  return [0, (y0 - q[1]) * 0.3 + arch, 0];
}
