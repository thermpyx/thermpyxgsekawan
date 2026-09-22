// ======================================================
// THERMPYX LIVE QUIZ PLAYER
// FINAL INDIVIDUAL PLAYER SYSTEM
// PART 1/4
// ======================================================


// ======================================================
// ELEMENTS
// ======================================================

const playRole =
    document.getElementById("playRole");


const playRoomCode =
    document.getElementById("playRoomCode");


const quizTimer =
    document.getElementById("quizTimer");


const timerProgress =
    document.getElementById("timerProgress");


const timerBox =
    document.getElementById("timerBox");


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



console.log(
    "ROLE:",
    userRole
);


console.log(
    "PLAYER ID:",
    playerId
);


console.log(
    "NICKNAME:",
    nickname
);



// ======================================================
// QUIZ STATE
// ======================================================


let currentQuestions = [];


let currentQuestionIndex = 0;


let currentQuestionStartedAt = null;


let questionTimeSeconds = 20;


let timerInterval = null;


let answered = false;


let movingNext = false;


let realtimeChannel = null;



// ======================================================
// START INITIALIZE
// ======================================================


initializeQuiz();



// ======================================================
// INITIALIZE QUIZ
// ======================================================


async function initializeQuiz(){


    if(
        !roomId
    ){

        playMessage.textContent =
            "Room not found.";

        return;

    }



    playRoomCode.textContent =
        roomCode ||
        "------";



    if(
        userRole === "host"
    ){

        playRole.textContent =
            "Host Quiz";

    }
    else{

        playRole.textContent =
            "Player: " +
            nickname;

    }



    await loadRoom();


}
// ======================================================
// LOAD ROOM
// ======================================================


async function loadRoom(){


    try{


        playMessage.textContent =
            "Loading quiz...";



        const {
            data: room,
            error
        } =
        await supabaseClient
            .from("quiz_rooms")
            .select(
                `
                id,
                topic,
                status
                `
            )
            .eq(
                "id",
                roomId
            )
            .single();



        if(error){

            console.error(
                "ROOM ERROR:",
                error
            );
            playMessage.textContent =
                "Room not found.";
            return;
        }
        console.log(
            "ROOM:",
            room
        );
        if(
            room.status !== "playing"
        ){
            playMessage.textContent =
                "Waiting for host to start quiz...";
            return;
        }
        currentQuestions =
            getQuestionsForTopic(
                room.topic
            );
        if(
            !currentQuestions ||
            currentQuestions.length === 0
        ){
            playMessage.textContent =
                "Question not found.";
            return;
        }
        // ==========================
        // HOST
        // ==========================
        if(
            userRole === "host"
        ){
            currentQuestionIndex =
                0;
            hostPlayControls.style.display =
                "block";
            renderQuestion();
            return;
        }
        // ==========================
        // PLAYER
        // ==========================
        const {
            data: player,
            error: playerError
        }
        =
        await supabaseClient
            .from("quiz_players")
            .select(
                `
                current_question,
                question_started_at
                `
            )
            .eq(
                "id",
                playerId
            )
            .single();




        if(
            playerError ||
            !player
        ){

            console.error(
                "PLAYER ERROR:",
                playerError
            );


            playMessage.textContent =
                "Player data missing.";


            return;

        }




        currentQuestionIndex =
            Number(
                player.current_question
            )
            ||
            0;



        currentQuestionStartedAt =
            player.question_started_at
            ||
            new Date()
                .toISOString();




        renderQuestion();



        startRealtime();



    }
    catch(err){


        console.error(
            "LOAD ROOM FAILED:",
            err
        );


        playMessage.textContent =
            "Unable to load quiz.";

    }

}




// ======================================================
// QUESTION BANK
// ======================================================

