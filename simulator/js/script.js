/* =========================================================
   SIMULASI HUKUM I TERMODINAMIKA
   ΔU = Q - W

   Konvensi:
   Q > 0  = kalor masuk ke gas
   W > 0  = usaha dilakukan oleh gas
========================================================= */

const R = 8.314;
const GAMMA = 1.4;

const Cv = R / (GAMMA - 1);
const Cp = Cv + R;


/* =========================================================
   ELEMENT
========================================================= */

const processSelect = document.getElementById("processSelect");

const heatInput = document.getElementById("heatInput");
const pressureInput = document.getElementById("pressureInput");
const volumeInput = document.getElementById("volumeInput");
const temperatureInput = document.getElementById("temperatureInput");

const heatValue = document.getElementById("heatValue");
const pressureValue = document.getElementById("pressureValue");
const volumeValue = document.getElementById("volumeValue");
const temperatureValue = document.getElementById("temperatureValue");

const pressureDisplay = document.getElementById("pressureDisplay");
const pressureAlt = document.getElementById("pressureAlt");
const pressurePa = document.getElementById("pressurePa");

const volumeDisplay = document.getElementById("volumeDisplay");
const volumeAlt = document.getElementById("volumeAlt");

const temperatureDisplay = document.getElementById("temperatureDisplay");
const temperatureAlt = document.getElementById("temperatureAlt");

const qDisplay = document.getElementById("qDisplay");
const wDisplay = document.getElementById("wDisplay");
const uDisplay = document.getElementById("uDisplay");

const processBadge = document.getElementById("processBadge");
const processInfo = document.getElementById("processInfo");

const piston = document.getElementById("piston");
const weight = document.getElementById("weight");
const gas = document.getElementById("gas");
const heater = document.getElementById("heater");

const particles = [...document.querySelectorAll(".particle")];

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const canvas = document.getElementById("pvGraph");
const ctx = canvas.getContext("2d");

const graphTooltip = document.getElementById("graphTooltip");


/* =========================================================
   STATE
========================================================= */

let process = "isobaric";

let initial = {
    P: 100,
    V: 2,
    T: 300,
    n: 0
};

let state = {
    P: 100,
    V: 2,
    T: 300,
    Q: 0,
    W: 0,
    U: 0
};

let target = {
    P: 100,
    V: 2,
    T: 300,
    Q: 0,
    W: 0,
    U: 0
};

let animationFrame = null;

let running = false;

let animationProgress = 0;


/* =========================================================
   BACA KONDISI AWAL
========================================================= */

function readInitialState() {

    initial.P = Number(pressureInput.value);

    initial.V = Number(volumeInput.value);

    initial.T = Number(temperatureInput.value);


    /*
        Persamaan gas ideal:

        PV = nRT

        P → Pa
        V → m³
    */

    const PPa = initial.P * 1000;

    const Vm3 = initial.V / 1000;

    initial.n =
        (PPa * Vm3) /
        (R * initial.T);
}


/* =========================================================
   HITUNG KEADAAN AKHIR
========================================================= */

