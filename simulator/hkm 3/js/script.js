/* =====================================================
   HUKUM III TERMODINAMIKA
   THIRD LAW OF THERMODYNAMICS
===================================================== */


/* =====================================================
   ELEMENT
===================================================== */

const unitSelect =
    document.getElementById("unitSelect");

const temperatureInput =
    document.getElementById("temperatureInput");

const temperatureValue =
    document.getElementById("temperatureValue");

const temperatureBadge =
    document.getElementById("temperatureBadge");

const temperatureDisplay =
    document.getElementById("temperatureDisplay");

const temperatureAlt =
    document.getElementById("temperatureAlt");

const entropyDisplay =
    document.getElementById("entropyDisplay");

const motionDisplay =
    document.getElementById("motionDisplay");

const motionValue =
    document.getElementById("motionValue");

const orderDisplay =
    document.getElementById("orderDisplay");

const orderValue =
    document.getElementById("orderValue");

const absoluteZeroDisplay =
    document.getElementById("absoluteZeroDisplay");

const distanceDisplay =
    document.getElementById("distanceDisplay");

const orderLabel =
    document.getElementById("orderLabel");

const temperatureInfo =
    document.getElementById("temperatureInfo");

const startBtn =
    document.getElementById("startBtn");

const pauseBtn =
    document.getElementById("pauseBtn");

const resetBtn =
    document.getElementById("resetBtn");

const crystalContainer =
    document.getElementById("crystalContainer");

const crystalParticles =
    document.querySelectorAll(
        ".crystal-particle"
    );

const entropyGraph =
    document.getElementById("entropyGraph");


/* =====================================================
   KONSTANTA
===================================================== */

const INITIAL_TEMPERATURE_K = 300;

const MIN_TEMPERATURE_K = 0.1;

const MAX_TEMPERATURE_K = 500;


/* =====================================================
   STATE
===================================================== */

let temperatureK =
    INITIAL_TEMPERATURE_K;

let initialTemperatureK =
    INITIAL_TEMPERATURE_K;

let selectedUnit =
    "kelvin";

let isRunning =
    false;

let animationFrame =
    null;

let simulationTime =
    0;

let lastTimestamp =
    null;

let particleData = [];


/* =====================================================
   KONVERSI
===================================================== */

function kelvinToCelsius(kelvin) {

    return kelvin - 273.15;

}


function celsiusToKelvin(celsius) {

    return celsius + 273.15;

}


/* =====================================================
   FORMAT TEMPERATURE
===================================================== */

function formatTemperature(kelvin) {

    if (selectedUnit === "celsius") {

        return (
            kelvinToCelsius(kelvin)
                .toFixed(2) +
            " °C"
        );

    }

    return (
        kelvin.toFixed(2) +
        " K"
    );

}


/* =====================================================
   ENTROPY
===================================================== */

/*
   Untuk visualisasi:

   S / S₀ = (T / T₀)³

   sehingga:

   T → 0 K
   S → 0
*/

function calculateRelativeEntropy() {

    if (temperatureK <= 0) {
        return 0;
    }

    const ratio =
        temperatureK /
        initialTemperatureK;

    return Math.pow(
        ratio,
        3
    );

}


/* =====================================================
   PARTICLE MOTION
===================================================== */

function calculateParticleMotion() {

    const ratio =
        temperatureK /
        MAX_TEMPERATURE_K;

    return Math.max(
        0.01,
        Math.min(
            1,
            ratio
        )
    );

}


/* =====================================================
   CRYSTAL ORDER
===================================================== */

function calculateCrystalOrder() {

    const ratio =
        temperatureK /
        MAX_TEMPERATURE_K;

    return Math.max(
        0,
        Math.min(
            100,
            100 - ratio * 100
        )
    );

}


/* =====================================================
   MOTION LABEL
===================================================== */

function getMotionLabel(
    motion
) {

    if (motion > 0.75) {
        return "Sangat tinggi";
    }

    if (motion > 0.50) {
        return "Tinggi";
    }

    if (motion > 0.25) {
        return "Sedang";
    }

    if (motion > 0.08) {
        return "Rendah";
    }

    return "Sangat rendah";

}


/* =====================================================
   ORDER LABEL
===================================================== */

function getCrystalOrderLabel(
    order
) {

    if (order >= 90) {
        return "Sangat tinggi";
    }

    if (order >= 70) {
        return "Tinggi";
    }

    if (order >= 45) {
        return "Sedang";
    }

    if (order >= 20) {
        return "Rendah";
    }

    return "Sangat rendah";

}


/* =====================================================
   TEMPERATURE INFORMATION
===================================================== */

