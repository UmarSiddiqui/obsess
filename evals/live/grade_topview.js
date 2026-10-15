// Black-box grader for the Momo Tycoon "top-down view" task.
// Usage: node grade_topview.js <game-dir> <out-dir> <instrumented three.module.js>
// Three.js is routed to an instrumented copy that records the camera and scene each frame,
// so the game's own code is not touched or required to expose anything.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const [dir, outDir, threePath] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const SAVE_KEY = 'momo-tycoon-save-v1';
const MIN_PITCH = Number(process.env.MIN_PITCH || 45); // degrees below the horizon: 45 reads as top-down, 80+ as fully overhead
const MIN_COVER = 0.95; // share of the play-floor sample points that must be visible and uncovered

// Play-floor rectangles from the base game's layout (counter at the origin, queue in front).
const FLOOR = {
  0: { x: [-4, 4], z: [-1.5, 4.5] },
  2: { x: [-6, 6], z: [-2.5, 4.5] },
};

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
function serve(root) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
      res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function newPage(browser, vp, mobile, errors, label) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  await page.route('**/cdn.jsdelivr.net/npm/three@0.160.0/**', (r) => {
    const rel = r.request().url().split('three@0.160.0/')[1];
    if (rel === 'build/three.module.js') return r.fulfill({ path: threePath, contentType: 'application/javascript' });
    return r.fulfill({ status: 404 });
  });
  return { ctx, page };
}

// Camera pitch and how much of the play floor is on screen and not under UI.
async function measure(page, rect) {
  return page.evaluate(({ rect }) => {
    const cam = window.__evalCam;
    const V3 = window.__evalV3;
    if (!cam || !V3) return { error: 'no camera rendered' };
    cam.updateMatrixWorld();
    const dir = new V3();
    cam.getWorldDirection(dir);
    const pitch = (Math.asin(-dir.y) * 180) / Math.PI;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Opaque UI: anything fixed/absolute with a background that covers the canvas.
    const blockers = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.tagName === 'CANVAS' || el.closest('canvas')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3) continue;
      if (!(cs.position === 'fixed' || cs.position === 'absolute')) continue;
      const bg = cs.backgroundColor;
      const hasBg = (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || cs.backgroundImage !== 'none';
      if (!hasBg) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 1200 || r.width >= W * 0.98 && r.height >= H * 0.98) continue; // skip tiny chips and full-screen layers
      if (el.matches('.cust-label, .basket-badge, .float, .toast, .bubble, .popup, [class*="label"], [class*="badge"]')) continue;
      blockers.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
    }
    let total = 0;
    let ok = 0;
    for (let i = 0; i <= 12; i++) {
      for (let j = 0; j <= 10; j++) {
        const x = rect.x[0] + ((rect.x[1] - rect.x[0]) * i) / 12;
        const z = rect.z[0] + ((rect.z[1] - rect.z[0]) * j) / 10;
        const v = new V3(x, 0.9, z).project(cam);
        total++;
        if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
        const sx = ((v.x + 1) / 2) * W;
        const sy = ((1 - v.y) / 2) * H;
        if (blockers.some((b) => sx >= b.l && sx <= b.r && sy >= b.t && sy <= b.b)) continue;
        ok++;
      }
    }
    return { pitch: Math.round(pitch * 10) / 10, cover: Math.round((ok / total) * 1000) / 1000, camType: cam.type, blockers: blockers.length };
  }, { rect });
}

async function startNew(page) {
  for (const sel of ['#btn-new', 'button:has-text("New game")', 'button:has-text("Start")', 'button:has-text("Play")']) {
    const b = page.locator(sel).first();
    if (await b.isVisible().catch(() => false)) { await b.evaluate((el) => el.click()); break; }
  }
  await page.waitForTimeout(1500);
}

const money = async (page) => {
  const t = await page.locator('#money').first().textContent().catch(() => '');
  return Number(String(t).replace(/[^0-9]/g, '')) || 0;
};

async function playLoop(page) {
  // Cook one batch from the panel, collect it, then serve a customer whose order is ready.
  const r = { loaded: false, collected: false, served: false, moneyBefore: 0, moneyAfter: 0 };
  r.moneyBefore = await money(page);
  const load = page.locator('[data-act="tap"]:has-text("Load")').first();
  if (await load.isVisible().catch(() => false)) { await load.click(); r.loaded = true; }
  const collect = page.locator('[data-act="tap"]:has-text("Collect")').first();
  await collect.waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  if (await collect.isVisible().catch(() => false)) { await collect.click(); r.collected = true; }
  const deadline = Date.now() + 150000; // software rendering runs game time slowly
  while (Date.now() < deadline && !r.served) {
    const can = page.locator('.cust-label.can').first();
    if (await can.isVisible().catch(() => false)) {
      await can.click({ force: true });
      await page.waitForTimeout(800);
      r.moneyAfter = await money(page);
      r.served = r.moneyAfter > r.moneyBefore;
    } else {
      // keep cooking if the tray ran short
      const l = page.locator('[data-act="tap"]:has-text("Load")').first();
      if (await l.isVisible().catch(() => false)) await l.click().catch(() => {});
      const c = page.locator('[data-act="tap"]:has-text("Collect")').first();
      if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); r.collected = true; }
      await page.waitForTimeout(1000);
    }
  }
  return r;
}

