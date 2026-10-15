// Pure game simulation: no rendering, no DOM. Everything that changes the
// game goes through here so the world and UI only react to events.
import {
  ITEMS, ITEM_ORDER, UPGRADES, DECOR, STAFF, STAGES, ACHIEVEMENTS, MAX_SLOTS,
  PAYDAY_SECONDS, BASE_SPAWN_SECONDS, BASKET_BASE_COST, NAMES,
} from './data.js';

export const SAVE_KEY = 'momo-tycoon-save-v1';
const SAVE_VERSION = 1;
const COOK_PERIOD = 1.0;
const WAITER_PERIOD = 1.2;
const CUSTOMER_PATIENCE = 40;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function emptySlot() {
  return { state: 'idle', item: null, left: 0, total: 0, count: 0 };
}

export function newGame() {
  return {
    v: SAVE_VERSION,
    money: 500,
    totalEarned: 0,
    served: 0,
    lost: 0,
    rep: 40,
    stage: 0,
    baskets: 2,
    slots: Array.from({ length: MAX_SLOTS }, emptySlot),
    upgrades: { speed: 0, batch: 0, recipe: 0 },
    unlocked: { steamed: true, jhol: false, cmomo: false, fried: false },
    decor: { flags: false, garland: false, lanterns: false },
    staff: { cook: 0, waiter: 0 },
    stock: { steamed: 0, jhol: 0, cmomo: 0, fried: 0 },
    cookChoice: 'steamed',
    queue: [],
    nextId: 1,
    spawnIn: 3,
    payIn: PAYDAY_SECONDS,
    cookAcc: 0,
    waiterAcc: 0,
    time: 0,
    achievements: [],
  };
}

// Merge a saved object onto a fresh game so missing fields never break play.
function withDefaults(data) {
  const s = newGame();
  Object.assign(s, data);
  s.upgrades = { ...newGame().upgrades, ...data.upgrades };
  s.unlocked = { ...newGame().unlocked, ...data.unlocked };
  s.decor = { ...newGame().decor, ...data.decor };
  s.staff = { ...newGame().staff, ...data.staff };
  s.stock = { ...newGame().stock, ...data.stock };
  s.slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({ ...emptySlot(), ...(data.slots?.[i] || {}) }));
  s.queue = [];
  s.spawnIn = 3;
  s.achievements = Array.isArray(data.achievements) ? data.achievements : [];
  return s;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== SAVE_VERSION) return null;
    return withDefaults(data);
  } catch {
    return null;
  }
}