function updateTemperatureInfo() {

    if (temperatureK <= 1) {

        temperatureInfo.textContent =
            "Temperatur sangat mendekati nol absolut. " +
            "Gerakan termal partikel sangat kecil dan " +
            "entropi kristal sempurna mendekati nol.";

        return;
    }


    if (temperatureK <= 20) {

        temperatureInfo.textContent =
            "Sistem berada pada temperatur yang sangat rendah. " +
            "Partikel hanya mengalami getaran kecil di sekitar " +
            "posisi keseimbangannya.";

        return;
    }


    if (temperatureK <= 100) {

        temperatureInfo.textContent =
            "Ketika temperatur semakin rendah, gerakan termal " +
            "partikel berkurang dan keteraturan kristal meningkat.";

        return;
    }


    if (temperatureK <= 300) {

        temperatureInfo.textContent =
            "Temperatur sedang menyebabkan partikel tetap " +
            "bergetar di sekitar posisi keseimbangannya.";

        return;
    }


    temperatureInfo.textContent =
        "Temperatur yang lebih tinggi menyebabkan energi termal " +
        "dan gerakan partikel menjadi lebih besar.";

}


/* =====================================================
   UPDATE DISPLAY
===================================================== */

function updateDisplays() {

    const entropy =
        calculateRelativeEntropy();

    const motion =
        calculateParticleMotion();

    const order =
        calculateCrystalOrder();


    /* TEMPERATURE */

    temperatureValue.textContent =
        formatTemperature(
            temperatureK
        );

    temperatureBadge.textContent =
        formatTemperature(
            temperatureK
        );

    temperatureDisplay.textContent =
        formatTemperature(
            temperatureK
        );


    /* ALTERNATE UNIT */

    if (selectedUnit === "kelvin") {

        temperatureAlt.textContent =
            kelvinToCelsius(
                temperatureK
            ).toFixed(2) +
            " °C";

    } else {

        temperatureAlt.textContent =
            temperatureK.toFixed(2) +
            " K";

    }


    /* ENTROPY */

    entropyDisplay.textContent =
        entropy.toFixed(4);


    /* MOTION */

    motionDisplay.textContent =
        getMotionLabel(
            motion
        );

    motionValue.textContent =
        (motion * 100).toFixed(1) +
        "%";


    /* ORDER */

    const orderText =
        getCrystalOrderLabel(
            order
        );

    orderDisplay.textContent =
        orderText;

    orderValue.textContent =
        order.toFixed(1) +
        "%";

    orderLabel.textContent =
        "Keteraturan " +
        orderText.toLowerCase();


    /* ABSOLUTE ZERO */

    absoluteZeroDisplay.textContent =
        formatTemperature(
            temperatureK
        );


    /* DISTANCE */

    distanceDisplay.textContent =
        temperatureK.toFixed(2) +
        " K";


    /* INFO */

    updateTemperatureInfo();


    /* VISUAL */

    updateParticleVisual();

}


/* =====================================================
   PARTICLE VISUAL
===================================================== */

function updateParticleVisual() {

    const motion =
        calculateParticleMotion();

    const order =
        calculateCrystalOrder();


    crystalParticles.forEach(
        particle => {

            const scale =
                0.80 +
                motion * 0.20;

            particle.style.boxShadow =
                `
                0 0 ${
                    5 + motion * 15
                }px rgba(
                    6,
                    182,
                    212,
                    ${0.10 + motion * 0.25}
                )
                `;

        }
    );


    if (order >= 80) {

        crystalContainer.style.boxShadow =
            "inset 0 0 65px rgba(37, 99, 235, 0.08)";

    } else {

        crystalContainer.style.boxShadow =
            "inset 0 0 50px rgba(37, 99, 235, 0.035)";

    }

}


/* =====================================================
   CREATE PARTICLES
===================================================== */

function createParticleData() {

    particleData = [];


    crystalParticles.forEach(
        (particle, index) => {

            particleData.push({

                element: particle,

                phaseX:
                    Math.random() *
                    Math.PI *
                    2,

                phaseY:
                    Math.random() *
                    Math.PI *
                    2,

                speedX:
                    0.8 +
                    Math.random() *
                    0.5,

                speedY:
                    0.8 +
                    Math.random() *
                    0.5,

                index

            });

        }
    );

}


/* =====================================================
   PARTICLE ANIMATION
===================================================== */

