/* Joining is one request at a time; a connection failure leaves the form editable. */
"use strict";
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCode");
const nicknameInput = document.getElementById("nickname");
const joinStatus = document.getElementById("joinStatus") || document.createElement("p");
joinStatus.id = "joinStatus";
joinStatus.className = "live-field-hint";
joinStatus.setAttribute("role", "status");
joinStatus.setAttribute("aria-live", "polite");
joinStatus.setAttribute("aria-atomic", "true");
if (!joinStatus.parentNode) joinRoomBtn.insertAdjacentElement("afterend", joinStatus);
const joinText = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
let joining = false, joined = false, joinMessage = ["", ""];
function renderJoinState() {
  joinRoomBtn.disabled = joining || joined;
  joinRoomBtn.textContent = joining ? joinText("JOINING…", "BERGABUNG…") : joinText("JOIN QUIZ", "MASUK KUIS");
  joinStatus.textContent = joinText(...joinMessage);
}
function reportJoin(en, id) {
  joinMessage = [en, id];
  renderJoinState();
}
async function joinRoom() {
  if (joining || joined) return;
  const roomCode = roomCodeInput.value.trim();
  const nickname = nicknameInput.value.trim();
  if (!/^\d{6}$/.test(roomCode)) {
    reportJoin("Enter the six-digit room code from your host.", "Masukkan kode ruang enam digit dari host.");
    roomCodeInput.focus();
    return;
  }
  if (!nickname || nickname.length > 30) {
    reportJoin("Enter a nickname of 1–30 characters.", "Isi nama panggilan sepanjang 1–30 karakter.");
    nicknameInput.focus();
    return;
  }
  const live = window.TPXLive;
  if (!live) {
    reportJoin("Quiz connection is unavailable. Check your connection and try again.", "Koneksi kuis belum tersedia. Periksa koneksi lalu coba lagi.");
    return;
  }
  joining = true;
  reportJoin("Checking your room…", "Memeriksa ruang kuis…");
  try {
    const result = await live.joinRoom(roomCode, nickname);
    if (result.error) {
      const code = result.error.code;
      if (["quiz/room-not-found", "room-not-found", "ROOM_NOT_FOUND", "not-found"].includes(code)) {
        reportJoin("Room not found. Check the code with your host.", "Ruang tidak ditemukan. Periksa kembali kode dengan host.");
        return;
      }
      if (["quiz/room-not-waiting", "room-closed", "ROOM_CLOSED", "room-started"].includes(code)) {
        reportJoin("This quiz has already started or finished. Ask your host for a new room.", "Kuis sudah dimulai atau selesai. Minta ruang baru kepada host.");
        return;
      }
      if (["quiz/nickname-taken", "nickname-taken", "NICKNAME_TAKEN"].includes(code)) {
        reportJoin("This nickname is already used in the room. Choose another name.", "Nama panggilan sudah dipakai di ruang ini. Gunakan nama lain.");
        nicknameInput.focus();
        return;
      }
      if (result.error.messageEn && result.error.messageId) {
        reportJoin(result.error.messageEn, result.error.messageId);
        return;
      }
      throw result.error;
    }
    const { room, player } = result.data || {};
    if (!room?.id || !player?.id || !room.room_code) throw new Error("Join was not confirmed");
    sessionStorage.setItem("roomId", room.id);
    sessionStorage.setItem("roomCode", room.room_code);
    sessionStorage.setItem("playerId", player.id);
    sessionStorage.setItem("nickname", player.nickname);
    sessionStorage.setItem("userRole", "player");
    joined = true;
    reportJoin("You have joined. Opening the waiting room…", "Anda berhasil bergabung. Membuka ruang tunggu…");
    window.location.href = "waiting-room.html";
  } catch (error) {
    // Show a safe translated message; never expose authentication diagnostics.
    reportJoin("Unable to join. Check your connection and try again.", "Belum berhasil bergabung. Periksa koneksi lalu coba lagi.");
  } finally {
    joining = false;
    renderJoinState();
  }
}
joinRoomBtn.addEventListener("click", joinRoom);
for (const input of [roomCodeInput, nicknameInput]) input.addEventListener("keydown", event => {
  if (event.key === "Enter") {event.preventDefault(); joinRoom();}
});
window.addEventListener("thermpyx:languagechange", renderJoinState);
