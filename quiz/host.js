"use strict";
const createRoomBtn = document.getElementById("createRoomBtn");
const hostCreateMessage = document.getElementById("hostCreateMessage");
const pendingKey = "thermpyx:pending-room:v1";
let pendingRoom = null, creatingRoom = false;
function roomNotice(message, error = false) {
    hostCreateMessage.textContent = message;
    hostCreateMessage.classList.toggle("is-error", error);
}
function savePendingRoom() {
    try {
        if (pendingRoom) sessionStorage.setItem(pendingKey, JSON.stringify(pendingRoom));
        else sessionStorage.removeItem(pendingKey);
    } catch (error) { console.warn("Pending room could not be stored locally."); }
}
function newRoomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
function isMissingQuestionSchema(error) {
    return error?.code === "42703" || error?.code === "PGRST204" || /custom_questions.*(column|schema)|column.*custom_questions/i.test(error?.message || "");
}
function isNetworkFailure(error) {
    return !error?.code || /fetch|network|connection|timeout/i.test(error.message || "");
}
function sameRoomQuestions(room, payload) {
    if (room.topic !== payload.topic) return false;
    if (!payload.custom_questions) return room.custom_questions == null;
    try { return JSON.stringify(TPXQuizQuestions.getQuestionsForRoom(room)) === JSON.stringify(payload.custom_questions); }
    catch (error) { return false; }
}
function enterCreatedRoom(room) {
    sessionStorage.setItem("roomId", room.id);
    sessionStorage.setItem("roomCode", room.room_code);
    sessionStorage.setItem("roomTopic", room.custom_questions ? "custom" : room.topic);
    sessionStorage.setItem("userRole", "host");
    sessionStorage.removeItem("playerId");
    sessionStorage.removeItem("nickname");
    pendingRoom = null;
    savePendingRoom();
    window.location.href = "waiting-room.html";
}
async function findPendingRoom() {
    const { data, error } = await supabaseClient.from("quiz_rooms").select("*").eq("room_code", pendingRoom.payload.room_code).single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    if (!sameRoomQuestions(data, pendingRoom.payload)) throw Object.assign(new Error("Kode ruang sudah digunakan. Muat ulang dan coba membuat ruang baru."), { code: "ROOM_CODE_CONFLICT" });
    return data;
}
async function createRoom() {
    if (creatingRoom) return;
    try {
        if (!pendingRoom) {
            const selection = TPXCustomQuizEditor.getPayload();
            pendingRoom = { version: 1, payload: { ...selection, room_code: newRoomCode(), status: "waiting" }, uncertain: false };
            savePendingRoom();
        }
    } catch (error) { roomNotice(error.message, true); return; }
    creatingRoom = true;
    createRoomBtn.disabled = true;
    createRoomBtn.textContent = "MEMBUAT RUANG...";
    TPXCustomQuizEditor.setDisabled(true);
    roomNotice("Menghubungkan ke ruang latihan...");
    try {
        if (typeof supabaseClient === "undefined") throw new Error("Layanan kuis belum termuat. Periksa koneksi internet, lalu coba lagi.");
        if (pendingRoom.uncertain) {
            const previous = await findPendingRoom();
            if (previous) { enterCreatedRoom(previous); return; }
        }
        let room = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = await supabaseClient.from("quiz_rooms").insert(pendingRoom.payload).select().single();
            if (!result.error) { room = result.data; break; }
            if (result.error.code === "23505" && !pendingRoom.uncertain) {
                pendingRoom.payload.room_code = newRoomCode();
                savePendingRoom();
                continue;
            }
            throw result.error;
        }
        if (!room) throw Object.assign(new Error("Kode ruang belum tersedia. Silakan coba lagi."), { code: "ROOM_CODE_CONFLICT" });
        enterCreatedRoom(room);
    } catch (error) {
        console.error("CREATE ROOM FAILED:", error?.code || "network", error?.message || "Unknown error");
        if (isMissingQuestionSchema(error) && pendingRoom.payload.custom_questions) {
            pendingRoom = null;
            savePendingRoom();
            TPXCustomQuizEditor.setDisabled(false);
            roomNotice("Soal sendiri memerlukan pembaruan Supabase. Jalankan SUPABASE_CUSTOM_QUIZ.sql di SQL Editor, lalu coba lagi. Draf pertanyaan Anda tetap tersimpan.", true);
            createRoomBtn.textContent = "COBA BUAT RUANG LAGI";
        } else if (!isNetworkFailure(error)) {
            pendingRoom = null;
            savePendingRoom();
            TPXCustomQuizEditor.setDisabled(false);
            roomNotice(error.code === "42501" ? "Izin membuat ruang belum tersedia di Supabase. Minta pengelola memeriksa kebijakan quiz_rooms. Draf tetap tersimpan." : "Ruang gagal dibuat. Periksa konfigurasi Supabase dan coba lagi. Draf tetap tersimpan.", true);
            createRoomBtn.textContent = "COBA BUAT RUANG LAGI";
        } else {
            pendingRoom.uncertain = true;
            savePendingRoom();
            roomNotice("Koneksi terputus. Klik Coba lagi untuk memeriksa ruang yang sama sebelum mengirim ulang. Draf tetap tersimpan.", true);
            createRoomBtn.textContent = "COBA LAGI";
        }
    } finally {
        creatingRoom = false;
        createRoomBtn.disabled = false;
    }
}
try {
    const saved = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
    if (saved?.version === 1 && /^\d{6}$/.test(saved.payload?.room_code) && ["heat", "work", "first-law", "process", "all"].includes(saved.payload.topic)) {
        if (saved.payload.custom_questions) saved.payload.custom_questions = TPXQuizQuestions.validateQuestions(saved.payload.custom_questions);
        pendingRoom = { version: 1, payload: { room_code: saved.payload.room_code, topic: saved.payload.topic, status: "waiting", ...(saved.payload.custom_questions ? { custom_questions: saved.payload.custom_questions } : {}) }, uncertain: true };
        TPXCustomQuizEditor.setDisabled(true);
        createRoomBtn.textContent = "LANJUTKAN PEMBUATAN RUANG";
        roomNotice("Pembuatan ruang sebelumnya belum terkonfirmasi. Lanjutkan untuk memeriksa hasilnya tanpa mengubah soal.");
    }
} catch (error) { sessionStorage.removeItem(pendingKey); }
createRoomBtn.addEventListener("click", createRoom);
