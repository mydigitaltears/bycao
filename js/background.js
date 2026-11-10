// Default images, used on any page whose #bg has no data-images list
// Paths are relative to the HTML page, not to this JS file
const DEFAULT_IMAGES = [
  "images/black_bg.jpg",
  "images/red_bg.jpg",
  "images/blue_bg.jpg",
  "images/white_bg.jpg",
];
const INTERVAL_MS = 5000; // time between changes
const FADE_MS = 1500;     // length of the fade; keep it shorter than the interval

const bg = document.getElementById("bg");

// Each page can list its own images, for example data-images="a.jpg, b.jpg"
const images = bg.dataset.images
  ? bg.dataset.images.split(",").map((path) => path.trim()).filter(Boolean)
  : DEFAULT_IMAGES;

const layers = images.map((src) => {
  const layer = document.createElement("div");
  layer.style.backgroundImage = `url("${src}")`;
  layer.style.transition = `opacity ${FADE_MS}ms ease`;
  bg.append(layer);
  return layer;
});

let current = 0;
let top = 1;
layers[current].classList.add("active");

// A page with only one image keeps it still
if (layers.length > 1) {
  setInterval(() => {
    const previous = layers[current];
    current = (current + 1) % layers.length;

    // The new image fades in on top, and the old one is hidden once it's covered
    layers[current].style.zIndex = ++top;
    layers[current].classList.add("active");
    setTimeout(() => previous.classList.remove("active"), FADE_MS);
  }, INTERVAL_MS);
}