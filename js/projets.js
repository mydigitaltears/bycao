// A slide is an image path, { youtube: "VIDEO_ID" },
// or a mosaic: { folder: "images/...", count: 26, seed: 1, big: [3], cut: [4, 5], swap: [[2, 9]] }
const PROJECTS = {
  "alouette": {
    title: "Les Louanges - Alouette!",
    slides: [
      { folder: "images/1-alouette", count: 26, seed: 1, // containders: 1, 17
        //big: [22],
        cut: [1, 2, 3, 4, 5, 7, 9, 10, 14, 19, 20],
        swap: [[22,17], [18,24]] },
        
      { folder: "images/1-alouette", count: 26, seed: 17, // containders: 11, 
        //big: [1, 10, 18, 22, 25],
        cut: [1, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26],
        swap: [[2,4], []] },

      { youtube: "BS5XKP53hEA" },
      // { folder: "images/1-alouette", count: 26, seed: 13, // containders: 11, 
      // //big: [1, 10, 18, 22, 25],
      // cut: [1, 4, 5, 6, 7, 8, 11, 12, 13, 14, 16, 17, 20, 26] },
    ],
  },
  "loup-garou": {
    title: "Lou-Adriane Cassidy - Journal d'un Loup-Garou",
    slides: [{ folder: "images/2-loup-garou", count: 31, seed: 1 }],
  },
  "emotions": {
    title: "CRi - Émotions",
    slides: [{ folder: "images/3-emotions", count: 10, seed: 1 }],
  },
  "luan": {
    title: "Luan Larobina",
    slides: [{ folder: "images/4-luan", count: 10, seed: 1 }],
  },
  "transit": {
    title: "blesse - Transit",
    slides: [{ folder: "images/5-transit", count: 10, seed: 1 }],
  },
  "corpos": {
    title: "Corpos - Musique",
    slides: [
      { folder: "images/6-corpos/LES_21-Client-LES_FRANCOUVERTES", count: 15, seed: 1 },
      { folder: "images/6-corpos/NOUVELLES_ONDES-client_SIRIUS_XM", count: 12, seed: 1 },
    ],
  },
  "clips": {
    title: "Vidéoclips & Captation",
    slides: [
      { folder: "images/7-videoclips/ALEX_BURGER-ALLERS-RETOURS", count: 10, seed: 1 },
      { youtube: "VIDEO_ID_1" },
      { folder: "images/7-videoclips/KARKWA-PARFAITE_A_L_ECRAN", count: 5, seed: 1 },
      { youtube: "VIDEO_ID_2" },
      { folder: "images/7-videoclips/LES_LOUANGES-BONNE_CHANCE", count: 10, seed: 1 },
      { youtube: "VIDEO_ID_3" },
    ],
  },
};

