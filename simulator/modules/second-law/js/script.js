/* =====================================================
   HUKUM II TERMODINAMIKA
   INTERACTIVE SIMULATION
===================================================== */


/* =====================================================
   ELEMENTS
===================================================== */

const unitSelect =
    document.getElementById("unitSelect");


const hotInput =
    document.getElementById("hotInput");

const coldInput =
    document.getElementById("coldInput");


const hotDisplay =
    document.getElementById("hotDisplay");

const coldDisplay =
    document.getElementById("coldDisplay");


const hotInputValue =
    document.getElementById("hotInputValue");

const coldInputValue =
    document.getElementById("coldInputValue");


const hotMin =
    document.getElementById("hotMin");

const hotMax =
    document.getElementById("hotMax");

const coldMin =
    document.getElementById("coldMin");

const coldMax =
    document.getElementById("coldMax");


const directionHotTemp =
    document.getElementById(
        "directionHotTemp"
    );


const directionColdTemp =
    document.getElementById(
        "directionColdTemp"
    );


const heatFlowArrow =
    document.getElementById(
        "heatFlowArrow"
    );


const heatFlowValue =
    document.getElementById(
        "heatFlowValue"
    );


const mainHeatArrow =
    document.getElementById(
        "mainHeatArrow"
    );


const entropyDisplay =
    document.getElementById(
        "entropyDisplay"
    );


const entropyBadge =
    document.getElementById(
        "entropyBadge"
    );


const startBtn =
    document.getElementById(
        "startBtn"
    );


const pauseBtn =
    document.getElementById(
        "pauseBtn"
    );


const resetBtn =
    document.getElementById(
        "resetBtn"
    );


const reversibleBtn =
    document.getElementById(
        "reversibleBtn"
    );


const irreversibleBtn =
    document.getElementById(
        "irreversibleBtn"
    );


const processTitle =
    document.getElementById(
        "processTitle"
    );


const processDescription =
    document.getElementById(
        "processDescription"
    );


const processEntropy =
    document.getElementById(
        "processEntropy"
    );


/* =====================================================
   CANVAS
===================================================== */

const hotCanvas =
    document.getElementById(
        "hotCanvas"
    );


const coldCanvas =
    document.getElementById(
        "coldCanvas"
    );


const hotCtx =
    hotCanvas.getContext("2d");


const coldCtx =
    coldCanvas.getContext("2d");


/* =====================================================
   ENGINE ELEMENTS
===================================================== */

const engineHotTemp =
    document.getElementById(
        "engineHotTemp"
    );


const engineColdTemp =
    document.getElementById(
        "engineColdTemp"
    );


const engineWeight =
    document.getElementById(
        "engineWeight"
    );


const enginePiston =
    document.getElementById(
        "enginePiston"
    );


const engineGas =
    document.getElementById(
        "engineGas"
    );


const engineWheel =
    document.getElementById(
        "engineWheel"
    );


const qhDisplay =
    document.getElementById(
        "qhDisplay"
    );


const workDisplay =
    document.getElementById(
        "workDisplay"
    );


const qcDisplay =
    document.getElementById(
        "qcDisplay"
    );


const efficiencyDisplay =
    document.getElementById(
        "efficiencyDisplay"
    );


const carnotDisplay =
    document.getElementById(
        "carnotDisplay"
    );


/* =====================================================
   CONSTANTS
===================================================== */

const ROOM_TEMPERATURE_K =
    298.15;


const HEAT_CAPACITY_HOT =
    100;


const HEAT_CAPACITY_COLD =
    100;


const MAX_HEAT_TRANSFER =
    100000;


const QH =
    1000;


/* =====================================================
   TEMPERATURE STATE
===================================================== */

/*
    Semua perhitungan temperatur disimpan
    dalam Kelvin.

    Tampilan bisa Kelvin atau Celsius.
*/

let hotTemperatureK =
    353.15;


