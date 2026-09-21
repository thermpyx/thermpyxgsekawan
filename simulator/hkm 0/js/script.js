/* =========================================================
   SIMULASI HUKUM 0 TERMODINAMIKA
   ========================================================= */

let running = false;
let equilibriumReached = false;

let thermalAnimation = null;
let particleAnimationFrame = null;

let lastThermalTime = 0;
let lastParticleTime = 0;

/*
   =========================================================
   SUHU SIMULASI
   =========================================================

   temperatureA, temperatureB, temperatureThermo
   adalah suhu yang sedang berubah selama simulasi.
*/
let temperatureA = 0;
let temperatureB = 0;
let temperatureThermo = 0;


/*
   =========================================================
   NILAI KONTROL / SUHU AWAL
   =========================================================

   Nilai ini berasal dari slider.

   Nilai kontrol TIDAK akan berubah ketika Play dijalankan.
*/
let controlA = 0;
let controlB = 0;
let controlThermo = 0;


/*
   =========================================================
   ELEMENT HTML
   =========================================================
*/

const canvasA = document.getElementById("canvasA");
const canvasB = document.getElementById("canvasB");

const tempAInput = document.getElementById("tempAInput");
const tempBInput = document.getElementById("tempBInput");
const thermoInput = document.getElementById("thermoInput");

const tempAValue = document.getElementById("tempAValue");
const tempBValue = document.getElementById("tempBValue");
const thermoValue = document.getElementById("thermoValue");

const tempADisplay = document.getElementById("tempADisplay");
const tempBDisplay = document.getElementById("tempBDisplay");
const thermoDisplay = document.getElementById("thermoDisplay");

const dataA = document.getElementById("dataA");
const dataB = document.getElementById("dataB");
const dataThermo = document.getElementById("dataThermo");
const deltaT = document.getElementById("deltaT");

const statusBadge = document.getElementById("statusBadge");
const lawResult = document.getElementById("lawResult");
const heatArrow = document.getElementById("heatArrow");
const heatText = document.getElementById("heatText");

const thermometerLiquid =
    document.getElementById("thermometerLiquid");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");


/*
   =========================================================
   CLASS PARTICLE
   =========================================================
*/

class Particle {

    constructor(width, height) {

        this.radius = 4;

        // Posisi awal acak
        this.x =
            this.radius +
            Math.random() *
            (width - this.radius * 2);

        this.y =
            this.radius +
            Math.random() *
            (height - this.radius * 2);

        // Arah gerak acak
        const angle =
            Math.random() *
            Math.PI *
            2;

        // Kecepatan dasar
        const speed =
            0.7 +
            Math.random() * 0.8;

        this.baseVx =
            Math.cos(angle) * speed;

        this.baseVy =
            Math.sin(angle) * speed;

        this.vx = this.baseVx;
        this.vy = this.baseVy;
    }
}


/*
   =========================================================
   CLASS PARTICLE BOX
   =========================================================
*/

class ParticleBox {

    constructor(canvas, count = 20) {

        this.canvas = canvas;

        this.ctx =
            canvas.getContext("2d");

        this.width = 0;
        this.height = 0;

        this.temperature = 20;

        this.particles = [];

        this.count = count;

        this.resize();

        this.createParticles();
    }


    /*
       Menyesuaikan ukuran canvas
    */
    resize() {

        const rect =
            this.canvas.getBoundingClientRect();

        const dpr =
            window.devicePixelRatio || 1;

        this.canvas.width =
            rect.width * dpr;

        this.canvas.height =
            rect.height * dpr;

        this.ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        this.width = rect.width;
        this.height = rect.height;
    }


    /*
       Membuat partikel
    */
    createParticles() {

        this.particles = [];

        for (
            let i = 0;
            i < this.count;
            i++
        ) {

            this.particles.push(
                new Particle(
                    this.width,
                    this.height
                )
            );
        }
    }


    /*
       Mengatur suhu partikel
    */
    setTemperature(temp) {

        this.temperature =
            Number(temp);
    }