const ANIMATION_MS = 350;
const BIG_WEIGHT = 2;        // how strongly "big" images are favored
const VERTICAL_LINES = true;  // true = columns only, false = the old mixed layout
const VARIETY = 0.2;         // how far from the best fit a layout can be and still be picked (0 = always the best)
const MIN_WIDTH = 120;       // preferred smallest image width in pixels
const MIN_WIDTH_PHONE = 70;  // same, on phones

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns a mixed-up copy of a list; the same seed gives the same order
function shuffled(list, seed) {
  const random = seededRandom(seed);
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const weightOf = (items) => items.reduce((sum, item) => sum + (item.big ? BIG_WEIGHT : 1), 0);

const leaf = (item) => ({ item, ratio: item.ratio });

// Joins pieces side by side or in a stack
function chain(nodes, sideBySide) {
  return nodes.reduce((a, b) => ({
    a,
    b,
    sideBySide,
    ratio: sideBySide ? a.ratio + b.ratio : 1 / (1 / a.ratio + 1 / b.ratio),
  }));
}

// Stacks images in rows of 1 to 3, each row spanning the column's full width
function randomColumn(images, random) {
  const rows = [];
  let i = 0;
  while (i < images.length) {
    const roll = random();
    const size = images[i].big ? 1 : roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
    // a big image always gets a row to itself
    const row = images.slice(i, i + size).filter((img, j) => j === 0 || !img.big);
    rows.push(chain(row.map(leaf), true));
    i += row.length;
  }
  return chain(rows, false);
}

// Splits the images into full-height columns, each a stack of rows
function randomColumns(items, target, random) {
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const rest = shuffle(items.filter((item) => !item.big));

  // A big image shares its column with a few others at most, so it stays wide
  const columns = shuffle(items.filter((item) => item.big)).map((item) => {
    const partners = rest.splice(0, Math.floor(random() * 4));
    return randomColumn(shuffle([item, ...partners]), random);
  });

  if (rest.length) {
    const n = rest.length;
    const average = rest.reduce((sum, item) => sum + item.ratio, 0) / n;
    const room = Math.max(0.2, target - columns.reduce((sum, column) => sum + column.ratio, 0));
    const guess = Math.sqrt((n * room) / average);
    const fewest = columns.length ? 1 : Math.min(2, n); // at least two columns, so a vertical line splits the mosaic
    const k = Math.min(n, Math.max(fewest, Math.round(guess * (0.3 + random() * 1.2))));

    const cuts = new Set();
    while (cuts.size < k - 1) cuts.add(1 + Math.floor(random() * (n - 1)));
    const points = [0, ...[...cuts].sort((a, b) => a - b), n];
    for (let c = 0; c < k; c++) {
      columns.push(randomColumn(rest.slice(points[c], points[c + 1]), random));
    }
  }
  return chain(shuffle(columns), true);
}

// True if row edges line up across every column, which would read as a horizontal line
function hasFullWidthLine(placed) {
  const tops = placed.filter((p) => p.y > 0.001).map((p) => p.y);
  return tops.some((y) =>
    placed.filter((p) => Math.abs(p.y - y) < 0.01).reduce((sum, p) => sum + p.w, 0) > 0.98
  );
}

// Randomly splits the images into side-by-side and stacked groups
function randomTree(items, target, random) {
  if (items.length === 1) return { item: items[0], ratio: items[0].ratio };

  const n = items.length;
  const total = weightOf(items);
  const goal = total * (0.25 + random() * 0.5);

  // Split by weight, so big images end up alone early and get more space
  let k = 0;
  let sum = 0;
  while (k < n - 1 && sum + (items[k].big ? BIG_WEIGHT : 1) / 2 < goal) {
    sum += items[k].big ? BIG_WEIGHT : 1;
    k++;
  }
  k = Math.max(1, k);

  const share = weightOf(items.slice(0, k)) / total;
  const sideBySide = (target > 1) === (random() > 0.15);

  const a = randomTree(items.slice(0, k), sideBySide ? target * share : target / share, random);
  const b = randomTree(items.slice(k), sideBySide ? target * (1 - share) : target / (1 - share), random);
  const ratio = sideBySide ? a.ratio + b.ratio : 1 / (1 / a.ratio + 1 / b.ratio);
  return { a, b, sideBySide, ratio };
}

// Turns a tree into positions, as fractions of the mosaic's size
function placeTree(node, x, y, w, h, out) {
  if (node.item) {
    out.push({ item: node.item, x, y, w, h });
    return;
  }
  if (node.sideBySide) {
    const wa = (w * node.a.ratio) / node.ratio;
    placeTree(node.a, x, y, wa, h, out);
    placeTree(node.b, x + wa, y, w - wa, h, out);
  } else {
    const ha = (h * node.ratio) / node.a.ratio;
    placeTree(node.a, x, y, w, ha, out);
    placeTree(node.b, x, y + ha, w, h - ha, out);
  }
}

// Tries many arrangements, then lets the seed pick among the ones that fit best
function bestLayout(items, target, seed, minWidth) {
  const random = seededRandom(seed);
  const hasBig = items.some((item) => item.big);
  const tries = hasBig ? 3000 : 1500;
  const candidates = [];
  let bestScore = Infinity;

  for (let t = 0; t < tries; t++) {
    const tree = VERTICAL_LINES ? randomColumns(items, target, random) : randomTree(items, target, random);
    const placed = [];
    placeTree(tree, 0, 0, 1, 1, placed);
    if (VERTICAL_LINES && items.length > 1 && hasFullWidthLine(placed)) continue;

    const shares = placed.map((p) => p.w * p.h * items.length);

    let score =
      Math.abs(Math.log(tree.ratio / target)) * 10 +              // fits the box
      Math.max(0, 0.25 - Math.min(...shares)) * 2 +               // no tiny images
      Math.max(0, minWidth - Math.min(...placed.map((p) => p.w))) * 20; // minimum width

    if (hasBig) {
      // Every chosen image should be clearly larger than all the others
      const bigShares = shares.filter((_, i) => placed[i].item.big);
      const otherShares = shares.filter((_, i) => !placed[i].item.big);
      score += Math.max(0, Math.max(...otherShares) * 1.3 - Math.min(...bigShares));
    } else {
      score += Math.max(0, 3 - Math.max(...shares)) * 0.05; // some big images
    }

    candidates.push({ score, placed });
    bestScore = Math.min(bestScore, score);
  }

  const good = candidates.filter((c) => c.score <= bestScore + VARIETY);
  if (!good.length) {
    // every attempt was thrown out, so fall back to plain columns
    const placed = [];
    placeTree(chain(items.map(leaf), true), 0, 0, 1, 1, placed);
    return placed;
  }
  return good[Math.floor(random() * good.length)].placed;
}

function layoutMosaic(mosaic) {
  const imgs = [...mosaic.querySelectorAll("img")];
  if (!imgs.length) return;

  // Phones held upright scroll, because the images would be too small otherwise
  const narrow = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
  mosaic.style.height = narrow ? `${Math.round((mosaic.clientWidth * imgs.length) / 5)}px` : "";

  const W = mosaic.clientWidth;
  const H = mosaic.clientHeight;
  const items = imgs.map((img) => ({
    img,
    ratio: img.naturalWidth / img.naturalHeight,
    big: img.dataset.big === "true",
  }));
  const minWidth = (narrow ? MIN_WIDTH_PHONE : MIN_WIDTH) / W;

  // Work out where each image goes
  const boxes = new Map();
  for (const { item, x, y, w, h } of bestLayout(items, W / H, Number(mosaic.dataset.seed), minWidth)) {
    const left = Math.round(x * W);
    const top = Math.round(y * H);
    boxes.set(item.img, {
      left,
      top,
      width: Math.round((x + w) * W) - left,
      height: Math.round((y + h) * H) - top,
    });
  }

  // Trade places for each pair listed in "swap"
  const byNumber = (n) => imgs.find((img) => img.dataset.n === String(n));
  for (const [first, second] of JSON.parse(mosaic.dataset.swap || "[]")) {
    const a = byNumber(first);
    const b = byNumber(second);
    if (!a || !b) continue; // a number that isn't in this mosaic is ignored
    const boxA = boxes.get(a);
    boxes.set(a, boxes.get(b));
    boxes.set(b, boxA);
  }

  for (const [img, box] of boxes) {
    img.style.left = `${box.left}px`;
    img.style.top = `${box.top}px`;
    img.style.width = `${box.width}px`;
    img.style.height = `${box.height}px`;
  }
}

const viewer = document.getElementById("viewer");
const slidesEl = document.getElementById("viewer-images");
const prevButton = viewer.querySelector(".viewer-arrow.prev");
const nextButton = viewer.querySelector(".viewer-arrow.next");
let renderId = 0;     // ignores a slow load if another project was opened since
let cardImg = null;   // the cover the image grows from and shrinks back to
let closing = false;
let current = 0;      // index of the slide on screen

const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");

// The zoomable images in the mosaic on screen, read column by column
function mosaicImages() {
  const mosaic = slidesEl.children[current]?.querySelector(".mosaic");
  if (!mosaic) return [];
  return [...mosaic.querySelectorAll("img")].sort((a, b) =>
    a.offsetLeft - b.offsetLeft || a.offsetTop - b.offsetTop
  );
}

function showInLightbox(img) {
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
}

// Clicking an image in a mosaic zooms on it
slidesEl.addEventListener("click", (e) => {
  const img = e.target.closest(".mosaic img");
  if (!img) return;
  showInLightbox(img);
  lightbox.showModal();
});

lightbox.addEventListener("click", () => lightbox.close());

const layoutAll = () => slidesEl.querySelectorAll(".mosaic").forEach(layoutMosaic);

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (viewer.open) layoutAll(); }, 150);
});

