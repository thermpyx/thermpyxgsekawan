/* A small select-only combobox. The original select still owns values and validity. */
(() => {
  "use strict";
  const states = new Map();
  let serial = 0;
  let opened = null;
  let scanQueued = false;
  const text = option => (option.label || option.textContent || "").trim();
  const disabled = option => option.disabled || (option.parentElement?.tagName === "OPTGROUP" && option.parentElement.disabled);
  const language = () => document.documentElement.lang.toLowerCase().startsWith("id") ? "id" : "en";

  function available(state) {
    return Array.from(state.select.options).map((option, index) => ({ option, index }))
      .filter(({ option }) => !disabled(option) && !option.hidden && !option.closest("optgroup[hidden]"));
  }

  function accessibleName(select) {
    const label = Array.from(select.labels || []).map(el => {
      const copy = el.cloneNode(true);
      copy.querySelectorAll("select,.tpx-select,button").forEach(node => node.remove());
      return copy.textContent.trim();
    }).filter(Boolean).join(" ");
    return select.getAttribute("aria-label") || label || select.title || select.name || select.id || (language() === "id" ? "Pilih opsi" : "Choose an option");
  }

  function close(state = opened, restoreFocus = false) {
    if (!state) return;
    state.menu.hidden = true;
    state.wrapper.classList.remove("is-open");
    state.trigger.setAttribute("aria-expanded", "false");
    state.trigger.removeAttribute("aria-activedescendant");
    state.search = "";
    if (opened === state) opened = null;
    if (restoreFocus && state.trigger.isConnected && !state.trigger.disabled) state.trigger.focus({ preventScroll: true });
  }

  function position(state) {
    if (state.menu.hidden) return;
    const rect = state.trigger.getBoundingClientRect();
    if (state.trigger.closest("[hidden]") || !state.trigger.getClientRects().length || rect.bottom <= 0 || rect.top >= innerHeight) {
      close(state);
      return;
    }
    const edge = 10;
    const gap = 7;
    const width = Math.min(Math.max(rect.width, 180), innerWidth - edge * 2);
    const below = Math.max(0, innerHeight - rect.bottom - edge - gap);
    const above = Math.max(0, rect.top - edge - gap);
    const wanted = Math.min(state.menu.scrollHeight, 320);
    const placeAbove = below < wanted && above > below;
    const room = placeAbove ? above : below;
    state.menu.style.width = `${width}px`;
    state.menu.style.maxHeight = `${Math.max(40, Math.min(320, room))}px`;
    state.menu.style.left = `${Math.max(edge, Math.min(rect.left, innerWidth - width - edge))}px`;
    const height = Math.min(state.menu.scrollHeight, Math.max(40, Math.min(320, room)));
    state.menu.style.top = `${Math.max(edge, placeAbove ? rect.top - height - gap : Math.min(rect.bottom + gap, innerHeight - height - edge))}px`;
  }

  function highlight(state, index, scroll = true) {
    state.active = index;
    state.menu.querySelectorAll("[role='option']").forEach(node => node.classList.toggle("is-active", Number(node.dataset.index) === index));
    const node = state.menu.querySelector(`[data-index='${index}']`);
    if (node && !state.menu.hidden) {
      state.trigger.setAttribute("aria-activedescendant", node.id);
      if (scroll) {
        const top = node.offsetTop;
        const bottom = top + node.offsetHeight;
        if (top < state.menu.scrollTop) state.menu.scrollTop = top;
        else if (bottom > state.menu.scrollTop + state.menu.clientHeight) state.menu.scrollTop = bottom - state.menu.clientHeight;
      }
    } else state.trigger.removeAttribute("aria-activedescendant");
  }

  function renderOptions(state) {
    const fragment = document.createDocumentFragment();
    let count = 0;
    let previousGroup = null;
    Array.from(state.select.options).forEach((option, index) => {
      if (option.hidden || option.closest("optgroup[hidden]")) return;
      const group = option.parentElement.tagName === "OPTGROUP" ? option.parentElement : null;
      if (group && group !== previousGroup) {
        const heading = document.createElement("div");
        heading.className = "tpx-select-group";
        heading.setAttribute("role", "presentation");
        heading.textContent = group.label;
        fragment.append(heading);
      }
      previousGroup = group;
      const row = document.createElement("div");
      row.className = "tpx-select-option";
      row.id = `${state.menu.id}-option-${index}`;
      row.dataset.index = String(index);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === state.select.selectedIndex));
      row.setAttribute("aria-disabled", String(disabled(option)));
      const label = document.createElement("span");
      label.textContent = text(option);
      const check = document.createElement("span");
      check.className = "tpx-select-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      row.append(label, check);
      fragment.append(row);
      count++;
    });
    if (!count) {
      const empty = document.createElement("div");
      empty.className = "tpx-select-empty";
      empty.textContent = language() === "id" ? "Belum ada pilihan" : "No options available";
      fragment.append(empty);
    }
    state.menu.replaceChildren(fragment);
    if (opened === state) {
      const choices = available(state);
      if (!choices.some(item => item.index === state.active)) state.active = choices.find(item => item.index === state.select.selectedIndex)?.index ?? choices[0]?.index ?? -1;
      highlight(state, state.active);
      position(state);
    }
  }

  function sync(state, rebuild = false) {
    const select = state.select;
    const option = select.options[select.selectedIndex];
    const selectedText = option ? text(option) : (language() === "id" ? "Pilih opsi" : "Choose an option");
    if (state.label.textContent !== selectedText) state.label.textContent = selectedText;
    if (state.trigger.disabled !== select.matches(":disabled")) state.trigger.disabled = select.matches(":disabled");
    state.wrapper.hidden = select.hidden || select.style.display === "none";
    const name = accessibleName(select);
    if (select.hasAttribute("aria-labelledby")) {
      state.trigger.setAttribute("aria-labelledby", select.getAttribute("aria-labelledby"));
      state.trigger.removeAttribute("aria-label");
    } else {
      if (state.trigger.getAttribute("aria-label") !== name) state.trigger.setAttribute("aria-label", name);
      state.trigger.removeAttribute("aria-labelledby");
    }
    if (state.menu.getAttribute("aria-label") !== name) state.menu.setAttribute("aria-label", name);
    if (state.trigger.getAttribute("aria-required") !== String(select.required)) state.trigger.setAttribute("aria-required", String(select.required));
    const invalid = select.getAttribute("aria-invalid") || (state.validated && !select.validity.valid ? "true" : "false");
    if (state.trigger.getAttribute("aria-invalid") !== invalid) state.trigger.setAttribute("aria-invalid", invalid);
    for (const attribute of ["aria-describedby", "title"]) {
      const value = select.getAttribute(attribute);
      if (value !== null) state.trigger.setAttribute(attribute, value);
      else state.trigger.removeAttribute(attribute);
    }
    if ((state.trigger.disabled || state.wrapper.hidden) && opened === state) close(state);
    if (rebuild) renderOptions(state);
    else state.menu.querySelectorAll("[role='option']").forEach(node => {
      const value = String(Number(node.dataset.index) === select.selectedIndex);
      if (node.getAttribute("aria-selected") !== value) node.setAttribute("aria-selected", value);
    });
    state.lastValue = select.selectedIndex;
  }

  function open(state, initial) {
    sync(state, true);
    if (state.trigger.disabled || state.wrapper.hidden) return;
    close(opened);
    const portal = state.select.closest("dialog") || document.body;
    if (state.menu.parentElement !== portal) portal.append(state.menu);
    opened = state;
    state.menu.hidden = false;
    state.wrapper.classList.add("is-open");
    state.trigger.setAttribute("aria-expanded", "true");
    const choices = available(state);
    const selected = choices.find(item => item.index === state.select.selectedIndex);
    const first = initial === "last" ? choices.at(-1) : choices[0];
    state.active = (initial ? first : selected || first)?.index ?? -1;
    position(state);
    highlight(state, state.active);
  }

  function choose(state, index) {
    const option = state.select.options[index];
    if (!option || disabled(option) || state.select.matches(":disabled")) return;
    const changed = state.select.selectedIndex !== index;
    state.select.selectedIndex = index;
    sync(state);
    close(state, true);
    if (changed) {
      state.select.dispatchEvent(new Event("input", { bubbles: true }));
      state.select.dispatchEvent(new Event("change", { bubbles: true }));
      sync(state);
    }
  }

  function keydown(state, event) {
    const key = event.key;
    if (key === "Tab") { close(state); return; }
    if (key === "Escape") {
      if (opened === state) { event.preventDefault(); event.stopPropagation(); close(state, true); }
      return;
    }
    if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(key) && !(key === " " && state.search && Date.now() - state.searchTime < 700)) {
      event.preventDefault();
      if (opened !== state) {
        open(state, key === "Home" ? "first" : key === "End" ? "last" : undefined);
        return;
      }
      if (key === "Enter" || key === " ") { choose(state, state.active); return; }
      if (event.altKey && key === "ArrowUp") { close(state, true); return; }
      const choices = available(state);
      let cursor = choices.findIndex(item => item.index === state.active);
      if (key === "Home") cursor = 0;
      else if (key === "End") cursor = choices.length - 1;
      else cursor = Math.max(0, Math.min(choices.length - 1, cursor + (key === "ArrowDown" ? 1 : -1)));
      if (choices[cursor]) highlight(state, choices[cursor].index);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const query = now - state.searchTime > 700 ? key : state.search + key;
      state.search = query;
      state.searchTime = now;
      const repeated = Array.from(query).every(character => character.toLocaleLowerCase() === query[0].toLocaleLowerCase());
      const needle = (repeated ? query[0] : query).toLocaleLowerCase();
      const choices = available(state);
      const current = choices.findIndex(item => item.index === (opened === state ? state.active : state.select.selectedIndex));
      const offset = repeated || query.length === 1 ? 1 : 0;
      for (let step = offset; step < choices.length + offset; step++) {
        const item = choices[(Math.max(0, current) + step) % choices.length];
        if (item && text(item.option).toLocaleLowerCase().startsWith(needle)) {
          if (opened === state) highlight(state, item.index);
          else {
            choose(state, item.index);
            state.search = query;
            state.searchTime = now;
          }
          break;
        }
      }
    }
  }

  function enhance(select) {
    if (states.has(select) || select.multiple || select.size > 1 || select.matches(":disabled") || select.hidden || select.getAttribute("aria-hidden") === "true" || select.hasAttribute("data-native-select") || getComputedStyle(select).display === "none") return;
    const wrapper = document.createElement("span");
    wrapper.className = "tpx-select";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "tpx-select-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const label = document.createElement("span");
    label.className = "tpx-select-label";
    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.classList.add("tpx-select-chevron");
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = '<path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    trigger.append(label, chevron);
    const menu = document.createElement("div");
    menu.className = "tpx-select-menu";
    menu.id = `tpx-select-list-${++serial}`;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("data-tpx-no-translate", "");
    trigger.setAttribute("data-tpx-no-translate", "");
    menu.hidden = true;
    trigger.setAttribute("aria-controls", menu.id);
    const state = { select, wrapper, trigger, label, menu, active: -1, search: "", searchTime: 0, lastValue: -2, validated: false, controller: new AbortController(), originalTab: select.getAttribute("tabindex"), originalAria: select.getAttribute("aria-hidden") };
    states.set(select, state);
    select.before(wrapper);
    wrapper.append(select, trigger);
    // Native modal dialogs make nodes outside their top layer inert. Keep
    // their listboxes inside the same dialog while ordinary selects use body.
    (select.closest("dialog") || document.body).append(menu);
    select.classList.add("tpx-select-native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");
    trigger.addEventListener("click", () => opened === state ? close(state) : open(state));
    trigger.addEventListener("keydown", event => keydown(state, event));
    trigger.addEventListener("focus", () => sync(state));
    trigger.addEventListener("blur", () => close(state));
    select.addEventListener("focus", () => trigger.focus({ preventScroll: true }), { signal: state.controller.signal });
    select.addEventListener("change", () => sync(state), { signal: state.controller.signal });
    select.addEventListener("input", () => sync(state), { signal: state.controller.signal });
    select.addEventListener("invalid", () => { state.validated = true; sync(state); }, { signal: state.controller.signal });
    menu.addEventListener("mousedown", event => event.preventDefault());
    menu.addEventListener("pointermove", event => {
      const row = event.target.closest("[role='option']");
      if (row && row.getAttribute("aria-disabled") !== "true") highlight(state, Number(row.dataset.index), false);
    });
    menu.addEventListener("click", event => {
      const row = event.target.closest("[role='option']");
      if (row) choose(state, Number(row.dataset.index));
    });
    state.observer = new MutationObserver(() => sync(state, true));
    state.observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled", "hidden", "required", "label", "selected", "value", "aria-label", "aria-labelledby", "aria-describedby", "aria-invalid", "title", "style"] });
    sync(state, true);
  }

  function scan(root = document) {
    if (root instanceof HTMLSelectElement) enhance(root);
    root.querySelectorAll?.("select").forEach(enhance);
  }

  function start() {
    scan();
    new MutationObserver(records => {
      // Only inspect added/changed native controls. Our own menu updates do not rescan the page.
      for (const record of records) {
        if (record.type === "attributes") {
          if (record.target instanceof HTMLSelectElement && !states.has(record.target)) enhance(record.target);
        } else for (const node of record.addedNodes) {
          if (node.nodeType === 1 && !node.closest(".tpx-select-menu,.tpx-select-trigger")) scan(node);
        }
      }
      if (scanQueued) return;
      scanQueued = true;
      queueMicrotask(() => {
        scanQueued = false;
        states.forEach((state, select) => {
          if (!select.isConnected || !state.wrapper.contains(select)) {
            close(state);
            state.observer.disconnect();
            state.controller.abort();
            state.menu.remove();
            state.trigger.remove();
            if (state.wrapper.contains(select) && state.wrapper.parentNode) state.wrapper.replaceWith(select);
            else if (!state.wrapper.contains(select)) state.wrapper.remove();
            select.classList.remove("tpx-select-native");
            if (state.originalTab === null) select.removeAttribute("tabindex"); else select.setAttribute("tabindex", state.originalTab);
            if (state.originalAria === null) select.removeAttribute("aria-hidden"); else select.setAttribute("aria-hidden", state.originalAria);
            states.delete(select);
            if (select.isConnected) enhance(select);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "hidden", "style", "class"] });
    document.addEventListener("pointerdown", event => {
      if (opened && !opened.wrapper.contains(event.target) && !opened.menu.contains(event.target)) close(opened);
    });
    document.addEventListener("reset", () => setTimeout(() => states.forEach(state => { state.validated = false; sync(state, true); }), 0));
    window.addEventListener("resize", () => { if (opened) position(opened); });
    window.addEventListener("scroll", event => { if (opened && !opened.menu.contains(event.target)) position(opened); }, true);
    window.visualViewport?.addEventListener("resize", () => { if (opened) position(opened); });
    window.addEventListener("thermpyx:languagechange", () => states.forEach(state => sync(state, true)));
    // Assigning select.value/selectedIndex does not emit events. Poll lightly to retain native semantics.
    setInterval(() => {
      if (document.hidden) return;
      states.forEach(state => sync(state));
      if (opened) position(opened);
    }, 200);
    window.ThermpyxSelect = { refresh: root => { scan(root || document); states.forEach(state => sync(state, true)); }, closeAll: () => close(opened) };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