    /*
       Semakin tinggi suhu,
       semakin besar kecepatan partikel.

       Secara sederhana:
       v ∝ √T
    */
    getSpeedFactor() {

        const kelvin =
            this.temperature + 273.15;

        const reference =
            293.15;

        return Math.sqrt(
            kelvin / reference
        );
    }


    /*
       Menggerakkan partikel
    */
    update(deltaTime) {

        if (!running) return;

        const speedFactor =
            this.getSpeedFactor();

        const timeFactor =
            deltaTime / 16.67;


        for (
            const particle of this.particles
        ) {

            /*
               Kecepatan mengikuti suhu
            */
            particle.vx =
                particle.baseVx *
                speedFactor;

            particle.vy =
                particle.baseVy *
                speedFactor;


            /*
               Update posisi
            */
            particle.x +=
                particle.vx *
                timeFactor;

            particle.y +=
                particle.vy *
                timeFactor;


            /*
               Pantulan dinding kiri
            */
            if (
                particle.x -
                particle.radius <= 0
            ) {

                particle.x =
                    particle.radius;

                particle.baseVx =
                    Math.abs(
                        particle.baseVx
                    );
            }


            /*
               Pantulan dinding kanan
            */
            if (
                particle.x +
                particle.radius >=
                this.width
            ) {

                particle.x =
                    this.width -
                    particle.radius;

                particle.baseVx =
                    -Math.abs(
                        particle.baseVx
                    );
            }


            /*
               Pantulan dinding atas
            */
            if (
                particle.y -
                particle.radius <= 0
            ) {

                particle.y =
                    particle.radius;

                particle.baseVy =
                    Math.abs(
                        particle.baseVy
                    );
            }


            /*
               Pantulan dinding bawah
            */
            if (
                particle.y +
                particle.radius >=
                this.height
            ) {

                particle.y =
                    this.height -
                    particle.radius;

                particle.baseVy =
                    -Math.abs(
                        particle.baseVy
                    );
            }
        }
    }


    /*
       Warna partikel berdasarkan suhu
    */
    getParticleColor() {

        const value =
            Math.max(
                0,
                Math.min(
                    1,
                    this.temperature / 100
                )
            );

        const red =
            Math.round(
                30 + 225 * value
            );

        const green =
            Math.round(
                120 - 60 * value
            );

        const blue =
            Math.round(
                240 - 190 * value
            );

        return `rgb(${red}, ${green}, ${blue})`;
    }


    /*
       Menggambar partikel
    */
    draw() {

        this.ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );

        this.ctx.fillStyle =
            this.getParticleColor();


        for (
            const particle of this.particles
        ) {

            this.ctx.beginPath();

            this.ctx.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2
            );

            this.ctx.fill();
        }
    }
}


/*
   =========================================================
   MEMBUAT PARTICLE BOX
   =========================================================
*/

const particlesA =
    new ParticleBox(
        canvasA,
        20
    );

const particlesB =
    new ParticleBox(
        canvasB,
        20
    );


/*
   =========================================================
   MEMBACA NILAI SLIDER
   =========================================================
*/

function readControls() {

    controlA =
        Number(
            tempAInput.value
        );

    controlB =
        Number(
            tempBInput.value
        );

    controlThermo =
        Number(
            thermoInput.value
        );


    /*
       Kondisi awal simulasi
       mengikuti slider
    */
    temperatureA =
        controlA;

    temperatureB =
        controlB;

    temperatureThermo =
        controlThermo;
}


/*
   =========================================================
   UPDATE TAMPILAN SLIDER
   =========================================================
*/

function updateControlDisplay() {

    tempAValue.textContent =
        `${controlA.toFixed(0)} °C`;

    tempBValue.textContent =
        `${controlB.toFixed(0)} °C`;

    thermoValue.textContent =
        `${controlThermo.toFixed(0)} °C`;
}


/*
   =========================================================
   UPDATE DATA SIMULASI
   =========================================================
*/