// The transform that makes a slide sit on top of its cover
function coverTransform(el) {
  if (!cardImg) return "scale(0.92)"; // opened from a direct link, so there's no cover
  const from = cardImg.getBoundingClientRect();
  const to = el.getBoundingClientRect();
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${x}px, ${y}px) scale(${from.width / to.width})`;
}

// The mosaic, image or video frame inside a slide
const slideContent = (page) => page.querySelector(".mosaic, img, .video-frame");

function buildSlide(slide, i, title) {
  const page = document.createElement("div");
  page.className = "viewer-page";

  if (slide.folder) {
    // Images fitted together to fill the screen
    page.classList.add("mosaic-page");
    const mosaic = document.createElement("div");
    mosaic.className = "mosaic";
    mosaic.dataset.seed = slide.seed || 1;
    if (slide.swap) mosaic.dataset.swap = JSON.stringify(slide.swap);
    const imgs = [];
    for (let n = 1; n <= slide.count; n++) {
      if (slide.cut?.includes(n)) continue;
      const img = document.createElement("img");
      img.src = `${slide.folder}/${n}.jpg`;
      img.alt = `${title}, image ${n}`;
      img.dataset.n = n;
      if (slide.big?.includes(n)) img.dataset.big = "true";
      imgs.push(img);
    }
    mosaic.append(...shuffled(imgs, Number(mosaic.dataset.seed) + 500));
    page.append(mosaic);
  } else if (typeof slide === "string") {
    const img = document.createElement("img");
    img.src = slide;
    img.alt = `${title}, image ${i + 1}`;
    page.append(img);
  } else {
    const frame = document.createElement("div");
    frame.className = "video-frame";
    frame.dataset.youtube = slide.youtube;
    frame.dataset.title = title;
    page.append(frame);
  }
  return page;
}

// Only the video on screen is loaded, so leaving a slide stops its video
function updateSlides() {
  const pages = [...slidesEl.children];
  pages.forEach((page, i) => {
    const frame = page.querySelector(".video-frame");
    if (!frame) return;
    if (i !== current) {
      frame.replaceChildren();
    } else if (!frame.firstChild) {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${frame.dataset.youtube}`;
      iframe.title = frame.dataset.title;
      iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture";
      iframe.referrerPolicy = "strict-origin-when-cross-origin"; // YouTube requires this
      iframe.allowFullscreen = true;
      frame.append(iframe);
    }
  });
  prevButton.hidden = current === 0;
  nextButton.hidden = current >= pages.length - 1;
}

