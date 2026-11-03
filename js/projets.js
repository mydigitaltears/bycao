const PROJECTS = {
  "alouette": {
    title: "Les Louanges - Alouette!",
    images: ["images/mosaiques/alouette.jpg"],
  },
  "loup-garou": {
    title: "Lou-Adriane Cassidy - Journal d'un Loup-Garou",
    images: ["images/mosaiques/loup-garou.jpg"],
  },
  "emotions": {
    title: "CRi - Émotions",
    images: ["images/mosaiques/emotions.jpg"],
  },
  "luan": {
    title: "Luan Larobina",
    images: ["images/mosaiques/luan.jpg"],
  },
  "transit": {
    title: "blesse - Transit",
    images: ["images/mosaiques/transit.jpg"],
  },
  "corpos": {
    title: "Corpos - Musique",
    images: [
      "images/mosaiques/corpos-les-21.jpg",
      "images/mosaiques/corpos-nouvelles-ondes.jpg",
    ],
  },
  "clips": {
    title: "Vidéoclips & Captation",
    images: [
      "images/mosaiques/clips-alex-burger.jpg",
      "images/mosaiques/clips-karkwa.jpg",
      "images/mosaiques/clips-les-louanges.jpg",
    ],
  },
};

const ANIMATION_MS = 350;

const viewer = document.getElementById("viewer");
const viewerImages = document.getElementById("viewer-images");
let renderId = 0;     // ignores a slow load if another project was opened since
let cardImg = null;   // the cover the image grows from and shrinks back to
let closing = false;

// The transform that makes the image sit on top of its cover
function coverTransform(img) {
  if (!cardImg) return "scale(0.92)"; // opened from a direct link, so there's no cover
  const from = cardImg.getBoundingClientRect();
  const to = img.getBoundingClientRect();
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${x}px, ${y}px) scale(${from.width / to.width})`;
}

function closeViewer() {
  if (!viewer.open || closing) return;
  closing = true;
  viewer.classList.add("closing");

  // Shrinks whichever image is currently on screen
  const images = viewerImages.querySelectorAll("img");
  const img = images[Math.round(viewer.scrollTop / viewer.clientHeight)];
  const animation = img.animate(
    [{ transform: "none", opacity: 1 }, { transform: coverTransform(img), opacity: 0 }],
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

  const images = project.images.map((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${project.title}, image ${i + 1}`;
    return img;
  });

  // Waits for the images, so they're ready to animate instead of popping in
  await Promise.all(images.map((img) => img.decode().catch(() => {})));
  if (id !== renderId) return;

  cardImg = document.querySelector(`.project-card[href="#${key}"] img`);
  viewerImages.replaceChildren(...images.map((img) => {
    const page = document.createElement("div");
    page.className = "viewer-page";
    page.append(img);
    return page;
  }));

  if (!viewer.open) viewer.showModal();
  viewer.scrollTop = 0;

  images[0].animate(
    [{ transform: coverTransform(images[0]) }, { transform: "none" }],
    { duration: ANIMATION_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  );
}

viewer.querySelector(".close").addEventListener("click", closeViewer);

// Clicking anywhere except the image closes it
viewer.addEventListener("click", (e) => {
  if (e.target.tagName !== "IMG") closeViewer();
});

// Esc also uses the closing animation
viewer.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeViewer();
});

viewer.addEventListener("close", () => {
  if (location.hash) history.replaceState(null, "", location.pathname);
});

window.addEventListener("hashchange", render);
render(); // opens the right project if the page loads with a #project link