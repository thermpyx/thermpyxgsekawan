/* THERMPYX Live Quiz. Advance only after Firebase confirms a persisted answer. */
"use strict";
const roomId = sessionStorage.getItem("roomId"), roomCode = sessionStorage.getItem("roomCode");
const playerId = sessionStorage.getItem("playerId"), userRole = sessionStorage.getItem("userRole");
const nickname = sessionStorage.getItem("nickname"), live = window.TPXLive;
const $ = id => document.getElementById(id);
const roleEl = $("playRole"), roomEl = $("playRoomCode"), timerEl = $("quizTimer"),
  timerProgress = $("timerProgress"), timerBox = $("timerBox"), numberEl = $("questionNumber"),
  questionEl = $("questionText"), optionsEl = $("answerOptions"), messageEl = $("playMessage");
const QUESTION_MS = 20000;
let questions = [], index = 0, startedMs = 0, tick = null, unsubscribeRoom = null, unsubscribeConnection = null;
let customQuestions = false, locked = false, saving = false, advancing = false, finished = false, leaving = false, pending = null;
let progressQueue = Promise.resolve();
let skillPending = false;
const skills = window.TPXQuizSkills?.create({
  root: $("quizSkills"), options: optionsEl, live, roomId, playerId,
  isActive: target => target === index && !locked && !finished && !leaving && Date.now() - startedMs < QUESTION_MS,
  onPendingChange(value) {
    skillPending = value;
    if (value) lockOptions();
    else if (!locked && !finished && !leaving) {
      if (Date.now() - startedMs >= QUESTION_MS) submit(-1);
      else optionsEl.querySelectorAll("button").forEach(button => { button.disabled = button.hasAttribute("data-prism-eliminated"); });
    }
  }
});
const txt = (en, id) => window.TPX?.t ? window.TPX.t(en, id) : en;
// Saved answers determine completed questions. Monitoring progress never blocks
// the first question or an answer that Firebase has already confirmed.
function saveProgressBestEffort(target, stamp) {
  progressQueue = progressQueue.catch(() => {}).then(async () => {
    try { await live.updateProgress(roomId, playerId, { current_question: target, question_started_at: stamp }); }
    catch (error) { /* Firebase reconnects; saved answers remain authoritative. */ }
  });
  return progressQueue;
}
function protectUserText(element) {
  element.setAttribute("data-tpx-no-translate", ""); element.setAttribute("data-tpx-user-content", "");
  return element;
}
function renderPlayerName() {
  const label = document.createElement("span");
  label.setAttribute("data-en", "Player: "); label.setAttribute("data-id", "Pemain: ");
  label.textContent = txt("Player: ", "Pemain: ");
  const name = protectUserText(document.createElement("span")); name.textContent = nickname || txt("Guest", "Tamu");
  roleEl.replaceChildren(label, name);
}
window.addEventListener("thermpyx:languagechange", () => {
  if (roomId && playerId && userRole === "player") renderPlayerName();
  if (!finished && questions.length) numberEl.textContent = `${txt("Question", "Soal")} ${index + 1} ${txt("of", "dari")} ${questions.length}`;
});
function showQuestionText(value) {
  questionEl.toggleAttribute("data-tpx-no-translate", customQuestions);
  questionEl.toggleAttribute("data-tpx-user-content", customQuestions); questionEl.textContent = value;
}
function message(en, id) { messageEl.textContent = txt(en, id); }
function clearClock() { if (tick) clearInterval(tick); tick = null; }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function showRetry(callback, en = "Connection interrupted. Retry to continue.", id = "Koneksi terputus. Coba lagi untuk melanjutkan.") {
  if (finished || leaving) return;
  message(en, id);
  const button = document.createElement("button"); button.type = "button"; button.className = "play-retry";
  button.textContent = txt("RETRY", "COBA LAGI");
  button.addEventListener("click", () => { button.disabled = true; Promise.resolve(callback()).catch(() => showRetry(callback)); }, { once: true });
  messageEl.append(" ", button);
}
function render() {
  if (finished || leaving) return;
  clearClock(); locked = false; advancing = false; pending = null;
  if (index >= questions.length) { complete(); return; }
  const item = questions[index];
  numberEl.textContent = `${txt("Question", "Soal")} ${index + 1} ${txt("of", "dari")} ${questions.length}`;
  showQuestionText(item.question); optionsEl.replaceChildren();
  item.options.forEach((name, choice) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "answer-option";
    if (customQuestions) protectUserText(button);
    button.textContent = name; button.addEventListener("click", () => submit(choice)); optionsEl.append(button);
  });
  skills?.renderQuestion(index, item);
  message("Choose one answer before time runs out.", "Pilih satu jawaban sebelum waktu habis.");
  refreshClock(); if (!locked) tick = setInterval(refreshClock, 200);
}
function refreshClock() {
  if (locked || finished || leaving) return;
  const remain = Math.max(0, QUESTION_MS - (Date.now() - startedMs));
  timerEl.textContent = String(Math.ceil(remain / 1000)); timerProgress.style.width = (100 * remain / QUESTION_MS) + "%";
  timerBox.classList.toggle("danger", remain <= 5000); if (remain <= 0) submit(-1);
}
function lockOptions() { optionsEl.querySelectorAll("button").forEach(button => { button.disabled = true; }); }
function showChoice(choice) {
  const correct = questions[index].correctAnswer;
  optionsEl.querySelectorAll("button").forEach((button, option) => {
    if (option === correct) button.classList.add("correct-answer");
    if (option === choice && choice !== correct) button.classList.add("wrong-answer");
  });
  if (choice < 0) message("Time is up.", "Waktu habis.");
  else message(choice === correct ? "Correct +100" : "Incorrect", choice === correct ? "Benar +100" : "Salah");
}
async function submit(choice) {
  if (locked || finished || leaving) return;
  if (skillPending) {
    if (Date.now() - startedMs < QUESTION_MS) return;
    // A Firebase transaction may await reconnection indefinitely. The
    // question still expires at 20 seconds; its timeout save must not await
    // the assist request, or block the next question after that save.
    skillPending = false; skills?.questionTimedOut(); choice = -1;
  }
  if (Date.now() - startedMs >= QUESTION_MS) choice = -1;
  if (choice >= 0 && skills?.eliminatedOptions().includes(choice)) return;
  locked = true; skills?.setLocked(true); clearClock(); lockOptions();
  pending = { room_id: roomId, player_id: playerId, question_index: index, selected_answer: choice,
    response_time_ms: choice < 0 ? QUESTION_MS : Math.max(0, Math.min(QUESTION_MS, Date.now() - startedMs)) };
  await persistAnswer();
}
function results() {
  if (finished) return;
  finished = true; locked = true; clearClock(); unsubscribeRoom?.(); unsubscribeConnection?.();
  skills?.dispose();
  location.replace("leaderboard.html");
}
async function roomHasEnded() {
  if (finished) return true;
  try {
    const result = await live.getRoom(roomId);
    if (!result.error && result.data?.status === "finished") { results(); return true; }
  } catch (error) { /* A failed check must not discard a pending answer. */ }
  return finished;
}
async function persistAnswer() {
  if (saving || !pending || finished || leaving) return;
  saving = true; const savedIndex = pending.question_index;
  message("Saving answer…", "Menyimpan jawaban…");
  try {
    const { data, error } = await live.submitAnswer(roomId, playerId, savedIndex, pending);
    if (error || !data || Number(data.question_index) !== savedIndex || String(data.player_id) !== String(playerId) ||
      !Number.isInteger(Number(data.selected_answer)) || Number(data.selected_answer) < -1 || Number(data.selected_answer) > 3)
      throw error || new Error("Answer save was not confirmed");
    if (savedIndex !== index || finished || leaving) return;
    pending = null;
    skills?.confirmAnswer(data);
    // A retry can return an earlier immutable write after an interrupted reply.
    // Display that persisted choice, never the possibly different local choice.
    showChoice(Number(data.selected_answer));
    await delay(1250); await advance();
  } catch (error) {
    if (!(await roomHasEnded())) showRetry(persistAnswer);
  } finally { saving = false; }
}
async function advance() {
  if (advancing || finished || leaving) return;
  advancing = true; clearClock(); const target = index + 1;
  const stamp = target < questions.length ? new Date().toISOString() : null;
  index = target; startedMs = stamp ? Date.parse(stamp) : 0; saveProgressBestEffort(target, stamp);
  if (index >= questions.length) complete(); else render(); advancing = false;
}
async function restorePlayer() {
  if (finished || leaving) return;
  try {
    const [player, answers] = await Promise.all([live.getPlayer(roomId, playerId), live.listAnswers(roomId, playerId)]);
    if (finished || leaving) return;
    if (player.error || answers.error || !player.data) throw player.error || answers.error || new Error("Player not found");
    if (Number(player.data.current_question) === -1) throw new Error("Player left this quiz");
    // Token checks are independent of the saved-answer session. A slow token
    // read must not delay the first question or grant an unchecked assist.
    skills?.restore(answers.data || []);
    const completed = new Set(TPXQuizScores.uniqueAnswers(answers.data || []).map(answer => Number(answer.question_index)));
    let next = 0; while (completed.has(next) && next < questions.length) next++;
    if (next >= questions.length) { index = next; complete(); return; }
    const previous = Number(player.data.current_question) || 0;
    const existing = next === previous ? player.data.question_started_at : null;
    const valid = existing && Number.isFinite(Date.parse(existing));
    const stamp = valid ? existing : new Date().toISOString(); index = next; startedMs = Date.parse(stamp);
    render(); if (!valid || next !== previous) saveProgressBestEffort(next, stamp);
  } catch (error) {
    if (await roomHasEnded()) return;
    numberEl.textContent = txt("SESSION ERROR", "KESALAHAN SESI");
    questionEl.removeAttribute("data-tpx-no-translate"); questionEl.removeAttribute("data-tpx-user-content");
    questionEl.textContent = txt("Your question could not be loaded.", "Soal belum berhasil dimuat.");
    showRetry(restorePlayer, "Unable to restore your session. Please retry.", "Sesi belum dapat dipulihkan. Silakan coba lagi.");
  }
}
function complete() {
  if (finished || leaving) return;
  finished = true; clearClock(); locked = true;
  skills?.setLocked(true);
  window.TPXHistory?.log("quiz", "Live Quiz", "All questions submitted", location.href,
    { titleEn: "Live Quiz", titleId: "Kuis Langsung", detailEn: "All questions submitted", detailId: "Semua soal terkirim" });
  numberEl.textContent = txt("Quiz Completed", "Kuis Selesai");
  questionEl.removeAttribute("data-tpx-no-translate"); questionEl.removeAttribute("data-tpx-user-content");
  questionEl.textContent = txt("Great work! Your answers have been submitted.", "Kerja bagus! Semua jawaban Anda sudah terkirim.");
  optionsEl.replaceChildren(); message("Opening leaderboard…", "Membuka papan peringkat…");
  setTimeout(() => location.replace("leaderboard.html"), 950);
}
async function initialize() {
  if (!roomId || !playerId || userRole !== "player") {
    if (userRole === "host" && roomId) { location.replace("host-view.html"); return; }
    showRetry(() => location.assign("join.html"), "Join a room to start.", "Masuk ke ruang kuis dahulu."); return;
  }
  if (!live) { showRetry(() => location.reload(), "Quiz connection is unavailable. Reload to try again.", "Koneksi kuis belum tersedia. Muat ulang untuk mencoba lagi."); return; }
  renderPlayerName(); roomEl.textContent = roomCode || "------";
  const { data: room, error } = await live.getRoom(roomId);
  if (finished || leaving) return;
  if (error || !room) { showRetry(initialize, "Unable to load room.", "Ruang kuis gagal dimuat."); return; }
  if (room.status === "finished") { results(); return; }
  if (room.status !== "playing") { location.replace("waiting-room.html"); return; }
  customQuestions = Boolean(room.is_custom); questions = getQuestionsForRoom(room);
  skills?.configure(room);
  if (!questions.length) { message("No questions for this topic.", "Tidak ada soal pada topik ini."); return; }
  unsubscribeRoom?.(); unsubscribeConnection?.();
  unsubscribeRoom = live.watchRoom(roomId, result => {
    if (finished || leaving) return;
    if (result.error) { if (!pending) showRetry(initialize); return; }
    if (result.data?.status === "finished") results();
  });
  unsubscribeConnection = live.watchConnection?.(connected => {
    if (finished || leaving) return;
    if (!connected) message("Connection interrupted. Keep this page open; answers advance after saving.", "Koneksi terputus. Biarkan halaman terbuka; soal berlanjut setelah jawaban tersimpan.");
    else if (!locked) message("Choose one answer before time runs out.", "Pilih satu jawaban sebelum waktu habis.");
  });
  await restorePlayer();
}
initialize().catch(() => showRetry(initialize));
window.addEventListener("beforeunload", () => { clearClock(); skills?.dispose(); unsubscribeRoom?.(); unsubscribeConnection?.(); });
const leave = $("leavePlayBtn");
if (leave) leave.addEventListener("click", async event => {
  event.preventDefault(); if (leaving || finished) return;
  if (skillPending) return;
  leaving = true; clearClock(); locked = true; skills?.setLocked(true); leave.setAttribute("aria-disabled", "true");
  try {
    await progressQueue.catch(() => {});
    const result = await live.markLeft(roomId, playerId);
    if (result.error || !result.data) throw result.error || new Error("Exit was not confirmed");
    finished = true;
    ["playerId", "nickname", "roomId", "roomCode", "roomTopic", "userRole"].forEach(key => sessionStorage.removeItem(key));
    location.href = "../index.html#quiz";
  } catch (error) {
    leaving = false;
    if (await roomHasEnded()) return;
    if (pending && saving) message("Unable to leave. Your answer is still saving; keep this page open or try leaving again.", "Belum berhasil keluar. Jawaban masih disimpan; biarkan halaman terbuka atau coba keluar kembali.");
    else if (pending) showRetry(persistAnswer, "Failed to leave. Your answer is kept; retry saving or leaving.", "Gagal keluar. Jawaban tetap tersimpan sementara; coba simpan atau keluar kembali.");
    else {
      message("Failed to leave. Please retry.", "Gagal keluar. Silakan coba lagi.");
      locked = false; skills?.setLocked(false); refreshClock(); if (!locked) tick = setInterval(refreshClock, 200);
    }
  } finally { leaving = false; leave.setAttribute("aria-disabled", "false"); }
});