export function saveGame(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, queue: [] }));
  } catch {
    // Storage can be blocked (private mode); the game keeps working without it.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- derived values ----------

export const maxBaskets = (s) => STAGES[s.stage].maxBaskets;
export const maxQueue = (s) => STAGES[s.stage].maxQueue;
export const batchSize = (s) => 4 + 2 * s.upgrades.batch;
export const cookTime = (s, item) => ITEMS[item].cook * Math.pow(0.85, s.upgrades.speed);
export const priceOf = (s, item) => Math.round(ITEMS[item].price * (1 + 0.12 * s.upgrades.recipe));
export const upgradeCost = (s, key) => Math.round(UPGRADES[key].base * Math.pow(UPGRADES[key].grow, s.upgrades[key]));
export const basketCost = (s) => BASKET_BASE_COST * Math.pow(2, s.baskets - 2);
export const nextStage = (s) => STAGES[s.stage + 1] || null;
export const canExpand = (s) => {
  const n = nextStage(s);
  return !!n && s.money >= n.cost && s.rep >= n.rep;
};
export const wages = (s) => s.staff.cook * STAFF.cook.wage + s.staff.waiter * STAFF.waiter.wage;

export function queueDemand(s, item) {
  let n = 0;
  for (const c of s.queue) if (c.item === item) n += c.qty;
  return n;
}

// Momos already cooking or ready in baskets for this item.
export function pipeline(s, item) {
  let n = 0;
  for (let i = 0; i < s.baskets; i++) {
    const b = s.slots[i];
    if (b.state !== 'idle' && b.item === item) n += b.count;
  }
  return n;
}

export function demand(s, item) {
  return queueDemand(s, item) - s.stock[item] - pipeline(s, item);
}

function bestItem(s) {
  let best = null;
  let bestD = 0;
  for (const k of ITEM_ORDER) {
    if (!s.unlocked[k]) continue;
    const d = demand(s, k);
    if (d > bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

// ---------- player actions (return true when something changed) ----------

export function loadBasket(s, i, item = s.cookChoice) {
  const b = s.slots[i];
  if (i >= s.baskets || b.state !== 'idle' || !s.unlocked[item]) return false;
  b.state = 'cooking';
  b.item = item;
  b.count = batchSize(s);
  b.total = cookTime(s, item);
  b.left = b.total;
  return true;
}

export function collectBasket(s, i, ev) {
  const b = s.slots[i];
  if (i >= s.baskets || b.state !== 'ready') return false;
  s.stock[b.item] += b.count;
  ev?.push({ type: 'collected', i, item: b.item, count: b.count });
  s.slots[i] = emptySlot();
  return true;
}

// Tapping a basket: collect if ready, load if empty, otherwise nothing.
export function tapBasket(s, i, ev) {
  const b = s.slots[i];
  if (b.state === 'ready') return collectBasket(s, i, ev);
  if (b.state === 'idle') return loadBasket(s, i);
  return false;
}

export function selectCook(s, item) {
  if (s.unlocked[item]) s.cookChoice = item;
}

export function buyUpgrade(s, key) {
  if (s.upgrades[key] >= UPGRADES[key].max) return false;
  const c = upgradeCost(s, key);
  if (s.money < c) return false;
  s.money -= c;
  s.upgrades[key]++;
  return true;
}

export function buyBasket(s) {
  if (s.baskets >= maxBaskets(s)) return false;
  const c = basketCost(s);
  if (s.money < c) return false;
  s.money -= c;
  s.baskets++;
  return true;
}

export function unlockItem(s, key) {
  if (s.unlocked[key] || s.money < ITEMS[key].unlock) return false;
  s.money -= ITEMS[key].unlock;
  s.unlocked[key] = true;
  return true;
}

export function buyDecor(s, key) {
  if (s.decor[key] || s.money < DECOR[key].cost) return false;
  s.money -= DECOR[key].cost;
  s.decor[key] = true;
  return true;
}

export function hire(s, role) {
  const d = STAFF[role];
  if (s.staff[role] >= d.max || s.money < d.hire) return false;
  s.money -= d.hire;
  s.staff[role]++;
  return true;
}

export function expand(s, ev) {
  if (!canExpand(s)) return false;
  s.money -= nextStage(s).cost;
  s.stage++;
  ev?.push({ type: 'expanded', stage: s.stage });
  return true;
}

// Serve one customer from the queue if the tray has their order.
export function serve(s, id, ev) {
  const idx = s.queue.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  const c = s.queue[idx];
  if ((s.stock[c.item] || 0) < c.qty) return false;
  s.stock[c.item] -= c.qty;
  const patientTip = c.patience / c.maxPatience >= 0.5 ? 0.1 : 0;
  const lanternTip = s.decor.lanterns ? 0.1 : 0;
  const pay = Math.round(priceOf(s, c.item) * c.qty * (1 + patientTip + lanternTip));
  s.money += pay;
  s.totalEarned += pay;
  s.served += c.qty;
  s.rep = clamp(s.rep + 0.6, 0, 100);
  s.queue.splice(idx, 1);
  ev?.push({ type: 'served', id, pay, item: c.item, qty: c.qty });
  return true;
}

// ---------- simulation tick ----------

function weightedItem(s) {
  const keys = ITEM_ORDER.filter((k) => s.unlocked[k]);
  const total = keys.reduce((a, k) => a + ITEMS[k].weight, 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= ITEMS[k].weight;
    if (r <= 0) return k;
  }
  return keys[0];
}

function spawnDelay(s) {
  const st = STAGES[s.stage];
  const rate = st.spawn * (1 + (s.rep / 100) * 0.8) * (s.decor.flags ? 1.15 : 1);
  return (BASE_SPAWN_SECONDS / rate) * (0.7 + Math.random() * 0.6);
}

function spawnCustomer(s, ev) {
  if (s.queue.length >= maxQueue(s)) {
    // Queue is full: the customer walks past and we lose a little reputation.
    s.lost++;
    s.rep = clamp(s.rep - 1, 0, 100);
    return;
  }
  const maxP = CUSTOMER_PATIENCE * (s.decor.garland ? 1.25 : 1);
  const r = Math.random();
  const c = {
    id: s.nextId++,
    name: pick(NAMES),
    item: weightedItem(s),
    qty: r < 0.6 ? 1 : r < 0.85 ? 2 : 3,
    patience: maxP,
    maxPatience: maxP,
    look: Math.floor(Math.random() * 1000),
  };
  s.queue.push(c);
  ev.push({ type: 'arrived', id: c.id });
}

function autoCook(s, ev) {
  for (let i = 0; i < s.baskets; i++) {
    if (s.slots[i].state === 'ready') {
      collectBasket(s, i, ev);
      ev.push({ type: 'cookAct' });
      return;
    }
  }
  const item = bestItem(s);
  if (!item) return;
  for (let i = 0; i < s.baskets; i++) {
    if (s.slots[i].state === 'idle') {
      loadBasket(s, i, item);
      ev.push({ type: 'cookAct' });
      return;
    }
  }
}

function autoServe(s, ev) {
  for (const c of s.queue) {
    if ((s.stock[c.item] || 0) >= c.qty) {
      serve(s, c.id, ev);
      ev.push({ type: 'serveAct' });
      return;
    }
  }
}

function payday(s, ev) {
  const w = wages(s);
  const rent = STAGES[s.stage].rent;
  const due = w + rent;
  if (!due) return;
  const paid = Math.min(due, s.money);
  s.money -= paid;
  ev.push({ type: 'payday', due, paid, wages: w, rent });
}

function checkAchievements(s, ev) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id) || !a.test(s)) continue;
    s.achievements.push(a.id);
    s.money += a.reward;
    ev.push({ type: 'achievement', name: a.name, desc: a.desc, reward: a.reward });
  }
}

