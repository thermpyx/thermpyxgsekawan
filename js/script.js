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
   17. UNIT & TEMPERATURE CONVERTER
========================================================= */

const setupConverter = (btnId, inputId, resultId, convertFn) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const resultEl = document.getElementById(resultId);

    if (!btn || !input || !resultEl) return;

    const processConversion = () => {
        const val = parseFloat(input.value);
        if (isNaN(val)) {
            resultEl.textContent = "—";
            return;
        }
        resultEl.textContent = convertFn(val);
    };

    btn.addEventListener("click", processConversion);

    input.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            processConversion();
        }
    });
};

const initConverters = () => {
    // 1. Celsius -> Kelvin
    setupConverter("convertCelsiusButton", "celsiusInput", "kelvinResult", 
        val => (val + 273.15).toFixed(2) + " K");

    // 2. Kelvin -> Celsius
    setupConverter("convertKelvinButton", "kelvinInput", "celsiusResultValue", 
        val => (val - 273.15).toFixed(2) + " °C");

    // 3. atm -> Pa
    setupConverter("convertAtmButton", "atmInput", "paResultValue", 
        val => (val * 101325).toLocaleString("id-ID") + " Pa");

    // 4. Pa -> atm
    setupConverter("convertPaButton", "paInput", "atmResultValue", 
        val => (val / 101325).toFixed(5) + " atm");

    // 5. Liter -> m³
    setupConverter("convertLiterButton", "literInput", "cubicMeterResultValue", 
        val => (val / 1000).toFixed(4) + " m³");

    // 6. m³ -> Liter
    setupConverter("convertCubicMeterButton", "cubicMeterInput", "literResultValue", 
        val => (val * 1000).toLocaleString("id-ID") + " L");

    // 7. Joule -> kJ
    setupConverter("convertJouleButton", "jouleInput", "kilojouleResult", 
        val => (val / 1000).toFixed(3) + " kJ");
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initConverters);
} else {
    initConverters();
}
