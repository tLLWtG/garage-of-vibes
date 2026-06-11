/**
 * 极简 Web Audio 合成音效：oscillator / 噪声 + 指数衰减包络，
 * 不依赖任何音频素材。AudioContext 在首次发声时懒初始化。
 */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(b: boolean) {
  muted = b;
}

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  /** 目标频率（指数滑音） */
  to?: number;
  delay?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  const c = ac();
  if (!c) return;
  const { type = 'sine', vol = 0.16, to, delay = 0 } = opts;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, freq), t0);
  if (to != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function noise(dur: number, { vol = 0.14, delay = 0, lowpass = 1400 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.ceil(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t0);
}

export type SfxId =
  | 'plant'
  | 'water'
  | 'shovel'
  | 'unlock'
  | 'buy'
  | 'descend'
  | 'move'
  | 'combat'
  | 'boss'
  | 'hit'
  | 'heavy'
  | 'guard'
  | 'hurt'
  | 'potion'
  | 'loot'
  | 'bless'
  | 'bell'
  | 'enrage'
  | 'die'
  | 'win'
  | 'milestone';

export function sfx(id: SfxId) {
  switch (id) {
    case 'plant':
      tone(180, 0.12, { type: 'triangle', to: 290, vol: 0.18 });
      break;
    case 'water':
      noise(0.2, { lowpass: 3200, vol: 0.1 });
      tone(820, 0.12, { to: 520, vol: 0.05, delay: 0.02 });
      break;
    case 'shovel':
      noise(0.12, { lowpass: 900, vol: 0.16 });
      break;
    case 'unlock':
      tone(330, 0.09, { type: 'triangle', vol: 0.14 });
      tone(440, 0.12, { type: 'triangle', vol: 0.14, delay: 0.07 });
      break;
    case 'buy':
      tone(620, 0.07, { type: 'square', vol: 0.07 });
      tone(930, 0.1, { type: 'square', vol: 0.07, delay: 0.06 });
      break;
    case 'descend':
      tone(220, 0.7, { type: 'sawtooth', to: 55, vol: 0.12 });
      noise(0.65, { lowpass: 420, vol: 0.16, delay: 0.05 });
      break;
    case 'move':
      noise(0.07, { lowpass: 1100, vol: 0.07 });
      break;
    case 'combat':
      tone(196, 0.18, { type: 'sawtooth', to: 130, vol: 0.12 });
      break;
    case 'boss':
      tone(110, 0.5, { type: 'sawtooth', to: 65, vol: 0.16 });
      tone(165, 0.5, { type: 'square', to: 98, vol: 0.08, delay: 0.08 });
      break;
    case 'hit':
      tone(300, 0.08, { type: 'square', to: 180, vol: 0.12 });
      noise(0.06, { lowpass: 2400, vol: 0.08 });
      break;
    case 'heavy':
      tone(220, 0.16, { type: 'square', to: 90, vol: 0.16 });
      noise(0.14, { lowpass: 1500, vol: 0.14, delay: 0.01 });
      break;
    case 'guard':
      tone(520, 0.1, { type: 'triangle', to: 470, vol: 0.1 });
      break;
    case 'hurt':
      tone(150, 0.14, { type: 'sawtooth', to: 90, vol: 0.13, delay: 0.05 });
      break;
    case 'potion':
      tone(390, 0.09, { type: 'sine', to: 560, vol: 0.12 });
      tone(560, 0.12, { type: 'sine', to: 740, vol: 0.1, delay: 0.08 });
      break;
    case 'loot':
      tone(740, 0.08, { type: 'triangle', vol: 0.1 });
      tone(1100, 0.14, { type: 'triangle', vol: 0.09, delay: 0.06 });
      break;
    case 'bless':
      tone(523, 0.16, { type: 'sine', vol: 0.1 });
      tone(659, 0.16, { type: 'sine', vol: 0.1, delay: 0.09 });
      tone(784, 0.22, { type: 'sine', vol: 0.1, delay: 0.18 });
      break;
    case 'bell':
      tone(880, 0.5, { type: 'sine', to: 870, vol: 0.09 });
      tone(1320, 0.4, { type: 'sine', vol: 0.04, delay: 0.02 });
      break;
    case 'enrage':
      tone(90, 0.4, { type: 'sawtooth', to: 180, vol: 0.16 });
      noise(0.35, { lowpass: 700, vol: 0.14, delay: 0.05 });
      break;
    case 'die':
      tone(330, 0.8, { type: 'sawtooth', to: 60, vol: 0.13 });
      break;
    case 'win':
      tone(523, 0.13, { type: 'triangle', vol: 0.12 });
      tone(659, 0.13, { type: 'triangle', vol: 0.12, delay: 0.12 });
      tone(784, 0.13, { type: 'triangle', vol: 0.12, delay: 0.24 });
      tone(1047, 0.3, { type: 'triangle', vol: 0.13, delay: 0.36 });
      break;
    case 'milestone':
      tone(660, 0.1, { type: 'sine', vol: 0.09 });
      tone(990, 0.16, { type: 'sine', vol: 0.09, delay: 0.08 });
      break;
  }
}