let coldTemperatureK =
    298.15;


let initialHotTemperatureK =
    hotTemperatureK;


let initialColdTemperatureK =
    coldTemperatureK;


let transferredHeat =
    0;


/* =====================================================
   SIMULATION STATE
===================================================== */

let running = false;

let animationId = null;

let lastTime = 0;

let entropyMode =
    "reversible";


/* =====================================================
   ENGINE STATE
===================================================== */

let engineAngle = 0;


/* =====================================================
   PARTICLES
===================================================== */

const hotParticles = [];

const coldParticles = [];

const engineParticles = [];


const HOT_PARTICLE_COUNT =
    25;

const COLD_PARTICLE_COUNT =
    25;

const ENGINE_PARTICLE_COUNT =
    10;


/* =====================================================
   TEMPERATURE CONVERSION
===================================================== */

function celsiusToKelvin(
    celsius
) {

    return celsius + 273.15;

}


function kelvinToCelsius(
    kelvin
) {

    return kelvin - 273.15;

}


/* =====================================================
   FORMAT TEMPERATURE
===================================================== */

function formatTemperature(
    kelvin
) {

    if (
        unitSelect.value === "C"
    ) {

        return (
            kelvinToCelsius(
                kelvin
            )
            .toFixed(1)
            + " °C"
        );

    }


    return (
        kelvin.toFixed(1)
        + " K"
    );

}


/* =====================================================
   FORMAT RANGE
===================================================== */

function getSliderTemperature(
    input
) {

    const value =
        Number(input.value);


    if (
        unitSelect.value === "C"
    ) {

        return celsiusToKelvin(
            value
        );

    }


    return value;

}


/* =====================================================
   UPDATE SLIDER UNIT
===================================================== */

function updateSliderUnit() {

    if (
        unitSelect.value === "K"
    ) {

        /*
         * HOT
         */

        hotInput.min =
            300;

        hotInput.max =
            1000;

        hotInput.step =
            1;


        /*
         * COLD
         */

        coldInput.min =
            250;

        coldInput.max =
            700;

        coldInput.step =
            1;


        hotInput.value =
            hotTemperatureK;


        coldInput.value =
            coldTemperatureK;


        hotMin.textContent =
            "300 K";

        hotMax.textContent =
            "1000 K";


        coldMin.textContent =
            "250 K";

        coldMax.textContent =
            "700 K";

    }

    else {

        /*
         * HOT
         */

        hotInput.min =
            27;

        hotInput.max =
            727;

        hotInput.step =
            1;


        /*
         * COLD
         */

        coldInput.min =
            -23;

        coldInput.max =
            427;

        coldInput.step =
            1;


        hotInput.value =
            kelvinToCelsius(
                hotTemperatureK
            );


        coldInput.value =
            kelvinToCelsius(
                coldTemperatureK
            );


        hotMin.textContent =
            "27 °C";

        hotMax.textContent =
            "727 °C";


        coldMin.textContent =
            "-23 °C";

        coldMax.textContent =
            "427 °C";

    }


    updateDisplays();

}


/* =====================================================
   READ TEMPERATURE
===================================================== */

function readTemperatures() {

    hotTemperatureK =
        getSliderTemperature(
            hotInput
        );


    coldTemperatureK =
        getSliderTemperature(
            coldInput
        );


    /*
     * Pastikan reservoir panas
     * tetap lebih panas.
     */

    if (
        hotTemperatureK <=
        coldTemperatureK
    ) {

        if (
            document.activeElement ===
            coldInput
        ) {

            hotTemperatureK =
                coldTemperatureK + 1;

        }

        else {

            coldTemperatureK =
                hotTemperatureK - 1;

        }

    }


    updateDisplays();

}


/* =====================================================
   UPDATE DISPLAY
===================================================== */

