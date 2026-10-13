/* Practice entry: quizzes and flashcards share one learning space. */
(() => {
  "use strict";

  function refreshLabels() {
    const language = window.TPX?.getLanguage() === "id" ? "id" : "en";
    document.querySelectorAll("[data-en][data-id]").forEach(element => {
      if (element.children.length) return;
      const value = element.getAttribute(`data-${language}`);
      if (element.textContent !== value) element.textContent = value;
    });
    document.querySelectorAll("[data-aria-label-en][data-aria-label-id]").forEach(element => {
      const value = element.getAttribute(`data-aria-label-${language}`);
      if (element.getAttribute("aria-label") !== value) element.setAttribute("aria-label", value);
    });
  }

  function mount() {
    const choice = document.getElementById("practiceQuizChoice");
    const panel = document.getElementById("quizModes");
    const close = document.getElementById("practiceCloseModes");
    const title = document.getElementById("quizModesTitle");
    if (!choice || !panel || !close || !title) return;

    function setExpanded(expanded, focus = false) {
      panel.hidden = !expanded;
      choice.setAttribute("aria-expanded", String(expanded));
      choice.classList.toggle("is-active", expanded);
      if (focus) (expanded ? title : choice).focus({ preventScroll: true });
      if (expanded && focus) {
        panel.scrollIntoView({
          block: "nearest",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        });
      }
    }

    choice.addEventListener("click", () => setExpanded(panel.hidden, true));
    close.addEventListener("click", () => setExpanded(false, true));
    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false, true);
      }
    });
    const openDeepLink = () => {
      if (window.location.hash === "#quizModes") setExpanded(true);
    };
    openDeepLink();
    window.addEventListener("hashchange", openDeepLink);
    refreshLabels();
  }

  document.addEventListener("DOMContentLoaded", mount, { once: true });
  window.addEventListener("thermpyx:languagechange", refreshLabels);
})();
