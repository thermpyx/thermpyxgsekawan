/* Shared THERMPYX identity. The cut-out X follows the original home-page title. */
(() => {
  "use strict";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const X_PATH = "M4 5H29L50 33L71 5H96L63 50L96 95H71L50 67L29 95H4L37 50ZM50 42L43 50L50 58L57 50Z";
  const wordmarkTargets = [
    ".logo-text > span", ".mobile-logo > span", ".theory-logo", ".quiz-logo",
    ".tpx-brand-copy strong", ".simulator-brand-copy strong", ".brand-text h1",
    ".footer strong", ".quiz-footer strong", ".theory-footer strong",
    ".dev-back-logo", ".tpx-loader-wordmark", ".site-header .brand-text strong", ".top-header .brand-main"
  ].join(",");
  const ownContent = ".tpx-wordmark,.tpx-brand-phrase,[data-tpx-brand-icon],.hero-title";
  const protectedContent = [
    ownContent, "script", "style", "noscript", "svg", "code", "pre", "textarea", "input",
    "select", "option", "button", "[contenteditable]", "[data-tpx-user-content]", "[data-tpx-user-text]",
    "#fcCardText", "#fcDeckList", "#fcStudyTitle", "#fcStudyTopic", "#fcEditorCards",
    "#localSetList", "#cloudSetList", "#editorHeading", "#questionList", "#questionText",
    "#quizOptions", "#quizFeedback", ".play-question", ".play-options", ".leaderboard-list",
    "#historyList", ".history-item", ".tpx-audio-file-name", "[data-content-auth]"
  ].join(",");
  const phraseSources = new WeakMap();
  const brandToken = /\bTHERMPYX\b/i;
  const brandTokens = /\bTHERMPYX\b/gi;

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes || {})) element.setAttribute(key, value);
    return element;
  }
  function createX(className = "tpx-wordmark-x") {
    const svg = svgElement("svg", {
      viewBox: "0 0 100 100", class: className, "aria-hidden": "true", focusable: "false"
    });
    svg.append(svgElement("path", {d: X_PATH, fill: "currentColor", "fill-rule": "evenodd"}));
    return svg;
  }
  function createWordmark() {
    const mark = document.createElement("span");
    mark.className = "tpx-wordmark";
    mark.setAttribute("role", "img");
    mark.setAttribute("aria-label", "THERMPYX");
    mark.setAttribute("data-tpx-no-translate", "");
    const letters = document.createElement("span");
    letters.className = "tpx-wordmark-letters";
    letters.setAttribute("aria-hidden", "true");
    letters.textContent = "THERMPY";
    mark.append(letters, createX());
    return mark;
  }
  function decorateWordmarkContainers(root) {
    const targets = root.nodeType === 1 ? [root, ...root.querySelectorAll(wordmarkTargets)] : [];
    for (const element of targets) {
      if (!element.matches(wordmarkTargets) || element.closest(".hero-title")) continue;
      if (element.children.length === 1 && element.firstElementChild.classList.contains("tpx-wordmark")) continue;
      const letters = element.textContent.replace(/\s+/g, "");
      // Existing loaders use a drawn X and therefore expose only THERMPY as text.
      if (!/^THERMPYX$/i.test(letters) && !(letters === "THERMPY" && element.querySelector("svg"))) continue;
      element.replaceChildren(createWordmark());
      element.classList.add("tpx-brand-container");
    }
  }
  function createInstrumentIcon() {
    const svg = svgElement("svg", {
      viewBox: "0 0 64 64", class: "tpx-instrument-icon", "aria-hidden": "true", focusable: "false"
    });
    svg.append(
      svgElement("rect", {x: "14", y: "19", width: "28", height: "32", rx: "5", class: "tpx-icon-chamber"}),
      svgElement("path", {d: "M14 29h28M28 8v21M21 8h14M10 55h37"}),
      svgElement("path", {d: "M50 18v24a5 5 0 1 1-6 0V18a3 3 0 0 1 6 0Z"}),
      svgElement("path", {d: "M47 27v19", class: "tpx-icon-warm"}),
      svgElement("circle", {cx: "23", cy: "38", r: "1.3", class: "tpx-icon-particle"}),
      svgElement("circle", {cx: "33", cy: "43", r: "1.3", class: "tpx-icon-particle"}),
      svgElement("path", {d: "M3 42h8m-4-4 4 4-4 4", class: "tpx-icon-warm"})
    );
    return svg;
  }
  function decorateIcons(root) {
    if (root.nodeType !== 1) return;
    const simulatorSelector = '.simulator-preview-icon,.nav-item[href="#simulator"] .nav-icon';
    const brandSelector = ".sidebar-logo .logo-symbol,.simulator-brand-symbol,.tpx-brand .tpx-mark,.brand-wrap .brand-icon,.site-header .brand > .brand-mark,.top-header .header-left > .header-icon";
    for (const element of [root, ...root.querySelectorAll(simulatorSelector + "," + brandSelector)]) {
      if (element.hasAttribute("data-tpx-brand-icon")) continue;
      if (element.matches(simulatorSelector)) {
        element.replaceChildren(createInstrumentIcon());
        element.setAttribute("data-tpx-brand-icon", "simulator");
      } else if (element.matches(brandSelector)) {
        element.replaceChildren(createX("tpx-emblem-x"));
        element.setAttribute("data-tpx-brand-icon", "identity");
      } else continue;
      element.setAttribute("aria-hidden", "true");
    }
  }
  function renderPhrase(element, text) {
    if (element.dataset.tpxBrandShown === text && element.querySelector(".tpx-wordmark")) return;
    const contents = document.createDocumentFragment();
    let end = 0;
    for (const match of text.matchAll(brandTokens)) {
      if (match.index > end) contents.append(document.createTextNode(text.slice(end, match.index)));
      contents.append(createWordmark());
      end = match.index + match[0].length;
    }
    if (end < text.length) contents.append(document.createTextNode(text.slice(end)));
    element.replaceChildren(contents);
    element.dataset.tpxBrandShown = text;
  }
  function translatedPhrase(source, phrase) {
    const language = (window.TPX?.getLanguage?.() || document.documentElement.lang) === "id" ? "id" : "en";
    const normalize = value => String(value).trim().replace(/\s+/g, " ");
    for (const prefix of ["data-", "data-fc-", "data-tool-"]) {
      const parent = phrase?.parentElement?.closest(`[${prefix}en][${prefix}id]`);
      if (!parent) continue;
      const english = parent.getAttribute(prefix + "en");
      const indonesian = parent.getAttribute(prefix + "id");
      if (![english, indonesian].some(value => normalize(value) === normalize(source))) continue;
      return (source.match(/^\s*/)?.[0] || "") + (language === "id" ? indonesian : english) + (source.match(/\s*$/)?.[0] || "");
    }
    return typeof window.TPX?.translateText === "function" ? window.TPX.translateText(source) : source;
  }
  function decorateTextNode(node) {
    if (!node.parentElement || node.parentElement.closest(protectedContent) || !brandToken.test(node.nodeValue)) return;
    const phrase = document.createElement("span");
    phrase.className = "tpx-brand-phrase";
    phrase.setAttribute("data-tpx-no-translate", "");
    phrase.dataset.tpxBrandSource = node.nodeValue;
    phraseSources.set(phrase, node.nodeValue);
    node.replaceWith(phrase);
    renderPhrase(phrase, translatedPhrase(phraseSources.get(phrase), phrase));
  }
  function decorateText(root) {
    if (root.nodeType === 3) { decorateTextNode(root); return; }
    if (root.nodeType !== 1 || root.closest(protectedContent)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (brandToken.test(walker.currentNode.nodeValue)) textNodes.push(walker.currentNode);
    }
    textNodes.forEach(decorateTextNode);
  }
  function refresh(root = document.body) {
    if (!root) return;
    if (root.nodeType === 1) {
      decorateWordmarkContainers(root);
      decorateIcons(root);
    }
    decorateText(root);
  }
  function updatePhrases() {
    document.querySelectorAll(".tpx-brand-phrase").forEach(element => {
      const source = phraseSources.get(element) || element.dataset.tpxBrandSource;
      if (source) renderPhrase(element, translatedPhrase(source, element));
    });
    refresh();
  }
  function init() {
    refresh();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const parent = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        if (!parent || parent.closest(protectedContent)) continue;
        if (record.type === "characterData") {
          const container = parent.closest(wordmarkTargets);
          if (container) decorateWordmarkContainers(container);
          else decorateTextNode(record.target);
          continue;
        }
        if (parent.matches(wordmarkTargets)) decorateWordmarkContainers(parent);
        for (const node of record.addedNodes) {
          if (node.isConnected) refresh(node);
        }
      }
    });
    observer.observe(document.body, {subtree: true, childList: true, characterData: true});
    window.addEventListener("thermpyx:languagechange", updatePhrases);
  }
  window.TPXBrand = {createWordmark, createInstrumentIcon, refresh};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once: true});
  else init();
})();