function updateDisplay() {

    /*
       Temperatur simulasi
    */
    tempADisplay.textContent =
        `${temperatureA.toFixed(1)} °C`;

    tempBDisplay.textContent =
        `${temperatureB.toFixed(1)} °C`;

    thermoDisplay.textContent =
        `${temperatureThermo.toFixed(1)} °C`;


    /*
       Data temperatur
    */
    dataA.textContent =
        `${temperatureA.toFixed(1)} °C`;

    dataB.textContent =
        `${temperatureB.toFixed(1)} °C`;

    dataThermo.textContent =
        `${temperatureThermo.toFixed(1)} °C`;


    /*
       Perbedaan suhu Sistem A dan Sistem B
    */
    const difference =
        Math.abs(
            temperatureA -
            temperatureB
        );

    deltaT.textContent =
        `${difference.toFixed(1)} °C`;


    /*
       Update suhu partikel
    */
    particlesA.setTemperature(
        temperatureA
    );

    particlesB.setTemperature(
        temperatureB
    );


    /*
       Update tinggi cairan termometer
    */
    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                temperatureThermo
            )
        );

    thermometerLiquid.style.height =
        `${percentage}%`;


    /*
       Periksa kesetimbangan
    */
    checkEquilibrium();
}


/*
   =========================================================
   CEK KESETIMBANGAN TERMAL
   =========================================================
*/

function checkEquilibrium() {

    /*
       Toleransi sangat kecil.

       Namun saat proses benar-benar mencapai
       kondisi setimbang, ketiga suhu sudah
       disamakan secara persis oleh thermalProcess().
    */
    const tolerance = 0.01;


    const differenceAB =
        Math.abs(
            temperatureA -
            temperatureB
        );

    const differenceAT =
        Math.abs(
            temperatureA -
            temperatureThermo
        );

    const differenceBT =
        Math.abs(
            temperatureB -
            temperatureThermo
        );


    /*
       Jika ketiganya sama
    */
    if (
        differenceAB <= tolerance &&
        differenceAT <= tolerance &&
        differenceBT <= tolerance
    ) {

        equilibriumReached = true;


        statusBadge.textContent =
            "Kesetimbangan Termal";

        statusBadge.classList.add(
            "equal"
        );


        lawResult.textContent =
            "TA = TB = TC. Ketiga sistem berada dalam kesetimbangan termal.";


        heatArrow.textContent =
            "Q bersih = 0";


        heatText.textContent =
            "Tidak ada perpindahan kalor bersih. Partikel tetap bergerak.";
    }


    /*
       Jika belum setimbang
    */
    else {

        equilibriumReached = false;


        statusBadge.textContent =
            "Belum Setimbang";

        statusBadge.classList.remove(
            "equal"
        );


        lawResult.textContent =
            "Sistem belum mencapai kesetimbangan termal.";


        /*
           Menentukan arah perpindahan kalor
        */
        if (
            temperatureA >
            temperatureB
        ) {

            heatArrow.textContent =
                "A  →  B";

            heatText.textContent =
                "Kalor berpindah dari Sistem A yang lebih panas menuju Sistem B yang lebih dingin.";
        }

        else if (
            temperatureB >
            temperatureA
        ) {

            heatArrow.textContent =
                "B  →  A";

            heatText.textContent =
                "Kalor berpindah dari Sistem B yang lebih panas menuju Sistem A yang lebih dingin.";
        }

        else {

            heatArrow.textContent =
                "Q bersih = 0";

            heatText.textContent =
                "Temperatur Sistem A dan B sama.";
        }
    }
}


/*
   =========================================================
   PROSES PERPINDAHAN KALOR
   =========================================================
*/

