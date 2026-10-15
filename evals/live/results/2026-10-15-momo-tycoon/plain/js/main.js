// Entry point: wires the simulation, 3D world and UI together and runs the loop.
import {
  newGame, loadGame, saveGame, clearSave, update, tapBasket, selectCook,
  unlockItem, buyUpgrade, buyBasket, buyDecor, hire, expand, serve,
} from './sim.js';
import { createWorld } from './world.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('scene');
const startEl = document.getElementById('start');
const btnContinue = document.getElementById('btn-continue');
const btnNew = document.getElementById('btn-new');
const btnMenu = document.getElementById('btn-menu');
const panelEl = document.getElementById('panel');

const world = createWorld(canvas);
const evq = [];
let state = newGame();
let started = false;
let lastSave = 0;
let lastFrame = performance.now();

const ui = createUI({ act });

// ---------- actions from UI and canvas taps ----------

function act(name, arg) {
  let changed = false;
  switch (name) {
    case 'tap': changed = tapBasket(state, Number(arg), evq); break;
    case 'choose': selectCook(state, arg); changed = true; break;
    case 'unlock': changed = unlockItem(state, arg); break;
    case 'upgrade': changed = buyUpgrade(state, arg); break;
    case 'basket': changed = buyBasket(state); break;
    case 'decor': changed = buyDecor(state, arg); break;
    case 'hire': changed = hire(state, arg); break;
    case 'expand': changed = expand(state, evq); break;
    case 'serve': changed = serve(state, Number(arg), evq); break;
    default: break;
  }
  if (changed) {
    ui.resetPanel();
    saveGame(state);
    lastSave = performance.now();
  }
}

// ---------- canvas pointer: tap to act, drag to turn the view ----------

let press = null;
canvas.addEventListener('pointerdown', (e) => {
  press = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!press || press.id !== e.pointerId) return;
  const dx = e.clientX - press.x;
  if (Math.abs(dx) + Math.abs(e.clientY - press.y) > 8) press.moved = true;
  if (press.moved) {
    world.dragYaw(e.movementX);
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!press || press.id !== e.pointerId) return;
  if (!press.moved && started) {
    const hit = world.pick(e.clientX, e.clientY, canvas.getBoundingClientRect());
    if (hit?.type === 'slot') act('tap', String(hit.i));
    else if (hit?.type === 'customer') act('serve', String(hit.id));
  }
  press = null;
});
canvas.addEventListener('pointercancel', () => {
  press = null;
});

// ---------- layout ----------

function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  let insetR = 0, insetB = 0, insetT = 0;
  const panel = panelEl.getBoundingClientRect();
  if (w <= 760) {
    insetB = panel.height;
    insetT = document.getElementById('hud').getBoundingClientRect().bottom;
  } else {
    insetR = panel.width + 28;
  }
  world.setSize(w, h, insetR, insetB, insetT);
}

// ---------- start / menu ----------

function beginGame(fresh) {
  if (fresh) {
    clearSave();
    state = newGame();
  }
  started = true;
  ui.resetPanel();
  startEl.classList.add('hidden');
  saveGame(state);
}

btnContinue.addEventListener('click', () => beginGame(false));
btnNew.addEventListener('click', () => {
  if (!btnContinue.hidden && !window.confirm('Start a new stall? Your current progress will be erased.')) return;
  beginGame(true);
});
btnMenu.addEventListener('click', () => {
  if (!started) return;
  saveGame(state);
  startEl.classList.remove('hidden');
  btnContinue.hidden = false;
  started = false;
});

const saved = loadGame();
if (saved) {
  state = saved;
  btnContinue.hidden = false;
} else {
  btnContinue.hidden = true;
}

// ---------- loop ----------

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (started) {
    update(state, dt, evq);
  }

  const events = evq.splice(0, evq.length);
  for (const ev of events) {
    ui.onEvent(ev, world);
    world.handleEvent(ev);
  }

  world.syncSlots(state);
  world.update(state, dt, now / 1000);
  world.render();
  ui.frame(state, world, dt);

  if (started && now - lastSave > 4000) {
    saveGame(state);
    lastSave = now;
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
window.addEventListener('pagehide', () => started && saveGame(state));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && started) saveGame(state);
});

layout();
requestAnimationFrame((t) => {
  lastFrame = t;
  requestAnimationFrame(frame);
});
