// Static game data: menu, upgrades, staff, stages, decor and achievements.
// Money is in Nepali rupees (Rs). Times are in seconds.

export const PAYDAY_SECONDS = 60;
export const MAX_SLOTS = 8;
export const BASE_SPAWN_SECONDS = 7;
export const BASKET_BASE_COST = 250;

export const ITEM_ORDER = ['steamed', 'jhol', 'cmomo', 'fried'];

export const ITEMS = {
  steamed: {
    name: 'Steamed Momo', ne: 'सादा मोमो', price: 30, cook: 8, unlock: 0, weight: 5, color: 0xf4ead8,
    desc: 'The classic pleated buff dumpling, steamed in a bamboo basket.',
  },
  jhol: {
    name: 'Jhol Momo', ne: 'झोल मोमो', price: 55, cook: 9.5, unlock: 350, weight: 2, color: 0xf0d9a8,
    desc: 'Floating in a spicy tomato-sesame soup with fresh coriander.',
  },
  cmomo: {
    name: 'C-Momo', ne: 'सी-मोमो', price: 70, cook: 10, unlock: 800, weight: 1.5, color: 0xd9573a,
    desc: 'Stir-fried with onion, capsicum and a fiery red chilli sauce.',
  },
  fried: {
    name: 'Fried Momo', ne: 'फ्राइड मोमो', price: 45, cook: 9, unlock: 1500, weight: 2, color: 0xc7863a,
    desc: 'Crisp golden pan-fried dumplings served with tomato achar.',
  },
};

export const UPGRADES = {
  speed: {
    name: 'Turbo Steamer', max: 5, base: 200, grow: 1.7,
    desc: 'Steamers cook 15% faster per level.',
  },
  batch: {
    name: 'Bigger Baskets', max: 3, base: 350, grow: 2.2,
    desc: '+2 momos per basket each level.',
  },
  recipe: {
    name: "Grandma's Achar", max: 6, base: 300, grow: 2,
    desc: '+12% price on every momo each level.',
  },
};

export const DECOR = {
  flags: {
    name: 'Prayer Flag Lines', cost: 500,
    desc: 'Strings more prayer flags over the street. +15% customer attraction.',
  },
  garland: {
    name: 'Marigold Garlands', cost: 900,
    desc: 'Festive marigold swags. +25% patience: customers wait longer.',
  },
  lanterns: {
    name: 'Brass Lanterns', cost: 1200,
    desc: 'Glowing brass lanterns. +10% tips on every order.',
  },
};

export const STAFF = {
  cook: {
    name: 'Chef', ne: 'कुक', hire: 600, wage: 25, max: 2,
    desc: 'Loads empty steamers with whatever sells most and pulls finished momos out.',
  },
  waiter: {
    name: 'Server', ne: 'वेटर', hire: 450, wage: 20, max: 3,
    desc: 'Serves the first customer whose order is already on the tray.',
  },
};

export const STAGES = [
  { name: 'Street Stall', ne: 'गल्ली ठेला', cost: 0, rep: 0, maxBaskets: 3, maxQueue: 3, spawn: 1, rent: 0 },
  { name: 'Little Shop', ne: 'सानो पसल', cost: 6000, rep: 35, maxBaskets: 5, maxQueue: 6, spawn: 1.5, rent: 30 },
  { name: 'Busy Restaurant', ne: 'व्यस्त रेस्टुरेन्ट', cost: 35000, rep: 60, maxBaskets: 8, maxQueue: 10, spawn: 2.1, rent: 80 },
];

export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Plate', desc: 'Serve your first momo.', reward: 50, test: (s) => s.served >= 1 },
  { id: 'hundred', name: 'Hundred Plates', desc: 'Serve 100 momos.', reward: 500, test: (s) => s.served >= 100 },
  { id: 'earn', name: 'Rs 10,000 Earned', desc: 'Earn Rs 10,000 in total.', reward: 300, test: (s) => s.totalEarned >= 10000 },
  { id: 'shop', name: 'Shop Owner', desc: 'Open a Little Shop.', reward: 800, test: (s) => s.stage >= 1 },
  { id: 'boss', name: 'Restaurant Boss', desc: 'Open a Busy Restaurant.', reward: 3000, test: (s) => s.stage >= 2 },
  { id: 'menu', name: 'Full Menu', desc: 'Unlock every momo on the menu.', reward: 1000, test: (s) => Object.values(s.unlocked).every(Boolean) },
  { id: 'team', name: 'Momo Team', desc: 'Hire three staff members.', reward: 600, test: (s) => s.staff.cook + s.staff.waiter >= 3 },
  { id: 'decor', name: 'Festival Ready', desc: 'Buy all decorations.', reward: 900, test: (s) => Object.values(s.decor).every(Boolean) },
];

export const NAMES = [
  'Sita', 'Ram', 'Bishal', 'Anjali', 'Pasang', 'Tenzin', 'Maya', 'Kiran',
  'Sonam', 'Rajesh', 'Gita', 'Prakash', 'Nima', 'Dawa', 'Asha', 'Suman',
];

export function formatRs(n) {
  return 'Rs ' + Math.floor(n).toLocaleString('en-IN');
}