function updateDisplays() {

    const hotText =
        formatTemperature(
            hotTemperatureK
        );


    const coldText =
        formatTemperature(
            coldTemperatureK
        );


    hotDisplay.textContent =
        hotText;


    coldDisplay.textContent =
        coldText;


    hotInputValue.textContent =
        hotText;


    coldInputValue.textContent =
        coldText;


    directionHotTemp.textContent =
        hotText;


    directionColdTemp.textContent =
        coldText;


    updateEngineTemperature();

    updateEntropy();

}


/* =====================================================
   UPDATE ENGINE TEMPERATURE
===================================================== */

function updateEngineTemperature() {

    engineHotTemp.textContent =
        formatTemperature(
            hotTemperatureK
        );


    engineColdTemp.textContent =
        formatTemperature(
            coldTemperatureK
        );

}


/* =====================================================
   CREATE CANVAS PARTICLES
===================================================== */

function createParticles(
    array,
    count
) {

    array.length = 0;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        array.push({

            x:
                Math.random(),

            y:
                Math.random(),

            vx:
                (
                    Math.random() - 0.5
                ) * 0.4,

            vy:
                (
                    Math.random() - 0.5
                ) * 0.4

        });

    }

}


createParticles(
    hotParticles,
    HOT_PARTICLE_COUNT
);


createParticles(
    coldParticles,
    COLD_PARTICLE_COUNT
);


/* =====================================================
   ENGINE PARTICLES
===================================================== */

for (
    let i = 0;
    i < ENGINE_PARTICLE_COUNT;
    i++
) {

    const particle =
        document.createElement(
            "span"
        );


    particle.className =
        "engine-particle";


    engineGas.appendChild(
        particle
    );


    engineParticles.push({

        element:
            particle,

        x:
            Math.random() * 90 + 5,

        y:
            Math.random() * 80 + 10,

        vx:
            (
                Math.random() - 0.5
            ) * 0.8,

        vy:
            (
                Math.random() - 0.5
            ) * 0.8

    });

}


/* =====================================================
   CANVAS RESIZE
===================================================== */

function resizeCanvas(
    canvas
) {

    const rect =
        canvas.getBoundingClientRect();


    canvas.width =
        rect.width *
        window.devicePixelRatio;


    canvas.height =
        rect.height *
        window.devicePixelRatio;


    const ctx =
        canvas.getContext("2d");


    ctx.scale(
        window.devicePixelRatio,
        window.devicePixelRatio
    );

}


function resizeCanvases() {

    resizeCanvas(
        hotCanvas
    );


    resizeCanvas(
        coldCanvas
    );

}


window.addEventListener(
    "resize",
    resizeCanvases
);


setTimeout(
    resizeCanvases,
    100
);


/* =====================================================
   DRAW PARTICLES
===================================================== */

function drawParticles(
    ctx,
    canvas,
    particles,
    temperatureK,
    type
) {

    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
     * Temperatur menentukan kecepatan
     * partikel.
     */

    const speed =
        Math.max(
            0.2,
            Math.min(
                1.5,
                temperatureK / 300
            )
        );


    particles.forEach(
        particle => {

            particle.x +=
                particle.vx *
                speed *
                0.01;


            particle.y +=
                particle.vy *
                speed *
                0.01;


            if (
                particle.x < 0 ||
                particle.x > 1
            ) {

                particle.vx *= -1;

            }


            if (
                particle.y < 0 ||
                particle.y > 1
            ) {

                particle.vy *= -1;

            }


            const x =
                particle.x *
                width;


            const y =
                particle.y *
                height;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                3,
                0,
                Math.PI * 2
            );


            if (
                type === "hot"
            ) {

                ctx.fillStyle =
                    "#ef4444";

            }

            else {

                ctx.fillStyle =
                    "#2563eb";

            }


            ctx.fill();

        }
    );

}


/* =====================================================
   ENTROPY
===================================================== */

