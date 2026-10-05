/* =====================================================
   WORK & ENERGY SIMULATION
   THERMPYX
===================================================== */


/* =====================================================
   STATE
===================================================== */

const state = {

    force: 100,

    targetDisplacement: 0.8,

    displacement: 0,

    energyInput: 500,

    work: 0,

    internalEnergy: 500,

    running: false,

    lastTime: 0

};


/* =====================================================
   BASIC ELEMENTS
===================================================== */

const forceInput =
    document.getElementById("force");

const displacementInput =
    document.getElementById("displacement");

const energyInput =
    document.getElementById("energy");


const forceValue =
    document.getElementById("forceValue");

const displacementValue =
    document.getElementById("displacementValue");

const energyValue =
    document.getElementById("energyValue");


const startButton =
    document.getElementById("start");

const pauseButton =
    document.getElementById("pause");

const resetButton =
    document.getElementById("reset");


const statusBadge =
    document.getElementById("statusBadge");


/* =====================================================
   HEADER
===================================================== */

const backHome =
    document.getElementById("backHome");

const themeButton =
    document.getElementById("themeButton");


/* =====================================================
   SIMULATION ELEMENTS
===================================================== */

const simulationScene =
    document.getElementById(
        "simulationScene"
    );

const cylinder =
    document.getElementById(
        "cylinder"
    );

const gas =
    document.getElementById(
        "gas"
    );

const piston =
    document.getElementById(
        "piston"
    );

const weight =
    document.getElementById(
        "weight"
    );

const particlesContainer =
    document.getElementById(
        "particles"
    );


const energySource =
    document.getElementById(
        "energySource"
    );

const forceIndicator =
    document.getElementById(
        "forceIndicator"
    );

const displacementIndicator =
    document.getElementById(
        "displacementIndicator"
    );


const simulationTooltip =
    document.getElementById(
        "simulationTooltip"
    );

const tooltipTitle =
    document.getElementById(
        "tooltipTitle"
    );

const tooltipValue =
    document.getElementById(
        "tooltipValue"
    );


/* =====================================================
   SCENE VALUES
===================================================== */

const forceSceneValue =
    document.getElementById(
        "forceSceneValue"
    );

const displacementSceneValue =
    document.getElementById(
        "displacementSceneValue"
    );

const energyInputScene =
    document.getElementById(
        "energyInputScene"
    );


/* =====================================================
   DATA VALUES
===================================================== */

const dataForce =
    document.getElementById(
        "dataForce"
    );

const dataDisplacement =
    document.getElementById(
        "dataDisplacement"
    );

const dataWork =
    document.getElementById(
        "dataWork"
    );

const dataInternalEnergy =
    document.getElementById(
        "dataInternalEnergy"
    );


/* =====================================================
   GRAPH
===================================================== */

const graph =
    document.getElementById(
        "workGraph"
    );

const graphContainer =
    document.getElementById(
        "graphContainer"
    );

const graphTooltip =
    document.getElementById(
        "graphTooltip"
    );

const graphTooltipValue =
    document.getElementById(
        "graphTooltipValue"
    );


const graphContext =
    graph.getContext("2d");


let graphDPR = 1;


/* =====================================================
   PARTICLES
===================================================== */

const particles = [];

const PARTICLE_COUNT = 42;


for (
    let i = 0;
    i < PARTICLE_COUNT;
    i++
) {

    const element =
        document.createElement("div");


    element.className =
        "particle";


    const particle = {

        element,

        x:
            5 +
            ((i * 37) % 88),

        y:
            5 +
            ((i * 53) % 88),

        vx:
            i % 2 === 0
                ? 1
                : -1,

        vy:
            i % 3 === 0
                ? 1
                : -1

    };


    element.style.left =
        particle.x + "%";


    element.style.top =
        particle.y + "%";


    /*
        Hide particles initially.
    */

    element.style.opacity =
        "0";


    particlesContainer.appendChild(
        element
    );


    particles.push(
        particle
    );

}


/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(
    value,
    decimals = 1
) {

    return Number(value)
        .toLocaleString(
            "en-US",
            {
                minimumFractionDigits:
                    decimals,

                maximumFractionDigits:
                    decimals
            }
        );

}


/* =====================================================
   CALCULATE WORK
===================================================== */