function calculateTarget() {

    readInitialState();


    const P0 = initial.P;
    const V0 = initial.V;
    const T0 = initial.T;
    const n = initial.n;


    let P = P0;
    let V = V0;
    let T = T0;

    let Q = 0;
    let W = 0;
    let U = 0;


    /* =====================================================
       ISOBARIC
       P = KONSTAN
    ===================================================== */

    if (process === "isobaric") {

        Q = Number(heatInput.value);

        /*
            Tekanan TIDAK berubah.
        */

        P = P0;

        /*
            Q = n Cp ΔT
        */

        T =
            T0 +
            Q / (n * Cp);

        /*
            P konstan:
            V/T = konstan
        */

        V =
            V0 *
            (T / T0);

        /*
            W = P ΔV

            kPa × L = J
        */

        W =
            P0 *
            (V - V0);

        /*
            ΔU = Q - W
        */

        U =
            Q - W;
    }


    /* =====================================================
       ISOCHORIC
       V = KONSTAN
    ===================================================== */

    else if (process === "isochoric") {

        Q = Number(heatInput.value);

        /*
            Volume TIDAK berubah.
        */

        V = V0;

        /*
            Q = n Cv ΔT
        */

        T =
            T0 +
            Q / (n * Cv);

        /*
            V konstan:
            P/T = konstan
        */

        P =
            P0 *
            (T / T0);

        /*
            Tidak ada perubahan volume.
        */

        W = 0;

        U = Q;
    }


    /* =====================================================
       ISOTHERMAL
       T = KONSTAN
    ===================================================== */

    else if (process === "isothermal") {

        /*
            Temperatur TIDAK berubah.
        */

        T = T0;

        /*
            Volume akhir ditentukan
            oleh slider Volume.
        */

        V = Number(volumeInput.value);

        /*
            PV = konstan
        */

        P =
            P0 *
            V0 /
            V;

        /*
            Usaha gas ideal isotermal:
            W = nRT ln(V/V0)
        */

        W =
            n *
            R *
            T0 *
            Math.log(V / V0);

        /*
            ΔU = 0 karena T konstan.
        */

        U = 0;

        /*
            Dari ΔU = Q - W:
            Q = W
        */

        Q = W;
    }


    /* =====================================================
       ADIABATIC
       Q = 0
    ===================================================== */

    else if (process === "adiabatic") {

        /*
            Q SELALU nol.
        */

        Q = 0;

        /*
            Volume akhir dari slider.
        */

        V = Number(volumeInput.value);

        /*
            PV^γ = konstan
        */

        P =
            P0 *
            Math.pow(
                V0 / V,
                GAMMA
            );

        /*
            TV^(γ-1) = konstan
        */

        T =
            T0 *
            Math.pow(
                V0 / V,
                GAMMA - 1
            );

        /*
            ΔU = n Cv ΔT
        */

        U =
            n *
            Cv *
            (T - T0);

        /*
            Q = 0

            ΔU = Q - W

            W = -ΔU
        */

        W = -U;
    }


    target = {
        P,
        V,
        T,
        Q,
        W,
        U
    };
}


/* =========================================================
   INFO PROSES
========================================================= */

function updateProcessInfo() {

    if (process === "isobaric") {

        processBadge.textContent = "Isobaric";

        processInfo.textContent =
            "Tekanan tetap selama proses. " +
            "Kalor yang diberikan meningkatkan temperatur " +
            "dan menyebabkan volume gas berubah.";

    }

    else if (process === "isochoric") {

        processBadge.textContent = "Isochoric";

        processInfo.textContent =
            "Volume tetap selama proses. " +
            "Kalor yang diberikan meningkatkan temperatur " +
            "dan tekanan gas.";

    }

    else if (process === "isothermal") {

        processBadge.textContent = "Isothermal";

        processInfo.textContent =
            "Temperatur tetap selama proses. " +
            "Perubahan volume menyebabkan tekanan berubah. " +
            "Kalor yang diterima sama dengan usaha gas.";

    }

    else {

        processBadge.textContent = "Adiabatic";

        processInfo.textContent =
            "Tidak ada pertukaran kalor dengan lingkungan. " +
            "Q = 0 dan perubahan energi berasal dari usaha gas.";
    }
}


/* =========================================================
   KONTROL
========================================================= */

function updateControls() {

    /*
        Q hanya menjadi INPUT pada:
        - Isobaric
        - Isochoric

        Pada Isothermal:
        Q dihitung dari W.

        Pada Adiabatic:
        Q = 0.
    */

    if (
        process === "isothermal" ||
        process === "adiabatic"
    ) {

        heatInput.disabled = true;

    } else {

        heatInput.disabled = false;
    }
}


/* =========================================================
   NILAI LABEL KONTROL
========================================================= */

function updateControlValues() {

    if (process === "adiabatic") {

        heatValue.textContent = "0 J";

    }

    else if (process === "isothermal") {

        heatValue.textContent = "Calculated";

    }

    else {

        heatValue.textContent =
            `${Number(heatInput.value)} J`;
    }


    pressureValue.textContent =
        `${Number(pressureInput.value)} kPa`;


    volumeValue.textContent =
        `${Number(volumeInput.value).toFixed(2)} L`;


    temperatureValue.textContent =
        `${Number(temperatureInput.value)} K`;
}


/* =========================================================
   UPDATE DATA
========================================================= */