function calculateEntropy() {

    /*
     * Untuk dua benda dengan kapasitas kalor
     * efektif yang sama:
     *
     * ΔS =
     * Ch ln(Thf/Thi)
     * +
     * Cc ln(Tcf/Tci)
     */

    const finalHot =
        initialHotTemperatureK -
        transferredHeat /
        HEAT_CAPACITY_HOT;


    const finalCold =
        initialColdTemperatureK +
        transferredHeat /
        HEAT_CAPACITY_COLD;


    if (
        finalHot <= 0 ||
        finalCold <= 0
    ) {

        return 0;

    }


    const deltaSHot =
        HEAT_CAPACITY_HOT *
        Math.log(
            finalHot /
            initialHotTemperatureK
        );


    const deltaSCold =
        HEAT_CAPACITY_COLD *
        Math.log(
            finalCold /
            initialColdTemperatureK
        );


    return (
        deltaSHot +
        deltaSCold
    );

}


/* =====================================================
   UPDATE ENTROPY
===================================================== */

function updateEntropy() {

    const entropy =
        calculateEntropy();


    entropyDisplay.textContent =
        entropy.toFixed(3)
        + " J/K";


    if (
        entropy < 0.0001
    ) {

        entropyBadge.textContent =
            "ΔS ≈ 0";


        entropyBadge.style.background =
            "#dcfce7";


        entropyBadge.style.color =
            "#15803d";

    }

    else {

        entropyBadge.textContent =
            "ΔS ≥ 0";


        entropyBadge.style.background =
            "#dcfce7";


        entropyBadge.style.color =
            "#15803d";

    }

}


/* =====================================================
   IDLE PARTICLE ANIMATION
   PARTIKEL BERGERAK SEBELUM PLAY
===================================================== */

let idleParticleAnimationId =
    null;


function idleParticleLoop(
    timestamp
) {

    /*
     * Kalau simulasi sudah berjalan,
     * loop idle dihentikan.
     */

    if (running) {

        idleParticleAnimationId =
            null;

        return;

    }


    /*
     * Reservoir panas.
     */

    drawParticles(
        hotCtx,
        hotCanvas,
        hotParticles,
        hotTemperatureK,
        "hot"
    );


    /*
     * Reservoir dingin.
     */

    drawParticles(
        coldCtx,
        coldCanvas,
        coldParticles,
        coldTemperatureK,
        "cold"
    );


    idleParticleAnimationId =
        requestAnimationFrame(
            idleParticleLoop
        );

}
/* =====================================================
   HEAT ENGINE CALCULATION
===================================================== */

function calculateEngine() {

    /*
     * Temperatur mesin selalu Kelvin.
     */

    const Th =
        hotTemperatureK;


    const Tc =
        coldTemperatureK;


    if (
        Th <= Tc
    ) {

        return;

    }


    /*
     * Efisiensi Carnot.
     */

    const carnotEfficiency =
        1 -
        Tc / Th;


    /*
     * Mesin nyata dibuat 80%
     * dari batas Carnot.
     */

    const actualEfficiency =
        carnotEfficiency * 0.8;


    const W =
        QH *
        actualEfficiency;


    const QC =
        QH -
        W;


    qhDisplay.textContent =
        QH.toFixed(0)
        + " J";


    workDisplay.textContent =
        W.toFixed(1)
        + " J";


    qcDisplay.textContent =
        QC.toFixed(1)
        + " J";


    efficiencyDisplay.textContent =
        (
            actualEfficiency *
            100
        ).toFixed(1)
        + " %";


    carnotDisplay.textContent =
        (
            carnotEfficiency *
            100
        ).toFixed(1)
        + " %";

}


/* =====================================================
   ENGINE ANIMATION
===================================================== */

