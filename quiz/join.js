const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCode");
const nicknameInput = document.getElementById("nickname");

joinRoomBtn.addEventListener("click", async () => {
    const roomCode = roomCodeInput.value.trim();
    const nickname = nicknameInput.value.trim();

    // Validasi sederhana
    if (roomCode === "") {
        alert("Please enter a room code.");
        return;
    }

    if (nickname === "") {
        alert("Please enter your nickname.");
        return;
    }

    if (roomCode.length !== 6) {
        alert("Room code must contain 6 digits.");
        return;
    }

    // Cari room berdasarkan room code
    const { data: room, error: roomError } = await supabaseClient
        .from("quiz_rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

    if (roomError || !room) {
        console.error("Room error:", roomError);
        alert("Room not found.");
        return;
    }

    // Pastikan room masih menerima pemain
    if (room.status !== "waiting") {
        alert("This quiz has already started or finished.");
        return;
    }

    // Masukkan pemain ke database
    const { data: player, error: playerError } = await supabaseClient
    .from("quiz_players")
    .insert({
        room_id: room.id,
        nickname: nickname,
        score: 0,
        current_question: 0,
        question_started_at: null
    })
    .select()
    .single();

    if (playerError) {
        console.error("Join error:", playerError);

        if (playerError.code === "23505") {
            alert("This nickname is already used in this room.");
        } else {
            alert("Failed to join room.");
        }

        return;
    }

    console.log("Player joined:", player);

    // Simpan sementara agar halaman berikutnya tahu siapa pemainnya
    sessionStorage.setItem("roomId", room.id);
    sessionStorage.setItem("roomCode", room.room_code);
    sessionStorage.setItem("playerId", player.id);
    sessionStorage.setItem("nickname", player.nickname);

    sessionStorage.setItem(
    "userRole",
    "player"
);

    window.location.href = "waiting-room.html";
});