const STAGE2_SAVE = JSON.stringify({
  v: 1, money: 42000, totalEarned: 90000, served: 900, lost: 3, rep: 80, stage: 2, baskets: 8,
  slots: Array.from({ length: 8 }, () => ({ state: 'idle', item: null, left: 0, total: 0, count: 0 })),
  upgrades: { speed: 3, batch: 2, recipe: 3 }, unlocked: { steamed: true, jhol: true, cmomo: true, fried: true },
  decor: { flags: true, garland: true, lanterns: true }, staff: { cook: 2, waiter: 3 },
  stock: { steamed: 0, jhol: 0, cmomo: 0, fried: 0 }, cookChoice: 'steamed', queue: [], nextId: 1, spawnIn: 1,
  payIn: 60, cookAcc: 0, waiterAcc: 0, time: 0, achievements: [],
});

(async () => {
  const srv = await serve(path.resolve(dir));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const out = { views: {} };
  try {
    // Desktop: view check, then a real cook-collect-serve loop, then save survives reload.
    {
      const { ctx, page } = await newPage(browser, { width: 1440, height: 900 }, false, errors, 'desktop');
      await page.goto(url);
      await page.waitForTimeout(4000);
      await startNew(page);
      await page.waitForTimeout(6000);
      out.views.desktop = await measure(page, FLOOR[0]);
      await page.screenshot({ path: path.join(outDir, 'desktop.png') });
      out.play = await playLoop(page);
      await page.screenshot({ path: path.join(outDir, 'desktop-playing.png') });
      await page.waitForTimeout(5000);
      const before = await money(page);
      await page.reload();
      await page.waitForTimeout(4000);
      const cont = page.locator('#btn-continue, button:has-text("Continue")').first();
      out.save = { continueShown: await cont.isVisible().catch(() => false), moneyBefore: before };
      if (out.save.continueShown) { await cont.evaluate((el) => el.click()); await page.waitForTimeout(1500); }
      out.save.moneyAfter = await money(page);
      out.save.ok = out.save.continueShown && Math.abs(out.save.moneyAfter - before) <= Math.max(60, before * 0.1);
      await ctx.close();
    }
    // Expanded restaurant from a saved game: the whole floor must still fit.
    for (const [name, vp, mobile] of [['restaurant-desktop', { width: 1440, height: 900 }, false], ['restaurant-phone', { width: 390, height: 844 }, true]]) {
      const { ctx, page } = await newPage(browser, vp, mobile, errors, name);
      await page.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, [SAVE_KEY, STAGE2_SAVE]);
      await page.goto(url);
      await page.waitForTimeout(4000);
      const cont = page.locator('#btn-continue, button:has-text("Continue")').first();
      if (await cont.isVisible().catch(() => false)) await cont.evaluate((el) => el.click());
      await page.waitForTimeout(8000);
      out.views[name] = await measure(page, FLOOR[2]);
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
      await ctx.close();
    }
    // Phone portrait and landscape at the street-stall stage.
    for (const [name, vp] of [['phone-portrait', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }]]) {
      const { ctx, page } = await newPage(browser, vp, true, errors, name);
      await page.goto(url);
      await page.waitForTimeout(4000);
      await startNew(page);
      await page.waitForTimeout(6000);
      out.views[name] = await measure(page, FLOOR[0]);
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
      await ctx.close();
    }
  } catch (e) {
    errors.push(`grader: ${e.message}`);
  }
  await browser.close();
  srv.close();
  out.errors = errors.slice(0, 20);
  const views = Object.values(out.views);
  out.checks = {
    top_down_everywhere: views.length === 5 && views.every((v) => v.pitch >= MIN_PITCH),
    floor_visible_and_uncovered: views.length === 5 && views.every((v) => v.cover >= MIN_COVER),
    serve_loop_works: !!(out.play && out.play.loaded && out.play.served),
    save_survives_reload: !!(out.save && out.save.ok),
    no_errors: errors.length === 0,
  };
  out.score = Object.values(out.checks).filter(Boolean).length;
  out.pass = out.score === Object.keys(out.checks).length;
  fs.writeFileSync(path.join(outDir, 'grade.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ checks: out.checks, views: out.views, play: out.play, save: out.save, errors: out.errors }));
})();
