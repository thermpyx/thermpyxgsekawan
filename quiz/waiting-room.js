// ======================================================
// THERMPYX WAITING ROOM
// ======================================================


// ======================================================
// ELEMENTS
// ======================================================

const roomCodeDisplay =
    document.getElementById("roomCodeDisplay");

const playerList =
    document.getElementById("playerList");

const hostControls =
    document.getElementById("hostControls");

const startQuizBtn =
    document.getElementById("startQuizBtn");

const playerWaitingText =
    document.getElementById("playerWaitingText");

const roomStatusText =
    document.getElementById("roomStatusText");


// ======================================================
// SESSION
// ======================================================

const roomId =
    sessionStorage.getItem("roomId");

const roomCode =
    sessionStorage.getItem("roomCode");

const userRole =
    sessionStorage.getItem("userRole");


// ======================================================
// REALTIME
// ======================================================

let playersChannel = null;
let roomChannel = null;

let redirectingToQuiz = false;


// ======================================================
// START
// ======================================================

if (!roomId || !roomCode) {

    alert("Room information not found.");

    window.location.href =
        "join.html";
} else {

    roomCodeDisplay.textContent =
        roomCode;

    setupInterface();

    loadPlayers();

    loadRoom();

    subscribeToPlayers();

    subscribeToRoom();
    const polling = setInterval(() => {
        if (redirectingToQuiz) { clearInterval(polling); return; }
        loadRoom();
        loadPlayers();
    }, 3000);
    window.addEventListener("beforeunload", () => clearInterval(polling));

}


// ======================================================
// HOST / PLAYER INTERFACE
// ======================================================

function setupInterface() {

    if (userRole === "host") {

        hostControls.style.display =
            "block";

        playerWaitingText.style.display =
            "none";

    } else {

        hostControls.style.display =
            "none";

        playerWaitingText.style.display =
            "block";

    }

}


// ======================================================
// LOAD PLAYERS
// ======================================================

async function loadPlayers() {

    playerList.innerHTML =
        "<p>Loading players...</p>";


    const { data: players, error } =
        await supabaseClient
            .from("quiz_players")
            .select("*")
            .eq(
                "room_id",
                roomId
            )
            .order(
                "joined_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Failed to load players:",
            error
        );

        playerList.innerHTML =
            "<p>Failed to load players.</p>";

        return;

    }


    if (!players || players.length === 0) {

        playerList.innerHTML =
            "<p>No players joined yet.</p>";

        if (
            userRole === "host" &&
            startQuizBtn
        ) {

            startQuizBtn.disabled =
                true;

        }

        return;

    }


    playerList.innerHTML = "";


    players.forEach(
        (player, index) => {

            const playerElement =
                document.createElement("div");

            playerElement.classList.add(
                "player-item"
            );


            const playerNumber =
                document.createElement("span");

            playerNumber.classList.add(
                "player-number"
            );

            playerNumber.textContent =
                `${index + 1}.`;


            const playerName =
                document.createElement("span");

            playerName.classList.add(
                "player-name"
            );

            playerName.textContent =
                player.nickname;


            playerElement.appendChild(
                playerNumber
            );

            playerElement.appendChild(
                playerName
            );

            playerList.appendChild(
                playerElement
            );

        }
    );


    if (
        userRole === "host" &&
        startQuizBtn
    ) {

        startQuizBtn.disabled =
            false;

    }

}


// ======================================================
// LOAD ROOM
// ======================================================

async function loadRoom() {

    const { data: room, error } =
        await supabaseClient
            .from("quiz_rooms")
            .select(
                "id, status, topic, current_question"
            )
            .eq(
                "id",
                roomId
            )
            .single();


    if (error) {

        console.error(
            "Failed to load room:",
            error
        );

        roomStatusText.textContent =
            "Unable to load room.";

        return;

    }


    roomStatusText.textContent =
        `Status: ${room.status}`;


    if (room.status === "playing") {

        handleQuizStarted();

    }

}


// ======================================================
// START QUIZ
// ======================================================

