// Synthesized sound design (Web Audio). No audio files: every sound is built
// from oscillators and filtered noise so it stays small and works offline.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.8;
    this.pan = { heart: 0.12 };
    this._gurgleTimer = 0;
    this._nerveTimer = 0;
  }
  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = this.volume;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -18; this.comp.ratio.value = 3; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.master.connect(this.comp).connect(c.destination);
      // small room reverb for body
      this.verb = c.createConvolver(); this.verb.buffer = this._impulse(1.4, 2.2);
      this.verbGain = c.createGain(); this.verbGain.gain.value = 0.18;
      this.verb.connect(this.verbGain).connect(this.master);
      this.white = this._noise('white', 2); this.pink = this._noise('pink', 3); this.brown = this._noise('brown', 3);
      // continuous explode whoosh voice
      this.whoosh = this._loop(this.pink); this.whooshF = c.createBiquadFilter(); this.whooshF.type = 'bandpass'; this.whooshF.Q.value = 0.9; this.whooshF.frequency.value = 600;
      this.whooshG = c.createGain(); this.whooshG.gain.value = 0;
      this.whoosh.connect(this.whooshF).connect(this.whooshG).connect(this.master); this.whoosh.start();
    }
    if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch { /* ignore */ } }
    this.enabled = this.ctx.state === 'running';
    return this.enabled;
  }
  disable() { this.enabled = false; if (this.whooshG) this.whooshG.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  _impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  _noise(type, sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return b;
  }
  _loop(buf) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; }
  _out(pan = 0, wet = 0.15) {
    const c = this.ctx;
    const g = c.createGain();
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = pan; g.connect(p); p.connect(this.master); if (wet > 0) { const w = c.createGain(); w.gain.value = wet; p.connect(w).connect(this.verb); } }
    else g.connect(this.master);
    return g;
  }
  _noiseBurst(buf, { t, dur, f = 400, q = 1, type = 'bandpass', gain = 0.2, attack = 0.01, pan = 0, sweep = null, wet = 0.15 }) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = buf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    if (sweep) { fl.frequency.setValueAtTime(sweep[0], t); fl.frequency.exponentialRampToValueAtTime(sweep[1], t + dur); }
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(this._out(pan, wet));
    src.start(t, Math.random() * (buf.duration - dur - 0.1)); src.stop(t + dur + 0.05);
  }
  _tone(t, { f0, f1 = f0, dur, gain, type = 'sine', attack = 0.004, pan = 0, wet = 0.1 }) {
    const c = this.ctx, o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this._out(pan, wet)); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---- physiology ----
  heart(kind, bpm = 66) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01, pan = this.pan.heart;
    const k = Math.min(1.4, 0.85 + (bpm - 60) / 220);
    if (kind === 'lub') {
      this._tone(t, { f0: 62, f1: 38, dur: 0.16, gain: 0.55 * k, pan, wet: 0.05 });
      this._tone(t, { f0: 124, f1: 80, dur: 0.07, gain: 0.12 * k, pan, wet: 0.05 });
      this._noiseBurst(this.brown, { t, dur: 0.11, f: 140, q: 0.7, type: 'lowpass', gain: 0.35 * k, pan, wet: 0.05 });
    } else {
      this._tone(t, { f0: 78, f1: 52, dur: 0.11, gain: 0.38 * k, pan, wet: 0.05 });
      this._noiseBurst(this.brown, { t, dur: 0.08, f: 190, q: 0.7, type: 'lowpass', gain: 0.22 * k, pan, wet: 0.05 });
    }
  }
  bloodWhoosh(bpm = 66) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.02;
    this._noiseBurst(this.brown, { t, dur: 0.32, f: 120, q: 0.6, type: 'lowpass', gain: 0.16, attack: 0.06, sweep: [90, 220], pan: this.pan.heart * 0.5, wet: 0.25 });
  }
  breath(kind, dur) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.02;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.pink; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    const hs = c.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 3000; hs.gain.value = -8;
    const g = c.createGain();
    const peak = kind === 'inhale' ? 0.16 : 0.11;
    if (kind === 'inhale') { bp.frequency.setValueAtTime(650, t); bp.frequency.linearRampToValueAtTime(1150, t + dur); }
    else { bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(520, t + dur); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.3); g.gain.linearRampToValueAtTime(peak * 0.8, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(hs).connect(g).connect(this._out(0, 0.2));
    src.start(t, Math.random()); src.stop(t + dur + 0.1);
  }
  gurgle() {
    if (!this.enabled) return;
    let t = this.ctx.currentTime + 0.02;
    const n = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const f = 160 + Math.random() * 260;
      this._tone(t, { f0: f, f1: f * (1.6 + Math.random()), dur: 0.05 + Math.random() * 0.08, gain: 0.05 + Math.random() * 0.05, pan: -0.15 + Math.random() * 0.3, wet: 0.35 });
      this._noiseBurst(this.pink, { t, dur: 0.07, f: f * 2, q: 6, gain: 0.04, pan: 0, wet: 0.3 });
      t += 0.04 + Math.random() * 0.12;
    }
  }
  nerveTick() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this._noiseBurst(this.white, { t, dur: 0.012, f: 3200, q: 2, type: 'bandpass', gain: 0.05, attack: 0.001, pan: Math.random() * 0.8 - 0.4, wet: 0.1 });
    if (Math.random() < 0.25) this._tone(t, { f0: 1400, f1: 3200, dur: 0.035, gain: 0.018, pan: Math.random() * 0.6 - 0.3, wet: 0.2 });
  }
  brainShimmer() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    const f = [880, 1175, 1320, 1568][Math.floor(Math.random() * 4)];
    this._tone(t, { f0: f, f1: f * 1.01, dur: 0.6, gain: 0.012, attack: 0.15, pan: Math.random() * 0.6 - 0.3, wet: 0.6 });
  }
  trickle() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this._tone(t, { f0: 900 + Math.random() * 500, f1: 1800 + Math.random() * 600, dur: 0.04, gain: 0.02, pan: 0, wet: 0.4 });
  }
  // called every frame with the enabled systems; schedules ambient textures
  tick(dt, on) {
    if (!this.enabled) return;
    if (on.gut) { this._gurgleTimer -= dt; if (this._gurgleTimer <= 0) { this.gurgle(); this._gurgleTimer = 2.5 + Math.random() * 4; } }
    if (on.nerves) { this._nerveTimer -= dt; if (this._nerveTimer <= 0) { this.nerveTick(); this._nerveTimer = 0.05 + Math.random() * 0.25; } }
    if (on.brain && Math.random() < dt * 0.8) this.brainShimmer();
    if (on.urine && Math.random() < dt * 1.5) this.trickle();
  }

  // ---- interface ----
  select() { if (!this.enabled) return; const t = this.ctx.currentTime + 0.005; this._tone(t, { f0: 1320, f1: 1250, dur: 0.06, gain: 0.05, wet: 0.2 }); this._tone(t + 0.02, { f0: 660, f1: 640, dur: 0.12, gain: 0.04, wet: 0.3 }); }
  toggle(on) { if (!this.enabled) return; const t = this.ctx.currentTime + 0.005; this._tone(t, { f0: on ? 740 : 520, f1: on ? 880 : 440, dur: 0.08, gain: 0.04, wet: 0.2 }); }
  snap() { if (!this.enabled) return; const t = this.ctx.currentTime + 0.005; this._noiseBurst(this.white, { t, dur: 0.03, f: 2400, q: 3, gain: 0.08, attack: 0.002 }); this._tone(t, { f0: 220, f1: 140, dur: 0.09, gain: 0.08, wet: 0.2 }); }
  slice() { if (!this.enabled) return; const t = this.ctx.currentTime + 0.005; this._noiseBurst(this.white, { t, dur: 0.22, f: 2000, q: 2, gain: 0.06, sweep: [1200, 6000], attack: 0.02, wet: 0.3 }); }
  morph() { if (!this.enabled) return; const t = this.ctx.currentTime + 0.005; this._noiseBurst(this.pink, { t, dur: 1.1, f: 500, q: 1.2, gain: 0.07, sweep: [300, 1600], attack: 0.3, wet: 0.5 }); this._tone(t + 0.1, { f0: 440, f1: 660, dur: 0.9, gain: 0.02, attack: 0.3, wet: 0.6 }); }
  // continuous whoosh while exploding; speed = |dt/dt| per second
  explodeMotion(speed) {
    if (!this.enabled || !this.whooshG) return;
    const t = this.ctx.currentTime;
    const g = Math.min(0.14, speed * 0.12);
    this.whooshG.gain.setTargetAtTime(g, t, 0.06);
    this.whooshF.frequency.setTargetAtTime(400 + Math.min(1, speed) * 1400, t, 0.08);
  }
}
