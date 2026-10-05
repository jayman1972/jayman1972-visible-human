import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer, makeNoiseTexture, makeBackground, makeSharedUniforms, makeAnatomyMaterial, makePickMaterial, Pipeline } from './render.js';
import { fetchPack } from './data.js';
import { lookupInfo, prettyName } from './content.js';
import { warpPoint } from './warp.js';
import { Physiology, SYSTEMS as PHYS } from './physiology.js';
import { SoundEngine } from './audio.js';
import { TOURS } from './tours.js';

const DATA = 'data/';
const $ = (s) => document.querySelector(s);
const canvas = $('#scene');
const stage = $('#stage');

// ---------------------------------------------------------------------------
// Layers (outermost first; also drives the explode stagger)
// ---------------------------------------------------------------------------
const LAYERS = [
  { id: 'skin', label: 'Skin', dot: '#e3b896', on: true, base: 0.14, rmul: 1.0, amul: 1.0, t0: 0.0, t1: 0.42 },
  { id: 'muscles', label: 'Muscles', dot: '#b4372f', on: false, base: 0.09, rmul: 1.0, amul: 1.0, t0: 0.08, t1: 0.56 },
  { id: 'joints', label: 'Ligaments', dot: '#a9cdd7', on: false, base: 0.05, rmul: 1.0, amul: 1.05, t0: 0.16, t1: 0.66 },
  { id: 'skeleton', label: 'Skeleton', dot: '#e9dfc6', on: true, base: 0.06, rmul: 0.9, amul: 1.0, t0: 0.22, t1: 0.74 },
  { id: 'lymph', label: 'Lymph nodes', dot: '#d9b38c', on: false, base: 0.04, rmul: 1.3, amul: 1.1, t0: 0.28, t1: 0.82 },
  { id: 'vessels', label: 'Heart & vessels', dot: '#d0262c', on: true, base: 0.03, rmul: 1.2, amul: 1.1, t0: 0.32, t1: 0.86 },
  { id: 'nerves', label: 'Brain & nerves', dot: '#f0cc4e', on: true, base: 0.02, rmul: 1.2, amul: 1.1, t0: 0.38, t1: 0.93 },
  { id: 'organs', label: 'Organs', dot: '#d98a7a', on: true, base: 0.0, rmul: 2.4, amul: 1.7, t0: 0.44, t1: 1.0 },
];
const LAYER = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
const LOAD_ORDER = ['skeleton', 'organs', 'skin', 'vessels', 'nerves', 'muscles', 'joints', 'lymph'];

const REGIONS = (() => {
  const r = [
    { id: 'head', a: [0, 1.52, 0.0], b: [0, 1.76, 0.0], rad: 0.11, off: [0, 0.34, 0], along: 0.45, radial: 0.95, pivot: 'mid' },
    { id: 'neck', a: [0, 1.43, -0.01], b: [0, 1.52, 0.0], rad: 0.07, off: [0, 0.17, 0], along: 0.8, radial: 0.9, pivot: 'mid' },
    { id: 'torso', a: [0, 0.84, 0.0], b: [0, 1.43, 0.0], rad: 0.17, off: [0, 0, 0], along: 0.62, radial: 0.75, pivot: 'mid' },
  ];
  const arm = { a: [0.18, 1.4, -0.03], b: [0.285, 0.7, 0.08], rad: 0.06, off: [0.13, 0.06, 0], along: 0.38, radial: 1.0, pivot: 'a' };
  const leg = { a: [0.085, 0.9, -0.01], b: [0.095, 0.0, 0.03], rad: 0.085, off: [0.05, -0.3, 0], along: 0.32, radial: 1.0, pivot: 'a' };
  const mirror = (o, id, s) => ({ ...o, id, a: [o.a[0] * s, o.a[1], o.a[2]], b: [o.b[0] * s, o.b[1], o.b[2]], off: [o.off[0] * s, o.off[1], o.off[2]] });
  r.push(mirror(arm, 'armL', 1), mirror(arm, 'armR', -1), mirror(leg, 'legL', 1), mirror(leg, 'legR', -1));
  return r.map((g) => ({ ...g, A: new THREE.Vector3(...g.a), B: new THREE.Vector3(...g.b), OFF: new THREE.Vector3(...g.off) }));
})();

const HOLLOW = /oesophagus|stomach|duodenum|jejunum|ileum|colon|appendix|urinary bladder|gallbladder|trachea|bronch|ureter|urethra|renal pelvis|bile duct|pancreatic duct|ductus deferens/i;

// ---------------------------------------------------------------------------
// Renderer, scene, camera
// ---------------------------------------------------------------------------
let renderer;
try { renderer = createRenderer(canvas); } catch (err) {
  $('#loader-text').textContent = 'This device or browser can’t show 3D graphics (WebGL 2 is off or unsupported). Try an up-to-date Safari, Chrome or Firefox.';
  throw err;
}
const scene = new THREE.Scene();
scene.background = makeBackground();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x3a2a24, 0.75);
const key = new THREE.DirectionalLight(0xfff4ea, 1.9); key.position.set(1.4, 2.8, 2.6);
const rim = new THREE.DirectionalLight(0x9fd8ff, 1.0); rim.position.set(-2.2, 1.6, -2.4);
const fill = new THREE.DirectionalLight(0xffe2d0, 0.35); fill.position.set(-2, 0.4, 1.5);
scene.add(hemi, key, rim, fill);

const BASE_FOV = 34;
const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.01, 60);
camera.position.set(0, 0.95, 4);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.88, 0);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, rotateSpeed: 0.75, zoomSpeed: 0.9, panSpeed: 0.8, minDistance: 0.06, maxDistance: 12, autoRotateSpeed: 1.6, screenSpacePanning: true });
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const pipeline = new Pipeline(renderer, scene, camera);
const U = makeSharedUniforms();
U.uNoise.value = makeNoiseTexture(64);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let manifest = null, parts = [], N = 0;
const TEX_W = 64;
let partTexData, partTex;
let partState, userHidden, defaultHidden;
let selSet = new Set();
const groupIndex = new Map();
const state = {
  t: 0, tShown: -1, vel: 0, anim: null, selected: -1, selGroup: null, isolated: false, skinMode: 'clear', pg: false, pgAnim: null,
  spin: false, needsRender: true, camAnim: null,
  female: 0, fT: 0, fAnim: null,
  clip: { on: false, scope: 'part', axis: 'sagittal', pos: 0, flip: false },
};
const systems = {};
const phys = new Physiology();
const sound = new SoundEngine();

// ---------------------------------------------------------------------------
// Materials & meshes
// ---------------------------------------------------------------------------
const matCache = new Map();
function mat(mode, isSkin, lod) {
  const k = `${mode}|${isSkin}|${lod}`;
  if (!matCache.has(k)) matCache.set(k, makeAnatomyMaterial(U, mode, { isSkin, lodPass: lod }));
  return matCache.get(k);
}
const pickMats = [makePickMaterial(U, 0), makePickMaterial(U, 1)];
const pickScene = new THREE.Scene();
const pickTarget = new THREE.WebGLRenderTarget(1, 1);
const pickBuf = new Uint8Array(4);

function makeMeshSet(sysId, geo, lod) {
  const isSkin = sysId === 'skin';
  const main = new THREE.Mesh(geo, mat(isSkin ? 'skin' : 'opaque', isSkin, lod));
  const ghost = new THREE.Mesh(geo, mat('ghost', isSkin, lod));
  const xray = new THREE.Mesh(geo, mat('xray', isSkin, lod));
  const pick = new THREE.Mesh(geo, pickMats[lod]);
  for (const m of [main, ghost, xray, pick]) m.frustumCulled = false;
  if (isSkin) main.renderOrder = 10;
  ghost.renderOrder = 5; xray.renderOrder = 20;
  scene.add(main, ghost, xray); pickScene.add(pick);
  return { main, ghost, xray, pick, geo, dispose() { scene.remove(main, ghost, xray); pickScene.remove(pick); geo.dispose(); } };
}

function syncVisibility() {
  const selSys = selSystems();
  const solid = state.skinMode === 'solid';
  for (const L of LAYERS) {
    const s = systems[L.id];
    if (!s) continue;
    const on = L.id === 'skin' ? state.skinMode !== 'off' : s.on;
    const sets = [s.base, ...s.hi.values()].filter(Boolean);
    for (const ms of sets) {
      ms.main.visible = on;
      ms.ghost.visible = on && state.isolated;
      // x-ray outline of a hidden selection; not needed when a cutaway, isolation or a section already reveals it
      ms.xray.visible = on && selSys.has(L.id) && L.id !== 'skin' && !(U.uCut.value.w > 0) && !state.isolated && !state.clip.on;
      ms.pick.visible = on && (L.id !== 'skin' || solid);
    }
  }
  for (const lod of [0, 1]) {
    const m = mat('skin', true, lod);
    if (m.transparent === solid || m.userData.local.uSkinSolid.value !== (solid ? 1 : 0)) {
      m.transparent = !solid; m.depthWrite = solid; m.userData.local.uSkinSolid.value = solid ? 1 : 0; m.needsUpdate = true;
    }
  }
  state.needsRender = true;
}

// ---------------------------------------------------------------------------
// Explode math (computed for male and female shapes, blended by the morph)
// ---------------------------------------------------------------------------
const _q = new THREE.Vector3(), _r = new THREE.Vector3(), _ab = new THREE.Vector3(), _p = new THREE.Vector3();
function closestOnSeg(c, A, B, out) {
  _ab.subVectors(B, A);
  const s = THREE.MathUtils.clamp(_p.subVectors(c, A).dot(_ab) / _ab.lengthSq(), 0, 1);
  return out.copy(A).addScaledVector(_ab, s);
}
function explodeVector(p, c) {
  let best = null, bestD = Infinity;
  for (const g of REGIONS) { closestOnSeg(p.c, g.A, g.B, _q); const d = _q.distanceTo(p.c) / g.rad; if (d < bestD) { bestD = d; best = g; } }
  const g = best;
  closestOnSeg(c, g.A, g.B, _q);
  _r.subVectors(c, _q);
  const pivot = g.pivot === 'a' ? g.A.clone() : g.A.clone().add(g.B).multiplyScalar(0.5);
  const L = LAYER[p.sys];
  const qNew = pivot.clone().addScaledVector(_q.clone().sub(pivot), 1 + g.along * L.amul).add(g.OFF);
  const rLen = _r.length();
  const rhat = rLen > 1e-3 ? _r.clone().divideScalar(rLen) : new THREE.Vector3(0, 0, 1);
  return qNew.addScaledVector(_r, 1 + g.radial * L.rmul).addScaledVector(rhat, L.base).sub(c);
}
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function layerProgress(sys, t) { const L = LAYER[sys]; return ease(THREE.MathUtils.clamp((t - L.t0) / (L.t1 - L.t0), 0, 1)); }

