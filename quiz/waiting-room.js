/* Realtime updates have a polling fallback; mutations retain the session on failure. */
"use strict";
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const hostControls = document.getElementById("hostControls");
const startQuizBtn = document.getElementById("startQuizBtn");
const playerWaitingText = document.getElementById("playerWaitingText");
const roomStatusText = document.getElementById("roomStatusText");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const roomId = sessionStorage.getItem("roomId");
const roomCode = sessionStorage.getItem("roomCode");
const userRole = sessionStorage.getItem("userRole");
const db = typeof supabaseClient !== "undefined" ? supabaseClient : null;
const waitingText = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
let playersChannel = null, roomChannel = null, polling = null;
let redirectingToQuiz = false, starting = false, leaving = false, roomLoading = false, playersLoading = false;
let roomState = "", players = [], playersKnown = false, statusMessage = ["", ""], playerLoadError = false;
roomStatusText.setAttribute("role", "status");
roomStatusText.setAttribute("aria-live", "polite");
function status(en, id) {
  statusMessage = [en, id];
  roomStatusText.textContent = waitingText(en, id);
}
function updateControls() {
  startQuizBtn.disabled = userRole !== "host" || roomState !== "waiting" || !playersKnown ||
    !players.length || starting || leaving || redirectingToQuiz;
  startQuizBtn.textContent = starting ? waitingText("STARTING…", "MEMULAI…") :
    redirectingToQuiz && roomState === "playing" ? waitingText("QUIZ STARTED", "KUIS DIMULAI") : waitingText("START QUIZ", "MULAI KUIS");
  leaveRoomBtn?.setAttribute("aria-disabled", String(leaving || starting || redirectingToQuiz));
}
function renderPlayers() {
  if (!playersKnown) {
    playerList.textContent = playerLoadError ? waitingText("Unable to load players. Reconnecting…", "Daftar peserta belum dimuat. Menghubungkan kembali…") :
      waitingText("Loading players…", "Memuat peserta…");
    return;
  }
  playerList.replaceChildren();
  if (!players.length) {
    const empty = document.createElement("p");
    empty.textContent = waitingText("No players joined yet.", "Belum ada peserta yang bergabung.");
    playerList.appendChild(empty);
  }
  for (const [index, player] of players.entries()) {
    const row = document.createElement("div"); row.className = "player-item";
    const number = document.createElement("span"); number.className = "player-number"; number.textContent = `${index + 1}.`;
    const name = document.createElement("span"); name.className = "player-name";
    name.setAttribute("data-tpx-no-translate", ""); name.setAttribute("data-tpx-user-content", "");
    name.textContent = player.nickname;
    row.append(number, name); playerList.appendChild(row);
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
function navigateToQuiz(destination) {
  if (redirectingToQuiz) return;
  redirectingToQuiz = true;
  updateControls();
  if (polling) clearInterval(polling);
  setTimeout(() => {window.location.href = destination;}, 700);
}
async function loadPlayers() {
  if (!db || playersLoading || leaving || redirectingToQuiz) return;
  playersLoading = true;
  try {
    const {data, error} = await db.from("quiz_players").select("id,nickname,joined_at")
      .eq("room_id", roomId).order("joined_at", {ascending: true});
    if (error) throw error;
    players = data || []; playersKnown = true; playerLoadError = false;
    renderPlayers();
  } catch (error) {
    console.error("WAITING PLAYERS:", error);
    playerLoadError = true;
    if (!playersKnown) renderPlayers();
  } finally {playersLoading = false; updateControls();}
}
async function loadRoom() {
  if (!db || roomLoading || leaving || redirectingToQuiz) return;
  roomLoading = true;
  try {
    const {data, error} = await db.from("quiz_rooms").select("id,status")
      .eq("id", roomId).single();
    if (error || !data) throw error || new Error("Room not found");
    applyRoomState(data.status);
  } catch (error) {
    console.error("WAITING ROOM:", error);
    roomState = "";
    status("Unable to load this room. Reconnecting…", "Ruang belum berhasil dimuat. Menghubungkan kembali…");
    updateControls();
  } finally {roomLoading = false;}
}
async function startQuiz() {
  if (userRole !== "host" || starting || leaving || redirectingToQuiz || roomState !== "waiting" || !players.length) return;
  starting = true; updateControls();
  status("Starting the quiz…", "Memulai kuis…");
  try {
    const {data, error} = await db.from("quiz_rooms")
      .update({status: "playing", current_question: 0, question_started_at: new Date().toISOString()})
      .eq("id", roomId).eq("status", "waiting").select("id");
    if (error) throw error;
    if (data?.length) applyRoomState("playing");
    else {
      await loadRoom();
      if (!redirectingToQuiz) status("The room was not started. Check host access and try again.", "Ruang belum dimulai. Periksa akses host lalu coba lagi.");
    }
  } catch (error) {
    console.error("START QUIZ:", error);
    status("Unable to start the quiz. Please try again.", "Kuis belum berhasil dimulai. Silakan coba lagi.");
  } finally {starting = false; updateControls();}
}
async function leaveRoom(event) {
  event.preventDefault();
  if (leaving || starting || redirectingToQuiz) return;
  if (!db) {status("No connection. Please retry before leaving.", "Koneksi belum tersedia. Coba lagi sebelum keluar."); return;}
  leaving = true; updateControls();
  status("Leaving the room…", "Keluar dari ruang…");
  try {
    if (userRole === "host") {
      // Keep the room and participants so results remain available.
      const {data, error} = await db.from("quiz_rooms").update({status: "finished"})
        .eq("id", roomId).eq("status", "waiting").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Room closure was not confirmed");
    } else {
      const playerId = sessionStorage.getItem("playerId");
      if (!playerId) throw new Error("Player session not found");
      // PostgREST accepts both integer IDs and UUIDs as filter strings.
      const {data, error} = await db.from("quiz_players").delete()
        .eq("id", playerId).eq("room_id", roomId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Player exit was not confirmed");
    }
    for (const key of ["roomId", "roomCode", "roomTopic", "playerId", "nickname", "userRole"]) sessionStorage.removeItem(key);
    if (polling) clearInterval(polling);
    redirectingToQuiz = true;
    window.location.href = "../index.html#quiz";
  } catch (error) {
    console.error("LEAVE WAITING ROOM:", error);
    status("Unable to leave safely. Your session is kept; please try again.", "Belum berhasil keluar. Sesi tetap tersimpan; silakan coba lagi.");
  } finally {leaving = false; updateControls();}
}
startQuizBtn.addEventListener("click", startQuiz);
leaveRoomBtn?.addEventListener("click", leaveRoom);
window.addEventListener("thermpyx:languagechange", () => {
  renderPlayers(); updateControls(); roomStatusText.textContent = waitingText(...statusMessage);
  playerWaitingText.textContent = waitingText("Waiting for the host to start the quiz…", "Menunggu host memulai kuis…");
});
window.addEventListener("beforeunload", () => {
  if (polling) clearInterval(polling);
  if (playersChannel) db.removeChannel(playersChannel);
  if (roomChannel) db.removeChannel(roomChannel);
});
if (!roomId || !roomCode || !["host", "player"].includes(userRole)) {
  status("Room session not found. Please join again.", "Sesi ruang tidak ditemukan. Silakan bergabung kembali.");
  startQuizBtn.disabled = true;
  window.location.replace("join.html");
} else {
  roomCodeDisplay.textContent = roomCode;
  hostControls.style.display = userRole === "host" ? "block" : "none";
  playerWaitingText.style.display = userRole === "host" ? "none" : "block";
  updateControls();
  if (!db) status("Quiz connection is unavailable. Reload after checking your connection.", "Koneksi kuis belum tersedia. Periksa koneksi lalu muat ulang.");
  else {
    loadPlayers(); loadRoom();
    try {
      playersChannel = db.channel(`waiting-players-${roomId}`).on("postgres_changes",
        {event: "*", schema: "public", table: "quiz_players", filter: `room_id=eq.${roomId}`}, loadPlayers).subscribe();
      roomChannel = db.channel(`waiting-room-${roomId}`).on("postgres_changes",
        {event: "UPDATE", schema: "public", table: "quiz_rooms", filter: `id=eq.${roomId}`}, payload => applyRoomState(payload.new.status)).subscribe();
    } catch (error) {console.warn("WAITING REALTIME: polling will reconnect", error);}
    polling = setInterval(() => {loadRoom(); loadPlayers();}, 3000);
  }
}
