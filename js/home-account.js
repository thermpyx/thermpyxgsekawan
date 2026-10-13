/* Account entry points on the THERMPYX homepage. Uses the shared Auth session. */
(() => {
  "use strict";
  function start() {
    const api = window.TPXContent, container = document.querySelector(".home-auth-mount [data-content-auth]");
    if (!api || !container) return;
    const auth = api.mountAuth(container, {});
    const headerButton = document.querySelector(".home-account-header");
    headerButton?.setAttribute("aria-haspopup", "dialog");
    headerButton?.setAttribute("aria-controls", container.querySelector("dialog").id);
    let active = null;
    function localize() {
      const id = window.TPX?.getLanguage() === "id";
      document.querySelectorAll("[data-account-en]").forEach(node => {
        node.textContent = id ? node.dataset.accountId : node.dataset.accountEn;
      });
      const header = document.querySelector(".home-account-header");
      if (header && active) header.textContent = id ? "Akun" : "Account";
    }
    function render(session) {
      active = session;
      document.querySelectorAll("[data-home-guest]").forEach(node => {node.hidden = Boolean(session);});
      document.querySelectorAll("[data-home-connected]").forEach(node => {node.hidden = !session;});
      localize();
    }
    document.querySelectorAll("[data-home-auth-mode]").forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      if (active) auth.open();
      else if (link.dataset.homeAuthMode === "register") auth.showRegister();
      else auth.showSignIn();
    }));
    document.querySelector("[data-home-account-link]")?.addEventListener("click", () => auth.open());
    window.addEventListener("thermpyx:languagechange", localize);
    api.onAuthChange(render); api.session().then(render);
    localize();
    if (location.hash === "#account" && !location.search.includes("account=recovery")) auth.open();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true});
  else start();
})();