function calculateWork() {

    /*
        Constant-force model:

        W = F × Δx
    */

    state.work =
        state.force *
        state.displacement;


    /*
        Energy relation:

        ΔU = Q − W
    */

    state.internalEnergy =
        Math.max(
            0,
            state.energyInput -
            state.work
        );

}


/* =====================================================
   MAXIMUM DISPLACEMENT
===================================================== */

function getEnergyLimitDisplacement() {

    if (
        state.force <= 0
    ) {

        return 0;

    }


    /*
        W = F × Δx

        Δx(max) = Q / F
    */

    return (
        state.energyInput /
        state.force
    );

}


/* =====================================================
   UPDATE VALUES
===================================================== */

function updateValues() {

    calculateWork();


    forceValue.textContent =
        formatNumber(
            state.force,
            0
        ) +
        " N";


    displacementValue.textContent =
        formatNumber(
            state.targetDisplacement,
            1
        ) +
        " m";


    energyValue.textContent =
        formatNumber(
            state.energyInput,
            0
        ) +
        " J";


    dataForce.textContent =
        formatNumber(
            state.force,
            0
        ) +
        " N";


    dataDisplacement.textContent =
        formatNumber(
            state.displacement,
            2
        ) +
        " m";


    dataWork.textContent =
        formatNumber(
            state.work,
            0
        ) +
        " J";


    dataInternalEnergy.textContent =
        formatNumber(
            state.internalEnergy,
            0
        ) +
        " J";


    forceSceneValue.textContent =
        formatNumber(
            state.force,
            0
        ) +
        " N";


    displacementSceneValue.textContent =
        formatNumber(
            state.displacement,
            2
        ) +
        " m";


    energyInputScene.textContent =
        formatNumber(
            state.energyInput,
            0
        ) +
        " J";


    updatePiston();

    drawGraph();

}


/* =====================================================
   UPDATE STATUS
===================================================== */

function updateStatus() {

    if (
        state.running
    ) {

        statusBadge.textContent =
            "Running";

        statusBadge.style.color =
            "var(--green)";

        statusBadge.style.borderColor =
            "rgba(34,169,104,0.40)";

        statusBadge.style.background =
            "rgba(34,169,104,0.06)";

        return;

    }


    if (
        state.displacement >=
        state.targetDisplacement -
        0.0001
    ) {

        statusBadge.textContent =
            "Completed";

        statusBadge.style.color =
            "var(--blue)";

        statusBadge.style.borderColor =
            "rgba(0,143,211,0.38)";

        statusBadge.style.background =
            "rgba(0,143,211,0.05)";

        return;

    }


    const energyLimit =
        getEnergyLimitDisplacement();


    if (
        state.displacement >=
        energyLimit -
        0.0001
    ) {

        statusBadge.textContent =
            "Energy Limit";

        statusBadge.style.color =
            "var(--orange)";

        statusBadge.style.borderColor =
            "rgba(230,140,35,0.38)";

        statusBadge.style.background =
            "rgba(230,140,35,0.05)";

        return;

    }


    statusBadge.textContent =
        "Ready";

    statusBadge.style.color =
        "var(--orange)";

    statusBadge.style.borderColor =
        "rgba(230,140,35,0.38)";

    statusBadge.style.background =
        "rgba(230,140,35,0.05)";

}


/* =====================================================
   UPDATE PISTON + GAS
===================================================== */

