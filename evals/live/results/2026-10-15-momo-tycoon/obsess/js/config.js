// Static game data: menu, upgrades, staff, decor, shop levels and tuning numbers.

export const SAVE_KEY = 'momoTycoon.save.v1';
export const SETTINGS_KEY = 'momoTycoon.settings.v1';

export const DAY_LENGTH = 150;      // seconds of trading per day
export const PLATE = 3;             // momos per plate
export const STOCK_CAP = 24;        // soft cap on cooked pieces held per item
export const PATIENCE = 46;         // seconds a customer waits once in line
export const SERVER_INTERVAL = 2.2; // seconds between a server's trips
export const STEAM_TIME = 8;        // base seconds for a steamer batch
export const FRY_TIME = 10;         // base seconds for a wok batch
export const BATCH_BASE = 4;        // pieces per batch before upgrades

export const ITEMS = {
  steam: { name: 'Steamed Momo', kind: 'steam', plate: 90, cost: 9, color: '#f4e9d2', unlock: 0,
    desc: 'The classic. Pleated buff momo in bamboo baskets.' },
  jhol: { name: 'Jhol Momo', kind: 'steam', plate: 150, cost: 16, color: '#e88b3c', unlock: 400,
    desc: 'Dumplings swimming in a tangy, spicy soup.' },
  fried: { name: 'Fried Momo', kind: 'fry', plate: 108, cost: 12, color: '#d9a13b', unlock: 600, needs: 'fryer',
    desc: 'Crisp golden pockets from the wok.' },
  cmomo: { name: 'C-Momo', kind: 'fry', plate: 165, cost: 18, color: '#c4372a', unlock: 900, needs: 'fryer',
    desc: 'Fried momo tossed in chilli-garlic sauce.' },
};

export const UPGRADES = {
  cookSpeed: { name: 'Faster Steamers', desc: 'Steaming time down 12% per level.', max: 5, base: 150, growth: 1.9 },
  batch: { name: 'Bigger Baskets', desc: '+2 momos in every batch.', max: 3, base: 180, growth: 2 },
  masala: { name: 'Secret Masala', desc: '+12% on every plate you sell.', max: 4, base: 320, growth: 2.2 },
  slot: { name: 'Extra Steamer Basket', desc: 'Another steamer cooking in parallel. Limited by shop size.', max: 5, base: 240, growth: 2.1 },
  fryer: { name: 'Fryer Wok', desc: 'A hot wok for fried momo and C-momo.', max: 1, base: 700, growth: 1, minLevel: 2 },
};

export function upgradeCost(key, owned) {
  const u = UPGRADES[key];
  return Math.round((u.base * Math.pow(u.growth, owned)) / 5) * 5;
}

export const LEVELS = [
  { name: 'Street Stall', queue: 3, spawn: 11, steamCap: 2, cookCap: 1, serverCap: 1, rent: 30,
    next: { title: 'Small Shop', cost: 1200, rep: 35, served: 15 } },
  { name: 'Small Shop', queue: 5, spawn: 8, steamCap: 4, cookCap: 2, serverCap: 2, rent: 110,
    next: { title: 'Busy Restaurant', cost: 5000, rep: 65, served: 120 } },
  { name: 'Busy Restaurant', queue: 7, spawn: 6, steamCap: 6, cookCap: 3, serverCap: 3, rent: 300, next: null },
];

export const STAFF = {
  cook: { name: 'Cook', base: 320, wage: 45, desc: 'Keeps one steamer or wok loaded and cooking, automatically.' },
  server: { name: 'Server', base: 260, wage: 35, desc: 'Carries plates to waiting customers the moment they are ready.' },
};

export function staffCost(key, hired) {
  return Math.round((STAFF[key].base * (1 + 0.6 * hired)) / 5) * 5;
}

export const DECOR = {
  flags: { name: 'Prayer Flag Lines', cost: 200, desc: 'Colourful flags strung over the lane. +6% customer traffic.' },
  garland: { name: 'Marigold Garlands', cost: 350, desc: 'Marigold strings on your stall. Quick-serve tips doubled.' },
  lanterns: { name: 'Brass Lanterns', cost: 600, desc: 'Warm paper lanterns. Customers wait 15% longer.' },
};

export function fmt(n) {
  return 'Rs ' + Math.round(n).toLocaleString('en-IN');
}
