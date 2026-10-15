// Game rules and economy. No rendering code here: the world reads this state each frame.
import {
  ITEMS, UPGRADES, LEVELS, STAFF, DECOR, DAY_LENGTH, PLATE, STOCK_CAP, PATIENCE,
  SERVER_INTERVAL, STEAM_TIME, FRY_TIME, BATCH_BASE, SAVE_KEY, upgradeCost, staffCost,
} from './config.js';

const ITEM_KEYS = Object.keys(ITEMS);
const FRY_SLOT = 6;       // the wok is always slot 6 when owned
const SLOT_COUNT = 7;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let nextId = 1;

function freshSave() {
  return {
    version: 1,
    money: 300,
    level: 1,
    day: 1,
    dayTime: 0,
    rep: 30,
    servedTotal: 0,
    earnedTotal: 0,
    upg: { cookSpeed: 0, batch: 0, masala: 0, slot: 0, fryer: 0 },
    unlocked: { steam: true, jhol: false, fried: false, cmomo: false },
    ready: { steam: 0, jhol: 0, fried: 0, cmomo: 0 },
    cooks: 0,
    servers: 0,
    decor: { flags: false, garland: false, lanterns: false },
    dayStats: { revenue: 0, ingredients: 0, served: 0, lost: 0 },
    pendingReport: null, // set once a day's bills are paid, so a reload shows it without charging again
  };
}

// Merge saved data over fresh defaults so older or partial saves still load.
function mergeSave(saved) {
  const base = freshSave();
  const out = { ...base, ...saved };
  for (const key of ['upg', 'unlocked', 'ready', 'decor', 'dayStats']) {
    out[key] = { ...base[key], ...(saved[key] || {}) };
  }
  for (const key of Object.keys(base)) {
    if (typeof base[key] === 'number' && !Number.isFinite(out[key])) out[key] = base[key];
  }
  out.level = clamp(Math.round(out.level), 1, LEVELS.length);
  return out;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return mergeSave(data);
  } catch (e) {
    return null;
  }
}

export class Game {
  constructor(save) {
    this.s = save || freshSave();
    this.phase = 'title';          // title | day | report
    this.queue = [];               // waiting customers in line order
    this.exiting = [];             // customers walking away (served, lost, turned away)
    this.slots = [];               // runtime cooking state, 7 entries (6 steamers + wok)
    this.serverTimers = [];
    this.listeners = {};
    this.spawnTimer = 0;
    this.saveTimer = 0;
    this.nextSpawn = this.randSpawn();
    this.syncSlots();
  }

  on(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  emit(type, data) {
    for (const fn of this.listeners[type] || []) fn(data);
  }

  get L() {
    return LEVELS[this.s.level - 1];
  }

  get steamSlots() {
    return 1 + this.s.upg.slot;
  }

  get batchSize() {
    return BATCH_BASE + 2 * this.s.upg.batch;
  }

  get masalaMult() {
    return 1 + 0.12 * this.s.upg.masala;
  }

  isActive(i) {
    if (i === FRY_SLOT) return this.s.upg.fryer > 0;
    return i < this.steamSlots;
  }

  activeSlots() {
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) if (this.isActive(i)) out.push(i);
    return out;
  }

  // Cook staff automate the first N active slots (steamers first, then the wok).
  isAutomated(i) {
    const idx = this.activeSlots().indexOf(i);
    return idx >= 0 && idx < this.s.cooks;
  }

  syncSlots() {
    while (this.slots.length < SLOT_COUNT) {
      const i = this.slots.length;
      this.slots.push({ kind: i === FRY_SLOT ? 'fry' : 'steam', state: 'idle', item: null, t: 0, dur: 1, batch: 0 });
    }
  }

  randSpawn() {
    const rep = this.s.rep / 100;
    const base = this.L.spawn * (1.2 - 0.4 * rep);
    const jitter = 0.75 + Math.random() * 0.5;
    return (base * jitter) / (this.s.decor.flags ? 1.06 : 1);
  }

  patienceMax() {
    return PATIENCE * (this.s.decor.lanterns ? 1.15 : 1);
  }

  cookDur(kind) {
    const base = kind === 'fry' ? FRY_TIME : STEAM_TIME;
    return base * Math.pow(0.88, this.s.upg.cookSpeed);
  }

  reindex() {
    this.queue.forEach((c, i) => { c.slot = i; });
  }

  allCustomers() {
    return this.queue.concat(this.exiting);
  }

  // ---- flow -------------------------------------------------------------

  start() {
    if (this.s.pendingReport) {
      this.phase = 'report';
      this.emit('dayEnd', this.s.pendingReport);
    } else if (this.phase === 'title') {
      this.phase = 'day';
      this.emit('dayStart', { day: this.s.day, resumed: this.s.dayTime > 0 });
    }
    this.emit('change');
  }

  reset() {
    this.s = freshSave();
    this.queue = [];
    this.exiting = [];
    this.slots = [];
    this.syncSlots();
    this.phase = 'day';
    this.nextSpawn = this.randSpawn();
    this.spawnTimer = 0;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
    this.emit('change');
  }

