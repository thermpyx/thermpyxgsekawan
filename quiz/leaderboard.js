// ======================================================
// THERMPYX FINAL LEADERBOARD
// ======================================================


// ======================================================
// ELEMENTS
// ======================================================

const leaderboardRoomCode =
    document.getElementById(
        "leaderboardRoomCode"
    );

const leaderboardList =
    document.getElementById(
        "leaderboardList"
    );

const podium =
    document.getElementById(
        "podium"
    );

const totalPlayers =
    document.getElementById(
        "totalPlayers"
    );

const yourRank =
    document.getElementById(
        "yourRank"
    );

const yourScore =
    document.getElementById(
        "yourScore"
    );

const liveStatus =
    document.getElementById(
        "liveStatus"
    );


// ======================================================
// SESSION DATA
// ======================================================

const roomId =
    sessionStorage.getItem("roomId");

const roomCode =
    sessionStorage.getItem("roomCode");

const playerId =
    sessionStorage.getItem("playerId");

const userRole =
    sessionStorage.getItem("userRole");

const nickname =
    sessionStorage.getItem("nickname");


// ======================================================
// REALTIME STATE
// ======================================================

let leaderboardChannel = null;


// ======================================================
// START
// ======================================================

if (!roomId || !roomCode) {

    alert(
        "Room information not found."
    );

    window.location.href =
        "quiz.html";

} else {

    initializeLeaderboard();

}


// ======================================================
// INITIALIZE
// ======================================================

async function initializeLeaderboard() {

    leaderboardRoomCode.textContent =
        roomCode;


    await loadLeaderboard();

    subscribeToLeaderboard();

}


// ======================================================
// LOAD LEADERBOARD
// ======================================================

async function loadLeaderboard() {

    const { data: players, error } =
        await supabaseClient
            .from("quiz_players")
            .select(
                "id, nickname, score, joined_at"
            )
            .eq(
                "room_id",
                roomId
            )
            .order(
                "score",
                {
                    ascending: false
                }
            )
            .order(
                "joined_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Failed to load leaderboard:",
            error
        );


        leaderboardList.innerHTML =
            `
            <p class="error-text">
                Failed to load leaderboard.
            </p>
            `;


        podium.innerHTML =
            "";


        return;

    }


    renderLeaderboard(
        players || []
    );

}


// ======================================================
// RENDER ALL
// ======================================================

function renderLeaderboard(players) {

    totalPlayers.textContent =
        players.length;


    renderPersonalResult(
        players
    );


    renderPodium(
        players
    );


    renderRankingList(
        players
    );

}


// ======================================================
// PERSONAL RESULT
// ======================================================

function renderPersonalResult(players) {

    // Host is not a player
    if (
        userRole === "host" ||
        !playerId
    ) {

        yourRank.textContent =
            "HOST";

        yourScore.textContent =
            "-";

        return;

    }


    const playerIndex =
        players.findIndex(
            (player) =>
                String(player.id) ===
                String(playerId)
        );


    if (playerIndex === -1) {

        yourRank.textContent =
            "-";

        yourScore.textContent =
            "-";

        return;

    }


    const player =
        players[playerIndex];


    yourRank.textContent =
        `#${playerIndex + 1}`;


    yourScore.textContent =
        formatScore(
            player.score
        );

}


// ======================================================
// PODIUM
// ======================================================

function renderPodium(players) {

    podium.innerHTML = "";


    if (players.length === 0) {

        podium.innerHTML =
            `
            <p class="loading-text">
                No players available.
            </p>
            `;

        return;

    }


    const first =
        players[0] || null;

    const second =
        players[1] || null;

    const third =
        players[2] || null;


    // Visual order:
    // 2nd - 1st - 3rd

    if (second) {

        podium.appendChild(
            createPodiumCard(
                second,
                2
            )
        );

    }


    if (first) {

        podium.appendChild(
            createPodiumCard(
                first,
                1
            )
        );

    }


    if (third) {

        podium.appendChild(
            createPodiumCard(
                third,
                3
            )
        );

    }

}


// ======================================================
// CREATE PODIUM CARD
// ======================================================

