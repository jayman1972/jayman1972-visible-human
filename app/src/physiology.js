// A small physiology clock: cardiac cycle, breathing and slower rhythms.
// Drives shader uniforms and emits events that the sound engine plays.

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin(((x - a) / (b - a)) * Math.PI) ** 2);

export const SYSTEMS = [
  { id: 'heart', label: 'Heartbeat', hint: 'Atria then ventricles squeeze; valves snap shut.' },
  { id: 'breath', label: 'Breathing', hint: 'Diaphragm drops, ribs lift, lungs inflate.' },
  { id: 'blood', label: 'Blood flow', hint: 'Pulse waves leave the heart; blood returns in the veins.' },
  { id: 'nerves', label: 'Nerve signals', hint: 'Impulses race out from the brain and spinal cord.' },
  { id: 'brain', label: 'Brain activity', hint: 'Waves of activity ripple across the cortex.' },
  { id: 'gut', label: 'Digestion', hint: 'Peristalsis pushes food along the gut.' },
  { id: 'urine', label: 'Kidneys', hint: 'Urine trickles down the ureters; the bladder fills.' },
  { id: 'air', label: 'Airflow', hint: 'Air streams in and out of the bronchial tree.' },
];

export class Physiology {
  constructor() {
    this.bpm = 66;
    this.on = Object.fromEntries(SYSTEMS.map((s) => [s.id, false]));
    this.t = 0;
    this.heartPhase = 0.6;
    this.breathPhase = 0.0;
    this.bladder = 0.3;
    this.listeners = new Set();
    this.out = { atr: 0, vent: 0, sinceV: 9, inhale: 0, dir: 0, phase: 0 };
  }
  get breathsPerMin() { return 10 + (this.bpm - 60) * 0.18; }
  get anyOn() { return Object.values(this.on).some(Boolean); }
  emit(type, data) { for (const l of this.listeners) l(type, data); }
  update(dt) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    // Cardiac cycle: atrial systole 0.00-0.12, ventricular systole 0.13-0.45 (fraction of the beat)
    const prev = this.heartPhase;
    this.heartPhase = (this.heartPhase + dt * (this.bpm / 60)) % 1;
    const p = this.heartPhase;
    const crossed = (x) => (prev < x && p >= x) || (prev > p && (x > prev || p >= x));
    if (this.on.heart || this.on.blood) {
      if (crossed(0.14)) this.emit('lub', { bpm: this.bpm });
      if (crossed(0.44)) this.emit('dub', { bpm: this.bpm });
      if (crossed(0.15)) this.emit('eject', { bpm: this.bpm });
    }
    const period = 60 / this.bpm;
    this.out.atr = bump(p, 0.0, 0.14);
    this.out.vent = bump(p, 0.13, 0.47);
    this.out.sinceV = (p >= 0.13 ? p - 0.13 : p + 0.87) * period;
    // Breathing: inhale 40% of the cycle, exhale 60%
    const bPrev = this.breathPhase;
    this.breathPhase = (this.breathPhase + dt * (this.breathsPerMin / 60)) % 1;
    const b = this.breathPhase;
    const inhale = b < 0.4 ? smooth(0, 0.4, b) : 1 - smooth(0.4, 1.0, b);
    this.out.dir = b < 0.4 ? 1 : -1;
    this.out.inhale = inhale;
    this.out.phase = b;
    if (this.on.breath || this.on.air) {
      if (bPrev > b) this.emit('inhale', { dur: 0.4 * 60 / this.breathsPerMin });
      if (bPrev < 0.4 && b >= 0.4) this.emit('exhale', { dur: 0.6 * 60 / this.breathsPerMin });
    }
    // bladder slowly fills, then empties
    this.bladder = (this.t % 40) < 34 ? smooth(0, 34, this.t % 40) : 1 - smooth(34, 40, this.t % 40);
  }
  writeUniforms(u) {
    const o = this.on;
    u.uTime.value = this.t;
    u.uHeart.value.set(this.heartPhase, this.out.atr, this.out.vent, this.out.sinceV);
    u.uBreath.value.set(this.out.inhale, this.out.dir, this.out.phase, 0);
    u.uAnimA.value.set(o.heart ? 1 : 0, o.breath ? 1 : 0, o.blood ? 1 : 0, o.nerves ? 1 : 0);
    u.uAnimB.value.set(o.gut ? 1 : 0, o.urine ? 1 : 0, o.brain ? 1 : 0, o.air ? 1 : 0);
    u.uBladder.value = this.bladder;
  }
}