function getQuestionsForTopic(topic){


    const key =
        String(topic || "")
            .toLowerCase()
            .trim();



    // ======================================================
    // HEAT & TEMPERATURE
    // ======================================================

    const heatQuestions = [

        {
            question:
                "What is the SI unit of temperature?",

            options:[
                "Celsius",
                "Kelvin",
                "Fahrenheit",
                "Joule"
            ],

            correctAnswer:1
        },


        {
            question:
                "Heat naturally flows from...",

            options:[
                "Low temperature to high temperature",
                "High temperature to low temperature",
                "Low pressure to high pressure",
                "Small volume to large volume"
            ],

            correctAnswer:1
        },


        {
            question:
                "Which symbol is commonly used for heat?",

            options:[
                "Q",
                "P",
                "V",
                "U"
            ],

            correctAnswer:0
        }

    ];




    // ======================================================
    // WORK & ENERGY
    // ======================================================

    const workQuestions = [

        {
            question:
                "Thermodynamic work at constant pressure can be expressed as...",

            options:[
                "W = PΔV",
                "W = mcΔT",
                "W = Q + T",
                "PV = nRT"
            ],

            correctAnswer:0
        },


        {
            question:
                "When a gas expands, its volume...",

            options:[
                "Decreases",
                "Remains constant",
                "Increases",
                "Becomes zero"
            ],

            correctAnswer:2
        },


        {
            question:
                "The SI unit of work is...",

            options:[
                "Pascal",
                "Kelvin",
                "Joule",
                "Watt"
            ],

            correctAnswer:2
        }

    ];





    // ======================================================
    // FIRST LAW OF THERMODYNAMICS
    // ======================================================

    const firstLawQuestions = [

        {
            question:
                "Which equation represents the First Law of Thermodynamics?",

            options:[
                "ΔU = Q - W",
                "P = F / A",
                "Q = mcΔT",
                "PV = nRT"
            ],

            correctAnswer:0
        },


        {
            question:
                "Internal energy is represented by the symbol...",

            options:[
                "P",
                "V",
                "U",
                "T"
            ],

            correctAnswer:2
        },


        {
            question:
                "In the First Law of Thermodynamics, Q represents...",

            options:[
                "Pressure",
                "Heat",
                "Volume",
                "Temperature"
            ],

            correctAnswer:1
        },


        {
            question:
                "According to the First Law of Thermodynamics, energy can enter a system through...",

            options:[
                "Heat and work",
                "Temperature and pressure",
                "Volume and density",
                "Mass and force"
            ],

            correctAnswer:0
        },


        {
            question:
                "A bicycle pump becomes hot after repeated use because...",

            options:[
                "Air creates energy by itself",
                "Work done on the air increases its internal energy",
                "Heat only comes from the hand",
                "Temperature is unrelated to energy"
            ],

            correctAnswer:1
        },


        {
            question:
                "If a system receives heat and does no work, its internal energy will...",

            options:[
                "Increase",
                "Decrease",
                "Remain constant",
                "Become zero"
            ],

            correctAnswer:0
        },


        {
            question:
                "A laptop becomes hot during heavy use because electrical energy is converted into...",

            options:[
                "Only mechanical energy",
                "Internal energy and heat released to surroundings",
                "Only chemical energy",
                "Only potential energy"
            ],

            correctAnswer:1
        },


        {
            question:
                "Why is it important to define the system before applying the First Law of Thermodynamics?",

            options:[
                "Because it determines energy interactions being analyzed",
                "Because temperature cannot be measured",
                "Because pressure is always constant",
                "Because heat does not exist"
            ],

            correctAnswer:0
        },


        {
            question:
                "When a gas is compressed by a piston, energy is transferred to the gas through...",
            options:[
                "Radiation",
                "Work",
                "Mass loss",
                "Temperature only"
            ],
            correctAnswer:1
        },
        {
            question:
                "Two objects have the same initial and final states. Their change in internal energy is...",
            options:[
                "Always different",
                "The same because internal energy is a state function",
                "Always zero",
                "Impossible to determine"
            ],
            correctAnswer:1
        }
    ];
    // ======================================================
    // THERMODYNAMIC PROCESSES
    // ======================================================
    const processQuestions = [

        {
            question:
                "An isobaric process occurs at constant...",

            options:[
                "Temperature",
                "Pressure",
                "Volume",
                "Internal energy"
            ],

            correctAnswer:1
        },
        {
            question:
                "An isochoric process occurs at constant...",

            options:[
                "Pressure",
                "Temperature",
                "Volume",
                "Heat"
            ],

            correctAnswer:2
        },
        {
            question:
                "An isothermal process occurs at constant...",

            options:[
                "Temperature",
                "Pressure",
                "Volume",
                "Work"
            ],

            correctAnswer:0
        }
    ];
    // ======================================================
    // TOPIC SELECTOR
    // ======================================================
    if(
        key.includes("heat")
    ){
        return heatQuestions;
    }
    if(
        key.includes("work")
        ||
        key.includes("energy")
    ){

        return workQuestions;
    }
    if(
    key.includes("first")
    &&
    key.includes("law")
    ){
    return firstLawQuestions;
    }
    if(
        key.includes("process")
    ){
        return processQuestions;
    }
    if(
        key.includes("all")
    ){
        return [

            ...heatQuestions,

            ...workQuestions,

            ...firstLawQuestions,

            ...processQuestions
        ];
    }
    return [];
}
// ======================================================
// RENDER QUESTION
// ======================================================


