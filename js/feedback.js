/* Prepare feedback drafts locally. Sending remains the user's email-app action. */
(() => {
  "use strict";
  const RECIPIENT = "thermpyx@gmail.com", MAX_MESSAGE = 2000, MAX_MAILTO = 1900;
  const mounted = new WeakMap();
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
  function buildDraft(input = {}, options = {}) {
    const selected = options.language === "id" || options.language === "en" ? options.language : language();
    const name = unicode(input.name).replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, " ").trim();
    const message = unicode(input.message).replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
    const category = Object.hasOwn(categories, input.category) ? input.category : "";
    const errors = {};
    if (name.length > 80) errors.name = pair("Use up to 80 characters for your name.", "Gunakan maksimal 80 karakter untuk nama.");
    if (!category) errors.category = pair("Choose a feedback category.", "Pilih jenis masukan.");
    if (!message) errors.message = pair("Write your message before preparing an email.", "Tulis pesan sebelum menyiapkan email.");
    else if (message.length > MAX_MESSAGE) errors.message = pair("Keep your message within 2,000 characters.", "Batasi pesan hingga 2.000 karakter.");
    if (Object.keys(errors).length) return {data: null, errors};
    const label = copy => translate(copy, selected), categoryLabel = label(categories[category]);
    const subject = `[THERMPYX] ${categoryLabel}`, page = pageContext(options.pageURL);
    const body = `${label(pair("THERMPYX feedback", "Masukan THERMPYX"))}\n${label(pair("Category", "Kategori"))}: ${categoryLabel}\n${label(pair("Name", "Nama"))}: ${name || label(pair("Not provided", "Tidak diisi"))}\n${label(pair("Page", "Halaman"))}: ${page}\n\n${label(pair("Message", "Pesan"))}:\n${message}`;
    const text = `${label(pair("To", "Kepada"))}: ${RECIPIENT}\n${label(pair("Subject", "Subjek"))}: ${subject}\n\n${body}`;
    const mailto = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`;
    const gmail = new URL("https://mail.google.com/mail/");
    gmail.search = new URLSearchParams({view: "cm", fs: "1", to: RECIPIENT, su: subject, body}).toString();
    return {data: {recipient: RECIPIENT, subject, body, text, mailto, gmail: gmail.href, page}, errors};
  }
  function mount(form = document.getElementById("feedbackForm")) {
    if (!form) return null;
    if (mounted.has(form)) return mounted.get(form);
    const fields = {name: form.querySelector("#feedbackName"), category: form.querySelector("#feedbackCategory"), message: form.querySelector("#feedbackMessage")};
    const email = form.querySelector("#feedbackEmailButton"), gmail = form.querySelector("#feedbackGmailButton"), copy = form.querySelector("#feedbackCopyButton"), status = form.querySelector("#feedbackStatus");
    if (Object.values(fields).some(field => !field) || !email || !gmail || !copy || !status) return null;
    form.noValidate = true; fields.name.maxLength = 80; fields.message.maxLength = MAX_MESSAGE;
    email.type = "submit"; gmail.type = copy.type = "button"; status.setAttribute("data-tpx-no-translate", "");
    const recipient = document.getElementById("feedbackRecipient");
    if (recipient) {recipient.setAttribute("data-tpx-user-text", ""); recipient.textContent = RECIPIENT; recipient.href = `mailto:${RECIPIENT}`; recipient.target = "_blank"; recipient.rel = "noopener noreferrer";}
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
    let manual = form.querySelector("#feedbackManual");
    if (!manual) {
      manual = document.createElement("div"); manual.id = "feedbackManual"; manual.className = "feedback-manual"; manual.hidden = true;
      manual.innerHTML = '<label for="feedbackPreparedMessage" data-feedback-en="Copy this draft manually" data-feedback-id="Salin draf ini secara manual"></label><textarea id="feedbackPreparedMessage" rows="8" readonly spellcheck="false" data-tpx-no-translate></textarea><p data-feedback-en="Select and copy the full draft, then paste it into your email app. Review it and press Send there." data-feedback-id="Pilih dan salin seluruh draf, lalu tempel ke aplikasi email. Periksa dan tekan Kirim di aplikasi tersebut."></p>';
      form.append(manual);
    }
    const prepared = manual.querySelector("#feedbackPreparedMessage");
    let statusCopy = null, attempted = false, draftVersion = 0, actionVersion = 0, copying = false;
    function read() {return buildDraft({name: fields.name.value, category: fields.category.value, message: fields.message.value});}
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
    function validate() {
      attempted = true;
      const result = read(); displayErrors(result, true);
      if (!result.data) setStatus(pair("Check the highlighted fields before continuing.", "Periksa kolom yang ditandai sebelum melanjutkan."));
      return result.data;
    }
    function showManual(draft, focus = true) {
      if (!prepared) return;
      manual.hidden = false; prepared.value = draft.text;
      if (focus) {prepared.focus(); try {prepared.select();} catch (_) { /* The draft remains selectable manually. */ }}
    }
    function openDraft(url) {
      const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.hidden = true;
      document.body.append(link);
      try {link.click(); return true;} catch (_) {return false;} finally {link.remove();}
    }
    form.addEventListener("submit", event => {
      event.preventDefault(); actionVersion++;
      const draft = validate(); if (!draft) return;
      if (draft.mailto.length > MAX_MAILTO) {
        showManual(draft);
        setStatus(pair("This draft is long for an email-app link. Use Open Gmail or Copy message to keep the full text. The complete draft is available below.", "Draf ini terlalu panjang untuk tautan aplikasi email. Gunakan Buka Gmail atau Salin pesan agar teks tetap lengkap. Seluruh draf tersedia di bawah."));
      } else if (openDraft(draft.mailto)) setStatus(pair("Email draft prepared. Review it and press Send in your email app. If the app did not open, use Open Gmail or Copy message.", "Draf email disiapkan. Periksa dan tekan Kirim di aplikasi email. Jika aplikasinya tidak terbuka, gunakan Buka Gmail atau Salin pesan."));
      else {showManual(draft); setStatus(pair("Your browser could not open the email draft. Copy the complete draft below or use Open Gmail, then send it from your email app.", "Browser belum dapat membuka draf email. Salin draf lengkap di bawah atau gunakan Buka Gmail, lalu kirim melalui aplikasi email Anda."));}
    });
    gmail.addEventListener("click", () => {
      actionVersion++;
      const draft = validate(); if (!draft) return;
      const opened = openDraft(draft.gmail); showManual(draft, !opened);
      setStatus(opened ? pair("Gmail draft prepared. Review it and press Send in Gmail. If a tab did not open, copy the complete draft below.", "Draf Gmail disiapkan. Periksa dan tekan Kirim di Gmail. Jika tab tidak terbuka, salin draf lengkap di bawah.") : pair("Your browser could not open Gmail. Copy the complete draft below and send it using your email app.", "Browser belum dapat membuka Gmail. Salin draf lengkap di bawah dan kirim menggunakan aplikasi email Anda."));
    });
    copy.addEventListener("click", async () => {
      if (copying) return;
      const draft = validate(); if (!draft) return;
      const action = ++actionVersion, version = draftVersion;
      copying = true; copy.disabled = true; copy.setAttribute("aria-busy", "true");
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(draft.text);
        if (action !== actionVersion) return;
        if (version !== draftVersion) {setStatus(pair("Your draft changed. Copy again to include your latest edits.", "Draf Anda berubah. Salin lagi untuk menyertakan suntingan terbaru.")); return;}
        setStatus(pair("Draft copied. Paste it into your email app, review it and press Send there.", "Draf disalin. Tempel ke aplikasi email, periksa, lalu tekan Kirim di sana."));
      } catch (_) {
        if (action !== actionVersion) return;
        if (version !== draftVersion) {setStatus(pair("Your draft changed. Copy again to include your latest edits.", "Draf Anda berubah. Salin lagi untuk menyertakan suntingan terbaru.")); return;}
        showManual(draft); setStatus(pair("Automatic copying is unavailable. Select and copy the complete draft below, then send it using your email app.", "Salin otomatis belum tersedia. Pilih dan salin draf lengkap di bawah, lalu kirim menggunakan aplikasi email Anda."));
      } finally {copying = false; copy.disabled = false; copy.removeAttribute("aria-busy");}
    });
    function localize() {
      counter.textContent = translate(pair(`${fields.message.value.length} / 2,000 characters`, `${fields.message.value.length} / 2.000 karakter`));
      manual.querySelectorAll("[data-feedback-en]").forEach(node => {node.textContent = translate(pair(node.dataset.feedbackEn, node.dataset.feedbackId));});
      if (statusCopy) status.textContent = translate(statusCopy);
      const result = read(); if (attempted) displayErrors(result); if (!manual.hidden && result.data && prepared) prepared.value = result.data.text;
    }
    Object.values(fields).forEach(field => field.addEventListener(field === fields.category ? "change" : "input", () => {
      draftVersion++; setStatus(null);
      if (!manual.hidden) {const result = read(); if (result.data && prepared) prepared.value = result.data.text; else manual.hidden = true;}
      localize();
    }));
    window.addEventListener("thermpyx:languagechange", localize); localize();
    const controller = {prepare: read}; mounted.set(form, controller); return controller;
  }
  window.TPXFeedback = {mount, buildDraft};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount(), {once: true}); else mount();
})();
