/* =========================================================
   THERMPYX
   THERMODYNAMICS QUIZ
========================================================= */
/* =========================================================
   1. QUIZ QUESTIONS
========================================================= */
const quizQuestions = [
    {
        question: "What is the SI unit of heat energy?",
        options: [
            "Joule",
            "Watt",
            "Pascal",
            "Kelvin"
        ],
        answer: "Joule",
        explanation:
            "The SI unit of heat energy is the joule (J)."
    },
    {
        question: "Which equation is used to calculate heat transferred?",
        options: [
            "Q = mcΔT",
            "W = PΔV",
            "PV = nRT",
            "ΔU = Q − W"
        ],
        answer: "Q = mcΔT",
        explanation:
            "The equation Q = mcΔT is used to calculate heat transferred when temperature changes."
    },
    {
        question: "What happens to heat naturally between two objects at different temperatures?",
        options: [
            "Heat flows from lower to higher temperature",
            "Heat flows from higher to lower temperature",
            "Heat stops flowing immediately",
            "Heat flows randomly"
        ],
        answer:
            "Heat flows from higher to lower temperature",

        explanation:
            "Heat naturally transfers from a higher-temperature region to a lower-temperature region."
    },
    {
        question: "What is the SI unit of pressure?",
        options: [
            "Joule",
            "Pascal",
            "Kelvin",
            "Watt"
        ],
        answer: "Pascal",
        explanation:
            "The SI unit of pressure is the pascal (Pa)."
    },
    {
        question: "Which equation represents the ideal gas law?",
        options: [
            "Q = mcΔT",
            "W = PΔV",
            "PV = nRT",
            "ΔT = Tfinal − Tinitial"
        ],
        answer: "PV = nRT",
        explanation:
            "The ideal gas law is PV = nRT."
    }
];
/* =========================================================
   2. SHUFFLE FUNCTION
========================================================= */
function shuffleArray(array) {
    const shuffled = [...array];
    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {
        const randomIndex =
            Math.floor(
                Math.random() * (i + 1)
            );
        [
            shuffled[i],
            shuffled[randomIndex]
        ] =
        [
            shuffled[randomIndex],
            shuffled[i]
        ];
    }
    return shuffled;
}
/* =========================================================
   3. GET HTML ELEMENTS
========================================================= */
const quizContainer =
    document.getElementById("quizContainer");
const quizResult =
    document.getElementById("quizResult");
const quizQuestionNumber =
    document.getElementById("quizQuestionNumber");
const quizScore =
    document.getElementById("quizScore");
const questionText =
    document.getElementById("questionText");
const quizOptions =
    document.getElementById("quizOptions");
const quizFeedback =
    document.getElementById("quizFeedback");
const quizNextButton =
    document.getElementById("quizNextButton");
const quizFinalScore =
    document.getElementById("quizFinalScore");
const quizFinalMessage =
    document.getElementById("quizFinalMessage");
const quizRestartButton =
    document.getElementById("quizRestartButton");