const _w = [0, 0, 0];
function femaleCenter(p) {
  const q = [p.c.x + p.fo[0], p.c.y + p.fo[1], p.c.z + p.fo[2]];
  warpPoint(q, 1, p.sys === 'skin' && !(p.flags & 1), _w);
  return new THREE.Vector3(_w[0], _w[1], _w[2]);
}
function partCenterNow(p, out) {
  const f = state.fT;
  out.copy(p.c).lerp(p.cF, f);
  const e = layerProgress(p.sys, state.t);
  out.x += (p.Dm.x + (p.Df.x - p.Dm.x) * f) * e;
  out.y += (p.Dm.y + (p.Df.y - p.Dm.y) * f) * e;
  out.z += (p.Dm.z + (p.Df.z - p.Dm.z) * f) * e;
  return out;
}

function writePartTexture() {
  const t = state.t, f = state.fT;
  const k = {}; for (const L of LAYERS) k[L.id] = layerProgress(L.id, t);
  for (let i = 0; i < N; i++) {
    const p = parts[i], e = k[p.sys];
    partTexData[i * 4] = (p.Dm.x + (p.Df.x - p.Dm.x) * f) * e;
    partTexData[i * 4 + 1] = (p.Dm.y + (p.Df.y - p.Dm.y) * f) * e;
    partTexData[i * 4 + 2] = (p.Dm.z + (p.Df.z - p.Dm.z) * f) * e;
    partTexData[i * 4 + 3] = partState[i] + (p.hi ? 10 : 0);
  }
  partTex.needsUpdate = true;
  U.uSkinA.value.set(0.035 + 0.07 * k.skin, 0.5 + 0.15 * k.skin);
  state.tShown = t;
  state.needsRender = true;
}
function staticTexture(fill) {
  const H = Math.ceil(N / TEX_W);
  const d = new Float32Array(TEX_W * H * 4);
  parts.forEach((p, i) => fill(p, d, i * 4));
  const t = new THREE.DataTexture(d, TEX_W, H, THREE.RGBAFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------
// Camera framing between UI bars
// ---------------------------------------------------------------------------
const layerBounds = {};
function computeLayerBounds() {
  for (const L of LAYERS) layerBounds[L.id] = { m0: new THREE.Box3(), m1: new THREE.Box3(), f0: new THREE.Box3(), f1: new THREE.Box3() };
  const h = new THREE.Vector3(), c = new THREE.Vector3();
  for (const p of parts) {
    if (p.hidden) continue;
    const lb = layerBounds[p.sys];
    h.set(p.ext[0] / 2, p.ext[1] / 2, p.ext[2] / 2);
    if (p.sex !== 2) { lb.m0.expandByPoint(c.copy(p.c).sub(h)); lb.m0.expandByPoint(c.copy(p.c).add(h)); c.copy(p.c).add(p.Dm); lb.m1.expandByPoint(c.clone().sub(h)); lb.m1.expandByPoint(c.add(h)); }
    if (p.sex !== 1) { lb.f0.expandByPoint(c.copy(p.cF).sub(h)); lb.f0.expandByPoint(c.copy(p.cF).add(h)); c.copy(p.cF).add(p.Df); lb.f1.expandByPoint(c.clone().sub(h)); lb.f1.expandByPoint(c.add(h)); }
  }
}
function layerOn(id) { return id === 'skin' ? state.skinMode !== 'off' : systems[id] && systems[id].on; }
const _bb = new THREE.Box3(), _lb = new THREE.Box3(), _lb2 = new THREE.Box3();
function sceneBounds(t) {
  _bb.makeEmpty();
  for (const L of LAYERS) {
    if (!layerOn(L.id)) continue;
    const b = layerBounds[L.id];
    if (b.m0.isEmpty()) continue;
    const e = layerProgress(L.id, t);
    _lb.min.lerpVectors(b.m0.min, b.m1.min, e); _lb.max.lerpVectors(b.m0.max, b.m1.max, e);
    _lb2.min.lerpVectors(b.f0.min, b.f1.min, e); _lb2.max.lerpVectors(b.f0.max, b.f1.max, e);
    _lb.min.lerp(_lb2.min, state.fT); _lb.max.lerp(_lb2.max, state.fT);
    _bb.union(_lb);
  }
  if (_bb.isEmpty()) _bb.set(new THREE.Vector3(-0.35, 0, -0.15), new THREE.Vector3(0.35, 1.75, 0.15));
  return _bb;
}
const view = { w: 1, h: 1, top: 0, bottom: 0, left: 0, right: 0, fullW: 1, fullH: 1, ox: 0, oy: 0 };
function measureInsets() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const topEl = $('.top'), dockEl = $('.dock'), railEl = $('.rail-wrap');
  view.w = W; view.h = H;
  view.top = topEl ? topEl.getBoundingClientRect().bottom + 8 : 0;
  view.bottom = dockEl ? H - dockEl.getBoundingClientRect().top + 8 : 0;
  view.right = railEl && W < 820 ? W - railEl.getBoundingClientRect().left : 0;
  view.left = 0;
  view.baseBottom = view.bottom;
  const panel = [...document.querySelectorAll('.bottom-panel.open')][0];
  if (W < 820 && panel) view.bottom = Math.max(view.bottom, panel.offsetHeight + 4);
  // keep the subject clear of the tour caption and (on wide screens) the side info sheet
  const tc = $('#tour-card');
  if (tc && !tc.hidden) view.top = Math.max(view.top, tc.getBoundingClientRect().bottom + 8);
  const sh = $('#sheet');
  if (W >= 820 && sh && sh.classList.contains('open')) view.left = Math.min(W * 0.4, sh.getBoundingClientRect().right + 8);
  view.tsx = Math.round((view.right - view.left) / 2); view.tsy = Math.round((view.bottom - view.top) / 2);
  if (view.sx === undefined) { view.sx = view.tsx; view.sy = view.tsy; }
  setOffsetFromShift();
}
function setOffsetFromShift() {
  const sx = view.sx, sy = view.sy;
  view.fullW = view.w + 2 * Math.abs(sx); view.fullH = view.h + 2 * Math.abs(sy);
  view.ox = sx > 0 ? 2 * sx : 0; view.oy = sy > 0 ? 2 * sy : 0;
}
function stepViewShift() {
  if (view.tsx === undefined) return false;
  const dx = view.tsx - view.sx, dy = view.tsy - view.sy;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { if (dx || dy) { view.sx = view.tsx; view.sy = view.tsy; setOffsetFromShift(); applyViewOffset(); return true; } return false; }
  view.sx += dx * 0.18; view.sy += dy * 0.18;
  setOffsetFromShift(); applyViewOffset();
  return true;
}
function applyViewOffset(pr = 1, px = null, py = null) {
  camera.aspect = view.fullW / view.fullH;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2) * view.fullH / view.h));
  if (px === null) camera.setViewOffset(view.fullW, view.fullH, view.ox, view.oy, view.w, view.h);
  else camera.setViewOffset(view.fullW * pr, view.fullH * pr, (view.ox + px) * pr, (view.oy + py) * pr, 1, 1);
}
function fitDistance(t) {
  const b = sceneBounds(t);
  const H = (b.max.y - b.min.y) * 1.03, Wd = b.max.x - b.min.x;
  const availH = Math.max(120, view.h - view.top - (view.baseBottom ?? view.bottom));
  const availW = Math.max(120, view.w - view.left - view.right);
  const k = view.h / (2 * Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2));
  return Math.max(H / availH, Wd / availW) * k + (b.max.z - b.min.z) / 2;
}
function fitCenterY(t) { const b = sceneBounds(t); return (b.min.y + b.max.y) / 2; }
let lastFit = null;
function applyAutoFit() {
  const now = { d: fitDistance(state.t), y: fitCenterY(state.t) };
  if (lastFit) {
    const off = camera.position.clone().sub(controls.target).multiplyScalar(now.d / lastFit.d);
    controls.target.y += now.y - lastFit.y;
    camera.position.copy(controls.target).add(off);
  }
  lastFit = now;
}
function refit(dur = 500) {
  const next = { d: fitDistance(state.t), y: fitCenterY(state.t) };
  if (lastFit) {
    const k = next.d / lastFit.d;
    if (Math.abs(k - 1) > 0.02 || Math.abs(next.y - lastFit.y) > 0.01) {
      const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
      const tgt = controls.target.clone(); tgt.y += next.y - lastFit.y;
      animateCamera(tgt, tgt.clone().add(off), dur);
    }
  }
  lastFit = next;
}
function animateCamera(target, position, dur = 700) {
  state.camAnim = { t0: performance.now(), dur, fromT: controls.target.clone(), fromP: camera.position.clone(), target, position };
}
function homePose() {
  const d = fitDistance(state.t);
  const tgt = new THREE.Vector3(0, fitCenterY(state.t), 0);
  return { tgt, pos: tgt.clone().add(new THREE.Vector3(0, 0.04, d)) };
}
function resetView() { const { tgt, pos } = homePose(); animateCamera(tgt, pos); lastFit = null; applyAutoFit(); }

