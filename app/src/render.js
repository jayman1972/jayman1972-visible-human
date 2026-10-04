// Renderer, post-processing, anatomy materials and adaptive quality.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect, SMAAPreset, VignetteEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { VERT_PARS, FRAG_PARS, tissueUniforms } from './shaders.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x0a1118, 1);
  return renderer;
}

// Tileable gradient noise baked into a 64^3 texture: rgb = gradient, a = value.
export function makeNoiseTexture(size = 64) {
  const N = size;
  const perm = new Uint8Array(512);
  let s = 1337;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [];
  for (let i = 0; i < 256; i++) { const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z); G.push([r * Math.cos(a), r * Math.sin(a), z]); }
  const per = 8; // lattice period (cells across the texture)
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (ix, iy, iz, x, y, z) => { const g = G[perm[perm[perm[ix % per] + (iy % per)] + (iz % per)]]; return g[0] * x + g[1] * y + g[2] * z; };
  const perlin = (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const fx = x - X, fy = y - Y, fz = z - Z;
    const u = fade(fx), v = fade(fy), w = fade(fz);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(grad(X, Y, Z, fx, fy, fz), grad(X + 1, Y, Z, fx - 1, fy, fz), u), l(grad(X, Y + 1, Z, fx, fy - 1, fz), grad(X + 1, Y + 1, Z, fx - 1, fy - 1, fz), u), v),
      l(l(grad(X, Y, Z + 1, fx, fy, fz - 1), grad(X + 1, Y, Z + 1, fx - 1, fy, fz - 1), u), l(grad(X, Y + 1, Z + 1, fx, fy - 1, fz - 1), grad(X + 1, Y + 1, Z + 1, fx - 1, fy - 1, fz - 1), u), v), w);
  };
  const val = new Float32Array(N * N * N);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const f = per / N;
    let v = perlin(x * f, y * f, z * f) + 0.5 * perlin(x * f * 2, y * f * 2, z * f * 2);
    val[(z * N + y) * N + x] = v;
  }
  let mn = Infinity, mx = -Infinity; for (const v of val) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  const data = new Uint8Array(N * N * N * 4);
  const at = (x, y, z) => val[(((z + N) % N) * N + ((y + N) % N)) * N + ((x + N) % N)];
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = ((z * N + y) * N + x) * 4;
    let gx = at(x + 1, y, z) - at(x - 1, y, z), gy = at(x, y + 1, z) - at(x, y - 1, z), gz = at(x, y, z + 1) - at(x, y, z - 1);
    const l = Math.hypot(gx, gy, gz) || 1; const k = Math.min(1, l * 6) / l;
    data[i] = Math.round((gx * k * 0.5 + 0.5) * 255); data[i + 1] = Math.round((gy * k * 0.5 + 0.5) * 255); data[i + 2] = Math.round((gz * k * 0.5 + 0.5) * 255);
    data[i + 3] = Math.round(((at(x, y, z) - mn) / (mx - mn)) * 255);
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1; tex.needsUpdate = true;
  return tex;
}

export function makeBackground() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 430, 40, 256, 470, 700);
  grd.addColorStop(0, '#1d3042'); grd.addColorStop(0.45, '#122131'); grd.addColorStop(1, '#070c11');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 1024);
  const floor = g.createRadialGradient(256, 980, 10, 256, 980, 260);
  floor.addColorStop(0, 'rgba(111,227,242,0.07)'); floor.addColorStop(1, 'rgba(111,227,242,0)');
  g.fillStyle = floor; g.fillRect(0, 700, 512, 324);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Shared uniforms for every anatomy material
export function makeSharedUniforms() {
  return {
    uPartTex: { value: null }, uAnimTex: { value: null }, uAxisTex: { value: null }, uFemTex: { value: null },
    uTexW: { value: 64 }, uQScale: { value: new THREE.Vector3() }, uQMin: { value: new THREE.Vector3() },
    uFemale: { value: 0 }, uTime: { value: 0 },
    uHeart: { value: new THREE.Vector4() }, uBreath: { value: new THREE.Vector4() },
    uAnimA: { value: new THREE.Vector4() }, uAnimB: { value: new THREE.Vector4() }, uBladder: { value: 0 },
    uNoise: { value: null },
    uHiColor: { value: new THREE.Color('#6fe3f2') },
    uSkinA: { value: new THREE.Vector2(0.035, 0.5) }, uGhostA: { value: 0.075 },
    uClipPlane: { value: new THREE.Vector4(0, 0, 1, 1e3) }, uClipMode: { value: 0 }, uCut: { value: new THREE.Vector4() },
    uKeyDir: { value: new THREE.Vector3(0, 0, 1) }, uDetail: { value: 1 },
    ...tissueUniforms(THREE),
  };
}

