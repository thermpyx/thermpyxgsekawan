/* Firebase subscriptions deliver changes without repeatedly downloading the room. */
"use strict";
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const hostControls = document.getElementById("hostControls");
const startQuizBtn = document.getElementById("startQuizBtn");
const playerWaitingText = document.getElementById("playerWaitingText");
const roomStatusText = document.getElementById("roomStatusText");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const roomId = sessionStorage.getItem("roomId"), roomCode = sessionStorage.getItem("roomCode");
const userRole = sessionStorage.getItem("userRole");
const live = window.TPXLive;
const waitingText = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
let unsubscribeRoom = null, unsubscribePlayers = null, unsubscribeConnection = null;
let redirectingToQuiz = false, starting = false, leaving = false;
let roomState = "", players = [], playersKnown = false, statusMessage = ["", ""], playerLoadError = false;
let connected = true, syncError = false;
roomStatusText.setAttribute("role", "status");
roomStatusText.setAttribute("aria-live", "polite");
function status(en, id) {
  statusMessage = [en, id];
  renderStatus();
}
function renderStatus() {
  roomStatusText.textContent = waitingText(...statusMessage);
  if (!connected && !redirectingToQuiz) roomStatusText.textContent = waitingText(
    "Connection interrupted. Your room is kept; updates resume when connected.",
    "Koneksi terputus. Ruang tetap tersimpan; pembaruan berlanjut saat terhubung.");
  if (syncError && connected && !redirectingToQuiz) {
    roomStatusText.textContent = waitingText("Unable to sync this room. ", "Ruang belum berhasil disinkronkan. ");
    const retry = document.createElement("button");
    retry.type = "button"; retry.className = "play-retry";
    retry.textContent = waitingText("RETRY", "COBA LAGI");
    retry.addEventListener("click", () => { syncError = false; startWatching(); });
    roomStatusText.append(retry);
  }
}
function updateControls() {
  startQuizBtn.disabled = userRole !== "host" || roomState !== "waiting" || !playersKnown ||
    !players.length || !connected || syncError || starting || leaving || redirectingToQuiz;
  startQuizBtn.textContent = starting ? waitingText("STARTING…", "MEMULAI…") :
    redirectingToQuiz && roomState === "playing" ? waitingText("QUIZ STARTED", "KUIS DIMULAI") : waitingText("START QUIZ", "MULAI KUIS");
  leaveRoomBtn?.setAttribute("aria-disabled", String(leaving || starting || redirectingToQuiz));
}
function renderPlayers() {
  if (!playersKnown) {
    playerList.textContent = playerLoadError ? waitingText("Unable to load players. Retry the connection.", "Daftar peserta belum dimuat. Coba sambungkan kembali.") :
      waitingText("Loading players…", "Memuat peserta…");
    return;
  }
  playerList.replaceChildren();
  if (!players.length) {
    const empty = document.createElement("p");
    empty.textContent = waitingText("No players joined yet.", "Belum ada peserta yang bergabung.");
    playerList.append(empty);
  }
  for (const [index, player] of players.entries()) {
    const row = document.createElement("div"); row.className = "player-item";
    const number = document.createElement("span"); number.className = "player-number"; number.textContent = `${index + 1}.`;
    const name = document.createElement("span"); name.className = "player-name";
    name.setAttribute("data-tpx-no-translate", ""); name.setAttribute("data-tpx-user-content", "");
    name.textContent = player.nickname;
    row.append(number, name); playerList.append(row);
  }
}
function applyRoomState(next) {
  if (leaving || redirectingToQuiz) return;
  roomState = next;
  if (next === "finished") {
    status("This session has ended. Opening the results…", "Sesi sudah berakhir. Membuka hasil…");
    navigateToQuiz("leaderboard.html");
  } else if (next === "playing") {
    status("The quiz is starting…", "Kuis akan dimulai…");
    navigateToQuiz(userRole === "host" ? "host-view.html" : "play.html");
  } else {
    status("Waiting for the host to start.", "Menunggu host memulai kuis.");
    updateControls();
  }
}
function stopWatching() {
  unsubscribeRoom?.(); unsubscribePlayers?.();
  unsubscribeRoom = unsubscribePlayers = null;
}
function navigateToQuiz(destination) {
  if (redirectingToQuiz) return;
  redirectingToQuiz = true; updateControls(); stopWatching();
  setTimeout(() => { window.location.href = destination; }, 700);
}
function watchError() {
  syncError = true; renderStatus(); updateControls();
}
function startWatching() {
  stopWatching();
  if (!live || leaving || redirectingToQuiz) return;
  status("Connecting to the room…", "Menghubungkan ke ruang…");
  unsubscribePlayers = live.watchPlayers(roomId, result => {
    if (leaving || redirectingToQuiz) return;
    if (result.error) { playerLoadError = true; renderPlayers(); watchError(); return; }
    players = result.data || []; playersKnown = true; playerLoadError = false;
    renderPlayers(); updateControls();
  });
  unsubscribeRoom = live.watchRoom(roomId, result => {
    if (leaving || redirectingToQuiz) return;
    if (result.error || !result.data) { roomState = ""; watchError(); return; }
    applyRoomState(result.data.status);
  });
}
async function startQuiz() {
  if (userRole !== "host" || starting || leaving || redirectingToQuiz || roomState !== "waiting" || !players.length || !connected) return;
  starting = true; updateControls(); status("Starting the quiz…", "Memulai kuis…");
  try {
    const { data, error } = await live.setRoomStatus(roomId, "waiting", "playing");
    if (error || !data) throw error || new Error("Room start was not confirmed");
    applyRoomState(data.status);
  } catch (error) {
    status("Unable to start the quiz. Please try again.", "Kuis belum berhasil dimulai. Silakan coba lagi.");
  } finally { starting = false; updateControls(); }
}
async function leaveRoom(event) {
  event.preventDefault();
  if (leaving || starting || redirectingToQuiz) return;
  if (!live) { status("No connection. Please retry before leaving.", "Koneksi belum tersedia. Coba lagi sebelum keluar."); return; }
  leaving = true; updateControls(); status("Leaving the room…", "Keluar dari ruang…");
  try {
    const playerId = sessionStorage.getItem("playerId");
    if (userRole !== "host" && !playerId) throw new Error("Player session not found");
    const result = userRole === "host"
      ? await live.setRoomStatus(roomId, "waiting", "finished")
      : await live.leaveWaitingRoom(roomId, playerId);
    if (result.error || !result.data) throw result.error || new Error("Exit was not confirmed");
    for (const key of ["roomId", "roomCode", "roomTopic", "playerId", "nickname", "userRole"]) sessionStorage.removeItem(key);
    stopWatching(); redirectingToQuiz = true; window.location.href = "../index.html#quiz";
  } catch (error) {
    status("Unable to leave safely. Your session is kept; please try again.", "Belum berhasil keluar. Sesi tetap tersimpan; silakan coba lagi.");
  } finally { leaving = false; updateControls(); }
}
startQuizBtn.addEventListener("click", startQuiz);
leaveRoomBtn?.addEventListener("click", leaveRoom);
window.addEventListener("thermpyx:languagechange", () => {
  renderPlayers(); updateControls(); renderStatus();
  playerWaitingText.textContent = waitingText("Waiting for the host to start the quiz…", "Menunggu host memulai kuis…");
});
window.addEventListener("beforeunload", () => { stopWatching(); unsubscribeConnection?.(); });
if (!roomId || !roomCode || !["host", "player"].includes(userRole)) {
  status("Room session not found. Please join again.", "Sesi ruang tidak ditemukan. Silakan bergabung kembali.");
  startQuizBtn.disabled = true; window.location.replace("join.html");
} else {
  roomCodeDisplay.textContent = roomCode;
  hostControls.style.display = userRole === "host" ? "block" : "none";
  playerWaitingText.style.display = userRole === "host" ? "none" : "block";
  updateControls();
  if (!live) status("Quiz connection is unavailable. Reload after checking your connection.", "Koneksi kuis belum tersedia. Periksa koneksi lalu muat ulang.");
  else {
    startWatching();
    unsubscribeConnection = live.watchConnection?.(value => {
      const wasConnected = connected; connected = value;
      if (!wasConnected && connected && syncError) { syncError = false; startWatching(); }
      renderStatus(); updateControls();
    });
  }
}
