const PROJECTS = {
  "alouette": {
    title: "Les Louanges - Alouette!",
    text: "Short description of the project.",
    folder: "images/1-alouette",
    count: 26,
    pattern: [2, 3, 1, 3],
  },
  "loup-garou": {
    title: "Lou-Adriane Cassidy - Journal d'un Loup-Garou",
    text: "Short description of the project.",
    folder: "images/2-loup-garou",
    count: 31,
    pattern: [2, 3, 1, 3],
  },
  "emotions": {
    title: "CRi - Émotions",
    text: "Short description of the project.",
    folder: "images/3-emotions",
    count: 10,
    pattern: [2, 3, 1, 3],
  },
  "luan": {
    title: "Luan Larobina",
    text: "Short description of the project.",
    folder: "images/4-luan",
    count: 10,
    pattern: [2, 3, 1, 3],
  },
  "transit": {
    title: "blesse - Transit",
    text: "Short description of the project.",
    folder: "images/5-transit",
    count: 10,
    pattern: [2, 3, 1, 3],
  },
  "corpos": {
    title: "Corpos - Musique",
    text: "Short description of the project.",
    sections: [
      {
        subtitle: "Les 21 clients - LES FRANCOUVERTES",
        folder: "images/6-corpos/LES_21-Client-LES_FRANCOUVERTES",
        count: 15,
        pattern: [2, 3, 1, 3],
      },
      {
        subtitle: "NOUVELLES ONDES - SiriusXM",
        folder: "images/6-corpos/NOUVELLES_ONDES-client_SIRIUS_XM",
        count: 12,
        pattern: [3, 2],
      },
    ],
  },
  "clips": {
    title: "Vidéoclips & Captation",
    text: "Short description of the project.",
    folder: "images/7-clips",
    count: 10,
    pattern: [2, 3, 1, 3],
  },
};

const dialog = document.getElementById("project-dialog");
const content = document.getElementById("project-content");
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");
let fromGrid = false; // true if opened by clicking a card on this page
let renderId = 0;     // ignores a slow load if another project was opened since

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a missing file is skipped
    img.src = src;
  });
}

function buildMosaic(imgs, pattern) {
  const mosaic = document.createElement("div");
  mosaic.className = "mosaic";
  let i = 0;
  let p = 0;
  while (i < imgs.length) {
    const size = pattern[p % pattern.length];
    const row = document.createElement("div");
    row.className = "mosaic-row";
    for (const img of imgs.slice(i, i + size)) {
      const ratio = img.naturalWidth / img.naturalHeight;
      img.style.flexGrow = ratio;    // wider images get more of the row
      img.style.aspectRatio = ratio; // this makes the whole row the same height
      row.append(img);
    }
    mosaic.append(row);
    i += size;
    p++;
  }
  return mosaic;
}

async function render() {
  const id = ++renderId;
  const project = PROJECTS[location.hash.slice(1)];
  if (!project) {
    if (dialog.open) dialog.close();
    return;
  }

  content.innerHTML = `
    <h2>${project.title}</h2>
    <p>${project.text}</p>
  `;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;

  // A project without sections is treated as one section
  const sections = project.sections || [project];
  const loaded = await Promise.all(sections.map((section) => {
    const paths = Array.from({ length: section.count }, (_, i) =>
      `${section.folder}/${i + 1}.jpg`
    );
    return Promise.all(paths.map(loadImage));
  }));
  if (id !== renderId) return;

  sections.forEach((section, n) => {
    if (section.subtitle) {
      const heading = document.createElement("h3");
      heading.textContent = section.subtitle;
      content.append(heading);
    }

    const imgs = loaded[n].filter(Boolean);
    const label = section.subtitle ? `${project.title}, ${section.subtitle}` : project.title;
    imgs.forEach((img, i) => { img.alt = `${label}, image ${i + 1}`; });
    content.append(buildMosaic(imgs, section.pattern));
  });
}

// Click outside the panel closes it
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

window.addEventListener("hashchange", render);
render(); // opens the right project if the page loads with a #project link

// Fullscreen view
function showInLightbox(img) {
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
}

content.addEventListener("click", (e) => {
  if (!e.target.matches(".mosaic img")) return;
  showInLightbox(e.target);
  lightbox.showModal();
});

lightbox.addEventListener("click", () => lightbox.close());

// Left and right arrow keys move between images
lightbox.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const all = [...content.querySelectorAll(".mosaic img")];
  const i = all.findIndex((img) => img.src === lightboxImg.src);
  const step = e.key === "ArrowRight" ? 1 : -1;
  showInLightbox(all[(i + step + all.length) % all.length]);
});