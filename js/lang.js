const LANGUAGES = ["fr", "en"];

function setLanguage(lang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch (e) {
    // the choice just won't be remembered
  }

  const title = document.documentElement.dataset[`title${lang === "fr" ? "Fr" : "En"}`];
  if (title) document.title = title;

  document.querySelectorAll("[data-set-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.setLang === lang);
  });
}

function savedLanguage() {
  try {
    const saved = localStorage.getItem("lang");
    if (LANGUAGES.includes(saved)) return saved;
  } catch (e) {
    // falls through to the browser's language
  }
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

document.documentElement.lang = savedLanguage(); // set early, so the wrong language doesn't flash

document.addEventListener("DOMContentLoaded", () => {
  setLanguage(document.documentElement.lang);
  document.querySelectorAll("[data-set-lang]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.setLang));
  });
});