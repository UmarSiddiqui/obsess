// Three.js scene: Kathmandu street, Newari architecture, Himalayan backdrop,
// steamers, steam particles, prayer flags, customers and staff. Everything is
// generated in code (canvas textures + primitive geometry); no external assets.
import * as THREE from 'three';
import { ITEMS, STAGES, MAX_SLOTS, ITEM_ORDER } from './data.js';

const TAU = Math.PI * 2;
const COUNTER_H = 0.9;
const STEAM_N = 320;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- canvas textures ----------

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function brickTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8c6a0';
    g.fillRect(0, 0, w, h);
    const rows = 8, cols = 4, bh = h / rows, bw = w / cols;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const k = 0.82 + Math.random() * 0.26;
        g.fillStyle = `rgb(${(164 * k) | 0},${(78 * k) | 0},${(48 * k) | 0})`;
        g.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  }, [2, 2]);
}

function pavingTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7f6c5a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const k = 0.78 + Math.random() * 0.36;
        g.fillStyle = `rgb(${(146 * k) | 0},${(128 * k) | 0},${(106 * k) | 0})`;
        g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
      }
    }
  }, [90, 90]);
}

// Carved Newari window: dark wood frame, painted band, lattice panel.
function windowTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b2813';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#9c2f1c';
    g.fillRect(0, 0, w, 40);
    g.fillStyle = '#f0c36a';
    for (let x = 12; x < w; x += 26) {
      g.beginPath();
      g.arc(x, 20, 5, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#7a4524';
    g.fillRect(12, 48, w - 24, h - 60);
    g.strokeStyle = '#2a1409';
    g.lineWidth = 6;
    for (let x = 12; x <= w - 12; x += 30) {
      g.beginPath();
      g.moveTo(x, 48);
      g.lineTo(x, h - 12);
      g.stroke();
    }
    for (let y = 48; y <= h - 12; y += 30) {
      g.beginPath();
      g.moveTo(12, y);
      g.lineTo(w - 12, y);
      g.stroke();
    }
    g.fillStyle = '#e8b25c';
    for (let x = 27; x < w - 12; x += 30) {
      for (let y = 63; y < h - 12; y += 30) {
        g.beginPath();
        g.moveTo(x, y - 6);
        g.lineTo(x + 6, y);
        g.lineTo(x, y + 6);
        g.lineTo(x - 6, y);
        g.closePath();
        g.fill();
      }
    }
    g.fillStyle = '#9c2f1c';
    g.fillRect(0, h - 22, w, 22);
  });
}

function stripeTexture(c1, c2) {
  return canvasTex(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = (x / 32) % 2 ? c1 : c2;
      g.fillRect(x, 0, 32, h);
    }
  }, [6, 1]);
}

function signTexture(en, ne) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#2a1209';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f0b44a';
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffd27a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 56px Georgia, "Times New Roman", serif';
    g.fillText(en, w / 2, h * 0.66);
    g.font = 'bold 30px "Noto Sans Devanagari", system-ui, sans-serif';
    g.fillText(ne, w / 2, h * 0.24);
  });
}

function buddhaEyesTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2c14e';
    g.fillRect(0, 0, w, h);
    for (const x of [96, 160]) {
      g.fillStyle = '#fff8e8';
      g.beginPath();
      g.ellipse(x, 110, 40, 24, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#1d4fd1';
      g.beginPath();
      g.arc(x, 110, 16, 0, TAU);
      g.fill();
      g.fillStyle = '#0b1a40';
      g.beginPath();
      g.arc(x, 110, 6, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#d8452d';
    g.beginPath();
    g.moveTo(128, 150);
    g.quadraticCurveTo(150, 200, 120, 228);
    g.lineTo(136, 228);
    g.quadraticCurveTo(170, 190, 128, 150);
    g.fill();
  });
}

function roofTileTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a3328';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = (y / 16) % 2 ? 0 : -16; x < w; x += 32) {
        g.fillStyle = '#5e4236';
        g.beginPath();
        g.arc(x + 16, y + 16, 15, 0, Math.PI);
        g.fill();
      }
    }
  }, [6, 6]);
}

function glowTexture(r, gg, b) {
  return canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, `rgba(${r},${gg},${b},1)`);
    grd.addColorStop(0.35, `rgba(${r},${gg},${b},0.35)`);
    grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