function animateEngine() {

    /*
     * Roda berputar.
     */

    engineAngle +=
        0.08;


    /*
     * Gerakan piston menggunakan sin.
     *
     * 0 = posisi atas
     * 1 = posisi bawah
     */

    const pistonProgress =
        (
            Math.sin(
                engineAngle
            ) + 1
        ) / 2;


    const minPistonTop =
        12;


    const maxPistonTop =
        105;


    const pistonPosition =
        minPistonTop +
        (
            maxPistonTop -
            minPistonTop
        ) *
        pistonProgress;


    /*
     * PISTON
     */

    enginePiston.style.top =
        pistonPosition + "px";


    /*
     * BEBAN MENGIKUTI PISTON
     */

    const weightPosition =
        38 +
        pistonPosition -
        20;


    engineWeight.style.top =
        weightPosition + "px";


    /*
     * RUANG GAS
     *
     * Ketika piston turun,
     * volume gas bertambah.
     *
     * Ketika piston naik,
     * volume gas mengecil.
     */

    const pistonBottom =
        pistonPosition + 18;


    const cylinderBottom =
        142;


    const gasTop =
        pistonBottom + 3;


    const gasHeight =
        Math.max(
            20,
            cylinderBottom -
            gasTop
        );


    engineGas.style.top =
        gasTop + "px";


    engineGas.style.height =
        gasHeight + "px";


    /*
     * PARTIKEL GAS
     */

    const gasSpeed =
        Math.max(
            0.4,
            hotTemperatureK / 500
        );


    engineParticles.forEach(
        particle => {

            particle.x +=
                particle.vx *
                gasSpeed;


            particle.y +=
                particle.vy *
                gasSpeed;


            /*
             * Pantulan kiri-kanan
             */

            if (
                particle.x <= 3 ||
                particle.x >= 97
            ) {

                particle.vx *=
                    -1;

            }


            /*
             * Pantulan atas-bawah
             */

            if (
                particle.y <= 3 ||
                particle.y >= 97
            ) {

                particle.vy *=
                    -1;

            }


            particle.x =
                Math.max(
                    3,
                    Math.min(
                        97,
                        particle.x
                    )
                );


            particle.y =
                Math.max(
                    3,
                    Math.min(
                        97,
                        particle.y
                    )
                );


            particle.element.style.left =
                particle.x + "%";


            particle.element.style.top =
                particle.y + "%";

        }
    );


    /*
     * RODA
     */

    engineWheel.style.transform =
        `rotate(${engineAngle}rad)`;

}


/* =====================================================
   MAIN SIMULATION LOOP
===================================================== */

function animationLoop(
    timestamp
) {

    if (!running) {

        return;

    }


    if (!lastTime) {

        lastTime =
            timestamp;

    }


    const deltaTime =
        timestamp -
        lastTime;


    lastTime =
        timestamp;


    /*
     * Heat transfer rate.
     */

    const temperatureDifference =
        hotTemperatureK -
        coldTemperatureK;


    if (
        temperatureDifference > 0 &&
        transferredHeat <
        MAX_HEAT_TRANSFER
    ) {

        /*
         * Semakin besar perbedaan suhu,
         * semakin cepat perpindahan kalor.
         */

        const heatRate =
            temperatureDifference *
            0.0015;


        const dQ =
            heatRate *
            deltaTime;


        transferredHeat +=
            dQ;


        /*
         * Reservoir panas kehilangan kalor.
         */

        hotTemperatureK =
            initialHotTemperatureK -
            transferredHeat /
            HEAT_CAPACITY_HOT;


        /*
         * Reservoir dingin menerima kalor.
         */

        coldTemperatureK =
            initialColdTemperatureK +
            transferredHeat /
            HEAT_CAPACITY_COLD;


        /*
         * Jangan sampai reservoir
         * dingin lebih panas dari panas.
         */

        if (
            hotTemperatureK <=
            coldTemperatureK
        ) {

            const averageTemperature =
                (
                    hotTemperatureK +
                    coldTemperatureK
                ) / 2;


            hotTemperatureK =
                averageTemperature;


            coldTemperatureK =
                averageTemperature;

        }

    }


    /*
     * Update semua tampilan.
     */

    updateDisplays();


    /*
     * Heat transfer display.
     */

    heatFlowValue.textContent =
        transferredHeat.toFixed(0)
        + " J";


    /*
     * Partikel reservoir.
     */

    drawParticles(
        hotCtx,
        hotCanvas,
        hotParticles,
        hotTemperatureK,
        "hot"
    );


    drawParticles(
        coldCtx,
        coldCanvas,
        coldParticles,
        coldTemperatureK,
        "cold"
    );


    /*
     * Mesin kalor tetap berjalan.
     */

    calculateEngine();

    animateEngine();


    /*
     * Jika suhu hampir sama,
     * perpindahan berhenti secara alami.
     */

    if (
        Math.abs(
            hotTemperatureK -
            coldTemperatureK
        ) < 0.1
    ) {

        transferredHeat =
            MAX_HEAT_TRANSFER;

    }


    animationId =
        requestAnimationFrame(
            animationLoop
        );

}