// mode: 'opaque' | 'skin' | 'ghost' | 'xray'
export function makeAnatomyMaterial(shared, mode, { isSkin = false, lodPass = 0 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2, sheen: 0.5, sheenRoughness: 0.5,
    transparent: mode !== 'opaque', depthWrite: mode === 'opaque' || (mode === 'skin' && false),
    depthFunc: mode === 'xray' ? THREE.GreaterDepth : THREE.LessEqualDepth,
    side: THREE.FrontSide,
  });
  mat.userData.mode = mode;
  const local = { uIsSkin: { value: isSkin ? 1 : 0 }, uLodPass: { value: lodPass }, uSkinSolid: { value: 0 } };
  mat.userData.local = local;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, local);
    shader.vertexShader = VERT_PARS + shader.vertexShader
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normal; vec3 anatPos; float anatCull; anatomyVertex(anatPos, objectNormal, anatCull);')
      .replace('#include <begin_vertex>', 'vec3 transformed = anatPos;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb = pow(vColor.rgb, vec3(2.2));')
      .replace('#include <project_vertex>', `#include <project_vertex>
        bool drawMe = anatCull < 0.5 && (${mode === 'ghost' ? 'vState > 2.5' : mode === 'xray' ? 'vState > 1.5 && vState < 2.5' : 'vState < 2.5'});
        if (!drawMe) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`);
    let f = FRAG_PARS + shader.fragmentShader;
    f = f.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      bool capFace = false;
      int tcls = int(vTissue + 0.5);
      vec4 tA = uTisA[tcls]; vec4 tB = uTisB[tcls]; vec3 tC = uTisC[tcls];
      float pxW = length(fwidth(vMalePos)) + 1e-6;               // world size of one pixel

      if (uClipMode > 0.5 && (uClipMode < 1.5 || (vState > 1.5 && vState < 2.5))) {
        if (dot(vWPos, uClipPlane.xyz) > uClipPlane.w) discard;
        if (!gl_FrontFacing && mod(floor(vFlags / 2.0), 2.0) < 0.5) capFace = true;
      }
      float cutK = vState < 1.5 ? cutaway(vWPos) : 1.0;
      if (cutK < 0.03) discard;`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(0.45, 1.0, cutK);
      {
        vec3 mp = vMalePos;
        #define DETAIL(f) (uDetail * (1.0 - smoothstep(0.25, 0.6, pxW * (f) * 8.0)))
        float v1 = nz(mp * 9.0).a;
        diffuseColor.rgb *= 1.0 + tB.z * (v1 - 0.5) * 2.0 * uDetail;
        if (tcls == 12) {
          float m = nz(mp * 70.0).a; diffuseColor.rgb *= mix(1.0, 0.74, smoothstep(0.55, 0.82, m) * DETAIL(70.0));
          float sp = nz(mp * 240.0 + 4.0).a; diffuseColor.rgb *= mix(1.0, 0.5, smoothstep(0.86, 0.96, sp) * DETAIL(240.0) * 0.6);
        } else if (tcls == 9) {
          float r = 1.0 - abs(nz(mp * 26.0).a * 2.0 - 1.0);
          float r2 = 1.0 - abs(nz(mp * 58.0 + 3.1).a * 2.0 - 1.0);
          float ves = smoothstep(0.94, 0.99, r) + 0.6 * smoothstep(0.955, 0.992, r2);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.035, 0.04), clamp(ves, 0.0, 1.0) * 0.6 * DETAIL(60.0));
        } else if (tcls == 1) {
          float pz = nz(mp * 210.0).a; diffuseColor.rgb *= mix(1.0, 0.84, smoothstep(0.7, 0.9, pz) * DETAIL(210.0));
        } else if (tcls == 15) {
          float c = nz(mp * 110.0).a; diffuseColor.rgb *= mix(0.88, 1.06, smoothstep(0.3, 0.7, c));
        } else if (tcls == 11) {
          float c = nz(mp * 160.0).a; diffuseColor.rgb *= mix(0.93, 1.05, c);
        } else if (tcls == 4 || tcls == 18) {
          vec3 ax = normalize(vAxis + vec3(1e-4));
          vec3 q = mp - ax * dot(mp, ax) * 0.95;
          diffuseColor.rgb *= mix(1.0, mix(0.9, 1.06, nz(q * 300.0).a), DETAIL(300.0));
        }
        if (uIsSkin > 0.5 && uFemale >= 0.5 && mp.z > 0.05) {
          float d = min(length(mp.xy - vec2(0.105, 1.262)), length(mp.xy - vec2(-0.105, 1.262)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.17, 0.14), smoothstep(0.021, 0.016, d) * 0.85);
        }
        if (capFace) {
          diffuseColor.rgb *= 0.86;
          if (tcls == 1) { float c = nz(mp * 260.0).a; diffuseColor.rgb = mix(vec3(0.62, 0.36, 0.3), diffuseColor.rgb * 1.05, smoothstep(0.35, 0.6, c)); }
          if (tcls == 4 || tcls == 18) { float c = nz(mp * 420.0).a; diffuseColor.rgb *= mix(0.8, 1.08, smoothstep(0.4, 0.7, c)); }
          if (tcls == 12) { float c = nz(mp * 300.0).a; diffuseColor.rgb *= mix(0.65, 1.1, smoothstep(0.3, 0.6, c)); }
        }
      }`);
    f = f.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(vRough + (nz(vMalePos * 40.0).a - 0.5) * 0.14 * uDetail, 0.04, 1.0);');
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (capFace) {
        normal = normalize((viewMatrix * vec4(uClipPlane.xyz, 0.0)).xyz);
      } else if (uDetail > 0.0) {
        vec3 q = vMalePos;
        if (tB.y > 0.0) { vec3 ax = normalize(vAxis + vec3(1e-4)); q = q - ax * dot(q, ax) * (0.93 * tB.y); }
        float d1 = DETAIL(tB.x), d2 = DETAIL(tB.x * 2.3);
        vec3 g = nzGrad(q * tB.x) * 0.7 * d1 + nzGrad(q * tB.x * 2.3 + 1.7) * 0.3 * d2;
        vec3 gv = (viewMatrix * vec4(g, 0.0)).xyz;
        normal = normalize(normal - tA.w * (gv - normal * dot(gv, normal)));
      }`);
    f = f.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      material.clearcoat = capFace ? 0.0 : tA.x * (1.0 - vCavity);
      material.clearcoatRoughness = clamp(tA.y, 0.0525, 1.0);
      material.diffuseColor *= 1.0 - 0.4 * vCavity;
      material.specularColor *= 1.0 - 0.8 * vCavity;
      material.specularF90 *= 1.0 - 0.8 * vCavity;
      #ifdef USE_SHEEN
      material.sheenColor = mix(diffuseColor.rgb, vec3(1.0), 0.35) * tA.z * (1.0 - vCavity);
      material.sheenRoughness = 0.55;
      #endif`);
    let emissive = `
      int ac = int(vAnimCode + 0.5);
      float sNow = vFlow * 0.001;
      if (vFlow < 65000.0) {
        if ((ac == 1 || ac == 4) && uAnimA.z > 0.5) {
          float tb = uHeart.w;
          float front = tb * 1.1;
          float pw = exp(-pow((sNow - front) / 0.05, 2.0)) * exp(-tb * 0.9);
          float st = smoothstep(0.72, 1.0, sin((sNow - uTime * 0.16) * 95.0) * 0.5 + 0.5);
          totalEmissiveRadiance += vec3(1.0, 0.12, 0.1) * (pw * 1.5 + st * 0.22);
        }
        if ((ac == 2 || ac == 3) && uAnimA.z > 0.5) {
          float st = smoothstep(0.76, 1.0, sin((sNow + uTime * 0.085) * 85.0) * 0.5 + 0.5);
          totalEmissiveRadiance += vec3(0.25, 0.4, 1.0) * st * 0.32;
        }
        if (ac == 13 && uAnimA.w > 0.5) {
          float ph = fract((sNow - uTime * 0.55 + hash11(vPid) * 7.0) / 0.42);
          float sp = smoothstep(0.9, 0.975, ph) * (1.0 - smoothstep(0.975, 1.0, ph));
          totalEmissiveRadiance += vec3(1.0, 0.86, 0.5) * sp * 2.4;
        }
        if ((ac == 12 || ac == 20) && uAnimB.x > 0.5) {
          float ph = fract((sNow - uTime * 0.025) / 0.07);
          float bol = exp(-pow((ph - 0.62) / 0.06, 2.0));
          totalEmissiveRadiance += vec3(1.0, 0.55, 0.18) * bol * 0.55;
        }
        if ((ac == 15) && uAnimB.y > 0.5) {
          float ph = fract((sNow - uTime * 0.04) / 0.05);
          totalEmissiveRadiance += vec3(1.0, 0.85, 0.2) * smoothstep(0.85, 0.97, ph) * 1.2;
        }
        if (ac == 9 && uAnimB.w > 0.5) {
          float dir = uBreath.y;
          float ph = fract((sNow - dir * uTime * 0.12) / 0.05);
          totalEmissiveRadiance += vec3(0.65, 0.85, 1.0) * smoothstep(0.82, 0.98, ph) * 0.6 * abs(dir);
        }
      }
      if (ac == 14 && uAnimB.z > 0.5) {
        float n1 = nz(vMalePos * 14.0 + vec3(0.0, uTime * 0.06, uTime * 0.04)).a;
        float n2 = nz(vMalePos * 31.0 - vec3(uTime * 0.11, 0.0, 0.0)).a;
        float fl = smoothstep(0.74, 0.86, n1) * (0.5 + 0.5 * sin(uTime * 9.0 + n2 * 20.0));
        totalEmissiveRadiance += vec3(0.35, 0.75, 1.0) * fl * 0.85;
      }
      if (ac == 19 && uAnimA.w > 0.5) {
        float ph = fract((-vMalePos.y + uTime * 0.6) / 0.25);
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.5) * smoothstep(0.88, 0.98, ph) * 1.2;
      }
      float facing = abs(dot(normalize(vViewPosition), normal));
      float fres = pow(1.0 - facing, 2.0);
      if (vState > 1.5 && vState < 2.5) {
        totalEmissiveRadiance += uHiColor * (0.06 + 0.55 * fres);
        diffuseColor.rgb = mix(diffuseColor.rgb, uHiColor, 0.06);
      }`;
    f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + emissive);
    let post = `
      if (!capFace) {
        float ndl = dot(normal, uKeyDir);
        float wrapL = max(0.0, (ndl + 0.55) / 1.55) - max(0.0, ndl);
        float rimL = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
        outgoingLight += tC * diffuseColor.rgb * tB.w * (wrapL * 0.9 + rimL * 0.3);
      }`;
    if (mode === 'skin') post += `
      if (uSkinSolid < 0.5) {
        diffuseColor.a = mix(uSkinA.x, uSkinA.y, fres);
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.8, 0.92, 1.0) + vec3(0.02, 0.03, 0.04), 0.5);
      }`;
    if (mode === 'ghost') post += `
      float gl = dot(outgoingLight, vec3(0.3, 0.5, 0.2));
      outgoingLight = mix(vec3(gl), vec3(0.55, 0.72, 0.85), 0.55);
      diffuseColor.a = uGhostA * (0.35 + 1.4 * fres);`;
    if (mode === 'xray') post += `
      outgoingLight = uHiColor * (0.6 + 1.0 * fres);
      diffuseColor.a = 0.3 + 0.6 * fres;`;
    f = f.replace('#include <opaque_fragment>', post + '\n#include <opaque_fragment>');
    shader.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => `anat-${mode}-${isSkin ? 1 : 0}-${lodPass}`;
  return mat;
}