if (startQuizBtn) {

    startQuizBtn.addEventListener(
        "click",
        async () => {

            if (userRole !== "host") {
                return;
            }


            startQuizBtn.disabled =
                true;

            startQuizBtn.textContent =
                "Starting Quiz...";


            const startedAt =
                new Date().toISOString();


            const { data: startedRows, error } =
                await supabaseClient
                    .from("quiz_rooms")
                    .update({

                        status:
                            "playing",

                        current_question:
                            0,

                        question_started_at:
                            startedAt

                    })
                    .eq(
                        "id",
                        roomId
                    )
                    .eq("status", "waiting")
                    .select("id");


            if (error) {

                console.error(
                    "Failed to start quiz:",
                    error
                );

                alert(
                    "Failed to start quiz."
                );

                startQuizBtn.disabled =
                    false;

                startQuizBtn.textContent =
                    "Start Quiz";

                return;

            }

            if (!startedRows || startedRows.length === 0) {
                // Another host tab may have started/finished this room. Read the actual state.
                await loadRoom();
                return;
            }
            // Do not rely solely on realtime to redirect the host.
            handleQuizStarted();

        }
    );

}


/// ======================================================
// REALTIME PLAYERS
// ======================================================
function subscribeToPlayers(){
    playersChannel = supabaseClient
        .channel(
            `waiting-players-${roomId}`
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "quiz_players",
                
            },
            (payload)=>{
                console.log(
                    "PLAYER REALTIME EVENT:",
                    payload.eventType
                );
                loadPlayers();
            }
        )
        .subscribe(
            (status)=>{

                console.log(
                    "Players realtime:",
                    status
                );
            }
        );
}
// ======================================================
// REALTIME ROOM
// ======================================================

function subscribeToRoom() {

    roomChannel =
        supabaseClient
            .channel(
                `waiting-room-${roomId}`
            )

            .on(
                "postgres_changes",

                {
                    event:
                        "UPDATE",

                    schema:
                        "public",

                    table:
                        "quiz_rooms",

                    filter:
                        `id=eq.${roomId}`
                },

                (payload) => {

                    roomStatusText.textContent =
                        `Status: ${payload.new.status}`;


                    if (
                        payload.new.status ===
                        "playing"
                    ) {

                        handleQuizStarted();

                    }

                }
            )

            .subscribe(
                (status) => {

                    console.log(
                        "Room realtime:",
                        status
                    );

                }
            );

}


// ======================================================
// QUIZ STARTED
// ======================================================

function handleQuizStarted() {

    if (redirectingToQuiz) {
        return;
    }


    redirectingToQuiz = true;


    roomStatusText.textContent =
        "Status: playing";


    if (userRole === "host") {

        startQuizBtn.disabled =
            true;

        startQuizBtn.textContent =
            "Quiz Started";

    } else {

        playerWaitingText.textContent =
            "Quiz is starting...";

    }


    setTimeout(
        () => {

            window.location.href =
                userRole === "host" ? "host-view.html" : "play.html";

        },
        700
    );

}


// ======================================================
// CLEANUP
// ======================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (playersChannel) {

            supabaseClient.removeChannel(
                playersChannel
            );

        }


        if (roomChannel) {

            supabaseClient.removeChannel(
                roomChannel
            );

        }

    }
);
// ======================================================
// PLAYER LEAVE WAITING ROOM
// ======================================================

const leaveRoomBtn = document.getElementById(
    "leaveRoomBtn"
);


if (leaveRoomBtn) {

    leaveRoomBtn.addEventListener(
        "click",
        async function(event) {

            event.preventDefault();

            console.log(
                "LEAVING WAITING ROOM..."
            );


            const playerId =
                sessionStorage.getItem(
                    "playerId"
                );


            console.log(
                "PLAYER ID:",
                playerId
            );


            // Hapus player dari database
            if (playerId) {

                const result =
                    await supabaseClient
                    .from("quiz_players")
                    .delete()
                    .eq(
                        "id",
                        Number(playerId)
                    )
                    .select();


                console.log(
                    "DELETE RESULT:",
                    result
                );

            }


            // Bersihkan session player
            sessionStorage.removeItem(
                "playerId"
            );

            sessionStorage.removeItem(
                "nickname"
            );


            sessionStorage.removeItem(
                "roomId"
            );

            sessionStorage.removeItem(
                "roomCode"
            );


            console.log(
                "SESSION CLEARED"
            );


            // kembali ke home
            window.location.href =
                "../index.html#quiz";


        }
    );

}