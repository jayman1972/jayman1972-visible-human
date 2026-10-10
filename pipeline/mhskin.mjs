// The female skin, from MakeHuman's own female mesh (CC0) rather than this body's male skin bent
// into shape. Its vertices live in two shapes at once: X, MakeHuman's male fitted onto this body's
// male skin (so the mesh sits where the male skin is, and morphs from there), and F, MakeHuman's
// female posed into the same space. The mesh is subdivided once (Catmull-Clark), refined further
// around the pudendal cleft (the shader carves it there), and split into the male skin's named
// regions, each face taking the region of the male skin it covers.

// Catmull-Clark subdivision of a polygon mesh (quads / triangles, with open borders), applied
// alike to every per-vertex attribute: attrs = [{ a: Float64Array, dim }]. Returns quads.
export function catmullClark(faces, attrs, nv) {
  const fp = faces.map((f) => attrs.map(({ a, dim }) => { const o = new Float64Array(dim); for (const v of f) for (let k = 0; k < dim; k++) o[k] += a[v * dim + k] / f.length; return o; }));
  const ekey = (u, v) => (u < v ? u * nv + v : v * nv + u);
  const edges = new Map();
  faces.forEach((f, fi) => f.forEach((v, i) => { const w = f[(i + 1) % f.length], k = ekey(v, w); let e = edges.get(k); if (!e) { e = { u: Math.min(v, w), v: Math.max(v, w), faces: [] }; edges.set(k, e); } e.faces.push(fi); }));
  // new vertex numbering: original vertices, then edge points, then face points
  const eIndex = new Map(); let n = nv; for (const k of edges.keys()) eIndex.set(k, n++); const f0 = n; n += faces.length;
  const out = attrs.map(({ dim }) => new Float64Array(n * dim));
  // edge points
  for (const [k, e] of edges) {
    const i = eIndex.get(k);
    attrs.forEach(({ a, dim }, ai) => {
      for (let c = 0; c < dim; c++) {
        out[ai][i * dim + c] = e.faces.length === 2
          ? (a[e.u * dim + c] + a[e.v * dim + c] + fp[e.faces[0]][ai][c] + fp[e.faces[1]][ai][c]) / 4
          : (a[e.u * dim + c] + a[e.v * dim + c]) / 2;
      }
    });
  }
  // face points
  faces.forEach((_, fi) => attrs.forEach(({ dim }, ai) => { for (let c = 0; c < dim; c++) out[ai][(f0 + fi) * dim + c] = fp[fi][ai][c]; }));
  // vertex points
  const vFaces = Array.from({ length: nv }, () => []), vEdges = Array.from({ length: nv }, () => []);
  faces.forEach((f, fi) => f.forEach((v) => vFaces[v].push(fi)));
  for (const e of edges.values()) { vEdges[e.u].push(e); vEdges[e.v].push(e); }
  for (let v = 0; v < nv; v++) {
    const bnd = vEdges[v].filter((e) => e.faces.length === 1);
    attrs.forEach(({ a, dim }, ai) => {
      for (let c = 0; c < dim; c++) {
        const P = a[v * dim + c];
        let val;
        if (!vEdges[v].length) val = P;
        else if (bnd.length >= 2) { const o = bnd.slice(0, 2).map((e) => a[(e.u === v ? e.v : e.u) * dim + c]); val = 0.75 * P + 0.125 * (o[0] + o[1]); }
        else {
          const m = vFaces[v].length; let F = 0, R = 0;
          for (const fi of vFaces[v]) F += fp[fi][ai][c] / m;
          for (const e of vEdges[v]) R += (a[e.u * dim + c] + a[e.v * dim + c]) / 2 / vEdges[v].length;
          val = (F + 2 * R + (m - 3) * P) / m;
        }
        out[ai][v * dim + c] = val;
      }
    });
  }
  const quads = [];
  faces.forEach((f, fi) => f.forEach((v, i) => { const prev = f[(i - 1 + f.length) % f.length], next = f[(i + 1) % f.length]; quads.push([v, eIndex.get(ekey(v, next)), f0 + fi, eIndex.get(ekey(prev, v))]); }));
  return { faces: quads, attrs: out, nv: n };
}

