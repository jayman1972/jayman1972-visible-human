import fs from 'node:fs';
const dir = 'za/Assets/Descriptions/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
const m = JSON.parse(fs.readFileSync('out2/manifest.json'));
const norm = s => s.toLowerCase().replace(/\.\d{3}$/, '').replace(/[()*\[\]]/g, '').replace(/\s+/g, ' ').trim();
const byName = new Map(files.map(f => [norm(f.replace(/\.txt$/, '')), f]));
let hit = 0, miss = 0; const out = {};
function lede(text) {
  // drop title line, take body before first section header
  let t = text.replace(/\r/g, '').split(/\n==/)[0];
  t = t.split('\n').map(l => l.trim()).filter(Boolean);
  if (t.length && t[0] === t[0].toUpperCase()) t.shift();
  let body = t.join(' ');
  body = body.replace(/\s*\((?:[^()]|\([^()]*\))*\)/g, (m) => (m.length > 40 || /latin|greek|pl\.|plural|;/i.test(m) || /^\s*\(\s*[,)]/.test(m) ? '' : m));
  body = body.replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').replace(/\[\d+\]/g, '').trim();
  const sents = body.match(/[^.!?]+[.!?]+(\s|$)/g) || [body];
  let res = '';
  for (const s of sents) { if ((res + s).length > 420 && res) break; res += s; }
  return res.trim();
}
const names = new Set(m.parts.map(p => p[2]));
for (const n of names) {
  const f = byName.get(norm(n));
  if (f) { hit++; const l = lede(fs.readFileSync(dir + f, 'utf8')); if (l.length > 30) out[n] = l; } else miss++;
}
// also groups
for (const p of m.parts) for (const g of (p[4] || '').split('>')) { if (!g || out[g]) continue; const f = byName.get(norm(g)); if (f) { const l = lede(fs.readFileSync(dir + f, 'utf8')); if (l.length > 30) out[g] = l; } }
fs.writeFileSync('refs.json', JSON.stringify(out));
console.log('files', files.length, 'names', names.size, 'hit', hit, 'miss', miss, 'refs', Object.keys(out).length, 'bytes', fs.statSync('refs.json').size);
for (const k of ['Facial artery', 'Superior frontal gyrus', 'Anterior talofibular ligament', 'Cuneus', 'Hamate bone', 'Trapezoid ligament', 'Popliteal fossa', 'Thalamus']) console.log('--', k, ':', out[k]);