function updatePiston() {

    /*
        0 m = piston berada di dasar.

        Piston dan batas atas gas bergerak
        dengan jarak yang SAMA.
    */

    const maxDisplacement =
        Math.max(
            0.1,
            Number(
                displacementInput.max
            )
        );


    const ratio =
        Math.max(
            0,
            Math.min(
                1,
                state.displacement /
                maxDisplacement
            )
        );


    /* =================================================
       PISTON
    ================================================== */

    /*
        Maximum visual movement.
    */

    const maxMovement =
        155;


    const pistonMovement =
        ratio *
        maxMovement;


    /*
        Move piston upward.
    */

    piston.style.transform =
        `translateY(${-pistonMovement}px)`;


    /* =================================================
       GAS
    ================================================== */

    /*
        IMPORTANT:

        Gas starts from the bottom.

        Initial gas height is exactly
        the small volume already present
        below the piston.

        When piston moves +X px,
        gas height increases +X px.

        This makes the gas surface
        follow the piston 1:1.
    */

    const initialGasHeight =
        17;


    const gasHeight =
        initialGasHeight +
        pistonMovement;


    gas.style.height =
        gasHeight + "px";


    /*
        Keep gas from exceeding
        the cylinder height.
    */

    const maxGasHeight =
        Math.max(
            17,
            cylinder.clientHeight -
            18
        );


    if (
        gasHeight >
        maxGasHeight
    ) {

        gas.style.height =
            maxGasHeight + "px";

    }


    /* =================================================
       PARTICLES
    ================================================== */

    /*
        Particles are inside the gas
        container, so when the gas
        grows, their coordinate system
        grows together with it.
    */

    if (
        state.running &&
        gasHeight > initialGasHeight + 2
    ) {

        particles.forEach(
            particle => {

                particle.element.style.opacity =
                    "1";

            }
        );

    }

    else {

        /*
            Keep particles visible when
            a small gas volume already exists
            after the piston has started moving.
        */

        const showParticles =
            state.displacement > 0.03;


        particles.forEach(
            particle => {

                particle.element.style.opacity =
                    showParticles
                        ? "1"
                        : "0";

            }
        );

    }

}


/* =====================================================
   PARTICLE MOTION
===================================================== */

function animateParticles() {

    /*
        Work transforms energy state
        in this qualitative visualization.
    */

    const energyRatio =
        state.energyInput > 0
            ? state.internalEnergy /
              state.energyInput
            : 0;


    const movement =
        state.running

            ? 0.45 +
              energyRatio * 1.65

            : state.displacement > 0
                ? 0.12
                : 0;


    particles.forEach(
        particle => {

            particle.x +=
                particle.vx *
                movement *
                0.10;


            particle.y +=
                particle.vy *
                movement *
                0.10;


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
                particle.x + "%";


            particle.element.style.top =
                particle.y + "%";

        }
    );


    requestAnimationFrame(
        animateParticles
    );

}


/* =====================================================
   SIMULATION LOOP
===================================================== */

function simulationLoop(
    timestamp
) {

    if (
        state.lastTime === 0
    ) {

        state.lastTime =
            timestamp;

    }


    const deltaTime =
        Math.min(
            0.05,
            (
                timestamp -
                state.lastTime
            ) / 1000
        );


    state.lastTime =
        timestamp;


    if (
        state.running
    ) {

        const energyLimit =
            getEnergyLimitDisplacement();


        const allowedDisplacement =
            Math.min(
                state.targetDisplacement,
                energyLimit
            );


        /*
            Continuous upward piston movement.
        */

        const pistonSpeed =
            0.20 +
            state.force /
            500;


        state.displacement +=
            pistonSpeed *
            deltaTime;


        /*
            Stop at target or energy limit.
        */

        if (
            state.displacement >=
            allowedDisplacement
        ) {

            state.displacement =
                allowedDisplacement;


            state.running =
                false;

        }


        updateValues();

        updateStatus();

    }


    requestAnimationFrame(
        simulationLoop
    );

}


/* =====================================================
   START
===================================================== */

function startSimulation() {

    if (
        state.force <= 0 ||
        state.energyInput <= 0 ||
        state.targetDisplacement <= 0
    ) {

        return;

    }


    const energyLimit =
        getEnergyLimitDisplacement();


    if (
        energyLimit <= 0
    ) {

        return;

    }


    /*
        If already finished,
        start a new cycle from the bottom.
    */

    if (
        state.displacement >=
        state.targetDisplacement -
        0.0001
    ) {

        state.displacement =
            0;

        state.work =
            0;

    }


    /*
        If energy limit was reached,
        restart from the bottom.
    */

    if (
        state.displacement >=
        energyLimit -
        0.0001
    ) {

        state.displacement =
            0;

        state.work =
            0;

    }


    state.running =
        true;


    state.lastTime =
        0;


    updateValues();

    updateStatus();

}


/* =====================================================
   PAUSE
===================================================== */

function pauseSimulation() {

    state.running =
        false;


    state.lastTime =
        0;


    updateStatus();

}


/* =====================================================
   RESET
===================================================== */

