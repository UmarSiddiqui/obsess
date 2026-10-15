// The 3D Kathmandu street: Newari architecture, Himalayan backdrop, the momo stall and its people.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { ITEMS } from './config.js';

// ---- layout constants (world units; the counter front is at z = 2.1) -----
const STOVE_Z = -0.8;
const COOK_Z = -2.45;
const BACK_WALL_Z = -3.3;
const QUEUE_Z = 3.3;
const STEAM_X = (i) => -2.7 + i * 1.25;
const FRY_X = -4.1;
const QUEUE_X = (i) => -2.4 + i * 1.25;
const SERVER_HOME = [[5.9, 2.7], [6.9, 2.3], [7.8, 3.0]];
const SPAWN_X = 15.5;
const EXIT_X = 18.5;
const FRY_SLOT = 6;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerpAngle = (a, b, t) => {
  const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
};
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ---- shared geometry and material caches --------------------------------
const GEO = new Map();
function geo(key, make) {
  if (!GEO.has(key)) GEO.set(key, make());
  return GEO.get(key);
}
const gBox = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const gCyl = (rt, rb, h, seg = 20, open = false) =>
  geo(`c${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
const gSph = (r, ws = 16, hs = 12) => geo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));

const MATS = new Map();
function mat(color, o = {}) {
  const key = `${color}|${o.rough ?? 0.85}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.ei ?? 0}|${o.map ? o.map.uuid : ''}|${o.side ?? 0}|${o.flat ? 1 : 0}|${o.op ?? 1}|${o.blend ?? 0}`;
  if (!MATS.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.85,
      metalness: o.metal ?? 0,
      map: o.map || null,
      side: o.side ?? THREE.FrontSide,
      flatShading: !!o.flat,
    });
    if (o.emissive !== undefined) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.ei ?? 1;
    }
    if (o.op !== undefined && o.op < 1) {
      m.transparent = true;
      m.opacity = o.op;
      m.depthWrite = false;
    }
    MATS.set(key, m);
  }
  return MATS.get(key);
}

function box(p, w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(gBox(w, h, d), mat(color, o));
  m.position.set(x, y, z);
  m.castShadow = o.shadow ?? true;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

function cyl(p, rt, rb, h, color, x = 0, y = 0, z = 0, o = {}, seg = 20) {
  const m = new THREE.Mesh(gCyl(rt, rb, h, seg, !!o.open), mat(color, o));
  m.position.set(x, y, z);
  m.castShadow = o.shadow ?? true;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

function sph(p, r, color, x = 0, y = 0, z = 0, o = {}, sc = [1, 1, 1]) {
  const m = new THREE.Mesh(gSph(r, o.ws || 16, o.hs || 12), mat(color, o));
  m.position.set(x, y, z);
  m.scale.set(sc[0], sc[1], sc[2]);
  m.castShadow = o.shadow ?? false;
  p.add(m);
  return m;
}

function group(p, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  return g;
}

// Merge static meshes under `unit` into one mesh per material and shadow setting.
// Anything flagged userData.keep (animated, toggled or textured-at-runtime) is left alone.
function mergeBucket(items) {
  let vCount = 0;
  let iCount = 0;
  for (const { geo } of items) {
    vCount += geo.attributes.position.count;
    iCount += geo.index ? geo.index.count : geo.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  let vo = 0;
  let io = 0;
  for (const { geo, matrix } of items) {
    const P = geo.attributes.position;
    const N = geo.attributes.normal;
    const U = geo.attributes.uv;
    nm.getNormalMatrix(matrix);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(matrix);
      pos[(vo + i) * 3] = v.x;
      pos[(vo + i) * 3 + 1] = v.y;
      pos[(vo + i) * 3 + 2] = v.z;
      if (N) {
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nor[(vo + i) * 3] = n.x;
        nor[(vo + i) * 3 + 1] = n.y;
        nor[(vo + i) * 3 + 2] = n.z;
      }
      if (U) {
        uv[(vo + i) * 2] = U.getX(i);
        uv[(vo + i) * 2 + 1] = U.getY(i);
      }
    }
    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) idx[io + i] = geo.index.getX(i) + vo;
      io += geo.index.count;
    } else {
      for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
      io += P.count;
    }
    vo += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

function flattenUnit(unit, { shadow = true } = {}) {
  unit.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(unit.matrixWorld).invert();
  const buckets = new Map();
  const removed = [];
  const visit = (o) => {
    for (const ch of o.children) {
      if (ch.userData.keep) continue;
      if (ch.isMesh) {
        if (!ch.visible || ch.material.transparent) continue;
        const key = `${ch.material.uuid}|${ch.castShadow && shadow}|${ch.receiveShadow}`;
        if (!buckets.has(key)) buckets.set(key, { material: ch.material, cast: ch.castShadow && shadow, receive: ch.receiveShadow, items: [] });
        const matrix = new THREE.Matrix4().multiplyMatrices(inv, ch.matrixWorld);
        buckets.get(key).items.push({ geo: ch.geometry, matrix });
        removed.push(ch);
      } else if (ch.children.length) {
        visit(ch);
      }
    }
  };
  visit(unit);
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeBucket(b.items), b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    unit.add(mesh);
  }
  for (const m of removed) m.parent.remove(m);
  return removed.length;
}

// ---- procedural textures ------------------------------------------------
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

const brickTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#ead9b6';
  g.fillRect(0, 0, w, h);
  const bw = 64;
  const bh = 28;
  for (let row = 0; row * bh < h + bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const t = 0.82 + Math.random() * 0.25;
      g.fillStyle = `rgb(${Math.round(168 * t)},${Math.round(76 * t)},${Math.round(44 * t)})`;
      g.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
    }
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(60,20,10,0.12)' : 'rgba(255,220,180,0.08)';
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}, 1, 1);

const cobbleTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6f6356';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 7 + Math.random() * 7;
    const t = 0.7 + Math.random() * 0.5;
    g.fillStyle = `rgb(${Math.round(120 * t)},${Math.round(106 * t)},${Math.round(92 * t)})`;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.72, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(40,34,30,0.5)';
    g.lineWidth = 1.5;
    g.stroke();
  }
}, 40, 40);

const woodTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7a4a26';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,20,8' : '150,96,50'},${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * h;
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + rnd(-8, 8), w * 0.6, y + rnd(-8, 8), w, y + rnd(-4, 4));
    g.stroke();
  }
}, 2, 2);

const clothTex = canvasTex(256, 64, (g, w, h) => {
  const stripe = w / 8;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#f3e6c6' : '#a6262c';
    g.fillRect(i * stripe, 0, stripe, h);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, h - 4, w, 4);
}, 4, 1);

const plasterTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#e7d3a8';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(120,90,50,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
}, 3, 3);

const topiTex = canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#1b1a1f';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f3efe4';
  for (let y = 10; y < h; y += 12) {
    for (let x = (y / 12) % 2 ? 4 : 10; x < w; x += 14) {
      g.beginPath();
      g.moveTo(x, y - 4);
      g.lineTo(x + 4, y);
      g.lineTo(x, y + 4);
      g.lineTo(x - 4, y);
      g.fill();
    }
  }
  g.fillStyle = '#b8262c';
  g.fillRect(0, 0, w, 8);
}, 1, 1);

const eyesTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#f2ead6';
  g.fillRect(0, 0, w, h);
  for (const x of [w * 0.28, w * 0.72]) {
    g.fillStyle = '#1f5fa8';
    g.beginPath();
    g.ellipse(x, h * 0.45, 26, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(x, h * 0.45, 8, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1f5fa8';
    g.beginPath();
    g.arc(x, h * 0.45, 4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#c94a2a';
  g.fillRect(w * 0.48, h * 0.55, w * 0.04, h * 0.3);
}, 1, 1);

const glowTex = canvasTex(64, 64, (g, w, h) => {
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
});

function skyTex() {
  return canvasTex(4, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#2c5a98');
    grd.addColorStop(0.45, '#6f9bcb');
    grd.addColorStop(0.72, '#f0bd82');
    grd.addColorStop(1, '#ffc98f');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

// Chalk-style board that shows the menu and live prices.
function makeBoard() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 340;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { cv, tex };
}

// Painted sign with the shop name.
function makeSign() {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 220;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { cv, tex };
}

// ---- architecture helpers ------------------------------------------------
// Square pyramid frustum with flat faces (CylinderGeometry with 4 sides, turned 45 degrees).
function pyramidRoof(p, x, y, z, halfBase, halfTop, h, color, o = {}) {
  const g = new THREE.CylinderGeometry(halfTop * Math.SQRT2, halfBase * Math.SQRT2, h, 4, 1, false);
  g.rotateY(Math.PI / 4);
  // Group 0 is the sloped sides, group 2 the underside of the eave, which is seen from the street.
  // Give the underside a warm timber colour so it doesn't read as a black hole.
  const roofMat = mat(color, { rough: 0.7, ...o });
  const underMat = mat(0x7a4a2a, { rough: 0.9 });
  const m = new THREE.Mesh(g, [roofMat, roofMat, underMat]);
  m.userData.keep = true; // multi-material meshes are not merged
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  p.add(m);
  // dark eave lip under the roof edge
  const lip = new THREE.Mesh(
    (() => {
      const lg = new THREE.CylinderGeometry((halfBase + 0.08) * Math.SQRT2, (halfBase + 0.02) * Math.SQRT2, 0.14, 4, 1, false);
      lg.rotateY(Math.PI / 4);
      return lg;
    })(),
    mat(0x3c2014, { rough: 0.8 }),
  );
  lip.position.set(x, y - h / 2 + 0.07, z);
  p.add(lip);
  return m;
}

// Carved Newari lattice window facing +z. Interior glow, painted lintel.
function carvedWindow(p, x, y, z, w = 1.1, h = 1.4) {
  const g = group(p, x, y, z);
  box(g, w + 0.16, 0.12, 0.14, 0x6b2b1f, 0, h / 2 + 0.2, 0.02); // lintel (painted red)
  box(g, w + 0.3, 0.1, 0.22, 0x3e2110, 0, h / 2 + 0.08, 0.08); // carved sill
  box(g, w + 0.14, h + 0.12, 0.08, 0x5a2e18, 0, 0, -0.02, { shadow: false }); // frame back
  box(g, w, h, 0.02, 0x2c160b, 0, 0, 0.04, { shadow: false, emissive: 0xff9a40, ei: 0.35 }); // glowing interior
  for (let i = 0; i <= 3; i++) {
    box(g, 0.07, h, 0.08, 0x5a2e18, -w / 2 + (i * w) / 3, 0, 0.08);
  }
  for (let j = 0; j <= 2; j++) {
    box(g, w, 0.07, 0.08, 0x5a2e18, 0, -h / 2 + (j * h) / 2, 0.08);
  }
  for (const sx of [-1, 1]) box(g, 0.12, h + 0.12, 0.14, 0x3e2110, sx * (w / 2 + 0.04), 0, 0.06);
  return g;
}

// Projecting wooden balcony with carved brackets.
function balcony(p, x, y, z, w) {
  const g = group(p, x, y, z);
  box(g, w, 0.12, 0.7, 0x5a2e18, 0, 0, 0.35);
  for (let i = 0; i <= 6; i++) {
    box(g, 0.05, 0.6, 0.05, 0x3e2110, -w / 2 + (i * w) / 6, 0.34, 0.68);
  }
  box(g, w, 0.07, 0.07, 0x3e2110, 0, 0.66, 0.68);
  for (const sx of [-1, 1]) {
    const br = box(g, 0.1, 0.5, 0.1, 0x3e2110, sx * (w / 2 - 0.3), -0.25, 0.25);
    br.rotation.x = -0.6;
  }
  return g;
}

// Brick Newari house with lattice windows, balconies and a tiered tile roof.
function house(p, { x, z, w, floors, d = 6, color = 0xffffff, tiers = 1 }) {
  const g = group(p, x, 0, z);
  const floorH = 3.2;
  const H = floors * floorH;
  const wallMat = brickTex.clone();
  wallMat.repeat.set(w / 2.6, H / 2.4);
  wallMat.needsUpdate = true;
  box(g, w, H, d, 0xffffff, 0, H / 2, 0, { map: wallMat, rough: 0.95 });
  // whitewashed plinth and floor bands
  box(g, w + 0.1, 0.6, d + 0.05, 0xd8c7a4, 0, 0.3, 0.02, { rough: 0.9 });
  for (let f = 1; f < floors; f++) box(g, w + 0.12, 0.22, d + 0.08, 0xe8d8b4, 0, f * floorH, 0.02);
  // windows and balconies on the front face
  const cols = Math.max(2, Math.floor(w / 2.6));
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const cx = -w / 2 + ((c + 0.5) * w) / cols;
      const isDoor = f === 0 && c === Math.floor(cols / 2);
      if (isDoor) {
        box(g, 1.5, 2.3, 0.1, 0x2a160b, cx, 1.15, d / 2 + 0.03);
        carvedWindow(g, cx, 2.35, d / 2 + 0.04, 1.3, 0.5);
      } else {
        carvedWindow(g, cx, f * floorH + 1.8, d / 2 + 0.04, 1.0, 1.3);
      }
    }
    if (f > 0 && f % 2 === 1) balcony(g, 0, f * floorH + 0.6, d / 2, Math.min(w * 0.7, 6));
  }
  // timber cornice and tiered roof
  box(g, w + 0.5, 0.25, d + 0.5, 0x5a2e18, 0, H + 0.12, 0.05);
  let y = H + 0.25;
  let halfB = w / 2 + 0.9;
  for (let t = 0; t < tiers; t++) {
    pyramidRoof(g, 0, y + 0.7, 0.05, halfB, halfB - 0.9, 1.4, color, { map: null });
    y += 1.35;
    halfB = halfB * 0.82;
  }
  return g;
}

// Three-tier pagoda used for the temple, the restaurant and the far skyline.
function pagoda(p, { x, z, s = 1, tiers = 3, wall = 0xa0281c, roof = 0x8e3a23, gold = true }) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  let y = 0;
  let w = 8;
  box(g, w + 2, 0.9, w + 2, 0x9c8f7c, 0, 0.45, 0, { rough: 0.95 });
  y = 0.9;
  for (let t = 0; t < tiers; t++) {
    const h = 3.0 - t * 0.35;
    box(g, w, h, w, wall, 0, y + h / 2, 0, { rough: 0.6 });
    // gold-stripe trim on each tier
    box(g, w + 0.2, 0.18, w + 0.2, 0xc99a34, 0, y + 0.2, 0, { metal: 0.3, rough: 0.5 });
    // carved door + windows on front face
    box(g, 2.0, 2.2, 0.1, 0x2a160b, 0, y + 1.1, w / 2 + 0.03);
    for (const sx of [-2.6, 2.6]) carvedWindow(g, sx, y + h / 2, w / 2 + 0.03, 1.0, 1.2);
    y += h;
    pyramidRoof(g, 0, y + 0.8, 0, w / 2 + 1.6, w / 2 + 0.2, 1.6, roof);
    y += 1.6;
    w *= 0.72;
    if (t < tiers - 1) y += 0.2;
  }
  if (gold) {
    cyl(g, 0.1, 0.1, 2.4, 0xd9a540, 0, y + 1.2, 0, { metal: 0.7, rough: 0.3 });
    for (let r = 0; r < 4; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 - r * 0.07, 0.05, 6, 14), mat(0xd9a540, { metal: 0.7, rough: 0.3 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y + 0.3 + r * 0.35;
      g.add(ring);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), mat(0xe6b452, { metal: 0.8, rough: 0.25 }));
    tip.position.y = y + 2.0;
    g.add(tip);
  }
  return g;
}

// Boudhanath-style stupa with painted eyes and a gilded spire.
function stupa(p, { x, z, s = 1 }) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  cyl(g, 6.4, 6.6, 0.8, 0xf1ece0, 0, 0.4, 0);
  cyl(g, 5.2, 5.4, 0.8, 0xf3efe5, 0, 1.2, 0);
  cyl(g, 4.2, 4.4, 0.8, 0xf1ece0, 0, 2.0, 0);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0xf6f2e8, { rough: 0.7 }),
  );
  dome.scale.set(1, 0.95, 1);
  dome.position.y = 2.4;
  dome.castShadow = true;
  g.add(dome);
  cyl(g, 1.6, 1.6, 1.0, 0xf6f2e8, 0, 6.0, 0);
  const eyes = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), mat(0xffffff, { map: eyesTex, rough: 0.6 }));
  eyes.position.set(0, 6.0, 1.62);
  g.add(eyes);
  const eyes2 = eyes.clone();
  eyes2.rotation.y = Math.PI;
  eyes2.position.z = -1.62;
  g.add(eyes2);
  const eyes3 = eyes.clone();
  eyes3.rotation.y = Math.PI / 2;
  eyes3.position.set(1.62, 6.0, 0);
  g.add(eyes3);
  const eyes4 = eyes.clone();
  eyes4.rotation.y = -Math.PI / 2;
  eyes4.position.set(-1.62, 6.0, 0);
  g.add(eyes4);
  box(g, 1.6, 0.7, 1.6, 0xd9a540, 0, 6.9, 0, { metal: 0.6, rough: 0.35 });
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.05, 0.05, 6, 14), mat(0xd9a540, { metal: 0.7, rough: 0.3 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 7.4 + i * 0.3;
    g.add(ring);
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 10), mat(0xe6b452, { metal: 0.8, rough: 0.25 }));
  spire.position.y = 9.6;
  g.add(spire);
  return g;
}

// Ragged Himalayan peaks. Vertices are jittered deterministically so shared seams stay closed.
const jitterCache = new Map();
function jit(x, y, z, amt) {
  const k = `${Math.round(x * 50)},${Math.round(y * 50)},${Math.round(z * 50)}`;
  if (!jitterCache.has(k)) jitterCache.set(k, [rnd(-amt, amt), rnd(-amt * 0.3, amt * 0.3), rnd(-amt, amt)]);
  return jitterCache.get(k);
}
function peak(r, h, seg, color, flat = true) {
  const g = new THREE.ConeGeometry(r, h, seg, 5, false);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > h / 2 - 0.01) continue;
    const [dx, dy, dz] = jit(x, y, z, r * 0.12);
    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat(color, { rough: 0.95, flat }));
}

// ---- the world ------------------------------------------------------------
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // cap the pixel ratio: fill rate is the main cost on phones
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = skyTex();
    this.scene.fog = new THREE.Fog(0xf2c894, 46, 190);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    this.pan = 0;
    this.zoom = 1;
    this.inset = 0;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();

    this.people = new Map();
    this.flags = [];
    this.sparks = [];
    this.sparkCursor = 0;
    this.levelGroups = [];
    this.growing = new Set();
    this.slotVis = [];
    this.cooks = [];
    this.servers = [];
    this.lanternDecor = [];
    this.garlandDecor = null;
    this.flagDecor = null;
    this.time = 0;
    this.dog = null;
    this.level = 0;

    this.buildLights();
    this.buildBackdrop();
    this.buildStreet();
    this.buildStall();
    this.buildShop();
    this.buildRestaurant();
    this.flattenStatic();
    this.buildSlots();
    this.buildStaff();
    this.buildFx();

    this.resize();
    this.camera.position.set(1, 3.4, 12);
    this.camera.lookAt(1, 1.9, 0.3);
  }

  // ---- setup -------------------------------------------------------------
  buildLights() {
    const hemi = new THREE.HemisphereLight(0xdde9ff, 0x9a6a40, 1.45);
    this.scene.add(hemi);

    // low golden sun from the front-left; the canopy shadow stays soft
    const sun = new THREE.DirectionalLight(0xffd29a, 2.1);
    sun.position.set(-14, 11, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -10;
    sc.right = 10;
    sc.top = 8;
    sc.bottom = -6;
    sc.near = 1;
    sc.far = 70;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.04;
    sun.target.position.set(0, 0, 0);
    this.scene.add(sun, sun.target);

    // warm bounce from the street side keeps the counter readable
    const fill = new THREE.DirectionalLight(0xffc896, 0.7);
    fill.position.set(12, 6, 18);
    this.scene.add(fill);

    this.fireLight = new THREE.PointLight(0xff8a2a, 3.2, 9, 2);
    this.fireLight.position.set(-0.5, 1.9, 0.2);
    this.scene.add(this.fireLight);

    this.warmLight = new THREE.PointLight(0xffb56a, 2.2, 14, 2);
    this.warmLight.position.set(0, 4.2, 4.5);
    this.scene.add(this.warmLight);
  }

  buildBackdrop() {
    const layers = [
      { z: -190, span: 320, n: 18, h: [70, 105], r: [36, 52], col: 0xe0cfe0, snow: 0xfff6fa },
      { z: -150, span: 280, n: 16, h: [55, 80], r: [30, 44], col: 0xb7a2c6, snow: 0xf8f0f6 },
      { z: -110, span: 230, n: 14, h: [36, 56], r: [22, 34], col: 0x8c9bc0, snow: 0xf0f3fa },
      { z: -80, span: 190, n: 12, h: [22, 36], r: [16, 26], col: 0x6b7f9e, snow: 0xe9eef6 },
      { z: -62, span: 170, n: 14, h: [10, 18], r: [12, 20], col: 0x4f6a58, snow: null },
    ];
    for (const L of layers) {
      const g = group(this.scene, 0, 0, L.z);
      for (let i = 0; i < L.n; i++) {
        const x = -L.span / 2 + ((i + rnd(0.1, 0.9)) * L.span) / L.n;
        const h = rnd(L.h[0], L.h[1]);
        const r = rnd(L.r[0], L.r[1]);
        const m = peak(r, h, 7, L.col);
        m.position.set(x, h / 2 - 1.5, rnd(-6, 6));
        g.add(m);
        if (L.snow) {
          const s = peak(r * 0.42, h * 0.42, 7, L.snow);
          s.position.set(x, h * 0.79 - 1.5, m.position.z);
          s.rotation.y = rnd(0, 1);
          g.add(s);
        }
      }
    }
    // low sun glow behind the peaks
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sunGlow.position.set(-60, 22, -170);
    sunGlow.scale.set(140, 140, 1);
    this.scene.add(sunGlow);
  }

  buildStreet() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), mat(0xffffff, { map: cobbleTex, rough: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Newari row behind the lane
    house(this.scene, { x: -28, z: -13, w: 9, floors: 2, color: 0xa6402b, tiers: 2 });
    house(this.scene, { x: -18, z: -12, w: 9, floors: 3, color: 0x8e3a23, tiers: 2 });
    house(this.scene, { x: -7.5, z: -12, w: 6.5, floors: 2, color: 0x8e3a23, tiers: 1 });
    this.centerHouse = house(this.scene, { x: 0.2, z: -12, w: 9, floors: 2, color: 0x8e3a23, tiers: 2 });
    house(this.scene, { x: 8.5, z: -12, w: 7, floors: 3, color: 0xa6402b, tiers: 2 });
    house(this.scene, { x: 18, z: -13, w: 9, floors: 2, color: 0x8e3a23, tiers: 2 });
    house(this.scene, { x: 29, z: -13, w: 9, floors: 3, color: 0xa6402b, tiers: 2 });

    this.temple = pagoda(this.scene, { x: -42, z: -46, s: 1.7, tiers: 3 });
    this.stupa = stupa(this.scene, { x: 42, z: -52, s: 1.5 });

    // base prayer flag line strung between the rooftops
    this.flagLine(new THREE.Vector3(-22, 9.2, -6.8), new THREE.Vector3(22, 9.2, -6.8), 1.6, 22, this.scene);
    this.flagLine(new THREE.Vector3(-14, 6.5, -2.4), new THREE.Vector3(-7.4, 7.7, -2.4), 0.3, 4, this.scene);
    // decor-only extra line, shown after purchase
    this.flagDecor = group(this.scene);
    this.flagDecor.userData.keep = true;
    this.flagLine(new THREE.Vector3(-14, 9.8, -4.5), new THREE.Vector3(14, 9.8, -4.5), 2.2, 20, this.flagDecor);
    this.flagDecor.visible = false;
  }

  flagLine(a, b, sag, n, parent) {
    const pts = [];
    const at = (t) => new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t) - sag * 4 * t * (1 - t), lerp(a.z, b.z, t));
    for (let i = 0; i <= 40; i++) pts.push(at(i / 40));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2b1a10 }));
    parent.add(line);
    const colors = [0x2f6fd1, 0xf5f5ef, 0xc8102e, 0x1f8a4c, 0xf2c230];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const fw = 0.62;
      const fh = 0.5;
      const geom = new THREE.PlaneGeometry(fw, fh, 8, 3);
      geom.translate(fw / 2, -fh / 2, 0);
      const m = new THREE.Mesh(geom, mat(colors[i % colors.length], { rough: 0.9, side: THREE.DoubleSide }));
      const p = at(t);
      m.position.set(p.x, p.y, p.z + 0.02);
      m.castShadow = true;
      m.userData.keep = true; // animated every frame
      parent.add(m);
      this.flags.push({ geo: geom, base: geom.attributes.position.array.slice(), phase: i * 0.7 + Math.random() * 2, fw });
    }
    return line;
  }

  buildStall() {
    const g = (this.levelGroups[0] = group(this.scene));
    g.userData.level = 1;

    // whitewashed back wall with a brick plinth
    box(g, 12.4, 3.9, 0.14, 0xffffff, 0.2, 1.95, BACK_WALL_Z, { map: plasterTex, rough: 0.95 });
    box(g, 12.4, 0.9, 0.2, 0xffffff, 0.2, 0.45, BACK_WALL_Z + 0.06, { map: brickTex.clone(), rough: 0.9 });
    // painted wood trim
    box(g, 12.6, 0.18, 0.22, 0x8e2420, 0.2, 3.9, BACK_WALL_Z + 0.08);

    // counter table
    box(g, 10.9, 0.1, 3.8, 0x9a5c2c, 0.2, 1.0, 0.2, { map: woodTex, rough: 0.6 });
    box(g, 10.9, 0.94, 0.1, 0x6b3a1e, 0.2, 0.5, 2.1, { map: woodTex });
    box(g, 10.9, 0.1, 0.16, 0x8e2420, 0.2, 0.92, 2.14);
    for (let i = 0; i < 12; i++) box(g, 0.08, 0.08, 0.04, 0xd9a540, -5.1 + i * 0.85, 0.92, 2.2, { metal: 0.6, rough: 0.4 });

    // back chulo stove rows are per-slot (see buildSlots); shelving above the counter
    box(g, 11.2, 0.12, 0.6, 0x6b3a1e, 0.2, 3.02, -1.9, { map: woodTex });
    for (let i = 0; i < 9; i++) {
      cyl(g, 0.3, 0.26, 0.36, i % 3 ? 0xb8b3a6 : 0xd7d2c4, -4.6 + i * 1.15, 3.28, -1.9, { metal: 0.4, rough: 0.35 });
    }

    // canopy: bamboo poles and a striped tarp, valance with scallops
    for (const px of [-6.0, 6.4]) {
      for (const pz of [-2.0, 2.5]) cyl(g, 0.08, 0.08, 3.6, 0xb88a4b, px, 1.8, pz, { rough: 0.6 }, 10);
    }
    box(g, 12.9, 0.08, 5.2, 0xffffff, 0.2, 3.66, 0.3, { map: clothTex, rough: 0.8 });
    box(g, 12.9, 0.78, 0.06, 0xffffff, 0.2, 3.25, 2.86, { map: clothTex, rough: 0.8 });
    for (let i = 0; i < 26; i++) {
      const sx = -6.0 + i * 0.5;
      cyl(g, 0.22, 0.22, 0.06, i % 2 ? 0xa6262c : 0xf3e6c6, sx + 0.2, 2.82, 2.9, { rough: 0.8 }, 10).rotation.x = Math.PI / 2;
    }

    // sign board above the valance
    const sign = makeSign();
    this.sign = sign;
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.0), mat(0xffffff, { map: sign.tex, rough: 0.7 }));
    signMesh.position.set(0.2, 4.1, 2.98); // just in front of the wooden board
    signMesh.castShadow = true;
    signMesh.userData.keep = true; // redrawn when the shop levels up
    g.add(signMesh);
    box(g, 4.9, 1.2, 0.12, 0x6b3a1e, 0.2, 4.1, 2.9, { map: woodTex });

    // menu board on a post at the left end
    cyl(g, 0.06, 0.06, 2.6, 0x3e2110, -6.8, 1.3, 1.2, {}, 8);
    const board = makeBoard();
    this.board = board;
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), mat(0xffffff, { map: board.tex, rough: 0.7 }));
    boardMesh.position.set(-6.8, 2.3, 1.22);
    boardMesh.rotation.y = -0.15;
    boardMesh.userData.keep = true; // redrawn when prices change
    g.add(boardMesh);
    box(g, 2.7, 1.9, 0.08, 0x6b3a1e, -6.8, 2.3, 1.18, { map: woodTex });

    // cash box, a steel tub of dough and a chopping board
    box(g, 0.9, 0.4, 0.6, 0x7a2a1c, 4.7, 1.25, 1.4, { rough: 0.5 });
    box(g, 0.8, 0.06, 0.5, 0xc7b38a, 4.7, 1.47, 1.4, { rough: 0.5 });
    cyl(g, 0.45, 0.4, 0.42, 0xb9bec6, -4.9, 1.25, 1.5, { metal: 0.6, rough: 0.35 }, 18);
    sph(g, 0.4, 0xf0e8d6, -4.9, 1.49, 1.5, { rough: 0.9 }, [1, 0.3, 1]);
    cyl(g, 0.7, 0.7, 0.05, 0xd8b98a, 2.8, 1.12, 1.6, { rough: 0.7 }, 24);

    // lanterns hung from the valance
    for (const lx of [-3.4, 3.8]) this.addLantern(g, lx, 2.85, 2.7);

    // garland decor
    this.garlandDecor = group(g);
    this.garlandDecor.userData.keep = true;
    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      const x = lerp(-6.2, 6.6, t);
      const y = 3.1 - Math.sin(t * Math.PI) * 0.35;
      sph(this.garlandDecor, 0.12, i % 2 ? 0xff9a1a : 0xffc12e, x, y, 3.02, { rough: 0.6 });
    }
    this.garlandDecor.visible = false;

    // a sleepy street dog
    this.dog = this.buildDog(g, -7.6, 0, 2.7);
    this.dog.userData.keep = true; // wagging tail

    // lantern decor (extra lanterns)
    this.lanternDecor = group(g);
    this.lanternDecor.userData.keep = true;
    for (const lx of [-6.3, 0.2, 6.2]) this.addLantern(this.lanternDecor, lx, 2.85, 2.7);
    this.lanternDecor.visible = false;
  }

  addLantern(p, x, y, z) {
    const g = group(p, x, y, z);
    cyl(g, 0.02, 0.02, 0.5, 0x2b1a10, 0, 0.25, 0, {}, 4);
    const body = sph(g, 0.24, 0xc81e1e, 0, -0.05, 0, { emissive: 0xff3a1a, ei: 0.55, rough: 0.5 }, [1, 1.25, 1]);
    body.castShadow = false;
    cyl(g, 0.12, 0.12, 0.06, 0xd9a540, 0, 0.22, 0, { metal: 0.6, rough: 0.3 }, 10);
    cyl(g, 0.12, 0.12, 0.06, 0xd9a540, 0, -0.36, 0, { metal: 0.6, rough: 0.3 }, 10);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
    halo.scale.set(1.3, 1.3, 1);
    g.add(halo);
    return g;
  }

  buildDog(p, x, y, z) {
    const g = group(p, x, y, z);
    const fur = 0x9b6b3c;
    box(g, 0.9, 0.42, 0.5, fur, 0, 0.3, 0);
    box(g, 0.42, 0.42, 0.4, fur, 0.42, 0.62, 0.02);
    box(g, 0.2, 0.2, 0.22, 0x3a2414, 0.66, 0.62, 0.04);
    box(g, 0.12, 0.2, 0.08, 0x5a3a1e, 0.34, 0.86, -0.08);
    box(g, 0.12, 0.2, 0.08, 0x5a3a1e, 0.34, 0.86, 0.12);
    const tail = group(g, -0.45, 0.45, 0);
    box(tail, 0.4, 0.1, 0.1, fur, -0.2, 0.1, 0).rotation.z = 0.5;
    for (const lz of [-0.18, 0.18]) box(g, 0.14, 0.3, 0.14, fur, 0.3, 0.08, lz);
    g.userData.tail = tail;
    return g;
  }

  buildShop() {
    const g = (this.levelGroups[1] = group(this.scene));
    g.userData.level = 2;
    // lacquered red posts with gilded capitals
    // tall lacquered posts hold a tiered roof above the shop front, seen against the sky
    for (const px of [-6.5, 6.9]) {
      for (const pz of [2.6, -2.2]) {
        cyl(g, 0.16, 0.2, 6.1, 0x8e2420, px, 3.05, pz, { rough: 0.5 }, 12);
        box(g, 0.5, 0.2, 0.5, 0xd9a540, px, 6.1, pz, { metal: 0.5, rough: 0.35 });
        box(g, 0.5, 0.2, 0.5, 0xd9a540, px, 0.12, pz, { metal: 0.5, rough: 0.35 });
      }
    }
    pyramidRoof(g, 0.2, 6.75, 0.3, 7.3, 6.0, 1.3, 0x8e3a23);
    pyramidRoof(g, 0.2, 8.0, 0.3, 5.4, 4.5, 1.1, 0xa6402b);
    cyl(g, 0.08, 0.08, 1.4, 0xd9a540, 0.2, 9.1, 0.3, { metal: 0.7, rough: 0.3 }, 8);
    // carved lattice windows on the back wall
    for (const wx of [-4.2, 4.6]) carvedWindow(g, wx, 3.4, -2.25, 1.6, 1.0);
    // wooden shelf with clay pots of masala
    box(g, 11, 0.12, 0.6, 0x6b3a1e, 0.2, 2.7, -1.8, { map: woodTex });
    for (let i = 0; i < 7; i++) cyl(g, 0.2, 0.28, 0.46, 0xa84b28, -4.4 + i * 1.3, 3.0, -1.8, { rough: 0.8 }, 12);
    // chilli strings
    for (let i = 0; i < 6; i++) {
      cyl(g, 0.04, 0.05, 0.32, 0xc0231b, -5.2 + i * 0.4, 3.12, -2.25, { rough: 0.5 }, 6);
    }
    // stacked momo baskets to the side
    for (let i = 0; i < 3; i++) cyl(g, 0.7, 0.66, 0.3, 0xc89a5a, 6.0, 0.4 + i * 0.3, 0.6, { rough: 0.8 }, 16);
    return g;
  }

  buildRestaurant() {
    const g = (this.levelGroups[2] = group(this.scene));
    g.userData.level = 3;
    // grand three-storey pagoda restaurant replaces the small centre house
    this.bigHouse = pagoda(g, { x: 0.2, z: -12.4, s: 1.25, tiers: 3, wall: 0xc2502f, roof: 0x7d3420 });
    // dining tables on the left and right
    this.table(g, -8.6, 4.4);
    this.table(g, -11.6, 5.8);
    this.table(g, -8.4, 7.4);
    this.table(g, 9.0, 6.6);
    this.table(g, 12.2, 5.0);
    // lanterns over the seating
    for (const lx of [-9.5, -4.2, 9.5]) this.addLantern(g, lx, 4.6, 4.5);
    // upper balcony rail
    box(g, 11.8, 0.1, 0.8, 0x6b3a1e, 0.2, 5.0, 2.7, { map: woodTex });
    for (let i = 0; i < 14; i++) box(g, 0.06, 0.8, 0.06, 0x3e2110, -5.4 + i * 0.85, 5.4, 3.0);
    g.visible = false;
    return g;
  }

  table(p, x, z) {
    const g = group(p, x, 0, z);
    cyl(g, 0.9, 0.9, 0.08, 0x8e5a2e, 0, 0.92, 0, { map: woodTex, rough: 0.6 }, 20);
    cyl(g, 0.1, 0.12, 0.9, 0x3e2110, 0, 0.46, 0, {}, 8);
    for (const dz of [-1.05, 1.05]) {
      box(g, 1.8, 0.1, 0.42, 0x6b3a1e, 0, 0.5, dz, { map: woodTex });
      box(g, 0.12, 0.5, 0.36, 0x3e2110, -0.7, 0.25, dz);
      box(g, 0.12, 0.5, 0.36, 0x3e2110, 0.7, 0.25, dz);
    }
    for (const [px, pz] of [[-0.35, -0.2], [0.35, 0.2]]) {
      cyl(g, 0.28, 0.24, 0.06, 0xfbf7ee, px, 0.98, pz, { rough: 0.4 }, 14);
      for (let i = 0; i < 3; i++) sph(g, 0.08, 0xf4e6c8, px + Math.cos(i * 2) * 0.1, 1.06, pz + Math.sin(i * 2) * 0.1, { rough: 0.7 }, [1, 0.7, 1]);
    }
    return g;
  }

  // Collapse the static geometry into a handful of draw calls. Level groups and the
  // centre house toggle as whole units, so they stay separate groups.
  flattenStatic() {
    for (const g of this.levelGroups) g.userData.keep = true;
    if (this.centerHouse) {
      flattenUnit(this.centerHouse, { shadow: false });
      this.centerHouse.userData.keep = true;
    }
    flattenUnit(this.scene, { shadow: false });
    for (const g of this.levelGroups) flattenUnit(g, { shadow: true });
    for (const g of this.levelGroups) g.userData.keep = false;
  }

  // Steamers and wok, placed up to the maximum; visibility driven by state each frame.
  buildSlots() {
    for (let i = 0; i < 7; i++) {
      const isFry = i === FRY_SLOT;
      const x = isFry ? FRY_X : STEAM_X(i);
      const root = group(this.scene, x, 0, STOVE_Z);
      root.visible = false;
      // brick chulo firebox
      cyl(root, 0.55, 0.6, 0.46, 0xffffff, 0, 1.28, 0, { map: brickTex.clone(), rough: 0.95 }, 18);
      const firebox = box(root, 0.5, 0.26, 0.06, 0x2a1408, 0, 1.1, 0.56, { emissive: 0xff7a1a, ei: 0.9, shadow: false });
      const v = { root, x, isFry, firebox, active: false, wasCooking: false, lastItem: 'steam', pieces: [], pieceMat: null, bar: null };
      if (isFry) {
        // iron wok, dome down so the open face points up
        const wok = new THREE.Mesh(new THREE.SphereGeometry(0.66, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x3a3a40, { metal: 0.7, rough: 0.4, side: THREE.DoubleSide }));
        wok.position.y = 2.1;
        wok.castShadow = true;
        root.add(wok);
        v.oil = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), mat(0xd9832a, { emissive: 0xff8a2a, ei: 0.4, rough: 0.3 }));
        v.oil.rotation.x = -Math.PI / 2;
        v.oil.position.y = 2.02;
        root.add(v.oil);
        v.pieceY = 2.1;
        v.radius = 0.36;
      } else {
        cyl(root, 0.46, 0.4, 0.22, 0x5b5f66, 0, 1.58, 0, { metal: 0.6, rough: 0.4 }, 20);
        // three stacked bamboo baskets
        for (let b = 0; b < 3; b++) {
          const y = 1.85 + b * 0.3;
          cyl(root, 0.52, 0.5, 0.3, 0xc89a5a, 0, y, 0, { open: true, rough: 0.8, side: THREE.DoubleSide }, 20);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.515, 0.03, 6, 22), mat(0x7a4c24, { rough: 0.8 }));
          rim.rotation.x = Math.PI / 2;
          rim.position.y = y + 0.15;
          root.add(rim);
        }
        v.pieceY = 2.52;
        v.radius = 0.34;
      }
      // momo pieces that sit in the batch
      v.pieceMat = new THREE.MeshStandardMaterial({ color: 0xf4e9d2, roughness: 0.6 });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const pc = new THREE.Mesh(gSph(0.14, 12, 8), v.pieceMat);
        pc.scale.set(1, 0.7, 1);
        pc.position.set(Math.cos(a) * v.radius, v.pieceY, Math.sin(a) * v.radius);
        pc.castShadow = true;
        pc.visible = false;
        root.add(pc);
        v.pieces.push(pc);
      }
      // progress bar above the basket
      const barBack = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.13), mat(0x1d1410, { op: 0.8 }));
      barBack.position.set(0, 3.15, 0.5);
      root.add(barBack);
      const barGeo = new THREE.PlaneGeometry(1.0, 0.13);
      barGeo.translate(0.5, 0, 0);
      v.bar = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0xffc247 }));
      v.bar.position.set(-0.5, 3.15, 0.51);
      v.bar.visible = false;
      root.add(v.bar);
      // gold ring marks an idle slot you can tap
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 6, 30), mat(0xffd36b, { emissive: 0xffc247, ei: 1, rough: 0.4 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.07;
      root.add(ring);
      v.marker = ring;
      // invisible hit area for taps
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.set(0, 1.6, 0);
      hit.userData.slot = i;
      root.add(hit);
      v.hit = hit;
      this.slotVis.push(v);
    }
  }

  buildStaff() {
    for (let k = 0; k < 3; k++) {
      const cook = makePerson({ kind: 'cook', shirt: 0xf1eee6, pants: 0x2b2b33, hat: 'topi', hair: 0x141010, skin: 0x8d5524, apron: 0xb3261e, scale: 1 });
      cook.root.position.set(STEAM_X(k), 0, COOK_Z);
      cook.root.visible = false;
      cook.armMode = 'manual';
      this.scene.add(cook.root);
      cook.home = STEAM_X(k);
      cook.shown = false;
      this.cooks.push(cook);
      const [sx, sz] = SERVER_HOME[k];
      const srv = makePerson({ kind: 'server', shirt: 0x7a1d24, pants: 0x1c1c22, hat: 'none', hair: 0x1a1210, skin: 0xc68642, apron: 0x221a14, scale: 1 });
      srv.root.position.set(sx, 0, sz);
      srv.root.visible = false;
      srv.idleFace = -2.0;
      srv.root.rotation.y = srv.idleFace;
      this.scene.add(srv.root);
      srv.home = [sx, sz];
      srv.shown = false;
      srv.trip = null;
      this.servers.push(srv);
    }
  }

  buildFx() {
    const sprites = [];
    for (let i = 0; i < 140; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      this.scene.add(s);
      sprites.push({ s, life: 0, max: 1, v: new THREE.Vector3(), grow: 0, base: 0.4 });
    }
    this.sparks = sprites;
    // drifting dust motes in the warm light
    const n = 180;
    const pos = new Float32Array(n * 3);
    this.dustBase = [];
    for (let i = 0; i < n; i++) {
      const bx = rnd(-10, 10);
      const by = rnd(0.6, 6);
      const bz = rnd(-1, 6);
      this.dustBase.push([bx, by, bz, rnd(0, 6.28)]);
      pos[i * 3] = bx;
      pos[i * 3 + 1] = by;
      pos[i * 3 + 2] = bz;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
  }

  // ---- level and decor ---------------------------------------------------
  setLevel(level, instant = false) {
    if (level === this.level && !instant) return;
    this.level = level;
    this.levelGroups.forEach((g, i) => {
      const want = i + 1 <= level;
      if (want && !g.visible) {
        g.visible = true;
        if (instant) g.scale.setScalar(1);
        else this.grow(g);
      } else if (!want) {
        g.visible = false;
      }
    });
    // the centre house gives way to the restaurant
    if (this.centerHouse) this.centerHouse.visible = level < 3;
    if (this.sign) this.drawSign(level);
  }

  drawSign(level) {
    const { cv, tex } = this.sign;
    const g = cv.getContext('2d');
    const names = ['MOMO', 'MOMO HOUSE', 'MOMO HOUSE'];
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#f3e2bb';
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = '#8e2420';
    g.lineWidth = 16;
    g.strokeRect(14, 14, cv.width - 28, cv.height - 28);
    g.fillStyle = '#a6262c';
    g.font = '700 124px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(names[level - 1], cv.width / 2, 96);
    g.fillStyle = '#d9a540';
    g.fillRect(70, 152, cv.width - 140, 6);
    g.fillStyle = '#7a2a1c';
    g.font = '600 34px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
    g.fillText(level === 3 ? 'KATHMANDU  ·  RESTAURANT' : 'KATHMANDU  ·  STREET FOOD', cv.width / 2, 186);
    tex.needsUpdate = true;
  }

  setDecor(decor) {
    this.flagDecor.visible = !!decor.flags;
    this.garlandDecor.visible = !!decor.garland;
    this.lanternDecor.visible = !!decor.lanterns;
  }

  refreshBoard(s) {
    const { cv, tex } = this.board;
    const g = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    g.fillStyle = '#e9d9b1';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#213a2c';
    g.fillRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#f5ecd6';
    g.textBaseline = 'middle';
    g.font = '700 52px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('MENU', W / 2, 58);
    g.font = '600 32px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
    let y = 130;
    for (const k of Object.keys(ITEMS)) {
      const it = ITEMS[k];
      const owned = s.unlocked[k];
      g.textAlign = 'left';
      g.fillStyle = owned ? '#f5ecd6' : 'rgba(245,236,214,0.4)';
      g.fillText(it.name, 46, y);
      g.textAlign = 'right';
      const price = Math.round((it.plate * (1 + 0.12 * s.upg.masala)));
      g.fillText(owned ? `Rs ${price}` : 'LOCKED', W - 46, y);
      g.fillStyle = owned ? it.color : 'rgba(0,0,0,0)';
      if (owned) {
        g.beginPath();
        g.arc(30, y, 7, 0, Math.PI * 2);
        g.fill();
      }
      y += 58;
    }
    tex.needsUpdate = true;
  }

  grow(obj) {
    this.growing.add(obj);
    obj.userData.gt = 0;
    obj.scale.setScalar(0.001);
  }

  // ---- customers ---------------------------------------------------------
  spawnPerson(c) {
    const spec = randomSpec();
    const p = makePerson(spec);
    p.root.userData.customerId = c.id;
    p.x = SPAWN_X;
    p.z = QUEUE_Z + rnd(-0.2, 0.2);
    p.face = -Math.PI / 2;
    p.phase = Math.random() * 6;
    p.jx = (c.seed - 0.5) * 0.3;
    p.jz = (((c.seed * 7.13) % 1) - 0.5) * 0.5;
    p.root.rotation.y = p.face;
    p.root.position.set(p.x, 0, p.z);
    p.spec = spec;
    this.scene.add(p.root);
    this.people.set(c.id, p);
    return p;
  }

  syncCustomers(game, dt) {
    const alive = new Set();
    for (const c of game.allCustomers()) {
      alive.add(c.id);
      const m = this.people.get(c.id) || this.spawnPerson(c);
      let tx;
      let tz;
      let speed;
      if (c.state === 'leave') {
        tx = EXIT_X;
        tz = 5.6;
        speed = 2.8;
      } else {
        tx = QUEUE_X(c.slot) + m.jx;
        tz = QUEUE_Z + m.jz;
        speed = 2.3;
      }
      const dx = tx - m.x;
      const dz = tz - m.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const step = Math.min(d, speed * dt);
        m.x += (dx / d) * step;
        m.z += (dz / d) * step;
        m.face = Math.atan2(dx, dz);
        m.walking = true;
      } else {
        m.walking = false;
        if (c.state !== 'leave') m.face = Math.PI;
      }
      if (c.state === 'queue' && !c.arrived && d < 0.2) c.arrived = true;
      m.root.position.set(m.x, 0, m.z);
      m.root.rotation.y = lerpAngle(m.root.rotation.y, m.face, Math.min(1, dt * 10));
      m.phase += dt * (m.walking ? 9 : 2);
      animatePerson(m, this.time);
    }
    for (const [id, m] of this.people) {
      if (!alive.has(id)) {
        this.scene.remove(m.root);
        this.people.delete(id);
      }
    }
  }

  // ---- staff visuals ------------------------------------------------------
  updateStaff(dt, game) {
    const active = game.activeSlots();
    this.cooks.forEach((cook, k) => {
      const want = k < game.s.cooks;
      if (want !== cook.shown) {
        cook.shown = want;
        cook.root.visible = want;
        if (want) this.grow(cook.root);
      }
      if (!want) return;
      const si = active[k];
      const busy = si !== undefined && game.slots[si].state === 'cooking';
      const targetX = si === undefined ? cook.home : si === FRY_SLOT ? FRY_X : STEAM_X(si);
      cook.root.position.x = lerp(cook.root.position.x, targetX, Math.min(1, dt * 4));
      cook.root.position.z = COOK_Z;
      cook.root.rotation.y = lerpAngle(cook.root.rotation.y, 0, Math.min(1, dt * 6));
      cook.busy = busy;
      cook.phase += dt * (busy ? 7 : 2);
      cook.walking = Math.abs(targetX - cook.root.position.x) > 0.05;
      animatePerson(cook, this.time);
      // stirring while the batch cooks, idle sway otherwise
      const t = this.time;
      if (busy) {
        cook.armR.rotation.x = -1.25 + Math.sin(cook.phase) * 0.35;
        cook.armL.rotation.x = -0.9 + Math.sin(cook.phase + 1.2) * 0.2;
      } else {
        cook.armR.rotation.x = Math.sin(t * 1.3 + k) * 0.08 - 0.1;
        cook.armL.rotation.x = Math.sin(t * 1.1 + k) * 0.08 - 0.1;
      }
    });

    this.servers.forEach((srv, k) => {
      const want = k < game.s.servers;
      if (want !== srv.shown) {
        srv.shown = want;
        srv.root.visible = want;
        if (want) this.grow(srv.root);
      }
      if (!want) return;
      const tr = srv.trip;
      let tx = srv.home[0];
      let tz = srv.home[1];
      let arm = 0;
      if (tr) {
        tr.t += dt;
        if (tr.phase === 'go') {
          const u = Math.min(1, tr.t / 0.9);
          tx = lerp(srv.home[0], tr.tx, easeInOut(u));
          tz = lerp(srv.home[1], tr.tz, easeInOut(u));
          if (u >= 1) { tr.phase = 'hold'; tr.t = 0; }
        } else if (tr.phase === 'hold') {
          tx = tr.tx;
          tz = tr.tz;
          arm = 1;
          if (tr.t > 0.35) { tr.phase = 'back'; tr.t = 0; }
        } else {
          const u = Math.min(1, tr.t / 0.9);
          tx = lerp(tr.tx, srv.home[0], easeInOut(u));
          tz = lerp(tr.tz, srv.home[1], easeInOut(u));
          if (u >= 1) srv.trip = null;
        }
        srv.walking = tr.phase !== 'hold';
      } else {
        srv.walking = false;
      }
      const dxT = (tr ? tr.tx : tx) - tx;
      const dzT = (tr ? tr.tz : tz) - tz;
      // face the customer while on a trip, otherwise face the queue
      const face = tr && Math.hypot(dxT, dzT) > 0.05 ? Math.atan2(dxT, dzT) : srv.idleFace;
      srv.root.position.x = tx;
      srv.root.position.z = tz;
      srv.root.rotation.y = lerpAngle(srv.root.rotation.y, face, Math.min(1, dt * 8));
      srv.phase += dt * (srv.walking ? 9 : 2);
      srv.armMode = arm ? 'manual' : 'auto';
      animatePerson(srv, this.time);
      if (arm) {
        srv.armR.rotation.x = -2.3;
        srv.armL.rotation.x = -0.4;
      }
    });
  }

  serverTrip(k, c) {
    const srv = this.servers[k];
    if (!srv || !srv.root.visible) return;
    const m = this.people.get(c.id);
    if (!m) return;
    srv.trip = { tx: m.x - 0.7, tz: m.z + 0.2, t: 0, phase: 'go' };
  }

  // ---- effects -----------------------------------------------------------
  emitSpark(x, y, z, color, vx, vy, vz, life, size, grow = 1) {
    const sp = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
    sp.s.material.color.set(color);
    sp.s.position.set(x, y, z);
    sp.s.scale.setScalar(size);
    sp.s.visible = true;
    sp.v.set(vx, vy, vz);
    sp.life = life;
    sp.max = life;
    sp.grow = grow;
    sp.base = size;
  }

  burst(x, y, z, color, n = 8, speed = 1.4, life = 0.9, size = 0.35) {
    for (let i = 0; i < n; i++) {
      this.emitSpark(x, y, z, color, rnd(-0.6, 0.6) * speed * 0.6, rnd(0.8, 1.6) * speed, rnd(-0.4, 0.4) * speed * 0.5, life * rnd(0.7, 1.1), size * rnd(0.6, 1.1), 0.4);
    }
  }

  onServed(c, total, source) {
    const m = this.people.get(c.id);
    if (!m) return;
    this.burst(m.x, 2.1, m.z, '#ffd36b', 10, 1.2, 1.0, 0.3);
    this.burst(m.x, 2.4, m.z, '#fff3c4', 4, 0.8, 0.6, 0.2);
  }

  onLost(c) {
    const m = this.people.get(c.id);
    if (!m) return;
    this.burst(m.x, 2.2, m.z, '#8c8c8c', 5, 0.7, 0.8, 0.45);
  }

  onBatchDone(i, item) {
    const v = this.slotVis[i];
    if (!v) return;
    this.burst(v.x, 2.9, STOVE_Z, ITEMS[item].color, 7, 1.0, 0.8, 0.3);
  }

  // ---- per-frame ---------------------------------------------------------
  updateSlots(dt, t, game) {
    this.slotVis.forEach((v, i) => {
      const active = game.isActive(i);
      if (active !== v.active) {
        v.active = active;
        v.root.visible = active;
        if (active) this.grow(v.root);
      }
      if (!active) return;
      const sl = game.slots[i];
      const cooking = sl.state === 'cooking';
      if (cooking) v.lastItem = sl.item;
      if (v.wasCooking && !cooking) this.onBatchDone(i, v.lastItem);
      v.wasCooking = cooking;

      if (cooking) {
        v.pieceMat.color.set(ITEMS[sl.item].color);
        v.pieces.forEach((pc, k) => {
          pc.visible = k < sl.batch;
          if (pc.visible) pc.position.y = v.pieceY + Math.sin(t * 5 + k) * 0.015;
        });
        v.bar.visible = true;
        v.bar.scale.x = Math.max(0.001, sl.t / sl.dur);
        v.bar.material.color.set(ITEMS[sl.item].color);
        v.marker.visible = false;
        v.acc = (v.acc || 0) + dt;
        const spawnEvery = v.isFry ? 0.18 : 0.13;
        while (v.acc > spawnEvery) {
          v.acc -= spawnEvery;
          if (v.isFry) {
            this.emitSpark(v.x + rnd(-0.2, 0.2), 2.6, STOVE_Z + rnd(-0.1, 0.1), 0xdcdcdc, rnd(-0.05, 0.05), 0.7, 0, 1.2, 0.35, 2.0);
          } else {
            this.emitSpark(v.x + rnd(-0.25, 0.25), 2.75, STOVE_Z + rnd(-0.2, 0.2), 0xffffff, rnd(-0.05, 0.05), rnd(0.55, 0.8), rnd(-0.05, 0.05), 2.2, 0.55, 2.4);
          }
        }
      } else {
        v.pieces.forEach((pc) => { pc.visible = false; });
        v.bar.visible = false;
        v.marker.visible = !game.isAutomated(i);
        v.marker.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 3 + i);
      }
      v.firebox.material.emissiveIntensity = 0.7 + Math.sin(t * 9 + i * 2) * 0.25 + (cooking ? 0.3 : 0);
    });
    // flame light follows the busiest steamer
    const busy = this.slotVis.filter((v, i) => v.active && game.slots[i].state === 'cooking').length;
    this.fireLight.intensity = 2.4 + busy * 0.6 + Math.sin(t * 11) * 0.2;
  }

  updateFx(dt, t) {
    for (const sp of this.sparks) {
      if (!sp.s.visible) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.s.visible = false;
        continue;
      }
      sp.s.position.addScaledVector(sp.v, dt);
      sp.v.y *= 1 - dt * 0.4;
      const k = sp.life / sp.max;
      sp.s.material.opacity = Math.min(1, k * 1.2) * 0.85;
      const grow = sp.base * (1 + (1 - k) * sp.grow);
      sp.s.scale.setScalar(grow);
    }
    for (const f of this.flags) {
      const arr = f.geo.attributes.position.array;
      const b = f.base;
      for (let i = 0; i < arr.length; i += 3) {
        const x = b[i] / f.fw;
        arr[i + 2] = b[i + 2] + Math.sin(t * 3.2 + f.phase + x * 4.5) * 0.09 * x;
      }
      f.geo.attributes.position.needsUpdate = true;
    }
    // dust drifts slowly
    const pos = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < this.dustBase.length; i++) {
      const [bx, by, bz, ph] = this.dustBase[i];
      pos[i * 3] = bx + Math.sin(t * 0.2 + ph) * 0.6;
      pos[i * 3 + 1] = by + Math.sin(t * 0.3 + ph * 1.3) * 0.35;
      pos[i * 3 + 2] = bz + Math.cos(t * 0.25 + ph) * 0.4;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    if (this.dog) {
      const tail = this.dog.userData.tail;
      tail.rotation.y = Math.sin(t * 6) * 0.5;
    }
  }

  updateLevelAnim(dt) {
    for (const o of this.growing) {
      o.userData.gt += dt;
      const u = clamp(o.userData.gt / 0.7, 0, 1);
      o.scale.setScalar(Math.max(0.001, easeOutBack(u)));
      if (u >= 1) {
        o.scale.setScalar(1);
        this.growing.delete(o);
      }
    }
  }

  update(dt, t, game) {
    this.time = t;
    this.updateSlots(dt, t, game);
    this.updateStaff(dt, game);
    this.syncCustomers(game, dt);
    this.updateFx(dt, t);
    this.updateLevelAnim(dt);
    this.updateCamera(dt, t);
    // legs and arms of staff are handled in updateStaff
  }

  // ---- camera, input and picking -----------------------------------------
  // The camera rises and pulls back as the shop grows, so the upper storeys stay in frame.
  updateCamera(dt, t) {
    const L = Math.max(1, this.level);
    const wantLook = [3.8, 4.4, 4.9][L - 1];
    const wantExtra = [0, 1.2, 2.2][L - 1];
    const ease = Math.min(1, dt * 2.5);
    this.lookY = this.lookY === undefined ? wantLook : this.lookY + (wantLook - this.lookY) * ease;
    this.extraD = this.extraD === undefined ? wantExtra : this.extraD + (wantExtra - this.extraD) * ease;
    const d = this.dist * this.zoom + this.extraD;
    const cx = 1 + this.pan;
    this.camera.position.set(cx, 4.3 + (d - 12.2) * 0.14 + Math.sin(t * 0.35) * 0.04, d);
    this.camera.lookAt(cx * 0.92, this.lookY, 0.2);
    const h = this.canvas.clientHeight || 1;
    const w = this.canvas.clientWidth || 1;
    if (this.inset > 0 || this.insetR > 0) {
      this.camera.setViewOffset(w, h, (this.insetR || 0) * 0.5, (this.inset || 0) * 0.5, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  drag(dx) {
    this.pan = clamp(this.pan - dx * 0.012 * this.zoom, -4, 4);
  }

  zoomBy(f) {
    this.zoom = clamp(this.zoom * f, 0.8, 2.6);
  }

  // Keeps the stall centred in the part of the canvas the UI leaves free.
  setInsets(bottom, right) {
    this.inset = bottom;
    this.insetR = right;
  }

  // Position of a customer plus the height just above their head (for order bubbles).
  personPos(id) {
    const m = this.people.get(id);
    return m ? { x: m.x, z: m.z, top: m.spec.scale * 2.3 + 0.35 } : null;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Narrow (phone) screens widen the vertical field of view and pull back,
    // so the whole stall and queue stay in frame.
    const vfov = aspect < 1 ? clamp(40 + (1 / aspect - 1) * 22, 40, 72) : 40;
    this.camera.fov = vfov;
    const tanV = Math.tan(THREE.MathUtils.degToRad(vfov / 2));
    this.dist = clamp(6.8 / (tanV * aspect), 15, 26);
    this.camera.updateProjectionMatrix();
  }

  pick(clientX, clientY) {
    // matrices are normally refreshed by render(); taps can arrive between frames
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const roots = [];
    for (const m of this.people.values()) if (m.root.visible) roots.push(m.root);
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.customerId === undefined) o = o.parent;
      if (o) return { type: 'customer', id: o.userData.customerId };
    }
    const hitSlots = this.raycaster.intersectObjects(this.slotVis.filter((v) => v.active).map((v) => v.hit), false);
    if (hitSlots.length) return { type: 'slot', index: hitSlots[0].object.userData.slot };
    return null;
  }

  project(x, y, z) {
    this.camera.updateMatrixWorld();
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width + r.left, y: (-v.y * 0.5 + 0.5) * r.height + r.top, behind: v.z > 1 };
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

function easeInOut(u) {
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}

// ---- people ---------------------------------------------------------------
const SKIN = [0xc68642, 0x8d5524, 0xe0ac69, 0xf1c27d, 0xa26d3f];
const SHIRTS = [0x2d4f8b, 0x7d2330, 0x2f6e44, 0xb8862a, 0x5b2c6f, 0xe8e0cf, 0x1f7a8c, 0xd8542e];
const DRESS = [0xc2185b, 0xf39c12, 0x8e24aa, 0x00838f, 0xd84315, 0x3949ab];

function randomSpec() {
  const r = Math.random();
  if (r < 0.36) {
    return { kind: 'man', shirt: pick(SHIRTS), pants: pick([0x2b2b33, 0x4a3a2a, 0x33405a]), hat: 'topi', hair: 0x141010, skin: pick(SKIN), scale: 1 };
  }
  if (r < 0.62) {
    return { kind: 'woman', shirt: pick(DRESS), dress: true, hair: 0x1a1010, hat: 'none', skin: pick(SKIN), scale: 0.95 };
  }
  if (r < 0.78) {
    return { kind: 'kid', shirt: pick(SHIRTS), pants: 0x3a3a4a, hat: 'none', hair: 0x221a12, skin: pick(SKIN), scale: 0.68 };
  }
  return { kind: 'tourist', shirt: 0xe8572c, pants: 0x3e4a3a, hat: 'trek', backpack: true, hair: 0xaa7a3a, skin: 0xf1c9a0, scale: 1 };
}

function makePerson(spec) {
  const root = new THREE.Group();
  root.userData.spec = spec;
  const body = new THREE.Group();
  body.scale.setScalar(spec.scale || 1);
  root.add(body);
  const pivot = (parent, x, y) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    parent.add(g);
    return g;
  };
  const legL = pivot(body, -0.14, 0.86);
  const legR = pivot(body, 0.14, 0.86);
  for (const leg of [legL, legR]) {
    if (spec.dress) {
      box(leg, 0.2, 0.2, 0.22, 0x3a2a1c, 0, -0.1, 0, { shadow: false });
    } else {
      box(leg, 0.18, 0.82, 0.2, spec.pants, 0, -0.41, 0);
      box(leg, 0.2, 0.1, 0.26, 0x1c1410, 0, -0.84, 0.03);
    }
  }
  box(body, 0.56, 0.7, 0.32, spec.shirt, 0, 1.25, 0);
  if (spec.dress) cyl(body, 0.22, 0.44, 0.9, spec.shirt, 0, 0.55, 0, {}, 14);
  if (spec.apron) box(body, 0.42, 0.52, 0.05, spec.apron, 0, 1.08, 0.18);
  if (spec.backpack) box(body, 0.42, 0.52, 0.22, 0x3a4a2e, 0, 1.3, -0.26);
  const armL = pivot(body, -0.36, 1.56);
  const armR = pivot(body, 0.36, 1.56);
  for (const arm of [armL, armR]) {
    box(arm, 0.16, 0.66, 0.18, spec.shirt, 0, -0.33, 0);
    sph(arm, 0.09, spec.skin, 0, -0.7, 0, { rough: 0.8 });
  }
  const head = new THREE.Group();
  head.position.set(0, 1.82, 0);
  body.add(head);
  sph(head, 0.22, spec.skin, 0, 0, 0, { rough: 0.7, ws: 18, hs: 14 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(spec.hair, { rough: 0.9 }));
  hair.position.y = 0.02;
  head.add(hair);
  for (const ex of [-0.08, 0.08]) sph(head, 0.028, 0x161010, ex, 0.02, 0.2, {}, [1, 1, 1]);
  if (spec.hat === 'topi') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.15, 18), mat(0xffffff, { map: topiTex, rough: 0.8 }));
    hat.position.y = 0.2;
    head.add(hat);
  } else if (spec.hat === 'trek') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 20), mat(0x6f5a3a, { rough: 0.9 }));
    brim.position.y = 0.18;
    head.add(brim);
    cyl(head, 0.2, 0.22, 0.16, 0x6f5a3a, 0, 0.27, 0, { rough: 0.9 }, 16);
  }
  return {
    root, body, legL, legR, armL, armR, head,
    phase: Math.random() * 6, walking: false, busy: false, armMode: 'auto', spec,
  };
}

// Walk cycle for legs and head; arms swing too unless the caller takes over (armMode 'manual').
function animatePerson(m, t) {
  const a = m.phase;
  const swing = m.walking ? 0.6 : 0;
  m.legL.rotation.x = Math.sin(a) * swing;
  m.legR.rotation.x = -Math.sin(a) * swing;
  m.body.position.y = m.walking ? Math.abs(Math.sin(a)) * 0.03 : 0;
  if (m.armMode !== 'manual') {
    m.armL.rotation.x = m.walking ? -Math.sin(a) * 0.5 : Math.sin(t * 1.4 + a) * 0.05;
    m.armR.rotation.x = m.walking ? Math.sin(a) * 0.5 : Math.sin(t * 1.2 + a * 0.5) * 0.05;
  }
  m.head.rotation.y = m.walking ? 0 : Math.sin(t * 0.7 + a) * 0.15;
}
