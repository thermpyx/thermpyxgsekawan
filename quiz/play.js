// ======================================================
// THERMPYX LIVE QUIZ
// AUTO FLOW VERSION
// TIMER + SPEED SCORE + REALTIME
// ======================================================


// ======================================================
// SETTINGS
// ======================================================

const CORRECT_BASE_SCORE = 700;

const MAX_SPEED_BONUS = 300;


// ======================================================
// ELEMENTS
// ======================================================

const playRoomCode =
    document.getElementById("playRoomCode");


const playRole =
    document.getElementById("playRole");


const questionNumber =
    document.getElementById("questionNumber");


const questionText =
    document.getElementById("questionText");


const answerOptions =
    document.getElementById("answerOptions");


const playMessage =
    document.getElementById("playMessage");


const hostPlayControls =
    document.getElementById("hostPlayControls");


const hostAnswerStatus =
    document.getElementById("hostAnswerStatus");


const nextQuestionBtn =
    document.getElementById("nextQuestionBtn");


const quizTimer =
    document.getElementById("quizTimer");


const timerProgress =
    document.getElementById("timerProgress");


const timerBox =
    document.getElementById("timerBox");


// ======================================================
// SESSION
// ======================================================

const roomId =
    sessionStorage.getItem("roomId");


const roomCode =
    sessionStorage.getItem("roomCode");


const userRole =
    sessionStorage.getItem("userRole");


const playerId =
    sessionStorage.getItem("playerId");


const nickname =
    sessionStorage.getItem("nickname");


// ======================================================
// STATE
// ======================================================

let currentQuestions = [];


let currentQuestionIndex = 0;


let currentQuestionStartedAt = null;


let questionTimeSeconds = 20;


let answerSubmitted = false;


let timeoutHandled = false;


let autoNextExecuted = false;


let roomChannel = null;


let answersChannel = null;


let timerInterval = null;


// ======================================================
// QUESTION BANK
// ======================================================

const questionBank = {


    heat: [

        {
            question:
                "What is the SI unit of temperature?",

            options: [

                "Celsius",

                "Kelvin",

                "Fahrenheit",

                "Joule"

            ],

            correctAnswer: 1

        },


        {
            question:
                "Heat naturally flows from...",

            options: [

                "Low temperature to high temperature",

                "High temperature to low temperature",

                "Low pressure to high pressure",

                "Small volume to large volume"

            ],

            correctAnswer: 1

        },


        {
            question:
                "Which symbol is commonly used for heat?",

            options: [

                "Q",

                "P",

                "V",

                "U"

            ],

            correctAnswer: 0

        }

    ],



    work: [

        {
            question:
                "Thermodynamic work at constant pressure can be expressed as...",

            options: [

                "W = PΔV",

                "W = mcΔT",

                "W = Q + T",

                "W = PV/T"

            ],

            correctAnswer: 0

        },


        {
            question:
                "When a gas expands, its volume...",

            options: [

                "Decreases",

                "Remains constant",

                "Increases",

                "Becomes zero"

            ],

            correctAnswer: 2

        },


        {
            question:
                "The SI unit of work is...",

            options: [

                "Pascal",

                "Kelvin",

                "Joule",

                "Watt"

            ],

            correctAnswer: 2

        }

    ],



    "first-law": [

        {
            question:
                "Which equation represents the First Law of Thermodynamics?",

            options: [

                "ΔU = Q - W",

                "P = F / A",

                "Q = mcΔT",

                "PV = nRT"

            ],

            correctAnswer: 0

        },


        {
            question:
                "Internal energy is represented by the symbol...",

            options: [

                "P",

                "V",

                "U",

                "T"

            ],

            correctAnswer: 2

        },


        {
            question:
                "In the First Law of Thermodynamics, Q represents...",

            options: [

                "Pressure",

                "Heat",

                "Volume",

                "Temperature"

            ],

            correctAnswer: 1

        }

    ],



    process: [

        {
            question:
                "An isobaric process occurs at constant...",

            options: [

                "Temperature",

                "Pressure",

                "Volume",

                "Internal energy"

            ],

            correctAnswer: 1

        },


        {
            question:
                "An isochoric process occurs at constant...",

            options: [

                "Pressure",

                "Temperature",

                "Volume",

                "Heat"

            ],

            correctAnswer: 2

        },


        {
            question:
                "An isothermal process occurs at constant...",

            options: [

                "Temperature",

                "Pressure",

                "Volume",

                "Work"

            ],

            correctAnswer: 0

        }

    ]

};


// ======================================================
// START
// ======================================================