/* =====================================================
   START
===================================================== */

function startSimulation() {

    if (running) {

        return;

    }


    /*
     * PENTING:
     * Baca nilai slider TERBARU
     * sebelum simulasi dimulai.
     */

    readTemperatures();


    /*
     * Suhu yang sedang dipilih
     * menjadi kondisi awal simulasi.
     */

    initialHotTemperatureK =
        hotTemperatureK;


    initialColdTemperatureK =
        coldTemperatureK;


    /*
     * Mulai dari perpindahan kalor 0.
     */

    transferredHeat =
        0;


    /*
     * Cek suhu.
     */

    if (
        hotTemperatureK <=
        coldTemperatureK
    ) {

        alert(
            "Temperatur panas harus lebih tinggi daripada temperatur dingin."
        );

        return;

    }


    /*
     * Hentikan idle particle loop.
     * Animation loop akan mengambil alih.
     */

    running =
        true;


    lastTime =
        0;


    animationId =
        requestAnimationFrame(
            animationLoop
        );

}


/* =====================================================
   PAUSE
===================================================== */

function pauseSimulation() {

    running =
        false;


    lastTime =
        0;


    if (
        animationId
    ) {

        cancelAnimationFrame(
            animationId
        );

        animationId =
            null;

    }


    /*
     * Setelah pause,
     * partikel reservoir tetap bergerak.
     */

    if (
        !idleParticleAnimationId
    ) {

        idleParticleAnimationId =
            requestAnimationFrame(
                idleParticleLoop
            );

    }

}


/* =====================================================
   RESET
===================================================== */

function resetSimulation() {

    pauseSimulation();


    /*
     * Kembalikan suhu awal.
     *
     * Bukan 25 dan 80 secara paksa.
     * Yang digunakan adalah suhu awal
     * yang sudah tersimpan.
     */

    hotTemperatureK =
        initialHotTemperatureK;


    coldTemperatureK =
        initialColdTemperatureK;


    transferredHeat =
        0;


    /*
     * Reset piston.
     */

    engineAngle =
        0;


    enginePiston.style.top =
        "12px";


    engineWeight.style.top =
        "30px";


    engineGas.style.top =
        "33px";


    engineGas.style.height =
        "109px";


    engineWheel.style.transform =
        "rotate(0rad)";


    /*
     * Reset particles.
     */

    createParticles(
        hotParticles,
        HOT_PARTICLE_COUNT
    );


    createParticles(
        coldParticles,
        COLD_PARTICLE_COUNT
    );


    engineParticles.forEach(
        particle => {

            particle.x =
                Math.random() * 90 + 5;

            particle.y =
                Math.random() * 80 + 10;

        }
    );


    updateSliderUnit();

    updateDisplays();


    heatFlowValue.textContent =
        "0 J";


    calculateEngine();


    drawParticles(
        hotCtx,
        hotCanvas,
        hotParticles,
        hotTemperatureK,
        "hot"
    );


    drawParticles(
        coldCtx,
        coldCanvas,
        coldParticles,
        coldTemperatureK,
        "cold"
    );


    /*
     * Pastikan partikel langsung bergerak
     * setelah reset.
     */

    if (
        !idleParticleAnimationId
    ) {

        idleParticleAnimationId =
            requestAnimationFrame(
                idleParticleLoop
            );

    }

}


