// DOM interface: HUD, order bubbles, popups, side panels, modals and toasts.
import { ITEMS, UPGRADES, LEVELS, STAFF, DECOR, PLATE, DAY_LENGTH, upgradeCost, staffCost, fmt } from './config.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TAB_TITLES = { upgrades: 'Upgrades', menu: 'Menu', staff: 'Staff', shop: 'Shop' };

const UPGRADE_HINTS = {
  cookSpeed: (lv) => `Steaming ${Math.round((1 - Math.pow(0.88, lv)) * 100)}% faster`,
  batch: (lv) => `Batch size ${4 + 2 * lv} momos`,
  slot: () => '',
  masala: (lv) => `Plates earn +${lv * 12}%`,
  fryer: () => '',
};

export class UI {
  constructor(game, world, sound) {
    this.game = game;
    this.world = world;
    this.sound = sound;
    this.tab = 'upgrades';
    // on phones the panel starts folded so the stall stays in view
    this.panelOpen = !this.isNarrow();
    this.panelDirty = true;
    this.lastHud = {};
    this.bubbles = new Map();
    this.onAction = null;
    this.bindStatic();
  }

  bindStatic() {
    document.querySelectorAll('#tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.panelOpen = true;
        this.sound.click();
        this.renderTabs();
        this.markPanel();
        this.layoutChanged();
      });
    });
    $('handle').addEventListener('click', () => {
      this.panelOpen = !this.panelOpen;
      this.renderTabs();
      this.layoutChanged();
    });
    $('panelBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      if (this.onAction) this.onAction(btn.dataset.act, btn.dataset.key);
    });
    $('btnMenu').addEventListener('click', () => {
      this.sound.click();
      this.openMenu();
    });
    this.renderTabs();
    window.addEventListener('resize', () => this.layoutChanged());
    this.layoutChanged();
  }

  // Desktop: side panel on the right. Phones: bottom sheet.
  isNarrow() {
    return window.innerWidth < 820;
  }

  layoutChanged() {
    const panel = $('panel');
    panel.classList.toggle('open', this.panelOpen);
    panel.classList.toggle('narrow', this.isNarrow());
    this.updateInsets();
  }

  updateInsets() {
    const panel = $('panel');
    const rect = panel.getBoundingClientRect();
    if (this.isNarrow()) {
      const bottom = Math.max(0, window.innerHeight - rect.top);
      this.world.setInsets(bottom, 0);
    } else {
      const right = Math.max(0, window.innerWidth - rect.left);
      this.world.setInsets(0, right);
    }
  }

  renderTabs() {
    document.querySelectorAll('#tabs button').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === this.tab);
    });
  }

  markPanel() {
    this.panelDirty = true;
  }

  // ---- HUD ------------------------------------------------------------
  updateHud(game) {
    const s = game.s;
    const set = (key, id, val) => {
      if (this.lastHud[key] !== val) {
        this.lastHud[key] = val;
        $(id).textContent = val;
      }
    };
    set('money', 'money', fmt(s.money));
    $('money').classList.toggle('neg', s.money < 0);
    set('day', 'dayLabel', `Day ${s.day}`);
    set('level', 'levelLabel', LEVELS[s.level - 1].name);
    const remaining = Math.max(0, DAY_LENGTH - s.dayTime);
    const mm = Math.floor(remaining / 60);
    const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
    set('time', 'timeLeft', game.phase === 'day' ? `${mm}:${ss}` : '0:00');
    const frac = Math.min(1, s.dayTime / DAY_LENGTH);
    if (this.lastHud.frac !== frac) {
      this.lastHud.frac = frac;
      $('timeFill').style.transform = `scaleX(${frac.toFixed(4)})`;
    }
    set('served', 'servedLabel', `${s.dayStats.served} served`);
    const stars = Math.round((s.rep / 20) * 2) / 2;
    const full = Math.floor(stars);
    const half = stars - full >= 0.5;
    set('stars', 'stars', '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0))));
    set('rep', 'repLabel', `${Math.round(s.rep)} / 100`);
    this.renderStock(game);
    this.renderHint(game);
  }

  renderStock(game) {
    const s = game.s;
    const key = Object.keys(ITEMS).map((k) => (s.unlocked[k] ? `${k}:${s.ready[k]}` : '')).join('|');
    if (this.lastStock === key) return;
    this.lastStock = key;
    $('stock').innerHTML = Object.keys(ITEMS)
      .filter((k) => s.unlocked[k])
      .map((k) => {
        const n = s.ready[k];
        const low = n === 0 ? ' empty' : '';
        return `<div class="chip${low}"><i style="background:${ITEMS[k].color}"></i>${esc(ITEMS[k].name)}<b>${n}</b></div>`;
      })
      .join('');
  }

  renderHint(game) {
    let msg = '';
    if (game.phase === 'day') {
      const readyCustomer = game.queue.some((c) => c.arrived && game.s.ready[c.order] >= PLATE);
      const idle = game.activeSlots().some((i) => game.slots[i].state === 'idle' && !game.isAutomated(i));
      const cooking = game.slots.some((sl) => sl.state === 'cooking');
      if (readyCustomer) msg = 'Tap a customer to serve them';
      else if (game.queue.some((c) => c.arrived)) msg = cooking ? 'Steaming... customers are waiting' : 'Tap a gold ring to start a batch';
      else if (idle && !cooking) msg = 'Tap a gold ring to start cooking';
    }
    if (this.lastHint !== msg) {
      this.lastHint = msg;
      const el = $('hint');
      el.textContent = msg;
      el.classList.toggle('show', !!msg);
    }
  }

  // ---- order bubbles over the queue --------------------------------------
  updateBubbles(game) {
    const alive = new Set();
    for (const c of game.queue) {
      alive.add(c.id);
      let el = this.bubbles.get(c.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'bubble';
        el.innerHTML = `<div class="b-ring"><span></span></div><div class="b-body"></div>`;
        $('bubbles').appendChild(el);
        this.bubbles.set(c.id, el);
      }
      const it = ITEMS[c.order];
      const ready = game.s.ready[c.order] >= PLATE;
      el.classList.toggle('ready', ready && c.arrived);
      el.querySelector('.b-body').innerHTML = `<i style="background:${it.color}"></i>${esc(it.short || it.name)}<small>${PLATE}x</small>`;
      const frac = Math.max(0, c.patience / c.maxP);
      const ring = el.querySelector('.b-ring');
      ring.style.background = `conic-gradient(${frac < 0.3 ? '#ff5a4a' : '#ffc247'} ${frac * 360}deg, rgba(0,0,0,0.35) 0)`;
      if (!c.arrived) el.classList.add('walking');
      else el.classList.remove('walking');
      const pos = this.world.personPos(c.id) || { x: 0, z: 3.3, top: 2.4 };
      const p = this.world.project(pos.x, pos.top, pos.z);
      if (p.behind) el.style.display = 'none';
      else {
        el.style.display = '';
        const r = $('bubbles').getBoundingClientRect();
        el.style.transform = `translate(${(p.x - r.left).toFixed(1)}px, ${(p.y - r.top).toFixed(1)}px)`;
      }
    }
    for (const [id, el] of this.bubbles) {
      if (!alive.has(id)) {
        el.remove();
        this.bubbles.delete(id);
      }
    }
  }

  popup(text, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = `popup ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    $('toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 400);
    }, 2600);
    while ($('toasts').children.length > 4) $('toasts').firstElementChild.remove();
  }

  // ---- panels --------------------------------------------------------------
  renderPanel(game) {
    if (!this.panelDirty) return;
    this.panelDirty = false;
    const body = $('panelBody');
    body.dataset.tab = this.tab;
    if (this.tab === 'upgrades') body.innerHTML = this.upgradesHtml(game);
    else if (this.tab === 'menu') body.innerHTML = this.menuHtml(game);
    else if (this.tab === 'staff') body.innerHTML = this.staffHtml(game);
    else body.innerHTML = this.shopHtml(game);
  }

  pips(n, max) {
    let out = '<div class="pips">';
    for (let i = 0; i < max; i++) out += `<i class="${i < n ? 'on' : ''}"></i>`;
    return out + '</div>';
  }

  button(label, act, key, enabled, cls = '') {
    return `<button class="buy ${cls}" data-act="${act}" data-key="${key}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  }

  upgradesHtml(game) {
    const s = game.s;
    const cards = Object.keys(UPGRADES).map((k) => {
      const u = UPGRADES[k];
      const owned = s.upg[k];
      let state;
      let note = UPGRADE_HINTS[k] ? UPGRADE_HINTS[k](owned) : '';
      if (k === 'fryer') {
        if (owned) state = this.button('Owned', 'none', k, false, 'owned');
        else if (s.level < u.minLevel) state = this.button('Needs Small Shop', 'none', k, false, 'locked');
        else state = this.button(fmt(upgradeCost(k, 0)), 'buy', k, s.money >= upgradeCost(k, 0));
        return this.card(u.name, u.desc, '', state, note, owned ? 1 : 0, 1);
      }
      if (k === 'slot') {
        const capped = game.steamSlots >= game.L.steamCap;
        if (capped) state = this.button('Expand shop for more', 'none', k, false, 'locked');
        else state = this.button(fmt(upgradeCost(k, owned)), 'buy', k, s.money >= upgradeCost(k, owned));
        note = `${game.steamSlots} of ${game.L.steamCap} steamers`;
        return this.card(u.name, u.desc, '', state, note, owned, u.max);
      }
      if (owned >= u.max) state = this.button('Maxed', 'none', k, false, 'owned');
      else state = this.button(fmt(upgradeCost(k, owned)), 'buy', k, s.money >= upgradeCost(k, owned));
      return this.card(u.name, u.desc, '', state, note, owned, u.max);
    });
    const decor = Object.keys(DECOR).map((k) => {
      const d = DECOR[k];
      const owned = s.decor[k];
      const state = owned
        ? this.button('Installed', 'none', k, false, 'owned')
        : this.button(fmt(d.cost), 'decor', k, s.money >= d.cost);
      return this.card(d.name, d.desc, '', state, '', owned ? 1 : 0, 1);
    });
    return `<div class="section">Kitchen</div>${cards.join('')}<div class="section">Decor</div>${decor.join('')}`;
  }

  card(title, desc, _unused, action, note, owned, max) {
    return `<div class="card-row">
      <div class="row-head"><div class="row-title">${esc(title)}</div>${max > 1 ? this.pips(owned, max) : ''}</div>
      <div class="row-desc">${esc(desc)}</div>
      <div class="row-foot"><span class="note">${esc(note)}</span>${action}</div>
    </div>`;
  }

  menuHtml(game) {
    const s = game.s;
    const rows = Object.keys(ITEMS).map((k) => {
      const it = ITEMS[k];
      const owned = s.unlocked[k];
      const price = Math.round(it.plate * game.masalaMult);
      const profit = price - it.cost * PLATE;
      let action;
      if (owned) action = this.button('On the menu', 'none', k, false, 'owned');
      else if (it.needs === 'fryer' && !s.upg.fryer) action = this.button('Needs Fryer Wok', 'none', k, false, 'locked');
      else action = this.button(`Add · ${fmt(it.unlock)}`, 'unlock', k, s.money >= it.unlock);
      const kind = it.kind === 'fry' ? 'Wok' : 'Steamer';
      return `<div class="card-row menu-row">
        <div class="row-head"><div class="row-title"><i class="swatch" style="background:${it.color}"></i>${esc(it.name)}</div><span class="tag">${kind}</span></div>
        <div class="row-desc">${esc(it.desc)}</div>
        <div class="stats">
          <span><b>${fmt(price)}</b> per plate</span>
          <span><b>${fmt(it.cost * PLATE)}</b> ingredients</span>
          <span class="profit"><b>${fmt(profit)}</b> profit</span>
        </div>
        <div class="row-foot"><span class="note">Plate = ${PLATE} momos</span>${action}</div>
      </div>`;
    });
    return `<div class="section">Menu</div>${rows.join('')}`;
  }

  staffHtml(game) {
    const s = game.s;
    const L = game.L;
    const rows = ['cook', 'server'].map((k) => {
      const st = STAFF[k];
      const hired = k === 'cook' ? s.cooks : s.servers;
      const cap = k === 'cook' ? L.cookCap : L.serverCap;
      const cost = staffCost(k, hired);
      let action;
      if (hired >= cap) action = this.button('Team full for this shop', 'none', k, false, 'locked');
      else action = this.button(`Hire · ${fmt(cost)}`, 'hire', k, s.money >= cost);
      return `<div class="card-row">
        <div class="row-head"><div class="row-title">${esc(st.name)}s</div><span class="tag">${hired} / ${cap}</span></div>
        <div class="row-desc">${esc(st.desc)}</div>
        <div class="stats"><span><b>${fmt(st.wage)}</b> wage per day</span></div>
        <div class="row-foot"><span class="note">${k === 'cook' ? 'Keeps a steamer or wok busy' : 'Serves ready plates automatically'}</span>${action}</div>
      </div>`;
    });
    const wages = s.cooks * STAFF.cook.wage + s.servers * STAFF.server.wage;
    return `<div class="section">Team</div>${rows.join('')}
      <div class="footnote">Wages and rent (${fmt(L.rent)}/day) are paid at the end of each day. Current wages: ${fmt(wages)}/day.</div>`;
  }

  shopHtml(game) {
    const s = game.s;
    const L = game.L;
    const levels = LEVELS.map((lv, i) => {
      const state = i + 1 < s.level ? 'done' : i + 1 === s.level ? 'current' : 'next';
      return `<div class="level ${state}">
        <div class="lv-num">${i + 1}</div>
        <div class="lv-body"><div class="row-title">${esc(lv.name)}</div>
        <div class="stats"><span>Queue ${lv.queue}</span><span>${lv.steamCap} steamers</span><span>${lv.serverCap} servers</span></div></div>
      </div>`;
    });
    let next = '';
    if (L.next) {
      const n = L.next;
      const reqs = [
        { label: `Cash ${fmt(n.cost)}`, ok: s.money >= n.cost, have: fmt(s.money) },
        { label: `Reputation ${n.rep}`, ok: s.rep >= n.rep, have: Math.round(s.rep) },
        { label: `Customers served ${n.served}`, ok: s.servedTotal >= n.served, have: s.servedTotal },
      ];
      next = `<div class="section">Expand to ${esc(n.title)}</div>
        <div class="card-row">
          <div class="row-desc">A bigger space: longer queue, more steamers, more staff and a bigger menu board. Your cash pays for the build.</div>
          <ul class="reqs">${reqs.map((r) => `<li class="${r.ok ? 'ok' : ''}"><span>${r.ok ? '✓' : '○'}</span>${esc(r.label)} <em>(${esc(String(r.have))})</em></li>`).join('')}</ul>
          <div class="row-foot"><span class="note">Rent rises to ${fmt(LEVELS[s.level].rent)}/day</span>${this.button(`Expand · ${fmt(n.cost)}`, 'expand', 'next', game.canExpand())}</div>
        </div>`;
    } else {
      next = `<div class="card-row"><div class="row-title">Top of the street</div><div class="row-desc">You run the busiest momo restaurant in Kathmandu. Keep the queue moving.</div></div>`;
    }
    return `<div class="section">Your shop</div>${levels.join('')}${next}`;
  }

  // ---- modals -------------------------------------------------------------
  showTitle(hasSave) {
    $('titleContinue').hidden = !hasSave;
    $('titleModal').classList.add('show');
  }

  hideTitle() {
    $('titleModal').classList.remove('show');
  }

  showReport(r) {
    const rows = [
      ['Served', `${r.served} plates`],
      ['Turned away or lost', `${r.lost}`],
      ['Sales', fmt(r.revenue)],
      ['Ingredients', `− ${fmt(r.ingredients)}`],
      ['Wages', `− ${fmt(r.wages)}`],
      ['Rent', `− ${fmt(r.rent)}`],
    ];
    $('reportRows').innerHTML = rows.map(([a, b]) => `<div class="r-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('');
    $('reportNet').textContent = `${r.net >= 0 ? '+' : '−'} ${fmt(Math.abs(r.net))}`;
    $('reportNet').classList.toggle('neg', r.net < 0);
    $('reportTitle').textContent = `Day ${r.day} complete`;
    $('reportNote').textContent = r.unpaid > 0
      ? `You could not cover ${fmt(r.unpaid)} of bills. Reputation dropped.`
      : r.served === 0
        ? 'Quiet day. Customers need you to be open and cooking.'
        : `Reputation is now ${Math.round(r.rep)}.`;
    $('reportModal').classList.add('show');
    $('reportNext').textContent = `Open day ${r.day + 1}`;
  }

  hideReport() {
    $('reportModal').classList.remove('show');
  }

  openMenu() {
    $('menuModal').classList.add('show');
    this.refreshMenuModal();
  }

  closeMenu() {
    $('menuModal').classList.remove('show');
    $('resetBtn').textContent = 'Erase progress';
    $('resetBtn').dataset.armed = '';
  }

  refreshMenuModal() {
    $('soundToggle').textContent = `Sound: ${this.sound.enabled ? 'on' : 'off'}`;
    $('soundToggle').setAttribute('aria-pressed', String(this.sound.enabled));
  }

  bindModals(handlers) {
    $('titleNew').addEventListener('click', () => handlers.newGame());
    $('titleContinue').addEventListener('click', () => handlers.continueGame());
    $('reportNext').addEventListener('click', () => handlers.nextDay());
    $('menuClose').addEventListener('click', () => this.closeMenu());
    $('soundToggle').addEventListener('click', () => {
      this.sound.toggle();
      this.refreshMenuModal();
    });
    $('resetBtn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.armed !== '1') {
        btn.dataset.armed = '1';
        btn.textContent = 'Tap again to erase everything';
        return;
      }
      handlers.reset();
      this.closeMenu();
    });
    $('menuModal').addEventListener('click', (e) => {
      if (e.target.id === 'menuModal') this.closeMenu();
    });
  }
}
