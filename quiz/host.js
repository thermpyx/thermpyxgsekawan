/* Classroom host: built-in topics or the current owner's saved question set. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const createRoomBtn = byId("createRoomBtn"), topicSelect = byId("topic");
  const sourceSelect = byId("questionSource"), setSelect = byId("questionSet"), hostStatus = byId("hostStatus");
  const refresh = byId("refreshQuestionSets"), summary = byId("hostSetSummary");
  const content = window.TPXContent;
  const auth = content?.mountAuth(document.querySelector("[data-content-auth]"));
  const tr = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
  let ownedSets = new Map(), creating = false, loadingSets = false, authRevision = 0, authOwnerId, statusCopy = null;
  const parameters = new URLSearchParams(window.location.search);
  let requestedSet = parameters.get("set");

  function status(en, id = en) {
    statusCopy = { en, id };
    if (hostStatus) hostStatus.textContent = tr(en, id);
  }
  function reportError(error) {
    status(error?.messageEn || content?.errorMessage?.(error) || tr("The request failed. Check the connection and try again.", "Permintaan gagal. Periksa koneksi dan coba lagi."), error?.messageId || content?.errorMessage?.(error));
  }
  function updateControls() {
    createRoomBtn.disabled = creating || (sourceSelect.value === "custom" && loadingSets);
    sourceSelect.disabled = creating;
    topicSelect.disabled = creating;
    setSelect.disabled = creating || loadingSets;
    refresh.disabled = creating || loadingSets;
    byId("skillsEnabled").disabled = creating;
    const en = creating ? "CREATING ROOM…" : "CREATE ROOM";
    const id = creating ? "MEMBUAT RUANG…" : "BUAT RUANG";
    createRoomBtn.dataset.en = en; createRoomBtn.dataset.id = id;
    createRoomBtn.textContent = tr(en, id);
    window.ThermpyxSelect?.refresh(sourceSelect);
    window.ThermpyxSelect?.refresh(setSelect);
  }
  function renderSelectedSet() {
    const selected = ownedSets.get(setSelect.value);
    summary.hidden = !selected;
    if (!selected) return;
    byId("hostSetTitle").textContent = selected.title;
    const explanations = selected.questions.filter(question => question.explanation?.trim()).length;
    byId("hostSetDetails").textContent = tr(
      `${selected.questions.length} questions · ${explanations} explanations · One correct answer per question`,
      `${selected.questions.length} soal · ${explanations} pembahasan · Satu jawaban benar setiap soal`
    );
    const list = byId("hostSetQuestions");
    list.replaceChildren();
    selected.questions.forEach(question => {
      const item = document.createElement("li");
      item.setAttribute("data-tpx-no-translate", "");
      item.setAttribute("data-tpx-user-content", "");
      item.textContent = question.question;
      list.append(item);
    });
    byId("editSelectedSet").href = "question-editor.html?set=" + encodeURIComponent(selected.id);
  }
  function localize() {
    for (const option of setSelect.options) {
      const item = ownedSets.get(String(option.value));
      option.textContent = item
        ? `${item.title} · ${item.questions.length} ${tr(item.questions.length === 1 ? "question" : "questions", "soal")}`
        : tr("Select your saved set", "Pilih paket tersimpan Anda");
    }
    if (statusCopy) hostStatus.textContent = tr(statusCopy.en, statusCopy.id);
    updateControls();
    renderSelectedSet();
  }
  function showSource() {
    const custom = sourceSelect.value === "custom";
    byId("builtinQuestions").hidden = custom;
    byId("customQuestions").hidden = !custom;
    if (custom) loadQuestionSets();
    else status("Sign in with Google to host a live quiz. Students only need the room code and a nickname.", "Masuk dengan Google untuk menjadi host kuis langsung. Siswa cukup memakai kode ruang dan nama panggilan.");
    updateControls();
  }
  async function loadQuestionSets({ preserveStatus = false } = {}) {
    if (loadingSets) return;
    loadingSets = true;
    const revision = authRevision, previous = setSelect.value;
    updateControls();
    ownedSets = new Map();
    setSelect.replaceChildren(new Option(tr("Select your saved set", "Pilih paket tersimpan Anda"), ""));
    renderSelectedSet();
    try {
      const active = await content?.session();
      if (revision !== authRevision) return;
      if (authOwnerId === undefined) authOwnerId = active?.user?.id || null;
      if (!active) {
        if (!preserveStatus) status("Sign in to choose your cloud questions. You can draft new questions without an account.", "Masuk untuk memilih soal cloud Anda. Anda tetap bisa menyusun draf soal tanpa akun.");
        return;
      }
      if (!preserveStatus) status("Loading your question sets…", "Memuat paket soal Anda…");
      const result = await content.listQuestionSets();
      if (revision !== authRevision) return;
      if (result.error) { if (!preserveStatus) reportError(result.error); return; }
      for (const item of result.data || []) {
        // Do not expose a stale owner's collection after an account change.
        if (item.owner_id !== active.user.id || !Array.isArray(item.questions)) continue;
        ownedSets.set(String(item.id), item);
        const option = new Option("", String(item.id));
        option.setAttribute("data-tpx-no-translate", "");
        setSelect.append(option);
      }
      if (requestedSet && ownedSets.has(requestedSet)) {
        setSelect.value = requestedSet;
        requestedSet = null;
      } else if (ownedSets.has(previous)) setSelect.value = previous;
      if (!preserveStatus) status(ownedSets.size ? "Your questions are ready. Select a set and create the room." : "No saved sets yet. Create your questions, then save them to your account.", ownedSets.size ? "Soal Anda siap. Pilih paket lalu buat ruang kuis." : "Belum ada paket tersimpan. Susun soal lalu simpan ke akun Anda.");
    } catch (error) { if (revision === authRevision && !preserveStatus) reportError(error); }
    finally {
      loadingSets = false;
      localize();
      setSelect.dispatchEvent(new Event("change", { bubbles: true }));
      if (revision !== authRevision && sourceSelect.value === "custom") loadQuestionSets({ preserveStatus });
    }
  }
  async function createHostRoom() {
    const revision = authRevision;
    const accountChanged = () => {
      if (revision === authRevision) return false;
      status("Your account changed while creating the room. Check the question source and create the room again.", "Akun Anda berubah saat ruang dibuat. Periksa sumber soal lalu buat ruang kembali.");
      return true;
    };
    const live = window.TPXLive;
    if (!live) {
      status("The quiz connection is unavailable. Your questions stay saved; try again after checking the connection.", "Koneksi kuis belum tersedia. Soal Anda tetap tersimpan; coba lagi setelah memeriksa koneksi.");
      return;
    }
    let topic = topicSelect.value, questions;
    try {
      // Firebase anonymous participants are never teacher sessions. Hosting every
      // question source requires the current Google teacher identity.
      const active = await content?.session();
      if (accountChanged()) return;
      if (!active) {
        status("Sign in with Google to host a live quiz.", "Masuk dengan Google untuk menjadi host kuis langsung.");
        auth?.showSignIn?.();
        return;
      }
      if (sourceSelect.value === "custom") {
        const selected = ownedSets.get(setSelect.value);
        if (!selected) { status("Choose a saved question set first, or create a new one.", "Pilih paket soal tersimpan dahulu, atau susun paket baru."); setSelect.focus(); return; }
        if (selected.owner_id !== active.user.id) { status("Reload the sets for your current account.", "Muat ulang paket untuk akun aktif Anda."); return; }
        try { questions = content.normalizeQuestions(selected.questions); topic = selected.topic; }
        catch (error) { reportError(error); return; }
      }
      if (!questions) {
        const builtin = getQuestionsForTopic(topic);
        questions = content.normalizeQuestions(builtin);
      }
      status("Creating a room…", "Membuat ruang…");
      const result = await live.createRoom({ topic, questions, is_custom: sourceSelect.value === "custom", skills_enabled: byId("skillsEnabled").checked });
      // Never attach a completed write to a different local Google account.
      if (accountChanged()) return;
      if (result.error) throw result.error;
      const room = result.data;
      if (!room?.id) throw new Error(tr("Room creation was not confirmed.", "Pembuatan ruang belum terkonfirmasi."));
      if (accountChanged()) return;
      sessionStorage.setItem("roomId", room.id); sessionStorage.setItem("roomCode", room.room_code);
      sessionStorage.setItem("roomTopic", room.topic); sessionStorage.setItem("userRole", "host");
      sessionStorage.removeItem("playerId"); sessionStorage.removeItem("nickname");
      window.location.href = "waiting-room.html";
    } catch (error) { if (!accountChanged()) reportError(error); }
  }
  sourceSelect.addEventListener("change", showSource);
  setSelect.addEventListener("change", renderSelectedSet);
  refresh.addEventListener("click", loadQuestionSets);
  window.addEventListener("thermpyx:languagechange", localize);
  content?.onAuthChange(active => {
    const ownerId = active?.user?.id || null;
    if (authOwnerId === undefined) { authOwnerId = ownerId; return; }
    if (authOwnerId === ownerId) return;
    authOwnerId = ownerId;
    authRevision++;
    ownedSets = new Map();
    setSelect.replaceChildren(new Option(tr("Select your saved set", "Pilih paket tersimpan Anda"), ""));
    renderSelectedSet();
    if (sourceSelect.value === "custom") loadQuestionSets({ preserveStatus: creating });
  });
  // Establish the owner before either built-in or custom room creation.
  content?.session().then(active => { if (authOwnerId === undefined) authOwnerId = active?.user?.id || null; }).catch(() => {});
  createRoomBtn.addEventListener("click", async () => {
    if (creating) return;
    creating = true; updateControls();
    try { await createHostRoom(); }
    catch (error) { reportError(error); }
    finally { creating = false; updateControls(); }
  });
  if (parameters.get("source") === "custom" || requestedSet) sourceSelect.value = "custom";
  showSource();
})();