function goToSlide(index) {
  if (index < 0 || index >= slidesEl.children.length) return;
  slidesEl.scrollTo({ left: index * slidesEl.clientWidth, behavior: "smooth" });
}

// Scrolling covers the arrows, the keyboard and swiping on a phone
slidesEl.addEventListener("scroll", () => {
  if (!viewer.open) return;
  const index = Math.round(slidesEl.scrollLeft / slidesEl.clientWidth);
  if (index === current) return;
  current = index;
  updateSlides();
});

prevButton.addEventListener("click", () => goToSlide(current - 1));
nextButton.addEventListener("click", () => goToSlide(current + 1));

document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const step = e.key === "ArrowRight" ? 1 : -1;

  if (lightbox.open) {
    e.preventDefault();
    const all = mosaicImages();
    const i = all.findIndex((img) => img.src === lightboxImg.src);
    showInLightbox(all[(i + step + all.length) % all.length]);
    return;
  }

  if (!viewer.open || closing) return;
  e.preventDefault();
  goToSlide(current + step);
});

function closeViewer() {
  if (!viewer.open || closing) return;
  closing = true;
  viewer.classList.add("closing");

  // Shrinks whichever slide is currently on screen
  const el = slideContent(slidesEl.children[current]);
  const animation = el.animate(
    [{ transform: "none" }, { transform: coverTransform(el) }],
    { duration: ANIMATION_MS, easing: "ease-in", fill: "forwards" }
  );
  animation.finished.then(() => {
    viewer.close();
    viewer.classList.remove("closing");
    closing = false;
  });
}