function resetSimulation() {

    state.force =
        100;


    state.targetDisplacement =
        0.8;


    state.displacement =
        0;


    state.energyInput =
        500;


    state.work =
        0;


    state.internalEnergy =
        500;


    state.running =
        false;


    state.lastTime =
        0;


    forceInput.value =
        100;


    displacementInput.value =
        0.8;


    energyInput.value =
        500;


    updateValues();

    updateStatus();

}


/* =====================================================
   FORCE INPUT
===================================================== */

forceInput.addEventListener(
    "input",
    () => {

        state.force =
            Math.max(
                10,
                Number(
                    forceInput.value
                )
            );


        const energyLimit =
            getEnergyLimitDisplacement();


        if (
            state.displacement >
            energyLimit
        ) {

            state.displacement =
                energyLimit;


            state.running =
                false;

        }


        updateValues();

        updateStatus();

    }
);


/* =====================================================
   DISPLACEMENT INPUT
===================================================== */

displacementInput.addEventListener(
    "input",
    () => {

        state.targetDisplacement =
            Math.max(
                0.1,
                Number(
                    displacementInput.value
                )
            );


        if (
            state.displacement >
            state.targetDisplacement
        ) {

            state.displacement =
                state.targetDisplacement;


            state.running =
                false;

        }


        updateValues();

        updateStatus();

    }
);


/* =====================================================
   ENERGY INPUT
===================================================== */

energyInput.addEventListener(
    "input",
    () => {

        state.energyInput =
            Math.max(
                100,
                Number(
                    energyInput.value
                )
            );


        const energyLimit =
            getEnergyLimitDisplacement();


        if (
            state.displacement >
            energyLimit
        ) {

            state.displacement =
                energyLimit;


            state.running =
                false;

        }


        updateValues();

        updateStatus();

    }
);


/* =====================================================
   BUTTON EVENTS
===================================================== */

startButton.addEventListener(
    "click",
    startSimulation
);


pauseButton.addEventListener(
    "click",
    pauseSimulation
);


resetButton.addEventListener(
    "click",
    resetSimulation
);


/* =====================================================
   BACK HOME
===================================================== */

if (
    backHome
) {

    backHome.addEventListener(
        "click",
        () => {

            window.history.back();

        }
    );

}


/* =====================================================
   DARK / LIGHT MODE
===================================================== */

if (
    themeButton
) {

    themeButton.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );


            const darkActive =
                document.body.classList.contains(
                    "dark-mode"
                );


            themeButton.textContent =
                darkActive
                    ? "☀ Light Mode"
                    : "☾ Dark Mode";


            /*
                Redraw canvas with
                the new theme.
            */

            resizeGraph();

        }
    );

}


/* =====================================================
   SIMULATION TOOLTIP
===================================================== */

function showSimulationTooltip(
    title,
    value,
    event
) {

    tooltipTitle.textContent =
        title;


    tooltipValue.textContent =
        value;


    simulationTooltip.style.display =
        "block";


    const rect =
        simulationScene.getBoundingClientRect();


    let x =
        event.clientX -
        rect.left +
        15;


    let y =
        event.clientY -
        rect.top +
        15;


    const tooltipWidth =
        simulationTooltip.offsetWidth;


    const tooltipHeight =
        simulationTooltip.offsetHeight;


    if (
        x +
        tooltipWidth >
        rect.width
    ) {

        x =
            event.clientX -
            rect.left -
            tooltipWidth -
            15;

    }


    if (
        y +
        tooltipHeight >
        rect.height
    ) {

        y =
            event.clientY -
            rect.top -
            tooltipHeight -
            15;

    }


    simulationTooltip.style.left =
        x + "px";


    simulationTooltip.style.top =
        y + "px";

}


function hideSimulationTooltip() {

    simulationTooltip.style.display =
        "none";

}


/* =====================================================
   HOVER - ENERGY
===================================================== */

energySource.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            "Energy Input",
            formatNumber(
                state.energyInput,
                0
            ) +
            " J",
            event
        );

    }
);


energySource.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   HOVER - FORCE
===================================================== */

forceIndicator.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            "Force",
            formatNumber(
                state.force,
                0
            ) +
            " N",
            event
        );

    }
);


forceIndicator.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   HOVER - DISPLACEMENT
===================================================== */

