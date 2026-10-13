/* THERMPYX flashcard library: local study first, authenticated cloud saves when requested. */
(() => {
  "use strict";
  const LOCAL_KEY = "thermpyx-flashcard-decks-v1", MAX_CARDS = 100;
  const $ = id => document.getElementById(id);
  const api = () => window.TPXContent;
  const lang = () => window.TPX?.getLanguage() || (document.documentElement.lang === "en" ? "en" : "id");
  const copyPairs = new Map();
  const t = (id, en) => { const pair = {id, en}; copyPairs.set(id, pair); copyPairs.set(en, pair); return pair[lang()]; };
  function errorPair(error) {
    if (error?.messageId && error?.messageEn) return { id: error.messageId, en: error.messageEn };
    const registered = copyPairs.get(error?.message);
    if (registered) return registered;
    if (error?.name === "ImportError") return { id: error.message, en: window.TPX?.translateText?.(error.message, "en") || error.message };
    const text = error?.message || "";
    return { id: text, en: text };
  }
  function localizeMessages() {
    for (const id of ["fcStatus", "fcImportStatus", "fcConfirmTitle", "fcConfirmText", "fcConfirmAction"]) {
      const node = $(id), original = node.textContent, pair = copyPairs.get(original);
      if (pair) { node.textContent = pair[lang()]; continue; }
      // A known status prefix can precede an unchanged server error.
      for (const [source, translation] of copyPairs) {
        if (source.length > 20 && /\s$/.test(source) && original.startsWith(source)) {
          node.textContent = translation[lang()] + original.slice(source.length); break;
        }
      }
    }
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => "local-" + (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const sample = { id: "builtin-intro", title: "Dasar termodinamika", topic: "Energi & kalor", builtin: true, cards: [
    { front: "Apa perbedaan suhu dan kalor?", back: "Suhu menyatakan keadaan termal suatu sistem. Kalor adalah energi yang berpindah karena perbedaan suhu; satuannya joule (J)." },
    { front: "Bagaimana bentuk Hukum I Termodinamika?", back: "ΔU = Q − W, jika W adalah usaha yang dilakukan sistem. Perubahan energi dalam sama dengan kalor yang diterima dikurangi usaha yang dilakukan sistem." },
    { front: "Apa yang dimaksud dengan kesetimbangan termal?", back: "Dua sistem berada dalam kesetimbangan termal ketika suhunya sama sehingga tidak ada perpindahan kalor netto di antara keduanya." }
  ] };
  const sampleEnglish = { ...sample, title: "Thermodynamics basics", topic: "Energy & heat", cards: [
    { front: "What is the difference between temperature and heat?", back: "Temperature describes the thermal state of a system. Heat is energy transferred because of a temperature difference; its unit is the joule (J)." },
    { front: "How is the First Law of Thermodynamics expressed?", back: "ΔU = Q − W, when W is the work done by the system. The change in internal energy equals the heat received minus the work done by the system." },
    { front: "What is thermal equilibrium?", back: "Two systems are in thermal equilibrium when their temperatures are equal, so there is no net heat transfer between them." }
  ] };
  const displayDeck = deck => deck.builtin && lang() === "en" ? sampleEnglish : deck;
  let localDecks = [], cloudDecks = [], user = null, current = sample, draft = null;
  let dirty = false, editing = false, saving = false, importing = false, order = [], index = 0, flipped = false, source = null;
  let reviewed = new Set(), reviewLogged = false;
  let importTicket = 0, cloudTicket = 0;
  function setMessageCopy(node, value) {
    const pair = copyPairs.get(value);
    if (pair) { node.dataset.fcId = pair.id; node.dataset.fcEn = pair.en; }
    else { delete node.dataset.fcId; delete node.dataset.fcEn; }
    node.textContent = value;
  }
  function message(value, tone = "info") { setMessageCopy($("fcStatus"), value); $("fcStatus").dataset.tone = tone; $("fcStatus").hidden = !value; }
  function importMessage(value, tone = "info") { setMessageCopy($("fcImportStatus"), value); $("fcImportStatus").dataset.tone = tone; }
  function cleanCards(cards) {
    if (!Array.isArray(cards) || !cards.length || cards.length > MAX_CARDS) throw new Error(t("Gunakan 1–100 kartu per materi.", "Use 1–100 cards per deck."));
    return cards.map((card, position) => {
      const front = String(card.front || "").trim(), back = String(card.back || "").trim();
      if (!front || !back) throw new Error(t(`Pertanyaan dan jawaban kartu ${position + 1} wajib diisi.`, `Question and answer on card ${position + 1} are required.`));
      if (front.length > 2000 || back.length > 8000) throw new Error(t(`Kartu ${position + 1} terlalu panjang (pertanyaan maks. 2.000; jawaban maks. 8.000 karakter).`, `Card ${position + 1} is too long (question max. 2,000; answer max. 8,000 characters).`));
      return { front, back };
    });
  }
  function readLocal() {
    try {
      const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      if (!Array.isArray(value)) return;
      localDecks = value.filter(deck => deck && typeof deck.id === "string" && typeof deck.title === "string" && Array.isArray(deck.cards)).filter(deck => { try { cleanCards(deck.cards); return true; } catch (_) { return false; } });
    } catch (_) { message(t("Koleksi lokal tidak dapat dibaca. Anda masih bisa membuat materi baru.", "Your local library could not be read. You can still create a new deck."), "error"); }
  }
  function persist(deck) {
    delete deck.session_only;
    const next = [deck, ...localDecks.filter(item => item.id !== deck.id)];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    localDecks = next;
  }
  function decks() {
    const represented = new Set(localDecks.filter(deck => deck.cloud_id && deck.owner_id === user?.id).map(deck => deck.cloud_id));
    return [...localDecks, ...cloudDecks.filter(deck => !represented.has(deck.id)), sample];
  }
  function isOwner(deck) { return Boolean(deck.cloud && user && deck.owner_id === user.id); }
  function renderLibrary() {
    const container = $("fcDeckList"); container.replaceChildren();
    const items = decks(); $("fcDeckCount").textContent = String(items.length);
    for (const deck of items) {
      const row = document.createElement("div"); row.className = "fc-deck-entry";
      const button = document.createElement("button"); button.type = "button"; button.className = "fc-deck-button"; button.classList.toggle("is-active", deck.id === current?.id); button.setAttribute("aria-pressed", String(deck.id === current?.id));
      const name = document.createElement("strong"); name.textContent = displayDeck(deck).title; name.setAttribute("data-tpx-no-translate", "");
      const meta = document.createElement("span"); meta.textContent = `${deck.cards.length} ${t("kartu", "cards")} · ${deck.builtin ? t("Contoh", "Sample") : deck.cloud ? "Cloud" : deck.session_only ? deck.cloud_synced ? "Cloud" : t("Halaman ini", "This page") : deck.cloud_id ? deck.cloud_synced ? t("Lokal + cloud", "Local + cloud") : t("Lokal · belum sinkron", "Local · unsynced") : t("Lokal", "Local")}`;
      button.append(name, meta); button.addEventListener("click", async () => { if (await leaveDraft()) select(deck); }); row.append(button);
      if (!deck.builtin && (!deck.cloud || isOwner(deck))) {
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "fc-deck-delete"; remove.textContent = "×"; remove.setAttribute("aria-label", t(`Hapus materi ${deck.title}`, `Delete deck ${deck.title}`));
        remove.addEventListener("click", () => deleteDeck(deck)); row.append(remove);
      }
      container.append(row);
    }
  }
  function translateStatic() {
    document.querySelectorAll("[data-fc-id]").forEach(node => { node.textContent = lang() === "en" ? node.dataset.fcEn : node.dataset.fcId; });
    document.querySelectorAll("[data-fc-placeholder-id]").forEach(node => { node.placeholder = lang() === "en" ? node.dataset.fcPlaceholderEn : node.dataset.fcPlaceholderId; });
    document.querySelectorAll("[data-fc-aria-id]").forEach(node => { node.setAttribute("aria-label", lang() === "en" ? node.dataset.fcAriaEn : node.dataset.fcAriaId); });
    $("fcSourceCount").textContent = `${$("fcSourceText").value.length.toLocaleString(lang() === "en" ? "en-US" : "id-ID")} / ${lang() === "en" ? "120,000" : "120.000"}`;
  }
  function markDirty() { dirty = true; $("fcDirtyLabel").hidden = false; }
  function setPanel(edit, focus = false) {
    editing = edit;
    $("fcStudyPanel").hidden = edit; $("fcEditPanel").hidden = !edit;
    for (const [node, active] of [[$("fcStudyTab"), !edit], [$("fcEditTab"), edit]]) { node.classList.toggle("is-active", active); node.setAttribute("aria-selected", String(active)); node.tabIndex = active ? 0 : -1; }
    if (focus) (edit ? $("fcDeckTitle") : $("fcStudyCard")).focus();
  }
  function renderStudy() {
    if (!current) return;
    const visible = displayDeck(current);
    $("fcStudyTitle").textContent = visible.title;
    $("fcStudyTopic").textContent = visible.topic || t("Materi Anda", "Your material");
    const card = visible.cards[order[index] ?? 0];
    $("fcCardText").textContent = card ? (flipped ? card.back : card.front) : t("Materi belum memiliki kartu.", "This deck has no cards yet.");
    $("fcCardSide").textContent = flipped ? t("JAWABAN", "ANSWER") : t("PERTANYAAN", "QUESTION");
    $("fcStudyCard").classList.toggle("is-flipped", flipped); $("fcStudyCard").setAttribute("aria-pressed", String(flipped));
    $("fcStudyCard").setAttribute("aria-label", t(`${flipped ? "Jawaban" : "Pertanyaan"} kartu ${index + 1}. Balik kartu.`, `${flipped ? "Answer" : "Question"} ${index + 1}. Flip card.`));
    $("fcProgressLabel").textContent = t(`Kartu ${index + 1} dari ${current.cards.length}`, `Card ${index + 1} of ${current.cards.length}`);
    $("fcProgressFill").style.width = `${100 * (index + 1) / current.cards.length}%`;
    $("fcPrev").disabled = index === 0; $("fcNext").disabled = index >= current.cards.length - 1; $("fcShuffle").disabled = current.cards.length < 2;
  }
  function select(deck) {
    current = deck; index = 0; flipped = false; order = deck.cards.map((_, position) => position); draft = null; dirty = false; source = null;
    reviewed.clear(); reviewLogged = false;
    $("fcSourceText").value = ""; $("fcImportFile").value = ""; $("fcGenerate").disabled = false; $("fcSaveDeck").disabled = saving; importing = false; importMessage(""); importTicket++;
    setPanel(false); renderLibrary(); renderStudy(); message("");
  }
  function renderEditor() {
    $("fcDeckTitle").value = draft.title; $("fcDeckTopic").value = draft.topic || "";
    $("fcEditCount").textContent = `${draft.cards.length} / ${MAX_CARDS}`; $("fcAddCard").disabled = draft.cards.length >= MAX_CARDS;
    $("fcDirtyLabel").hidden = !dirty;
    const container = $("fcCardEditor"); container.replaceChildren();
    draft.cards.forEach((card, position) => {
      const row = document.createElement("div"); row.className = "fc-edit-card";
      const number = document.createElement("span"); number.className = "fc-edit-card-number"; number.textContent = String(position + 1).padStart(2, "0");
      const fields = document.createElement("div"); fields.className = "fc-edit-card-fields";
      for (const side of ["front", "back"]) {
        const label = document.createElement("label"); label.className = "fc-field";
        const caption = document.createElement("span"); caption.textContent = side === "front" ? t("Pertanyaan / sisi depan", "Question / front") : t("Jawaban / sisi belakang", "Answer / back");
        const input = document.createElement("textarea"); input.value = card[side]; input.rows = 3; input.maxLength = side === "front" ? 2000 : 8000; input.required = true;
        input.setAttribute("aria-label", `${caption.textContent} ${position + 1}`);
        input.addEventListener("input", () => { draft.cards[position][side] = input.value; markDirty(); });
        label.append(caption, input); fields.append(label);
      }
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "fc-card-remove"; remove.textContent = t("Hapus kartu", "Remove card"); remove.setAttribute("aria-label", t(`Hapus kartu ${position + 1}`, `Remove card ${position + 1}`));
      remove.addEventListener("click", async () => { const hasText = card.front.trim() || card.back.trim(); if (hasText && !await confirmAction(t("Hapus kartu ini?", "Remove this card?"), t("Pertanyaan dan jawaban kartu ini akan dihapus dari draf.", "This card's question and answer will be removed from your draft."), t("Hapus", "Remove"))) return; draft.cards.splice(position, 1); markDirty(); renderEditor(); });
      fields.append(remove); row.append(number, fields); container.append(row);
    });
    refreshSaveControls();
  }
  function refreshCloudOptions() {
    $("fcCloudSave").disabled = !user || saving;
    if (!user) $("fcCloudSave").checked = false;
    $("fcPublicOption").hidden = !$("fcCloudSave").checked;
  }
  function refreshSaveControls() {
    $("fcEditPanel").querySelectorAll("input,textarea,button").forEach(node => { node.disabled = saving; });
    $("fcNewDeck").disabled = saving;
    $("fcEditCurrent").disabled = saving;
    $("fcSaveDeck").disabled = saving || importing;
    $("fcGenerate").disabled = saving || importing;
    $("fcAddCard").disabled = saving || (draft?.cards.length || 0) >= MAX_CARDS;
    refreshCloudOptions();
  }
  function startEdit(newDeck = false) {
    if (saving) return;
    draft = newDeck ? { id: uid(), title: "", topic: "", cards: [{ front: "", back: "" }] } : clone(displayDeck(current));
    if (draft.builtin || (draft.cloud && !isOwner(draft))) { draft.id = uid(); delete draft.cloud; delete draft.cloud_id; delete draft.owner_id; delete draft.builtin; }
    if (draft.cloud && isOwner(draft)) { draft.cloud_id = draft.id; draft.id = uid(); delete draft.cloud; }
    source = draft.source_name ? { sourceName: draft.source_name, sourceType: draft.source_type } : null;
    dirty = false; $("fcCloudSave").checked = Boolean(user && draft.cloud_id && draft.owner_id === user.id); $("fcPublicDeck").checked = Boolean(draft.is_public);
    setPanel(true); renderEditor(); translateStatic();
    if (newDeck) $("fcDeckTitle").focus();
  }
  function confirmAction(title, body, action) {
    const dialog = $("fcConfirmDialog");
    if (dialog.open) return Promise.resolve(false);
    $("fcConfirmTitle").textContent = title; $("fcConfirmText").textContent = body; $("fcConfirmAction").textContent = action;
    dialog.returnValue = "cancel";
    return new Promise(resolve => { dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true }); dialog.showModal(); });
  }
  async function leaveDraft() {
    if (saving) return false;
    if (dirty && !await confirmAction(t("Tinggalkan perubahan?", "Leave unsaved changes?"), t("Perubahan belum disimpan. Pilih Batal untuk kembali dan menyimpan materi.", "Your changes have not been saved. Choose Cancel to return and save your deck."), t("Tinggalkan", "Leave"))) return false;
    dirty = false; return true;
  }
  async function deleteDeck(deck) {
    if (!await confirmAction(t("Hapus materi?", "Delete deck?"), deck.cloud ? t(`“${deck.title}” akan dihapus dari cloud untuk semua pengguna.`, `“${deck.title}” will be deleted from the cloud for all users.`) : t(`“${deck.title}” akan dihapus dari browser ini. Salinan cloud, jika ada, tetap tersedia.`, `“${deck.title}” will be removed from this browser. Any cloud copy remains available.`), t("Hapus materi", "Delete deck"))) return;
    try {
      if (deck.cloud) { const result = await api().deleteDeck(deck.id); if (result.error) throw new Error(result.error.message); cloudDecks = cloudDecks.filter(item => item.id !== deck.id); }
      else { const next = localDecks.filter(item => item.id !== deck.id); localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); localDecks = next; }
      if (current?.id === deck.id) select(decks()[0] || sample); else renderLibrary();
      message(t("Materi dihapus.", "Deck deleted."), "success");
    } catch (error) { message(error.message || t("Materi belum dihapus.", "The deck was not deleted."), "error"); }
  }
  async function saveDeck() {
    if (saving || importing || !draft) return;
    let localSaved = false, cloudSaved = false;
    try {
      const title = $("fcDeckTitle").value.trim();
      if (!title) { $("fcDeckTitle").focus(); throw new Error(t("Isi judul materi terlebih dahulu.", "Enter a deck title first.")); }
      const cloudWanted = $("fcCloudSave").checked;
      const deck = { ...draft, title, topic: $("fcDeckTopic").value.trim(), cards: cleanCards(draft.cards), updated_at: new Date().toISOString(), source_name: source?.sourceName || null, source_type: source?.sourceType || null, is_public: cloudWanted && $("fcPublicDeck").checked, cloud_synced: false };
      delete deck.builtin; delete deck.cloud;
      try { persist(deck); localSaved = true; draft = deck; dirty = false; $("fcDirtyLabel").hidden = true; renderLibrary(); }
      catch (_) {
        if (!cloudWanted) throw new Error(t("Browser tidak dapat menyimpan materi. Draf tetap terbuka; kosongkan ruang penyimpanan atau masuk dan pilih Simpan ke akun THERMPYX.", "Your browser cannot save the deck. Your draft stays open; free some storage or sign in and choose Save to THERMPYX account."));
      }
      saving = true; refreshSaveControls();
      message(cloudWanted ? localSaved ? t("Materi tersimpan lokal. Menyimpan ke cloud…", "Deck saved locally. Saving to cloud…") : t("Penyimpanan browser tidak tersedia. Menyimpan ke akun THERMPYX…", "Browser storage is unavailable. Saving to your THERMPYX account…") : t("Materi tersimpan di browser ini. Siap dipelajari.", "Deck saved in this browser. Ready to study."), "info");
      if (cloudWanted) {
        const payload = { title: deck.title, topic: deck.topic, cards: deck.cards, source_name: deck.source_name, source_type: deck.source_type, is_public: deck.is_public };
        if (deck.cloud_id && deck.owner_id === user?.id) payload.id = deck.cloud_id;
        const result = await api().saveDeck(payload);
        if (result.error) throw Object.assign(new Error(result.error.message), result.error);
        if (!result.data) throw new Error(t("Cloud belum mengembalikan materi.", "The cloud did not return the saved deck."));
        const saved = result.data;
        cloudSaved = true; deck.cloud_id = saved.id; deck.owner_id = saved.owner_id; deck.cloud_synced = true;
        try { persist(deck); localSaved = true; }
        catch (_) {
          deck.session_only = !localSaved;
          localDecks = [deck, ...localDecks.filter(item => item.id !== deck.id)];
        }
        if (saved.owner_id === user?.id) cloudDecks = [{ ...saved, cloud: true }, ...cloudDecks.filter(item => item.id !== saved.id)];
        message(localSaved ? t("Materi tersimpan lokal dan di akun cloud.", "Deck saved locally and to your cloud account.") : t("Materi tersimpan di akun THERMPYX. Salinan perangkat belum tersimpan karena penyimpanan browser tidak tersedia.", "Deck saved to your THERMPYX account. A device copy was not saved because browser storage is unavailable."), "success");
      }
      draft = deck; dirty = false; current = deck; order = deck.cards.map((_, position) => position); index = 0; flipped = false;
      reviewed.clear(); reviewLogged = false;
      setPanel(false); renderLibrary(); renderStudy();
      if (!cloudWanted) message(t("Materi tersimpan di browser ini. Siap dipelajari.", "Deck saved in this browser. Ready to study."), "success");
    } catch (error) {
      if (!localSaved && !cloudSaved) { dirty = true; $("fcDirtyLabel").hidden = false; }
      const pair = errorPair(error), prefix = localSaved
        ? { id: "Salinan lokal tetap aman. ", en: "Your local copy is safe. " }
        : { id: "Draf tetap terbuka dan belum tersimpan. ", en: "Your draft stays open and has not been saved. " };
      message(t(prefix.id + (pair.id || "Materi belum tersimpan. Periksa ruang penyimpanan browser."), prefix.en + (pair.en || "The deck could not be saved. Check your browser storage.")), "error");
    } finally { saving = false; refreshSaveControls(); }
  }
  async function loadCloud() {
    if (!api()) return;
    const ticket = ++cloudTicket;
    try {
      const result = await api().listDecks();
      if (ticket !== cloudTicket) return;
      if (result.error) {
        if (result.error.messageEn?.startsWith("Cloud connection is unavailable.")) message(t("Koleksi cloud belum tersedia. Anda tetap bisa belajar dan menyimpan secara lokal.", "Cloud decks are unavailable. You can still study and save locally."));
        else { const pair = errorPair(result.error); message(t("Koleksi cloud belum tersedia; materi lokal tetap dapat digunakan. " + pair.id, "Cloud decks are unavailable; you can keep using local material. " + pair.en)); }
        return;
      }
      cloudDecks = (Array.isArray(result.data) ? result.data : []).filter(deck => { try { cleanCards(deck.cards); return true; } catch (_) { return false; } }).map(deck => ({ ...deck, cloud: true }));
      renderLibrary();
    } catch (error) { if (ticket === cloudTicket) message(t("Koleksi cloud belum tersedia. Anda tetap bisa belajar dan menyimpan secara lokal.", "Cloud decks are unavailable. You can still study and save locally.")); }
  }
  async function importFile() {
    const file = $("fcImportFile").files[0]; if (!file) return;
    const ticket = ++importTicket; importing = true; $("fcGenerate").disabled = true; $("fcSaveDeck").disabled = true;
    importMessage(t("Membaca dokumen di perangkat Anda…", "Reading the document on your device…"));
    try {
      const result = await window.TPXDocumentImport.extract(file, { onProgress: (page, total) => { if (ticket === importTicket) importMessage(t(`Membaca halaman ${page} dari ${total}…`, `Reading page ${page} of ${total}…`)); } });
      if (ticket !== importTicket || !draft) return;
      $("fcSourceText").value = result.text; source = result; markDirty();
      if (!$("fcDeckTitle").value.trim()) { draft.title = file.name.replace(/\.(pdf|docx)$/i, "").slice(0, 120); $("fcDeckTitle").value = draft.title; }
      const warnings = language => result.warnings.length ? "\n" + result.warnings.map(value => window.TPX?.translateText?.(value, language) || value).join("\n") : "";
      importMessage(t(`${file.name} berhasil dibaca${result.pages ? ` (${result.pages} halaman)` : ""}. Periksa teks, lalu buat draf kartu.${warnings("id")}`, `${file.name} read successfully${result.pages ? ` (${result.pages} pages)` : ""}. Review the text, then draft cards.${warnings("en")}`));
      translateStatic();
    } catch (error) { if (ticket === importTicket) { const pair = errorPair(error); importMessage(t(pair.id || "Dokumen gagal dibaca. Gunakan PDF dengan teks atau DOCX standar.", pair.en || "The document could not be read. Use a text PDF or a standard DOCX."), "error"); } }
    finally { if (ticket === importTicket) { importing = false; $("fcGenerate").disabled = false; $("fcSaveDeck").disabled = saving; } }
  }
  async function generateCards() {
    if (!draft) return;
    const text = $("fcSourceText").value.trim();
    if (text.length < 20) { importMessage(t("Tempel sedikitnya 20 karakter materi atau pilih PDF/DOCX terlebih dahulu.", "Paste at least 20 characters of material or choose a PDF/DOCX first."), "error"); return; }
    if (draft.cards.some(card => card.front.trim() || card.back.trim()) && !await confirmAction(t("Ganti draf kartu?", "Replace the current draft cards?"), t("Kartu yang sedang diedit akan diganti oleh draf dari teks. Materi yang sudah disimpan belum berubah.", "The cards you are editing will be replaced with a draft from the text. Your saved deck stays unchanged until you save."), t("Buat draf baru", "Create a new draft"))) return;
    try {
      const cards = window.TPXDocumentImport.generateDraft(text, { language: lang() });
      if (!cards.length) throw new Error(t("Tidak ada paragraf yang dapat dijadikan kartu. Tambahkan penjelasan setelah judul materi.", "No paragraphs could be turned into cards. Add an explanation after your headings."));
      draft.cards = cards; markDirty(); renderEditor();
      importMessage(t(`${cards.length} draf kartu dibuat${cards.length === MAX_CARDS ? " (batas 100 kartu tercapai; materi sisanya belum dimasukkan)" : ""}. Edit pertanyaan dan jawaban, lalu tekan Simpan materi.`, `${cards.length} draft cards created${cards.length === MAX_CARDS ? " (100-card limit reached; remaining material was not included)" : ""}. Edit the questions and answers, then press Save deck.`));
      $("fcCardEditor").scrollIntoView({ behavior: "auto", block: "start" });
    } catch (error) { importMessage(error.message, "error"); }
  }
  function move(delta) { const next = index + delta; if (next >= 0 && next < order.length) { index = next; flipped = false; renderStudy(); } }
  $("fcNewDeck").addEventListener("click", async () => { if (await leaveDraft()) { source = null; importTicket++; importing = false; $("fcGenerate").disabled = false; $("fcSaveDeck").disabled = saving; $("fcSourceText").value = ""; $("fcImportFile").value = ""; importMessage(""); startEdit(true); } });
  $("fcEditCurrent").addEventListener("click", () => { if (draft && dirty) setPanel(true); else startEdit(); });
  $("fcEditTab").addEventListener("click", () => { if (!editing) { if (draft) setPanel(true); else startEdit(); } });
  $("fcStudyTab").addEventListener("click", () => setPanel(false));
  [$("fcStudyTab"), $("fcEditTab")].forEach(tab => tab.addEventListener("keydown", event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const edit = event.key === "End" || (event.key !== "Home" && !editing); const next = edit ? $("fcEditTab") : $("fcStudyTab"); next.click(); next.focus(); } }));
  $("fcCancelEdit").addEventListener("click", async () => { if (await leaveDraft()) select(current); });
  $("fcDeckTitle").addEventListener("input", () => { draft.title = $("fcDeckTitle").value; markDirty(); });
  $("fcDeckTopic").addEventListener("input", () => { draft.topic = $("fcDeckTopic").value; markDirty(); });
  $("fcCloudSave").addEventListener("change", () => { refreshCloudOptions(); markDirty(); });
  $("fcPublicDeck").addEventListener("change", markDirty);
  $("fcAddCard").addEventListener("click", () => { if (draft.cards.length >= MAX_CARDS) return; draft.cards.push({ front: "", back: "" }); markDirty(); renderEditor(); $("fcCardEditor").lastElementChild.querySelector("textarea").focus(); });
  $("fcSaveDeck").addEventListener("click", saveDeck);
  $("fcImportFile").addEventListener("change", importFile);
  $("fcSourceText").addEventListener("input", () => { source = { sourceName: source?.sourceName || t("Teks ditempel", "Pasted text"), sourceType: source?.sourceType || "text" }; markDirty(); translateStatic(); });
  $("fcGenerate").addEventListener("click", generateCards);
  $("fcStudyCard").addEventListener("click", () => {
    flipped = !flipped; renderStudy();
    if (!flipped) return;
    reviewed.add(order[index]);
    if (!reviewLogged && reviewed.size === current.cards.length) {
      reviewLogged = true;
      const count = current.cards.length;
      const metadata = { detailEn: `${count} cards reviewed`, detailId: `${count} kartu dipelajari` };
      if (current.builtin) { metadata.titleEn = sampleEnglish.title; metadata.titleId = sample.title; }
      window.TPXHistory?.log("flashcard", displayDeck(current).title, t(metadata.detailId, metadata.detailEn), location.pathname, metadata);
    }
  });
  $("fcPrev").addEventListener("click", () => move(-1)); $("fcNext").addEventListener("click", () => move(1));
  $("fcShuffle").addEventListener("click", () => { for (let step = order.length - 1; step > 0; step--) { const random = Math.floor(Math.random() * (step + 1)); [order[step], order[random]] = [order[random], order[step]]; } index = 0; flipped = false; renderStudy(); message(t("Urutan kartu diacak.", "Cards shuffled.")); });
  document.addEventListener("keydown", event => { if (editing || $("fcConfirmDialog").open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest("input,textarea,select,[contenteditable=true]")) return; if (event.target.closest("button,a") && event.target !== $("fcStudyCard")) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } });
  window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("thermpyx:languagechange", () => { translateStatic(); localizeMessages(); renderLibrary(); renderStudy(); if (draft && editing) renderEditor(); });
  readLocal(); current = localDecks[0] || sample; order = current.cards.map((_, position) => position); translateStatic(); renderLibrary(); renderStudy();
  if (api()) {
    let authRevision = 0;
    const applySession = active => { user = active?.user || null; refreshCloudOptions(); cloudDecks = []; renderLibrary(); loadCloud(); };
    api().mountAuth?.(document.querySelector("[data-content-auth]"));
    api().onAuthChange(active => { authRevision++; applySession(active); });
    const initialRevision = authRevision;
    api().session().then(active => { if (authRevision === initialRevision) applySession(active); }).catch(() => refreshCloudOptions());
  } else refreshCloudOptions();
})();
