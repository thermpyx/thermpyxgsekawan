/* A decorative entrance for native site dialogs. Authentication and saves remain immediate. */
(() => {
  "use strict";
  if (window.TPXPopupLaunch) return;
  const source = document.currentScript?.src;
  const active = new Map(), watched = new WeakSet();
  let sequence = 0;
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (source && !document.querySelector("link[data-tpx-popup-launch]")) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = new URL("../css/popup-launch.css", source).href;
    style.setAttribute("data-tpx-popup-launch", "");
    document.head.append(style);
  }
  const artwork = `<svg class="tpx-popup-art" viewBox="0 0 400 280" fill="none" aria-hidden="true" focusable="false">
    <defs><radialGradient id="tpx-launch-burst"><stop stop-color="#edfcff"/><stop offset=".2" stop-color="#93edf4"/><stop offset=".55" stop-color="#33c9dc" stop-opacity=".38"/><stop offset="1" stop-color="#33c9dc" stop-opacity="0"/></radialGradient><linearGradient id="tpx-launch-metal" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#eefbff"/><stop offset=".5" stop-color="#7dcedb"/><stop offset="1" stop-color="#26738c"/></linearGradient><radialGradient id="tpx-launch-fire"><stop stop-color="#fff2c8"/><stop offset=".5" stop-color="#ffc26d"/><stop offset="1" stop-color="#ed793d" stop-opacity="0"/></radialGradient></defs>
    <g class="tpx-popup-orbits" stroke="#51c9d7" stroke-opacity=".15"><circle cx="223" cy="119" r="84"/><circle cx="223" cy="119" r="119" stroke-dasharray="3 12"/><path d="M76 119H370M223 14V243" stroke-dasharray="3 9"/></g>
    <g class="tpx-popup-meteor"><path d="m240 81 29 13 12 30-15 33-35 6-29-19-6-31 17-25Z" fill="#594b45" stroke="#d7ac81" stroke-width="1.5"/><path d="m213 88 13 29 43-23m-43 23-24 27m24-27 40 40m-40-40 5 46m-5-46 55 7" stroke="#a28775" stroke-width="1.4"/><path d="m235 91 10 10-5 14-14 2-7-12Z" fill="#3c3837"/><path d="m256 127 9 5-4 13-12-2-3-9Z" fill="#3c3837"/><path d="m209 120 6 2-1 8-6-2Z" fill="#d3a47c"/></g>
    <g class="tpx-popup-rocket"><g class="tpx-popup-exhaust"><path d="M-18 0-75-10-62 0-76 10Z" fill="url(#tpx-launch-fire)"/><path d="m-18-5-35 5 35 5" fill="#ffdf97"/></g><path d="M-21-12-36-20-35-6-21-3M-21 12-36 20-35 6-21 3" fill="#ea915f" stroke="#ffbd91"/><path d="M-25-10C-9-18 11-15 29 0 11 15-9 18-25 10Z" fill="url(#tpx-launch-metal)" stroke="#dcfaff" stroke-width="1.4"/><path d="M14-10 29 0 14 10Z" fill="#edfaff"/><circle cx="1" cy="0" r="6" fill="#0e2d42" stroke="#c5f4fb" stroke-width="2"/><path d="M-22-10V10" stroke="#255e78" stroke-width="3"/></g>
    <g class="tpx-popup-impact"><circle cx="223" cy="119" r="86" fill="url(#tpx-launch-burst)"/><circle class="tpx-popup-wave" cx="223" cy="119" r="25" stroke="#abf4f8" stroke-width="1.3"/><circle class="tpx-popup-wave tpx-popup-wave-outer" cx="223" cy="119" r="38" stroke="#f5cda3" stroke-width="1"/></g>
    <g class="tpx-popup-fragments" fill="#c6aa8d" stroke="#ffe0b8" stroke-width=".6"><path style="--dx:-64px;--dy:-45px;--spin:-90deg" d="m219 114-8 4 2 9 10-3Z"/><path style="--dx:60px;--dy:-52px;--spin:130deg" d="m226 112 9 1 3 8-10 3Z"/><path style="--dx:65px;--dy:38px;--spin:100deg" d="m228 122 10 1-2 9-8-2Z"/><path style="--dx:-48px;--dy:62px;--spin:-140deg" d="m213 123 10 3-4 10-8-5Z"/><path style="--dx:6px;--dy:-77px;--spin:140deg" d="m220 112 6-4 4 5-5 5Z"/><path style="--dx:12px;--dy:71px;--spin:-110deg" d="m219 126 7-2 4 6-7 4Z"/></g>
    <g class="tpx-popup-sparks" fill="#a9f4fa"><circle style="--dx:-88px;--dy:-18px" cx="223" cy="119" r="2"/><circle style="--dx:87px;--dy:-15px" cx="223" cy="119" r="2"/><circle style="--dx:45px;--dy:-81px" cx="223" cy="119" r="1.5"/><circle style="--dx:-30px;--dy:90px" cx="223" cy="119" r="1.5"/><circle style="--dx:-65px;--dy:53px" cx="223" cy="119" r="2"/><circle style="--dx:60px;--dy:69px" cx="223" cy="119" r="1.5"/></g>
  </svg>`;
  function clear(dialog) {
    const state = active.get(dialog);
    if (state) {
      state.timers.forEach(timer => clearTimeout(timer));
      state.scene.remove();
      active.delete(dialog);
    }
    dialog.classList.remove("tpx-popup-arriving", "tpx-popup-revealing");
  }
  function play(dialog) {
    if (!dialog.open || !dialog.isConnected || active.has(dialog) || motion?.matches || document.visibilityState === "hidden") return;
    const scene = document.createElement("div");
    scene.className = "tpx-popup-flight";
    scene.setAttribute("aria-hidden", "true");
    scene.setAttribute("data-tpx-no-translate", "");
    const prefix = `tpx-launch-${++sequence}-`;
    scene.innerHTML = artwork.replaceAll('id="tpx-launch-', `id="${prefix}`).replaceAll('url(#tpx-launch-', `url(#${prefix}`);
    const state = {scene, timers: []};
    active.set(dialog, state);
    dialog.prepend(scene);
    dialog.classList.add("tpx-popup-arriving");
    state.timers.push(setTimeout(() => {
      if (!dialog.open || !dialog.isConnected) {clear(dialog); return;}
      dialog.classList.remove("tpx-popup-arriving");
      dialog.classList.add("tpx-popup-revealing");
    }, 430));
    state.timers.push(setTimeout(() => clear(dialog), 780));
  }
  function watch(dialog) {
    if (!watched.has(dialog)) {
      watched.add(dialog);
      dialog.addEventListener("close", () => {if (!dialog.open) {delete dialog.dataset.tpxLaunchSeen; clear(dialog);}});
      dialog.addEventListener("beforetoggle", event => {if (event.newState === "closed") {delete dialog.dataset.tpxLaunchSeen; clear(dialog);}});
      dialog.addEventListener("toggle", () => {
        if (dialog.open) {
          if (!Object.hasOwn(dialog.dataset, "tpxLaunchSeen")) {dialog.dataset.tpxLaunchSeen = ""; play(dialog);}
        } else {delete dialog.dataset.tpxLaunchSeen; clear(dialog);}
      });
    }
    if (dialog.open && !Object.hasOwn(dialog.dataset, "tpxLaunchSeen")) {
      dialog.dataset.tpxLaunchSeen = "";
      play(dialog);
    }
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches("dialog")) watch(node);
    node.querySelectorAll("dialog").forEach(watch);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") {
        const dialog = record.target;
        if (dialog.open) watch(dialog);
        else {delete dialog.dataset.tpxLaunchSeen; clear(dialog);}
      } else {
        record.addedNodes.forEach(scan);
      }
    }
    for (const dialog of active.keys()) if (!dialog.isConnected) clear(dialog);
  });
  function start() {
    scan(document.documentElement);
    observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ["open"]});
  }
  motion?.addEventListener?.("change", () => {if (motion.matches) for (const dialog of active.keys()) clear(dialog);});
  window.addEventListener("pagehide", () => {for (const dialog of active.keys()) clear(dialog);});
  window.TPXPopupLaunch = Object.freeze({play, cancel: clear});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true}); else start();
})();
