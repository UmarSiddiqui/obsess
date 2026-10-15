// Tiny WebAudio sound effects, synthesised in code. Silent if audio is unavailable or muted.
import { SETTINGS_KEY } from './config.js';

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export class Sound {
  constructor() {
    this.enabled = readSettings().sound !== false;
    this.ctx = null;
  }

  // Browsers only allow audio after a user gesture, so create the context lazily.
  ensure() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: this.enabled }));
    } catch (e) {
      /* storage blocked */
    }
    if (this.enabled) this.click();
  }

  tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slideTo = 0) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {
      /* ignore audio errors */
    }
  }

  coin() {
    this.tone(1318, 0.12, 'triangle', 0.09);
    this.tone(1760, 0.18, 'triangle', 0.07, 0.07);
  }

  click() {
    this.tone(640, 0.04, 'square', 0.02, 0, 480);
  }

  bad() {
    this.tone(220, 0.22, 'sawtooth', 0.04, 0, 140);
  }

  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.08, i * 0.09));
  }
}