// ---------------------------------------------------------------------------
// Selection / visibility
// ---------------------------------------------------------------------------
// Is this part in the body being shown? Doll mode (Ken / Barbie) hides the genitals (pg 1)
// and shows the smoothed-over replacements (pg 2) in both bodies.
function sexOk(p) {
  if (state.pg) { if (p.pg === 1) return false; if (p.pg === 2) return true; }
  return p.sex === 0 || (p.sex === 1 && state.female < 0.5) || (p.sex === 2 && state.female >= 0.5);
}
function recomputeStates() {
  for (let i = 0; i < N; i++) {
    let s = 1;
    if (userHidden[i] || (state.skinMode === 'solid' && parts[i].name === 'Breast adipose tissue')) s = 0;
    else if (state.isolated) s = selSet.has(i) ? 2 : 3;
    else if (selSet.has(i)) s = 2;
    partState[i] = s;
  }
  writePartTexture();
  syncVisibility();
  updateToolbar();
  updateClip();
}
function selSystems() { const out = new Set(); for (const i of selSet) out.add(parts[i].sys); return out; }
function ensureVisible(ids) {
  for (const i of ids) if (!defaultHidden[i] || ids.length === 1) userHidden[i] = 0;
  for (const sys of new Set(ids.map((i) => parts[i].sys))) {
    if (sys === 'skin') { if (state.skinMode === 'off') setSkinMode('clear'); }
    else if (!systems[sys].on) setLayer(sys, true);
  }
}
function clearSelection() {
  state.selected = -1; state.selGroup = null; selSet = new Set(); state.isolated = false;
  if (state.clip.on && state.clip.scope === 'part') closeSection();
  recomputeStates(); closeSheet();
}
function select(id, { focus = false, fromSearch = false } = {}) {
  if (id < 0) return clearSelection();
  const p = parts[id];
  state.selected = id; state.selGroup = null; selSet = new Set([id]);
  if (fromSearch) ensureVisible([id]);
  recomputeStates(); openSheet(p);
  if (focus) focusIds([id]);
  sound.select();
}
function selectGroup(key, { focus = true, fromSearch = false } = {}) {
  const g = groupIndex.get(key);
  if (!g) return;
  const ids = g.ids.filter((i) => sexOk(parts[i]));
  if (!ids.length) return;
  state.selected = -1; state.selGroup = g; selSet = new Set(ids);
  if (fromSearch) ensureVisible(ids);
  recomputeStates(); openGroupSheet(g, ids);
  if (focus) focusIds(ids);
  sound.select();
}
const _fb = new THREE.Box3(), _fc = new THREE.Vector3(), _fh = new THREE.Vector3();
// Cutaway window onto a selected internal structure (off while isolated: ghosts already show it)
const _cb = new THREE.Box3(), _cc = new THREE.Vector3(), _cs = new THREE.Vector3();
function updateCutaway() {
  const u = U.uCut.value, prevW = u.w;
  if (!selSet.size || state.isolated || selSet.size > 600) { u.w = 0; }
  else {
    boundsOf([...selSet], _cb);
    if (_cb.isEmpty()) u.w = 0;
    else {
      _cb.getCenter(_cc); _cb.getSize(_cs);
      const r = Math.max(_cs.x, _cs.y, _cs.z) * 0.5 * 0.9 + 0.006;
      if (r > 0.28) u.w = 0; else { if (u.x !== _cc.x || u.y !== _cc.y || u.z !== _cc.z || u.w !== r) state.needsRender = true; u.set(_cc.x, _cc.y, _cc.z, r); }
    }
  }
  if (u.w !== prevW) state.needsRender = true;
  if ((u.w > 0) !== (prevW > 0)) syncVisibility();
}
function boundsOf(ids, out = new THREE.Box3()) {
  out.makeEmpty();
  for (const i of ids) {
    if (partState[i] === 0) continue;
    const p = parts[i];
    partCenterNow(p, _fc);
    _fh.set(p.ext[0] / 2, p.ext[1] / 2, p.ext[2] / 2);
    out.expandByPoint(_fc.clone().sub(_fh)); out.expandByPoint(_fc.clone().add(_fh));
  }
  return out;
}
function focusIds(ids, dirOverride = null) {
  boundsOf(ids, _fb);
  if (_fb.isEmpty()) return;
  const c = _fb.getCenter(new THREE.Vector3());
  const sz = _fb.getSize(new THREE.Vector3());
  const size = Math.max(sz.x, sz.y, sz.z);
  const panel = document.querySelector('.bottom-panel:not([hidden])');
  const bottom = view.w < 820 && panel ? Math.max(view.baseBottom ?? view.bottom, panel.offsetHeight + 4) : (view.baseBottom ?? view.bottom);
  const availPx = Math.max(120, Math.min(view.w - view.left - view.right, view.h - view.top - bottom));
  const worldPerPxAt1 = 2 * Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2) / view.h;
  const dist = THREE.MathUtils.clamp((size * 1.9) / (availPx * worldPerPxAt1) + size / 2, 0.12, 6);
  const dir = dirOverride ? dirOverride.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
  animateCamera(c, c.clone().addScaledVector(dir, dist));
}

function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const pr = renderer.getPixelRatio();
  applyViewOffset(pr, Math.round(clientX - rect.left), Math.round(clientY - rect.top));
  renderer.setRenderTarget(pickTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(pickScene, camera);
  renderer.readRenderTargetPixels(pickTarget, 0, 0, 1, 1, pickBuf);
  renderer.setRenderTarget(null);
  renderer.setClearColor(0x0a1118, 1);
  applyViewOffset();
  const id = pickBuf[0] + pickBuf[1] * 256 + pickBuf[2] * 65536 - 1;
  return id >= 0 && id < N ? id : -1;
}

// ---------------------------------------------------------------------------
// Male / female
// ---------------------------------------------------------------------------
function setSex(female) {
  const target = female ? 1 : 0;
  if (state.female === target && !state.fAnim) return;
  state.female = target;
  state.fAnim = { from: state.fT, to: target, t0: performance.now(), dur: 1400 };
  // drop selections that don't exist in the new body
  if ([...selSet].some((i) => !sexOk(parts[i]))) clearSelection();
  $('#sex-m').setAttribute('aria-pressed', female ? 'false' : 'true');
  $('#sex-f').setAttribute('aria-pressed', female ? 'true' : 'false');
  $('#sex-toggle').dataset.sex = female ? 'f' : 'm';
  syncPGButton();
  sound.morph();
  if (searchEl && !searchEl.hidden) renderSearch(searchInput.value);
}

