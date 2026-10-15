// Objective browser checks for the toggle and button fixtures.
// Usage: node grade_ui.js <toggle|button> <project-dir>
const { chromium } = require('playwright');
const path = require('path');

const [kind, dir] = process.argv.slice(2);
const url = 'file://' + path.resolve(dir, 'index.html');

async function sampleThumb(page, action, ms = 700) {
  return page.evaluate(async ({ action, ms }) => {
    const sw = document.querySelector('#notif');
    const thumb = sw.querySelector('.thumb') || sw.firstElementChild;
    const xs = [];
    const pos = () => thumb.getBoundingClientRect().left - sw.getBoundingClientRect().left;
    xs.push(pos());
    const start = performance.now();
    let reversed = false;
    sw.click();
    await new Promise((resolve) => {
      const tick = () => {
        xs.push(pos());
        if (action === 'reverse' && !reversed && performance.now() - start >= 90) {
          reversed = true;
          sw.click();
        }
        if (performance.now() - start < ms) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    return xs;
  }, { action, ms });
}

function maxJump(xs) {
  let m = 0;
  for (let i = 1; i < xs.length; i++) m = Math.max(m, Math.abs(xs[i] - xs[i - 1]));
  return m;
}

async function toggle(browser) {
  const out = {};
  const page = await browser.newPage();
  await page.goto(url);
  const off = await page.evaluate(() => {
    const sw = document.querySelector('#notif');
    const t = sw.querySelector('.thumb') || sw.firstElementChild;
    return t.getBoundingClientRect().left - sw.getBoundingClientRect().left;
  });
  const turnOn = await sampleThumb(page, 'click');
  const on = turnOn[turnOn.length - 1];
  const travel = Math.abs(on - off);
  out.travel_px = travel;
  out.state_on = await page.getAttribute('#notif', 'aria-checked');
  out.on_animated = turnOn.some((x) => x > off + 2 && x < on - 2);
  out.on_max_jump_px = maxJump(turnOn);
  const turnOff = await sampleThumb(page, 'click');
  out.state_off = await page.getAttribute('#notif', 'aria-checked');
  out.off_max_jump_px = maxJump(turnOff);
  out.off_animated = turnOff.some((x) => x > off + 2 && x < on - 2);
  out.off_end_correct = Math.abs(turnOff[turnOff.length - 1] - off) < 1;
  const rev = await sampleThumb(page, 'reverse');
  out.reverse_max_jump_px = maxJump(rev);
  out.reverse_end_correct = Math.abs(rev[rev.length - 1] - off) < 1;
  out.state_after_reverse = await page.getAttribute('#notif', 'aria-checked');
  // A frame-to-frame jump larger than 45% of the whole travel is a visible snap.
  const snap = travel * 0.45;
  out.no_snap_off = out.off_max_jump_px <= snap;
  out.no_snap_reverse = out.reverse_max_jump_px <= snap;
  // Keyboard: Space on the focused switch must still toggle it exactly once.
  const before = await page.getAttribute('#notif', 'aria-checked');
  await page.focus('#notif');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  const after = await page.getAttribute('#notif', 'aria-checked');
  out.keyboard_space_toggles = before !== after;
  out.role_switch = (await page.getAttribute('#notif', 'role')) === 'switch';
  out.is_button = await page.evaluate(() => document.querySelector('#notif').tagName === 'BUTTON');
  out.uses_transform = await page.evaluate(() => {
    const t = document.querySelector('#notif .thumb');
    const sw = document.querySelector('#notif');
    sw.classList.add('on');
    const tf = getComputedStyle(t).transitionProperty;
    return /transform|all/.test(tf) && !/(^|,\s*)left/.test(tf);
  });
  await page.close();
  // Reduced motion: the state should land promptly when the user asks for less motion.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await ctx.newPage();
  await rp.goto(url);
  const rm = await sampleThumb(rp, 'click', 120);
  out.reduced_motion_settles_within_120ms = Math.abs(rm[rm.length - 1] - (off + travel)) < 1.5;
  await ctx.close();
  out.pass = out.no_snap_off && out.no_snap_reverse && out.on_animated && out.off_animated &&
    out.off_end_correct && out.reverse_end_correct && out.keyboard_space_toggles && out.role_switch &&
    out.state_on === 'true' && out.state_off === 'false';
  return out;
}

async function button(browser) {
  const out = { viewports: {} };
  let ok = true;
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(url);
    const m = await page.evaluate(() => {
      const b = document.querySelector('#download');
      const card = document.querySelector('.card');
      const cell = b.parentElement;
      const br = b.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const cs = getComputedStyle(b);
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      return {
        tag: b.tagName,
        text: b.textContent.trim(),
        font_px: parseFloat(cs.fontSize),
        inside_card: br.left >= cr.left - 0.5 && br.right <= cr.right - parseFloat(getComputedStyle(card).paddingRight) + 0.5,
        label_fits: b.scrollWidth <= b.clientWidth + 1,
        not_overflowing_cell: br.right <= cell.getBoundingClientRect().right + 0.5 || cell.scrollWidth <= cell.clientWidth + 1,
        visible: vis(b),
        search_visible: vis(document.querySelector('.search')),
        filter_visible: vis(document.querySelector('.filter')),
        height: br.height,
        page_hscroll: document.documentElement.scrollWidth > window.innerWidth,
        save: (() => { const s = document.querySelector('#save'); const st = getComputedStyle(s); const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), pad: st.paddingLeft, font: st.fontSize, bg: st.backgroundColor }; })(),
      };
    });
    m.pass = m.tag === 'BUTTON' && m.text === 'Download invoice' && m.font_px >= 16 && m.inside_card &&
      m.label_fits && m.visible && m.search_visible && m.filter_visible && !m.page_hscroll;
    if (!m.pass) ok = false;
    out.viewports[width] = m;
    await page.close();
  }
  out.pass = ok;
  return out;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const result = kind === 'toggle' ? await toggle(browser) : await button(browser);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({ pass: false, error: String(e) }));
  } finally {
    await browser.close();
  }
})();