function updateDisplay() {

    /*
        PRESSURE
    */

    pressureDisplay.textContent =
        `${state.P.toFixed(2)} kPa`;

    pressureAlt.textContent =
        `${(state.P / 101.325).toFixed(3)} atm`;

    pressurePa.textContent =
        `${(state.P * 1000).toFixed(0)} Pa`;


    /*
        VOLUME
    */

    volumeDisplay.textContent =
        `${state.V.toFixed(2)} L`;

    volumeAlt.textContent =
        `${(state.V / 1000).toFixed(5)} m³`;


    /*
        TEMPERATURE
    */

    temperatureDisplay.textContent =
        `${state.T.toFixed(1)} K`;

    temperatureAlt.textContent =
        `${(state.T - 273.15).toFixed(2)} °C`;


    /*
        ENERGY
    */

    qDisplay.textContent =
        `${state.Q.toFixed(1)} J`;

    wDisplay.textContent =
        `${state.W.toFixed(1)} J`;

    uDisplay.textContent =
        `${state.U.toFixed(1)} J`;
}


/* =========================================================
   POSISI PISTON
========================================================= */

function getPistonTop(volume) {

    const minVolume = 1;
    const maxVolume = 5;

    /*
        volume besar → piston naik
        volume kecil → piston turun
    */

    const topAtSmallVolume = 300;
    const topAtLargeVolume = 45;


    const ratio =
        (volume - minVolume) /
        (maxVolume - minVolume);


    return (
        topAtSmallVolume -
        ratio *
        (
            topAtSmallVolume -
            topAtLargeVolume
        )
    );
}


/* =========================================================
   UPDATE SILINDER
========================================================= */

function updateCylinder() {

    const cylinder =
        document.querySelector(".cylinder");


    if (!cylinder) return;


    const pistonTop =
        getPistonTop(state.V);


    /*
        PISTON
    */

    piston.style.top =
        `${pistonTop}px`;


    /*
        BEBAN HARUS IKUT PISTON
    */

    weight.style.top =
        `${pistonTop - 52}px`;


    /*
        GAS SELALU DI BAWAH PISTON
    */

    const pistonBottom =
        pistonTop +
        piston.offsetHeight;


    const cylinderHeight =
        cylinder.clientHeight;


    const gasHeight =
        Math.max(
            20,
            cylinderHeight -
            pistonBottom
        );


    gas.style.height =
        `${gasHeight}px`;


    /*
        HEATER
    */

    if (
        state.Q > 0 &&
        (
            process === "isobaric" ||
            process === "isochoric"
        )
    ) {

        heater.classList.add("active");

    } else {

        heater.classList.remove("active");
    }
}


/* =========================================================
   PARTIKEL GAS
========================================================= */

const particleData =
    particles.map(
        (particle, index) => {

            return {

                element: particle,

                x:
                    5 +
                    ((index * 31) % 85),

                y:
                    5 +
                    ((index * 47) % 85),

                vx:
                    index % 2 === 0
                        ? 1
                        : -1,

                vy:
                    index % 3 === 0
                        ? 1
                        : -1
            };
        }
    );


function animateParticles() {

    /*
        Kecepatan partikel bergantung
        pada temperatur.
    */

    const speed =
        Math.max(
            0.4,
            Math.min(
                2.5,
                state.T / 300
            )
        );


    particleData.forEach(p => {

        p.x +=
            p.vx *
            speed *
            0.35;

        p.y +=
            p.vy *
            speed *
            0.35;


        if (
            p.x <= 3 ||
            p.x >= 94
        ) {

            p.vx *= -1;
        }


        if (
            p.y <= 3 ||
            p.y >= 94
        ) {

            p.vy *= -1;
        }


        p.x =
            Math.max(
                3,
                Math.min(
                    94,
                    p.x
                )
            );

        p.y =
            Math.max(
                3,
                Math.min(
                    94,
                    p.y
                )
            );


        p.element.style.left =
            `${p.x}%`;

        p.element.style.top =
            `${p.y}%`;
    });


    requestAnimationFrame(
        animateParticles
    );
}


/* =========================================================
   INTERPOLASI
========================================================= */

function interpolate(a, b, t) {

    return (
        a +
        (b - a) * t
    );
}


/* =========================================================
   START SIMULATION
========================================================= */