// ---------------------------------------------------------------------------
// Doll mode ("Ken mode" / "Barbie mode"): a family-friendly view with the genitals smoothed over
function pgName() { return state.female >= 0.5 ? 'Barbie mode' : 'Ken mode'; }
function syncPGButton() {
  const b = $('#pg-toggle'); if (!b) return;
  b.setAttribute('aria-pressed', state.pg ? 'true' : 'false');
  b.querySelector('.lbl').textContent = pgName();
  b.title = state.pg ? `${pgName()} is on: genitals are smoothed over, like a doll` : `Turn on ${pgName()}: a family-friendly view with the genitals smoothed over`;
}
function setPG(on, { quiet = false } = {}) {
  on = !!on;
  if (state.pg === on && !quiet) return;
  state.pg = on;
  try { localStorage.setItem('vh-pg', on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  state.pgAnim = { from: U.uPG.value, to: on ? 1 : 0, t0: performance.now(), dur: quiet ? 1 : 700 };
  if ([...selSet].some((i) => !sexOk(parts[i]))) clearSelection();
  syncPGButton();
  if (searchEl && !searchEl.hidden) renderSearch(searchInput.value);
  state.needsRender = true;
  if (!quiet) { sound.toggle(on); showToast(on ? `${pgName()} on: the genitals are smoothed over, like a doll.` : `${pgName()} off: full anatomy.`); }
}
$('#pg-toggle').addEventListener('click', () => { unlockAudio(); setPG(!state.pg); });

// ---------------------------------------------------------------------------
// Cross-sections
// ---------------------------------------------------------------------------
const clipPlaneMesh = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  const m = new THREE.MeshBasicMaterial({ color: 0x6fe3f2, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x6fe3f2, transparent: true, opacity: 0.5 }));
  mesh.add(edges); mesh.renderOrder = 30; mesh.visible = false;
  scene.add(mesh);
  return mesh;
})();
const AXES = { sagittal: new THREE.Vector3(1, 0, 0), coronal: new THREE.Vector3(0, 0, 1), transverse: new THREE.Vector3(0, 1, 0) };
function clipBounds() {
  if (state.clip.scope === 'part' && selSet.size) return boundsOf([...selSet], new THREE.Box3());
  return sceneBounds(state.t).clone();
}
let clipWasOn = false;
function updateClip() {
  const c = state.clip;
  if (c.on !== clipWasOn) { clipWasOn = c.on; syncVisibility(); }
  if (!c.on) {
    U.uClipMode.value = 0; clipPlaneMesh.visible = false;
    setDoubleSided(false);
    return;
  }
  const b = clipBounds();
  if (b.isEmpty()) return;
  const n = AXES[c.axis].clone().multiplyScalar(c.flip ? -1 : 1);
  const ctr = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  const half = Math.abs(n.dot(sz)) / 2;
  const w = n.dot(ctr) + c.pos * half * 0.98;
  U.uClipPlane.value.set(n.x, n.y, n.z, w);
  U.uClipMode.value = c.scope === 'part' && selSet.size ? 2 : 1;
  setDoubleSided(true);
  // visual plane through the cut
  const p0 = ctr.clone().addScaledVector(n, w - n.dot(ctr));
  clipPlaneMesh.position.copy(p0);
  clipPlaneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const dims = c.axis === 'sagittal' ? [sz.z, sz.y] : c.axis === 'coronal' ? [sz.x, sz.y] : [sz.x, sz.z];
  clipPlaneMesh.scale.set(dims[0] * 1.12 + 0.01, dims[1] * 1.12 + 0.01, 1);
  if (c.axis === 'transverse') clipPlaneMesh.scale.set(sz.x * 1.12 + 0.01, sz.z * 1.12 + 0.01, 1);
  clipPlaneMesh.visible = true;
  state.needsRender = true;
}
let doubleSided = false;
function setDoubleSided(on) {
  if (doubleSided === on) return;
  doubleSided = on;
  for (const m of matCache.values()) { if (m.userData.mode === 'opaque' || m.userData.mode === 'skin') { m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; } }
}
// Slicing a single organ only cuts that organ, so everything around it would hide the cut
// face: ghost the surroundings while a part section is open (and restore afterwards).
function setSectionIsolation() {
  const want = state.clip.on && state.clip.scope === 'part' && selSet.size > 0;
  if (want && !state.isolated) { state.isolated = true; state.clip.autoIsolated = true; recomputeStates(); }
  else if (!want && state.clip.autoIsolated) { state.clip.autoIsolated = false; if (state.isolated) { state.isolated = false; recomputeStates(); } }
  $('#btn-isolate').textContent = state.isolated ? 'Show all' : 'Isolate';
  $('#btn-isolate').setAttribute('aria-pressed', state.isolated ? 'true' : 'false');
}
function openSection(scope) {
  state.clip.on = true;
  state.clip.scope = scope || (selSet.size ? 'part' : 'all');
  state.clip.pos = 0;
  setSectionIsolation();
  updateClip();
  sound.slice();
  showPanel('section');
  syncSectionUI();
  viewCut();
}
function closeSection() { state.clip.on = false; setSectionIsolation(); updateClip(); hidePanel('section'); }
function viewCut() {
  const b = clipBounds(); if (b.isEmpty()) return;
  const n = AXES[state.clip.axis].clone().multiplyScalar(state.clip.flip ? -1 : 1);
  const dir = state.clip.axis === 'transverse' ? new THREE.Vector3(0.0, 1, 0.35).multiplyScalar(state.clip.flip ? -1 : 1) : n;
  focusIds(state.clip.scope === 'part' && selSet.size ? [...selSet] : parts.filter((p) => partState[p.id] && layerOn(p.sys) && sexOk(p)).map((p) => p.id), dir);
}
function syncSectionUI() {
  document.querySelectorAll('[data-axis]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.axis === state.clip.axis ? 'true' : 'false'));
  document.querySelectorAll('[data-scope]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.scope === state.clip.scope ? 'true' : 'false'));
  $('#clip-pos').value = Math.round(state.clip.pos * 100);
  $('#scope-part').disabled = !selSet.size;
  $('#section-title').textContent = state.clip.scope === 'part' && selSet.size ? `Slice: ${state.selGroup ? groupTitle(state.selGroup.name) : parts[state.selected]?.title || 'selection'}` : 'Slice: whole body';
}

// ---------------------------------------------------------------------------
// Full-resolution detail streaming
// ---------------------------------------------------------------------------
const detail = { loading: new Set(), loaded: new Map(), budget: 1600000, last: 0 };
function packCenterNow(pk) {
  const c = new THREE.Vector3(), tmp = new THREE.Vector3();
  let n = 0;
  for (const id of pk.sample) { partCenterNow(parts[id], tmp); c.add(tmp); n++; }
  return n ? c.divideScalar(n) : c;
}
async function updateDetail() {
  if (!manifest) return;
  const dist = camera.position.distanceTo(controls.target);
  if (dist > 1.5) { if (detail.loaded.size) unloadAllDetail(); updateHD(); return; }
  if (dist > 1.05) { updateHD(); return; }
  const tgt = controls.target;
  const want = manifest.packs
    .filter((pk) => layerOn(pk.sys) && systems[pk.sys].base)
    .map((pk) => ({ pk, d: packCenterNow(pk).distanceTo(tgt) - pk.radius }))
    .filter((x) => x.d < 0.12)
    .sort((a, b) => a.d - b.d);
  let used = 0;
  for (const [, v] of detail.loaded) used += v.vCount;
  for (const { pk } of want) {
    if (detail.loaded.has(pk.id) || detail.loading.has(pk.id)) continue;
    if (used + pk.vCount > detail.budget) {
      // evict the farthest loaded pack
      const far = [...detail.loaded.values()].map((v) => ({ v, d: packCenterNow(v.pk).distanceTo(tgt) })).sort((a, b) => b.d - a.d)[0];
      if (!far || far.d < packCenterNow(pk).distanceTo(tgt)) break;
      unloadDetail(far.v.pk.id); used -= far.v.vCount;
    }
    used += pk.vCount;
    loadDetail(pk);
  }
  updateHD();
}
async function loadDetail(pk) {
  detail.loading.add(pk.id); updateHD();
  try {
    const geo = await fetchPack(DATA, pk);
    const ms = makeMeshSet(pk.sys, geo, 1);
    systems[pk.sys].hi.set(pk.id, ms);
    detail.loaded.set(pk.id, { pk, vCount: pk.vCount });
    for (const id of pk.parts) parts[id].hi = true;
    writePartTexture(); syncVisibility();
  } catch (e) { console.warn(e); }
  detail.loading.delete(pk.id); updateHD();
}
function unloadDetail(id) {
  const v = detail.loaded.get(id); if (!v) return;
  const ms = systems[v.pk.sys].hi.get(id);
  if (ms) { ms.dispose(); systems[v.pk.sys].hi.delete(id); }
  for (const pid of v.pk.parts) parts[pid].hi = false;
  detail.loaded.delete(id);
  writePartTexture();
}
function unloadAllDetail() { for (const id of [...detail.loaded.keys()]) unloadDetail(id); }
function updateHD() {
  const el = $('#hd');
  const loading = detail.loading.size > 0;
  el.hidden = !loading && detail.loaded.size === 0;
  el.classList.toggle('loading', loading);
  el.textContent = loading ? 'Loading full detail' : 'Full detail';
}

// ---------------------------------------------------------------------------
// UI: layers
// ---------------------------------------------------------------------------
const chipsEl = $('#layers');
function buildLayerChips() {
  chipsEl.innerHTML = '';
  for (const L of LAYERS) {
    const b = document.createElement('button');
    b.className = 'chip'; b.id = `chip-${L.id}`; b.type = 'button';
    b.style.setProperty('--dot', L.dot);
    b.innerHTML = `<span class="dot"></span><span class="lbl">${L.label}</span><span class="sub"></span><span class="spin" aria-hidden="true"></span>`;
    b.addEventListener('click', () => {
      if (L.id === 'skin') { const order = ['clear', 'solid', 'off']; setSkinMode(order[(order.indexOf(state.skinMode) + 1) % order.length]); }
      else setLayer(L.id, !systems[L.id].on);
      sound.toggle(layerOn(L.id));
    });
    chipsEl.appendChild(b);
  }
  updateChips();
}
function updateChips() {
  for (const L of LAYERS) {
    const b = $(`#chip-${L.id}`), s = systems[L.id];
    const on = layerOn(L.id);
    b.classList.toggle('on', on);
    b.classList.toggle('loading', on && !s.base);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (L.id === 'skin') b.querySelector('.sub').textContent = state.skinMode;
  }
}
function setLayer(id, on) {
  systems[id].on = on;
  refit();
  if (on) ensureLoaded(id);
  if (!on && selSystems().has(id)) clearSelection();
  syncVisibility(); updateChips();
}
function setSkinMode(m) {
  state.skinMode = m;
  systems.skin.on = m !== 'off';
  refit();
  if (partState) recomputeStates();
  if (m !== 'off') ensureLoaded('skin');
  if (m === 'off' && selSystems().has('skin')) clearSelection();
  syncVisibility(); updateChips();
}

// ---------------------------------------------------------------------------
// UI: explode rail
// ---------------------------------------------------------------------------
const rail = $('#rail'), thumb = $('#rail-thumb'), railFill = $('#rail-fill'), stageLbl = $('#rail-stage'), railWrap = $('#rail-wrap');
function buildRailTicks() {
  const marks = [['skin', 'Skin'], ['muscles', 'Muscle'], ['skeleton', 'Bone'], ['organs', 'Organs']];
  $('#rail-ticks').innerHTML = marks.map(([id, l]) => `<span class="tick" style="top:${((1 - LAYER[id].t0) * 100).toFixed(1)}%"><span>${l}</span></span>`).join('');
}
function stageName(t) {
  if (t < 0.02) return 'Assembled';
  if (t > 0.985) return 'Fully exploded';
  let cur = LAYERS[0]; for (const L of LAYERS) if (t >= L.t0) cur = L;
  return `Separating ${cur.label.toLowerCase()}`;
}
function updateRailUI() {
  const pct = state.t * 100;
  thumb.style.top = `${100 - pct}%`;
  railFill.style.height = `${pct}%`;
  stageLbl.textContent = stageName(state.t);
  rail.setAttribute('aria-valuenow', Math.round(pct));
  rail.setAttribute('aria-valuetext', `${Math.round(pct)}% exploded`);
  $('#btn-explode').classList.toggle('active', state.t > 0.5);
  $('#btn-explode').setAttribute('aria-label', state.t > 0.5 ? 'Assemble the body' : 'Explode the body');
  $('#btn-explode .t').textContent = state.t > 0.5 ? 'Assemble' : 'Explode';
}
let railIdle = null;
function markRailActive() {
  railWrap.classList.add('active');
  clearTimeout(railIdle);
  railIdle = setTimeout(() => { if (!railWrap.classList.contains('held')) railWrap.classList.remove('active'); }, 1400);
}
let lastSnapT = 0;
function setT(t) {
  const nt = THREE.MathUtils.clamp(t, 0, 1);
  if (nt !== state.t) markRailActive();
  if (nt === 0 && state.t > 0.02 && performance.now() - lastSnapT > 500) { sound.snap(); lastSnapT = performance.now(); }
  state.t = nt;
  updateRailUI();
}
(function railInput() {
  let dragging = false, lastY = 0, lastTime = 0, samples = [];
  const h = () => rail.getBoundingClientRect().height;
  rail.addEventListener('pointerdown', (e) => {
    dragging = true; lastY = e.clientY; lastTime = performance.now(); samples = [];
    state.vel = 0; state.anim = null;
    rail.setPointerCapture(e.pointerId);
    railWrap.classList.add('held'); markRailActive(); dismissHint(); unlockAudio();
    e.preventDefault();
  });
  rail.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - lastY, now = performance.now();
    const dt = -dy / h();
    setT(state.t + dt);
    samples.push({ dt, ms: now - lastTime }); if (samples.length > 5) samples.shift();
    lastY = e.clientY; lastTime = now;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; railWrap.classList.remove('held'); markRailActive();
    const ms = samples.reduce((a, s) => a + s.ms, 0), d = samples.reduce((a, s) => a + s.dt, 0);
    if (ms > 0 && performance.now() - lastTime < 80) state.vel = THREE.MathUtils.clamp((d / ms) * 16, -0.08, 0.08);
  };
  rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end);
  rail.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    if (['ArrowUp', 'PageUp', 'ArrowRight'].includes(e.key)) { setT(state.t + step); e.preventDefault(); }
    if (['ArrowDown', 'PageDown', 'ArrowLeft'].includes(e.key)) { setT(state.t - step); e.preventDefault(); }
    if (e.key === 'Home') { setT(0); e.preventDefault(); }
    if (e.key === 'End') { setT(1); e.preventDefault(); }
  });
  rail.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); scrollExplode(e); }, { passive: false });
})();
function scrollExplode(e) {
  state.anim = null;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  setT(state.t + (e.deltaY * unit) / 1400);
  dismissHint();
}
stage.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); e.stopPropagation(); scrollExplode(e); }, { capture: true, passive: false });
function animateT(to, dur = 2600) { state.vel = 0; state.anim = { from: state.t, to, t0: performance.now(), dur: dur * Math.abs(to - state.t) + 200 }; }