function skyTexture() {
  return canvasTex(4, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#1d2a58');
    grd.addColorStop(0.35, '#5a4a88');
    grd.addColorStop(0.62, '#e0785a');
    grd.addColorStop(0.8, '#ffb27a');
    grd.addColorStop(1, '#ffe0b0');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

// ---------- geometry helpers ----------

function mesh(geo, mat, x, y, z, parent, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Ridge profile used for the Himalayan backdrop; snow above the snow line.
function ridgeGeometry({ base, height, lo, hi, snow, seed, snowLine = 0.6, width = 420, cols = 120 }) {
  const rnd01 = seededRandom(seed);
  const raw = Array.from({ length: cols + 1 }, () => rnd01());
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < cols; i++) raw[i] = (raw[i - 1] + raw[i] * 2 + raw[i + 1]) / 4;
  }
  const pos = [], col = [], idx = [];
  const cLo = new THREE.Color(lo), cHi = new THREE.Color(hi), cSnow = new THREE.Color(snow);
  const c = new THREE.Color();
  for (let i = 0; i <= cols; i++) {
    const x = -width / 2 + (width * i) / cols;
    // Peaky profile: a few tall summits with valleys between them.
    const t = Math.pow(clamp(raw[i] * 1.5 - 0.2, 0, 1), 1.5);
    const top = base + height * t;
    pos.push(x, top, 0, x, -10, 0);
    if (t > snowLine) c.copy(cHi).lerp(cSnow, clamp((t - snowLine) / 0.2, 0, 1));
    else c.copy(cLo).lerp(cHi, t / snowLine);
    col.push(c.r, c.g, c.b, c.r * 0.7, c.g * 0.7, c.b * 0.7);
    if (i < cols) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Strings of prayer flags between two points, sagging in the middle.
function addFlagString(parent, flagList, a, b, sag, count, flagMats) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    pts.push(new THREE.Vector3().lerpVectors(A, B, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0)));
  }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3b2a1a })));
  const W = 0.36, H = 0.28;
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count;
    const p = pts[Math.round(t * 40)];
    const next = pts[Math.min(40, Math.round(t * 40) + 1)];
    const dir = new THREE.Vector3().subVectors(next, p);
    const geo = new THREE.PlaneGeometry(W, H, 6, 2);
    const mat = flagMats[k % flagMats.length];
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, p.y - H / 2 - 0.02, p.z);
    m.rotation.y = Math.atan2(-dir.z, dir.x);
    m.castShadow = true;
    parent.add(m);
    flagList.push({ mesh: m, base: geo.attributes.position.array.slice(), phase: k * 0.9 + Math.random() });
  }
}

function addLantern(parent, x, y, z, glow) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.26, 10), glow.bodyMat);
  body.position.y = -0.12;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 10), glow.brassMat);
  cap.position.y = 0.02;
  cap.rotation.x = Math.PI;
  g.add(cap);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), glow.brassMat);
  top.position.y = 0.14;
  g.add(top);
  const sprite = new THREE.Sprite(glow.spriteMat.clone());
  sprite.material.opacity = 0.55;
  sprite.scale.set(0.8, 0.8, 1);
  sprite.position.y = -0.12;
  g.add(sprite);
  parent.add(g);
  return { group: g, sprite };
}

function addGarland(parent, a, b, sag, count, mats) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const geo = new THREE.SphereGeometry(0.07, 8, 6);
  for (let k = 0; k <= count; k++) {
    const t = k / count;
    const p = new THREE.Vector3().lerpVectors(A, B, t);
    p.y -= sag * 4 * t * (1 - t);
    mesh(geo, mats[k % mats.length], p.x, p.y, p.z, parent, false);
  }
}

// Stupa (chorten) with Buddha eyes on the harmika and a gilded spire.
function addStupa(parent, x, z, scale, mats) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  const pts = [new THREE.Vector2(1.25, 0), new THREE.Vector2(1.3, 0.35), new THREE.Vector2(1.15, 0.5)];
  for (let s = 0; s <= 16; s++) {
    const t = s / 16;
    pts.push(new THREE.Vector2(0.95 - 0.5 * t + 0.25 * Math.sin(Math.PI * t), 0.5 + 1.3 * t));
  }
  pts.push(new THREE.Vector2(0.42, 1.9), new THREE.Vector2(0.4, 2.0));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mats.white));
  mesh(new THREE.BoxGeometry(0.62, 0.5, 0.62), mats.eyes, 0, 2.25, 0, g);
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), mats.white, 0, 2.5, 0, g);
  mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 8), mats.gold, 0, 3.1, 0, g, false);
  for (let r = 0; r < 4; r++) mesh(new THREE.TorusGeometry(0.2 - r * 0.03, 0.03, 6, 14), mats.gold, 0, 2.8 + r * 0.2, 0, g, false).rotation.x = Math.PI / 2;
  mesh(new THREE.ConeGeometry(0.18, 0.35, 12), mats.gold, 0, 3.8, 0, g, false);
  mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.gold, 0, 4.05, 0, g, false);
  parent.add(g);
  return g;
}

// Two-tier sloped roof built from tilted slabs (Newari style).
function roofSlab(parent, w, d, y, z, tilt, mat) {
  const g = new THREE.Group();
  g.position.set(0, y, z);
  g.rotation.x = -tilt;
  mesh(new THREE.BoxGeometry(w, 0.24, d), mat, 0, 0, 0, g);
  mesh(new THREE.BoxGeometry(w * 0.98, 0.1, 0.2), mat, 0, -0.16, d / 2 - 0.05, g, false);
  parent.add(g);
  return g;
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

// ---------- humans ----------

function makeHuman({ shirt, pants, skin, topi, apron, white }, mats) {
  const root = new THREE.Group();
  const shirtM = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
  const pantsM = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const h = { root, legs: [], arms: [], torso: null, head: null, act: 0, phase: rnd(0, 6), target: new THREE.Vector3(), speed: 2.4, exiting: false, exitDir: 0, moving: false };
  for (const x of [-0.14, 0.14]) {
    const piv = new THREE.Group();
    piv.position.set(x, 0.85, 0);
    mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.85, 8), pantsM, 0, -0.425, 0, piv);
    root.add(piv);
    h.legs.push(piv);
  }
  const torso = new THREE.Group();
  torso.position.y = 0.85;
  mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.9, 10), shirtM, 0, 0.45, 0, torso);
  if (apron) mesh(new THREE.BoxGeometry(0.46, 0.7, 0.05), apron, 0, 0.45, 0.28, torso);
  root.add(torso);
  h.torso = torso;
  const head = new THREE.Group();
  head.position.set(0, 1.95, 0);
  mesh(new THREE.SphereGeometry(0.19, 14, 10), skinM, 0, 0, 0, head);
  mesh(new THREE.SphereGeometry(0.205, 12, 8, 0, TAU, 0, Math.PI * 0.5), mats.hair, 0, 0.02, -0.02, head, false);
  if (topi) {
    const tm = white ? mats.whiteCap : mats.topi;
    mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.14, 14), tm, 0, 0.15, 0, head);
    mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 14), tm, 0, 0.23, 0, head, false);
  }
  root.add(head);
  h.head = head;
  for (const x of [-0.33, 0.33]) {
    const piv = new THREE.Group();
    piv.position.set(x, 1.65, 0);
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.75, 8), shirtM, 0, -0.37, 0, piv);
    root.add(piv);
    h.arms.push(piv);
  }
  return h;
}