function startSimulation() {

    /*
        Hitung target berdasarkan
        kontrol yang dipilih.
    */

    calculateTarget();


    /*
        Kalau sudah berada di target,
        tidak perlu animasi.
    */

    if (
        Math.abs(state.V - target.V) < 0.0001 &&
        Math.abs(state.P - target.P) < 0.0001 &&
        Math.abs(state.T - target.T) < 0.0001
    ) {

        /*
            Pastikan kita mulai
            benar-benar dari keadaan awal.
        */

        state = {

            P: initial.P,

            V: initial.V,

            T: initial.T,

            Q: 0,

            W: 0,

            U: 0
        };
    }


    running = true;


    /*
        Animasi dimulai dari kondisi
        state SEKARANG menuju target.
    */

    const startState = {
        ...state
    };


    const duration = 2500;

    const startTime = performance.now();


    cancelAnimationFrame(
        animationFrame
    );


    function animate(currentTime) {

        if (!running) return;


        const elapsed =
            currentTime -
            startTime;


        const rawProgress =
            elapsed / duration;


        const t =
            Math.min(
                1,
                rawProgress
            );


        /*
            Smooth movement.
        */

        const smoothT =
            t * t * (3 - 2 * t);


        state.P =
            interpolate(
                startState.P,
                target.P,
                smoothT
            );


        state.V =
            interpolate(
                startState.V,
                target.V,
                smoothT
            );


        state.T =
            interpolate(
                startState.T,
                target.T,
                smoothT
            );


        state.Q =
            interpolate(
                startState.Q,
                target.Q,
                smoothT
            );


        state.W =
            interpolate(
                startState.W,
                target.W,
                smoothT
            );


        state.U =
            interpolate(
                startState.U,
                target.U,
                smoothT
            );


        /*
            PASTIKAN NILAI KONSTAN
            TIDAK MELENCENG KARENA
            INTERPOLASI.
        */

        if (process === "isobaric") {

            state.P =
                initial.P;
        }


        if (process === "isochoric") {

            state.V =
                initial.V;
        }


        if (process === "isothermal") {

            state.T =
                initial.T;

            state.U = 0;
        }


        if (process === "adiabatic") {

            state.Q = 0;
        }


        updateDisplay();

        updateCylinder();

        drawGraph();


        if (t < 1) {

            animationFrame =
                requestAnimationFrame(
                    animate
                );

        } else {

            /*
                Set nilai akhir PERSIS
                sesuai persamaan.
            */

            state = {
                ...target
            };


            /*
                Kunci kembali variabel konstan.
            */

            if (process === "isobaric") {
                state.P = initial.P;
            }

            if (process === "isochoric") {
                state.V = initial.V;
            }

            if (process === "isothermal") {
                state.T = initial.T;
                state.U = 0;
            }

            if (process === "adiabatic") {
                state.Q = 0;
            }


            running = false;


            updateDisplay();

            updateCylinder();

            drawGraph();
        }
    }


    animationFrame =
        requestAnimationFrame(
            animate
        );
}


/* =========================================================
   PAUSE
========================================================= */

function pauseSimulation() {

    running = false;

    cancelAnimationFrame(
        animationFrame
    );
}


/* =========================================================
   RESET
========================================================= */

function resetSimulation() {

    running = false;

    cancelAnimationFrame(
        animationFrame
    );


    readInitialState();


    state = {

        P: initial.P,

        V: initial.V,

        T: initial.T,

        Q: 0,

        W: 0,

        U: 0
    };


    target = {
        ...state
    };


    updateDisplay();

    updateCylinder();

    drawGraph();
}


/* =========================================================
   PREVIEW CONTROL
========================================================= */

function previewControl() {

    /*
        PENTING:

        Jangan langsung memasukkan target ke state.

        Kalau dilakukan, piston sudah berada
        di posisi akhir sebelum tombol MULAI.

        Sekarang slider hanya:
        - mengubah nilai kontrol
        - memperbarui label

        Simulasi baru bergerak ketika MULAI ditekan.
    */

    updateControlValues();

    /*
        Kalau user mengubah tekanan awal,
        volume awal, atau temperatur awal,
        posisi awal simulasi ikut diperbarui.
    */

    if (!running) {

        readInitialState();


        state.P = initial.P;
        state.V = initial.V;
        state.T = initial.T;

        state.Q = 0;
        state.W = 0;
        state.U = 0;


        updateDisplay();

        updateCylinder();

        drawGraph();
    }
}