// Split triangle edges for which split(a, b) holds (a, b: vertex indices), repeatedly, keeping the
// mesh conforming (1-to-2, 1-to-3 or 1-to-4 triangle splits). New vertices are edge midpoints.
export function refineTris(tris, attrs, nv, split, passes = 4) {
  let T = tris, A = attrs.map(({ a, dim }) => ({ a: Array.from(a), dim })), n = nv;
  for (let pass = 0; pass < passes; pass++) {
    const mid = new Map(), key = (u, v) => (u < v ? u + ':' + v : v + ':' + u);
    const midOf = (u, v) => { const k = key(u, v); let m = mid.get(k); if (m === undefined && split(u, v, A)) { m = n++; mid.set(k, m); for (const { a, dim } of A) for (let c = 0; c < dim; c++) a.push((a[u * dim + c] + a[v * dim + c]) / 2); } return m; };
    // decide splits first (consistent for both triangles sharing an edge)
    for (const [a, b, c] of T) { midOf(a, b); midOf(b, c); midOf(c, a); }
    if (!mid.size) break;
    const out = [];
    for (const [a, b, c] of T) {
      const ab = mid.get(key(a, b)), bc = mid.get(key(b, c)), ca = mid.get(key(c, a)), k = (ab !== undefined) + (bc !== undefined) + (ca !== undefined);
      if (!k) out.push([a, b, c]);
      else if (k === 3) out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
      else if (k === 1) { if (ab !== undefined) out.push([a, ab, c], [ab, b, c]); else if (bc !== undefined) out.push([a, b, bc], [a, bc, c]); else out.push([a, b, ca], [ca, b, c]); }
      else { // two edges split: a fan from the shared corner
        if (ab === undefined) out.push([a, b, bc], [a, bc, ca], [ca, bc, c]);
        else if (bc === undefined) out.push([a, ab, ca], [ab, b, c], [ab, c, ca]);
        else out.push([a, ab, c], [ab, b, bc], [ab, bc, c]);
      }
    }
    T = out;
  }
  return { tris: T, attrs: A.map(({ a, dim }) => ({ a: Float64Array.from(a), dim })), nv: n };
}

export function vertexNormals(tris, P, nv) {
  const N = new Float64Array(nv * 3);
  for (const [a, b, c] of tris) {
    const u = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]], v = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const o of [a, b, c]) for (let k = 0; k < 3; k++) N[o * 3 + k] += f[k];
  }
  for (let i = 0; i < nv; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) N[i * 3 + k] /= l; }
  return N;
}

/**
 * T: makeFemaleTransfer result (fitted male X, native female, groups, breastW)
 * male: [{ name, side, P, look? }] this body's male skin pieces (for region names)
 * refineZone(q): true where the mesh should be dense (male space), with maxLen in metres
 * Returns { pieces: [{ name, side, X, F, NX, NF, B, I, src: [vertex index in the full mesh] }], eyes }
 */
