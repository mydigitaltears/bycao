// Paths are relative to the HTML page, not to this JS file
const IMAGES = [
  "images/red_bg.jpg",
  "images/blue_bg.jpg",
  "images/black_bg.jpg",
];
const BRUSH = 100;      // size of the square around the mouse (px)
const CELL = 30;        // grid resolution (px); smaller = smoother edges
const THRESHOLD = 0.6;  // reveal this fraction, then the rest fades in
const FADE_MS = 0;    // duration of that fade
const PROTECTED = ".desc"; // elements whose background is never erased

const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

let images = [];
let layers = [];
let cols, rows, grid, dpr;
let base = 0;            // image currently fully shown
let revealedCount = 0;   // cells of the next image uncovered so far
let fading = false;
let last = null;
let protectedCells = new Set(); // cells behind .keep-bg elements

const next = () => (base + 1) % layers.length;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draw an image scaled to cover the whole area (like background-size: cover)
function coverCanvas(img, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  c.getContext("2d").drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

function setup() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  layers = images.map((img) => coverCanvas(img, canvas.width, canvas.height));
  cols = Math.ceil(w / CELL);
  rows = Math.ceil(h / CELL);
  grid = new Uint8Array(cols * rows); // 1 = next image revealed in this cell
  revealedCount = 0;
  last = null;

  ctx.drawImage(layers[base], 0, 0);
  updateProtected();
}

function drawCell(i, layer = layers[next()]) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x0 = Math.round(col * CELL * dpr);
  const y0 = Math.round(row * CELL * dpr);
  const x1 = Math.round((col + 1) * CELL * dpr);
  const y1 = Math.round((row + 1) * CELL * dpr);
  const w = x1 - x0;
  const h = y1 - y0;
  ctx.drawImage(layer, x0, y0, w, h, x0, y0, w, h);
}

// Find the cells behind .keep-bg elements and restore the current image there
function updateProtected() {
  if (fading) return;
  const cells = new Set();
  for (const el of document.querySelectorAll(PROTECTED)) {
    const r = el.getBoundingClientRect();
    const c0 = Math.max(0, Math.floor(r.left / CELL));
    const c1 = Math.min(cols - 1, Math.floor((r.right - 1) / CELL));
    const r0 = Math.max(0, Math.floor(r.top / CELL));
    const r1 = Math.min(rows - 1, Math.floor((r.bottom - 1) / CELL));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) cells.add(row * cols + col);
    }
  }
  // Areas that scrolled under a protected element go back to the current image
  for (const i of cells) {
    if (grid[i]) {
      grid[i] = 0;
      revealedCount--;
      drawCell(i, layers[base]);
    }
  }
  protectedCells = cells;
}

// Add every cell covered by a square centered on (x, y)
function collectCells(x, y, set) {
  const half = BRUSH / 2;
  const c0 = Math.max(0, Math.floor((x - half) / CELL));
  const c1 = Math.min(cols - 1, Math.floor((x + half) / CELL));
  const r0 = Math.max(0, Math.floor((y - half) / CELL));
  const r1 = Math.min(rows - 1, Math.floor((y + half) / CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) set.add(r * cols + c);
  }
}

// Fade the rest of the next image in, then make it the new base
function completeReveal() {
  fading = true;
  const snapshot = document.createElement("canvas");
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext("2d").drawImage(canvas, 0, 0);

  const target = layers[next()];
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / FADE_MS);
    ctx.globalAlpha = 1;
    ctx.drawImage(snapshot, 0, 0);
    ctx.globalAlpha = t;
    ctx.drawImage(target, 0, 0);
    ctx.globalAlpha = 1;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      base = next();
      grid.fill(0);
      revealedCount = 0;
      fading = false;
    }
  }
  requestAnimationFrame(frame);
}

function onMove(e) {
  const x = e.clientX;
  const y = e.clientY;
  if (fading) {
    last = { x, y };
    return;
  }

  const cells = new Set();

  // Fill in the path between moves so fast swipes don't leave gaps
  if (last) {
    const dist = Math.hypot(x - last.x, y - last.y);
    const steps = Math.ceil(dist / CELL);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      collectCells(last.x + (x - last.x) * t, last.y + (y - last.y) * t, cells);
    }
  }
  collectCells(x, y, cells);

  updateProtected();

  // Reveal only: a cell already showing the next image stays as it is
  for (const i of cells) {
    if (!grid[i] && !protectedCells.has(i)) {
      grid[i] = 1;
      revealedCount++;
      drawCell(i);
    }
  }
  last = { x, y };

  const erasable = grid.length - protectedCells.size;
  if (erasable > 0 && revealedCount / erasable >= THRESHOLD) completeReveal();
}

Promise.all(IMAGES.map(loadImage)).then((loaded) => {
  images = loaded;
  setup();

  window.addEventListener("pointermove", onMove);
  window.addEventListener("scroll", updateProtected, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => {
    last = null;
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setup, 150); // keeps the current image, clears the reveal
  });
});