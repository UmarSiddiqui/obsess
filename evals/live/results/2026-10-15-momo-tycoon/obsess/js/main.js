// Entry point: wires the game rules, the 3D world, the UI and player input together.
import { Game, loadSave } from './state.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { ITEMS, LEVELS, fmt } from './config.js';

const canvas = document.getElementById('scene');
const save = loadSave();
const game = new Game(save);
const world = new World(canvas);
const sound = new Sound();
const ui = new UI(game, world, sound);

// Keep the 3D scene in step with the saved state (shop level, decor, menu board).
function syncWorld() {
  world.setLevel(game.s.level, true);
  world.setDecor(game.s.decor);
  world.refreshBoard(game.s);
  ui.markPanel();
}
syncWorld();

// Expose a small handle for debugging in the console.
window.momoTycoon = { game, world, ui };

// ---- game events -> presentation -------------------------------------------
function popupAt(c, text, cls, dy = 0) {
  const pos = world.personPos(c.id) || { x: 0, z: 3.3 };
  const p = world.project(pos.x, 2.9, pos.z);
  ui.popup(text, p.x, p.y + dy, cls);
}

game.on('served', ({ c, total, tip, source, k }) => {
  world.onServed(c, total, source);
  if (source === 'server') world.serverTrip(k, c);
  popupAt(c, `+${fmt(total)}`, 'gold');
  if (tip) popupAt(c, 'Quick-serve tip', 'tip', 24);
  sound.coin();
});

game.on('lost', ({ c, reason }) => {
  world.onLost(c);
  popupAt(c, reason === 'impatient' ? 'Left hungry' : 'Lost', 'bad');
  ui.toast(reason === 'impatient' ? 'A customer got tired of waiting and left' : 'A customer walked away', 'bad');
  sound.bad();
});

game.on('turnAway', () => {
  ui.toast('Queue is full. Someone walked on by', 'warn');
});

game.on('levelUp', ({ level }) => {
  world.setLevel(level);
  world.refreshBoard(game.s);
  ui.toast(`You expanded to a ${LEVELS[level - 1].name}!`, 'gold');
  sound.fanfare();
  ui.markPanel();
});

game.on('dayStart', ({ day, resumed }) => {
  if (!resumed) ui.toast(`Day ${day} is open. Customers are lining up`, 'gold');
});

game.on('dayEnd', (report) => {
  ui.showReport(report);
  sound.fanfare();
});

game.on('bought', () => {
  sound.coin();
  ui.toast('Upgrade installed', 'good');
});

game.on('menu', ({ key }) => {
  world.refreshBoard(game.s);
  ui.toast(`${ITEMS[key].name} added to the menu`, 'good');
  sound.coin();
});

game.on('hired', ({ kind }) => {
  ui.toast(`New ${kind} on the team`, 'good');
  sound.coin();
});

game.on('decor', () => {
  world.setDecor(game.s.decor);
  ui.toast('Decor installed. The lane looks lovely', 'good');
  sound.coin();
});

game.on('change', () => ui.markPanel());

// ---- purchases from the panels -----------------------------------------------
const FAIL = {
  money: 'Not enough cash yet',
  locked: 'Not available yet. Check the requirements',
  max: 'Already at the maximum',
  owned: 'Already owned',
  cap: 'Team is full for this shop',
  expand: 'Reputation or customers served are still too low',
};

function report(result) {
  if (result === 'ok') return;
  ui.toast(FAIL[result] || 'Not possible right now', 'warn');
  sound.bad();
}

ui.onAction = (act, key) => {
  sound.click();
  switch (act) {
    case 'buy':
      report(game.buyUpgrade(key));
      break;
    case 'unlock':
      report(game.unlockItem(key));
      break;
    case 'hire':
      report(game.hire(key));
      break;
    case 'decor':
      report(game.buyDecor(key));
      break;
    case 'expand':
      if (!game.expand()) report(game.s.money < game.L.next.cost ? 'money' : 'expand');
      break;
    default:
      break;
  }
};

// ---- title, report and menu flows ---------------------------------------------
let armedNew = false;
ui.bindModals({
  continueGame() {
    sound.ensure();
    game.start();
    ui.hideTitle();
    ui.markPanel();
  },
  newGame() {
    sound.ensure();
    if (save && !armedNew) {
      armedNew = true;
      document.getElementById('titleNew').textContent = 'Tap again to start over';
      return;
    }
    game.reset();
    syncWorld();
    ui.hideTitle();
    ui.toast('A fresh start. Your stall is ready', 'gold');
  },
  nextDay() {
    game.nextDay();
    ui.hideReport();
    ui.markPanel();
  },
  reset() {
    game.reset();
    syncWorld();
    ui.toast('Progress erased. Good luck!', 'warn');
  },
});
ui.showTitle(!!save);

// ---- pointer input: tap to serve or cook, drag to pan, pinch / wheel to zoom ----
const pointers = new Map();
let press = null;
let pinchDist = 0;

canvas.addEventListener('pointerdown', (e) => {
  sound.ensure();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    press = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    press = null;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1 && press) {
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) > 10) press.moved = true;
    if (press.moved) {
      world.drag(e.clientX - prev.x);
    }
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0 && d > 0) world.zoomBy(pinchDist / d);
    pinchDist = d;
  }
});

function endPointer(e) {
  if (pointers.size === 1 && press && !press.moved && performance.now() - press.t < 450) {
    tap(e);
  }
  pointers.delete(e.pointerId);
  if (pointers.size === 0) press = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  press = null;
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    world.zoomBy(e.deltaY > 0 ? 1.06 : 0.94);
  },
  { passive: false },
);

function tap(e) {
  if (game.phase !== 'day') return;
  const hit = world.pick(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.type === 'customer') {
    const c = game.queue.find((q) => q.id === hit.id);
    if (!c) return;
    const res = game.serve(c, 'tap');
    if (res === 'notready') {
      popupAt(c, `Still steaming ${ITEMS[c.order].short || ''}`.trim(), 'muted');
      sound.bad();
    } else if (res === 'walking') {
      popupAt(c, 'Coming over...', 'muted');
    }
    return;
  }
  if (hit.type === 'slot') {
    const res = game.startBatch(hit.index);
    if (ITEMS[res]) {
      sound.click();
    } else if (res === 'full') {
      ui.toast('Plenty cooked already. Serve some first', 'warn');
    } else if (res === 'busy') {
      ui.toast('Still cooking that batch', 'muted');
    }
  }
}

// ---- layout, persistence and the frame loop -----------------------------------
function onResize() {
  world.resize();
  ui.layoutChanged();
}
window.addEventListener('resize', onResize);
onResize();

window.addEventListener('pagehide', () => game.save());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(dt);
  world.update(dt, now / 1000, game);
  ui.updateHud(game);
  ui.renderPanel(game);
  ui.updateBubbles(game);
  world.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
