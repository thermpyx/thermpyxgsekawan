/* THERMPYX content library. Browser key only; writes require Supabase Auth + RLS. */
(() => {
  "use strict";
  const listeners = new Set();
  const mounted = new WeakMap();
  const siteBase = new URL("../", document.currentScript?.src || new URL("js/content-store.js", location.href));
  let currentSession = null, initialized = false, subscription = null, lastAuthEvent = "", authSequence = 0, sessionRead = null;
  const callback = window.TPXAuthCallback || {};
  let callbackSettled = false, recoveryReady = false, recoveryUserId = null, recoveryAccessToken = null, callbackProblem = false;
  function language() {
    if (window.TPX?.getLanguage) return window.TPX.getLanguage();
    try { const stored = localStorage.getItem("thermpyx-language"); if (stored === "id" || stored === "en") return stored; } catch (_) { /* Storage can be unavailable. */ }
    return document.documentElement.lang === "id" ? "id" : "en";
  }
  const tr = (en, id) => language() === "id" ? id : en;
  const pairedError = (en, id, code) => ({message: tr(en, id), messageEn: en, messageId: id, ...(code ? {code} : {})});
  const contentErrorMessage = error => error?.messageEn ? tr(error.messageEn, error.messageId) : String(error?.message || "");
  const client = () => typeof supabaseClient !== "undefined" ? supabaseClient : null;
  function clearAuthFragment() {
    const url = new URL(location.href), fragment = new URLSearchParams(url.hash.slice(1));
    if (["access_token", "refresh_token", "error", "error_code", "error_description"].some(key => fragment.has(key))) url.hash = "account";
    ["code", "error", "error_code", "error_description"].forEach(key => url.searchParams.delete(key));
    if (url.searchParams.get("account") === "recovery") {url.searchParams.delete("account"); url.hash = "account";}
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    try { window.parent.TPXPersistentShell?.reportLocation(window); } catch (_) { /* Standalone page. */ }
  }
  function clearRecovery() {
    recoveryReady = false;
    recoveryUserId = null;
    recoveryAccessToken = null;
  }
  function acceptRecovery(active) {
    recoveryReady = true;
    recoveryUserId = active.user.id;
    recoveryAccessToken = active.access_token || null;
  }
  function emit(session, event = "") {
    currentSession = session || null;
    lastAuthEvent = event;
    if (event === "PASSWORD_RECOVERY" && session) {acceptRecovery(session); callbackProblem = false;}
    else if (event === "SIGNED_OUT" || !session || (recoveryReady && session.user.id !== recoveryUserId)) clearRecovery();
    else if (recoveryReady && event === "TOKEN_REFRESHED") {
      if (session.access_token) recoveryAccessToken = session.access_token;
      else clearRecovery();
    }
    // Supabase reannounces SIGNED_IN on tab visibility changes. Keep an
    // already-validated recovery for that identical session, but never grant
    // recovery to an ordinary login or a different session of the same user.
    else if (recoveryReady && event === "SIGNED_IN" && callbackSettled && (!recoveryAccessToken || session.access_token !== recoveryAccessToken)) clearRecovery();
    // getSession settles SDK initialization. Never erase a callback while the
    // SDK may still be exchanging its tokens/code or validating its user.
    if (callbackSettled && session && ["SIGNED_IN", "PASSWORD_RECOVERY", "INITIAL_SESSION"].includes(event)) clearAuthFragment();
    for (const callback of listeners) {
      try { callback(currentSession, event); } catch (_) { /* One view must not break other views. */ }
    }
  }
  function friendly(error) {
    if (!error) return null;
    const authCopy = {
      invalid_credentials: ["Email or password is incorrect.", "Email atau kata sandi salah."],
      email_not_confirmed: ["Confirm your email before signing in. You can request another code below.", "Konfirmasikan email sebelum masuk. Anda bisa meminta kode baru di bawah."],
      otp_expired: ["The code is invalid or has expired. Request a new code and try again.", "Kode salah atau sudah kedaluwarsa. Minta kode baru lalu coba lagi."],
      over_email_send_rate_limit: ["Please wait before requesting another email.", "Tunggu sebentar sebelum meminta email berikutnya."],
      over_request_rate_limit: ["Too many attempts. Please wait and try again.", "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."],
      email_address_invalid: ["Enter a valid email address.", "Masukkan alamat email yang valid."],
      user_already_exists: ["An account with this email already exists. Sign in or reset your password.", "Akun dengan email ini sudah ada. Masuk atau atur ulang kata sandi."],
      weak_password: ["Use a stronger password that meets the account requirements.", "Gunakan kata sandi yang lebih kuat sesuai ketentuan akun."],
      same_password: ["Choose a password different from your current password.", "Pilih kata sandi yang berbeda dari kata sandi sebelumnya."],
      session_not_found: ["Your session has expired. Sign in again or request a new reset link.", "Sesi Anda sudah berakhir. Masuk kembali atau minta tautan pemulihan baru."],
      email_address_not_authorized: ["Email delivery is restricted by the project's email service. Contact the site administrator or use an already confirmed account.", "Pengiriman email dibatasi layanan email proyek. Hubungi pengelola situs atau gunakan akun yang sudah terkonfirmasi."],
      email_provider_disabled: ["Email sign-in is disabled for this project. Contact the site administrator.", "Login email belum diaktifkan untuk proyek ini. Hubungi pengelola situs."],
      unexpected_failure: ["The email service could not complete this request. Try later or contact the site administrator.", "Layanan email belum dapat menyelesaikan permintaan ini. Coba nanti atau hubungi pengelola situs."]
    };
    if (authCopy[error.code]) return pairedError(...authCopy[error.code], error.code);
    if (["42P01", "PGRST205", "PGRST204"].includes(error.code))
      return pairedError("The content tables are not configured yet. Follow the Supabase guide.", "Tabel konten belum disiapkan. Ikuti panduan Supabase.");
    if (error.code === "42501")
      return pairedError("Access denied. Sign in as the content owner and check the RLS policies.", "Akses ditolak. Masuk sebagai pemilik konten dan periksa kebijakan RLS.");
    return { message: String(error.message || tr("Connection failed. Your local draft is safe.", "Koneksi gagal. Draf lokal Anda tetap tersimpan.")) };
  }
  const unavailable = () => ({ data: null, error: pairedError("Cloud connection is unavailable. You can keep editing locally.", "Koneksi cloud belum tersedia. Anda tetap bisa mengedit secara lokal.") });
  function callbackErrorKind(error) {
    if (!error) return "";
    const expiredCodes = ["otp_expired", "flow_state_expired"];
    if (expiredCodes.includes(error.code) || expiredCodes.includes(error.details?.code)) return "expired";
    // Redirect-validation errors also default to status 500 in the SDK; that
    // status alone does not establish a connection/service failure.
    if (error.name === "AuthRetryableFetchError" || (error.name === "AuthApiError" && Number.isInteger(error.status) && error.status >= 500 && error.status <= 599)) return "network";
    return "rejected";
  }
  function session() {
    const db = client();
    if (!db?.auth) {
      clearRecovery();
      callbackSettled = true;
      callbackProblem = callback.recoveryRequested || callback.present ? "unavailable" : false;
      if (callbackProblem) {callback.release?.(); clearAuthFragment();}
      return Promise.resolve(null);
    }
    if (sessionRead) return sessionRead;
    if (!initialized) {
      initialized = true;
      subscription = db.auth.onAuthStateChange((event, next) => emit(next, event));
    }
    sessionRead = (async () => {
      try {
        // getSession awaits SDK startup but does not return startup errors.
        // initialize() returns that cached result without retrying the link.
        // Retain a fixed diagnostic category only, never raw error text/URLs.
        const initialIssue = !callbackSettled && typeof db.auth.initialize === "function" ? callbackErrorKind((await db.auth.initialize())?.error) : "";
        const { data, error } = await db.auth.getSession();
        currentSession = error ? null : data?.session || null;
        if (!callbackSettled) {
          // An early SDK PASSWORD_RECOVERY may precede this script's listener.
          // A matching SDK-accepted fragment session can recover that intent;
          // an ordinary login or a forged account=recovery query cannot.
          if (!initialIssue && !error && !callback.error && callback.hasRecoveryTokens && callback.matchesSession?.(currentSession)) acceptRecovery(currentSession);
          if (initialIssue) clearRecovery();
          if (callback.recoveryRequested || callback.present) {
            if (initialIssue === "expired" || ["otp_expired", "flow_state_expired"].includes(callback.error)) callbackProblem = "expired";
            else if (initialIssue === "network") callbackProblem = "network";
            else if (callback.error) callbackProblem = "rejected";
            else if (callback.recoveryRequested && !callback.hasRecoveryTokens && !recoveryReady) callbackProblem = "missing";
            else if (initialIssue || error || !currentSession || (callback.recoveryRequested && !recoveryReady)) callbackProblem = initialIssue || callbackErrorKind(error) || "rejected";
          }
          callbackSettled = true;
          callback.release?.();
          clearAuthFragment();
        }
        if (!currentSession || (recoveryReady && (currentSession.user.id !== recoveryUserId || (recoveryAccessToken && currentSession.access_token !== recoveryAccessToken)))) clearRecovery();
        return currentSession;
      } catch (error) {
        currentSession = null;
        clearRecovery();
        if (!callbackSettled) {callbackSettled = true; callbackProblem = callback.recoveryRequested || callback.present ? callbackErrorKind(error) : false; callback.release?.(); clearAuthFragment();}
        return null;
      } finally {sessionRead = null;}
    })();
    return sessionRead;
  }
  function onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  async function signIn(email, password) {
    clearRecovery();
    const db = client();
    if (!db?.auth) return unavailable();
    try {
      const result = await db.auth.signInWithPassword({ email: email.trim(), password });
      if (!result.error) emit(result.data.session);
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function signUp(email, password) {
    const db = client();
    if (!db?.auth) return unavailable();
    try {
      const result = await db.auth.signUp({ email: email.trim(), password, options: {emailRedirectTo: new URL("index.html", siteBase).href} });
      if (!result.error && result.data.session) emit(result.data.session);
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function signOut() {
    clearRecovery();
    const db = client();
    if (!db?.auth) return unavailable();
    try {
      const result = await db.auth.signOut();
      if (!result.error) emit(null);
      return { data: null, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function verifyEmailCode(email, token) {
    const db = client();
    if (!db?.auth?.verifyOtp) return unavailable();
    const cleanToken = String(token || "").trim();
    if (!/^\d{6,10}$/.test(cleanToken)) return {data: null, error: pairedError("Enter the 6–10 digit code from your email.", "Masukkan kode 6–10 digit dari email Anda.")};
    try {
      const result = await db.auth.verifyOtp({email: String(email).trim(), token: cleanToken, type: "signup"});
      if (!result.error && result.data?.session) emit(result.data.session);
      return {data: result.data, error: friendly(result.error)};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  async function resendVerification(email) {
    const db = client();
    if (!db?.auth?.resend) return unavailable();
    try {
      const result = await db.auth.resend({type: "signup", email: String(email).trim(), options: {emailRedirectTo: new URL("index.html", siteBase).href}});
      return {data: result.data, error: friendly(result.error)};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  async function requestPasswordReset(email) {
    const db = client();
    if (!db?.auth?.resetPasswordForEmail) return unavailable();
    try {
      const result = await db.auth.resetPasswordForEmail(String(email).trim(), {redirectTo: new URL("index.html?account=recovery", siteBase).href});
      return {data: result.data, error: friendly(result.error)};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  async function updatePassword(password) {
    const db = client();
    if (!db?.auth?.updateUser) return unavailable();
    if (!recoveryReady || !currentSession) return {data: null, error: pairedError("Open a valid password reset link before choosing a new password. Request a new link below.", "Buka tautan pemulihan yang valid sebelum membuat kata sandi baru. Minta tautan baru di bawah.", "recovery_required")};
    try {
      const result = await db.auth.updateUser({password});
      if (!result.error) {lastAuthEvent = "USER_UPDATED"; clearRecovery();}
      return {data: result.data, error: friendly(result.error)};
    } catch (error) {return {data: null, error: friendly(error)};}
  }
  function text(value, name, max) {
    const result = String(value ?? "").trim();
    if (!result || result.length > max) throw new Error(`${name}: ${tr("required, maximum", "wajib diisi, maksimal")} ${max} ${tr("characters", "karakter")}.`);
    return result;
  }
  function normalizeQuestions(questions) {
    if (!Array.isArray(questions) || !questions.length || questions.length > 100)
      throw new Error(tr("Use 1–100 questions per set.", "Gunakan 1–100 soal per paket."));
    return questions.map((item, index) => {
      const question = text(item.question, `${tr("Question", "Soal")} ${index + 1}`, 2000);
      if (!Array.isArray(item.options) || item.options.length !== 4)
        throw new Error(tr("Each question needs four answers.", "Setiap soal membutuhkan empat jawaban."));
      const options = item.options.map(option => text(option, tr("Answer", "Jawaban"), 500));
      if (new Set(options.map(option => option.toLocaleLowerCase())).size !== 4)
        throw new Error(tr("Answer choices must be different.", "Pilihan jawaban harus berbeda."));
      const correctAnswer = item.correctAnswer;
      if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3)
        throw new Error(tr("Select a correct answer for every question.", "Pilih jawaban benar untuk setiap soal."));
      const explanation = String(item.explanation || "").trim();
      if (explanation.length > 3000) throw new Error(tr("Explanation is too long.", "Penjelasan terlalu panjang."));
      return { question, options, correctAnswer, explanation };
    });
  }
  function normalizeCards(cards) {
    if (!Array.isArray(cards) || !cards.length || cards.length > 100)
      throw new Error(tr("Use 1–100 flashcards per deck.", "Gunakan 1–100 flashcard per deck."));
    return cards.map(card => ({ front: text(card.front, tr("Card front", "Sisi depan"), 2000), back: text(card.back, tr("Card back", "Sisi belakang"), 8000) }));
  }
  async function list(table, requiresOwner) {
    const db = client();
    if (!db) return unavailable();
    const active = await session();
    if (requiresOwner && !active) return { data: [], error: null };
    try {
      let query = db.from(table).select("*").order("created_at", { ascending: false });
      if (requiresOwner) query = query.eq("owner_id", active.user.id);
      const result = await query.limit(200);
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function save(table, input, kind, expectedOwnerId) {
    const db = client();
    if (!db) return unavailable();
    const active = await session();
    if (!active) return { data: null, error: pairedError("Sign in before saving to cloud. Local editing remains available.", "Masuk sebelum menyimpan ke cloud. Pengeditan lokal tetap tersedia.") };
    if (expectedOwnerId && active.user.id !== expectedOwnerId) return {data: null, error: pairedError("Your account changed before saving. Your local draft is safe. Reload your account and try again.", "Akun berubah sebelum penyimpanan. Draf lokal tetap aman. Muat ulang akun lalu coba lagi.")};
    try {
      const payload = { title: text(input.title, tr("Title", "Judul"), 140), topic: String(input.topic || "all").slice(0, 80), owner_id: active.user.id };
      if (kind === "questions") payload.questions = normalizeQuestions(input.questions);
      else {
        payload.cards = normalizeCards(input.cards);
        payload.is_public = Boolean(input.is_public);
        payload.source_name = input.source_name ? String(input.source_name).slice(0, 255) : null;
        payload.source_type = input.source_type ? String(input.source_type).slice(0, 40) : null;
      }
      // Scope both reads and writes; do not trust a caller-provided owner_id.
      const query = input.id ? db.from(table).update(payload).eq("id", input.id).eq("owner_id", active.user.id) : db.from(table).insert(payload);
      const result = await query.select().single();
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function remove(table, id) {
    const db = client();
    if (!db) return unavailable();
    const active = await session();
    if (!active) return { data: null, error: pairedError("Sign in to delete cloud content.", "Masuk untuk menghapus konten cloud.") };
    try {
      const result = await db.from(table).delete().eq("id", id).eq("owner_id", active.user.id).select("id");
      if (!result.error && !result.data?.length) return { data: null, error: pairedError("Content was not deleted. Check ownership or refresh the list.", "Konten belum dihapus. Periksa kepemilikan atau muat ulang daftar.") };
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  function mountAuth(container, options = {}) {
    if (!container) return null;
    if (mounted.has(container)) return mounted.get(container);
    container.dataset.authMounted = "true";
    container.classList.add("tpx-content-auth");
    container.setAttribute("data-tpx-no-translate", "");
    const uid = `tpx-auth-${++authSequence}`;
    container.innerHTML = `
      <div class="tpx-auth-summary"><span class="tpx-auth-state"></span><button class="tpx-auth-toggle" type="button" aria-controls="${uid}-fields" aria-expanded="false" data-auth-en="Account" data-auth-id="Akun"></button></div>
      <div class="tpx-auth-fields" id="${uid}-fields" hidden>
        <div class="tpx-auth-modes" role="group" data-auth-aria-en="Account options" data-auth-aria-id="Pilihan akun"><button type="button" data-signin aria-pressed="true" data-auth-en="Sign in" data-auth-id="Masuk"></button><button type="button" data-register aria-pressed="false" data-auth-en="Create account" data-auth-id="Buat akun"></button></div>
        <form class="tpx-auth-form">
          <label><span data-auth-en="Email" data-auth-id="Email"></span><input name="email" type="email" required autocomplete="username" maxlength="254" autocapitalize="none" spellcheck="false"></label>
          <label><span data-auth-en="Password" data-auth-id="Kata sandi"></span><input name="password" type="password" required autocomplete="current-password" maxlength="128"></label>
          <label class="tpx-auth-confirm" hidden><span data-auth-en="Confirm password" data-auth-id="Ulangi kata sandi"></span><input name="confirm_password" type="password" autocomplete="new-password" maxlength="128"></label>
          <p class="tpx-auth-password-note" hidden data-auth-en="Use at least 6 characters. Your email needs verification before cloud access." data-auth-id="Gunakan minimal 6 karakter. Email perlu diverifikasi sebelum menggunakan cloud."></p>
          <div class="tpx-auth-actions"><button type="submit" data-auth-submit></button><button type="button" class="tpx-auth-forgot" data-auth-en="Forgot password?" data-auth-id="Lupa kata sandi?"></button><button type="button" class="tpx-auth-confirm-email" data-auth-en="Verify email" data-auth-id="Verifikasi email"></button></div>
        </form>
        <form class="tpx-auth-verify" hidden>
          <h3 data-auth-en="Verify your email" data-auth-id="Verifikasi email Anda"></h3><p class="tpx-auth-verify-address"></p>
          <label><span data-auth-en="Email confirmation code" data-auth-id="Kode konfirmasi email"></span><input name="token" type="text" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6,10}" minlength="6" maxlength="10"></label>
          <p data-auth-en="Enter the code in your confirmation email. If the email contains a confirmation link, you can open that link instead." data-auth-id="Masukkan kode dari email konfirmasi. Jika email berisi tautan konfirmasi, Anda juga bisa membuka tautan tersebut."></p>
          <div class="tpx-auth-actions"><button type="submit" data-auth-en="Verify & sign in" data-auth-id="Verifikasi & masuk"></button><button type="button" data-resend></button><button type="button" data-back data-auth-en="Back to sign in" data-auth-id="Kembali ke masuk"></button></div>
        </form>
        <form class="tpx-auth-reset" hidden><h3 data-auth-en="Reset password" data-auth-id="Atur ulang kata sandi"></h3><p data-auth-en="We will email you a secure link to choose a new password." data-auth-id="Kami akan mengirim tautan aman melalui email untuk mengganti kata sandi."></p><label><span data-auth-en="Email" data-auth-id="Email"></span><input name="reset_email" type="email" required autocomplete="username" maxlength="254" autocapitalize="none"></label><div class="tpx-auth-actions"><button type="submit" data-auth-en="Send reset link" data-auth-id="Kirim tautan pemulihan"></button><button type="button" data-back data-auth-en="Back to sign in" data-auth-id="Kembali ke masuk"></button></div></form>
        <form class="tpx-auth-recovery" hidden><h3 data-auth-en="Choose a new password" data-auth-id="Buat kata sandi baru"></h3><label><span data-auth-en="New password" data-auth-id="Kata sandi baru"></span><input name="new_password" type="password" required minlength="6" maxlength="128" autocomplete="new-password"></label><label><span data-auth-en="Confirm new password" data-auth-id="Ulangi kata sandi baru"></span><input name="confirm_new_password" type="password" required minlength="6" maxlength="128" autocomplete="new-password"></label><div class="tpx-auth-actions"><button type="submit" data-auth-en="Save new password" data-auth-id="Simpan kata sandi baru"></button></div></form>
        <p class="tpx-auth-callback" hidden data-auth-en="Checking your secure account link…" data-auth-id="Memeriksa tautan akun aman Anda…"></p>
        <button type="button" class="tpx-auth-signout" hidden data-auth-en="Sign out" data-auth-id="Keluar"></button>
        <p class="tpx-auth-note" data-auth-en="Your question sets stay private in your account. Local drafts work without signing in." data-auth-id="Paket soal tersimpan secara pribadi di akun Anda. Draf lokal tetap bisa digunakan tanpa masuk."></p>
        <a class="tpx-auth-guide" target="_blank" rel="noopener" data-auth-en="Account setup help" data-auth-id="Bantuan pengaturan akun"></a>
      </div><p class="tpx-auth-message" role="status" aria-live="polite" aria-atomic="true"></p>`;
    const summary = container.querySelector(".tpx-auth-state"), fields = container.querySelector(".tpx-auth-fields"), form = container.querySelector(".tpx-auth-form"), verify = container.querySelector(".tpx-auth-verify"), reset = container.querySelector(".tpx-auth-reset"), recovery = container.querySelector(".tpx-auth-recovery"), logout = container.querySelector(".tpx-auth-signout"), status = container.querySelector(".tpx-auth-message"), toggle = container.querySelector(".tpx-auth-toggle"), modes = container.querySelector(".tpx-auth-modes"), resend = container.querySelector("[data-resend]");
    container.querySelector(".tpx-auth-guide").href = new URL("docs/PANDUAN-SUPABASE.md", siteBase).href;
    let activeSession = null, statusCopy = null, mode = options.mode === "register" ? "register" : "signin", pendingEmail = "", busy = false, resendUntil = 0, resendTimer = null, callbackApplied = false;
    function message(en, id) { statusCopy = {en, id}; status.textContent = tr(en, id); }
    function errorMessage(error) { statusCopy = error.messageEn ? {en: error.messageEn, id: error.messageId} : null; status.textContent = error.message; }
    const dialog = document.createElement("dialog");
    dialog.className = "tpx-auth-dialog";
    dialog.id = `${uid}-dialog`;
    dialog.setAttribute("aria-labelledby", `${uid}-title`);
    toggle.setAttribute("aria-haspopup", "dialog");
    dialog.innerHTML = `<div class="tpx-auth-dialog-heading"><div><p class="tpx-auth-eyebrow">THERMPYX</p><h2 id="${uid}-title" data-auth-en="Your learning account" data-auth-id="Akun belajar Anda"></h2></div><button type="button" class="tpx-auth-close" data-auth-en="Close" data-auth-id="Tutup"></button></div><p class="tpx-auth-dialog-intro" data-auth-en="Save your own question sets and use them in class. Learning tools and local drafts are available without an account." data-auth-id="Simpan paket soal sendiri dan gunakan untuk kelas. Alat belajar dan draf lokal bisa dipakai tanpa akun."></p>`;
    const accountState = document.createElement("p");
    accountState.className = "tpx-auth-dialog-state";
    dialog.append(accountState, fields, status);
    container.append(dialog);
    let returnFocus = null, recoveryFocusTouched = false;
    dialog.addEventListener("pointerdown", () => {recoveryFocusTouched = true;});
    dialog.addEventListener("keydown", () => {recoveryFocusTouched = true;});
    function focusRecovery() {
      recoveryFocusTouched = false;
      recovery.elements.new_password.focus();
      const restore = () => {
        const active = document.activeElement;
        if (!recoveryFocusTouched && dialog.open && mode === "recovery" && !recovery.hidden && (!active || active === document.body || active === document.documentElement || active === dialog)) recovery.elements.new_password.focus({preventScroll: true});
      };
      // Initial fragment focus can run after a fast Auth callback opens the
      // dialog. Repair only that browser reset, without moving user focus.
      const afterLayout = () => requestAnimationFrame(restore);
      afterLayout();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afterLayout, {once: true});
      if (document.readyState !== "complete") window.addEventListener("load", afterLayout, {once: true});
    }
    function expand(open = true) {
      fields.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open && !dialog.open) {
        returnFocus = document.activeElement;
        dialog.showModal();
        const target = fields.querySelector('form:not([hidden]) input:not([disabled])') || dialog.querySelector('.tpx-auth-close');
        target?.focus();
      } else if (!open && dialog.open) dialog.close();
    }
    dialog.querySelector(".tpx-auth-close").addEventListener("click", () => expand(false));
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) expand(false);
    });
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      fields.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      form.elements.password.value = "";
      form.elements.confirm_password.value = "";
      if (returnFocus?.isConnected) returnFocus.focus();
    });
    function cooldown() {
      clearTimeout(resendTimer);
      const seconds = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
      resend.textContent = seconds ? tr(`Resend in ${seconds}s`, `Kirim ulang dalam ${seconds} dtk`) : tr("Resend code", "Kirim ulang kode");
      resend.disabled = busy || seconds > 0;
      if (seconds && container.isConnected) resendTimer = setTimeout(cooldown, 1000);
    }
    function render(active, event = "") {
      activeSession = active;
      if (callbackSettled && callbackProblem) container.dataset.authCallbackIssue = callbackProblem;
      else delete container.dataset.authCallbackIssue;
      if (!active && event === "SIGNED_OUT") mode = "signin";
      if (mode === "recovery" && (!recoveryReady || !active)) {
        mode = "reset";
        message("Your recovery session has ended. Request a new reset link below.", "Sesi pemulihan sudah berakhir. Minta tautan pemulihan baru di bawah.");
      }
      let openCallback = false;
      if (recoveryReady && active && mode !== "recovery") {mode = "recovery"; openCallback = true; callbackApplied = true;}
      else if (callbackSettled && callbackProblem && !callbackApplied) {
        mode = "reset"; callbackApplied = true; openCallback = true;
        if (callbackProblem === "unavailable") message("The account service could not load. Check your connection and reload this page, then request a new reset link. Your password has not changed.", "Layanan akun belum dapat dimuat. Periksa koneksi dan muat ulang halaman ini, lalu minta tautan pemulihan baru. Kata sandi Anda belum berubah.");
        else if (callbackProblem === "expired") message("This reset link has expired or was already used. Open the newest unused email. If you need a new reset link, request it once below and use that email; repeated requests can invalidate earlier links.", "Tautan pemulihan sudah kedaluwarsa atau sudah digunakan. Buka email terbaru yang belum dipakai. Jika perlu tautan pemulihan baru, minta satu kali di bawah dan gunakan email itu; permintaan berulang dapat membatalkan tautan sebelumnya.");
        else if (callbackProblem === "missing") message("This reset link is incomplete or does not contain a recovery session. Open the original button in the newest email. Request a new reset link once if needed. If that email always returns here, ask the site administrator to check the reset email template.", "Tautan pemulihan tidak lengkap atau tidak membawa sesi pemulihan. Buka tombol asli di email terbaru. Minta tautan pemulihan baru satu kali jika diperlukan. Jika email itu selalu kembali ke sini, minta pengelola memeriksa template email pemulihan.");
        else if (callbackProblem === "network") message("The connection or account service could not verify this link. Check your connection and reopen this email after the service recovers. Wait before requesting another email; your password has not changed.", "Koneksi atau layanan akun belum dapat memverifikasi tautan ini. Periksa koneksi dan buka kembali email ini setelah layanan pulih. Tunggu sebelum meminta email lain; kata sandi Anda belum berubah.");
        else message("The account service rejected this recovery session. The link is invalid for password recovery. Request a new reset link once below and use the original button in the newest email.", "Layanan akun menolak sesi pemulihan ini. Tautan tidak valid untuk mengganti kata sandi. Minta tautan pemulihan baru satu kali di bawah dan gunakan tombol asli di email terbaru.");
      } else if (!callbackSettled && (callback.present || callback.recoveryRequested)) {mode = "callback"; openCallback = true;}
      else if (mode === "callback") {mode = "signin"; openCallback = true;}
      if (active && !["recovery", "reset", "callback"].includes(mode)) mode = "signin";
      summary.textContent = active ? `${tr("Connected", "Terhubung")}: ${active.user.email || tr("account", "akun")}` : tr("Sign in to your THERMPYX account", "Masuk ke akun THERMPYX");
      summary.hidden = !active;
      accountState.hidden = !active;
      accountState.textContent = active ? active.user.email || tr("Account connected", "Akun terhubung") : "";
      toggle.textContent = active ? tr("Account", "Akun") : tr("Sign in", "Masuk");
      form.hidden = Boolean(active) || !["signin", "register"].includes(mode);
      modes.hidden = Boolean(active) || !["signin", "register"].includes(mode);
      verify.hidden = Boolean(active) || mode !== "verify";
      reset.hidden = mode !== "reset";
      recovery.hidden = !active || mode !== "recovery";
      container.querySelector(".tpx-auth-callback").hidden = mode !== "callback";
      logout.hidden = !active || ["recovery", "callback"].includes(mode);
      const registering = mode === "register";
      container.querySelector("[data-signin]").setAttribute("aria-pressed", String(!registering));
      container.querySelector("[data-register]").setAttribute("aria-pressed", String(registering));
      form.elements.password.autocomplete = registering ? "new-password" : "current-password";
      form.elements.password.minLength = registering ? 6 : 1;
      form.elements.confirm_password.required = registering;
      form.elements.confirm_password.disabled = !registering;
      form.querySelector(".tpx-auth-confirm").hidden = !registering;
      form.querySelector(".tpx-auth-password-note").hidden = !registering;
      form.querySelector(".tpx-auth-forgot").hidden = registering;
      form.querySelector(".tpx-auth-confirm-email").hidden = registering;
      form.querySelector("[data-auth-submit]").textContent = registering ? tr("Create account", "Buat akun") : tr("Sign in", "Masuk");
      verify.querySelector(".tpx-auth-verify-address").textContent = pendingEmail;
      cooldown();
      if (openCallback) {expand(); if (mode === "recovery") focusRecovery();}
    }
    function localize() {
      container.querySelectorAll("[data-auth-en]").forEach(node => { node.textContent = tr(node.dataset.authEn, node.dataset.authId); });
      container.querySelectorAll("[data-auth-aria-en]").forEach(node => { node.setAttribute("aria-label", tr(node.dataset.authAriaEn, node.dataset.authAriaId)); });
      if (statusCopy) status.textContent = tr(statusCopy.en, statusCopy.id);
      render(activeSession);
    }
    function changeMode(next, focus = false) {
      if (busy) return;
      mode = next; expand(); statusCopy = null; status.textContent = "";
      if (next !== "verify") verify.elements.token.value = "";
      render(activeSession);
      if (focus) (next === "verify" ? verify.elements.token : next === "reset" ? reset.elements.reset_email : form.elements.email).focus();
    }
    async function perform(task) {
      if (busy) return;
      const previousMode = mode;
      busy = true; container.setAttribute("aria-busy", "true");
      container.querySelectorAll("button").forEach(button => { button.disabled = true; });
      message("Connecting…", "Menghubungkan…");
      try { await task(); } catch (error) {errorMessage(friendly(error));}
      finally { busy = false; container.removeAttribute("aria-busy"); container.querySelectorAll("button").forEach(button => { button.disabled = false; }); render(activeSession); if (mode === "verify" && previousMode !== "verify" && !verify.hidden) verify.elements.token.focus(); }
    }
    toggle.addEventListener("click", () => expand(fields.hidden));
    container.querySelector("[data-signin]").addEventListener("click", () => changeMode("signin"));
    container.querySelector("[data-register]").addEventListener("click", () => changeMode("register"));
    container.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => changeMode("signin", true)));
    form.addEventListener("submit", event => {
      event.preventDefault(); if (!form.reportValidity() || busy) return;
      const register = mode === "register", email = form.elements.email.value.trim(), password = form.elements.password.value;
      if (register && password !== form.elements.confirm_password.value) {message("Passwords do not match.", "Kata sandi tidak cocok."); form.elements.confirm_password.focus(); return;}
      perform(async () => {
        const result = await (register ? signUp : signIn)(email, password);
        if (result.error) { errorMessage(result.error); if (!register && result.error.code === "email_not_confirmed") {pendingEmail = email; mode = "verify";} }
        else if (register && !result.data?.session && Array.isArray(result.data?.user?.identities) && !result.data.user.identities.length) {
          mode = "signin";
          message("No new account was confirmed. If you already registered this email, sign in or use Forgot password. A confirmation code may not be sent for an existing account.", "Belum ada akun baru yang dikonfirmasi. Jika email ini sudah pernah didaftarkan, masuk atau gunakan Lupa kata sandi. Kode konfirmasi mungkin tidak dikirim untuk akun yang sudah ada.");
        } else if (register && !result.data?.session) {
          pendingEmail = email; mode = "verify"; resendUntil = Date.now() + 60000;
          message("Request accepted. Check your inbox and Spam for a confirmation link or code; email delivery is not yet confirmed. Already registered? Go back to sign in or reset your password.", "Permintaan diterima. Periksa kotak masuk dan Spam untuk tautan atau kode konfirmasi; pengiriman email belum dapat dipastikan. Sudah terdaftar? Kembali untuk masuk atau atur ulang kata sandi.");
        } else {message("Account connected.", "Akun terhubung.");}
        if (!result.error) {form.elements.password.value = ""; form.elements.confirm_password.value = "";}
      });
    });
    form.querySelector(".tpx-auth-confirm-email").addEventListener("click", () => {
      if (!form.elements.email.reportValidity()) return;
      pendingEmail = form.elements.email.value.trim(); changeMode("verify", true);
      message("Enter the code from your email, or request a new code.", "Masukkan kode dari email, atau minta kode baru.");
    });
    verify.addEventListener("submit", event => {
      event.preventDefault(); if (!verify.reportValidity()) return;
      perform(async () => {
        const result = await verifyEmailCode(pendingEmail, verify.elements.token.value);
        if (result.error) errorMessage(result.error);
        else if (result.data?.session) {verify.elements.token.value = ""; message("Email verified. Your account is connected.", "Email terverifikasi. Akun Anda terhubung.");}
        else {mode = "signin"; message("Email verified. Sign in with your password.", "Email terverifikasi. Masuk dengan kata sandi Anda.");}
      });
    });
    resend.addEventListener("click", () => {
      if (Date.now() < resendUntil) return;
      perform(async () => {const result = await resendVerification(pendingEmail); if (result.error) errorMessage(result.error); else {resendUntil = Date.now() + 60000; message("Request accepted. If this email still needs confirmation, check your inbox and Spam for a new link or code. Already confirmed? Go back to sign in or reset your password.", "Permintaan diterima. Jika email masih perlu dikonfirmasi, periksa kotak masuk dan Spam untuk tautan atau kode baru. Sudah terkonfirmasi? Kembali untuk masuk atau atur ulang kata sandi.");}});
    });
    form.querySelector(".tpx-auth-forgot").addEventListener("click", () => {reset.elements.reset_email.value = form.elements.email.value; changeMode("reset", true);});
    reset.addEventListener("submit", event => {
      event.preventDefault(); if (!reset.reportValidity()) return;
      perform(async () => {const result = await requestPasswordReset(reset.elements.reset_email.value); if (result.error) errorMessage(result.error); else message("If this email has an account, check your inbox for the password reset link.", "Jika email ini memiliki akun, periksa kotak masuk untuk tautan pemulihan kata sandi.");});
    });
    recovery.addEventListener("submit", event => {
      event.preventDefault(); if (!recovery.reportValidity()) return;
      if (recovery.elements.new_password.value !== recovery.elements.confirm_new_password.value) {message("Passwords do not match.", "Kata sandi tidak cocok."); return;}
      perform(async () => {const result = await updatePassword(recovery.elements.new_password.value); if (result.error) errorMessage(result.error); else {mode = "signin"; recovery.reset(); message("Password updated. Your account is connected.", "Kata sandi diperbarui. Akun Anda terhubung.");}});
    });
    logout.addEventListener("click", () => perform(async () => {const result = await signOut(); if (result.error) errorMessage(result.error); else {mode = "signin"; pendingEmail = ""; verify.reset(); form.reset(); message("Signed out. Local drafts are unchanged.", "Sudah keluar. Draf lokal tetap tersimpan.");}}));
    window.addEventListener("thermpyx:languagechange", localize);
    localize();
    if (!callback.present && !callback.recoveryRequested && !recoveryReady) expand(false);
    onAuthChange(render); session().then(active => render(active, lastAuthEvent));
    const controller = {open: () => expand(), showSignIn: () => changeMode("signin", true), showRegister: () => changeMode("register", true)};
    mounted.set(container, controller);
    return controller;
  }
  window.TPXContent = {
    session, onAuthChange, signIn, signUp, signOut, verifyEmailCode, resendVerification, requestPasswordReset, updatePassword, mountAuth, normalizeQuestions, normalizeCards, errorMessage: contentErrorMessage,
    listQuestionSets: () => list("tpx_question_sets", true),
    saveQuestionSet: (input, expectedOwnerId) => save("tpx_question_sets", input, "questions", expectedOwnerId),
    deleteQuestionSet: id => remove("tpx_question_sets", id),
    listDecks: () => list("tpx_flashcard_decks", false),
    saveDeck: input => save("tpx_flashcard_decks", input, "cards"),
    deleteDeck: id => remove("tpx_flashcard_decks", id)
  };
  // Subscribe immediately, before a view mounts, so SDK initialization cannot
  // lose PASSWORD_RECOVERY between loading the scripts and DOMContentLoaded.
  session();
})();