function animateHuman(h, t, dt) {
  const walk = h.moving ? 1 : 0;
  h.legs[0].rotation.x = Math.sin(t * 9 + h.phase) * 0.6 * walk;
  h.legs[1].rotation.x = Math.sin(t * 9 + h.phase + Math.PI) * 0.6 * walk;
  if (h.act > 0) {
    h.act -= dt;
    h.arms[1].rotation.x = -1.2 + Math.sin(t * 16) * 0.5;
    h.arms[0].rotation.x = -0.5 + Math.sin(t * 16 + 1) * 0.3;
  } else {
    h.arms[0].rotation.x = Math.sin(t * 9 + h.phase + Math.PI) * 0.5 * walk;
    h.arms[1].rotation.x = Math.sin(t * 9 + h.phase) * 0.5 * walk;
  }
  h.torso.position.y = 0.85 + (walk ? Math.abs(Math.sin(t * 9 + h.phase)) * 0.04 : Math.sin(t * 2 + h.phase) * 0.01);
}

// ---------- world ----------

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xd9c0d6, 70, 330);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  const cam = { yaw: 0, dragYaw: 0, dist: 12.5, height: 3.6, look: new THREE.Vector3(0, 3.0, 0) };

  // Lights: warm low sun, cool sky fill, and a candle-like glow over the stall.
  scene.add(new THREE.HemisphereLight(0xd7e0ff, 0x5a3d2b, 1.0));
  const sun = new THREE.DirectionalLight(0xffc27a, 2.5);
  sun.position.set(-9, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -8, near: 1, far: 60 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fb8ff, 0.4);
  fill.position.set(10, 6, -4);
  scene.add(fill);
  const stallGlow = new THREE.PointLight(0xff9a4a, 9, 16, 1.6);
  stallGlow.position.set(0, 2.6, 0.4);
  scene.add(stallGlow);

  // Textures and shared materials.
  const tex = {
    brick: brickTexture(), paving: pavingTexture(), window: windowTexture(),
    tarpA: stripeTexture('#c8322a', '#f4ead6'), tarpB: stripeTexture('#2456c9', '#f4ead6'),
    eyes: buddhaEyesTexture(), roof: roofTileTexture(),
    steam: glowTexture(255, 248, 235), fire: glowTexture(255, 130, 40),
    gold: glowTexture(255, 200, 90), warm: glowTexture(255, 170, 80),
  };
  const mat = {
    brick: new THREE.MeshStandardMaterial({ map: tex.brick, roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.7 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x3e2414, roughness: 0.8 }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0xc9a062, roughness: 0.7, side: THREE.DoubleSide }),
    red: new THREE.MeshStandardMaterial({ color: 0x8a2b1f, roughness: 0.6 }),
    tile: new THREE.MeshStandardMaterial({ map: tex.roof, roughness: 0.85 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xf1ebdf, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.45, metalness: 0.6 }),
    gas: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, metalness: 0.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8962e, roughness: 0.35, metalness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe7b44a, roughness: 0.3, metalness: 0.7 }),
    counterTop: new THREE.MeshStandardMaterial({ color: 0x8c5a2c, roughness: 0.6 }),
    window: new THREE.MeshStandardMaterial({ map: tex.window, roughness: 0.7 }),
    eyesMat: new THREE.MeshStandardMaterial({ map: tex.eyes, roughness: 0.6 }),
    tarpA: new THREE.MeshStandardMaterial({ map: tex.tarpA, side: THREE.DoubleSide, roughness: 0.9 }),
    tarpB: new THREE.MeshStandardMaterial({ map: tex.tarpB, side: THREE.DoubleSide, roughness: 0.9 }),
    ground: new THREE.MeshStandardMaterial({ map: tex.paving, roughness: 0.95 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17110c, roughness: 0.9 }),
    topi: new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.8 }),
    whiteCap: new THREE.MeshStandardMaterial({ color: 0xf5f3ec, roughness: 0.8 }),
    apron: new THREE.MeshStandardMaterial({ color: 0xa3261f, roughness: 0.9 }),
    lantern: new THREE.MeshBasicMaterial({ color: 0xffb35a }),
    marigold: [0xf08a1c, 0xffb020, 0xe86a14].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: 0x331200 })),
    flags: [0x1f5fd6, 0xf5f5f0, 0xd7262a, 0x1f9a4c, 0xf5c518].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })),
  };
  const glowSpriteMat = (t) => new THREE.SpriteMaterial({ map: t, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const momoMats = {};
  for (const k of ITEM_ORDER) {
    momoMats[k] = new THREE.MeshStandardMaterial({ color: ITEMS[k].color, roughness: k === 'cmomo' ? 0.35 : 0.55 });
  }
  const momoGeo = new THREE.SphereGeometry(0.115, 10, 8);
  const stoveGeo = new THREE.BoxGeometry(0.9, 0.55, 0.85);

  // Environment: sky, paving, Himalayan ridges.
  const env = new THREE.Group();
  scene.add(env);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  env.add(ground);
  // Far to near: snowy Himalayan summits, hazy mid ridges, then green foothills.
  const ridges = [
    { z: -200, base: 4, height: 62, lo: '#6d78a8', hi: '#a3aed6', snow: '#f7f8ff', snowLine: 0.5, seed: 7 },
    { z: -135, base: 2, height: 30, lo: '#5b6896', hi: '#8c98c4', snow: '#eef2ff', snowLine: 0.55, seed: 19 },
    { z: -88, base: 0, height: 14, lo: '#5d6a5e', hi: '#8e9a7a', snow: '#e6ebf5', snowLine: 0.8, seed: 31 },
    { z: -62, base: -1, height: 7, lo: '#4f6b3c', hi: '#86985a', snow: '#e6ebf5', snowLine: 2, seed: 43 },
  ];
  for (const r of ridges) {
    const m = new THREE.Mesh(ridgeGeometry(r), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
    m.position.z = r.z;
    env.add(m);
  }

  // Shared prayer-flag and lantern helpers used by stage builders.
  const glowParts = { bodyMat: mat.lantern, brassMat: mat.brass, spriteMat: glowSpriteMat(tex.warm) };

  // ----- steam particles -----
  const sPos = new Float32Array(STEAM_N * 3);
  const sVel = new Float32Array(STEAM_N * 3);
  const sAlpha = new Float32Array(STEAM_N);
  const sSize = new Float32Array(STEAM_N);
  const sLife = new Float32Array(STEAM_N);
  const sAge = new Float32Array(STEAM_N);
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  steamGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1));
  steamGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  const steamMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex.steam }, uScale: { value: 500 } },
    vertexShader: `
      attribute float aAlpha; attribute float aSize; varying float vA; uniform float uScale;
      void main() {
        vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; varying float vA;
      void main() {
        vec4 c = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(c.rgb, c.a * vA * 0.5);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const steam = new THREE.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  scene.add(steam);
  let steamCursor = 0;
  const steamAcc = new Float32Array(MAX_SLOTS);

  function emitSteam(x, y, z) {
    for (let n = 0; n < STEAM_N; n++) {
      const i = (steamCursor + n) % STEAM_N;
      if (sLife[i] > 0) continue;
      steamCursor = (i + 1) % STEAM_N;
      sLife[i] = 1.9 + Math.random() * 0.8;
      sAge[i] = 0;
      sPos[i * 3] = x + rnd(-0.14, 0.14);
      sPos[i * 3 + 1] = y;
      sPos[i * 3 + 2] = z + rnd(-0.14, 0.14);
      sVel[i * 3] = rnd(-0.1, 0.1);
      sVel[i * 3 + 1] = rnd(0.5, 0.85);
      sVel[i * 3 + 2] = rnd(-0.06, 0.06);
      return;
    }
  }

  function updateSteam(dt) {
    for (let i = 0; i < STEAM_N; i++) {
      if (sLife[i] <= 0) {
        sAlpha[i] = 0;
        continue;
      }
      sLife[i] -= dt;
      sAge[i] += dt;
      sPos[i * 3] += (sVel[i * 3] + Math.sin(sAge[i] * 2 + i) * 0.08) * dt;
      sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt;
      sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
      sSize[i] = 0.45 + sAge[i] * 0.55;
      sAlpha[i] = Math.min(1, sAge[i] * 1.5) * clamp(sLife[i] * 0.9, 0, 1);
    }
    steamGeo.attributes.position.needsUpdate = true;
    steamGeo.attributes.aAlpha.needsUpdate = true;
    steamGeo.attributes.aSize.needsUpdate = true;
  }

  // ----- prayer flags -----
  const flagList = [];
  function updateFlags(t) {
    for (const f of flagList) {
      const arr = f.mesh.geometry.attributes.position;
      const base = f.base;
      for (let i = 0; i < arr.count; i++) {
        const x = base[i * 3];
        const u = x / 0.36 + 0.5;
        arr.setZ(i, Math.sin(t * 2.6 + f.phase + u * 5) * 0.045 * u);
      }
      arr.needsUpdate = true;
    }
  }

  // ----- stage (rebuilt when the business expands) -----
  let stageIdx = -1;
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);
  let decorGroups = {};
  const slots = [];
  const slotGroup = new THREE.Group();
  scene.add(slotGroup);

  function slotLayout(idx) {
    const out = [];
    const max = STAGES[idx].maxBaskets;
    if (idx === 2) {
      for (let i = 0; i < max; i++) out.push({ x: ((i % 4) - 1.5) * 2.4, z: i < 4 ? -0.5 : 0.5 });
    } else {
      const span = idx === 0 ? 2.2 : 1.8;
      for (let i = 0; i < max; i++) out.push({ x: (i - (max - 1) / 2) * span, z: 0 });
    }
    return out;
  }

  function buildSlots(idx) {
    disposeGroup(slotGroup);
    slotGroup.clear();
    slots.length = 0;
    for (const p of slotLayout(idx)) {
      const g = new THREE.Group();
      g.position.set(p.x, COUNTER_H, p.z);
      mesh(stoveGeo, mat.brick, 0, 0.275, 0, g);
      mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), mat.darkWood, 0, 0.18, 0.44, g, false);
      const potY = 0.55 + 0.1;
      mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.2, 14), mat.metal, 0, potY, 0, g);
      const basket = new THREE.Group();
      basket.position.y = 0.65;
      mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.3, 18, 1, true), mat.bamboo, 0, 0.15, 0, basket);
      mesh(new THREE.CircleGeometry(0.38, 18), mat.bamboo, 0, 0.001, 0, basket, false).rotation.x = -Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.41, 0.02, 6, 20), mat.darkWood, 0, 0.06, 0, basket, false).rotation.x = Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.41, 0.02, 6, 20), mat.darkWood, 0, 0.25, 0, basket, false).rotation.x = Math.PI / 2;
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 8, 0, TAU, 0, Math.PI / 2), mat.bamboo);
      lid.scale.y = 0.4;
      lid.position.y = 0.3;
      lid.castShadow = true;
      basket.add(lid);
      const momos = [];
      const pts = [[0, 0]];
      for (let a = 0; a < 6; a++) pts.push([0.2 * Math.cos((a * TAU) / 6), 0.2 * Math.sin((a * TAU) / 6)]);
      for (let a = 0; a < 3; a++) pts.push([0.1 * Math.cos(a * TAU / 3 + 0.5), 0.1 * Math.sin(a * TAU / 3 + 0.5)]);
      for (let k = 0; k < 10; k++) {
        const m = new THREE.Mesh(momoGeo, momoMats.steamed);
        m.scale.set(1, 0.72, 1);
        m.position.set(pts[k][0], 0.14, pts[k][1]);
        m.rotation.y = Math.random() * TAU;
        m.castShadow = true;
        m.visible = false;
        basket.add(m);
        momos.push(m);
      }
      g.add(basket);
      const fire = new THREE.Sprite(glowSpriteMat(tex.fire));
      fire.position.set(0, 0.25, 0.5);
      fire.scale.set(0.9, 0.9, 1);
      fire.visible = false;
      g.add(fire);
      const ready = new THREE.Sprite(glowSpriteMat(tex.gold));
      ready.position.set(0, 1.55, 0);
      ready.scale.set(1.3, 1.3, 1);
      ready.visible = false;
      g.add(ready);
      g.userData.pick = { type: 'slot', i: slots.length };
      slotGroup.add(g);
      slots.push({ group: g, basket, lid, momos, fire, ready, worldPos: new THREE.Vector3(p.x, COUNTER_H + 1.1, p.z), item: null });
    }
  }

  function buildStage(idx) {
    disposeGroup(stageGroup);
    stageGroup.clear();
    flagList.length = 0;
    decorGroups = {};
    const S = stageGroup;
    const counterLen = [6.8, 9.4, 11.2][idx];
    const counterDepth = idx === 2 ? 2.4 : 1.6;

    if (idx === 0) {
      // Brick house wall behind a tiled roof with carved windows.
      mesh(new THREE.BoxGeometry(12, 3.6, 1.0), mat.brick, 0, 1.8, -3.9, S);
      for (const x of [-3.6, 3.6]) {
        mesh(new THREE.BoxGeometry(1.4, 1.7, 0.1), mat.red, x, 2.0, -3.37, S, false);
        mesh(new THREE.PlaneGeometry(1.2, 1.5), mat.window, x, 2.0, -3.3, S, false);
      }
      mesh(new THREE.BoxGeometry(0.9, 2.2, 0.1), mat.darkWood, 0, 1.3, -3.35, S, false);
      roofSlab(S, 13, 2.4, 3.75, -3.0, 0.28, mat.tile);
      mesh(new THREE.BoxGeometry(12.4, 0.18, 0.2), mat.red, 0, 3.55, -3.35, S);
      mesh(new THREE.PlaneGeometry(3.0, 0.62), new THREE.MeshStandardMaterial({ map: signTexture('MOMO GHAR', 'मोमो घर'), roughness: 0.6 }), 0, 3.32, -3.2, S, false);
    } else if (idx === 1) {
      // Two-storey Newari house with carved upper windows.
      mesh(new THREE.BoxGeometry(10.8, 2.4, 2.4), mat.brick, 0, 1.2, -2.6, S);
      mesh(new THREE.BoxGeometry(10.0, 2.2, 2.4), mat.wood, 0, 3.5, -2.4, S);
      for (const x of [-3.2, 0, 3.2]) {
        mesh(new THREE.BoxGeometry(1.4, 1.7, 0.1), mat.red, x, 3.5, -1.15, S, false);
        mesh(new THREE.PlaneGeometry(1.2, 1.5), mat.window, x, 3.5, -1.1, S, false);
      }
      mesh(new THREE.BoxGeometry(10.4, 0.18, 0.2), mat.red, 0, 2.4, -1.15, S);
      mesh(new THREE.BoxGeometry(10.4, 0.18, 0.2), mat.red, 0, 4.6, -1.15, S);
      roofSlab(S, 12, 3.6, 4.85, -2.5, 0.3, mat.tile);
      roofSlab(S, 9, 2.4, 5.7, -2.5, 0.3, mat.tile);
      mesh(new THREE.ConeGeometry(0.35, 0.9, 10), mat.gold, 0, 6.5, -2.5, S, false);
      mesh(new THREE.PlaneGeometry(3.6, 0.8), new THREE.MeshStandardMaterial({ map: signTexture('MOMO GHAR', 'मोमो घर'), roughness: 0.6 }), 0, 4.45, -1.1, S, false);
    } else {
      // Three-tier Newari pagoda restaurant with a stupa in the courtyard.
      const tiers = [
        { w: 12.6, h: 2.4, y: 1.2, d: 3.0, mat: mat.brick },
        { w: 9.6, h: 2.2, y: 3.5, d: 3.0, mat: mat.wood },
        { w: 6.6, h: 2.0, y: 5.6, d: 2.6, mat: mat.wood },
      ];
      for (const t of tiers) mesh(new THREE.BoxGeometry(t.w, t.h, t.d), t.mat, 0, t.y, -4.2, S);
      const tierRoofs = [2.45, 4.65, 6.65];
      tierRoofs.forEach((y, i) => roofSlab(S, tiers[i].w + 1.6, tiers[i].d + 1.6, y, -4.2, 0.3, mat.tile));
      for (const x of [-4.5, -1.5, 1.5, 4.5]) {
        mesh(new THREE.BoxGeometry(1.4, 1.5, 0.1), mat.red, x, 1.3, -2.66, S, false);
        mesh(new THREE.PlaneGeometry(1.2, 1.3), mat.window, x, 1.3, -2.6, S, false);
      }
      for (const x of [-3.2, 3.2]) {
        mesh(new THREE.BoxGeometry(1.4, 1.5, 0.1), mat.red, x, 3.5, -2.66, S, false);
        mesh(new THREE.PlaneGeometry(1.2, 1.3), mat.window, x, 3.5, -2.6, S, false);
      }
      for (const x of [-1.8, 1.8]) {
        mesh(new THREE.BoxGeometry(1.4, 1.4, 0.1), mat.red, x, 5.6, -2.86, S, false);
        mesh(new THREE.PlaneGeometry(1.2, 1.2), mat.window, x, 5.6, -2.8, S, false);
      }
      mesh(new THREE.PlaneGeometry(3.8, 0.8), new THREE.MeshStandardMaterial({ map: signTexture('MOMO GHAR', 'मोमो घर'), roughness: 0.6 }), 0, 3.5, -2.6, S, false);
      mesh(new THREE.ConeGeometry(0.4, 1.0, 10), mat.gold, 0, 7.5, -4.2, S, false);
      addStupa(S, 7.6, -6.5, 1.5, { white: mat.plaster, eyes: mat.eyesMat, gold: mat.gold });
    }

    // Counter: brick body with a timber top.
    mesh(new THREE.BoxGeometry(counterLen, COUNTER_H, counterDepth), mat.brick, 0, COUNTER_H / 2, 0, S);
    mesh(new THREE.BoxGeometry(counterLen + 0.1, 0.08, counterDepth + 0.1), mat.counterTop, 0, COUNTER_H + 0.04, 0, S);

    // Canopy poles and striped tarp over the counter.
    const poleX = counterLen / 2 - 0.4;
    const tarp = idx === 1 ? mat.tarpB : mat.tarpA;
    for (const x of [-poleX, poleX]) {
      for (const z of [-counterDepth / 2 - 0.05, counterDepth / 2 + 0.7]) {
        mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.0, 8), mat.bamboo, x, 1.5, z, S);
      }
    }
    const tarpMesh = new THREE.Mesh(new THREE.PlaneGeometry(counterLen + 0.8, 2.6), tarp);
    tarpMesh.position.set(0, 2.7, 0.35);
    tarpMesh.rotation.x = -Math.PI / 2 + 0.2;
    tarpMesh.castShadow = true;
    S.add(tarpMesh);

    // Street props: gas cylinder and a stack of steamer baskets.
    mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 14), mat.gas, counterLen / 2 + 1.1, 0.45, 0.5, S);
    for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.3, 14), mat.bamboo, -counterLen / 2 - 0.9, 0.15 + k * 0.3, 1.6, S);

    // Lanterns hang from the canopy (base set) and extra ones with decor.
    const lanternCount = [1, 2, 3][idx];
    const lanternsBase = new THREE.Group();
    S.add(lanternsBase);
    for (let k = 0; k < lanternCount; k++) {
      const x = (k - (lanternCount - 1) / 2) * 3.4;
      addLantern(lanternsBase, x, 2.4, 0.9, glowParts);
    }

    // Prayer flags: base string on every stage.
    const flagsBase = new THREE.Group();
    S.add(flagsBase);
    const spanX = counterLen / 2 + 0.6;
    addFlagString(flagsBase, flagList, [-spanX, 4.1, 1.1], [spanX, 4.3, 1.1], 0.25, 9 + idx * 2, mat.flags);

    // Decor add-ons (visible once purchased).
    const flagsExtra = new THREE.Group();
    const garland = new THREE.Group();
    const lanternsExtra = new THREE.Group();
    S.add(flagsExtra, garland, lanternsExtra);
    addFlagString(flagsExtra, flagList, [-spanX - 1, 4.4, 1.0], [spanX + 1, 4.6, 1.0], 0.5, 14, mat.flags);
    addFlagString(flagsExtra, flagList, [-spanX - 0.5, 2.9, -4.5], [-spanX + 3, 5.0, -4.5], 0.4, 8, mat.flags);
    addFlagString(flagsExtra, flagList, [spanX - 1, 5.0, -4.5], [spanX + 2, 3.5, -2.0], 0.4, 8, mat.flags);
    // Marigold swags hang from the front edge of the tarp.
    addGarland(garland, [-poleX, 2.42, 1.95], [poleX, 2.42, 1.95], 0.35, 26, mat.marigold);
    for (let k = 0; k < 4; k++) {
      addLantern(lanternsExtra, -counterLen / 2 + 0.5 + k * ((counterLen - 1) / 3), 1.7 + (k % 2) * 0.5, 2.7, glowParts);
    }
    decorGroups = { flags: flagsExtra, garland, lanterns: lanternsExtra };

    stageIdx = idx;
    buildSlots(idx);
  }

  // ----- customers and staff -----
  const custs = new Map();
  const CUSTOMER_LOOKS = {
    shirts: [0xb3262e, 0xe0a02b, 0x2f7d4f, 0x2c5fa8, 0xc24a7e, 0x7a3b8f, 0xf0ead8, 0x3d8a8a],
    pants: [0x2b2b33, 0x3d3a4a, 0x4a3b2a, 0x1f3d4f],
    skin: [0xc98a5c, 0xa86a43, 0xe4b18a, 0x8a5a3a],
  };

  function spawnCustomer(c) {
    const r = seededRandom(c.look + 13);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const h = makeHuman({
      shirt: pick(CUSTOMER_LOOKS.shirts),
      pants: pick(CUSTOMER_LOOKS.pants),
      skin: pick(CUSTOMER_LOOKS.skin),
      topi: r() < 0.35,
    }, mat);
    h.root.userData.pick = { type: 'customer', id: c.id };
    h.root.position.set(-13, 0, 4.2 + r() * 1.2);
    h.root.rotation.y = Math.PI / 2;
    h.id = c.id;
    h.target.copy(h.root.position);
    scene.add(h.root);
    custs.set(c.id, h);
    return h;
  }

  function queueSlot(i) {
    const col = i % 5, row = Math.floor(i / 5);
    return new THREE.Vector3((col - 2) * 1.2 + (row % 2 ? 0.5 : 0), 0, 3.0 + row * 1.35);
  }

  function removeCustomer(id) {
    const h = custs.get(id);
    if (!h) return;
    scene.remove(h.root);
    h.root.traverse((o) => o.geometry && o.geometry.dispose());
    custs.delete(id);
  }

  const chefs = [], servers = [];
  function buildStaff() {
    for (let i = 0; i < 2; i++) {
      const h = makeHuman({ shirt: 0xf5f3ec, pants: 0x30343a, skin: 0xb07a50, topi: true, apron: mat.apron, white: true }, mat);
      h.root.position.set(-1.1 + i * 2.2, 0, -1.9);
      h.root.rotation.y = Math.PI;
      h.root.visible = false;
      scene.add(h.root);
      chefs.push(h);
    }
    for (let i = 0; i < 3; i++) {
      const h = makeHuman({ shirt: 0x5b1f2b, pants: 0x1f2b3a, skin: 0xc98a5c, topi: false, apron: mat.darkWood }, mat);
      h.root.position.set(-2.8 + i * 2.8, 0, 2.0);
      h.root.rotation.y = Math.PI;
      h.root.visible = false;
      scene.add(h.root);
      servers.push(h);
    }
  }
  buildStaff();

  // ----- public API -----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let size = { w: 1, h: 1 };
  const tmp = new THREE.Vector3();

  // insets are the screen pixels covered by UI on the right, bottom and top.
  function setSize(w, h, insetR = 0, insetB = 0, insetT = 0) {
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = w / h < 0.9;
    cam.dist = portrait ? 19 : 12.5;
    cam.height = portrait ? 4.6 : 3.6;
    const baseY = portrait ? 2.4 : 3.0;
    const visH = 2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    // Move the look point so the stall is centred in the area the UI leaves free.
    const freeX = (w - insetR) / 2;
    const freeY = (insetT + (h - insetB)) / 2;
    cam.look.set(((w / 2 - freeX) / w) * visW, baseY - ((h / 2 - freeY) / h) * visH, 0);
    camera.updateProjectionMatrix();
    steamMat.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }

  function setStage(s) {
    if (s.stage !== stageIdx) buildStage(s.stage);
  }

  function syncSlots(s) {
    if (s.stage !== stageIdx) buildStage(s.stage);
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i];
      const st = s.slots[i];
      const owned = i < s.baskets;
      sl.basket.visible = owned;
      if (!owned || !st) {
        sl.fire.visible = false;
        sl.ready.visible = false;
        sl.momos.forEach((m) => (m.visible = false));
        sl.lid.visible = false;
        continue;
      }
      const cooking = st.state === 'cooking';
      const ready = st.state === 'ready';
      sl.lid.visible = cooking;
      sl.fire.visible = cooking;
      sl.ready.visible = ready;
      sl.item = st.item;
      sl.momos.forEach((m, k) => {
        m.visible = ready && k < st.count;
        if (m.visible && m.material !== momoMats[st.item]) m.material = momoMats[st.item];
      });
    }
    // Customers: positions follow queue order; served/left ones walk off.
    const ids = new Set();
    s.queue.forEach((c, idx) => {
      ids.add(c.id);
      let h = custs.get(c.id);
      if (!h) h = spawnCustomer(c);
      if (!h.exiting) h.target.copy(queueSlot(idx));
    });
    for (const [id, h] of custs) {
      if (!ids.has(id) && !h.exiting) exitCustomer(id, 1);
    }
  }

  function exitCustomer(id, dir) {
    const h = custs.get(id);
    if (!h || h.exiting) return;
    h.exiting = true;
    h.exitDir = dir;
    h.target.set(dir * 13, 0, 4.5);
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case 'served': exitCustomer(ev.id, 1); break;
      case 'left': exitCustomer(ev.id, -1); break;
      case 'cookAct': {
        const h = chefs.find((c) => c.act <= 0) || chefs[0];
        if (h) h.act = 0.9;
        break;
      }
      case 'serveAct': {
        const h = servers.find((c) => c.act <= 0) || servers[0];
        if (h) h.act = 0.8;
        break;
      }
      default: break;
    }
  }

  function syncStaff(s) {
    chefs.forEach((h, i) => (h.root.visible = i < s.staff.cook));
    servers.forEach((h, i) => (h.root.visible = i < s.staff.waiter));
  }

  function syncDecor(s) {
    if (decorGroups.flags) decorGroups.flags.visible = s.decor.flags;
    if (decorGroups.garland) decorGroups.garland.visible = s.decor.garland;
    if (decorGroups.lanterns) decorGroups.lanterns.visible = s.decor.lanterns;
    stallGlow.intensity = s.decor.lanterns ? 12 : 9;
  }

  function update(s, dt, time) {
    syncStaff(s);
    syncDecor(s);
    // Cooking steamers emit steam; fires and ready beacons pulse.
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i];
      const st = s.slots[i];
      if (!sl.basket.visible || !st) continue;
      if (st.state === 'cooking') {
        steamAcc[i] += dt * 9;
        while (steamAcc[i] >= 1) {
          steamAcc[i] -= 1;
          emitSteam(sl.group.position.x, COUNTER_H + 1.2, sl.group.position.z);
        }
        sl.fire.material.opacity = 0.75 + Math.sin(time * 14 + i) * 0.2;
      } else {
        steamAcc[i] = 0;
      }
      if (sl.ready.visible) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        sl.ready.scale.setScalar(1.1 + pulse * 0.5);
        sl.ready.material.opacity = 0.5 + pulse * 0.5;
      }
    }
    updateSteam(dt);
    updateFlags(time);

    // Customers walk toward their targets and despawn once they exit.
    for (const [id, h] of custs) {
      const dx = h.target.x - h.root.position.x;
      const dz = h.target.z - h.root.position.z;
      const d = Math.hypot(dx, dz);
      h.moving = d > 0.05;
      if (h.moving) {
        const step = Math.min(d, h.speed * dt);
        h.root.position.x += (dx / d) * step;
        h.root.position.z += (dz / d) * step;
        const want = Math.atan2(dx, dz);
        h.root.rotation.y += Math.atan2(Math.sin(want - h.root.rotation.y), Math.cos(want - h.root.rotation.y)) * Math.min(1, dt * 8);
      } else if (!h.exiting) {
        const want = Math.PI;
        h.root.rotation.y += Math.atan2(Math.sin(want - h.root.rotation.y), Math.cos(want - h.root.rotation.y)) * Math.min(1, dt * 4);
      }
      animateHuman(h, time + h.phase, dt);
      if (h.exiting && Math.abs(h.root.position.x) > 12.5) removeCustomer(id);
    }
    for (const h of [...chefs, ...servers]) {
      if (!h.root.visible) continue;
      if (h.act > 0) h.act -= dt;
      h.moving = false;
      animateHuman(h, time + h.phase, dt);
      if (h.act > 0) {
        h.arms[1].rotation.x = -1.2 + Math.sin(time * 16) * 0.5;
      }
    }
    // Gentle camera sway toward the drag offset.
    cam.yaw += (cam.dragYaw - cam.yaw) * Math.min(1, dt * 6);
    camera.position.set(Math.sin(cam.yaw) * cam.dist + cam.look.x, cam.height, Math.cos(cam.yaw) * cam.dist);
    camera.lookAt(cam.look);
    // Lantern glow flicker.
    stallGlow.intensity = (s.decor.lanterns ? 12 : 9) * (0.96 + Math.sin(time * 7.3) * 0.02);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function toScreen(v) {
    tmp.copy(v).project(camera);
    return {
      x: ((tmp.x + 1) / 2) * size.w,
      y: ((1 - tmp.y) / 2) * size.h,
      visible: tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2,
    };
  }

  function customerScreen(id) {
    const h = custs.get(id);
    if (!h || h.exiting) return null;
    tmp.set(h.root.position.x, 2.6, h.root.position.z);
    return toScreen(tmp);
  }

  function slotScreen(i) {
    const sl = slots[i];
    if (!sl || !sl.basket.visible) return null;
    // Back-row steamers get their badge lifted so the two rows do not overlap.
    const lift = sl.group.position.z < 0 ? 0.9 : 0;
    const p = new THREE.Vector3(sl.group.position.x, COUNTER_H + 1.0 + lift, sl.group.position.z);
    return toScreen(p);
  }

  function pick(clientX, clientY, rect) {
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([stageGroup, slotGroup, ...custs.values()].map((h) => (h.root ? h.root : h)), true);
    for (const hit of hits) {
      let o = hit.object;
      while (o) {
        if (o.userData && o.userData.pick) return o.userData.pick;
        o = o.parent;
      }
    }
    return null;
  }

  function dragYaw(dx) {
    cam.dragYaw = clamp(cam.dragYaw + dx * 0.004, -0.45, 0.45);
  }

  function resetYaw() {
    cam.dragYaw = 0;
  }

  return {
    renderer, scene, camera,
    setSize, setStage, syncSlots, handleEvent, update, render,
    customerScreen, slotScreen, pick, dragYaw, resetYaw,
    get slotCount() { return slots.length; },
    dispose() {
      renderer.dispose();
    },
  };
}