function renderQuestion(){


    stopTimer();



    answered =
        false;



    movingNext =
        false;



    const question =
        currentQuestions[
            currentQuestionIndex
        ];



    if(!question){

        finishQuiz();

        return;

    }




    questionNumber.textContent =
        `Question ${
            currentQuestionIndex + 1
        } of ${
            currentQuestions.length
        }`;



    questionText.textContent =
        question.question;



    answerOptions.innerHTML =
        "";



    question.options.forEach(
        (
            option,
            index
        )=>{


            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "answer-option";


            button.textContent =
                option;



            if(
                userRole === "player"
            ){

                button.onclick =
                    ()=>submitAnswer(index);

            }
            else{

                button.disabled =
                    true;

            }



            answerOptions.appendChild(
                button
            );


        }
    );



    if(
        userRole === "player"
    ){

        startTimer();

    }



}
// ======================================================
// TIMER
// ======================================================


function startTimer(){


    stopTimer();


    if(
        !currentQuestionStartedAt
    ){

        currentQuestionStartedAt =
            new Date()
                .toISOString();

    }



    updateTimer();



    timerInterval =
        setInterval(
            updateTimer,
            250
        );


}




function updateTimer(){


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
        (
            remaining /
            total
        )
        *
        100;



    timerProgress.style.width =
        `${percent}%`;



    if(
        remaining <= 5000
    ){

        timerBox.classList.add(
            "danger"
        );

    }
    else{

        timerBox.classList.remove(
            "danger"
        );

    }



    if(
        remaining <= 0
    ){

        stopTimer();



        if(
            userRole === "player" &&
            !answered
        ){

            handleTimeout();

        }


    }

}




function stopTimer(){


    if(timerInterval){


        clearInterval(
            timerInterval
        );


        timerInterval =
            null;

    }

}



// ======================================================
// SUBMIT ANSWER
// ======================================================


async function submitAnswer(
    selectedIndex
){


    if(
        answered ||
        userRole !== "player"
    ){

        return;

    }



    answered =
        true;



    stopTimer();



    disableButtons();



    const question =
        currentQuestions[
            currentQuestionIndex
        ];



    const responseTime =
        Date.now()
        -
        new Date(
            currentQuestionStartedAt
        )
        .getTime();



    const correct =
        selectedIndex ===
        question.correctAnswer;



    const score =
        correct
        ?
        100
        :
        0;




    const {
        error
    }
    =
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
                correct,

            score:
                score,

            response_time_ms:
                responseTime

        });



    if(error){

        console.error(
            error
        );

        return;

    }



    showResult(
        selectedIndex,
        question.correctAnswer,
        correct,
        score
    );



    // pindah hanya player ini

    setTimeout(
        ()=>{

            nextPlayerQuestion();

        },
        1000
    );


}