/* =========================================================
   GANTI PROSES
========================================================= */

processSelect.addEventListener(
    "change",
    () => {

        process =
            processSelect.value;


        /*
            Q kembali 0 ketika
            proses diganti.
        */

        heatInput.value = 0;


        updateProcessInfo();

        updateControls();

        updateControlValues();

        resetSimulation();
    }
);


/* =========================================================
   SLIDER EVENTS
========================================================= */

heatInput.addEventListener(
    "input",
    previewControl
);


pressureInput.addEventListener(
    "input",
    previewControl
);


volumeInput.addEventListener(
    "input",
    previewControl
);


temperatureInput.addEventListener(
    "input",
    previewControl
);


/* =========================================================
   BUTTON EVENTS
========================================================= */

startBtn.addEventListener(
    "click",
    startSimulation
);


pauseBtn.addEventListener(
    "click",
    pauseSimulation
);


resetBtn.addEventListener(
    "click",
    resetSimulation
);


/* =========================================================
   GRAPH
========================================================= */

let graphSettings = {

    left: 65,

    right: 30,

    top: 35,

    bottom: 55
};


/* =========================================================
   RESIZE CANVAS
========================================================= */

function resizeCanvas() {

    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;


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
    resizeCanvas
);


/* =========================================================
   GENERATE GRAPH PATH
========================================================= */

function generatePath() {

    const points = [];


    const P0 = initial.P;
    const V0 = initial.V;
    const T0 = initial.T;


    const V1 = target.V;
    const P1 = target.P;


    const steps = 120;


    for (
        let i = 0;
        i <= steps;
        i++
    ) {

        const t =
            i / steps;


        let V;
        let P;


        /*
            ISOBARIC
            P = konstan
        */

        if (process === "isobaric") {

            V =
                V0 +
                (V1 - V0) * t;

            P = P0;
        }


        /*
            ISOCHORIC
            V = konstan
        */

        else if (process === "isochoric") {

            V = V0;

            P =
                P0 +
                (P1 - P0) * t;
        }


        /*
            ISOTHERMAL
            PV = konstan
        */

        else if (process === "isothermal") {

            V =
                V0 +
                (V1 - V0) * t;

            P =
                P0 *
                V0 /
                V;
        }


        /*
            ADIABATIC
            PV^γ = konstan
        */

        else {

            V =
                V0 +
                (V1 - V0) * t;

            P =
                P0 *
                Math.pow(
                    V0 / V,
                    GAMMA
                );
        }


        points.push({
            V,
            P
        });
    }


    return points;
}


/* =========================================================
   GRAPH DRAW
========================================================= */