function animateParticles(
    timestamp
) {

    const motion =
        calculateParticleMotion();


    particleData.forEach(
        particle => {

            /*
               Partikel bergetar di sekitar
               posisi kisi kristal.
            */

            const vibration =
                motion * 4.5;


            const x =
                Math.sin(
                    timestamp * 0.004 *
                    particle.speedX +
                    particle.phaseX
                ) *
                vibration;


            const y =
                Math.cos(
                    timestamp * 0.004 *
                    particle.speedY +
                    particle.phaseY
                ) *
                vibration;


            particle.element.style.transform =
                `translate(${x}px, ${y}px)`;

        }
    );

}


/* =====================================================
   SIMULATION LOOP
===================================================== */

function simulationLoop(
    timestamp
) {

    if (!isRunning) {
        return;
    }


    animateParticles(
        timestamp
    );


    animationFrame =
        requestAnimationFrame(
            simulationLoop
        );

}


/* =====================================================
   START
===================================================== */

function startSimulation() {

    if (isRunning) {
        return;
    }


    isRunning = true;

    lastTimestamp = null;

    startBtn.disabled = true;

    pauseBtn.disabled = false;


    animationFrame =
        requestAnimationFrame(
            simulationLoop
        );

}


/* =====================================================
   PAUSE
===================================================== */

function pauseSimulation() {

    isRunning = false;

    startBtn.disabled = false;

    pauseBtn.disabled = true;


    if (
        animationFrame !== null
    ) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;

    }

}


/* =====================================================
   RESET
===================================================== */

function resetSimulation() {

    pauseSimulation();


    temperatureK =
        initialTemperatureK;


    simulationTime = 0;


    updateSliderValue();

    updateDisplays();

    drawEntropyGraph();


    crystalParticles.forEach(
        particle => {

            particle.style.transform =
                "translate(0px, 0px)";

        }
    );

}


/* =====================================================
   UPDATE SLIDER
===================================================== */

function updateSliderValue() {

    if (
        selectedUnit === "kelvin"
    ) {

        temperatureInput.min =
            "0.1";

        temperatureInput.max =
            "500";

        temperatureInput.step =
            "0.1";

        temperatureInput.value =
            temperatureK;

        return;
    }


    temperatureInput.min =
        "-273.05";

    temperatureInput.max =
        "226.85";

    temperatureInput.step =
        "0.1";

    temperatureInput.value =
        kelvinToCelsius(
            temperatureK
        );

}


/* =====================================================
   READ SLIDER
===================================================== */

function readTemperatureFromSlider() {

    const value =
        parseFloat(
            temperatureInput.value
        );


    if (
        !Number.isFinite(value)
    ) {
        return;
    }


    if (
        selectedUnit === "kelvin"
    ) {

        temperatureK =
            Math.max(
                MIN_TEMPERATURE_K,
                Math.min(
                    MAX_TEMPERATURE_K,
                    value
                )
            );

    } else {

        temperatureK =
            celsiusToKelvin(
                value
            );

        temperatureK =
            Math.max(
                MIN_TEMPERATURE_K,
                Math.min(
                    MAX_TEMPERATURE_K,
                    temperatureK
                )
            );

    }


    updateDisplays();

    drawEntropyGraph();

}


/* =====================================================
   CHANGE UNIT
===================================================== */

function changeUnit() {

    selectedUnit =
        unitSelect.value;

    updateSliderValue();

    updateDisplays();

    drawEntropyGraph();

}


/* =====================================================
   ENTROPY GRAPH
===================================================== */