function thermalProcess() {

    if (!running) return;

    /*
       Jika sudah setimbang,
       suhu tidak berubah lagi.

       Tetapi partikel tetap bergerak
       karena particleLoop() tetap berjalan.
    */
    if (equilibriumReached) return;


    /*
       Selisih suhu Sistem A dan B
    */
    const difference =
        temperatureA -
        temperatureB;


    /*
       Besarnya perubahan suhu
       setiap langkah.

       Nilai ini dibuat sedikit lebih cepat.
    */
    const change = 0.35;


    /*
       Jika suhu A dan B sudah sangat dekat,
       langsung buat ketiganya benar-benar sama.
    */
    if (
        Math.abs(difference)
        <= change * 2
    ) {

        /*
           Temperatur akhir diambil
           dari rata-rata A dan B.
        */
        const finalTemperature =
            (
                temperatureA +
                temperatureB
            ) / 2;


        /*
           KETIGANYA SAMA PERSIS
        */
        temperatureA =
            finalTemperature;

        temperatureB =
            finalTemperature;

        temperatureThermo =
            finalTemperature;


        equilibriumReached =
            true;


        /*
           Update tampilan
        */
        updateDisplay();

        return;
    }


    /*
       =====================================================
       A LEBIH PANAS DARIPADA B
       =====================================================
    */

    if (
        temperatureA >
        temperatureB
    ) {

        temperatureA -=
            change;

        temperatureB +=
            change;
    }


    /*
       =====================================================
       B LEBIH PANAS DARIPADA A
       =====================================================
    */

    else if (
        temperatureB >
        temperatureA
    ) {

        temperatureA +=
            change;

        temperatureB -=
            change;
    }


    /*
       =====================================================
       PERGERAKAN TERMOMETER
       =====================================================

       Termometer bergerak menuju
       temperatur rata-rata kedua sistem.
    */

    const targetThermometer =
        (
            temperatureA +
            temperatureB
        ) / 2;


    const thermometerStep =
        0.35;


    /*
       Jika termometer lebih dingin
    */
    if (
        temperatureThermo <
        targetThermometer
    ) {

        temperatureThermo =
            Math.min(
                temperatureThermo +
                thermometerStep,

                targetThermometer
            );
    }


    /*
       Jika termometer lebih panas
    */
    else if (
        temperatureThermo >
        targetThermometer
    ) {

        temperatureThermo =
            Math.max(
                temperatureThermo -
                thermometerStep,

                targetThermometer
            );
    }


    /*
       Update tampilan
    */
    updateDisplay();
}


/*
   =========================================================
   ANIMASI PARTIKEL
   =========================================================
*/

function particleLoop(time) {

    if (
        lastParticleTime === 0
    ) {

        lastParticleTime =
            time;
    }


    /*
       Membatasi delta time
       agar gerakan tidak meloncat
    */
    const deltaTime =
        Math.min(
            time -
            lastParticleTime,
            40
        );


    lastParticleTime =
        time;


    /*
       Partikel hanya bergerak
       ketika Play aktif.
    */
    if (running) {

        particlesA.update(
            deltaTime
        );

        particlesB.update(
            deltaTime
        );
    }


    /*
       Partikel tetap digambar
       meskipun Pause.
    */
    particlesA.draw();
    particlesB.draw();


    /*
       Lanjutkan animasi
    */
    particleAnimationFrame =
        requestAnimationFrame(
            particleLoop
        );
}


/*
   =========================================================
   ANIMASI PROSES TERMAL
   =========================================================
*/

function thermalLoop(time) {

    if (!running) return;


    /*
       Waktu awal
    */
    if (
        lastThermalTime === 0
    ) {

        lastThermalTime =
            time;
    }


    /*
       Proses perubahan suhu
       setiap 150 ms.
    */
    if (
        time -
        lastThermalTime >=
        150
    ) {

        thermalProcess();

        lastThermalTime =
            time;
    }


    /*
       Lanjutkan animasi
    */
    thermalAnimation =
        requestAnimationFrame(
            thermalLoop
        );
}


/*
   =========================================================
   START / MULAI
   =========================================================
*/