// ---------------------------------------------------------------------------
// UI: toolbar
// ---------------------------------------------------------------------------
$('#btn-explode').addEventListener('click', () => { unlockAudio(); animateT(state.t > 0.5 ? 0 : 1); dismissHint(); });
$('#btn-reset').addEventListener('click', () => resetView());
$('#btn-spin').addEventListener('click', () => {
  state.spin = !state.spin; controls.autoRotate = state.spin;
  $('#btn-spin').classList.toggle('active', state.spin); $('#btn-spin').setAttribute('aria-pressed', state.spin ? 'true' : 'false');
});
$('#btn-unhide').addEventListener('click', () => { for (let i = 0; i < N; i++) if (userHidden[i] && !defaultHidden[i]) userHidden[i] = 0; recomputeStates(); });
$('#btn-help').addEventListener('click', () => showHint(true));
$('#sex-m').addEventListener('click', () => { unlockAudio(); setSex(false); });
$('#sex-f').addEventListener('click', () => { unlockAudio(); setSex(true); });
function updateToolbar() {
  let n = 0; for (let i = 0; i < N; i++) if (userHidden[i] && !defaultHidden[i]) n++;
  $('#btn-unhide').hidden = n === 0; $('#btn-unhide .n').textContent = n;
}

// ---------------------------------------------------------------------------
// Bottom panels (info sheet, motion, section, tours) — one open at a time on phones
// ---------------------------------------------------------------------------
function showPanel(id) {
  document.querySelectorAll('.bottom-panel').forEach((p) => { if (p.id !== id && p.classList.contains('open') && window.innerWidth < 820 && !(id === 'section' && p.id === 'sheet')) closePanelEl(p); });
  const el = document.getElementById(id);
  el.hidden = false;
  requestAnimationFrame(() => { el.classList.add('open'); setTimeout(() => { measureInsets(); state.needsRender = true; }, 340); });
  document.body.classList.add('has-panel');
}
function closePanelEl(el) {
  el.classList.remove('open', 'expanded');
  setTimeout(() => { if (!el.classList.contains('open')) el.hidden = true; measureInsets(); state.needsRender = true; }, 320);
  setTimeout(() => { if (!document.querySelector('.bottom-panel.open')) document.body.classList.remove('has-panel'); }, 10);
}
function hidePanel(id) { closePanelEl(document.getElementById(id)); }

// ---- info sheet ----
const sheet = $('#sheet');
const SYS_NOUN = { skin: 'Skin', muscles: 'Muscular system', joints: 'Joints & ligaments', skeleton: 'Skeletal system', lymph: 'Lymphatic system', vessels: 'Cardiovascular system', nerves: 'Nervous system', organs: 'Organs' };
function sizeText(ext) { const m = Math.max(ext[0], ext[1], ext[2]); return m >= 0.1 ? `${(m * 100).toFixed(0)} cm` : m >= 0.01 ? `${(m * 100).toFixed(1)} cm` : `${(m * 1000).toFixed(1)} mm`; }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const ROOT_GROUPS = /^(Regions of human body|Skeletal system|Muscular system|Visceral systems|Cardiovascular system|Nervous system & Sense organs|Lymphoid organs)$/;
function groupTitle(name) { return name === 'Cranium' || name === 'Bones of cranium' ? 'Skull (cranium)' : prettyName(name); }
function crumbsHtml(names, keys) {
  const items = [];
  names.forEach((g, i) => { if (!ROOT_GROUPS.test(g) && keys[i] && groupIndex.has(keys[i])) items.push(`<button type="button" class="crumb" data-gkey="${escapeHtml(keys[i])}">${escapeHtml(groupTitle(g))}</button>`); });
  return items.slice(-3).join('<span class="sep" aria-hidden="true">›</span>');
}
let refs = null, refsPromise = null;
function loadRefs() { if (!refsPromise) refsPromise = fetch(`${DATA}refs.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { refs = j; }); return refsPromise; }
function infoHtml(info, refKey) {
  let html = '';
  if (info.partOf) html += `<p class="partof">Part of <strong>${escapeHtml(info.partOf)}</strong></p>`;
  if (info.d) html += `<p class="lede">${escapeHtml(info.d)}</p>`;
  if (info.f) html += `<h3>What it does</h3><p>${escapeHtml(info.f)}</p>`;
  if (info.x && info.x.length) html += `<h3>Did you know?</h3><ul class="facts">${info.x.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  const note = refs && refs[refKey];
  if (note && info.partOf) html += `<h3>Atlas note</h3><p class="note">${escapeHtml(note)}</p>`;
  return html;
}
function setSheetHead(sys, side, title, crumbs, meta) {
  $('#sheet-sys').textContent = SYS_NOUN[sys];
  $('#sheet-sys').style.setProperty('--dot', LAYER[sys].dot);
  $('#sheet-side').textContent = side === 'L' ? "Body's left side" : side === 'R' ? "Body's right side" : '';
  $('#sheet-side').hidden = !side;
  $('#sheet-title').textContent = title;
  $('#sheet-path').innerHTML = crumbs; $('#sheet-path').hidden = !crumbs;
  $('#sheet-size').textContent = meta;
}
function openSheet(p) {
  const info = lookupInfo(p);
  const crumbs = crumbsHtml(p.groups, p.gkeys);
  setSheetHead(p.sys, p.side, p.title, crumbs, sizeText(p.ext));
  let html = infoHtml(info, p.name) || `<p class="lede">${escapeHtml(p.title)} belongs to the ${escapeHtml(SYS_NOUN[p.sys].toLowerCase())}.</p>`;
  if (p.modeled) html += `<p class="modeled">Modeled from standard adult measurements, not from scan data.</p>`;
  if (state.pg && p.pg === 2) html += `<p class="modeled">${pgName()} is on, so the genitals are smoothed over here.</p>`;
  if (crumbs) html += `<p class="hint-line">Tap a name above the title to select the whole structure it belongs to.</p>`;
  $('#sheet-body').innerHTML = html;
  if (!refs) loadRefs().then(() => { if (state.selected === p.id) openSheet(p); });
  showSheet('p' + p.id);
}
function openGroupSheet(g, ids) {
  const info = lookupInfo({ name: g.name, sys: g.sys, groups: g.parents });
  const p0 = parts[ids[0]];
  const depth = p0.groups.indexOf(g.name);
  const crumbs = crumbsHtml(p0.groups.slice(0, Math.max(0, depth)), p0.gkeys.slice(0, Math.max(0, depth)));
  const b = new THREE.Box3(), h = new THREE.Vector3();
  for (const i of ids) { const p = parts[i]; h.set(p.ext[0] / 2, p.ext[1] / 2, p.ext[2] / 2); b.expandByPoint(p.c.clone().sub(h)); b.expandByPoint(p.c.clone().add(h)); }
  const sz = b.getSize(new THREE.Vector3());
  setSheetHead(g.sys, g.side, groupTitle(g.name), crumbs, `${sizeText([sz.x, sz.y, sz.z])} · ${ids.length} parts`);
  let html = infoHtml(info, g.name);
  const seen = new Set(), chips = [];
  for (const i of ids) { const t = parts[i].title; if (seen.has(t)) continue; seen.add(t); chips.push(`<button type="button" class="member" data-id="${i}">${escapeHtml(t)}</button>`); }
  html += `<h3>Made up of</h3><div class="members">${chips.slice(0, 30).join('')}${chips.length > 30 ? `<span class="more">+ ${chips.length - 30} more</span>` : ''}</div>`;
  $('#sheet-body').innerHTML = html;
  if (!refs) loadRefs().then(() => { if (state.selGroup === g) openGroupSheet(g, ids); });
  showSheet('g' + g.key);
}
function showSheet(pid) {
  if (tour.active) return; // the tour card carries the text during a tour
  $('#btn-isolate').textContent = state.isolated ? 'Show all' : 'Isolate';
  $('#btn-isolate').setAttribute('aria-pressed', state.isolated ? 'true' : 'false');
  if (sheet.dataset.pid !== pid) $('#sheet-scroll').scrollTop = 0;
  sheet.dataset.pid = pid;
  showPanel('sheet');
}
function closeSheet() { hidePanel('sheet'); }
$('#sheet-path').addEventListener('click', (e) => { const b = e.target.closest('[data-gkey]'); if (b) selectGroup(b.dataset.gkey, { focus: true }); });
$('#sheet-body').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) select(+b.dataset.id, { focus: true }); });
$('#btn-close').addEventListener('click', () => clearSelection());
$('#btn-focus').addEventListener('click', () => { if (selSet.size) focusIds([...selSet]); });
$('#btn-isolate').addEventListener('click', () => {
  if (!selSet.size) return;
  state.isolated = !state.isolated; recomputeStates();
  $('#btn-isolate').textContent = state.isolated ? 'Show all' : 'Isolate';
  $('#btn-isolate').setAttribute('aria-pressed', state.isolated ? 'true' : 'false');
  if (state.isolated) focusIds([...selSet]);
});
$('#btn-slice').addEventListener('click', () => { if (selSet.size) openSection('part'); });
$('#btn-hide').addEventListener('click', () => { if (!selSet.size) return; for (const i of selSet) userHidden[i] = 1; clearSelection(); });
for (const el of document.querySelectorAll('.panel-handle')) {
  let y0 = null;
  el.addEventListener('pointerdown', (e) => { y0 = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup', (e) => {
    if (y0 === null) return;
    const panel = el.closest('.bottom-panel'); const dy = e.clientY - y0; y0 = null;
    if (dy > 40) { if (panel.classList.contains('expanded')) panel.classList.remove('expanded'); else if (panel.id === 'sheet') clearSelection(); else hidePanel(panel.id); }
    else if (dy < -40) panel.classList.add('expanded');
    else panel.classList.toggle('expanded');
    setTimeout(() => { measureInsets(); state.needsRender = true; }, 340);
  });
}

