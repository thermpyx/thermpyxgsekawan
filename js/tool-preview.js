/* Local labels for the two tool entrances on the homepage. */
(() => {
  "use strict";
  function refresh() {
    const language = window.TPX?.getLanguage() === "id" ? "toolId" : "toolEn";
    document.querySelectorAll("[data-tool-en][data-tool-id]").forEach(element => {
      if (element.textContent !== element.dataset[language]) element.textContent = element.dataset[language];
    });
  }
  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("thermpyx:languagechange", refresh);
})();
