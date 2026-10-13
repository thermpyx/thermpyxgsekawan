/* THERMPYX host: built-in topics or a signed-in owner's saved question set. */
"use strict";
const createRoomBtn = document.getElementById("createRoomBtn");
const topicSelect = document.getElementById("topic");
const sourceSelect = document.getElementById("questionSource");
const setSelect = document.getElementById("questionSet");
const hostStatus = document.getElementById("hostStatus");
const hostText = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
let ownedSets = new Map(), creating = false, loadingSets = false, authRevision = 0;
function status(en, id) { if (hostStatus) hostStatus.textContent = hostText(en, id || en); }
const questionCountLabel = count => hostText(count === 1 ? "question" : "questions", "soal");
function localizeSavedSets() {
  if (!setSelect) return;
  for (const option of setSelect.options) {
    const item = ownedSets.get(String(option.value));
    if (item) option.textContent = `${item.title} · ${item.questions.length} ${questionCountLabel(item.questions.length)}`;
  }
  window.ThermpyxSelect?.refresh(setSelect);
}
window.addEventListener("thermpyx:languagechange", localizeSavedSets);
function showSource() {
  const custom = sourceSelect?.value === "custom";
  document.getElementById("builtinQuestions").hidden = custom;
  document.getElementById("customQuestions").hidden = !custom;
  if (custom) loadQuestionSets();
}
async function loadQuestionSets() {
  if (loadingSets || !setSelect) return;
  loadingSets = true;
  const revision = authRevision;
  const refresh = document.getElementById("refreshQuestionSets");
  if (refresh) refresh.disabled = true;
  try {
    const previous = setSelect.value;
    ownedSets = new Map(); setSelect.replaceChildren();
    const placeholder = document.createElement("option"); placeholder.value = "";
    placeholder.textContent = hostText("Select your saved set", "Pilih paket tersimpan Anda");
    setSelect.append(placeholder);
    if (!window.TPXContent || !await window.TPXContent.session()) {
      status("Sign in below to use your cloud question sets. Built-in topics are still available.", "Masuk di bawah untuk memakai paket soal cloud Anda. Topik bawaan tetap tersedia.");
      return;
    }
    const result = await window.TPXContent.listQuestionSets();
    if (revision !== authRevision) return;
    if (result.error) { status(result.error.message); return; }
    for (const item of result.data || []) {
      ownedSets.set(String(item.id), item);
      const option = document.createElement("option"); option.value = item.id;
      option.textContent = `${item.title} · ${item.questions.length} ${questionCountLabel(item.questions.length)}`;
      option.setAttribute("data-tpx-no-translate", ""); setSelect.append(option);
    }
    if (ownedSets.has(previous)) setSelect.value = previous;
    status(ownedSets.size ? "Your cloud question sets are ready." : "No saved sets yet. Open Question Bank to add one.", ownedSets.size ? "Paket soal cloud Anda siap." : "Belum ada paket tersimpan. Buka Bank Soal untuk menambahkannya.");
  } catch (_) { status("Could not load question sets. Try again.", "Paket soal gagal dimuat. Coba lagi."); }
  finally {
    loadingSets = false; if (refresh) refresh.disabled = false;
    setSelect.dispatchEvent(new Event("change", { bubbles: true }));
    if (revision !== authRevision && sourceSelect?.value === "custom") loadQuestionSets();
  }
}
sourceSelect?.addEventListener("change", showSource);
document.getElementById("refreshQuestionSets")?.addEventListener("click", loadQuestionSets);
window.TPXContent?.mountAuth(document.querySelector("[data-content-auth]"));
window.TPXContent?.onAuthChange(() => {
  authRevision++; ownedSets = new Map();
  if (setSelect) { setSelect.replaceChildren(new Option(hostText("Select your saved set", "Pilih paket tersimpan Anda"), "")); setSelect.dispatchEvent(new Event("change", { bubbles: true })); }
  if (sourceSelect?.value === "custom") loadQuestionSets();
});
async function createHostRoom() {
  const db = typeof supabaseClient !== "undefined" ? supabaseClient : null;
  if (!db) { status("The quiz backend is unavailable. Check your connection and Supabase setup.", "Backend kuis belum tersedia. Periksa koneksi dan setup Supabase."); return; }
  let topic = topicSelect.value, questions;
  if (sourceSelect?.value === "custom") {
    const active = await window.TPXContent?.session();
    if (!active) { status("Sign in to host your saved question set.", "Masuk untuk menjadi host paket soal Anda."); return; }
    const selected = ownedSets.get(setSelect.value);
    if (!selected) { status("Choose a saved question set first.", "Pilih paket soal tersimpan dahulu."); return; }
    if (selected.owner_id !== active.user.id) { status("Reload the sets for your current account.", "Muat ulang paket untuk akun aktif Anda."); return; }
    try { questions = window.TPXContent.normalizeQuestions(selected.questions); topic = selected.topic; }
    catch (error) { status(error.message); return; }
  }
  createRoomBtn.textContent = hostText("CREATING ROOM…", "MEMBUAT RUANG…");
  status("Creating a room…", "Membuat ruang…");
  try {
    let room = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const payload = { room_code: code, topic, status: "waiting" };
      if (questions) payload.questions = questions;
      const result = await db.from("quiz_rooms").insert(payload).select().single();
      if (!result.error) { room = result.data; break; }
      if (result.error.code === "23505" && attempt < 2) continue;
      if (questions && ["42703", "PGRST204"].includes(result.error.code)) throw new Error(hostText("Run supabase/01-content-library.sql to enable custom quiz rooms.", "Jalankan supabase/01-content-library.sql untuk mengaktifkan ruang soal kustom."));
      throw new Error(hostText("Room creation failed. Check Supabase access and try again.", "Ruang gagal dibuat. Periksa akses Supabase dan coba lagi."));
    }
    if (!room?.id) throw new Error(hostText("Room creation was not confirmed.", "Pembuatan ruang belum terkonfirmasi."));
    sessionStorage.setItem("roomId", room.id); sessionStorage.setItem("roomCode", room.room_code);
    sessionStorage.setItem("roomTopic", room.topic); sessionStorage.setItem("userRole", "host");
    sessionStorage.removeItem("playerId"); sessionStorage.removeItem("nickname");
    window.location.href = "waiting-room.html";
  } catch (error) { status(error.message || hostText("Connection failed. Try again.", "Koneksi gagal. Coba lagi.")); }
}
createRoomBtn.addEventListener("click", async () => {
  if (creating) return;
  creating = true; createRoomBtn.disabled = true;
  try { await createHostRoom(); }
  finally { creating = false; createRoomBtn.disabled = false; createRoomBtn.textContent = hostText("CREATE ROOM", "BUAT RUANG"); }
});