function startSimulation() {

    /*
       Jika sudah berjalan,
       jangan membuat animasi baru.
    */
    if (running) return;


    running = true;


    /*
       Reset timer animasi
    */
    lastParticleTime = 0;
    lastThermalTime = 0;


    /*
       Jalankan animasi partikel
    */
    if (
        particleAnimationFrame === null
    ) {

        particleAnimationFrame =
            requestAnimationFrame(
                particleLoop
            );
    }


    /*
       Jalankan proses termal
    */
    thermalAnimation =
        requestAnimationFrame(
            thermalLoop
        );
}


/*
   =========================================================
   PAUSE / JEDA
   =========================================================
*/

function pauseSimulation() {

    running = false;


    /*
       Hentikan proses perubahan suhu
    */
    if (
        thermalAnimation !== null
    ) {

        cancelAnimationFrame(
            thermalAnimation
        );

        thermalAnimation = null;
    }


    /*
       Reset waktu
    */
    lastThermalTime = 0;
    lastParticleTime = 0;
}


/*
   =========================================================
   RESET
   =========================================================
*/

function resetSimulation() {

    running = false;


    /*
       Hentikan animasi termal
    */
    if (
        thermalAnimation !== null
    ) {

        cancelAnimationFrame(
            thermalAnimation
        );

        thermalAnimation = null;
    }


    /*
       Kembalikan suhu simulasi
       ke nilai yang dipilih pada slider.
    */
    temperatureA =
        controlA;

    temperatureB =
        controlB;

    temperatureThermo =
        controlThermo;


    equilibriumReached =
        false;


    /*
       Buat ulang partikel
    */
    particlesA.createParticles();
    particlesB.createParticles();


    /*
       Set suhu partikel
    */
    particlesA.setTemperature(
        temperatureA
    );

    particlesB.setTemperature(
        temperatureB
    );


    /*
       Update tampilan
    */
    updateControlDisplay();
    updateDisplay();
}


/*
   =========================================================
   SLIDER SISTEM A
   =========================================================
*/

tempAInput.addEventListener(
    "input",
    function () {

        /*
           Slider tidak boleh berubah
           selama simulasi berjalan.
        */
        if (running) return;


        controlA =
            Number(
                this.value
            );


        temperatureA =
            controlA;


        equilibriumReached =
            false;


        updateControlDisplay();
        updateDisplay();
    }
);


/*
   =========================================================
   SLIDER SISTEM B
   =========================================================
*/

tempBInput.addEventListener(
    "input",
    function () {

        if (running) return;


        controlB =
            Number(
                this.value
            );


        temperatureB =
            controlB;


        equilibriumReached =
            false;


        updateControlDisplay();
        updateDisplay();
    }
);


/*
   =========================================================
   SLIDER TERMOMETER
   =========================================================
*/

thermoInput.addEventListener(
    "input",
    function () {

        if (running) return;


        controlThermo =
            Number(
                this.value
            );


        temperatureThermo =
            controlThermo;


        equilibriumReached =
            false;


        updateControlDisplay();
        updateDisplay();
    }
);


/*
   =========================================================
   EVENT BUTTON
   =========================================================
*/

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


/*
   =========================================================
   RESIZE WINDOW
   =========================================================
*/

window.addEventListener(
    "resize",
    function () {

        particlesA.resize();
        particlesB.resize();

        particlesA.draw();
        particlesB.draw();
    }
);


/*
   =========================================================
   INISIALISASI
   =========================================================
*/

/*
   Ambil nilai awal dari slider.
   Tidak ada suhu awal yang dipaksakan
   oleh JavaScript.
*/
readControls();


/*
   Tampilkan nilai slider
*/
updateControlDisplay();


/*
   Tampilkan kondisi awal
*/
updateDisplay();


/*
   Gambar partikel pertama kali
*/
particlesA.draw();
particlesB.draw();


/*
   Jalankan loop partikel.
   Loop ini terus aktif agar partikel
   dapat langsung bergerak ketika Play ditekan.
*/
particleAnimationFrame =
    requestAnimationFrame(
        particleLoop
    );