// ---- section panel ----
document.querySelectorAll('[data-axis]').forEach((b) => b.addEventListener('click', () => { state.clip.axis = b.dataset.axis; state.clip.pos = 0; updateClip(); syncSectionUI(); viewCut(); sound.slice(); }));
document.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; state.clip.scope = b.dataset.scope; setSectionIsolation(); updateClip(); syncSectionUI(); viewCut(); }));
$('#clip-pos').addEventListener('input', (e) => { state.clip.pos = +e.target.value / 100; updateClip(); });
$('#clip-flip').addEventListener('click', () => { state.clip.flip = !state.clip.flip; updateClip(); viewCut(); sound.slice(); });
$('#section-close').addEventListener('click', () => closeSection());
$('#btn-section').addEventListener('click', () => { unlockAudio(); if (state.clip.on) closeSection(); else openSection(selSet.size ? 'part' : 'all'); });

// ---- motion panel ----
function buildMotionPanel() {
  const list = $('#motion-list');
  list.innerHTML = PHYS.map((s) => `<button type="button" class="motion-row" data-sys="${s.id}" aria-pressed="false"><span class="sw" aria-hidden="true"></span><span class="txt"><span class="nm">${s.label}</span><span class="ht">${s.hint}</span></span></button>`).join('');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sys]'); if (!b) return;
    unlockAudio();
    const id = b.dataset.sys, on = !phys.on[id];
    setMotion(id, on);
    // first time on: bring the organ that shows this motion into view
    const mv = MOTION_VIEW[id];
    if (on && mv.select && !selSet.size && !tour.active) {
      const key = findGroupKey(mv.select);
      if (key) { selectGroup(key, { focus: true }); if (mv.isolate && !state.isolated) { state.isolated = true; recomputeStates(); focusIds([...selSet]); } }
    }
  });
}
const MOTION_VIEW = {
  heart: { layers: { vessels: true }, select: 'vessels|Heart', isolate: true },
  breath: { layers: { organs: true, skeleton: true }, select: 'organs|Lungs' },
  blood: { layers: { vessels: true } },
  nerves: { layers: { nerves: true } },
  brain: { layers: { nerves: true }, select: 'nerves|Brain', isolate: true },
  gut: { layers: { organs: true } },
  urine: { layers: { organs: true } },
  air: { layers: { organs: true } },
};
function setMotion(id, on) {
  phys.on[id] = on;
  if (on) for (const [k, v] of Object.entries(MOTION_VIEW[id].layers)) if (v && !layerOn(k)) setLayer(k, true);
  document.querySelectorAll(`.motion-row[data-sys="${id}"]`).forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
  $('#btn-motion').classList.toggle('active', phys.anyOn);
  sound.toggle(on);
  state.needsRender = true;
}
$('#btn-motion').addEventListener('click', () => { unlockAudio(); const p = $('#motion'); if (p.classList.contains('open')) hidePanel('motion'); else showPanel('motion'); });
$('#motion-close').addEventListener('click', () => hidePanel('motion'));
$('#motion-all').addEventListener('click', () => { const any = phys.anyOn; for (const s of PHYS) setMotion(s.id, !any); $('#motion-all').textContent = any ? 'Start all' : 'Stop all'; });
$('#bpm').addEventListener('input', (e) => { phys.bpm = +e.target.value; $('#bpm-val').textContent = `${phys.bpm} bpm`; $('#bpm-label').textContent = phys.bpm < 80 ? 'Resting' : phys.bpm < 120 ? 'Walking' : phys.bpm < 150 ? 'Jogging' : 'Sprinting'; });
$('#sound-toggle').addEventListener('click', async () => {
  if (sound.enabled) { sound.disable(); } else { await sound.enable(); }
  $('#sound-toggle').setAttribute('aria-pressed', sound.enabled ? 'true' : 'false');
  $('#sound-toggle .t').textContent = sound.enabled ? 'Sound on' : 'Sound off';
  try { localStorage.setItem('vh-sound', sound.enabled ? '1' : '0'); } catch { /* ignore */ }
});
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return; audioUnlocked = true;
  let pref = '1'; try { pref = localStorage.getItem('vh-sound') ?? '1'; } catch { /* ignore */ }
  if (pref === '1') sound.enable().then((ok) => { $('#sound-toggle').setAttribute('aria-pressed', ok ? 'true' : 'false'); $('#sound-toggle .t').textContent = ok ? 'Sound on' : 'Sound off'; });
}
phys.listeners.add((type, d) => {
  if (type === 'lub' || type === 'dub') { if (phys.on.heart) sound.heart(type, d.bpm); if (phys.on.heart) pulseHeartUI(type); }
  else if (type === 'eject') { if (phys.on.blood) sound.bloodWhoosh(d.bpm); }
  else if (type === 'inhale' || type === 'exhale') { if (phys.on.breath || phys.on.air) sound.breath(type, d.dur); }
});
function pulseHeartUI(kind) { const el = $('#btn-motion'); el.classList.remove('beat'); void el.offsetWidth; if (kind === 'lub') el.classList.add('beat'); }

