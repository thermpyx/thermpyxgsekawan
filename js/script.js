/* =========================================================
   THERMPYX
   Thermodynamic Learning & Calculation Platform
   Main JavaScript
========================================================= */


/* =========================================================
   1. GET HTML ELEMENTS
========================================================= */

const body = document.body;

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

const themeToggle = document.getElementById("themeToggle");
const mobileThemeToggle = document.getElementById("mobileThemeToggle");

const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");


/* =========================================================
   2. SIDEBAR OPEN / CLOSE
========================================================= */

if (sidebarToggle) {

    sidebarToggle.addEventListener("click", function () {

        /* Desktop */
        if (window.innerWidth > 768) {

            body.classList.toggle("sidebar-collapsed");

        }

        /* Mobile */
        else {

            body.classList.toggle("sidebar-mobile-open");

        }

    });

}


/* =========================================================
   3. MOBILE NAVIGATION
========================================================= */

const navItems = document.querySelectorAll(".nav-item");

navItems.forEach(function (item) {

    item.addEventListener("click", function () {

        /* Close sidebar on mobile */
        if (window.innerWidth <= 768) {

            body.classList.remove("sidebar-mobile-open");

        }

    });

});


/* =========================================================
   4. DARK / LIGHT MODE
========================================================= */

function setTheme(theme) {

    if (theme === "light") {

        body.classList.add("light-mode");

        if (themeIcon) {
            themeIcon.textContent = "☀";
        }

        if (themeText) {
            themeText.textContent = "Light Mode";
        }

    }

    else {

        body.classList.remove("light-mode");

        if (themeIcon) {
            themeIcon.textContent = "☾";
        }

        if (themeText) {
            themeText.textContent = "Dark Mode";
        }

    }

    localStorage.setItem("thermpyx-theme", theme);

}


/* =========================================================
   5. THEME BUTTON
========================================================= */

if (themeToggle) {

    themeToggle.addEventListener("click", function () {

        if (body.classList.contains("light-mode")) {

            setTheme("dark");

        }

        else {

            setTheme("light");

        }

    });

}


/* =========================================================
   6. MOBILE THEME BUTTON
========================================================= */

if (mobileThemeToggle) {

    mobileThemeToggle.addEventListener("click", function () {

        if (body.classList.contains("light-mode")) {

            setTheme("dark");

        }

        else {

            setTheme("light");

        }

    });

}


/* =========================================================
   7. LOAD SAVED THEME
========================================================= */

const savedTheme = localStorage.getItem("thermpyx-theme");

if (savedTheme === "light") {

    setTheme("light");

}

else {

    setTheme("dark");

}


/* =========================================================
   8. ACTIVE NAVIGATION
========================================================= */

const sections = document.querySelectorAll("main section[id]");

function updateActiveNavigation() {

    let currentSection = "";

    const scrollPosition = window.scrollY + 150;

    sections.forEach(function (section) {

        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (
            scrollPosition >= sectionTop &&
            scrollPosition < sectionTop + sectionHeight
        ) {

            currentSection = section.getAttribute("id");

        }

    });


    navItems.forEach(function (item) {

        item.classList.remove("active");

        const link = item.getAttribute("href");

        if (link === "#" + currentSection) {

            item.classList.add("active");

        }

    });

}


/* Run while scrolling */
window.addEventListener("scroll", updateActiveNavigation);


/* Run once when page loads */
updateActiveNavigation();


/* =========================================================
   9. NAVIGATION CLICK
========================================================= */

navItems.forEach(function (item) {

    item.addEventListener("click", function (event) {

        const targetId = item.getAttribute("href");

        /* Make sure this is an internal link */
        if (
            targetId &&
            targetId.startsWith("#")
        ) {

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                const topbarHeight = 70;

                const targetPosition =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    topbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });

            }

        }

    });

});


/* =========================================================
   10. HERO BUTTON NAVIGATION
========================================================= */

const heroLinks = document.querySelectorAll(
    '.primary-button, .secondary-button'
);

