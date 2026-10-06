/* =====================================================
   HEAT & TEMPERATURE SIMULATION
   THERMPYX
===================================================== */


/* =====================================================
   MATERIAL DATA
===================================================== */

const materials = {

    water: {
        name: "Water",
        c: 4200
    },

    aluminum: {
        name: "Aluminum",
        c: 900
    },

    iron: {
        name: "Iron",
        c: 450
    },

    copper: {
        name: "Copper",
        c: 385
    }

};


/* =====================================================
   DOM ELEMENTS
===================================================== */

const beaker =
    document.getElementById("beaker");

const liquid =
    document.getElementById("liquid");

const flame =
    document.getElementById("flame");

const heatSourceValue =
    document.getElementById("heatSourceValue");

const thermometer =
    document.getElementById("thermometer");

const mercury =
    document.getElementById("mercury");

const thermoRead =
    document.getElementById("thermoRead");

const particlesContainer =
    document.getElementById("particles");

const materialLabel =
    document.getElementById("materialLabel");

const materialName =
    document.getElementById("materialName");

const motion =
    document.getElementById("motion");

const simulationTooltip =
    document.getElementById(
        "simulationTooltip"
    );

const graph =
    document.getElementById("heatGraph");

const graphContainer =
    document.getElementById(
        "graphContainer"
    );

const graphTooltip =
    document.getElementById(
        "graphTooltip"
    );

const qSlider =
    document.getElementById("q");

const mSlider =
    document.getElementById("m");

const materialSelect =
    document.getElementById("material");

const qValue =
    document.getElementById("qValue");

const mValue =
    document.getElementById("mValue");

const cValue =
    document.getElementById("c");

const dq =
    document.getElementById("dq");

const temp =
    document.getElementById("temp");

const dt =
    document.getElementById("dt");

const startButton =
    document.getElementById("start");

const pauseButton =
    document.getElementById("pause");

const resetButton =
    document.getElementById("reset");

const status =
    document.getElementById("status");

/* =====================================================
   STATE
===================================================== */

const INITIAL_TEMPERATURE = 25;

const state = {

    q: 0,

    m: 1,

    c: 4200,

    material: "water",

    initialTemperature:
        INITIAL_TEMPERATURE,

    temperature:
        INITIAL_TEMPERATURE,

    running: false,

    /*
        Grafik hanya berisi data pemanasan aktual.
        Tidak ada kurva yang dibuat sebelum Start.
    */
    graphData: []

};


/* =====================================================
   PARTICLES
===================================================== */

const particleData = [];

const PARTICLE_COUNT = 40;


function createParticles() {

    particlesContainer.innerHTML = "";

    particleData.length = 0;


    for (
        let i = 0;
        i < PARTICLE_COUNT;
        i++
    ) {

        const particle =
            document.createElement("div");


        particle.className =
            "particle";


        const x =
            5 +
            Math.random() * 90;


        const y =
            5 +
            Math.random() * 88;


        particle.style.left =
            `${x}%`;


        particle.style.top =
            `${y}%`;


        particlesContainer.appendChild(
            particle
        );


        particleData.push({

            element:
                particle,

            x:
                x,

            y:
                y,

            vx:
                (
                    Math.random() > .5
                        ? 1
                        : -1
                )
                *
                (
                    .5 +
                    Math.random()
                ),

            vy:
                (
                    Math.random() > .5
                        ? 1
                        : -1
                )
                *
                (
                    .5 +
                    Math.random()
                )

        });

    }

}


/* =====================================================
   NUMBER FORMAT
===================================================== */

function formatNumber(value) {

    return Number(value).toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 1
        }
    );

}


/* =====================================================
   TEMPERATURE CALCULATION
===================================================== */

function calculateTemperature() {

    const deltaT =
        state.q /
        (
            state.m *
            state.c
        );


    state.temperature =
        state.initialTemperature +
        deltaT;

}


/* =====================================================
   UPDATE DISPLAY
===================================================== */