/* =========================================================
   4. QUIZ VARIABLES
========================================================= */
let shuffledQuestions = [];
let currentQuestion = 0;
let score = 0;
let answered = false;
/* =========================================================
   5. LOAD QUESTION
========================================================= */
function loadQuestion() {
    const current =
        shuffledQuestions[currentQuestion];
    /* Question number */
    quizQuestionNumber.textContent =
        `Question ${currentQuestion + 1} of ${shuffledQuestions.length}`;
    /* Score */
    quizScore.textContent =
        `Score: ${score}`;
    /* Question */
    questionText.textContent =
        current.question;
    /* Clear old options */
    quizOptions.innerHTML = "";
    /* Clear feedback */
    quizFeedback.textContent = "";
    quizFeedback.className =
        "quiz-feedback";
    /* Disable next */
    quizNextButton.disabled = true;
    quizNextButton.textContent = "NEXT";
    /* Reset answer state */
    answered = false;
    /* Shuffle answer options */
    const shuffledOptions =
        shuffleArray(current.options);
    /* Create answer buttons */
    shuffledOptions.forEach(function (option) {
        const button =
            document.createElement("button");
        button.type = "button";
        button.className =
            "quiz-option";
        button.textContent =
            option;
        button.dataset.answer =
            option;
        button.addEventListener(
            "click",
            function () {
                selectAnswer(button);
            }
        );
        quizOptions.appendChild(button);
    });
}
/* =========================================================
   6. SELECT ANSWER
========================================================= */
function selectAnswer(selectedButton) {
    /* Prevent multiple answers */
    if (answered) {
        return;
    }
    answered = true;
    const selectedAnswer =
        selectedButton.dataset.answer;
    const current =
        shuffledQuestions[currentQuestion];
    const correctAnswer =
        current.answer;
    const explanation =
        current.explanation;
    const allOptions =
        document.querySelectorAll(".quiz-option");
    /* Disable all options */
    allOptions.forEach(function (button) {
        button.disabled = true;
    });
    /* Correct */
    if (selectedAnswer === correctAnswer) {
        score++;
        selectedButton.classList.add("correct");
        quizFeedback.textContent =
            `Correct! ${explanation}`;
        quizFeedback.classList.add("correct");
    }
    /* Incorrect */
    else {
        selectedButton.classList.add("incorrect");
        /* Highlight correct answer */
        allOptions.forEach(function (button) {
            if (
                button.dataset.answer ===
                correctAnswer
            ) {
                button.classList.add("correct");
            }
        });
        quizFeedback.textContent =
            `Incorrect. ${explanation}`;
        quizFeedback.classList.add("incorrect");
    }
    /* Update score */
    quizScore.textContent =
        `Score: ${score}`;
    /* Enable next */
    quizNextButton.disabled = false;
    /* Last question */
    if (
        currentQuestion ===
        shuffledQuestions.length - 1
    ) {
        quizNextButton.textContent =
            "SEE RESULT";
    }
}
/* =========================================================
   7. NEXT BUTTON
========================================================= */
if (quizNextButton) {
    quizNextButton.addEventListener(
        "click",
        function () {
            if (!answered) {
                return;
            }
            currentQuestion++;
            /* More questions */
            if (
                currentQuestion <
                shuffledQuestions.length
            ) {
                loadQuestion();
            }
            /* Quiz complete */
            else {
                showResult();
            }
        }
    );

}
/* =========================================================
   8. SHOW RESULT
========================================================= */
function showResult() {
    quizContainer.style.display =
        "none";
    quizResult.classList.add("show");
    quizFinalScore.textContent =
        `${score} / ${shuffledQuestions.length}`;
    const percentage =
        (score / shuffledQuestions.length) * 100;
    if (percentage === 100) {
        quizFinalMessage.textContent =
            "Excellent! You got every question correct.";
    }
    else if (percentage >= 80) {
        quizFinalMessage.textContent =
            "Great job! You have a strong understanding of thermodynamics.";
    }
    else if (percentage >= 60) {
        quizFinalMessage.textContent =
            "Good effort! Review a few concepts and try again.";
    }
    else {
        quizFinalMessage.textContent =
            "Keep learning! Review the theory and try the quiz again.";
    }
}
/* =========================================================
   9. RESTART QUIZ
========================================================= */
if (quizRestartButton) {
    quizRestartButton.addEventListener(
        "click",
        function () {
            /* Reset variables */
            currentQuestion = 0;
            score = 0;
            answered = false;
            /* Shuffle questions again */
            shuffledQuestions =
                shuffleArray(quizQuestions);
            /* Show quiz */
            quizContainer.style.display =
                "block";
            /* Hide result */
            quizResult.classList.remove("show");
            /* Load first question */
            loadQuestion();
        }
    );
}
/* =========================================================
   10. START QUIZ
========================================================= */
if (quizContainer) {
    /* Shuffle questions when quiz starts */
    shuffledQuestions =
        shuffleArray(quizQuestions);
    /* Load first question */
    loadQuestion();
}
/* =========================================================
   11. INITIAL MESSAGE
========================================================= */
console.log(
    "THERMPYX Quiz: ready."
);
console.log(
    "Question order: randomized."
);
console.log(
    "Answer order: randomized."
);