async function render() {
  const id = ++renderId;
  const key = location.hash.slice(1);
  const project = PROJECTS[key];
  if (!project) {
    closeViewer();
    return;
  }

  const pages = project.slides.map((slide, i) => buildSlide(slide, i, project.title));

  // Waits for the images, so they're ready to animate instead of popping in
  const images = pages.flatMap((page) => [...page.querySelectorAll("img")]);
  await Promise.all(images.map((img) => img.decode().catch(() => {})));
  if (id !== renderId) return;

  // A missing file is skipped instead of showing a broken image
  images.filter((img) => !img.naturalWidth && img.closest(".mosaic")).forEach((img) => img.remove());

  cardImg = document.querySelector(`.project-card[href="#${key}"] img`);
  slidesEl.replaceChildren(...pages);

  if (!viewer.open) viewer.showModal();
  pages.forEach((page) => { page.scrollTop = 0; });
  slidesEl.scrollLeft = 0;
  current = 0;
  updateSlides();
  layoutAll();

  const first = slideContent(pages[0]);
  first.animate(
    [{ transform: coverTransform(first) }, { transform: "none" }],
    { duration: ANIMATION_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  );
}

viewer.querySelector(".close").addEventListener("click", closeViewer);

// Clicking beside the image or video closes it
viewer.addEventListener("click", (e) => {
  if (e.target.classList.contains("viewer-page")) closeViewer();
});

// Esc also uses the closing animation
viewer.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeViewer();
});

viewer.addEventListener("close", () => {
  if (lightbox.open) lightbox.close();
  slidesEl.replaceChildren(); // also stops any video
  if (location.hash) history.replaceState(null, "", location.pathname);
});

window.addEventListener("hashchange", render);
render(); // opens the right project if the page loads with a #project link


// --- TEMPORARY seed box: delete this whole block before publishing ---
function addSeedBox(page) {
  const mosaic = page.querySelector(".mosaic");
  if (!mosaic || page.querySelector(".seed-box")) return;

  page.style.position = "relative";
  const box = document.createElement("label");
  box.className = "seed-box";
  box.style.cssText =
    "position: absolute; left: 50%; bottom: 0.5rem; transform: translateX(-50%); z-index: 2; " +
    "display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0.75rem; " +
    "background: rgb(0 0 0 / 0.8); color: white; font: 14px system-ui, sans-serif;";

  const input = document.createElement("input");
  input.type = "number";
  input.min = 1;
  input.value = mosaic.dataset.seed;
  input.style.cssText = "width: 6rem; font: inherit;";

  const fileNumber = (img) => Number(img.src.match(/(\d+)\.jpg$/)[1]);

  input.addEventListener("input", () => {
    const seed = Number(input.value);
    if (!seed) return;
    const original = [...mosaic.querySelectorAll("img")].sort((a, b) => fileNumber(a) - fileNumber(b));
    mosaic.dataset.seed = seed;
    mosaic.append(...shuffled(original, seed + 500));
    layoutMosaic(mosaic);
  });

  // Keeps the arrow keys in the box instead of changing slides
  input.addEventListener("keydown", (e) => e.stopPropagation());

  box.append("seed", input);
  page.append(box);
}

new MutationObserver(() => {
  slidesEl.querySelectorAll(".mosaic-page").forEach(addSeedBox);
}).observe(slidesEl, { childList: true });
// --- end of temporary seed box ---