export function buildNativeSkin(T, male, { refine = [], smoothOffset = 40, log = console.log } = {}) {
  const V = T.native, Xm = T.fitted, G = T.groups;
  // the body only (no helper geometry), compactly numbered
  const map = new Map(), Xa = [], Fa = [], Ba = [];
  const faces = G.body.map((f) => f.map((i) => { let k = map.get(i); if (k === undefined) { k = map.size; map.set(i, k); Xa.push(...Xm[i]); Fa.push(...V[i]); Ba.push(T.breastW[i]); } return k; }));
  let nv = map.size;
  // one Catmull-Clark step
  const cc = catmullClark(faces, [{ a: Float64Array.from(Xa), dim: 3 }, { a: Float64Array.from(Fa), dim: 3 }, { a: Float64Array.from(Ba), dim: 1 }], nv);
  let tris = []; for (const q of cc.faces) tris.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
  let attrs = [{ a: cc.attrs[0], dim: 3 }, { a: cc.attrs[1], dim: 3 }, { a: cc.attrs[2], dim: 1 }];
  nv = cc.nv;
  // denser where the shader carves detail (refine: [{ zone(q), maxLen }], male space)
  for (const { zone, maxLen } of refine) {
    const r = refineTris(tris, attrs, nv, (u, v, A) => { const X = A[0].a, a = [X[u * 3], X[u * 3 + 1], X[u * 3 + 2]], b = [X[v * 3], X[v * 3 + 1], X[v * 3 + 2]]; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > maxLen && (zone(a) || zone(b)); }, 6);
    tris = r.tris; attrs = r.attrs; nv = r.nv;
  }
  const F = attrs[1].a, B = attrs[2].a;
  // the male-space shape: the female minus a smoothed female-to-male offset. (MakeHuman's male,
  // fitted onto this body's skin, is a little irregular where the two bodies differ, around the
  // genitals; the shader shapes the pudendal cleft from these coordinates, so they must be smooth.)
  const X = (() => {
    const X0 = attrs[0].a, O = new Float64Array(nv * 3); for (let k = 0; k < nv * 3; k++) O[k] = F[k] - X0[k];
    const adj = Array.from({ length: nv }, () => new Set()); for (const [a, b, c] of tris) { adj[a].add(b).add(c); adj[b].add(a).add(c); adj[c].add(a).add(b); }
    const nb = adj.map((st) => Int32Array.from(st));
    for (let it = 0; it < smoothOffset; it++) { const O2 = Float64Array.from(O); for (let i = 0; i < nv; i++) { const L = nb[i]; if (!L.length) continue; for (let c = 0; c < 3; c++) { let s0 = 0; for (const j of L) s0 += O[j * 3 + c]; O2[i * 3 + c] = 0.5 * O[i * 3 + c] + 0.5 * s0 / L.length; } } O.set(O2); }
    const Xs = new Float64Array(nv * 3); for (let k = 0; k < nv * 3; k++) Xs[k] = F[k] - O[k]; return Xs;
  })();
  const NX = vertexNormals(tris, X, nv), NF = vertexNormals(tris, F, nv);
  // region names: each face takes the name of the nearest male skin vertex (male space)
  const C = 0.02, grid = new Map(), mv = [];
  male.forEach((p, pi) => { if (/^(Nail plate|Perionyx)/.test(p.name)) return; for (let k = 0; k < p.P.length; k += 3) { const q = [p.P[k], p.P[k + 1], p.P[k + 2]], id = mv.length; mv.push([...q, pi, k / 3]); const key = Math.floor(q[0] / C) + ',' + Math.floor(q[1] / C) + ',' + Math.floor(q[2] / C); (grid.get(key) || grid.set(key, []).get(key)).push(id); } });
  const nearest = (q) => { let best = -1, bd = Infinity; for (let r = 1; r <= 4 && best < 0; r++) { const gx = Math.floor(q[0] / C), gy = Math.floor(q[1] / C), gz = Math.floor(q[2] / C); for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) for (const id of grid.get((gx + i) + ',' + (gy + j) + ',' + (gz + k)) || []) { const m = mv[id], d = (m[0] - q[0]) ** 2 + (m[1] - q[1]) ** 2 + (m[2] - q[2]) ** 2; if (d < bd) { bd = d; best = id; } } } return best < 0 ? null : mv[best]; };
  const byLabel = new Map();
  for (const t of tris) {
    const q = [0, 1, 2].map((a) => (X[t[0] * 3 + a] + X[t[1] * 3 + a] + X[t[2] * 3 + a]) / 3), m = nearest(q);
    const p = m ? male[m[3]] : male[0];
    const k = p.name + '|' + (p.side || '');
    (byLabel.get(k) || byLabel.set(k, { name: p.name, side: p.side, src: p, tris: [] }).get(k)).tris.push(t);
  }
  // per vertex: the nearest male skin vertex (its look: lips, areola tint, nails)
  const near = new Int32Array(nv * 2).fill(-1);
  for (let i = 0; i < nv; i++) { const m = nearest([X[i * 3], X[i * 3 + 1], X[i * 3 + 2]]); if (m) { near[i * 2] = m[3]; near[i * 2 + 1] = m[4]; } }
  const pieces = [];
  for (const L of byLabel.values()) {
    const remap = new Map(), src = [];
    const I = new Uint32Array(L.tris.length * 3);
    L.tris.forEach((t, ti) => t.forEach((v, j) => { let k = remap.get(v); if (k === undefined) { k = src.length; remap.set(v, k); src.push(v); } I[ti * 3 + j] = k; }));
    const take = (A, dim) => { const o = new Float64Array(src.length * dim); src.forEach((v, i) => { for (let c = 0; c < dim; c++) o[i * dim + c] = A[v * dim + c]; }); return o; };
    pieces.push({ name: L.name, side: L.side, X: take(X, 3), F: take(F, 3), NX: take(NX, 3), NF: take(NF, 3), B: take(B, 1), I, near: src.map((v) => [near[v * 2], near[v * 2 + 1]]) });
  }
  // eyes: MakeHuman's eyeball helpers, in the female shape
  const eye = (g) => { const s = new Set(G[g].flat()), c = [0, 0, 0]; for (const i of s) for (let a = 0; a < 3; a++) c[a] += V[i][a] / s.size; let r = 0; for (const i of s) r += Math.hypot(V[i][0] - c[0], V[i][1] - c[1], V[i][2] - c[2]) / s.size; return { c, r }; };
  const eyes = { R: eye('helper-r-eye'), L: eye('helper-l-eye') };
  // eyelashes: MakeHuman's lash cards (one quad per tuft, root edge on the lid margin), in the
  // female shape: [{ upper, root, dir }] per side
  const lashes = {};
  for (const sd of ['R', 'L']) {
    const ec = eyes[sd].c, out = [], dist = (i) => Math.hypot(V[i][0] - ec[0], V[i][1] - ec[1], V[i][2] - ec[2]);
    for (const gi of ['1', '2']) {
      const g = G[`helper-${sd.toLowerCase()}-eyelashes-${gi}`]; if (!g) continue;
      const cards = g.map((f) => f.slice().sort((a, b) => dist(a) - dist(b))), far = new Set();
      for (const c of cards) { far.add(c[2]); far.add(c[3]); }
      const yc = [...new Set(g.flat())].reduce((t, i, _, a) => t + V[i][1] / a.length, 0);
      for (const c of cards) {
        if (far.has(c[0]) || far.has(c[1])) continue;
        const r0 = V[c[0]], r1 = V[c[1]], t0 = V[c[2]], t1 = V[c[3]];
        out.push({ upper: yc > ec[1], root: [r0, r1], dir: [0, 1, 2].map((a) => (t0[a] + t1[a] - r0[a] - r1[a]) / 2) });
      }
    }
    lashes[sd] = out;
  }
  log(`native female skin: ${nv} vertices, ${tris.length} triangles, ${pieces.length} named regions`);
  return { pieces, eyes, lashes, nv, tris: tris.length };
}