function drawGraph() {

    const rect =
        canvas.getBoundingClientRect();


    const width =
        rect.width;

    const height =
        rect.height;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const path =
        generatePath();


    if (!path.length) return;


    const volumes =
        path.map(
            p => p.V
        );

    const pressures =
        path.map(
            p => p.P
        );


    let minV =
        Math.min(
            ...volumes,
            initial.V,
            state.V
        );

    let maxV =
        Math.max(
            ...volumes,
            initial.V,
            state.V
        );

    let minP =
        Math.min(
            ...pressures,
            initial.P,
            state.P
        );

    let maxP =
        Math.max(
            ...pressures,
            initial.P,
            state.P
        );


    const vRange =
        Math.max(
            0.5,
            maxV - minV
        );


    const pRange =
        Math.max(
            10,
            maxP - minP
        );


    minV -=
        vRange * 0.15;

    maxV +=
        vRange * 0.15;

    minP =
        Math.max(
            0,
            minP - pRange * 0.15
        );

    maxP +=
        pRange * 0.15;


    const left =
        graphSettings.left;

    const right =
        graphSettings.right;

    const top =
        graphSettings.top;

    const bottom =
        graphSettings.bottom;


    function xCoord(V) {

        return (
            left +
            (
                (V - minV) /
                (maxV - minV)
            ) *
            (
                width -
                left -
                right
            )
        );
    }


    function yCoord(P) {

        return (
            height -
            bottom -
            (
                (P - minP) /
                (maxP - minP)
            ) *
            (
                height -
                top -
                bottom
            )
        );
    }


    /* =====================================================
       GRID
    ===================================================== */

    ctx.strokeStyle =
        "#e2e8f0";

    ctx.lineWidth = 1;


    const gridX = 6;
    const gridY = 6;


    for (
        let i = 0;
        i <= gridX;
        i++
    ) {

        const x =
            left +
            (
                i / gridX
            ) *
            (
                width -
                left -
                right
            );


        ctx.beginPath();

        ctx.moveTo(
            x,
            top
        );

        ctx.lineTo(
            x,
            height - bottom
        );

        ctx.stroke();
    }


    for (
        let i = 0;
        i <= gridY;
        i++
    ) {

        const y =
            top +
            (
                i / gridY
            ) *
            (
                height -
                top -
                bottom
            );


        ctx.beginPath();

        ctx.moveTo(
            left,
            y
        );

        ctx.lineTo(
            width - right,
            y
        );

        ctx.stroke();
    }


    /* =====================================================
       AXIS
    ===================================================== */

    ctx.strokeStyle =
        "#334155";

    ctx.lineWidth = 2;


    ctx.beginPath();

    ctx.moveTo(
        left,
        top
    );

    ctx.lineTo(
        left,
        height - bottom
    );

    ctx.lineTo(
        width - right,
        height - bottom
    );

    ctx.stroke();


    /* =====================================================
       AXIS LABEL
    ===================================================== */

    ctx.fillStyle =
        "#334155";

    ctx.font =
        "13px Arial";

    ctx.textAlign =
        "center";


    ctx.fillText(
        "Volume V (L)",
        width / 2,
        height - 15
    );


    ctx.save();

    ctx.translate(
        18,
        height / 2
    );

    ctx.rotate(
        -Math.PI / 2
    );


    ctx.fillText(
        "Pressure P (kPa)",
        0,
        0
    );


    ctx.restore();


    /* =====================================================
       TICK X
    ===================================================== */

    for (
        let i = 0;
        i <= gridX;
        i++
    ) {

        const value =
            minV +
            (
                maxV - minV
            ) *
            (i / gridX);


        const x =
            left +
            (
                i / gridX
            ) *
            (
                width -
                left -
                right
            );


        ctx.textAlign =
            "center";

        ctx.fillText(
            value.toFixed(1),
            x,
            height - 35
        );
    }


    /* =====================================================
       TICK Y
    ===================================================== */

    for (
        let i = 0;
        i <= gridY;
        i++
    ) {

        const value =
            minP +
            (
                maxP - minP
            ) *
            (i / gridY);


        const y =
            height -
            bottom -
            (
                i / gridY
            ) *
            (
                height -
                top -
                bottom
            );


        ctx.textAlign =
            "right";

        ctx.fillText(
            value.toFixed(0),
            left - 10,
            y + 4
        );
    }


    /* =====================================================
       PROCESS PATH
    ===================================================== */

    ctx.beginPath();


    path.forEach(
        (point, index) => {

            const x =
                xCoord(point.V);

            const y =
                yCoord(point.P);


            if (index === 0) {

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
    );


    ctx.strokeStyle =
        "#16a34a";

    ctx.lineWidth = 3;

    ctx.stroke();


    /* =====================================================
       START POINT
    ===================================================== */

    const startX =
        xCoord(initial.V);

    const startY =
        yCoord(initial.P);


    ctx.beginPath();

    ctx.arc(
        startX,
        startY,
        6,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#2563eb";

    ctx.fill();


    ctx.fillStyle =
        "#2563eb";

    ctx.font =
        "bold 12px Arial";

    ctx.textAlign =
        "left";


    ctx.fillText(
        "START",
        startX + 9,
        startY - 8
    );


    /* =====================================================
       CURRENT POINT
    ===================================================== */

    const currentX =
        xCoord(state.V);

    const currentY =
        yCoord(state.P);


    ctx.beginPath();

    ctx.arc(
        currentX,
        currentY,
        7,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#dc2626";

    ctx.fill();


    ctx.fillStyle =
        "#dc2626";


    ctx.fillText(
        "CURRENT",
        currentX + 9,
        currentY + 16
    );
}


/* =========================================================
   GRAPH TOOLTIP
========================================================= */

canvas.addEventListener(
    "mousemove",
    event => {

        const rect =
            canvas.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;

        const mouseY =
            event.clientY -
            rect.top;


        const path =
            generatePath();


        if (!path.length) {

            graphTooltip.style.display =
                "none";

            return;
        }


        const width =
            rect.width;

        const height =
            rect.height;


        let minV =
            Math.min(
                ...path.map(
                    p => p.V
                )
            );

        let maxV =
            Math.max(
                ...path.map(
                    p => p.V
                )
            );

        let minP =
            Math.min(
                ...path.map(
                    p => p.P
                )
            );

        let maxP =
            Math.max(
                ...path.map(
                    p => p.P
                )
            );


        const vRange =
            Math.max(
                0.5,
                maxV - minV
            );

        const pRange =
            Math.max(
                10,
                maxP - minP
            );


        minV -=
            vRange * 0.15;

        maxV +=
            vRange * 0.15;

        minP =
            Math.max(
                0,
                minP - pRange * 0.15
            );

        maxP +=
            pRange * 0.15;


        function xCoord(V) {

            return (
                graphSettings.left +
                (
                    (V - minV) /
                    (maxV - minV)
                ) *
                (
                    width -
                    graphSettings.left -
                    graphSettings.right
                )
            );
        }


        function yCoord(P) {

            return (
                height -
                graphSettings.bottom -
                (
                    (P - minP) /
                    (maxP - minP)
                ) *
                (
                    height -
                    graphSettings.top -
                    graphSettings.bottom
                )
            );
        }


        let nearest = null;

        let nearestDistance =
            Infinity;


        path.forEach(point => {

            const x =
                xCoord(point.V);

            const y =
                yCoord(point.P);


            const distance =
                Math.hypot(
                    mouseX - x,
                    mouseY - y
                );


            if (
                distance <
                nearestDistance
            ) {

                nearestDistance =
                    distance;

                nearest =
                    point;
            }
        });


        if (
            !nearest ||
            nearestDistance > 20
        ) {

            graphTooltip.style.display =
                "none";

            return;
        }


        /*
            Hitung nilai pada titik grafik.
        */

        const V =
            nearest.V;

        const P =
            nearest.P;


        let T;
        let Q;
        let W;
        let U;


        if (process === "isobaric") {

            T =
                initial.T *
                V /
                initial.V;

            W =
                initial.P *
                (V - initial.V);

            Q =
                initial.n *
                Cp *
                (T - initial.T);

            U =
                Q - W;
        }


        else if (process === "isochoric") {

            T =
                initial.T *
                P /
                initial.P;

            W = 0;

            Q =
                initial.n *
                Cv *
                (T - initial.T);

            U = Q;
        }


        else if (process === "isothermal") {

            T =
                initial.T;

            W =
                initial.n *
                R *
                T *
                Math.log(
                    V /
                    initial.V
                );

            Q = W;

            U = 0;
        }


        else {

            T =
                initial.T *
                Math.pow(
                    initial.V / V,
                    GAMMA - 1
                );

            U =
                initial.n *
                Cv *
                (T - initial.T);

            W = -U;

            Q = 0;
        }


        graphTooltip.innerHTML = `
            <strong>${process}</strong><br>
            P = ${P.toFixed(2)} kPa<br>
            V = ${V.toFixed(2)} L<br>
            T = ${T.toFixed(2)} K<br>
            Q = ${Q.toFixed(2)} J<br>
            W = ${W.toFixed(2)} J<br>
            ΔU = ${U.toFixed(2)} J
        `;


        let left =
            mouseX + 15;

        let top =
            mouseY + 15;


        if (
            left + 200 >
            width
        ) {

            left =
                mouseX - 210;
        }


        if (
            top + 150 >
            height
        ) {

            top =
                mouseY - 160;
        }


        graphTooltip.style.left =
            `${left}px`;

        graphTooltip.style.top =
            `${top}px`;

        graphTooltip.style.display =
            "block";
    }
);


canvas.addEventListener(
    "mouseleave",
    () => {

        graphTooltip.style.display =
            "none";
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

process = processSelect.value;

readInitialState();

updateProcessInfo();

updateControls();

updateControlValues();

resetSimulation();

animateParticles();

resizeCanvas();