// ---- tours ----
const tour = { active: null, step: 0 };
function buildTours() {
  $('#tour-list').innerHTML = TOURS.map((t, i) => `<button type="button" class="tour-card" data-tour="${i}"><span class="tc-k">${escapeHtml(t.kicker)}</span><span class="tc-t">${escapeHtml(t.title)}</span><span class="tc-d">${escapeHtml(t.blurb)}</span><span class="tc-n">${t.steps.length} steps</span></button>`).join('');
  $('#tour-list').addEventListener('click', (e) => { const b = e.target.closest('[data-tour]'); if (b) startTour(+b.dataset.tour); });
}
$('#btn-tours').addEventListener('click', () => { unlockAudio(); const p = $('#tours'); if (p.classList.contains('open')) hidePanel('tours'); else showPanel('tours'); });
$('#tours-close').addEventListener('click', () => hidePanel('tours'));
function startTour(i) { tour.active = TOURS[i]; tour.step = 0; hidePanel('tours'); $('#tour-card').hidden = false; requestAnimationFrame(measureInsets); runStep(); }
function endTour() { tour.active = null; $('#tour-card').hidden = true; requestAnimationFrame(measureInsets); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function runStep() {
  const T = tour.active; if (!T) return;
  const s = T.steps[tour.step];
  $('#tc-kicker').textContent = `${T.title} · ${tour.step + 1} of ${T.steps.length}`;
  $('#tc-title').textContent = s.title;
  $('#tc-text').textContent = state.pg && s.pgText ? s.pgText : s.text;
  $('#tc-prev').disabled = tour.step === 0;
  $('#tc-next').textContent = tour.step === T.steps.length - 1 ? 'Finish' : 'Next';
  // scene setup
  if (s.female !== undefined) setSex(s.female);
  if (s.skin) setSkinMode(s.skin);
  if (s.layers) for (const [k, v] of Object.entries(s.layers)) if (k !== 'skin' && layerOn(k) !== v) setLayer(k, v);
  for (const sys of PHYS) { const want = (s.motion || []).includes(sys.id); if (phys.on[sys.id] !== want) setMotion(sys.id, want); }
  if (s.explode !== undefined) animateT(s.explode, 1800);
  if (s.bpm) { phys.bpm = s.bpm; $('#bpm').value = s.bpm; $('#bpm').dispatchEvent(new Event('input')); }
  if (state.clip.on && !s.clip) closeSection();
  const after = () => {
    if (s.group) { const key = findGroupKey(s.group); if (key) selectGroup(key, { focus: !s.view }); }
    else if (s.part) { const p = parts.find((q) => q.name === s.part[0] && (!s.part[1] || q.side === s.part[1]) && sexOk(q)); if (p) select(p.id, { focus: !s.view }); }
    else clearSelection();
    if (s.isolate && selSet.size && !state.isolated) { state.isolated = true; recomputeStates(); }
    if (s.clip) { state.clip.axis = s.clip.axis; state.clip.flip = !!s.clip.flip; openSection(s.clip.scope || 'part'); state.clip.pos = s.clip.pos || 0; updateClip(); syncSectionUI(); }
    if (s.view) { const tgt = new THREE.Vector3(...s.view.target); const dir = new THREE.Vector3(...s.view.dir).normalize(); animateCamera(tgt, tgt.clone().addScaledVector(dir, s.view.dist), 1200); }
    hidePanel('sheet');
  };
  setTimeout(after, s.female !== undefined ? 600 : 50);
  narrate(`${s.title}. ${state.pg && s.pgText ? s.pgText : s.text}`);
}
function findGroupKey(spec) {
  const [sys, name, side] = spec.split('|');
  for (const [k, g] of groupIndex) if (g.sys === sys && g.name === name && (!side || g.side === side)) return k;
  return null;
}
$('#tc-next').addEventListener('click', () => { if (!tour.active) return; if (tour.step < tour.active.steps.length - 1) { tour.step++; runStep(); } else endTour(); });
$('#tc-prev').addEventListener('click', () => { if (tour.active && tour.step > 0) { tour.step--; runStep(); } });
$('#tc-close').addEventListener('click', () => endTour());
let narrateOn = false;
$('#tc-voice').addEventListener('click', () => { narrateOn = !narrateOn; $('#tc-voice').setAttribute('aria-pressed', narrateOn ? 'true' : 'false'); if (!narrateOn && 'speechSynthesis' in window) speechSynthesis.cancel(); else if (tour.active) narrate(`${tour.active.steps[tour.step].title}. ${tour.active.steps[tour.step].text}`); });
function narrate(text) {
  if (!narrateOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.speak(u);
}

// ---------------------------------------------------------------------------
// UI: search
// ---------------------------------------------------------------------------
const searchEl = $('#search'), searchInput = $('#search-input'), searchList = $('#search-results');
let searchIndex = [];
function openSearch() { searchEl.hidden = false; requestAnimationFrame(() => searchEl.classList.add('open')); searchInput.value = ''; renderSearch(''); setTimeout(() => searchInput.focus(), 60); }
function closeSearch() { searchEl.classList.remove('open'); setTimeout(() => { searchEl.hidden = true; }, 220); }
const ALIASES = {
  Cranium: 'skull head', 'Vertebral column': 'spine backbone', 'Anterior compartment of thigh': 'quadriceps quads', 'Posterior compartment of thigh': 'hamstrings',
  Eyeball: 'eye', 'Tracheobronchial tree': 'airways bronchi windpipe', Teeth: 'tooth', Heart: 'cardiac', Femur: 'thigh bone', Clavicle: 'collarbone collar bone',
  Scapula: 'shoulder blade', Patella: 'kneecap knee cap', Tibia: 'shinbone shin', Sternum: 'breastbone', Calcaneus: 'heel bone', Mandible: 'jaw jawbone',
  Maxilla: 'upper jaw', Coccyx: 'tailbone', Trachea: 'windpipe', Oesophagus: 'esophagus gullet food pipe', 'Tympanic membrane': 'eardrum', 'Calcaneal tendon': 'achilles tendon',
  Umbilicus: 'belly button navel', 'Thyroid cartilage': "adam's apple adams apple voice box", 'Urinary bladder': 'bladder pee', 'Hip bone': 'pelvis', 'Zygomatic bone': 'cheekbone',
  'Gluteus maximus muscle': 'buttock glutes', 'Rectus abdominis muscle': 'abs six pack', 'Latissimus dorsi muscle': 'lats', Diaphragm: 'breathing', 'Vermiform appendix': 'appendix',
  'Suprarenal gland': 'adrenal', Jejunum: 'small intestine', Lungs: 'lung', 'Sciatic nerve': 'sciatica', Brain: 'mind', Cerebrum: 'brain', Cerebellum: 'brain', Brainstem: 'brain stem',
  Larynx: 'voice box', Ribs: 'rib cage ribcage', 'Uterine tube': 'fallopian tube oviduct', Uterus: 'womb', Ovary: 'ovaries egg', 'Mammary gland lobes': 'breast', 'Breast adipose tissue': 'breast',
  'Lymph nodes': 'glands lymph', 'Palatine tonsil': 'tonsils', 'Female genital system': 'reproductive female', 'Male genital system': 'reproductive male', 'Glans of clitoris': 'clitoris',
};
function buildGroups() {
  const base = new Map();
  for (const p of parts) p.groups.forEach((g, gi) => { const k = p.sys + '|' + g; let e = base.get(k); if (!e) base.set(k, (e = { sys: p.sys, name: g, ids: [], parents: p.groups.slice(0, gi) })); e.ids.push(p.id); });
  for (const [k, e] of base) {
    const sides = new Set(e.ids.map((i) => parts[i].side || null));
    if (sides.has('L') && sides.has('R') && !sides.has(null)) {
      for (const sd of ['L', 'R']) groupIndex.set(k + '|' + sd, { key: k + '|' + sd, sys: e.sys, name: e.name, side: sd, ids: e.ids.filter((i) => parts[i].side === sd), parents: e.parents });
    } else groupIndex.set(k, { key: k, sys: e.sys, name: e.name, side: null, ids: e.ids, parents: e.parents });
  }
  for (const p of parts) p.gkeys = p.groups.map((g) => (groupIndex.has(p.sys + '|' + g) ? p.sys + '|' + g : p.sys + '|' + g + '|' + p.side));
}
const FEATURED = [['g', 'nerves', 'Brain'], ['g', 'vessels', 'Heart'], ['p', 'Liver'], ['g', 'organs', 'Lungs'], ['g', 'skeleton', 'Bones of cranium'], ['p', 'Femur', 'L'], ['p', 'Stomach'], ['p', 'Kidney', 'L'], ['g', 'organs', 'Female genital system'], ['g', 'organs', 'Male genital system'], ['g', 'nerves', 'Eyeball', 'L'], ['p', 'Diaphragm']];
function featured() {
  const out = [];
  for (const [kind, a, b, c] of FEATURED) {
    if (kind === 'p') { const hit = searchIndex.find((s) => s.kind === 'p' && s.p.name === a && (!b || s.p.side === b) && sexOk(s.p)); if (hit) out.push(hit); }
    else { const hit = searchIndex.find((s) => s.kind === 'g' && s.g.sys === a && s.g.name === b && (!c || s.g.side === c) && s.g.ids.some((i) => sexOk(parts[i]))); if (hit) out.push(hit); }
  }
  return out;
}
function sideLabel(sd) { return sd === 'L' ? 'Left · ' : sd === 'R' ? 'Right · ' : ''; }
function renderSearch(q) {
  q = q.trim().toLowerCase();
  let res;
  const ok = (s) => (s.kind === 'p' ? sexOk(s.p) : s.g.ids.some((i) => sexOk(parts[i])));
  if (!q) { res = featured(); $('#search-hint').textContent = 'Popular'; }
  else {
    const words = q.split(/\s+/);
    res = searchIndex.filter((s) => ok(s) && words.every((w) => s.lc.includes(w)));
    const score = (s) => { const t = s.title.toLowerCase(); return t === q ? 0 : t.startsWith(q) ? 1 : (' ' + s.lc).includes(' ' + q) ? 2 : 3; };
    res.sort((a, b) => score(a) - score(b) || (a.kind === 'g' ? -1 : 0) - (b.kind === 'g' ? -1 : 0) || a.title.length - b.title.length);
    $('#search-hint').textContent = res.length ? `${res.length} match${res.length === 1 ? '' : 'es'}` : 'No matches. Try a simpler word, like “arm” or “vein”.';
    res = res.slice(0, 80);
  }
  searchList.innerHTML = res.map((s) => {
    if (s.kind === 'g') return `<li><button type="button" data-gkey="${escapeHtml(s.g.key)}"><span class="dot whole" style="--dot:${LAYER[s.g.sys].dot}"></span><span class="nm">${escapeHtml(s.title)}</span><span class="meta">${sideLabel(s.g.side)}${s.g.ids.filter((i) => sexOk(parts[i])).length} parts</span></button></li>`;
    return `<li><button type="button" data-id="${s.p.id}"><span class="dot" style="--dot:${LAYER[s.p.sys].dot}"></span><span class="nm">${escapeHtml(s.p.title)}</span><span class="meta">${sideLabel(s.p.side)}${LAYER[s.p.sys].label}</span></button></li>`;
  }).join('');
}
searchInput.addEventListener('input', () => renderSearch(searchInput.value));
searchList.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id], button[data-gkey]'); if (!b) return;
  closeSearch();
  if (b.dataset.gkey) selectGroup(b.dataset.gkey, { focus: true, fromSearch: true }); else select(+b.dataset.id, { focus: true, fromSearch: true });
});
$('#btn-search').addEventListener('click', () => { unlockAudio(); openSearch(); });
$('#search-close').addEventListener('click', closeSearch);
searchEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });

// ---------------------------------------------------------------------------
// Hint, toast
// ---------------------------------------------------------------------------
const hint = $('#hint');
let hintTimer = null;
function showHint(force) { hint.hidden = false; requestAnimationFrame(() => hint.classList.add('show')); clearTimeout(hintTimer); if (!force) hintTimer = setTimeout(dismissHint, 10000); }
function dismissHint() { if (hint.hidden) return; hint.classList.remove('show'); setTimeout(() => { hint.hidden = true; }, 300); }
$('#hint-ok').addEventListener('click', () => { unlockAudio(); dismissHint(); });
function showToast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(showToast.tm);
  showToast.tm = setTimeout(() => { t.classList.remove('show'); setTimeout(() => (t.hidden = true), 300); }, 4200);
}
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showToast('The 3D view paused to save memory. Reload the page to continue.'); });

// ---------------------------------------------------------------------------
// Tap vs drag
// ---------------------------------------------------------------------------
(function tapSelect() {
  let down = null, multi = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) { multi = true; return; }
    multi = false; down = { x: e.clientX, y: e.clientY, t: performance.now() };
    state.camAnim = null; dismissHint(); unlockAudio();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!e.isPrimary || !down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    if (!multi && moved < 8 && dt < 450) {
      const id = pickAt(e.clientX, e.clientY);
      if (id >= 0) select(id); else if (selSet.size) clearSelection();
      state.needsRender = true;
    }
    down = null;
  });
})();
controls.addEventListener('change', () => { state.needsRender = true; });
controls.addEventListener('start', () => { state.camAnim = null; });

// ---------------------------------------------------------------------------
// View label
// ---------------------------------------------------------------------------
const viewLbl = $('#view-label');
let lastView = '';
function updateViewLabel() {
  const v = camera.position.clone().sub(controls.target);
  const el = Math.atan2(v.y, Math.hypot(v.x, v.z)) * 180 / Math.PI;
  const az = Math.atan2(v.x, v.z) * 180 / Math.PI;
  let name;
  if (el > 62) name = 'Superior view'; else if (el < -62) name = 'Inferior view';
  else { const a = Math.abs(az); if (a < 30) name = 'Anterior view'; else if (a > 150) name = 'Posterior view'; else if (a >= 60 && a <= 120) name = az > 0 ? 'Left lateral view' : 'Right lateral view'; else name = (a < 90 ? 'Anterolateral' : 'Posterolateral') + (az > 0 ? ' (left)' : ' (right)'); }
  if (name !== lastView) { viewLbl.textContent = name; lastView = name; }
  // sound panning: heart sits on the body's left
  sound.pan.heart = THREE.MathUtils.clamp(Math.sin(THREE.MathUtils.degToRad(az)) * 0.0 + Math.cos(THREE.MathUtils.degToRad(az)) * 0.15, -0.4, 0.4);
}