displacementIndicator.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            "Piston Displacement",
            formatNumber(
                state.displacement,
                2
            ) +
            " m",
            event
        );

    }
);


displacementIndicator.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   HOVER - PISTON
===================================================== */

piston.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            "Work Done",
            formatNumber(
                state.work,
                0
            ) +
            " J",
            event
        );

    }
);


piston.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   HOVER - LOAD
===================================================== */

if (
    weight
) {

    weight.addEventListener(
        "mousemove",
        event => {

            showSimulationTooltip(
                "Load / Applied Force",
                formatNumber(
                    state.force,
                    0
                ) +
                " N",
                event
            );

        }
    );


    weight.addEventListener(
        "mouseleave",
        hideSimulationTooltip
    );

}


/* =====================================================
   HOVER - GAS
===================================================== */

gas.addEventListener(
    "mousemove",
    event => {

        showSimulationTooltip(
            "Internal Energy",
            formatNumber(
                state.internalEnergy,
                0
            ) +
            " J",
            event
        );

    }
);


gas.addEventListener(
    "mouseleave",
    hideSimulationTooltip
);


/* =====================================================
   GRAPH RESIZE
===================================================== */

function resizeGraph() {

    const rect =
        graphContainer.getBoundingClientRect();


    const width =
        Math.max(
            1,
            Math.round(
                rect.width
            )
        );


    const height =
        Math.max(
            1,
            Math.round(
                rect.height
            )
        );


    graphDPR =
        Math.max(
            1,
            window.devicePixelRatio || 1
        );


    graph.width =
        Math.round(
            width *
            graphDPR
        );


    graph.height =
        Math.round(
            height *
            graphDPR
        );


    graph.style.width =
        width + "px";


    graph.style.height =
        height + "px";


    /*
        Reset transform.
    */

    graphContext.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );


    graphContext.clearRect(
        0,
        0,
        graph.width,
        graph.height
    );


    /*
        Apply DPR exactly once.
    */

    graphContext.setTransform(
        graphDPR,
        0,
        0,
        graphDPR,
        0,
        0
    );


    drawGraph();

}


/* =====================================================
   DRAW GRAPH
===================================================== */