function updateDisplay() {

    const deltaT =
        state.temperature -
        state.initialTemperature;


    qValue.textContent =
        formatNumber(state.q) +
        " J";


    heatSourceValue.textContent =
        formatNumber(state.q) +
        " J";


    mValue.textContent =
        state.m.toFixed(1) +
        " kg";


    cValue.textContent =
        formatNumber(state.c);


    dq.textContent =
        formatNumber(state.q) +
        " J";


    temp.textContent =
        state.temperature.toFixed(1) +
        " °C";


    dt.textContent =
        deltaT.toFixed(1) +
        " °C";


    thermoRead.textContent =
        state.temperature.toFixed(1) +
        " °C";


    materialName.textContent =
        materials[
            state.material
        ].name;


    updateMotionText(
        state.temperature
    );


    updateThermometer(
        state.temperature
    );


    updateFlame(
        deltaT
    );


    updateLiquid(
        state.temperature
    );


    updateSimulationTooltip();

}


/* =====================================================
   MOTION TEXT
===================================================== */

function updateMotionText(
    temperature
) {

    if (
        temperature < 35
    ) {

        motion.textContent =
            "Low particle motion";

    }

    else if (
        temperature < 60
    ) {

        motion.textContent =
            "Moderate particle motion";

    }

    else if (
        temperature < 90
    ) {

        motion.textContent =
            "High particle motion";

    }

    else {

        motion.textContent =
            "Very high particle motion";

    }

}


/* =====================================================
   THERMOMETER
===================================================== */

function updateThermometer(
    temperature
) {

    const min =
        0;

    const max =
        100;


    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                (
                    (
                        temperature -
                        min
                    ) /
                    (
                        max -
                        min
                    )
                ) *
                100
            )
        );


    mercury.style.height =
        `${percentage}%`;

}


/* =====================================================
   FLAME
===================================================== */

function updateFlame(
    deltaT
) {

    const flameIntensity =
        Math.min(
            1,
            Math.max(
                0,
                deltaT / 100
            )
        );


    flame.style.opacity =
        .45 +
        flameIntensity * .55;

}


/* =====================================================
   LIQUID
===================================================== */

function updateLiquid(
    temperature
) {

    const intensity =
        Math.min(
            1,
            Math.max(
                0,
                (
                    temperature -
                    25
                ) / 100
            )
        );


    liquid.style.background =
        `linear-gradient(
            to bottom,

            rgba(
                0,
                ${168 + intensity * 35},
                255,
                ${.25 + intensity * .15}
            ),

            rgba(
                0,
                107,
                175,
                .23
            )
        )`;

}


/* =====================================================
   PARTICLE ANIMATION
===================================================== */

function animateParticles() {

    /*
        Kecepatan partikel mengikuti temperatur.

        25°C  = sangat lambat
        50°C  = mulai cepat
        75°C  = cepat
        100°C = sangat cepat

        Dibuat jauh lebih responsif dibanding versi awal.
    */

    const deltaT =
        Math.max(
            0,
            state.temperature -
            state.initialTemperature
        );


    const temperatureRatio =
        Math.min(
            1,
            deltaT / 75
        );


    /*
        Base speed sangat kecil ketika suhu masih 25°C.
        Saat mendekati 100°C, speed meningkat drastis.
    */

    const speed =
        .45 +
        Math.pow(
            temperatureRatio,
            1.05
        ) *
        11;


    particleData.forEach(
        particle => {

            particle.x +=
                particle.vx *
                speed *
                .045;


            particle.y +=
                particle.vy *
                speed *
                .045;


            if (
                particle.x <= 3 ||
                particle.x >= 94
            ) {

                particle.vx *= -1;

            }


            if (
                particle.y <= 3 ||
                particle.y >= 94
            ) {

                particle.vy *= -1;

            }


            particle.x =
                Math.max(
                    3,
                    Math.min(
                        94,
                        particle.x
                    )
                );


            particle.y =
                Math.max(
                    3,
                    Math.min(
                        94,
                        particle.y
                    )
                );


            particle.element.style.left =
                `${particle.x}%`;


            particle.element.style.top =
                `${particle.y}%`;

        }
    );


    requestAnimationFrame(
        animateParticles
    );

}


/* =====================================================
   SIMULATION TOOLTIP
===================================================== */

function updateSimulationTooltip() {

    const deltaT =
        state.temperature -
        state.initialTemperature;


    simulationTooltip.innerHTML = `

        <strong>
            ${materials[
                state.material
            ].name}
        </strong>

        <span>
            Temperature:
            ${state.temperature.toFixed(1)}
            °C
        </span>

        <span>
            Heat:
            ${formatNumber(state.q)}
            J
        </span>

        <span>
            ΔT:
            ${deltaT.toFixed(1)}
            °C
        </span>

    `;

}