export function makePickMaterial(shared, lodPass) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uIsSkin: { value: 0 }, uLodPass: { value: lodPass } },
    vertexShader: VERT_PARS + /* glsl */ `
      flat varying int vId;
      void main() {
        vec3 n = normal; vec3 p; float cull;
        anatomyVertex(p, n, cull);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        if (cull > 0.5 || vState > 2.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vId = int(vPid + 0.5) + 1;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec4 uClipPlane; uniform float uClipMode;
      varying vec3 vWPos; varying float vState;
      flat varying int vId;
      uniform vec4 uCut;   // cutaway window: centre of the selected organ (xyz), radius (w; 0 = off)
// 1 = keep, 0 = inside the window cut between the camera and the selected organ
float cutaway(vec3 wp) {
  if (uCut.w <= 0.0) return 1.0;
  vec3 toC = uCut.xyz - cameraPosition; float dC = length(toC); vec3 dir = toC / dC;
  vec3 toF = wp - cameraPosition; float along = dot(toF, dir);
  if (along > dC - uCut.w * 0.35) return 1.0;
  float rad = length(toF - dir * along) * dC / max(along, 1e-4);
  return smoothstep(uCut.w, uCut.w * 1.14, rad);
}

      void main() {
        if (uClipMode > 0.5 && (uClipMode < 1.5 || (vState > 1.5 && vState < 2.5)) && dot(vWPos, uClipPlane.xyz) > uClipPlane.w) discard;
        if (vState < 1.5 && cutaway(vWPos) < 0.03) discard;
        gl_FragColor = vec4(float(vId % 256) / 255.0, float((vId / 256) % 256) / 255.0, float(vId / 65536) / 255.0, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// Post-processing + adaptive quality
// ---------------------------------------------------------------------------
export class Pipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new N8AOPostPass(scene, camera, 256, 256);
    Object.assign(this.ao.configuration, { aoRadius: 0.07, distanceFalloff: 0.5, intensity: 2.4, color: new THREE.Color(0, 0, 0), gammaCorrection: false, halfRes: true, aoSamples: 10, denoiseSamples: 4, denoiseRadius: 10 });
    this.composer.addPass(this.ao);
    this.bloom = new BloomEffect({ luminanceThreshold: 1.25, luminanceSmoothing: 0.15, intensity: 0.65, mipmapBlur: true, radius: 0.55 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });
    const vig = new VignetteEffect({ offset: 0.32, darkness: 0.55 });
    this.composer.addPass(new EffectPass(camera, this.bloom, tone, vig));
    this.composer.addPass(new EffectPass(camera, smaa));
    this.maxDPR = Math.min(window.devicePixelRatio || 1, 2);
    this.motionScale = 0.8;
    this.level = null; // 'still' | 'motion'
    this.frameEMA = 16;
    this.lastAdjust = 0;
    this.w = 1; this.h = 1;
  }
  setSize(w, h) { this.w = w; this.h = h; this.apply(this.level || 'still', true); }
  apply(level, force = false) {
    const dpr = level === 'still' ? this.maxDPR : Math.max(0.75, this.maxDPR * this.motionScale);
    if (!force && level === this.level && Math.abs(dpr - this.renderer.getPixelRatio()) < 0.01) return;
    this.level = level;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setSize(this.w, this.h);
    const c = this.ao.configuration;
    if (level === 'still') { c.halfRes = false; c.aoSamples = 16; c.denoiseSamples = 8; }
    else { c.halfRes = true; c.aoSamples = 8; c.denoiseSamples = 4; }
  }
  // frameMs: measured time of the last frame (used to adapt motion resolution)
  adapt(frameMs, now) {
    this.frameEMA = this.frameEMA * 0.9 + frameMs * 0.1;
    if (this.level !== 'motion' || now - this.lastAdjust < 700) return;
    let s = this.motionScale;
    if (this.frameEMA > 24) s = Math.max(0.5, s * 0.88);
    else if (this.frameEMA < 15 && s < 1) s = Math.min(1, s * 1.06);
    if (Math.abs(s - this.motionScale) > 0.01) { this.motionScale = s; this.lastAdjust = now; this.apply('motion', true); }
  }
  render(dt) { this.composer.render(dt); }
}
