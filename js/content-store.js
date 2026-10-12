/* THERMPYX content library. Browser key only; writes require Supabase Auth + RLS. */
(() => {
  "use strict";
  const listeners = new Set();
  let currentSession = null, initialized = false, subscription = null;
  const tr = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
  const client = () => typeof supabaseClient !== "undefined" ? supabaseClient : null;
  function emit(session) {
    currentSession = session || null;
    for (const callback of listeners) {
      try { callback(currentSession); } catch (_) { /* One view must not break other views. */ }
    }
  }
  function friendly(error) {
    if (!error) return null;
    if (["42P01", "PGRST205", "PGRST204"].includes(error.code))
      return { message: tr("The content tables are not configured yet. Follow the Supabase guide.", "Tabel konten belum disiapkan. Ikuti panduan Supabase.") };
    if (error.code === "42501")
      return { message: tr("Access denied. Sign in as the content owner and check the RLS policies.", "Akses ditolak. Masuk sebagai pemilik konten dan periksa kebijakan RLS.") };
    return { message: String(error.message || tr("Connection failed. Your local draft is safe.", "Koneksi gagal. Draf lokal Anda tetap tersimpan.")) };
  }
  const unavailable = () => ({ data: null, error: { message: tr("Cloud connection is unavailable. You can keep editing locally.", "Koneksi cloud belum tersedia. Anda tetap bisa mengedit secara lokal.") } });
  async function session() {
    const db = client();
    if (!db?.auth) return null;
    if (!initialized) {
      initialized = true;
      subscription = db.auth.onAuthStateChange((_event, next) => emit(next));
    }
    try {
      const { data, error } = await db.auth.getSession();
      if (error) return null;
      currentSession = data?.session || null;
      return currentSession;
    } catch (_) { return null; }
  }
  function onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  async function signIn(email, password) {
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
      const result = await db.auth.signUp({ email: email.trim(), password });
      if (!result.error && result.data.session) emit(result.data.session);
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  async function signOut() {
    const db = client();
    if (!db?.auth) return unavailable();
    try {
      const result = await db.auth.signOut();
      if (!result.error) emit(null);
      return { data: null, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
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
  async function save(table, input, kind) {
    const db = client();
    if (!db) return unavailable();
    const active = await session();
    if (!active) return { data: null, error: { message: tr("Sign in before saving to cloud. Local editing remains available.", "Masuk sebelum menyimpan ke cloud. Pengeditan lokal tetap tersedia.") } };
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
    if (!active) return { data: null, error: { message: tr("Sign in to delete cloud content.", "Masuk untuk menghapus konten cloud.") } };
    try {
      const result = await db.from(table).delete().eq("id", id).eq("owner_id", active.user.id).select("id");
      if (!result.error && !result.data?.length) return { data: null, error: { message: tr("Content was not deleted. Check ownership or refresh the list.", "Konten belum dihapus. Periksa kepemilikan atau muat ulang daftar.") } };
      return { data: result.data, error: friendly(result.error) };
    } catch (error) { return { data: null, error: friendly(error) }; }
  }
  function mountAuth(container) {
    if (!container || container.dataset.authMounted) return;
    container.dataset.authMounted = "true";
    container.classList.add("tpx-content-auth");
    container.innerHTML = `<div class="tpx-auth-summary"><span class="tpx-auth-state"></span><button class="tpx-auth-toggle" type="button" aria-expanded="false">${tr("Cloud account", "Akun cloud")}</button></div><div class="tpx-auth-fields" hidden><form class="tpx-auth-form"><label>${tr("Email", "Email")}<input name="email" type="email" required autocomplete="username" maxlength="254"></label><label>${tr("Password", "Kata sandi")}<input name="password" type="password" required minlength="6" autocomplete="current-password"></label><div class="tpx-auth-actions"><button type="submit">${tr("Sign in", "Masuk")}</button><button type="button" data-register>${tr("Create account", "Buat akun")}</button></div></form><button type="button" class="tpx-auth-signout" hidden>${tr("Sign out", "Keluar")}</button><p class="tpx-auth-note">${tr("Your cloud library belongs to your account. Local drafts work without signing in.", "Koleksi cloud milik akun Anda. Draf lokal bisa digunakan tanpa masuk.")}</p><a href="../docs/PANDUAN-SUPABASE.md" target="_blank" rel="noopener">${tr("Supabase setup guide", "Panduan setup Supabase")}</a></div><p class="tpx-auth-message" role="status" aria-live="polite"></p>`;
    const summary = container.querySelector(".tpx-auth-state"), fields = container.querySelector(".tpx-auth-fields"), form = container.querySelector("form"), logout = container.querySelector(".tpx-auth-signout"), status = container.querySelector(".tpx-auth-message"), toggle = container.querySelector(".tpx-auth-toggle");
    function render(active) {
      summary.textContent = active ? `${tr("Connected", "Terhubung")}: ${active.user.email || tr("account", "akun")}` : tr("Local drafts · not signed in", "Draf lokal · belum masuk");
      form.hidden = Boolean(active); logout.hidden = !active;
    }
    toggle.addEventListener("click", () => { fields.hidden = !fields.hidden; toggle.setAttribute("aria-expanded", String(!fields.hidden)); });
    let busy = false;
    async function login(register) {
      if (busy || !form.reportValidity()) return;
      busy = true;
      const buttons = container.querySelectorAll("button");
      buttons.forEach(button => { button.disabled = true; });
      status.textContent = tr("Connecting…", "Menghubungkan…");
      try {
        const values = new FormData(form);
        const result = await (register ? signUp : signIn)(String(values.get("email")), String(values.get("password")));
        status.textContent = result.error?.message || (register && !result.data?.session ? tr("Check your email to confirm the account, then sign in.", "Periksa email untuk konfirmasi akun, lalu masuk.") : tr("Account connected.", "Akun terhubung."));
        if (!result.error) form.elements.password.value = "";
      } finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
    }
    form.addEventListener("submit", event => { event.preventDefault(); login(false); });
    container.querySelector("[data-register]").addEventListener("click", () => login(true));
    logout.addEventListener("click", async () => { logout.disabled = true; const result = await signOut(); status.textContent = result.error?.message || tr("Signed out. Local drafts are unchanged.", "Sudah keluar. Draf lokal tetap tersimpan."); logout.disabled = false; });
    onAuthChange(render); session().then(render);
  }
  window.TPXContent = {
    session, onAuthChange, signIn, signUp, signOut, mountAuth, normalizeQuestions, normalizeCards,
    listQuestionSets: () => list("tpx_question_sets", true),
    saveQuestionSet: input => save("tpx_question_sets", input, "questions"),
    deleteQuestionSet: id => remove("tpx_question_sets", id),
    listDecks: () => list("tpx_flashcard_decks", false),
    saveDeck: input => save("tpx_flashcard_decks", input, "cards"),
    deleteDeck: id => remove("tpx_flashcard_decks", id)
  };
})();
