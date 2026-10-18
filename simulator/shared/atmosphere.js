/* Independent simulator decoration. It never reads or changes physics state. */
(() => {
  "use strict";
  const source = document.currentScript?.src;
  function setup() {
    const body = document.body;
    if (!body || body.hasAttribute("data-tpx-simulator-atmosphere")) return;
    let simulatorRoute = false;
    try { simulatorRoute = /(?:^|\/)simulator\//i.test(decodeURIComponent(location.pathname)); } catch (_) {}
    if (!simulatorRoute) return;
    body.classList.add("tpx-sim-atmosphere");
    body.setAttribute("data-tpx-simulator-atmosphere", "ready");
    if (source && ![...document.styleSheets].some(sheet => sheet.href?.split("?")[0].endsWith("/simulator-atmosphere.css"))) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL("simulator-atmosphere.css", source).href;
      document.head.append(link);
    }
    const actions = [...document.querySelectorAll("button:is(#startBtn,#pauseBtn,#resetBtn,#start,#pause,#reset,#processRun,#processReset)")];
    const feedbackTimers = new WeakMap();
    actions.forEach(button => button.classList.add("tpx-sim-action"));
    document.addEventListener("click", event => {
      const button = event.target.closest?.("button.tpx-sim-action");
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
      clearTimeout(feedbackTimers.get(button));
      button.classList.remove("tpx-sim-action-feedback");
      void button.offsetWidth;
      button.classList.add("tpx-sim-action-feedback");
      feedbackTimers.set(button, setTimeout(() => button.classList.remove("tpx-sim-action-feedback"), 420));
    }, {capture: true});
    const hero = document.querySelector(".theory-hero,.simulator-hero,.hero-banner,.intro-section,.hero") || document.querySelector("body.tpx-legacy-zeroth > header");
    if (!hero) return;
    hero.classList.add("tpx-sim-flight-host");
    const lane = document.createElement("div");
    lane.className = "tpx-sim-flight-lane";
    lane.setAttribute("aria-hidden", "true");
    lane.innerHTML = '<div class="tpx-sim-flight"><svg viewBox="0 0 100 38" focusable="false" aria-hidden="true"><path d="M1 19 34 15 28 19 34 23Z" fill="#55caf8" opacity=".18"/><path d="m17 19 22-4-7 4 7 4Z" fill="#55caf8" opacity=".5"/><path d="m27 19 14-3-4 3 4 3Z" fill="#c7f4ff"/><path d="m43 13 11-9 13 2-12 10m-12 9 11 9 13-2-12-10" fill="currentColor" opacity=".75"/><path d="M39 15Q60 7 78 10L96 19 78 28Q60 31 39 23Z" fill="currentColor"/><path d="m82 12 14 7-14 7Z" fill="#f7fdff"/><path d="M42 17H30v4h12" fill="#d4effa"/><circle cx="67" cy="19" r="6" fill="#13334c"/><circle cx="67" cy="19" r="3.5" fill="#51d3fc"/><path d="M45 14Q62 8 77 12" fill="none" stroke="#fff" stroke-width="1.3" opacity=".7"/></svg></div>';
    hero.prepend(lane);
    const updateVisibility = () => body.classList.toggle("tpx-sim-motion-paused", document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        hero.classList.toggle("tpx-sim-flight-offscreen", !entries[0].isIntersecting);
      });
      observer.observe(hero);
      window.addEventListener("pagehide", () => observer.disconnect(), {once: true});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, {once: true});
  else setup();
})();
