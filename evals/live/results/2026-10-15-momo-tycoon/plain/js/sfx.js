// Tiny WebAudio synth for coin, ding and pop sounds. No audio files.
const MUTE_KEY = 'momo-tycoon-muted';
let ctx = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* storage unavailable */
}

function audio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  if (muted) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  get muted() {
    return muted;
  },
  setMuted(v) {
    muted = v;
    try {
      localStorage.setItem(MUTE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  },
  coin() {
    tone(880, 0.12, 'triangle', 0.12);
    tone(1320, 0.18, 'triangle', 0.1, 0.07);
  },
  ding() {
    tone(660, 0.3, 'sine', 0.1);
  },
  pop() {
    tone(520, 0.09, 'sine', 0.12, 0, 1.8);
  },
};
