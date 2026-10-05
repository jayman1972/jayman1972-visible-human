// Loading and decoding .mvb geometry packs (gzip + meshopt).
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const DATA_FORMAT = globalThis.__VH_DATA_FORMAT__ || 'bin'; // 'bin' (gzip) or 'b64' (base64 text of the gzip)

async function readAll(res, expected, onProgress) {
  if (!res.body || !res.body.getReader) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    onProgress && expected && onProgress(Math.min(1, got / expected));
  }
  const all = new Uint8Array(got); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return all;
}
function b64ToBytes(text) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(text.trim());
  const bin = atob(text.trim()); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function gunzip(bytes) {
  if (typeof DecompressionStream === 'function') {
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const { gunzipSync } = await import('./gunzip.js');
  return gunzipSync(bytes);
}

export async function fetchPack(baseUrl, entry, onProgress) {
  const url = DATA_FORMAT === 'b64' ? `${baseUrl}${entry.file.replace(/\.mvb$/, '.b64.txt')}` : `${baseUrl}${entry.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${entry.file} (${res.status})`);
  let bytes = await readAll(res, DATA_FORMAT === 'b64' ? Math.ceil(entry.bytes / 3) * 4 : entry.bytes, onProgress);
  if (DATA_FORMAT === 'b64') bytes = b64ToBytes(new TextDecoder().decode(bytes));
  const raw = await gunzip(bytes);
  return decodeGeometry(raw, entry);
}

function octDecode(u, v, out, o) {
  let x = u / 127, y = v / 127;
  let z = 1 - Math.abs(x) - Math.abs(y);
  if (z < 0) { const ox = x; x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1); y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1); }
  const l = Math.hypot(x, y, z) || 1;
  out[o] = Math.round((x / l) * 127); out[o + 1] = Math.round((y / l) * 127); out[o + 2] = Math.round((z / l) * 127);
}

export async function decodeGeometry(raw, entry) {
  await MeshoptDecoder.ready;
  const { vCount, iCount, vBytes, iBytes } = entry;
  const stride = 20;
  const vb = new Uint8Array(vCount * stride);
  MeshoptDecoder.decodeVertexBuffer(vb, vCount, stride, raw.subarray(0, vBytes));
  const ib = new Uint32Array(iCount);
  MeshoptDecoder.decodeIndexBuffer(new Uint8Array(ib.buffer), iCount, 4, raw.subarray(vBytes, vBytes + iBytes));
  const dv = new DataView(vb.buffer);
  const pos = new Uint16Array(vCount * 3), pid = new Uint16Array(vCount), nor = new Int8Array(vCount * 3);
  const col = new Uint8Array(vCount * 3), rough = new Uint8Array(vCount), tis = new Uint8Array(vCount), flow = new Uint16Array(vCount);
  for (let i = 0; i < vCount; i++) {
    const o = i * stride;
    pos[i * 3] = dv.getUint16(o, true); pos[i * 3 + 1] = dv.getUint16(o + 2, true); pos[i * 3 + 2] = dv.getUint16(o + 4, true);
    pid[i] = dv.getUint16(o + 6, true);
    octDecode(dv.getInt8(o + 8), dv.getInt8(o + 9), nor, i * 3);
    tis[i] = vb[o + 10]; rough[i] = vb[o + 11];
    col[i * 3] = vb[o + 12]; col[i * 3 + 1] = vb[o + 13]; col[i * 3 + 2] = vb[o + 14];
    flow[i] = dv.getUint16(o + 16, true);
  }
  const geo = new THREE.BufferGeometry();
  const free = function () { this.array = null; };
  const attr = (name, arr, size, normalized) => { const a = new THREE.BufferAttribute(arr, size, normalized); a.onUpload(free); geo.setAttribute(name, a); };
  attr('position', pos, 3, true);
  attr('normal', nor, 3, true);
  attr('color', col, 3, true);
  attr('aRough', rough, 1, true);
  attr('aTissue', tis, 1, false);
  attr('partId', pid, 1, false);
  attr('aFlow', flow, 1, false);
  if (entry.femBytes) { // female stream (int16, 0.1 mm): skin offsets + female normals (oct), or corrections to the field
    const fs = 8, fb = new Uint8Array(vCount * fs);
    MeshoptDecoder.decodeVertexBuffer(fb, vCount, fs, raw.subarray(vBytes + iBytes, vBytes + iBytes + entry.femBytes));
    const fdv = new DataView(fb.buffer), fd = new Int16Array(vCount * 3), fn = new Int8Array(vCount * 2);
    for (let i = 0; i < vCount; i++) { const o = i * fs; fd[i * 3] = fdv.getInt16(o, true); fd[i * 3 + 1] = fdv.getInt16(o + 2, true); fd[i * 3 + 2] = fdv.getInt16(o + 4, true); fn[i * 2] = fdv.getInt8(o + 6); fn[i * 2 + 1] = fdv.getInt8(o + 7); }
    attr('aFemD', fd, 3, false);
    if (entry.femAbs) attr('aFemN', fn, 2, true);
  }
  const index = new THREE.BufferAttribute(ib, 1); index.onUpload(free);
  geo.setIndex(index);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 3);
  return geo;
}

// The female shape field for everything inside the body: a 3D grid of offsets (int16, 0.1 mm)
export async function fetchFemaleField(baseUrl, entry) {
  const url = DATA_FORMAT === 'b64' ? `${baseUrl}${entry.file.replace(/\.mvb$/, '.b64.txt')}` : `${baseUrl}${entry.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${entry.file} (${res.status})`);
  let bytes = new Uint8Array(await res.arrayBuffer());
  if (DATA_FORMAT === 'b64') bytes = b64ToBytes(new TextDecoder().decode(bytes));
  const raw = await gunzip(bytes);
  const [nx, ny, nz] = entry.dims, n = nx * ny * nz, src = new Int16Array(raw.buffer, raw.byteOffset, n * 3);
  const half = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) { for (let a = 0; a < 3; a++) half[i * 4 + a] = THREE.DataUtils.toHalfFloat(src[i * 3 + a] * 1e-4); half[i * 4 + 3] = 0; }
  const tex = new THREE.Data3DTexture(half, nx, ny, nz);
  tex.format = THREE.RGBAFormat; tex.type = THREE.HalfFloatType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1; tex.needsUpdate = true;
  return tex;
}
