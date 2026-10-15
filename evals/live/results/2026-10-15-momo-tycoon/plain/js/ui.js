// DOM layer: HUD, tabbed management panel, order bubbles, basket badges,
// floating text and toasts. Reads game state; sends player intent via act().
import {
  ITEMS, ITEM_ORDER, UPGRADES, DECOR, STAFF, STAGES, ACHIEVEMENTS, PAYDAY_SECONDS, formatRs,
} from './data.js';
import {
  maxBaskets, batchSize, priceOf, upgradeCost, basketCost, canExpand,
  nextStage, wages, queueDemand,
} from './sim.js';
import { sfx } from './sfx.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function createUI({ act }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    stageName: $('stage-name'), stageNe: $('stage-ne'), money: $('money'), rep: $('rep-text'),
    repBar: $('rep-bar'), paydayText: $('payday-text'), paydayBar: $('payday-bar'), earned: $('earned-text'),
    panel: $('panel-body'), tabs: document.querySelectorAll('.tab'), labels: $('labels'),
    fx: $('fx'), toasts: $('toasts'), soundBtn: $('btn-sound'),
  };
  let tab = 'cook';
  let lastHtml = '';
  let shownMoney = null;
  let lastToastLeft = 0;
  let lastReady = 0;
  const labelEls = new Map();
  const badgeEls = [];

  // ---------- panel ----------

  function itemRow(s, k) {
    const it = ITEMS[k];
    const have = s.stock[k] || 0;
    const q = queueDemand(s, k);
    const selected = s.cookChoice === k;
    const unlocked = s.unlocked[k];
    const btn = unlocked
      ? `<button class="btn ${selected ? 'on' : 'ghost'}" data-act="choose" data-arg="${k}" ${selected ? 'disabled' : ''}>${selected ? 'Cooking' : 'Cook this'}</button>`
      : `<button class="btn" data-act="unlock" data-arg="${k}" ${s.money < it.unlock ? 'disabled' : ''}>Unlock<small>${formatRs(it.unlock)}</small></button>`;
    return `
      <div class="menu-card ${selected && unlocked ? 'selected' : ''}">
        <span class="swatch" style="background:${hex(it.color)}"></span>
        <div><div class="name">${esc(it.name)}</div><span class="ne">${esc(it.ne)}</span></div>
        <div class="stats">${unlocked ? `Sells ${formatRs(priceOf(s, k))} · tray ${have} · orders ${q}` : esc(it.desc)}</div>
        ${btn}
      </div>`;
  }

  function basketStatus(s, i) {
    const b = s.slots[i];
    if (b.state === 'ready') {
      return { cls: 'ready', text: `Ready · ${b.count} × ${ITEMS[b.item].name}`, btn: 'Collect', bar: 1 };
    }
    if (b.state === 'cooking') {
      const left = Math.ceil(b.left);
      return { cls: '', text: `Cooking ${b.count} × ${ITEMS[b.item].name} · ${left}s`, btn: 'Cooking', bar: 1 - b.left / b.total, busy: true };
    }
    return { cls: 'empty', text: `Empty · will load ${ITEMS[s.cookChoice].name}`, btn: 'Load', bar: 0 };
  }

  function renderCook(s) {
    const owned = s.baskets;
    let baskets = '';
    for (let i = 0; i < owned; i++) {
      const st = basketStatus(s, i);
      baskets += `
        <div class="basket-row ${st.cls}">
          <div>
            <div class="name" style="font-weight:650">Steamer ${i + 1}</div>
            <div class="status">${esc(st.text)}</div>
            <div class="bar"><span data-prog="${i}"></span></div>
          </div>
          <button class="btn ${st.cls === 'ready' ? 'on' : ''}" data-act="tap" data-arg="${i}" ${st.busy ? 'disabled' : ''}>${st.btn}</button>
        </div>`;
    }
    const orders = s.queue.length;
    const menu = ITEM_ORDER.map((k) => itemRow(s, k)).join('');
    return `
      <div class="section-title">Steamers <span class="muted">${owned} of ${maxBaskets(s)} · ${batchSize(s)} momos each</span></div>
      <div class="basket-list">${baskets}</div>
      <div class="section-title">Menu <span class="muted">${orders} waiting in line</span></div>
      <div class="menu-grid">${menu}</div>
      <p class="muted" style="margin:12px 2px 0;line-height:1.4">Tap a steamer on the stall to load it with the item marked “Cooking”, and tap again when it's ready. Hired chefs do this automatically.</p>`;
  }

  function pips(n, max) {
    return `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  function renderUpgrade(s) {
    let html = `<div class="section-title">Steamer upgrades</div>`;
    for (const key of Object.keys(UPGRADES)) {
      const d = UPGRADES[key];
      const lvl = s.upgrades[key];
      const maxed = lvl >= d.max;
      const cost = upgradeCost(s, key);
      html += `
        <div class="row">
          <div><div class="name">${esc(d.name)}</div><div class="desc">${esc(d.desc)}</div>${pips(lvl, d.max)}</div>
          <button class="btn" data-act="upgrade" data-arg="${key}" ${maxed || s.money < cost ? 'disabled' : ''}>${maxed ? 'Max' : `Buy<small>${formatRs(cost)}</small>`}</button>
        </div>`;
    }
    const bMax = s.baskets >= maxBaskets(s);
    const bCost = basketCost(s);
    html += `
      <div class="row">
        <div><div class="name">Extra steamer basket</div><div class="desc">${s.baskets} of ${maxBaskets(s)} baskets in use. Each basket cooks in parallel.</div></div>
        <button class="btn" data-act="basket" ${bMax || s.money < bCost ? 'disabled' : ''}>${bMax ? 'Full' : `Add<small>${formatRs(bCost)}</small>`}</button>
      </div>`;
    html += `<div class="section-title">Decor <span class="muted">one-time</span></div>`;
    for (const key of Object.keys(DECOR)) {
      const d = DECOR[key];
      const owned = s.decor[key];
      html += `
        <div class="row">
          <div><div class="name">${esc(d.name)}</div><div class="desc">${esc(d.desc)}</div></div>
          <button class="btn ${owned ? 'on' : ''}" data-act="decor" data-arg="${key}" ${owned || s.money < d.cost ? 'disabled' : ''}>${owned ? 'Installed' : `Buy<small>${formatRs(d.cost)}</small>`}</button>
        </div>`;
    }
    return html;
  }

  function renderStaff(s) {
    let html = `<div class="section-title">Team <span class="muted">Payday every ${PAYDAY_SECONDS}s</span></div>`;
    for (const key of Object.keys(STAFF)) {
      const d = STAFF[key];
      const n = s.staff[key];
      const full = n >= d.max;
      html += `
        <div class="row">
          <div>
            <div class="name">${esc(d.name)}<span class="ne">${esc(d.ne)}</span></div>
            <div class="desc">${esc(d.desc)}</div>
            <div class="desc"><b style="color:var(--cream)">${n}/${d.max} hired</b> · wage ${formatRs(d.wage)} per payday</div>
          </div>
          <button class="btn" data-act="hire" data-arg="${key}" ${full || s.money < d.hire ? 'disabled' : ''}>${full ? 'Full' : `Hire<small>${formatRs(d.hire)}</small>`}</button>
        </div>`;
    }
    const rent = STAGES[s.stage].rent;
    html += `
      <div class="section-title">Next payday</div>
      <div class="stat-grid">
        <div class="stat"><span>Wages</span><b>${formatRs(wages(s))}</b></div>
        <div class="stat"><span>Rent</span><b>${formatRs(rent)}</b></div>
      </div>
      <p class="muted" style="line-height:1.4;margin:8px 2px 0">Chefs keep steamers full and pull momos out of them. Servers bring the first ready order to a customer. Wages are paid even when the line is empty.</p>`;
    return html;
  }

  function renderExpand(s) {
    const cur = STAGES[s.stage];
    const next = nextStage(s);
    let html = `
      <div class="stage-card current">
        <div class="section-title" style="margin:0 0 4px"><span class="name" style="font-size:15px;color:var(--cream);text-transform:none;letter-spacing:0;font-weight:700">${esc(cur.name)}</span><span class="muted">current</span></div>
        <div class="muted"><span class="ne" style="font-family:'Noto Sans Devanagari',system-ui,sans-serif;color:#f3c98e">${esc(cur.ne)}</span> · up to ${cur.maxBaskets} steamers · queue of ${cur.maxQueue}</div>
      </div>`;
    if (next) {
      const ok = canExpand(s);
      html += `
        <div class="stage-card">
          <div class="section-title" style="margin:0 0 4px"><span class="name" style="font-size:15px;color:var(--cream);text-transform:none;letter-spacing:0;font-weight:700">${esc(next.name)}</span><span class="muted">next</span></div>
          <div class="muted"><span class="ne" style="font-family:'Noto Sans Devanagari',system-ui,sans-serif;color:#f3c98e">${esc(next.ne)}</span></div>
          <div class="req">Needs <b>${formatRs(next.cost)}</b> and reputation <b>${next.rep}+</b> (you have ${Math.floor(s.rep)}).<br>Up to ${next.maxBaskets} steamers, queue of ${next.maxQueue}, spawn x${next.spawn}, rent ${formatRs(next.rent)} per payday.</div>
          <button class="btn" style="width:100%" data-act="expand" ${ok ? '' : 'disabled'}>${ok ? `Open ${esc(next.name)}` : 'Not yet'}</button>
        </div>`;
    } else {
      html += `<p class="muted" style="margin:6px 2px 12px">You run the biggest momo restaurant in Kathmandu.</p>`;
    }
    html += `
      <div class="section-title">Business</div>
      <div class="stat-grid">
        <div class="stat"><span>Total earned</span><b>${formatRs(s.totalEarned)}</b></div>
        <div class="stat"><span>Momos served</span><b>${s.served}</b></div>
        <div class="stat"><span>Customers lost</span><b>${s.lost}</b></div>
        <div class="stat"><span>Reputation</span><b>${Math.floor(s.rep)} / 100</b></div>
      </div>
      <div class="section-title">Achievements <span class="muted">${s.achievements.length}/${ACHIEVEMENTS.length}</span></div>`;
    for (const a of ACHIEVEMENTS) {
      const done = s.achievements.includes(a.id);
      html += `
        <div class="ach ${done ? 'done' : ''}">
          <div class="medal">${done ? '✓' : '·'}</div>
          <div><div class="t">${esc(a.name)}</div><div class="d">${esc(a.desc)} · ${formatRs(a.reward)}</div></div>
        </div>`;
    }
    return html;
  }

  function renderPanel(s) {
    const html = tab === 'cook' ? renderCook(s) : tab === 'upgrade' ? renderUpgrade(s) : tab === 'staff' ? renderStaff(s) : renderExpand(s);
    if (html !== lastHtml) {
      const top = el.panel.scrollTop;
      el.panel.innerHTML = html;
      el.panel.scrollTop = top;
      lastHtml = html;
    }
  }

  el.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      el.tabs.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      lastHtml = '';
    });
  });
  el.panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    act(b.dataset.act, b.dataset.arg);
  });

  // ---------- HUD ----------

  function renderHud(s, dt) {
    const st = STAGES[s.stage];
    el.stageName.textContent = st.name;
    el.stageNe.textContent = st.ne;
    if (shownMoney === null) shownMoney = s.money;
    shownMoney += (s.money - shownMoney) * Math.min(1, dt * 8);
    if (Math.abs(s.money - shownMoney) < 1) shownMoney = s.money;
    el.money.textContent = formatRs(shownMoney);
    el.rep.textContent = String(Math.floor(s.rep));
    el.repBar.style.width = `${s.rep}%`;
    const left = Math.ceil(s.payIn);
    el.paydayText.textContent = `Payday in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    el.paydayBar.style.width = `${(1 - s.payIn / PAYDAY_SECONDS) * 100}%`;
    el.earned.textContent = `Earned ${formatRs(s.totalEarned)}`;
  }

  // ---------- customer order bubbles ----------

  function labelFor(s, c, canServe) {
    const it = ITEMS[c.item];
    return `
      <div class="cl-name">${esc(c.name)}</div>
      <div class="cl-order"><span class="dot" style="background:${hex(it.color)}"></span>${c.qty} × ${esc(it.name)}</div>
      <div class="cl-bar"><span></span></div>`;
  }

  function renderLabels(s, world) {
    const seen = new Set();
    for (const c of s.queue) {
      seen.add(c.id);
      let node = labelEls.get(c.id);
      if (!node) {
        node = document.createElement('button');
        node.className = 'cust-label';
        node.addEventListener('click', () => act('serve', String(c.id)));
        el.labels.appendChild(node);
        labelEls.set(c.id, node);
        node._key = '';
      }
      const canServe = (s.stock[c.item] || 0) >= c.qty;
      const key = `${c.item}|${c.qty}|${c.name}|${canServe}`;
      if (node._key !== key) {
        node.innerHTML = labelFor(s, c, canServe);
        node.classList.toggle('can', canServe);
        node._key = key;
      }
      const frac = Math.max(0, c.patience / c.maxPatience);
      const bar = node.querySelector('.cl-bar > span');
      bar.style.width = `${frac * 100}%`;
      node.classList.toggle('warn', frac < 0.5 && frac >= 0.22);
      node.classList.toggle('angry', frac < 0.22);
      const p = world.customerScreen(c.id);
      if (p && p.visible) {
        node.style.transform = `translate(${p.x}px, ${p.y - 6}px) translate(-50%, -100%)`;
        node.style.display = '';
      } else {
        node.style.display = 'none';
      }
    }
    for (const [id, node] of labelEls) {
      if (!seen.has(id)) {
        node.remove();
        labelEls.delete(id);
      }
    }
  }

  function renderBadges(s, world) {
    const count = s.baskets;
    for (let i = 0; i < count; i++) {
      if (!badgeEls[i]) {
        const b = document.createElement('button');
        b.className = 'basket-badge';
        b.addEventListener('click', () => act('tap', String(i)));
        el.labels.appendChild(b);
        badgeEls[i] = b;
      }
      const node = badgeEls[i];
      const st = s.slots[i];
      const p = world.slotScreen(i);
      if (!p || !p.visible) {
        node.style.display = 'none';
        continue;
      }
      let text, cls;
      if (st.state === 'ready') {
        text = `Ready ×${st.count} · collect`;
        cls = 'ready';
      } else if (st.state === 'cooking') {
        text = `${Math.ceil(st.left)}s`;
        cls = '';
      } else {
        text = 'Tap to load';
        cls = 'empty';
      }
      const key = `${text}|${cls}`;
      if (node._key !== key) {
        node.textContent = text;
        node.className = `basket-badge ${cls}`;
        node._key = key;
      }
      node.style.display = '';
      node.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
    for (let i = count; i < badgeEls.length; i++) badgeEls[i].style.display = 'none';
  }

  function updateProgress(s) {
    el.panel.querySelectorAll('[data-prog]').forEach((node) => {
      const i = Number(node.dataset.prog);
      const b = s.slots[i];
      if (!b) return;
      node.style.width = `${b.state === 'cooking' ? (1 - b.left / b.total) * 100 : b.state === 'ready' ? 100 : 0}%`;
    });
  }

  // ---------- toasts & floating text ----------

  function toast(title, body, kind = 'good') {
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    node.innerHTML = `<b>${esc(title)}</b>${esc(body)}`;
    el.toasts.appendChild(node);
    while (el.toasts.children.length > 4) el.toasts.firstChild.remove();
    setTimeout(() => node.remove(), 3700);
  }

  function floatAt(x, y, text) {
    const node = document.createElement('div');
    node.className = 'float';
    node.textContent = text;
    node.style.transform = `translate(${x}px, ${y}px)`;
    el.fx.appendChild(node);
    setTimeout(() => node.remove(), 1400);
  }

  function onEvent(ev, world) {
    switch (ev.type) {
      case 'served': {
        const p = world.customerScreen(ev.id);
        if (p) floatAt(p.x, p.y - 60, `+${formatRs(ev.pay)}`);
        sfx.coin();
        break;
      }
      case 'payday': {
        const short = ev.paid < ev.due;
        toast(
          short ? 'Payday — could not cover it all' : 'Payday',
          `Wages ${formatRs(ev.wages)}${ev.rent ? ` · Rent ${formatRs(ev.rent)}` : ''}`,
          short ? 'warn' : 'info',
        );
        break;
      }
      case 'achievement':
        toast(`Achievement: ${ev.name}`, `${ev.desc} Bonus ${formatRs(ev.reward)}`, 'good');
        sfx.ding();
        break;
      case 'expanded': {
        const st = STAGES[ev.stage];
        toast('Business grew!', `Welcome to your ${st.name} (${st.ne}).`, 'good');
        sfx.ding();
        break;
      }
      case 'left': {
        const now = performance.now();
        if (now - lastToastLeft > 6000) {
          lastToastLeft = now;
          toast('A customer walked off', 'Serve faster or add steamers. Reputation dropped.', 'warn');
        }
        break;
      }
      case 'ready': {
        const now = performance.now();
        if (now - lastReady > 400) {
          lastReady = now;
          sfx.pop();
        }
        break;
      }
      default:
        break;
    }
  }

  // ---------- per frame ----------

  function frame(s, world, dt) {
    renderHud(s, dt);
    renderPanel(s);
    updateProgress(s);
    renderLabels(s, world);
    renderBadges(s, world);
  }

  function setSoundLabel() {
    el.soundBtn.textContent = sfx.muted ? 'Sound: off' : 'Sound: on';
  }
  el.soundBtn.addEventListener('click', () => {
    sfx.setMuted(!sfx.muted);
    setSoundLabel();
  });
  setSoundLabel();

  return {
    frame,
    onEvent,
    toast,
    resetPanel() {
      lastHtml = '';
    },
  };
}