heroLinks.forEach(function (link) {

    link.addEventListener("click", function (event) {

        const targetId = link.getAttribute("href");

        if (
            targetId &&
            targetId.startsWith("#")
        ) {

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                const topbarHeight = 70;

                const targetPosition =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    topbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });

            }

        }

    });

});


/* =========================================================
   11. CLOSE MOBILE SIDEBAR WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener("click", function (event) {

    if (window.innerWidth > 768) {
        return;
    }

    if (!body.classList.contains("sidebar-mobile-open")) {
        return;
    }

    const clickedInsideSidebar =
        sidebar && sidebar.contains(event.target);

    const clickedToggle =
        sidebarToggle && sidebarToggle.contains(event.target);

    if (
        !clickedInsideSidebar &&
        !clickedToggle
    ) {

        body.classList.remove("sidebar-mobile-open");

    }

});


/* =========================================================
   12. RESET MOBILE SIDEBAR WHEN RESIZING
========================================================= */

window.addEventListener("resize", function () {

    if (window.innerWidth > 768) {

        body.classList.remove("sidebar-mobile-open");

    }

});


/* =========================================================
   13. CALCULATOR CARDS
========================================================= */

const calculatorCards =
    document.querySelectorAll(".calculator-card");

calculatorCards.forEach(function (card) {

    card.addEventListener("click", function () {

        const title =
            card.querySelector("h3");

        if (title) {

            console.log(
                "Calculator selected:",
                title.textContent
            );

        }

    });

});


/* =========================================================
   14. INITIAL MESSAGE
========================================================= */

console.log("THERMPYX initialized successfully.");
console.log("Navigation system: ready.");
console.log("Theme system: ready.");
console.log("Sidebar system: ready.");


/* =========================================================
   15. HEAT CALCULATOR
   Formula:
   Q = m × c × ΔT
========================================================= */

const calculateHeatButton =
    document.getElementById("calculateHeatButton");

const heatMass =
    document.getElementById("heatMass");

const heatSpecificHeat =
    document.getElementById("heatSpecificHeat");

const heatTemperature =
    document.getElementById("heatTemperature");

const heatResult =
    document.getElementById("heatResult");

const heatResultValue =
    document.getElementById("heatResultValue");

const heatStep1 =
    document.getElementById("heatStep1");

const heatStep2 =
    document.getElementById("heatStep2");

const heatStep3 =
    document.getElementById("heatStep3");

const heatFinalAnswer =
    document.getElementById("heatFinalAnswer");


/* Number formatter */

function formatNumber(number) {

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 6
    }).format(number);

}


/* Calculate Heat */

if (calculateHeatButton) {

    calculateHeatButton.addEventListener("click", function () {

        const mass =
            Number(heatMass.value);

        const specificHeat =
            Number(heatSpecificHeat.value);

        const temperatureChange =
            Number(heatTemperature.value);


        /* Validation */

        if (
            !Number.isFinite(mass) ||
            !Number.isFinite(specificHeat) ||
            !Number.isFinite(temperatureChange)
        ) {

            alert(
                "Please fill in all Heat Calculator fields."
            );

            return;

        }


        if (mass <= 0) {

            alert(
                "Mass must be greater than 0."
            );

            heatMass.focus();

            return;

        }


        if (specificHeat <= 0) {

            alert(
                "Specific heat capacity must be greater than 0."
            );

            heatSpecificHeat.focus();

            return;

        }


        /* Formula */

        const heat =
            mass *
            specificHeat *
            temperatureChange;


        /* Result */

        const formattedMass =
            formatNumber(mass);

        const formattedSpecificHeat =
            formatNumber(specificHeat);

        const formattedTemperature =
            formatNumber(temperatureChange);

        const formattedHeat =
            formatNumber(heat);


        /* Show result */

        heatResultValue.textContent =
            `Q = ${formattedHeat} J`;


        /* Step 1 */

        heatStep1.textContent =
            "Q = m × c × ΔT";


        /* Step 2 */

        heatStep2.textContent =
            `Q = (${formattedMass}) × (${formattedSpecificHeat}) × (${formattedTemperature})`;


        /* Step 3 */

        heatStep3.textContent =
            `Q = ${formattedHeat} J`;


        /* Final Answer */

        heatFinalAnswer.textContent =
            `Q = ${formattedHeat} J`;


        /* Show calculation result */

        heatResult.classList.add("show");


        /* Scroll gently to result */

        heatResult.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    });

}