function drawGraph() {

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


    const ctx =
        graphContext;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const left =
        62;


    const right =
        25;


    const top =
        25;


    const bottom =
        52;


    const graphWidth =
        width -
        left -
        right;


    const graphHeight =
        height -
        top -
        bottom;


    const maxForce =
        Math.max(
            100,
            Number(
                forceInput.max
            )
        );


    const maxDisplacement =
        Math.max(
            0.1,
            Number(
                displacementInput.max
            )
        );


    const darkModeActive =
        document.body.classList.contains(
            "dark-mode"
        );


    const backgroundColor =
        darkModeActive
            ? "#06131d"
            : "#edf3f8";


    const gridColor =
        darkModeActive
            ? "rgba(255,255,255,0.055)"
            : "rgba(50,100,135,0.10)";


    const axisColor =
        darkModeActive
            ? "rgba(150,180,200,0.55)"
            : "rgba(70,105,125,0.55)";


    const textColor =
        darkModeActive
            ? "#91a4b8"
            : "#52677d";


    const tickColor =
        darkModeActive
            ? "#667b90"
            : "#71849a";


    const workAreaColor =
        darkModeActive
            ? "rgba(0,170,255,0.10)"
            : "rgba(0,143,211,0.10)";


    const workTextColor =
        darkModeActive
            ? "#19b8ff"
            : "#008fd3";


    /* =================================================
       GRAPH BACKGROUND
    ================================================== */

    ctx.fillStyle =
        backgroundColor;


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /* =================================================
       GRID
    ================================================== */

    ctx.strokeStyle =
        gridColor;


    ctx.lineWidth =
        1;


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const y =
            top +
            graphHeight -
            (
                i / 5
            ) *
            graphHeight;


        ctx.beginPath();


        ctx.moveTo(
            left,
            y
        );


        ctx.lineTo(
            left + graphWidth,
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
            (
                i / 5
            ) *
            graphWidth;


        ctx.beginPath();


        ctx.moveTo(
            x,
            top
        );


        ctx.lineTo(
            x,
            top + graphHeight
        );


        ctx.stroke();

    }


    /* =================================================
       AXES
    ================================================== */

    ctx.strokeStyle =
        axisColor;


    ctx.lineWidth =
        1.5;


    ctx.beginPath();


    ctx.moveTo(
        left,
        top
    );


    ctx.lineTo(
        left,
        top + graphHeight
    );


    ctx.lineTo(
        left + graphWidth,
        top + graphHeight
    );


    ctx.stroke();


    /* =================================================
       AXIS LABELS
    ================================================== */

    ctx.fillStyle =
        textColor;


    ctx.font =
        "13px Inter, Arial";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "Displacement (m)",
        left +
        graphWidth / 2,
        height - 15
    );


    ctx.save();


    ctx.translate(
        17,
        top +
        graphHeight / 2
    );


    ctx.rotate(
        -Math.PI / 2
    );


    ctx.fillText(
        "Force (N)",
        0,
        0
    );


    ctx.restore();


    /* =================================================
       X TICKS
    ================================================== */

    ctx.fillStyle =
        tickColor;


    ctx.font =
        "11px Inter, Arial";


    ctx.textAlign =
        "center";


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            maxDisplacement *
            (
                i / 5
            );


        const x =
            left +
            (
                i / 5
            ) *
            graphWidth;


        ctx.fillText(
            value.toFixed(1),
            x,
            top +
            graphHeight +
            20
        );

    }


    /* =================================================
       Y TICKS
    ================================================== */

    ctx.textAlign =
        "right";


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            maxForce *
            (
                i / 5
            );


        const y =
            top +
            graphHeight -
            (
                i / 5
            ) *
            graphHeight;


        ctx.fillText(
            formatNumber(
                value,
                0
            ),
            left - 9,
            y + 4
        );

    }


    /* =================================================
       CURRENT POSITION
    ================================================== */

    const displacementRatio =
        Math.max(
            0,
            Math.min(
                1,
                state.displacement /
                maxDisplacement
            )
        );


    const currentX =
        left +
        displacementRatio *
        graphWidth;


    const forceRatio =
        Math.max(
            0,
            Math.min(
                1,
                state.force /
                maxForce
            )
        );


    const currentY =
        top +
        graphHeight -
        forceRatio *
        graphHeight;


    const baseY =
        top +
        graphHeight;


    /* =================================================
       WORK AREA
    ================================================== */

    if (
        state.displacement > 0
    ) {

        ctx.beginPath();


        ctx.moveTo(
            left,
            baseY
        );


        ctx.lineTo(
            currentX,
            baseY
        );


        ctx.lineTo(
            currentX,
            currentY
        );


        ctx.lineTo(
            left,
            currentY
        );


        ctx.closePath();


        ctx.fillStyle =
            workAreaColor;


        ctx.fill();

    }


    /* =================================================
       FORCE LINE
    ================================================== */

    ctx.beginPath();


    ctx.moveTo(
        left,
        currentY
    );


    ctx.lineTo(
        currentX,
        currentY
    );


    ctx.strokeStyle =
        "#00aaff";


    ctx.lineWidth =
        3;


    ctx.stroke();


    /* =================================================
       DISPLACEMENT GUIDE
    ================================================== */

    if (
        state.displacement > 0
    ) {

        ctx.beginPath();


        ctx.moveTo(
            currentX,
            baseY
        );


        ctx.lineTo(
            currentX,
            currentY
        );


        ctx.strokeStyle =
            "#42d392";


        ctx.lineWidth =
            1;


        ctx.setLineDash(
            [5, 5]
        );


        ctx.stroke();


        ctx.setLineDash([]);

    }


    /* =================================================
       CURRENT POINT
    ================================================== */

    ctx.beginPath();


    ctx.arc(
        currentX,
        currentY,
        5,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#42d392";


    ctx.fill();


    /* =================================================
       WORK LABEL
    ================================================== */

    ctx.fillStyle =
        workTextColor;


    ctx.font =
        "bold 12px Inter, Arial";


    ctx.textAlign =
        "right";


    ctx.fillText(
        "W = " +
        formatNumber(
            state.work,
            0
        ) +
        " J",
        currentX,
        currentY - 12
    );

}


/* =====================================================
   GRAPH HOVER
===================================================== */

