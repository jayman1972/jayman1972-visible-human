// Flatten a Z-Anatomy GLB into a list of anatomical parts with baked world transforms.
import { NodeIO, Document } from '@gltf-transform/core';
import fs from 'node:fs';

const SKIP_MATS = new Set(['Text', 'DefaultMaterial']);
const io = new NodeIO();

function mat4MulVec(m, x, y, z, w) {
  return [m[0]*x + m[4]*y + m[8]*z + m[12]*w, m[1]*x + m[5]*y + m[9]*z + m[13]*w, m[2]*x + m[6]*y + m[10]*z + m[14]*w];
}
function det3(m) {
  return m[0]*(m[5]*m[10]-m[6]*m[9]) - m[4]*(m[1]*m[10]-m[2]*m[9]) + m[8]*(m[1]*m[6]-m[2]*m[5]);
}
function normalMatrix(m) { // inverse transpose of upper 3x3, column-major result as 3x3 rows
  const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10];
  const A=e*i-f*h, B=-(d*i-f*g), C=d*h-e*g, D=-(b*i-c*h), E=a*i-c*g, F=-(a*h-b*g), G=b*f-c*e, H=-(a*f-c*d), I=a*e-b*d;
  const det = a*A + b*B + c*C;
  // inverse = adj^T / det ; inverse transpose = cofactor / det
  return [[A/det, B/det, C/det], [D/det, E/det, F/det], [G/det, H/det, I/det]];
}

export async function extract(file) {
  const doc = await io.read(file);
  const parts = [];
  function walk(node, groups) {
    const name = node.getName();
    const mesh = node.getMesh();
    const isLabel = /-line$/.test(name) || /\.t$/.test(name) || name === 'Key color' || name.startsWith('HOW TO');
    if (isLabel) return; // labels and their children are text
    const gname = name.replace(/\.g$/, '');
    const nextGroups = name.endsWith('.g') ? [...groups, gname] : groups;
    if (mesh && !name.endsWith('.g')) {
      const wm = node.getWorldMatrix();
      const flip = det3(wm) < 0;
      const nm = normalMatrix(wm);
      const prims = [];
      for (const p of mesh.listPrimitives()) {
        const mat = p.getMaterial()?.getName() || 'none';
        if (SKIP_MATS.has(mat)) continue;
        if (p.getMode() !== 4) continue;
        const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), idx = p.getIndices();
        const n = pos.getCount();
        const P = new Float32Array(n*3), N = new Float32Array(n*3);
        const v = [0,0,0], vn = [0,0,0];
        for (let k=0;k<n;k++) {
          pos.getElement(k, v);
          const w = mat4MulVec(wm, v[0], v[1], v[2], 1);
          P[k*3]=w[0]; P[k*3+1]=w[1]; P[k*3+2]=w[2];
          if (nor) {
            nor.getElement(k, vn);
            let x = nm[0][0]*vn[0]+nm[0][1]*vn[1]+nm[0][2]*vn[2];
            let y = nm[1][0]*vn[0]+nm[1][1]*vn[1]+nm[1][2]*vn[2];
            let z = nm[2][0]*vn[0]+nm[2][1]*vn[1]+nm[2][2]*vn[2];
            const l = Math.hypot(x,y,z)||1; N[k*3]=x/l; N[k*3+1]=y/l; N[k*3+2]=z/l;
          }
        }
        let I = idx ? Uint32Array.from(idx.getArray()) : Uint32Array.from({length:n}, (_, k) => k);
        if (flip) for (let k=0;k<I.length;k+=3) { const t=I[k+1]; I[k+1]=I[k+2]; I[k+2]=t; }
        prims.push({ mat, P, N: nor ? N : null, I });
      }
      if (prims.length) parts.push({ name, groups, prims });
    }
    for (const c of node.listChildren()) walk(c, nextGroups);
  }
  for (const s of doc.getRoot().listScenes()) for (const n of s.listChildren()) walk(n, []);
  return parts;
}

if (process.argv[1].endsWith("extract.mjs") && process.argv[2]) {
  const parts = await extract(process.argv[2]);
  let min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9], tv=0;
  for (const p of parts) for (const pr of p.prims) { tv += pr.P.length/3; for (let k=0;k<pr.P.length;k+=3) for (let a=0;a<3;a++){ min[a]=Math.min(min[a],pr.P[k+a]); max[a]=Math.max(max[a],pr.P[k+a]); } }
  console.log(process.argv[2], 'parts', parts.length, 'verts', tv, 'bbox', min.map(x=>+x.toFixed(3)), max.map(x=>+x.toFixed(3)));
}
