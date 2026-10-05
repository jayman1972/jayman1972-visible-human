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
  return { o: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], iod: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) };
}

export function femaleFaceOffset(q, n, F, k = 1) {
  const x = q[0] - F.o[0], y = q[1] - F.o[1], z = q[2] - F.o[2], ax = Math.abs(x), sx = Math.sign(x) || 1;
  if (y < -0.2 || y > 0.13 || z < -0.14) return [0, 0, 0];
  const front = sstep(0.1, 0.6, n[2]); // facing forward
  const d = [0, 0, 0];
  const add = (v, w) => { d[0] += v[0] * w; d[1] += v[1] * w; d[2] += v[2] * w; };
  // smooth brow: the ridge and glabella back 3.5 mm, the outer brow 2 mm
  add([0, 0, -0.0035], g((y - 0.021) / 0.011) * g(x / 0.03) * front);
  add([0, 0, -0.002], g((y - 0.02) / 0.012) * g((ax - 0.038) / 0.015) * front);
  // forehead: rounder and more upright
  add([0, 0, 0.0015], g((y - 0.06) / 0.022) * g(x / 0.045) * front);
  // lower face (nose base to chin) 9% shorter
  const low = sstep(-0.14, -0.115, y) * (1 - sstep(-0.04, -0.03, y)) * sstep(-0.1, -0.03, z);
  d[1] += Math.max(0, -0.035 - y) * 0.09 * low;
  // nose: 16% smaller, narrower at the base, the tip turned up a little
  const nose = g(x / 0.018) * sstep(-0.054, -0.042, y) * (1 - sstep(-0.006, 0.004, y)) * sstep(0.012, 0.028, z);
  if (nose > 0) {
    add([-x, -0.015 - y, 0.02 - z], 0.16 * nose);
    d[0] -= x * 0.12 * nose;
    d[1] += 0.0016 * nose * sstep(-0.02, -0.035, y);
  }
  // lips: fuller (forward 2.5 mm, 18% taller), the mouth 5% narrower
  const lip = g(x / 0.022) * g((y + 0.06) / 0.0105) * front;
  d[2] += 0.0025 * lip; d[1] += (y + 0.06) * 0.18 * lip;
  d[0] -= x * 0.05 * g(x / 0.032) * g((y + 0.06) / 0.014) * front;
  // chin: small and defined (25% narrower, a touch forward)
  const chin = g(x / 0.026) * g((y + 0.095) / 0.016) * sstep(-0.02, 0.0, z);
  d[0] -= x * 0.25 * chin; d[2] += 0.001 * chin;
  // jaw: tapered to the chin (up to 9 mm narrower each side), with higher, softer angles
  const jaw = sstep(0.018, 0.05, ax) * g((y + 0.085) / 0.032) * sstep(-0.11, -0.04, z);
  d[0] -= sx * 0.009 * jaw;
  const angle = g((ax - 0.052) / 0.017) * g((y + 0.088) / 0.02) * g((z + 0.055) / 0.028);
  d[0] -= sx * 0.003 * angle; d[1] += 0.004 * angle;
  // high cheekbones (out and up), a slight hollow below them, fuller cheek apples
  const zyg = g((ax - 0.05) / 0.016) * g((y + 0.014) / 0.013) * sstep(-0.04, -0.005, z);
  add(n, 0.0026 * zyg); d[1] += 0.001 * zyg;
  add(n, -0.0015 * g((ax - 0.047) / 0.014) * g((y + 0.055) / 0.014) * sstep(-0.04, -0.005, z));
  add(n, 0.0016 * g((ax - 0.032) / 0.013) * g((y + 0.03) / 0.013) * sstep(-0.01, 0.01, z));
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