// ======================================================
// NEXT QUESTION - INDIVIDUAL PLAYER
// ======================================================

async function nextPlayerQuestion(){


    if(
        movingNext ||
        userRole !== "player"
    ){

        return;

    }



    movingNext =
        true;



    const nextIndex =
        currentQuestionIndex + 1;



    // ==========================================
    // PLAYER SUDAH MENYELESAIKAN SEMUA SOAL
    // ==========================================

    if(
        nextIndex >=
        currentQuestions.length
    ){


        finishQuiz();


        return;

    }



    const newStartedAt =
        new Date()
            .toISOString();



    const {
        error
    } =
    await supabaseClient
        .from("quiz_players")
        .update({

            current_question:
                nextIndex,

            question_started_at:
                newStartedAt

        })
        .eq(
            "id",
            Number(playerId)
        )
        .eq(
            "room_id",
            Number(roomId)
        );



    if(error){


        console.error(
            "NEXT QUESTION ERROR:",
            error
        );


        movingNext =
            false;


        playMessage.textContent =
            "Failed to load next question.";


        return;

    }



    // Update state hanya milik player ini

    currentQuestionIndex =
        nextIndex;


    currentQuestionStartedAt =
        newStartedAt;



    // Render langsung.
    // Tidak menunggu realtime room.
    renderQuestion();


}



// ======================================================
// TIMEOUT
// ======================================================


async function handleTimeout(){


    answered =
        true;



    disableButtons();



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
                questionTimeSeconds * 1000

        });



    setTimeout(
        ()=>{

            nextPlayerQuestion();

        },
        1000
    );


}



// ======================================================
// BUTTON CONTROL
// ======================================================


function disableButtons(){


    document
        .querySelectorAll(
            ".answer-option"
        )
        .forEach(
            btn=>{

                btn.disabled =
                    true;

            }
        );

}



// ======================================================
// SHOW RESULT
// ======================================================


function showResult(
    selected,
    correct,
    status,
    score
){


    const buttons =
        document.querySelectorAll(
            ".answer-option"
        );



    buttons.forEach(
        (
            btn,
            index
        )=>{


            if(
                index === correct
            ){

                btn.classList.add(
                    "correct-answer"
                );

            }



            if(
                index === selected &&
                index !== correct
            ){

                btn.classList.add(
                    "wrong-answer"
                );

            }


        }
    );



    playMessage.textContent =
        status
        ?
        `Correct +${score}`
        :
        "Incorrect";

}
// ======================================================
// REALTIME
// ======================================================

let hostLeaderboardRedirect =
    false;


function startRealtime(){


    if(
        realtimeChannel
    ){

        return;

    }



    realtimeChannel =
        supabaseClient
            .channel(
                `thermpyx-play-${roomId}-${userRole}-${playerId || "host"}`
            );



    // ==========================================
    // ROOM STATUS
    // ==========================================

    realtimeChannel.on(

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

        payload=>{


            const room =
                payload.new;


            console.log(
                "ROOM UPDATE:",
                room
            );



            if(
                room.status ===
                "finished"
            ){


                stopTimer();


                if(
                    userRole ===
                    "player"
                ){

                    goToLeaderboard();

                }


            }


        }

    );



    // ==========================================
    // HOST MONITORING
    // ==========================================

    if(
        userRole === "host"
    ){


        nextQuestionBtn.style.display =
            "none";


        hostAnswerStatus.textContent =
            "Players progress individually.";



        realtimeChannel.on(

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

            ()=>{


                loadHostProgress();


            }

        );



        realtimeChannel.on(

            "postgres_changes",

            {
                event:
                    "UPDATE",

                schema:
                    "public",

                table:
                    "quiz_players",

                filter:
                    `room_id=eq.${roomId}`
            },

            ()=>{


                loadHostProgress();


            }

        );


    }



    realtimeChannel
        .subscribe(
            status=>{


                console.log(
                    "PLAY REALTIME:",
                    status
                );


            }
        );



    if(
        userRole === "host"
    ){


        setTimeout(
            ()=>{

                loadHostProgress();

            },
            500
        );


    }


}



