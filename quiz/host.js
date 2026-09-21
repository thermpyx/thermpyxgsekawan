const createRoomBtn = document.getElementById("createRoomBtn");
const topicSelect = document.getElementById("topic");

createRoomBtn.addEventListener("click", async () => {

    const topic = topicSelect.value;

    // Mencegah tombol diklik berkali-kali
    createRoomBtn.disabled = true;
    createRoomBtn.textContent = "Creating Room...";

    const roomCode = Math.floor(
        100000 + Math.random() * 900000
    ).toString();


    const { data: room, error } = await supabaseClient
        .from("quiz_rooms")
        .insert({
            room_code: roomCode,
            topic: topic,
            status: "waiting"
        })
        .select()
        .single();


    if (error) {

        console.error(
            "Create room error:",
            error
        );

        alert("Failed to create room.");

        createRoomBtn.disabled = false;
        createRoomBtn.textContent = "Create Room";

        return;
    }


    console.log(
        "Room created:",
        room
    );


    // Simpan informasi room di browser host
    sessionStorage.setItem(
        "roomId",
        room.id
    );

    sessionStorage.setItem(
        "roomCode",
        room.room_code
    );

    sessionStorage.setItem(
        "roomTopic",
        room.topic
    );

    sessionStorage.setItem(
        "userRole",
        "host"
    );


    // Masuk ke Waiting Room
    window.location.href =
        "waiting-room.html";
});