function createPodiumCard(
    player,
    rank
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        `podium-card rank-${rank}`;


    if (
        playerId &&
        String(player.id) ===
            String(playerId)
    ) {

        card.classList.add(
            "current-player"
        );

    }


    const medal =
        document.createElement(
            "div"
        );


    medal.className =
        "podium-medal";


    if (rank === 1) {

        medal.textContent =
            "🏆";

    } else if (rank === 2) {

        medal.textContent =
            "🥈";

    } else {

        medal.textContent =
            "🥉";

    }


    const rankText =
        document.createElement(
            "span"
        );

    rankText.className =
        "podium-rank";

    rankText.textContent =
        `#${rank}`;


    const name =
        document.createElement(
            "h3"
        );

    name.textContent =
        player.nickname;


    const score =
        document.createElement(
            "strong"
        );

    score.className =
        "podium-score";

    score.textContent =
        `${formatScore(
            player.score
        )} pts`;


    card.appendChild(
        medal
    );

    card.appendChild(
        rankText
    );

    card.appendChild(
        name
    );

    card.appendChild(
        score
    );


    return card;

}


// ======================================================
// FULL RANKING
// ======================================================

function renderRankingList(players) {

    leaderboardList.innerHTML =
        "";


    if (players.length === 0) {

        leaderboardList.innerHTML =
            `
            <p class="loading-text">
                No players available.
            </p>
            `;

        return;

    }


    players.forEach(
        (player, index) => {

            const rank =
                index + 1;


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "leaderboard-row";


            if (
                playerId &&
                String(player.id) ===
                    String(playerId)
            ) {

                row.classList.add(
                    "current-player"
                );

            }


            // RANK

            const rankElement =
                document.createElement(
                    "div"
                );

            rankElement.className =
                "rank-number";

            rankElement.textContent =
                `#${rank}`;


            // PLAYER

            const playerInfo =
                document.createElement(
                    "div"
                );

            playerInfo.className =
                "player-details";


            const playerName =
                document.createElement(
                    "strong"
                );

            playerName.textContent =
                player.nickname;


            const playerLabel =
                document.createElement(
                    "span"
                );


            if (
                playerId &&
                String(player.id) ===
                    String(playerId)
            ) {

                playerLabel.textContent =
                    "You";

            } else {

                playerLabel.textContent =
                    "Player";

            }


            playerInfo.appendChild(
                playerName
            );

            playerInfo.appendChild(
                playerLabel
            );


            // SCORE

            const score =
                document.createElement(
                    "div"
                );

            score.className =
                "ranking-score";

            score.textContent =
                `${formatScore(
                    player.score
                )} pts`;


            row.appendChild(
                rankElement
            );

            row.appendChild(
                playerInfo
            );

            row.appendChild(
                score
            );


            leaderboardList.appendChild(
                row
            );

        }
    );

}


// ======================================================
// SCORE FORMAT
// ======================================================

function formatScore(score) {

    const value =
        Number(score) || 0;


    return value.toLocaleString(
        "en-US"
    );

}


// ======================================================
// REALTIME
// ======================================================

function subscribeToLeaderboard() {

    leaderboardChannel =
        supabaseClient
            .channel(
                `final-leaderboard-${roomId}`
            )

            .on(
                "postgres_changes",

                {
                    event:
                        "*",

                    schema:
                        "public",

                    table:
                        "quiz_players",

                    filter:
                        `room_id=eq.${roomId}`

                },

                () => {

                    loadLeaderboard();

                }
            )

            .subscribe(
                (status) => {

                    console.log(
                        "Leaderboard realtime:",
                        status
                    );


                    updateRealtimeStatus(
                        status
                    );

                }
            );

}


// ======================================================
// REALTIME STATUS
// ======================================================

function updateRealtimeStatus(
    status
) {

    if (
        status ===
        "SUBSCRIBED"
    ) {

        liveStatus.textContent =
            "Live";

        liveStatus.classList.add(
            "connected"
        );

        return;

    }


    liveStatus.textContent =
        "Connecting...";

    liveStatus.classList.remove(
        "connected"
    );

}


// ======================================================
// CLEANUP
// ======================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            leaderboardChannel
        ) {

            supabaseClient
                .removeChannel(
                    leaderboardChannel
                );

        }

    }
);