/* =========================================================
   16. WORK CALCULATOR
   Formula:
   W = P × ΔV
========================================================= */

const calculateWorkButton =
    document.getElementById("calculateWorkButton");

const workPressure =
    document.getElementById("workPressure");

const workVolume =
    document.getElementById("workVolume");

const workResult =
    document.getElementById("workResult");

const workResultValue =
    document.getElementById("workResultValue");

const workStep1 =
    document.getElementById("workStep1");

const workStep2 =
    document.getElementById("workStep2");

const workStep3 =
    document.getElementById("workStep3");

const workFinalAnswer =
    document.getElementById("workFinalAnswer");


/* Calculate Work */

if (calculateWorkButton) {

    calculateWorkButton.addEventListener("click", function () {

        const pressure =
            Number(workPressure.value);

        const volumeChange =
            Number(workVolume.value);


        /* Validation */

        if (
            !Number.isFinite(pressure) ||
            !Number.isFinite(volumeChange)
        ) {

            alert(
                "Please fill in all Work Calculator fields."
            );

            return;

        }


        /* Calculate */

        const work =
            pressure *
            volumeChange;


        /* Format Number */

        const formattedPressure =
            formatNumber(pressure);

        const formattedVolume =
            formatNumber(volumeChange);

        const formattedWork =
            formatNumber(work);


        /* Result */

        workResultValue.textContent =
            `W = ${formattedWork} J`;


        /* Step 1 */

        workStep1.textContent =
            "W = P × ΔV";


        /* Step 2 */

        workStep2.textContent =
            `W = (${formattedPressure}) × (${formattedVolume})`;


        /* Step 3 */

        workStep3.textContent =
            `W = ${formattedWork} J`;


        /* Final Answer */

        workFinalAnswer.textContent =
            `W = ${formattedWork} J`;


        /* Show Result */

        workResult.classList.add("show");


        /* Scroll to result */

        workResult.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    });

}
/* =========================================================
   17. TEMPERATURE CONVERTER
========================================================= */


/* Celsius → Kelvin */

const convertCelsiusButton =
    document.getElementById("convertCelsiusButton");

const celsiusInput =
    document.getElementById("celsiusInput");

const temperatureResult =
    document.getElementById("temperatureResult");

const kelvinResult =
    document.getElementById("kelvinResult");


if (convertCelsiusButton) {

    convertCelsiusButton.addEventListener("click", function () {

        const celsius =
            Number(celsiusInput.value);


        /* Validation */

        if (!Number.isFinite(celsius)) {

            alert(
                "Please enter a Celsius temperature."
            );

            celsiusInput.focus();

            return;

        }


        /* Conversion */

        const kelvin =
            celsius + 273.15;


        const formattedKelvin =
            formatNumber(kelvin);


        /* Display Result */

        kelvinResult.textContent =
            `${formattedKelvin} K`;

    });

}


/* Kelvin → Celsius */

const convertKelvinButton =
    document.getElementById("convertKelvinButton");

const kelvinInput =
    document.getElementById("kelvinInput");

const celsiusResult =
    document.getElementById("celsiusResult");

const celsiusResultValue =
    document.getElementById("celsiusResultValue");


if (convertKelvinButton) {

    convertKelvinButton.addEventListener("click", function () {

        const kelvin =
            Number(kelvinInput.value);


        /* Validation */

        if (!Number.isFinite(kelvin)) {

            alert(
                "Please enter a Kelvin temperature."
            );

            kelvinInput.focus();

            return;

        }


        /* Kelvin cannot be below absolute zero */

        if (kelvin < 0) {

            alert(
                "Kelvin temperature cannot be below 0 K."
            );

            kelvinInput.focus();

            return;

        }


        /* Conversion */

        const celsius =
            kelvin - 273.15;


        const formattedCelsius =
            formatNumber(celsius);


        /* Display Result */

        celsiusResultValue.textContent =
            `${formattedCelsius} °C`;

    });

}
/* =========================================================
   18. PRESSURE CONVERTER (atm ↔ Pa)
========================================================= */