  nextDay() {
    const s = this.s;
    s.day += 1;
    s.dayTime = 0;
    s.dayStats = freshSave().dayStats;
    s.pendingReport = null;
    this.phase = 'day';
    this.spawnTimer = 0;
    this.nextSpawn = this.randSpawn();
    this.save();
    this.emit('dayStart', { day: s.day, resumed: false });
    this.emit('change');
  }

  update(dt) {
    if (this.phase !== 'day') return;
    const s = this.s;
    s.dayTime += dt;

    if (s.dayTime < DAY_LENGTH - 15) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawn) {
        this.spawnTimer = 0;
        this.nextSpawn = this.randSpawn();
        this.spawnCustomer();
      }
    }

    for (const i of this.activeSlots()) {
      const sl = this.slots[i];
      if (sl.state === 'cooking') {
        sl.t += dt;
        if (sl.t >= sl.dur) this.finishBatch(i);
      }
    }

    // Cooks keep their slots loaded.
    for (const i of this.activeSlots()) {
      if (this.isAutomated(i) && this.slots[i].state === 'idle') this.startBatch(i);
    }

    // Servers hand plates to the first arrived customer whose order is ready.
    for (let k = 0; k < s.servers; k++) {
      this.serverTimers[k] = (this.serverTimers[k] || 0) + dt;
      if (this.serverTimers[k] >= SERVER_INTERVAL) {
        const c = this.queue.find((q) => q.arrived && s.ready[q.order] >= PLATE);
        if (c) {
          this.serverTimers[k] = 0;
          this.serve(c, 'server', k);
        }
      }
    }

    for (const c of this.queue.slice()) {
      if (c.arrived) {
        c.patience -= dt;
        if (c.patience <= 0) this.loseCustomer(c, 'impatient');
      }
    }

    for (const c of this.exiting) c.leaveT -= dt;
    this.exiting = this.exiting.filter((c) => c.leaveT > 0);

    if (s.dayTime >= DAY_LENGTH && this.queue.length === 0) {
      this.endDay();
      return;
    }

    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.save();
    }
  }

  // ---- customers ----------------------------------------------------------

  pickOrder() {
    const weights = { steam: 4, jhol: 2, fried: 2, cmomo: 1 };
    const keys = ITEM_KEYS.filter((k) => this.s.unlocked[k]);
    const total = keys.reduce((n, k) => n + weights[k], 0);
    let roll = Math.random() * total;
    for (const k of keys) {
      roll -= weights[k];
      if (roll <= 0) return k;
    }
    return 'steam';
  }

  spawnCustomer() {
    const max = this.patienceMax();
    const c = {
      id: nextId++,
      order: this.pickOrder(),
      patience: max,
      maxP: max,
      arrived: false,
      state: 'queue',
      slot: this.queue.length,
      leaveT: 0,
      seed: Math.random(),
    };
    if (this.queue.length >= this.L.queue) {
      c.state = 'leave';
      c.leaveT = 9;
      this.s.dayStats.lost += 1;
      this.s.rep = clamp(this.s.rep - 2, 0, 100);
      this.exiting.push(c);
      this.emit('turnAway', c);
      this.emit('change');
      return c;
    }
    this.queue.push(c);
    this.reindex();
    this.emit('spawn', c);
    return c;
  }

  loseCustomer(c, reason) {
    const idx = this.queue.indexOf(c);
    if (idx < 0) return;
    this.queue.splice(idx, 1);
    this.reindex();
    c.state = 'leave';
    c.leaveT = 9;
    this.exiting.push(c);
    this.s.dayStats.lost += 1;
    this.s.rep = clamp(this.s.rep - 4, 0, 100);
    this.emit('lost', { c, reason });
    this.emit('change');
  }

  // Returns 'ok', 'walking', 'notready' or 'gone'.
  serve(c, source = 'tap', k = 0) {
    const s = this.s;
    if (!c || c.state !== 'queue') return 'gone';
    if (!c.arrived) return 'walking';
    if (s.ready[c.order] < PLATE) return 'notready';

    s.ready[c.order] -= PLATE;
    const base = Math.round(ITEMS[c.order].plate * this.masalaMult);
    const quick = c.patience / c.maxP >= 0.5;
    const tipRate = quick ? (s.decor.garland ? 0.2 : 0.1) : 0;
    const tip = Math.round(base * tipRate);
    const total = base + tip;

    s.money += total;
    s.earnedTotal += total;
    s.dayStats.revenue += total;
    s.dayStats.served += 1;
    s.servedTotal += 1;
    s.rep = clamp(s.rep + 1.2, 0, 100);

    const idx = this.queue.indexOf(c);
    if (idx >= 0) this.queue.splice(idx, 1);
    this.reindex();
    c.state = 'leave';
    c.leaveT = 9;
    this.exiting.push(c);

    this.emit('served', { c, total, tip, base, source, k });
    this.emit('change');
    return 'ok';
  }

  // ---- cooking ----------------------------------------------------------

  // Choose the item a slot should cook: the one with the most unmet demand.
  chooseItem(kind) {
    let best = null;
    let bestScore = -Infinity;
    for (const k of ITEM_KEYS) {
      const it = ITEMS[k];
      if (it.kind !== kind || !this.s.unlocked[k] || this.s.ready[k] >= STOCK_CAP) continue;
      const waiting = this.queue.filter((c) => c.order === k).length * PLATE;
      const cooking = this.slots.reduce((n, sl) => n + (sl.state === 'cooking' && sl.item === k ? sl.batch : 0), 0);
      const score = waiting - this.s.ready[k] - cooking;
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (!best) return null;
    // Don't waste ingredients when there is plenty on the shelf already.
    if (bestScore <= 0 && this.s.ready[best] >= 6) return null;
    return best;
  }

  // Start a batch in an idle, active slot. Returns the item or a reason string.
  startBatch(i) {
    const sl = this.slots[i];
    if (!sl || !this.isActive(i)) return 'inactive';
    if (sl.state !== 'idle') return 'busy';
    const item = this.chooseItem(sl.kind);
    if (!item) return 'full';
    const batch = this.batchSize;
    const cost = ITEMS[item].cost * batch;
    // Ingredients on credit when broke, so the stall can never deadlock at Rs 0.
    const paid = Math.min(this.s.money, cost);
    this.s.money -= paid;
    this.s.dayStats.ingredients += paid;
    Object.assign(sl, { state: 'cooking', item, t: 0, dur: this.cookDur(sl.kind), batch });
    this.emit('batchStart', { i, item });
    this.emit('change');
    return item;
  }

  finishBatch(i) {
    const sl = this.slots[i];
    const k = sl.item;
    this.s.ready[k] += sl.batch;
    sl.state = 'idle';
    sl.item = null;
    sl.t = 0;
    this.emit('batchDone', { i, item: k, batch: sl.batch });
    this.emit('change');
  }

  // ---- shop, staff and upgrades ------------------------------------------

  canExpand() {
    const n = this.L.next;
    if (!n) return false;
    return this.s.money >= n.cost && this.s.rep >= n.rep && this.s.servedTotal >= n.served;
  }

  expand() {
    if (!this.canExpand()) return false;
    this.s.money -= this.L.next.cost;
    this.s.level += 1;
    this.emit('levelUp', { level: this.s.level });
    this.emit('change');
    this.save();
    return true;
  }

  buyUpgrade(key) {
    const s = this.s;
    const u = UPGRADES[key];
    const owned = s.upg[key];
    if (key === 'fryer') {
      if (owned) return 'owned';
      if (s.level < u.minLevel) return 'locked';
    } else if (owned >= u.max) {
      return 'max';
    }
    if (key === 'slot' && this.steamSlots >= this.L.steamCap) return 'locked';
    const cost = upgradeCost(key, owned);
    if (s.money < cost) return 'money';
    s.money -= cost;
    s.upg[key] += 1;
    this.syncSlots();
    this.emit('bought', { key });
    this.emit('change');
    return 'ok';
  }

  unlockItem(key) {
    const it = ITEMS[key];
    if (this.s.unlocked[key]) return 'owned';
    if (it.needs === 'fryer' && !this.s.upg.fryer) return 'locked';
    if (this.s.money < it.unlock) return 'money';
    this.s.money -= it.unlock;
    this.s.unlocked[key] = true;
    this.emit('menu', { key });
    this.emit('change');
    return 'ok';
  }

  hire(kind) {
    const s = this.s;
    const key = kind === 'cook' ? 'cooks' : 'servers';
    const cap = kind === 'cook' ? this.L.cookCap : this.L.serverCap;
    if (s[key] >= cap) return 'cap';
    const cost = staffCost(kind, s[key]);
    if (s.money < cost) return 'money';
    s.money -= cost;
    s[key] += 1;
    this.emit('hired', { kind });
    this.emit('change');
    return 'ok';
  }

  buyDecor(key) {
    const s = this.s;
    if (s.decor[key]) return 'owned';
    const cost = DECOR[key].cost;
    if (s.money < cost) return 'money';
    s.money -= cost;
    s.decor[key] = true;
    this.emit('decor', { key });
    this.emit('change');
    return 'ok';
  }

  // ---- end of day ---------------------------------------------------------

  endDay() {
    const s = this.s;
    const wages = s.cooks * STAFF.cook.wage + s.servers * STAFF.server.wage;
    const rent = this.L.rent;
    const bills = wages + rent;
    const paid = Math.min(s.money, bills);
    s.money -= paid;
    const report = {
      day: s.day,
      served: s.dayStats.served,
      lost: s.dayStats.lost,
      revenue: s.dayStats.revenue,
      ingredients: s.dayStats.ingredients,
      wages,
      rent,
      unpaid: bills - paid,
      net: s.dayStats.revenue - s.dayStats.ingredients - bills,
      rep: s.rep,
    };
    if (report.unpaid > 0) s.rep = clamp(s.rep - 5, 0, 100);
    report.rep = s.rep;
    s.pendingReport = report;
    this.phase = 'report';
    this.save();
    this.emit('dayEnd', report);
    this.emit('change');
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.s));
    } catch (e) {
      /* storage full or blocked: the game still plays */
    }
  }
}