// ---------------------------------------------------------------------------
// Resize + render loop
// ---------------------------------------------------------------------------
let initialized = false;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const prev = initialized ? fitDistance(state.t) : 0;
  measureInsets();
  applyViewOffset();
  pipeline.setSize(w, h);
  if (initialized) {
    const next = fitDistance(state.t);
    const off = camera.position.clone().sub(controls.target).multiplyScalar(next / prev);
    camera.position.copy(controls.target).add(off);
    lastFit = { d: next, y: fitCenterY(state.t) };
  }
  state.needsRender = true;
}
window.addEventListener('resize', resize);

let lastFrame = performance.now(), lastActive = 0, idleDetailCheck = 0, prevT = 0;
const _keyV = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  let active = false;
  if (state.anim) {
    const a = state.anim; const k = Math.min(1, (now - a.t0) / a.dur);
    setT(a.from + (a.to - a.from) * ease(k)); if (k >= 1) state.anim = null; active = true;
  } else if (Math.abs(state.vel) > 0.0004) {
    setT(state.t + state.vel); state.vel *= 0.92; if (state.t <= 0 || state.t >= 1) state.vel = 0; active = true;
  }
  if (state.fAnim) {
    const a = state.fAnim; const k = Math.min(1, (now - a.t0) / a.dur);
    state.fT = a.from + (a.to - a.from) * ease(k); U.uFemale.value = state.fT;
    if (k >= 1) { state.fAnim = null; refit(600); }
    state.tShown = -1; active = true;
  }
  if (state.pgAnim) {
    const a = state.pgAnim; const k = Math.min(1, (now - a.t0) / a.dur);
    U.uPG.value = a.from + (a.to - a.from) * ease(k);
    if (k >= 1) state.pgAnim = null;
    active = true;
  }
  sound.explodeMotion(Math.abs(state.t - prevT) / Math.max(dt, 1e-3) * 0.6);
  prevT = state.t;
  if (partTex && state.t !== state.tShown) { writePartTexture(); applyAutoFit(); if (state.clip.on) updateClip(); }
  if (state.camAnim) {
    const c = state.camAnim; const k = Math.min(1, (now - c.t0) / c.dur), e = ease(k);
    controls.target.lerpVectors(c.fromT, c.target, e); camera.position.lerpVectors(c.fromP, c.position, e);
    if (k >= 1) state.camAnim = null; active = true;
  }
  if (stepViewShift()) active = true;
  if (controls.update()) active = true;
  if (phys.anyOn) { phys.update(dt); phys.writeUniforms(U); sound.tick(dt, phys.on); active = true; }
  updateCutaway();
  if (active || state.needsRender) {
    _keyV.copy(key.position).normalize().transformDirection(camera.matrixWorldInverse);
    U.uKeyDir.value.copy(_keyV);
  }
  if (active) {
    lastActive = now;
    pipeline.apply('motion');
    const t0 = performance.now();
    pipeline.render(dt);
    pipeline.adapt(performance.now() - t0 + (dt * 1000 > 40 ? 8 : 0), now);
    updateViewLabel();
    state.needsRender = false;
  } else if (state.needsRender || (pipeline.level === 'motion' && now - lastActive > 220)) {
    pipeline.apply('still');
    pipeline.render(dt);
    updateViewLabel();
    state.needsRender = false;
  }
  if (!active && now - idleDetailCheck > 400 && now - lastActive > 300) { idleDetailCheck = now; updateDetail(); }
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
const loadPromises = {}, progress = {};
function setProgressUI() {
  const ids = LOAD_ORDER.filter((id) => systems[id].on || id === 'skin');
  const p = ids.reduce((a, id) => a + (progress[id] || 0), 0) / ids.length;
  $('#load-bar').style.transform = `scaleX(${p.toFixed(3)})`;
  if (p >= 0.999) $('#loader').classList.add('done');
}
function ensureLoaded(id) {
  if (loadPromises[id]) return loadPromises[id];
  const def = manifest.systems.find((s) => s.id === id);
  updateChips();
  loadPromises[id] = fetchPack(DATA, def, (f) => { progress[id] = f * 0.95; setProgressUI(); })
    .then((geo) => {
      systems[id].base = makeMeshSet(id, geo, 0);
      progress[id] = 1; setProgressUI(); syncVisibility(); updateChips();
    })
    .catch((err) => {
      console.error(err);
      $('#chip-' + id).classList.add('error');
      showToast(`${LAYER[id].label} didn’t load. Check your connection and tap the layer again.`);
      delete loadPromises[id];
    });
  return loadPromises[id];
}

async function init() {
  const res = await fetch(`${DATA}manifest.json`);
  manifest = await res.json();
  const { qmin, qmax } = manifest;
  U.uQMin.value.set(...qmin);
  U.uQScale.value.set(qmax[0] - qmin[0], qmax[1] - qmin[1], qmax[2] - qmin[2]);
  N = manifest.parts.length;
  parts = manifest.parts.map(([id, sys, name, side, groups, c, ext, hidden, sex, anim, pivot, axis, region, flags, fo, pg]) => ({
    id, sys, name, side, groups: groups ? groups.split('>') : [], c: new THREE.Vector3(...c), ext, hidden, sex, anim, pivot, axis, region, flags, fo, pg: pg || 0, hi: false,
  }));
  for (const p of parts) {
    p.title = prettyName(p.name);
    p.modeled = p.sex === 2 && (p.sys === 'organs' || p.name === 'Pudendal region' || /Breast|Nipple|Ovarian|Uterine artery/.test(p.name));
    p.Dm = explodeVector(p, p.c);
    p.cF = femaleCenter(p);
    p.Df = explodeVector(p, p.cF);
    if (HOLLOW.test(p.name) || (p.sys === 'vessels' && !/atrium|ventricle|leaflet|papillary/i.test(p.name))) p.flags |= 2;
  }
  // packs: a few sample parts for quick centre estimates, and a radius
  for (const pk of manifest.packs) {
    pk.sample = pk.parts.filter((_, i) => i % Math.max(1, Math.floor(pk.parts.length / 24)) === 0);
    const c = new THREE.Vector3(); for (const id of pk.parts) c.add(parts[id].c); c.divideScalar(pk.parts.length);
    let r = 0; for (const id of pk.parts) r = Math.max(r, parts[id].c.distanceTo(c)); pk.radius = Math.min(0.25, r * 0.6);
  }
  const H = Math.ceil(N / TEX_W);
  partTexData = new Float32Array(TEX_W * H * 4);
  partTex = new THREE.DataTexture(partTexData, TEX_W, H, THREE.RGBAFormat, THREE.FloatType);
  partTex.magFilter = partTex.minFilter = THREE.NearestFilter; partTex.needsUpdate = true;
  U.uPartTex.value = partTex;
  U.uAnimTex.value = staticTexture((p, d, o) => { d[o] = p.anim; d[o + 1] = p.pivot[0]; d[o + 2] = p.pivot[1]; d[o + 3] = p.pivot[2]; });
  U.uAxisTex.value = staticTexture((p, d, o) => { d[o] = p.axis[0]; d[o + 1] = p.axis[1]; d[o + 2] = p.axis[2]; d[o + 3] = p.flags; });
  U.uFemTex.value = staticTexture((p, d, o) => { d[o] = p.fo[0]; d[o + 1] = p.fo[1]; d[o + 2] = p.fo[2]; d[o + 3] = p.sex + 4 * p.pg; });
  (manifest.landmarks.nipples || []).slice(0, 2).forEach((q, i) => { U.uNip.value[i * 2].set(...q.tip, q.h); U.uNip.value[i * 2 + 1].set(...q.n, q.r); });
  let pgSaved = false; try { pgSaved = localStorage.getItem('vh-pg') === '1'; } catch (e) { /* storage unavailable */ }
  if (pgSaved) setPG(true, { quiet: true }); else syncPGButton();
  partState = new Float32Array(N); userHidden = new Uint8Array(N); defaultHidden = new Uint8Array(N);
  parts.forEach((p, i) => { if (p.hidden) userHidden[i] = defaultHidden[i] = 1; });
  for (const L of LAYERS) systems[L.id] = { def: L, on: L.on, base: null, hi: new Map() };
  buildGroups();
  searchIndex = parts.map((p) => ({ kind: 'p', p, title: p.title, lc: (p.title + ' ' + p.name + ' ' + (ALIASES[p.name] || '')).toLowerCase() }));
  for (const g of groupIndex.values()) {
    if (g.ids.length < 2 || ROOT_GROUPS.test(g.name)) continue;
    const title = groupTitle(g.name);
    searchIndex.push({ kind: 'g', g, title, lc: (title + ' ' + (ALIASES[g.name] || '')).toLowerCase() });
  }
  buildLayerChips(); buildRailTicks(); buildMotionPanel(); buildTours();
  computeLayerBounds();
  recomputeStates();
  resize();
  const { tgt, pos } = homePose();
  controls.target.copy(tgt); camera.position.copy(pos);
  lastFit = { d: fitDistance(0), y: fitCenterY(0) };
  initialized = true;
  updateRailUI();
  requestAnimationFrame(frame);
  const first = LOAD_ORDER.filter((id) => systems[id].on);
  await Promise.all(first.map((id) => ensureLoaded(id)));
  showHint(false);
  for (const id of LOAD_ORDER) if (!systems[id].on) await ensureLoaded(id);
}

init().catch((err) => { console.error(err); $('#loader-text').textContent = 'The anatomy data could not load. Reload the page to try again.'; });

// Installable app: offline cache via a service worker (not available inside sandboxed previews)
if ('serviceWorker' in navigator && !window.__VH_DATA_FORMAT__ && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('offline cache unavailable', e)); });
}
{
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (ios && !standalone && !window.__VH_DATA_FORMAT__) $('#install-tip').hidden = false;
}

window.__vh = { setT, select, selectGroup, setLayer, setSkinMode, setSex, setPG, setMotion, openSection, closeSection, startTour, parts: () => parts, state, phys, camera, controls, resetView, groupIndex, view, U, pipeline, findGroupKey, updateDetail, detail };