export function update(s, dt, ev) {
  s.time += dt;

  for (let i = 0; i < s.baskets; i++) {
    const b = s.slots[i];
    if (b.state === 'cooking') {
      b.left -= dt;
      if (b.left <= 0) {
        b.left = 0;
        b.state = 'ready';
        ev.push({ type: 'ready', i });
      }
    }
  }

  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnCustomer(s, ev);
    s.spawnIn = spawnDelay(s);
  }

  for (let k = s.queue.length - 1; k >= 0; k--) {
    const c = s.queue[k];
    c.patience -= dt;
    if (c.patience <= 0) {
      s.queue.splice(k, 1);
      s.rep = clamp(s.rep - 5, 0, 100);
      s.lost++;
      ev.push({ type: 'left', id: c.id });
    }
  }

  s.cookAcc += dt * s.staff.cook;
  while (s.cookAcc >= COOK_PERIOD) {
    s.cookAcc -= COOK_PERIOD;
    autoCook(s, ev);
  }
  s.waiterAcc += dt * s.staff.waiter;
  while (s.waiterAcc >= WAITER_PERIOD) {
    s.waiterAcc -= WAITER_PERIOD;
    autoServe(s, ev);
  }

  s.payIn -= dt;
  if (s.payIn <= 0) {
    s.payIn += PAYDAY_SECONDS;
    payday(s, ev);
  }

  checkAchievements(s, ev);
}