/* =====================================================
   INPUT EVENTS
===================================================== */

hotInput.addEventListener(
    "input",
    () => {

        readTemperatures();

        calculateEngine();

    }
);


coldInput.addEventListener(
    "input",
    () => {

        readTemperatures();

        calculateEngine();

    }
);


/* =====================================================
   UNIT CHANGE
===================================================== */

unitSelect.addEventListener(
    "change",
    () => {

        /*
         * Simpan temperatur fisik
         * yang sedang aktif.
         *
         * updateSliderUnit()
         * hanya mengubah tampilan slider.
         */

        updateSliderUnit();

        calculateEngine();

        updateDisplays();

    }
);


/* =====================================================
   BUTTON EVENTS
===================================================== */

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


/* =====================================================
   REVERSIBLE / IRREVERSIBLE
===================================================== */

reversibleBtn.addEventListener(
    "click",
    () => {

        entropyMode =
            "reversible";


        reversibleBtn.classList.add(
            "active"
        );


        irreversibleBtn.classList.remove(
            "active"
        );


        processTitle.textContent =
            "Proses Reversibel";


        processDescription.textContent =
            "Proses ideal yang dapat dibalik sehingga sistem dan lingkungan dapat kembali ke keadaan awal tanpa perubahan bersih.";


        processEntropy.textContent =
            "= 0";

    }
);


irreversibleBtn.addEventListener(
    "click",
    () => {

        entropyMode =
            "irreversible";


        irreversibleBtn.classList.add(
            "active"
        );


        reversibleBtn.classList.remove(
            "active"
        );


        processTitle.textContent =
            "Proses Irreversibel";


        processDescription.textContent =
            "Proses nyata yang tidak dapat dikembalikan sepenuhnya ke keadaan awal tanpa menimbulkan perubahan pada lingkungan.";


        processEntropy.textContent =
            "> 0";

    }
);


/* =====================================================
   INITIALIZATION
===================================================== */

function initialize() {

    /*
     * Pastikan slider sesuai
     * satuan awal.
     */

    updateSliderUnit();


    /*
     * BACA NILAI SLIDER YANG SUDAH
     * ADA DI HTML.
     *
     * Ini penting agar nilai yang
     * sudah disetting tidak diganti
     * dengan 80 °C / 25 °C.
     */

    readTemperatures();


    /*
     * Simpan nilai slider sebagai
     * temperatur awal.
     */

    initialHotTemperatureK =
        hotTemperatureK;


    initialColdTemperatureK =
        coldTemperatureK;


    /*
     * Hitung mesin kalor.
     */

    calculateEngine();


    /*
     * Gambar partikel awal.
     */

    drawParticles(
        hotCtx,
        hotCanvas,
        hotParticles,
        hotTemperatureK,
        "hot"
    );


    drawParticles(
        coldCtx,
        coldCanvas,
        coldParticles,
        coldTemperatureK,
        "cold"
    );


    /*
     * Posisi awal mesin.
     */

    enginePiston.style.top =
        "12px";


    engineWeight.style.top =
        "30px";


    engineGas.style.top =
        "33px";


    engineGas.style.height =
        "109px";


    /*
     * Tampilkan data awal.
     */

    updateDisplays();


    /*
     * PARTIKEL RESERVOIR LANGSUNG
     * BERGERAK SEBELUM PLAY.
     */

    if (
        !idleParticleAnimationId
    ) {

        idleParticleAnimationId =
            requestAnimationFrame(
                idleParticleLoop
            );

    }

}


initialize();