graphContainer.addEventListener(
    "mousemove",
    event => {

        const rect =
            graphContainer.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;


        const mouseY =
            event.clientY -
            rect.top;


        const left =
            62;


        const right =
            25;


        const top =
            25;


        const bottom =
            52;


        const graphWidth =
            rect.width -
            left -
            right;


        const graphHeight =
            rect.height -
            top -
            bottom;


        if (
            mouseX < left ||
            mouseX >
                left + graphWidth ||
            mouseY < top ||
            mouseY >
                top + graphHeight
        ) {

            graphTooltip.style.display =
                "none";

            return;

        }


        const maxDisplacement =
            Math.max(
                0.1,
                Number(
                    displacementInput.max
                )
            );


        const maxForce =
            Math.max(
                100,
                Number(
                    forceInput.max
                )
            );


        const displacement =
            Math.max(
                0,
                Math.min(
                    maxDisplacement,

                    (
                        mouseX -
                        left
                    ) /
                    graphWidth *
                    maxDisplacement
                )
            );


        const force =
            Math.max(
                0,
                Math.min(
                    maxForce,

                    (
                        1 -
                        (
                            mouseY -
                            top
                        ) /
                        graphHeight
                    ) *
                    maxForce
                )
            );


        const work =
            force *
            displacement;


        graphTooltipValue.textContent =
            "F = " +
            formatNumber(
                force,
                0
            ) +
            " N | d = " +
            formatNumber(
                displacement,
                2
            ) +
            " m | W = " +
            formatNumber(
                work,
                0
            ) +
            " J";


        graphTooltip.style.display =
            "block";


        let x =
            mouseX +
            14;


        let y =
            mouseY +
            14;


        const tooltipWidth =
            graphTooltip.offsetWidth;


        const tooltipHeight =
            graphTooltip.offsetHeight;


        if (
            x +
            tooltipWidth >
            rect.width
        ) {

            x =
                mouseX -
                tooltipWidth -
                14;

        }


        if (
            y +
            tooltipHeight >
            rect.height
        ) {

            y =
                mouseY -
                tooltipHeight -
                14;

        }


        graphTooltip.style.left =
            x + "px";


        graphTooltip.style.top =
            y + "px";

    }
);


graphContainer.addEventListener(
    "mouseleave",
    () => {

        graphTooltip.style.display =
            "none";

    }
);


/* =====================================================
   ACCORDION
===================================================== */

const accordionButtons =
    document.querySelectorAll(
        ".accordion-button"
    );


accordionButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.target;


                const content =
                    document.getElementById(
                        targetId
                    );


                if (
                    !content
                ) {

                    return;

                }


                const wasOpen =
                    content.classList.contains(
                        "open"
                    );


                /*
                    Close all.
                */

                document
                    .querySelectorAll(
                        ".accordion-content.open"
                    )
                    .forEach(
                        item => {

                            item.classList.remove(
                                "open"
                            );

                        }
                    );


                document
                    .querySelectorAll(
                        ".accordion-button.active"
                    )
                    .forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                /*
                    Open selected.
                */

                if (
                    !wasOpen
                ) {

                    content.classList.add(
                        "open"
                    );

                    button.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);


/* =====================================================
   INITIAL VISUAL STATE
===================================================== */

function initializeSimulationVisual() {

    /*
        Force all simulation values
        to their initial state.
    */

    state.displacement =
        0;

    state.work =
        0;

    state.internalEnergy =
        state.energyInput;


    /*
        Piston at the bottom.
    */

    piston.style.transform =
        "translateY(0px)";


    /*
        Gas starts from the bottom
        directly beneath the piston.
    */

    const initialGasHeight =
        17;


    gas.style.height =
        initialGasHeight + "px";


    /*
        Particles are hidden before
        any displacement occurs.
    */

    particles.forEach(
        particle => {

            particle.element.style.opacity =
                "0";

        }
    );

}


/* =====================================================
   INITIALIZE VALUES
===================================================== */

state.force =
    Number(
        forceInput.value
    );


state.targetDisplacement =
    Number(
        displacementInput.value
    );


state.energyInput =
    Number(
        energyInput.value
    );


state.running =
    false;


state.lastTime =
    0;


initializeSimulationVisual();

updateValues();

updateStatus();

resizeGraph();

animateParticles();

requestAnimationFrame(
    simulationLoop
);


/* =====================================================
   WINDOW RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        resizeGraph();

    }
);