if (
    !roomId ||
    !roomCode ||
    !userRole
) {


    alert(
        "Quiz session not found."
    );


    window.location.href =
        "quiz.html";


} else {


    initializeQuiz();

}


// ======================================================
// INITIALIZE
// ======================================================

async function initializeQuiz() {


    playRoomCode.textContent =
        roomCode;



    if (
        userRole === "host"
    ) {


        playRole.textContent =
            "Host View";


        hostPlayControls.style.display =
            "block";


    } else {


        playRole.textContent =
            `Player: ${nickname || "Unknown Player"}`;


        hostPlayControls.style.display =
            "none";

    }



    await loadRoom();


    subscribeToRoom();



    if (
        userRole === "host"
    ) {


        subscribeToAnswers();

    }

}
// ======================================================
// LOAD ROOM
// ======================================================

async function loadRoom() {

    try {

        playMessage.textContent =
            "Loading quiz...";


        const {
            data: room,
            error
        } = await supabaseClient
            .from("quiz_rooms")
            .select(
                `
                id,
                topic,
                status,
                current_question,
                question_started_at
                `
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


            playMessage.textContent =
                "Failed to load quiz.";


            return;

        }



        console.log(
            "ROOM DATA:",
            room
        );



        // Jika quiz sudah selesai

        if (
            room.status === "finished"
        ) {

            goToLeaderboard();

            return;

        }



        // Jika belum dimulai

        if (
            room.status !== "playing"
        ) {


            playMessage.textContent =
                "Waiting for host to start quiz...";


            return;

        }



        // Gunakan default dulu
        // nanti bisa dibuat dinamis dari host

        questionTimeSeconds = 20;



        currentQuestions =
            getQuestionsForTopic(
                room.topic
            );



        if (
            !currentQuestions ||
            currentQuestions.length === 0
        ) {


            playMessage.textContent =
                "No questions available.";


            console.error(
                "Question bank empty:",
                room.topic
            );


            return;

        }



        currentQuestionIndex =
            Number(
                room.current_question
            )
            ||
            0;



        currentQuestionStartedAt =
            room.question_started_at
            ||
            new Date()
                .toISOString();



        renderQuestion();



    } catch (err) {


        console.error(
            "LOAD ROOM ERROR:",
            err
        );


        playMessage.textContent =
            "Unable to load quiz.";

    }
}
// ======================================================
// GET QUESTIONS
// ======================================================

function getQuestionsForTopic(
    topic
) {


    const normalizedTopic =
        String(topic || "")
            .trim()
            .toLowerCase();



    if (
        normalizedTopic ===
            "heat" ||
        normalizedTopic ===
            "heat-temperature" ||
        normalizedTopic ===
            "heat & temperature"
    ) {


        return questionBank.heat;


    }



    if (
        normalizedTopic ===
            "work" ||
        normalizedTopic ===
            "work-energy" ||
        normalizedTopic ===
            "work & energy"
    ) {


        return questionBank.work;


    }



    if (
        normalizedTopic ===
            "first-law" ||
        normalizedTopic ===
            "first law"
    ) {


        return questionBank[
            "first-law"
        ];


    }



    if (
        normalizedTopic ===
            "process" ||
        normalizedTopic ===
            "thermodynamic-processes"
    ) {


        return questionBank.process;


    }



    if (
        normalizedTopic ===
        "all"
    ) {


        return [

            ...questionBank.heat,

            ...questionBank.work,

            ...questionBank[
                "first-law"
            ],

            ...questionBank.process

        ];


    }



    return [];

}



// ======================================================
// RENDER QUESTION
// ======================================================