/* atm → Pa */
const convertAtmButton =
    document.getElementById("convertAtmButton");

const atmInput =
    document.getElementById("atmInput");

const paResultValue =
    document.getElementById("paResultValue");

if (convertAtmButton) {
    convertAtmButton.addEventListener("click", function () {
        const atm =
            Number(atmInput.value);

        /* Validation */
        if (!Number.isFinite(atm)) {
            alert(
                "Please enter an atm pressure."
            );
            atmInput.focus();
            return;
        }

        if (atm < 0) {
            alert(
                "Pressure cannot be below 0 atm."
            );
            atmInput.focus();
            return;
        }

        /* Conversion: 1 atm = 101,325 Pa */
        const pa =
            atm * 101325;

        const formattedPa =
            formatNumber(pa);

        /* Display Result */
        paResultValue.textContent =
            `${formattedPa} Pa`;
    });
}

/* Pa → atm */
const convertPaButton =
    document.getElementById("convertPaButton");

const paInput =
    document.getElementById("paInput");

const atmResultValue =
    document.getElementById("atmResultValue");

if (convertPaButton) {
    convertPaButton.addEventListener("click", function () {
        const pa =
            Number(paInput.value);

        /* Validation */
        if (!Number.isFinite(pa)) {
            alert(
                "Please enter a Pascal (Pa) pressure."
            );
            paInput.focus();
            return;
        }

        if (pa < 0) {
            alert(
                "Pressure cannot be below 0 Pa."
            );
            paInput.focus();
            return;
        }

        /* Conversion: 1 Pa = 1 / 101,325 atm */
        const atm =
            pa / 101325;

        const formattedAtm =
            formatNumber(atm);

        /* Display Result */
        atmResultValue.textContent =
            `${formattedAtm} atm`;
    });
}


/* =========================================================
   19. VOLUME CONVERTER (L ↔ m³)
========================================================= */

/* Liter → m³ */
const convertLiterButton =
    document.getElementById("convertLiterButton");

const literInput =
    document.getElementById("literInput");

const cubicMeterResultValue =
    document.getElementById("cubicMeterResultValue");

if (convertLiterButton) {
    convertLiterButton.addEventListener("click", function () {
        const liter =
            Number(literInput.value);

        /* Validation */
        if (!Number.isFinite(liter)) {
            alert(
                "Please enter a volume in Liters (L)."
            );
            literInput.focus();
            return;
        }

        if (liter < 0) {
            alert(
                "Volume cannot be below 0 L."
            );
            literInput.focus();
            return;
        }

        /* Conversion: 1 L = 0.001 m³ */
        const cubicMeter =
            liter / 1000;

        const formattedCubicMeter =
            formatNumber(cubicMeter);

        /* Display Result */
        cubicMeterResultValue.textContent =
            `${formattedCubicMeter} m³`;
    });
}

/* m³ → Liter */
const convertCubicMeterButton =
    document.getElementById("convertCubicMeterButton");

const cubicMeterInput =
    document.getElementById("cubicMeterInput");

const literResultValue =
    document.getElementById("literResultValue");

if (convertCubicMeterButton) {
    convertCubicMeterButton.addEventListener("click", function () {
        const cubicMeter =
            Number(cubicMeterInput.value);

        /* Validation */
        if (!Number.isFinite(cubicMeter)) {
            alert(
                "Please enter a volume in m³."
            );
            cubicMeterInput.focus();
            return;
        }

        if (cubicMeter < 0) {
            alert(
                "Volume cannot be below 0 m³."
            );
            cubicMeterInput.focus();
            return;
        }

        /* Conversion: 1 m³ = 1,000 L */
        const liter =
            cubicMeter * 1000;

        const formattedLiter =
            formatNumber(liter);

        /* Display Result */
        literResultValue.textContent =
            `${formattedLiter} L`;
    });
}
