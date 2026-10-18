/* Submit feedback in the site. No email client or frontend credentials are used. */
(() => {
  "use strict";
  const MAX_MESSAGE = 2000;
  const mounted = new WeakMap();
  let popup;
  const categories = {suggestion: {en: "Suggestion", id: "Saran"}, bug: {en: "Problem report", id: "Laporan masalah"}, other: {en: "Other feedback", id: "Masukan lainnya"}};
  function language() {
    const active = window.TPX?.getLanguage?.();
    if (active === "id" || active === "en") return active;
    try {const saved = localStorage.getItem("thermpyx-language"); if (saved === "id" || saved === "en") return saved;} catch (_) { /* Private browsing can restrict storage. */ }
    return document.documentElement.lang === "id" ? "id" : "en";
  }
  const pair = (en, id) => ({en, id});
  const translate = (copy, selected = language()) => copy[selected === "id" ? "id" : "en"];
  function unicode(value) {
    const text = String(value ?? "");
    return (typeof text.toWellFormed === "function" ? text.toWellFormed() : Array.from(text).map(character => character.length === 1 && /[\uD800-\uDFFF]/.test(character) ? "\uFFFD" : character).join("")).normalize("NFC");
  }
  function pageContext(value = location.href) {
    try {const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? (url.origin + url.pathname).slice(0, 600) : "THERMPYX";} catch (_) {return "THERMPYX";}
  }
  function prepare(input = {}, options = {}) {
    const selected = options.language === "id" || options.language === "en" ? options.language : language();
    const name = unicode(input.name).replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, " ").trim();
    const message = unicode(input.message).replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
    const category = Object.hasOwn(categories, input.category) ? input.category : "";
    const errors = {};
    if (name.length > 80) errors.name = pair("Use up to 80 characters for your name.", "Gunakan maksimal 80 karakter untuk nama.");
    if (!category) errors.category = pair("Choose a feedback category.", "Pilih jenis masukan.");
    if (!message) errors.message = pair("Write your message before sending.", "Tulis pesan sebelum mengirim.");
    else if (message.length > MAX_MESSAGE) errors.message = pair("Keep your message within 2,000 characters.", "Batasi pesan hingga 2.000 karakter.");
    if (Object.keys(errors).length) return {data: null, errors};
    return {data: {name, category, message, language: selected, page: pageContext(options.pageURL)}, errors};
  }
  function newId() {
    const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
    return "feedback-" + Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function mount(form = document.getElementById("feedbackForm")) {
    if (!form) return null;
    if (mounted.has(form)) return mounted.get(form);
    const fields = {name: form.querySelector("#feedbackName"), category: form.querySelector("#feedbackCategory"), message: form.querySelector("#feedbackMessage")};
    const submit = form.querySelector("#feedbackSubmitButton"), status = form.querySelector("#feedbackStatus");
    if (Object.values(fields).some(field => !field) || !submit || !status) return null;
    form.noValidate = true; fields.name.maxLength = 80; fields.message.maxLength = MAX_MESSAGE;
    submit.type = "submit"; status.setAttribute("data-tpx-no-translate", "");
    const errors = {};
    for (const [name, field] of Object.entries(fields)) {
      const id = `${field.id}Error`;
      let error = form.querySelector(`#${id}`);
      if (!error) {error = document.createElement("p"); error.id = id; error.className = "feedback-error"; error.hidden = true; (field.closest(".tpx-select") || field).after(error);}
      error.setAttribute("data-tpx-no-translate", ""); errors[name] = error;
      field.setAttribute("aria-describedby", [...new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).concat(id))].join(" "));
    }
    let counter = form.querySelector("#feedbackMessageCount");
    if (!counter) {counter = document.createElement("p"); counter.id = "feedbackMessageCount"; counter.className = "feedback-count"; const host = fields.message.closest(".feedback-field"); if (host) host.append(counter); else fields.message.after(counter);}
    counter.setAttribute("data-tpx-no-translate", "");
    fields.message.setAttribute("aria-describedby", `${fields.message.getAttribute("aria-describedby")} ${counter.id}`.trim());
    let statusCopy = null, attempted = false, busy = false, pending = null, delivered = false;
    function read() {return prepare({name: fields.name.value, category: fields.category.value, message: fields.message.value});}
    function setStatus(value) {statusCopy = value; status.textContent = value ? translate(value) : "";}
    function displayErrors(result, focus = false) {
      for (const [name, field] of Object.entries(fields)) {
        const issue = result.errors[name]; errors[name].hidden = !issue; errors[name].textContent = issue ? translate(issue) : "";
        if (issue) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid");
        const trigger = field.closest(".tpx-select")?.querySelector(".tpx-select-trigger");
        if (trigger) {if (issue) trigger.setAttribute("aria-invalid", "true"); else trigger.removeAttribute("aria-invalid");}
      }
      if (focus) {const first = Object.keys(result.errors)[0]; if (first) (fields[first].closest(".tpx-select")?.querySelector(".tpx-select-trigger") || fields[first]).focus();}
    }
    function setBusy(value) {
      busy = value; submit.disabled = value || delivered;
      if (value) form.setAttribute("aria-busy", "true"); else form.removeAttribute("aria-busy");
      // Lock the submitted snapshot while it awaits the server. Closing the popup is safe.
      Object.values(fields).forEach(field => {field.disabled = value; const trigger = field.closest(".tpx-select")?.querySelector(".tpx-select-trigger"); if (trigger) trigger.disabled = value;});
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy || delivered) return;
      attempted = true;
      const result = read(); displayErrors(result, true);
      if (!result.data) {setStatus(pair("Check the highlighted fields before continuing.", "Periksa kolom yang ditandai sebelum melanjutkan.")); return;}
      setBusy(true); setStatus(pair("Sending your feedback…", "Mengirim masukan Anda…"));
      try {
        const api = window.TPXFirebase;
        if (!api?.feedback?.submit || !api?.auth?.ensureParticipant) throw {};
        // Keep both the ID and captured sender on a failed request. A retry cannot
        // create another record or silently attach a draft to a changed account.
        if (!pending) pending = {input: {...result.data, id: newId()}, sender: null};
        if (!pending.sender) {
          const identity = await api.auth.ensureParticipant();
          if (identity.error || !identity.data?.uid) throw identity.error || {};
          pending.sender = identity.data.uid;
        }
        const response = await api.feedback.submit(pending.input, pending.sender);
        if (response.error) throw response.error;
        const row = response.data;
        if (!row || row.id !== pending.input.id || row.sender_id !== pending.sender || !Number.isFinite(row.submitted_at)) throw {};
        delivered = true;
        setStatus(pair("Thank you! Your feedback has been received. Edit the form to send another message.", "Terima kasih! Masukan Anda telah diterima. Ubah isi formulir untuk mengirim pesan lain."));
      } catch (error) {
        const detail = error?.messageEn && error?.messageId ? pair(error.messageEn, error.messageId) : pair("Your feedback has not been confirmed. Check your connection and try again. Your draft is kept.", "Masukan Anda belum terkonfirmasi. Periksa koneksi lalu coba lagi. Draf Anda tetap tersimpan.");
        setStatus(detail);
      } finally {setBusy(false);}
    });
    function localize() {
      counter.textContent = translate(pair(`${fields.message.value.length} / 2,000 characters`, `${fields.message.value.length} / 2.000 karakter`));
      if (statusCopy) status.textContent = translate(statusCopy);
      if (attempted) displayErrors(read());
    }
    Object.values(fields).forEach(field => field.addEventListener(field === fields.category ? "change" : "input", () => {
      if (busy) return;
      pending = null; delivered = false; submit.disabled = false; setStatus(null); localize();
    }));
    window.addEventListener("thermpyx:languagechange", localize); localize();
    const controller = {prepare: read}; mounted.set(form, controller); return controller;
  }
  function mountPopup() {
    if (popup) return popup;
    const dialog = document.getElementById("feedbackDialog");
    if (!dialog || !mount()) return null;
    let returnFocus = null, scrollState = null, backdropDown = false;
    const triggers = () => document.querySelectorAll("[data-feedback-open]");
    function restore() {
      if (dialog.open || !scrollState) return;
      document.documentElement.style.overflow = scrollState.html;
      document.body.style.overflow = scrollState.body;
      scrollState = null;
      triggers().forEach(button => button.setAttribute("aria-expanded", "false"));
      let target = returnFocus;
      if (target?.closest(".sidebar") && innerWidth <= 768 && !document.body.classList.contains("sidebar-mobile-open")) target = document.getElementById("sidebarToggle");
      if (target?.isConnected && target !== document.body) target.focus({preventScroll: true});
      returnFocus = null;
    }
    function open(trigger) {
      if (dialog.open) return true;
      window.TPXOnboarding?.close?.();
      // A sign-in or another active workflow keeps its native focus boundary.
      if (document.querySelector("dialog[open]")) return false;
      window.ThermpyxSelect?.closeAll?.();
      returnFocus = trigger || document.activeElement;
      scrollState = {html: document.documentElement.style.overflow, body: document.body.style.overflow};
      document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
      try {dialog.showModal();} catch (_) {restore(); return false;}
      triggers().forEach(button => button.setAttribute("aria-expanded", "true"));
      dialog.scrollTop = 0;
      dialog.querySelector("h2")?.focus({preventScroll: true});
      return true;
    }
    function close() {
      if (!dialog.open) return;
      window.ThermpyxSelect?.closeAll?.();
      dialog.close(); restore();
    }
    dialog.querySelector("[data-feedback-close]")?.addEventListener("click", close);
    dialog.addEventListener("cancel", event => {event.preventDefault(); close();});
    dialog.addEventListener("close", restore);
    // The document lives inside the persistent music shell. Keep sequential
    // focus here as well, so Tab cannot jump to controls in the parent frame.
    dialog.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button,a[href],input,textarea,select,[tabindex]")].filter(node => node.tabIndex >= 0 && !node.disabled && !node.closest("[hidden]") && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1), active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog.querySelector("h2"))) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && active === last) {event.preventDefault(); first?.focus();}
    });
    const outside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    dialog.addEventListener("pointerdown", event => {backdropDown = outside(event);});
    dialog.addEventListener("click", event => {if (backdropDown && outside(event)) close(); backdropDown = false;});
    document.addEventListener("click", event => {
      const trigger = event.target.closest?.("[data-feedback-open],a[href='#feedback'],a[href='index.html#feedback']");
      if (!trigger) return;
      event.preventDefault(); open(trigger);
    });
    window.addEventListener("hashchange", () => {if (location.hash === "#feedback") open(document.querySelector("[data-feedback-open]"));});
    popup = {open, close};
    return popup;
  }
  function start() {
    mount(); mountPopup();
    if (location.hash === "#feedback") popup?.open(document.querySelector("[data-feedback-open]"));
  }
  window.TPXFeedback = {mount, prepare, open: trigger => mountPopup()?.open(trigger) ?? false, close: () => popup?.close()};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true}); else start();
})();