function renderQuestion() {


    stopTimer();



    timeoutHandled =
        false;



    autoNextExecuted =
        false;



    answerSubmitted =
        false;



    const question =
        currentQuestions[
            currentQuestionIndex
        ];



    if (!question) {


        playMessage.textContent =
            "Question unavailable.";


        return;

    }



    questionNumber.textContent =
        `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;



    questionText.textContent =
        question.question;



    answerOptions.innerHTML =
        "";



    playMessage.textContent =
        "";



    question.options.forEach(
        (
            option,
            index
        ) => {


            const button =
                document.createElement(
                    "button"
                );



            button.type =
                "button";



            button.className =
                "answer-option";



            button.textContent =
                option;



            if (
                userRole ===
                "host"
            ) {


                button.disabled =
                    true;


            }
            else {


                button.addEventListener(
                    "click",
                    () => {

                        submitAnswer(
                            index
                        );

                    }
                );


            }



            answerOptions.appendChild(
                button
            );


        }
    );



    if (
        userRole ===
        "host"
    ) {


        nextQuestionBtn.disabled =
            true;



        const last =
            currentQuestionIndex ===
            currentQuestions.length - 1;



        nextQuestionBtn.textContent =
            last
                ?
                "Finish Quiz"
                :
                "Next Question";



        hostAnswerStatus.textContent =
            "Waiting for players...";


    }



    if (
        userRole ===
        "player"
    ) {


        checkExistingAnswer();


    }



    startTimer();


}



// ======================================================
// TIMER
// ======================================================

function startTimer() {


    stopTimer();



    updateTimerDisplay();



    timerInterval =
        setInterval(
            updateTimerDisplay,
            250
        );


}



function updateTimerDisplay() {


    if (
        !currentQuestionStartedAt
    ) {

        return;

    }



    const start =
        new Date(
            currentQuestionStartedAt
        )
        .getTime();



    const elapsed =
        Date.now()
        -
        start;



    const total =
        questionTimeSeconds *
        1000;



    const remaining =
        Math.max(
            0,
            total - elapsed
        );



    const seconds =
        Math.ceil(
            remaining / 1000
        );



    quizTimer.textContent =
        seconds;



    const percent =
        Math.max(
            0,
            Math.min(
                100,
                (
                    remaining /
                    total
                )
                *
                100
            )
        );



    timerProgress.style.width =
        `${percent}%`;



    if (
        remaining <= 5000
    ) {


        timerBox.classList.add(
            "danger"
        );


    } else {


        timerBox.classList.remove(
            "danger"
        );


    }



    if (
        remaining <= 0
    ) {


        stopTimer();



        if (
            userRole === "player" &&
            !answerSubmitted &&
            !timeoutHandled
        ) {


            handleTimeout();


        }



        if (
            userRole === "host"
        ) {


            autoNextQuestion();


        }


    }


}
// ======================================================
// STOP TIMER
// ======================================================

function stopTimer() {


    if (
        timerInterval
    ) {


        clearInterval(
            timerInterval
        );


        timerInterval =
            null;

    }

}
// ======================================================
// RESPONSE TIME
// ======================================================

function getResponseTimeMs() {


    const total =
        questionTimeSeconds *
        1000;



    if (
        !currentQuestionStartedAt
    ) {


        return total;


    }



    const elapsed =
        Date.now()
        -
        new Date(
            currentQuestionStartedAt
        )
        .getTime();



    return Math.max(
        0,
        Math.min(
            total,
            elapsed
        )
    );


}



// ======================================================
// SCORE CALCULATION
// ======================================================

function calculateScore(
    isCorrect,
    responseTimeMs
) {


    if (
        !isCorrect
    ) {


        return 0;


    }



    const total =
        questionTimeSeconds *
        1000;



    const remaining =
        Math.max(
            0,
            total -
            responseTimeMs
        );



    const ratio =
        remaining /
        total;



    const bonus =
        Math.round(
            MAX_SPEED_BONUS *
            ratio
        );



    return (
        CORRECT_BASE_SCORE +
        bonus
    );


}



// ======================================================
// CHECK EXISTING ANSWER
// ======================================================

async function checkExistingAnswer() {


    if (
        !playerId
    ) {

        return;

    }



    const {
        data,
        error
    } =
    await supabaseClient
        .from("quiz_answers")
        .select(
            `
            selected_answer,
            is_correct,
            score
            `
        )
        .eq(
            "room_id",
            roomId
        )
        .eq(
            "player_id",
            playerId
        )
        .eq(
            "question_index",
            currentQuestionIndex
        )
        .maybeSingle();



    if (
        error
    ) {


        console.error(
            error
        );


        return;


    }



    if (
        !data
    ) {

        return;

    }



    answerSubmitted =
        true;



    disableAnswerButtons();



    stopTimer();



    const question =
        currentQuestions[
            currentQuestionIndex
        ];



    showAnswerResult(
        data.selected_answer,
        question.correctAnswer,
        data.is_correct,
        data.score
    );


}



// ======================================================
// SUBMIT ANSWER
// ======================================================

async function submitAnswer(
    selectedIndex
) {
    if (
        answerSubmitted
    ) {
        return;
    }
    const question =
        currentQuestions[
            currentQuestionIndex
        ];
    answerSubmitted =
        true;
    stopTimer();
    disableAnswerButtons();
    const responseTime =
        getResponseTimeMs();
    const isCorrect =
        selectedIndex ===
        question.correctAnswer;
    const score =
        calculateScore(
            isCorrect,
            responseTime
        );
    const {
        error
    } =
    await supabaseClient
        .from("quiz_answers")
        .insert({
            room_id:
                Number(roomId),
            player_id:
                Number(playerId),
            question_index:
                currentQuestionIndex,
            selected_answer:
                selectedIndex,
            is_correct:
                isCorrect,
            score:
                score,
            response_time_ms:
                Math.round(
                    responseTime
                )
        });
    if (
        error
    ) {
        console.error(
            "Submit error:",
            error
        );
        return;
    }
    showAnswerResult(
        selectedIndex,
        question.correctAnswer,
        isCorrect,
        score
    );
}
// cek apakah semua player sudah menjawab

if (
    userRole === "player"
) {

    notifyAnswerCompleted();

}
// ======================================================
// TIMEOUT HANDLER
// ======================================================

async function handleTimeout() {


    if (
        timeoutHandled
    ) {

        return;

    }



    timeoutHandled =
        true;



    answerSubmitted =
        true;



    disableAnswerButtons();



    const question =
        currentQuestions[
            currentQuestionIndex
        ];



    await supabaseClient
        .from("quiz_answers")
        .insert({

            room_id:
                Number(roomId),


            player_id:
                Number(playerId),


            question_index:
                currentQuestionIndex,


            selected_answer:
                -1,


            is_correct:
                false,


            score:
                0,


            response_time_ms:
                questionTimeSeconds *
                1000

        });



    showTimeoutResult(
        question.correctAnswer
    );


}



// ======================================================
// SHOW ANSWER RESULT
// ======================================================

function showAnswerResult(
    selectedIndex,
    correctIndex,
    isCorrect,
    score
) {


    const buttons =
        answerOptions
            .querySelectorAll(
                ".answer-option"
            );



    buttons.forEach(
        (
            button,
            index
        ) => {


            if (
                index === correctIndex
            ) {

                button.classList.add(
                    "correct-answer"
                );

            }



            if (
                index === selectedIndex &&
                index !== correctIndex
            ) {

                button.classList.add(
                    "wrong-answer"
                );

            }


        }
    );



    playMessage.textContent =
        isCorrect
        ?
        `Correct! +${score} points`
        :
        "Incorrect +0 points";


}



// ======================================================
// SHOW TIMEOUT
// ======================================================

function showTimeoutResult(
    correctIndex
) {


    const buttons =
        answerOptions
            .querySelectorAll(
                ".answer-option"
            );



    buttons.forEach(
        (
            button,
            index
        ) => {


            if (
                index === correctIndex
            ) {

                button.classList.add(
                    "correct-answer"
                );

            }


        }
    );



    playMessage.textContent =
        "Time is up!";


}



// ======================================================
// AUTO NEXT QUESTION
// ======================================================

async function autoNextQuestion() {


    if (
        autoNextExecuted
    ) {

        return;

    }



    autoNextExecuted =
        true;



    playMessage.textContent =
        "Next question loading...";



    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                3000
            )
    );



    const lastQuestion =
        currentQuestionIndex >=
        currentQuestions.length - 1;



    if (
        lastQuestion
    ) {


        await supabaseClient
            .from("quiz_rooms")
            .update({

                status:
                    "finished"

            })
            .eq(
                "id",
                roomId
            );



        return;

    }



    const nextIndex =
        currentQuestionIndex + 1;



    await supabaseClient
        .from("quiz_rooms")
        .update({

            current_question:
                nextIndex,


            question_started_at:
                new Date()
                    .toISOString()

        })
        .eq(
            "id",
            roomId
        );


}
// ======================================================
// REALTIME ROOM
// ======================================================

function subscribeToRoom() {


    roomChannel =
        supabaseClient
            .channel(
                `live-room-${roomId}`
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


                    handleRoomUpdate(
                        payload.new
                    );


                }

            )


            .subscribe();



}



// ======================================================
// HANDLE ROOM UPDATE
// ======================================================

function handleRoomUpdate(
    room
) {


    console.log(
        "ROOM UPDATE:",
        room
    );



    if (
        room.status === "finished"
    ) {


        stopTimer();



        playMessage.textContent =
            "Quiz Finished!";



        setTimeout(
            () => {

                goToLeaderboard();

            },
            1000
        );



        return;

    }



    const updatedQuestion =
        Number(
            room.current_question
        );



    if (
        updatedQuestion !==
        currentQuestionIndex
    ) {


        currentQuestionIndex =
            updatedQuestion;



        currentQuestionStartedAt =
            room.question_started_at;



        // reload room supaya
        // question bank tersedia

        loadRoom();


    }


}
// ======================================================
// REALTIME ANSWERS
// ======================================================

function subscribeToAnswers() {


    answersChannel =
        supabaseClient
            .channel(
                `answers-${roomId}`
            )


            .on(
                "postgres_changes",

                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "quiz_answers",

                    filter:
                        `room_id=eq.${roomId}`

                },


                () => {


                    updateAnswerProgress();


                }

            )


            .subscribe();


}



// ======================================================
// UPDATE ANSWER PROGRESS
// ======================================================

async function updateAnswerProgress() {


    if (
        userRole !== "host"
    ) {

        return;

    }



    const {
        count: playerCount
    } =
    await supabaseClient
        .from("quiz_players")
        .select(
            "id",
            {
                count:
                    "exact",
                head:
                    true
            }
        )
        .eq(
            "room_id",
            roomId
        );



    const {
        count: answerCount
    }
    =
    await supabaseClient
        .from("quiz_answers")
        .select(
            "id",
            {
                count:
                    "exact",
                head:
                    true
            }
        )
        .eq(
            "room_id",
            roomId
        )
        .eq(
            "question_index",
            currentQuestionIndex
        );



    console.log(
        "ANSWER PROGRESS:",
        answerCount,
        "/",
        playerCount
    );



    hostAnswerStatus.textContent =
        `${answerCount || 0} / ${playerCount || 0} players answered`;



    // sementara tetap manual
    // agar quiz stabil dulu

    if (
        answerCount >= playerCount &&
        playerCount > 0
    ) {


        nextQuestionBtn.disabled =
            false;


        playMessage.textContent =
            "All players answered.";


    }


}
// ======================================================
// MANUAL NEXT QUESTION
// BACKUP BUTTON FOR HOST
// ======================================================
if (
    nextQuestionBtn
) {
    nextQuestionBtn.addEventListener(
        "click",
        async () => {
            if (
                userRole !==
                "host"
            ) {
                return;
            }
            nextQuestionBtn.disabled =
                true;
            const lastQuestion =
                currentQuestionIndex >=
                currentQuestions.length - 1;
            if (
                lastQuestion
            ) {
                await supabaseClient
                    .from("quiz_rooms")
                    .update({
                        status:
                            "finished"
                    })
                    .eq(
                        "id",
                        roomId
                    );
                return;
            }
            const nextIndex =
                currentQuestionIndex + 1;
            await supabaseClient
                .from("quiz_rooms")
                .update({
                    current_question:
                        nextIndex,
                    question_started_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    roomId
                );
        }
    );
}
// ======================================================
// LEADERBOARD
// ======================================================
function goToLeaderboard() {
    window.location.href =
        "leaderboard.html";
}
// ======================================================
// BUTTON HELPERS
// ======================================================
function disableAnswerButtons() {
    answerOptions
        .querySelectorAll(
            ".answer-option"
        )
        .forEach(
            button => {
                button.disabled =
                    true;
            }
        );
}
function enableAnswerButtons() {
    answerOptions
        .querySelectorAll(
            ".answer-option"
        )
        .forEach(
            button => {
                button.disabled =
                    false;
            }
        );
}
// ======================================================
// CHECK ALL PLAYERS ANSWERED
// ======================================================

async function notifyAnswerCompleted() {


    const {
        count: totalPlayers
    } =
    await supabaseClient
        .from("quiz_players")
        .select(
            "id",
            {
                count:
                    "exact",
                head:
                    true
            }
        )
        .eq(
            "room_id",
            roomId
        );



    const {
        count: totalAnswers
    }
    =
    await supabaseClient
        .from("quiz_answers")
        .select(
            "id",
            {
                count:
                    "exact",
                head:
                    true
            }
        )
        .eq(
            "room_id",
            roomId
        )
        .eq(
            "question_index",
            currentQuestionIndex
        );



    console.log(
        "Answers:",
        totalAnswers,
        "/",
        totalPlayers
    );



    if (
        totalAnswers >= totalPlayers
    ) {


        if (
            userRole === "host"
        ) {


            autoNextQuestion();


        }

    }

}
// ======================================================
// CLEANUP
// ======================================================
window.addEventListener(
    "beforeunload",
    () => {
        stopTimer();
        if (
            roomChannel
        ) {
            supabaseClient
                .removeChannel(
                    roomChannel
                );
        }
        if (
            answersChannel
        ) {
            supabaseClient
                .removeChannel(
                    answersChannel
                );
        }
    }
);