/* =====================================================
   SHOW TOOLTIP
===================================================== */

function showSimulationTooltip(
    event
) {

    const scene =
        document.getElementById(
            "scene"
        );


    const rect =
        scene.getBoundingClientRect();


    let x =
        event.clientX -
        rect.left +
        15;


    let y =
        event.clientY -
        rect.top +
        15;


    const tooltipWidth =
        190;


    const tooltipHeight =
        105;


    if (
        x + tooltipWidth >
        rect.width
    ) {

        x =
            event.clientX -
            rect.left -
            tooltipWidth -
            15;

    }


    if (
        y + tooltipHeight >
        rect.height
    ) {

        y =
            event.clientY -
            rect.top -
            tooltipHeight -
            15;

    }


    simulationTooltip.style.left =
        `${x}px`;


    simulationTooltip.style.top =
        `${y}px`;


    simulationTooltip.style.display =
        "block";

}


function hideSimulationTooltip() {

    simulationTooltip.style.display =
        "none";

}


/* =====================================================
   BEAKER HOVER
===================================================== */

beaker.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


beaker.addEventListener(
    "mouseenter",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


beaker.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   LIQUID HOVER
===================================================== */

liquid.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


liquid.addEventListener(
    "mouseenter",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


liquid.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   FLAME HOVER
===================================================== */

flame.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


flame.addEventListener(
    "mouseenter",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


flame.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   THERMOMETER HOVER
===================================================== */

thermometer.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


thermometer.addEventListener(
    "mouseenter",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


thermometer.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   MATERIAL LABEL HOVER
===================================================== */

materialLabel.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


materialLabel.addEventListener(
    "mouseenter",
    event => {

        showSimulationTooltip(
            event
        );

    }
);


materialLabel.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   PARTICLE HOVER
===================================================== */

particlesContainer.addEventListener(
    "mousemove",
    event => {

        if (
            event.target.classList.contains(
                "particle"
            )
        ) {

            showSimulationTooltip(
                event
            );

        }

    }
);


particlesContainer.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   GRAPH SETUP
===================================================== */

const ctx =
    graph.getContext("2d");


function resizeGraph() {

    const rect =
        graphContainer.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    graph.width =
        rect.width * dpr;


    graph.height =
        rect.height * dpr;


    graph.style.width =
        `${rect.width}px`;


    graph.style.height =
        `${rect.height}px`;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    drawGraph();

}


window.addEventListener(
    "resize",
    resizeGraph
);


/* =====================================================
   GRAPH DATA
===================================================== */

/*
    Hapus seluruh data grafik.
*/

function clearGraphData() {

    state.graphData =
        [];

}


/*
    Tambahkan SATU titik aktual
    setiap kali pemanasan menambah kalor.
*/

function recordGraphPoint() {

    state.graphData.push({

        q:
            state.q,

        temperature:
            state.temperature,

        deltaT:
            state.temperature -
            state.initialTemperature

    });

}


/* =====================================================
   DRAW GRAPH
===================================================== */

function drawGraph() {

    if (
        !graphContainer
    ) {

        return;

    }


    const width =
        graphContainer.clientWidth;


    const height =
        graphContainer.clientHeight;


    if (
        width <= 0 ||
        height <= 0
    ) {

        return;

    }


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const padding = {

        left: 60,

        right: 25,

        top: 25,

        bottom: 45

    };


    const plotWidth =
        width -
        padding.left -
        padding.right;


    const plotHeight =
        height -
        padding.top -
        padding.bottom;


    const maxQ =
        Math.max(
            300000,
            Number(qSlider.max)
        );


    const maxTemperature =
        Math.max(
            100,
            state.initialTemperature +
            maxQ /
            (
                state.m *
                state.c
            )
        );


    /* -------------------------------------------------
       GRID
    ------------------------------------------------- */

    ctx.strokeStyle =
        "rgba(148,164,184,.12)";


    ctx.lineWidth =
        1;


    const horizontalLines =
        5;


    for (
        let i = 0;
        i <= horizontalLines;
        i++
    ) {

        const y =
            padding.top +
            (
                plotHeight /
                horizontalLines
            ) *
            i;


        ctx.beginPath();


        ctx.moveTo(
            padding.left,
            y
        );


        ctx.lineTo(
            width -
            padding.right,
            y
        );


        ctx.stroke();

    }


    const verticalLines =
        6;


    for (
        let i = 0;
        i <= verticalLines;
        i++
    ) {

        const x =
            padding.left +
            (
                plotWidth /
                verticalLines
            ) *
            i;


        ctx.beginPath();


        ctx.moveTo(
            x,
            padding.top
        );


        ctx.lineTo(
            x,
            height -
            padding.bottom
        );


        ctx.stroke();

    }


    /* -------------------------------------------------
       AXES
    ------------------------------------------------- */

    ctx.strokeStyle =
        "rgba(148,164,184,.55)";


    ctx.lineWidth =
        1.5;


    ctx.beginPath();


    ctx.moveTo(
        padding.left,
        padding.top
    );


    ctx.lineTo(
        padding.left,
        height -
        padding.bottom
    );


    ctx.lineTo(
        width -
        padding.right,
        height -
        padding.bottom
    );


    ctx.stroke();


    /* -------------------------------------------------
       AXIS LABELS
    ------------------------------------------------- */

    ctx.fillStyle =
        "#94a4b8";


    ctx.font =
        "11px Inter";


    ctx.textAlign =
        "center";


    for (
        let i = 0;
        i <= verticalLines;
        i++
    ) {

        const q =
            (
                maxQ /
                verticalLines
            ) *
            i;


        const x =
            padding.left +
            (
                plotWidth /
                verticalLines
            ) *
            i;


        ctx.fillText(
            formatNumber(q),
            x,
            height - 18
        );

    }


    ctx.textAlign =
        "right";


    for (
        let i = 0;
        i <= horizontalLines;
        i++
    ) {

        const temperature =
            maxTemperature -
            (
                (
                    maxTemperature -
                    state.initialTemperature
                ) /
                horizontalLines
            ) *
            i;


        const y =
            padding.top +
            (
                plotHeight /
                horizontalLines
            ) *
            i;


        ctx.fillText(
            temperature.toFixed(0) +
            "°C",
            padding.left - 8,
            y + 4
        );

    }


    /* -------------------------------------------------
       AXIS TITLES
    ------------------------------------------------- */

    ctx.fillStyle =
        "#66778c";


    ctx.font =
        "12px Inter";


    ctx.textAlign =
        "center";


    ctx.fillText(
        (window.TPX?.t("Heat Q (J)", "Kalor Q (J)") ?? "Heat Q (J)"),
        padding.left +
        plotWidth / 2,
        height - 3
    );


    ctx.save();


    ctx.translate(
        15,
        padding.top +
        plotHeight / 2
    );


    ctx.rotate(
        -Math.PI / 2
    );


    ctx.fillText(
        (window.TPX?.t("Temperature T (°C)", "Temperatur T (°C)") ?? "Temperature T (°C)"),
        0,
        0
    );


    ctx.restore();


    /* -------------------------------------------------
       GRAPH LINE
    ------------------------------------------------- */

    /*
        Kalau belum Start:
        state.graphData masih kosong,
        jadi TIDAK ada garis.
    */

    if (
        state.graphData.length > 0
    ) {

        ctx.beginPath();


        state.graphData.forEach(
            (point, index) => {

                const x =
                    padding.left +
                    (
                        point.q /
                        maxQ
                    ) *
                    plotWidth;


                const y =
                    padding.top +
                    (
                        1 -
                        (
                            (
                                point.temperature -
                                state.initialTemperature
                            ) /
                            (
                                maxTemperature -
                                state.initialTemperature
                            )
                        )
                    ) *
                    plotHeight;


                if (
                    index === 0
                ) {

                    ctx.moveTo(
                        x,
                        y
                    );

                }

                else {

                    ctx.lineTo(
                        x,
                        y
                    );

                }

            }
        );


        ctx.strokeStyle =
            "#00a8ff";


        ctx.lineWidth =
            3;


        ctx.stroke();


        /* -------------------------------------------------
           GRAPH POINTS
        ------------------------------------------------- */

        state.graphData.forEach(
            point => {

                const x =
                    padding.left +
                    (
                        point.q /
                        maxQ
                    ) *
                    plotWidth;


                const y =
                    padding.top +
                    (
                        1 -
                        (
                            (
                                point.temperature -
                                state.initialTemperature
                            ) /
                            (
                                maxTemperature -
                                state.initialTemperature
                            )
                        )
                    ) *
                    plotHeight;


                ctx.beginPath();


                ctx.arc(
                    x,
                    y,
                    3.5,
                    0,
                    Math.PI * 2
                );


                ctx.fillStyle =
                    "#00c8ff";


                ctx.fill();

            }
        );


        /* -------------------------------------------------
           CURRENT POINT
        ------------------------------------------------- */

        const currentQ =
            state.q;


        const currentTemperature =
            state.temperature;


        const currentX =
            padding.left +
            (
                currentQ /
                maxQ
            ) *
            plotWidth;


        const currentY =
            padding.top +
            (
                1 -
                (
                    (
                        currentTemperature -
                        state.initialTemperature
                    ) /
                    (
                        maxTemperature -
                        state.initialTemperature
                    )
                )
            ) *
            plotHeight;


        ctx.beginPath();


        ctx.arc(
            currentX,
            currentY,
            6,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffffff";


        ctx.fill();


        ctx.strokeStyle =
            "#00c8ff";


        ctx.lineWidth =
            2;


        ctx.stroke();

    }

}


/* =====================================================
   GRAPH HOVER
===================================================== */

graph.addEventListener(
    "mousemove",
    event => {

        const rect =
            graph.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;


        const mouseY =
            event.clientY -
            rect.top;


        const width =
            rect.width;


        const height =
            rect.height;


        const padding = {

            left: 60,

            right: 25,

            top: 25,

            bottom: 45

        };


        const plotWidth =
            width -
            padding.left -
            padding.right;


        const plotHeight =
            height -
            padding.top -
            padding.bottom;


        if (
            mouseX <
                padding.left ||
            mouseX >
                width -
                padding.right ||
            mouseY <
                padding.top ||
            mouseY >
                height -
                padding.bottom
        ) {

            graphTooltip.style.display =
                "none";


            return;

        }


        const maxQ =
            Math.max(
                300000,
                Number(qSlider.max)
            );


        const maxTemperature =
            Math.max(
                100,
                state.initialTemperature +
                maxQ /
                (
                    state.m *
                    state.c
                )
            );


        const q =
            (
                (
                    mouseX -
                    padding.left
                ) /
                plotWidth
            ) *
            maxQ;


        const temperature =
            state.initialTemperature +
            q /
            (
                state.m *
                state.c
            );


        const deltaT =
            temperature -
            state.initialTemperature;


        graphTooltip.innerHTML = `

            <strong>
                Heat-Temperature
            </strong>

            <span>
                Q:
                ${formatNumber(q)}
                J
            </span>

            <span>
                T:
                ${temperature.toFixed(1)}
                °C
            </span>

            <span>
                ΔT:
                ${deltaT.toFixed(1)}
                °C
            </span>

        `;


        let tooltipX =
            mouseX + 15;


        let tooltipY =
            mouseY + 15;


        if (
            tooltipX + 160 >
            width
        ) {

            tooltipX =
                mouseX - 175;

        }


        if (
            tooltipY + 105 >
            height
        ) {

            tooltipY =
                mouseY - 110;

        }


        graphTooltip.style.left =
            `${tooltipX}px`;


        graphTooltip.style.top =
            `${tooltipY}px`;


        graphTooltip.style.display =
            "block";

    }
);


graph.addEventListener(
    "mouseleave",
    () => {

        graphTooltip.style.display =
            "none";

    }
);


/* =====================================================
   HEAT SLIDER
===================================================== */

qSlider.addEventListener(
    "input",
    () => {

        state.q =
            Number(qSlider.value);


        calculateTemperature();


        updateDisplay();


        /*
            Slider manual tidak dianggap sebagai
            proses heating otomatis.
            Karena itu grafik dikosongkan.
        */

        clearGraphData();


        drawGraph();

    }
);


/* =====================================================
   MASS SLIDER
===================================================== */

mSlider.addEventListener(
    "input",
    () => {

        state.m =
            Number(mSlider.value);


        calculateTemperature();


        updateDisplay();


        /*
            Perubahan massa mengubah hubungan
            Q dengan T, jadi data grafik lama
            tidak boleh dipertahankan.
        */

        clearGraphData();


        drawGraph();

    }
);


/* =====================================================
   MATERIAL SELECT
===================================================== */

materialSelect.addEventListener(
    "change",
    () => {

        state.material =
            materialSelect.value;


        state.c =
            materials[
                state.material
            ].c;


        calculateTemperature();


        updateDisplay();


        /*
            Perubahan material mengubah specific heat,
            sehingga grafik lama harus dikosongkan.
        */

        clearGraphData();


        drawGraph();

    }
);


/* =====================================================
   START
===================================================== */

startButton.addEventListener(
    "click",
    () => {

        state.running =
            true;


        status.textContent =
            "Running";


        /*
            Saat Start pertama kali:
            catat titik awal Q = 0 dan T = 25°C.

            Kalau sebelumnya Pause,
            grafik tidak dihapus sehingga simulasi
            dapat dilanjutkan.
        */

        if (
            state.graphData.length === 0
        ) {

            recordGraphPoint();


            drawGraph();

        }


        startHeating();

    }
);


/* =====================================================
   PAUSE
===================================================== */

pauseButton.addEventListener(
    "click",
    () => {

        state.running =
            false;


        status.textContent =
            "Paused";

    }
);


/* =====================================================
   HEATING LOOP
===================================================== */

let heatingTimer =
    null;


function startHeating() {

    if (
        heatingTimer !== null
    ) {

        return;

    }


    heatingTimer =
        setInterval(
            () => {

                if (
                    !state.running
                ) {

                    clearInterval(
                        heatingTimer
                    );


                    heatingTimer =
                        null;


                    return;

                }


                const maxQ =
                    Number(
                        qSlider.max
                    );


                /* -----------------------------------------
                   COMPLETE
                ----------------------------------------- */

                if (
                    state.q >= maxQ
                ) {

                    state.q =
                        maxQ;


                    qSlider.value =
                        maxQ;


                    state.running =
                        false;


                    status.textContent =
                        "Complete";


                    clearInterval(
                        heatingTimer
                    );


                    heatingTimer =
                        null;


                    calculateTemperature();


                    /*
                        Tambahkan titik terakhir.
                    */

                    if (
                        state.graphData.length === 0 ||
                        state.graphData[
                            state.graphData.length - 1
                        ].q !== state.q
                    ) {

                        recordGraphPoint();

                    }


                    updateDisplay();


                    drawGraph();


                    return;

                }


                /* -----------------------------------------
                   ADD HEAT

                   750 J setiap 150 ms
                   ≈ 5.000 J/detik

                   Lebih lambat dari versi awal,
                   tetapi masih cukup terlihat.
                ----------------------------------------- */

                state.q +=
                    100;


                if (
                    state.q > maxQ
                ) {

                    state.q =
                        maxQ;

                }


                qSlider.value =
                    state.q;


                calculateTemperature();


                /*
                    TITIK GRAFIK DITAMBAHKAN
                    SETELAH SUHU BERUBAH.

                    Jadi grafik benar-benar mengikuti
                    kenaikan panas secara real-time.
                */

                recordGraphPoint();


                updateDisplay();


                drawGraph();

            },

            150
        );

}


/* =====================================================
   RESET
===================================================== */

resetButton.addEventListener(
    "click",
    () => {

        state.running =
            false;


        if (
            heatingTimer !== null
        ) {

            clearInterval(
                heatingTimer
            );


            heatingTimer =
                null;

        }


        state.q =
            0;


        state.m =
            Number(
                mSlider.value
            );


        state.material =
            materialSelect.value;


        state.c =
            materials[
                state.material
            ].c;


        state.temperature =
            state.initialTemperature;


        qSlider.value =
            0;


        status.textContent =
            "Ready";


        /*
            RESET = grafik kembali kosong.
        */

        clearGraphData();


        updateDisplay();


        drawGraph();

    }
);


/* Refresh the heat graph when the shared THERMPYX theme changes. */
window.addEventListener('thermpyx:themechange', () => drawGraph());

/* =====================================================
   INITIALIZE
===================================================== */

function initialize() {

    state.q =
        Number(
            qSlider.value
        );


    state.m =
        Number(
            mSlider.value
        );


    state.material =
        materialSelect.value;


    state.c =
        materials[
            state.material
        ].c;


    state.temperature =
        state.initialTemperature;


    createParticles();


    /*
        PENTING:
        jangan membuat kurva grafik di sini.
        Grafik harus kosong sebelum Start.
    */

    clearGraphData();


    updateDisplay();


    resizeGraph();

}


/* =====================================================
   RUN
===================================================== */

initialize();


animateParticles();
window.addEventListener("thermpyx:languagechange", () => drawGraph());