// ======================================================
// HOST PROGRESS
// ======================================================

async function loadHostProgress(){


    if(
        userRole !== "host"
    ){

        return;

    }



    if(
        !currentQuestions ||
        currentQuestions.length === 0
    ){

        return;

    }



    const {
        data: players,
        error: playerError
    } =
    await supabaseClient
        .from("quiz_players")
        .select(
            `
            id,
            nickname,
            score,
            current_question
            `
        )
        .eq(
            "room_id",
            roomId
        );



    if(
        playerError
    ){


        console.error(
            "HOST PLAYER LOAD ERROR:",
            playerError
        );


        return;

    }



    const {
        data: answers,
        error: answerError
    } =
    await supabaseClient
        .from("quiz_answers")
        .select(
            `
            player_id,
            question_index
            `
        )
        .eq(
            "room_id",
            roomId
        );



    if(
        answerError
    ){


        console.error(
            "HOST ANSWER LOAD ERROR:",
            answerError
        );


        return;

    }



    if(
        !players ||
        players.length === 0
    ){


        hostAnswerStatus.textContent =
            "Waiting for players...";


        return;

    }



    const answerCounter =
        new Map();



    (answers || [])
        .forEach(
            answer=>{


                const id =
                    String(
                        answer.player_id
                    );


                answerCounter.set(
                    id,
                    (
                        answerCounter.get(id) ||
                        0
                    )
                    +
                    1
                );


            }
        );



    let completed =
        0;



    players.forEach(
        player=>{


            const answered =
                answerCounter.get(
                    String(player.id)
                )
                ||
                0;



            if(
                answered >=
                currentQuestions.length
            ){

                completed++;

            }


        }
    );



    hostAnswerStatus.textContent =
        `${completed} / ${players.length} players completed`;



    const progressText =
        players
            .map(
                player=>{


                    const answersDone =
                        answerCounter.get(
                            String(player.id)
                        )
                        ||
                        0;


                    return (
                        `${player.nickname}: ` +
                        `${Math.min(
                            answersDone,
                            currentQuestions.length
                        )}/${currentQuestions.length}`
                    );


                }
            )
            .join(" • ");



    playMessage.textContent =
        progressText;



    // ==========================================
    // SEMUA PLAYER SELESAI
    // ==========================================

    if(
        completed ===
            players.length &&
        players.length > 0 &&
        !hostLeaderboardRedirect
    ){


        hostLeaderboardRedirect =
            true;



        hostAnswerStatus.textContent =
            "All players completed the quiz.";



        const {
            error
        } =
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



        if(error){

            console.error(
                "FINISH ROOM ERROR:",
                error
            );

        }



        setTimeout(
            ()=>{

                goToLeaderboard();

            },
            1200
        );


    }


}



// ======================================================
// FINISH QUIZ - PLAYER
// ======================================================

function finishQuiz(){


    stopTimer();


    answered =
        true;


    movingNext =
        true;


    disableButtons();



    questionNumber.textContent =
        "Quiz Completed";


    questionText.textContent =
        "Great work! Your answers have been submitted.";


    answerOptions.innerHTML =
        "";


    playMessage.textContent =
        "Opening leaderboard...";



    setTimeout(
        ()=>{


            goToLeaderboard();


        },
        1000
    );


}



// ======================================================
// LEADERBOARD
// ======================================================

function goToLeaderboard(){


    window.location.href =
        "leaderboard.html";


}



// ======================================================
// INITIAL HOST REALTIME
// ======================================================

if(
    roomId
){

    startRealtime();

}



// ======================================================
// CLEANUP
// ======================================================

window.addEventListener(

    "beforeunload",

    ()=>{


        stopTimer();



        if(
            realtimeChannel
        ){


            supabaseClient
                .removeChannel(
                    realtimeChannel
                );


            realtimeChannel =
                null;


        }


    }

);