function drawEntropyGraph() {

    if (!entropyGraph) {
        return;
    }


    const canvas =
        entropyGraph;

    const ctx =
        canvas.getContext(
            "2d"
        );


    const rect =
        canvas.getBoundingClientRect();


    const width =
        Math.max(
            300,
            Math.floor(
                rect.width
            )
        );

    const height =
        Math.max(
            220,
            Math.floor(
                rect.height
            )
        );


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width * dpr;

    canvas.height =
        height * dpr;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* =================================================
       GRAPH AREA
    ================================================= */

    const left = 58;

    const right =
        width - 25;

    const top = 25;

    const bottom =
        height - 45;

    const graphWidth =
        right - left;

    const graphHeight =
        bottom - top;


    /* BACKGROUND */

    ctx.fillStyle =
        "#FAFCFF";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /* =================================================
       GRID
    ================================================= */

    ctx.strokeStyle =
        "#E3EAF3";

    ctx.lineWidth = 1;


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const y =
            top +
            graphHeight *
            (i / 5);


        ctx.beginPath();

        ctx.moveTo(
            left,
            y
        );

        ctx.lineTo(
            right,
            y
        );

        ctx.stroke();

    }


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const x =
            left +
            graphWidth *
            (i / 5);


        ctx.beginPath();

        ctx.moveTo(
            x,
            top
        );

        ctx.lineTo(
            x,
            bottom
        );

        ctx.stroke();

    }


    /* =================================================
       AXIS
    ================================================= */

    ctx.strokeStyle =
        "#64748B";

    ctx.lineWidth =
        1.4;


    ctx.beginPath();

    ctx.moveTo(
        left,
        top
    );

    ctx.lineTo(
        left,
        bottom
    );

    ctx.lineTo(
        right,
        bottom
    );

    ctx.stroke();


    /* =================================================
       AXIS LABEL
    ================================================= */

    ctx.fillStyle =
        "#475569";

    ctx.font =
        "12px Inter, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "Temperature (K)",
        left +
        graphWidth / 2,
        height - 12
    );


    ctx.save();

    ctx.translate(
        16,
        top +
        graphHeight / 2
    );

    ctx.rotate(
        -Math.PI / 2
    );

    ctx.fillText(
        "Relative Entropy",
        0,
        0
    );

    ctx.restore();


    /* =================================================
       CURVE
    ================================================= */

    ctx.beginPath();


    const points = 150;


    for (
        let i = 0;
        i <= points;
        i++
    ) {

        const ratio =
            i / points;


        const x =
            left +
            ratio *
            graphWidth;


        const entropy =
            Math.pow(
                ratio,
                3
            );


        const y =
            bottom -
            entropy *
            graphHeight;


        if (i === 0) {

            ctx.moveTo(
                x,
                y
            );

        } else {

            ctx.lineTo(
                x,
                y
            );

        }

    }


    ctx.strokeStyle =
        "#2563EB";

    ctx.lineWidth = 3;

    ctx.lineJoin =
        "round";

    ctx.lineCap =
        "round";

    ctx.stroke();


    /* =================================================
       CURRENT POINT
    ================================================= */

    const currentTemperature =
        Math.max(
            0,
            Math.min(
                MAX_TEMPERATURE_K,
                temperatureK
            )
        );


    const currentRatio =
        currentTemperature /
        MAX_TEMPERATURE_K;


    const currentEntropy =
        Math.pow(
            currentRatio,
            3
        );


    const pointX =
        left +
        currentRatio *
        graphWidth;


    const pointY =
        bottom -
        currentEntropy *
        graphHeight;


    ctx.beginPath();

    ctx.arc(
        pointX,
        pointY,
        6,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#0891B2";

    ctx.fill();


    ctx.strokeStyle =
        "#FFFFFF";

    ctx.lineWidth = 2;

    ctx.stroke();


    /* =================================================
       AXIS VALUES
    ================================================= */

    ctx.fillStyle =
        "#64748B";

    ctx.font =
        "11px Inter, sans-serif";

    ctx.textAlign =
        "left";

    ctx.fillText(
        "0 K",
        left - 5,
        bottom + 25
    );


    ctx.textAlign =
        "right";

    ctx.fillText(
        "500 K",
        right,
        bottom + 25
    );


    /* =================================================
       CURRENT TEMPERATURE
    ================================================= */

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#172033";

    ctx.font =
        "600 12px Inter, sans-serif";


    let labelX =
        pointX + 10;

    let labelY =
        pointY - 10;


    if (
        labelX + 100 >
        width
    ) {

        labelX =
            pointX - 100;

    }


    if (
        labelY < 15
    ) {

        labelY =
            pointY + 20;

    }


    ctx.fillText(
        `T = ${temperatureK.toFixed(1)} K`,
        labelX,
        labelY
    );

}


/* =====================================================
   RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        drawEntropyGraph();

    }
);


/* =====================================================
   EVENTS
===================================================== */

temperatureInput.addEventListener(
    "input",
    () => {

        readTemperatureFromSlider();

    }
);


unitSelect.addEventListener(
    "change",
    () => {

        changeUnit();

    }
);


startBtn.addEventListener(
    "click",
    () => {

        startSimulation();

    }
);


pauseBtn.addEventListener(
    "click",
    () => {

        pauseSimulation();

    }
);


resetBtn.addEventListener(
    "click",
    () => {

        resetSimulation();

    }
);


/* =====================================================
   INITIALIZE
===================================================== */

function initialize() {

    temperatureK =
        INITIAL_TEMPERATURE_K;

    initialTemperatureK =
        INITIAL_TEMPERATURE_K;

    selectedUnit =
        unitSelect.value ||
        "kelvin";

    isRunning = false;

    pauseBtn.disabled = true;

    createParticleData();

    updateSliderValue();

    updateDisplays();

    drawEntropyGraph();

}


/* =====================================================
   RUN
===================================================== */

initialize();