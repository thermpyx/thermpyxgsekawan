/* Shared Google account and private content controls. Firebase enforces ownership. */
(() => {
  "use strict";
  const listeners = new Set(), mounted = new WeakMap();
  const siteBase = new URL("../", document.currentScript?.src || new URL("js/content-store.js", location.href));
  let currentSession = null, connectedBackend = null, unsubscribeBackend = null, sessionRead = null, authSequence = 0, authRevision = 0;
  function language() {
    if (window.TPX?.getLanguage) return window.TPX.getLanguage();
    try {const stored = localStorage.getItem("thermpyx-language"); if (stored === "id" || stored === "en") return stored;} catch (_) { /* Storage can be unavailable. */ }
    return document.documentElement.lang === "id" ? "id" : "en";
  }
  const tr = (en, id) => language() === "id" ? id : en;
  const pairedError = (en, id, code) => ({message: tr(en, id), messageEn: en, messageId: id, ...(code ? {code} : {})});
  const contentErrorMessage = error => error?.messageEn ? tr(error.messageEn, error.messageId) : tr("The cloud request could not be completed. Your local draft is safe.", "Permintaan cloud belum dapat diselesaikan. Draf lokal Anda tetap aman.");
  function friendly(error) {
    if (!error) return null;
    if (error.messageEn && error.messageId) return pairedError(error.messageEn, error.messageId, error.code);
    const copy = {
      "auth/popup-closed-by-user": ["Google sign-in was canceled. You can try again when you are ready.", "Login Google dibatalkan. Anda bisa mencoba lagi saat siap."],
      "auth/cancelled-popup-request": ["Another Google sign-in window is already open. Finish that window first.", "Jendela login Google lain masih terbuka. Selesaikan jendela itu dahulu."],
      "auth/popup-blocked": ["Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.", "Browser memblokir jendela login Google. Izinkan pop-up untuk situs ini lalu coba lagi."],
      "auth/unauthorized-domain": ["This website is not authorized for Google sign-in yet. Ask the site administrator to check Firebase Authentication domains.", "Situs ini belum diizinkan untuk login Google. Minta pengelola memeriksa domain Firebase Authentication."],
      "auth/operation-not-allowed": ["Google sign-in has not been enabled yet. Ask the site administrator to finish the Firebase setup.", "Login Google belum diaktifkan. Minta pengelola menyelesaikan pengaturan Firebase."],
      "auth/network-request-failed": ["Google sign-in could not connect. Check your connection and try again. Your local draft is safe.", "Login Google belum dapat terhubung. Periksa koneksi lalu coba lagi. Draf lokal Anda tetap aman."],
      "auth/web-storage-unsupported": ["Your browser could not save the account session. Allow site storage or use another browser.", "Browser belum dapat menyimpan sesi akun. Izinkan penyimpanan situs atau gunakan browser lain."],
      "auth/operation-not-supported-in-this-environment": ["Open this website through its HTTPS address or a local web server to sign in.", "Buka situs melalui alamat HTTPS atau server web lokal untuk masuk."],
      "auth/invalid-api-key": ["The account connection is not configured correctly. Ask the site administrator to check Firebase settings.", "Koneksi akun belum dikonfigurasi dengan benar. Minta pengelola memeriksa pengaturan Firebase."],
      "auth/app-not-authorized": ["The account connection is not authorized for this website. Contact the site administrator.", "Koneksi akun belum diizinkan untuk situs ini. Hubungi pengelola situs."],
      "permission-denied": ["Access denied. Sign in with the Google account that owns this content and check the Firebase rules.", "Akses ditolak. Masuk dengan akun Google pemilik konten dan periksa aturan Firebase."],
      "PERMISSION_DENIED": ["Access denied. Sign in with the Google account that owns this content and check the Firebase rules.", "Akses ditolak. Masuk dengan akun Google pemilik konten dan periksa aturan Firebase."],
      "auth/too-many-requests": ["Too many sign-in attempts. Wait before trying again.", "Terlalu banyak percobaan masuk. Tunggu sebelum mencoba lagi."]
    };
    if (copy[error.code]) return pairedError(...copy[error.code], error.code);
    return pairedError("The cloud request could not be completed. Check your connection or the account setup guide. Your local draft is safe.", "Permintaan cloud belum dapat diselesaikan. Periksa koneksi atau panduan pengaturan akun. Draf lokal Anda tetap aman.", error.code || "cloud/unavailable");
  }
  const unavailable = () => ({data: null, error: pairedError("The cloud connection is not ready. You can keep editing locally.", "Koneksi cloud belum siap. Anda tetap bisa mengedit secara lokal.", "cloud/unavailable")});
  function teacherSession(active) {return active?.user?.id && !active.user.isAnonymous && !active.isAnonymous && (!active.user.provider || active.user.provider === "google.com") ? active : null;}
  function emit(active, event = "") {
    authRevision++;
    currentSession = teacherSession(active);
    for (const callback of listeners) {try {callback(currentSession, event);} catch (_) { /* One view must not break other views. */ }}
  }
  function backend() {
    const api = window.TPXFirebase;
    if (!api?.auth) return null;
    if (connectedBackend !== api) {
      unsubscribeBackend?.(); connectedBackend = api;
      unsubscribeBackend = api.auth.onAuthChange((active, event) => emit(active, event));
    }
    return api;
  }
  function session() {
    const api = backend();
    if (!api) return Promise.resolve(null);
    if (sessionRead) return sessionRead;
    const revision = authRevision;
    sessionRead = Promise.resolve().then(() => api.auth.session()).then(active => {if (revision === authRevision) currentSession = teacherSession(active); return currentSession;}).catch(() => {if (revision === authRevision) currentSession = null; return currentSession;}).finally(() => {sessionRead = null;});
    return sessionRead;
  }
  function onAuthChange(callback) {listeners.add(callback); backend(); return () => listeners.delete(callback);}
  async function signInWithGoogle() {
    const api = backend();
    if (!api?.auth.signInWithGoogle) return unavailable();
    try {
      // Invoke the popup while the button's user activation is still present.
      // Firebase owns readiness; do not await a session read before this call.
      const result = await api.auth.signInWithGoogle();
      if (result.error) return {data: null, error: friendly(result.error)};
      const active = teacherSession(result.data?.session);
      if (!active) return {data: null, error: pairedError("Google sign-in did not connect an account. Try again to save content online.", "Login Google belum menghubungkan akun. Coba lagi untuk menyimpan konten secara online.", "auth/session-missing")};
      emit(active, "SIGNED_IN"); return {data: {session: active}, error: null};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  async function signOut() {
    const api = backend(); if (!api) return unavailable();
    try {const result = await api.auth.signOut(); if (!result.error) emit(null, "SIGNED_OUT"); return {data: result.data || null, error: friendly(result.error)};}
    catch (error) {return {data: null, error: friendly(error)};}
  }
  function invalid(en, id) {return Object.assign(new Error(tr(en, id)), {messageEn: en, messageId: id, code: "content/invalid"});}
  function text(value, name, max) {
    const result = String(value ?? "").trim();
    if (!result || result.length > max) throw invalid(`${name.en}: required, maximum ${max} characters.`, `${name.id}: wajib diisi, maksimal ${max} karakter.`);
    return result;
  }
  function normalizeQuestions(questions) {
    if (!Array.isArray(questions) || !questions.length || questions.length > 100) throw invalid("Use 1–100 questions per set.", "Gunakan 1–100 soal per paket.");
    return questions.map((item, index) => {
      const question = text(item.question, {en: `Question ${index + 1}`, id: `Soal ${index + 1}`}, 2000);
      if (!Array.isArray(item.options) || item.options.length !== 4) throw invalid("Each question needs four answers.", "Setiap soal membutuhkan empat jawaban.");
      const options = item.options.map(option => text(option, {en: "Answer", id: "Jawaban"}, 500));
      if (new Set(options.map(option => option.toLocaleLowerCase())).size !== 4) throw invalid("Answer choices must be different.", "Pilihan jawaban harus berbeda.");
      const correctAnswer = item.correctAnswer;
      if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) throw invalid("Select a correct answer for every question.", "Pilih jawaban benar untuk setiap soal.");
      const explanation = String(item.explanation || "").trim();
      if (explanation.length > 3000) throw invalid("Explanation is too long.", "Penjelasan terlalu panjang.");
      return {question, options, correctAnswer, explanation};
    });
  }
  function normalizeCards(cards) {
    if (!Array.isArray(cards) || !cards.length || cards.length > 100) throw invalid("Use 1–100 flashcards per deck.", "Gunakan 1–100 flashcard per deck.");
    return cards.map(card => ({front: text(card.front, {en: "Card front", id: "Sisi depan"}, 2000), back: text(card.back, {en: "Card back", id: "Sisi belakang"}, 8000)}));
  }
  async function listQuestionSets() {
    const api = backend(); if (!api?.questionSets) return unavailable();
    if (!await session()) return {data: [], error: null};
    try {const result = await api.questionSets.list(); return {data: result.data, error: friendly(result.error)};}
    catch (error) {return {data: null, error: friendly(error)};}
  }
  async function saveQuestionSet(input, expectedOwnerId) {
    const api = backend(); if (!api?.questionSets) return unavailable();
    const active = await session();
    if (!active) return {data: null, error: pairedError("Sign in with Google before saving online. Your local draft is safe.", "Masuk dengan Google sebelum menyimpan online. Draf lokal Anda tetap aman.", "auth/sign-in-required")};
    if (expectedOwnerId && active.user.id !== expectedOwnerId) return {data: null, error: pairedError("Your account changed before saving. Your local draft is safe. Reload your account and try again.", "Akun berubah sebelum penyimpanan. Draf lokal tetap aman. Muat ulang akun lalu coba lagi.", "auth/account-changed")};
    try {
      const payload = {title: text(input.title, {en: "Title", id: "Judul"}, 140), topic: String(input.topic || "all").slice(0, 80), questions: normalizeQuestions(input.questions)};
      if (input.id) payload.id = input.id;
      const result = await api.questionSets.save(payload, expectedOwnerId || active.user.id);
      return {data: result.data, error: friendly(result.error)};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  async function deleteQuestionSet(id) {
    const api = backend(); if (!api?.questionSets) return unavailable();
    if (!await session()) return {data: null, error: pairedError("Sign in with Google to delete online content.", "Masuk dengan Google untuk menghapus konten online.", "auth/sign-in-required")};
    try {const result = await api.questionSets.remove(id); return {data: result.data, error: friendly(result.error)};}
    catch (error) {return {data: null, error: friendly(error)};}
  }
  function mountAuth(container) {
    if (!container) return null;
    if (mounted.has(container)) return mounted.get(container);
    container.dataset.authMounted = "true"; container.classList.add("tpx-content-auth"); container.setAttribute("data-tpx-no-translate", "");
    const uid = `tpx-auth-${++authSequence}`;
    container.innerHTML = `<div class="tpx-auth-summary"><span class="tpx-auth-state"></span><button class="tpx-auth-toggle" type="button" aria-controls="${uid}-dialog" aria-expanded="false" aria-haspopup="dialog"></button></div>
      <dialog class="tpx-auth-dialog" id="${uid}-dialog" aria-labelledby="${uid}-title" aria-describedby="${uid}-intro">
        <div class="tpx-auth-dialog-heading"><div><p class="tpx-auth-eyebrow">THERMPYX</p><h2 id="${uid}-title" data-auth-en="Your learning account" data-auth-id="Akun belajar Anda"></h2></div><button type="button" class="tpx-auth-close" data-auth-en="Close" data-auth-id="Tutup"></button></div>
        <p class="tpx-auth-dialog-intro" id="${uid}-intro" data-auth-en="Use your Google account to save question sets and host live quizzes. Learning tools and local drafts are available without an account." data-auth-id="Gunakan akun Google untuk menyimpan paket soal dan membuat kuis langsung. Alat belajar dan draf lokal bisa digunakan tanpa akun."></p>
        <div class="tpx-auth-fields" hidden>
          <div class="tpx-auth-google-section"><button type="button" class="tpx-auth-google"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.04 46.98 31.89 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg><span data-auth-en="Continue with Google" data-auth-id="Lanjutkan dengan Google"></span></button><p class="tpx-auth-provider-note" data-auth-en="Choose a Google account in the secure sign-in window." data-auth-id="Pilih akun Google melalui jendela masuk yang aman."></p></div>
          <div class="tpx-auth-account-info" hidden><span class="tpx-auth-avatar" aria-hidden="true"></span><div><p class="tpx-auth-account-name"></p><p class="tpx-auth-account-email"></p></div></div>
          <button type="button" class="tpx-auth-signout" hidden data-auth-en="Sign out" data-auth-id="Keluar"></button>
          <p class="tpx-auth-note" data-auth-en="Your question sets stay private in your account. Local drafts work without signing in." data-auth-id="Paket soal tersimpan secara pribadi di akun Anda. Draf lokal tetap bisa digunakan tanpa masuk."></p>
          <a class="tpx-auth-guide" target="_blank" rel="noopener" data-auth-en="Account setup help" data-auth-id="Bantuan pengaturan akun"></a>
        </div><p class="tpx-auth-message" role="status" aria-live="polite" aria-atomic="true"></p>
      </dialog>`;
    const dialog = container.querySelector("dialog"), summary = container.querySelector(".tpx-auth-state"), fields = container.querySelector(".tpx-auth-fields"), toggle = container.querySelector(".tpx-auth-toggle"), google = container.querySelector(".tpx-auth-google"), logout = container.querySelector(".tpx-auth-signout"), status = container.querySelector(".tpx-auth-message"), info = container.querySelector(".tpx-auth-account-info");
    container.querySelector(".tpx-auth-guide").href = new URL("docs/PANDUAN-FIREBASE.md", siteBase).href;
    let active = null, busy = false, statusCopy = null, returnFocus = null;
    function message(en, id) {statusCopy = {en, id}; status.textContent = tr(en, id);}
    function errorMessage(error) {const paired = friendly(error); statusCopy = {en: paired.messageEn, id: paired.messageId}; status.textContent = contentErrorMessage(paired);}
    function expand(open = true) {
      if (open && !dialog.open) {returnFocus = document.activeElement; fields.hidden = false; toggle.setAttribute("aria-expanded", "true"); dialog.showModal(); (active ? logout : google).focus();}
      else if (!open && dialog.open) dialog.close();
    }
    function render(next) {
      active = teacherSession(next);
      summary.hidden = !active; summary.textContent = active ? `${tr("Connected", "Terhubung")}: ${active.user.email || tr("Google account", "akun Google")}` : "";
      toggle.textContent = active ? tr("Account", "Akun") : tr("Sign in with Google", "Masuk dengan Google");
      container.querySelector(".tpx-auth-google-section").hidden = Boolean(active); info.hidden = !active; logout.hidden = !active;
      const name = active?.user.displayName || active?.user.name || tr("Google account", "Akun Google");
      info.querySelector(".tpx-auth-account-name").textContent = active ? name : "";
      info.querySelector(".tpx-auth-account-email").textContent = active?.user.email || "";
      info.querySelector(".tpx-auth-avatar").textContent = active ? Array.from(name.trim())[0]?.toUpperCase() || "G" : "";
      google.disabled = busy; logout.disabled = busy;
    }
    function localize() {
      container.querySelectorAll("[data-auth-en]").forEach(node => {node.textContent = tr(node.dataset.authEn, node.dataset.authId);});
      if (statusCopy) status.textContent = tr(statusCopy.en, statusCopy.id);
      render(active);
    }
    async function perform(task) {
      if (busy) return;
      busy = true; container.setAttribute("aria-busy", "true"); render(active); message("Connecting…", "Menghubungkan…");
      try {await task();} catch (error) {errorMessage(error);}
      finally {busy = false; container.removeAttribute("aria-busy"); render(active); if (dialog.open && (!document.activeElement || document.activeElement === document.body || document.activeElement.disabled || document.activeElement.closest("[hidden]"))) (active ? logout : google).focus();}
    }
    google.addEventListener("click", () => perform(async () => {const result = await signInWithGoogle(); if (result.error) errorMessage(result.error); else {render(result.data.session); message("Google account connected.", "Akun Google terhubung.");}}));
    logout.addEventListener("click", () => perform(async () => {const result = await signOut(); if (result.error) errorMessage(result.error); else {render(null); message("Signed out. Your local drafts are unchanged.", "Sudah keluar. Draf lokal tetap tersimpan."); google.focus();}}));
    toggle.addEventListener("click", () => expand(!dialog.open)); dialog.querySelector(".tpx-auth-close").addEventListener("click", () => expand(false));
    dialog.addEventListener("click", event => {const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) expand(false);});
    dialog.addEventListener("close", () => {fields.hidden = true; toggle.setAttribute("aria-expanded", "false"); if (returnFocus?.isConnected) returnFocus.focus();});
    window.addEventListener("thermpyx:languagechange", localize); onAuthChange(render); localize(); session().then(render);
    const controller = {open: () => expand(), showSignIn: () => expand(), showRegister: () => expand()}; mounted.set(container, controller); return controller;
  }
  window.TPXContent = {session, onAuthChange, signInWithGoogle, signOut, mountAuth, normalizeQuestions, normalizeCards, errorMessage: contentErrorMessage, listQuestionSets, saveQuestionSet, deleteQuestionSet,
    listDecks: async () => unavailable(), saveDeck: async () => unavailable(), deleteDeck: async () => unavailable()};
  session();
})();
