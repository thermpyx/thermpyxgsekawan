/* =========================================================
   THERMPYX
   Thermodynamic Learning & Calculation Platform
   MAIN JAVASCRIPT
========================================================= */


/* =========================================================
   1. BASIC ELEMENTS
========================================================= */

const body = document.body;

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const themeToggle =
    document.getElementById("themeToggle");

const mobileThemeToggle =
    document.getElementById("mobileThemeToggle");

const themeIcon =
    document.getElementById("themeIcon");

const themeText =
    document.getElementById("themeText");


/* =========================================================
   2. SIDEBAR
========================================================= */

if (sidebarToggle) {

    sidebarToggle.addEventListener(
        "click",
        function () {

            if (window.innerWidth > 768) {

                body.classList.toggle(
                    "sidebar-collapsed"
                );

            }

            else {

                body.classList.toggle(
                    "sidebar-mobile-open"
                );

            }

        }
    );

}


/* =========================================================
   3. MOBILE NAVIGATION
========================================================= */

const navItems =
    document.querySelectorAll(".nav-item");


navItems.forEach(function (item) {

    item.addEventListener(
        "click",
        function () {

            if (window.innerWidth <= 768) {

                body.classList.remove(
                    "sidebar-mobile-open"
                );

            }

        }
    );

});


/* =========================================================
   4. THEME SYSTEM
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


    localStorage.setItem(
        "thermpyx-theme",
        theme
    );

}


/* =========================================================
   5. THEME BUTTON
========================================================= */

function toggleTheme() {

    if (
        body.classList.contains(
            "light-mode"
        )
    ) {

        setTheme("dark");

    }

    else {

        setTheme("light");

    }

}


if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        toggleTheme
    );

}


if (mobileThemeToggle) {

    mobileThemeToggle.addEventListener(
        "click",
        toggleTheme
    );

}


/* =========================================================
   6. LOAD SAVED THEME
========================================================= */

const savedTheme =
    localStorage.getItem(
        "thermpyx-theme"
    );


if (savedTheme === "light") {

    setTheme("light");

}

else {

    setTheme("dark");

}


/* =========================================================
   7. ACTIVE NAVIGATION
========================================================= */

const sections =
    document.querySelectorAll(
        "main section[id]"
    );


function updateActiveNavigation() {

    if (!sections.length) {

        return;

    }


    let currentSection = "";

    const scrollPosition =
        window.scrollY + 120;


    sections.forEach(function (section) {

        const sectionTop =
            section.offsetTop;

        const sectionHeight =
            section.offsetHeight;


        if (
            scrollPosition >= sectionTop &&
            scrollPosition <
            sectionTop + sectionHeight
        ) {

            currentSection =
                section.id;

        }

    });


    navItems.forEach(function (item) {

        item.classList.remove("active");


        const link =
            item.getAttribute("href");


        if (
            link ===
            "#" + currentSection
        ) {

            item.classList.add("active");

        }

    });

}


window.addEventListener(
    "scroll",
    updateActiveNavigation
);


updateActiveNavigation();


/* =========================================================
   8. NAVIGATION CLICK
========================================================= */

navItems.forEach(function (item) {

    item.addEventListener(
        "click",
        function (event) {

            const targetId =
                item.getAttribute("href");


            if (
                !targetId ||
                !targetId.startsWith("#")
            ) {

                return;

            }


            const target =
                document.querySelector(
                    targetId
                );


            if (!target) {

                return;

            }


            event.preventDefault();


            const topbarHeight =
                window.innerWidth <= 768
                    ? 65
                    : 70;


            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                topbarHeight;


            window.scrollTo({

                top: targetPosition,

                behavior: "smooth"

            });

        }
    );

});


/* =========================================================
   9. HERO BUTTON NAVIGATION
========================================================= */

const heroLinks =
    document.querySelectorAll(
        '.primary-button, .secondary-button'
    );


heroLinks.forEach(function (link) {

    link.addEventListener(
        "click",
        function (event) {

            const targetId =
                link.getAttribute("href");


            if (
                !targetId ||
                !targetId.startsWith("#")
            ) {

                return;

            }


            const target =
                document.querySelector(
                    targetId
                );


            if (!target) {

                return;

            }


            event.preventDefault();


            const topbarHeight =
                window.innerWidth <= 768
                    ? 65
                    : 70;


            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                topbarHeight;


            window.scrollTo({

                top: targetPosition,

                behavior: "smooth"

            });

        }
    );

});


/* =========================================================
   10. CLOSE MOBILE SIDEBAR
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        if (window.innerWidth > 768) {

            return;

        }


        if (
            !body.classList.contains(
                "sidebar-mobile-open"
            )
        ) {

            return;

        }


        const clickedInsideSidebar =
            sidebar &&
            sidebar.contains(event.target);


        const clickedToggle =
            sidebarToggle &&
            sidebarToggle.contains(event.target);


        if (
            !clickedInsideSidebar &&
            !clickedToggle
        ) {

            body.classList.remove(
                "sidebar-mobile-open"
            );

        }

    }
);


/* =========================================================
   11. RESIZE
========================================================= */

window.addEventListener(
    "resize",
    function () {

        if (window.innerWidth > 768) {

            body.classList.remove(
                "sidebar-mobile-open"
            );

        }

    }
);


/* =========================================================
   12. NUMBER FORMATTER
========================================================= */

function formatNumber(number) {

    return new Intl.NumberFormat(
        "en-US",
        {
            maximumFractionDigits: 6
        }
    ).format(number);

}


/* =========================================================
   13. HEAT CALCULATOR
   Formula:
   Q = m × c × ΔT
========================================================= */

const calculateHeatButton =
    document.getElementById(
        "calculateHeatButton"
    );

const heatMass =
    document.getElementById(
        "heatMass"
    );

const heatSpecificHeat =
    document.getElementById(
        "heatSpecificHeat"
    );

const heatTemperature =
    document.getElementById(
        "heatTemperature"
    );

const heatResult =
    document.getElementById(
        "heatResult"
    );

const heatResultValue =
    document.getElementById(
        "heatResultValue"
    );

const heatStep1 =
    document.getElementById(
        "heatStep1"
    );

const heatStep2 =
    document.getElementById(
        "heatStep2"
    );

const heatStep3 =
    document.getElementById(
        "heatStep3"
    );

const heatFinalAnswer =
    document.getElementById(
        "heatFinalAnswer"
    );


if (calculateHeatButton) {

    calculateHeatButton.addEventListener(
        "click",
        function () {

            const mass =
                Number(
                    heatMass.value
                );

            const specificHeat =
                Number(
                    heatSpecificHeat.value
                );

            const temperatureChange =
                Number(
                    heatTemperature.value
                );


            if (
                !Number.isFinite(mass) ||
                !Number.isFinite(
                    specificHeat
                ) ||
                !Number.isFinite(
                    temperatureChange
                )
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


            const heat =
                mass *
                specificHeat *
                temperatureChange;


            const m =
                formatNumber(mass);

            const c =
                formatNumber(
                    specificHeat
                );

            const deltaT =
                formatNumber(
                    temperatureChange
                );

            const q =
                formatNumber(heat);


            heatResultValue.textContent =
                `Q = ${q} J`;


            heatStep1.textContent =
                "Q = m × c × ΔT";


            heatStep2.textContent =
                `Q = (${m}) × (${c}) × (${deltaT})`;


            heatStep3.textContent =
                `Q = ${q} J`;


            heatFinalAnswer.textContent =
                `Q = ${q} J`;


            heatResult.classList.add(
                "show"
            );


            saveCalculationHistory({

                type: "Heat",

                formula:
                    "Q = m × c × ΔT",

                inputs:
                    `m = ${m} kg | c = ${c} J/kg·K | ΔT = ${deltaT} K`,

                result:
                    `Q = ${q} J`

            });

        }
    );

}


/* =========================================================
   14. WORK CALCULATOR
   Formula:
   W = P × ΔV
========================================================= */

const calculateWorkButton =
    document.getElementById(
        "calculateWorkButton"
    );

const workPressure =
    document.getElementById(
        "workPressure"
    );

const workVolume =
    document.getElementById(
        "workVolume"
    );

const workResult =
    document.getElementById(
        "workResult"
    );

const workResultValue =
    document.getElementById(
        "workResultValue"
    );

const workStep1 =
    document.getElementById(
        "workStep1"
    );

const workStep2 =
    document.getElementById(
        "workStep2"
    );

const workStep3 =
    document.getElementById(
        "workStep3"
    );

const workFinalAnswer =
    document.getElementById(
        "workFinalAnswer"
    );


if (calculateWorkButton) {

    calculateWorkButton.addEventListener(
        "click",
        function () {

            const pressure =
                Number(
                    workPressure.value
                );

            const volumeChange =
                Number(
                    workVolume.value
                );


            if (
                !Number.isFinite(
                    pressure
                ) ||
                !Number.isFinite(
                    volumeChange
                )
            ) {

                alert(
                    "Please fill in all Work Calculator fields."
                );

                return;

            }


            const work =
                pressure *
                volumeChange;


            const p =
                formatNumber(
                    pressure
                );

            const deltaV =
                formatNumber(
                    volumeChange
                );

            const w =
                formatNumber(work);


            workResultValue.textContent =
                `W = ${w} J`;


            workStep1.textContent =
                "W = P × ΔV";


            workStep2.textContent =
                `W = (${p}) × (${deltaV})`;


            workStep3.textContent =
                `W = ${w} J`;


            workFinalAnswer.textContent =
                `W = ${w} J`;


            workResult.classList.add(
                "show"
            );


            saveCalculationHistory({

                type: "Work",

                formula:
                    "W = P × ΔV",

                inputs:
                    `P = ${p} Pa | ΔV = ${deltaV} m³`,

                result:
                    `W = ${w} J`

            });

        }
    );

}


/* =========================================================
   15. TEMPERATURE CONVERTER
   Celsius ↔ Kelvin
========================================================= */

const temperatureFromDisplay =
    document.getElementById(
        "temperatureFromDisplay"
    );

const temperatureToDisplay =
    document.getElementById(
        "temperatureToDisplay"
    );

const temperatureDirection =
    document.getElementById(
        "temperatureDirection"
    );

const temperatureValue =
    document.getElementById(
        "temperatureValue"
    );

const temperatureSwapButton =
    document.getElementById(
        "temperatureSwapButton"
    );

const convertTemperatureButton =
    document.getElementById(
        "convertTemperatureButton"
    );

const temperatureConversionValue =
    document.getElementById(
        "temperatureConversionValue"
    );


/* Current direction */

let temperatureFromUnit = "C";

let temperatureToUnit = "K";


/* =========================================================
   UPDATE TEMPERATURE DISPLAY
========================================================= */

function updateTemperatureDirection() {

    if (
        !temperatureFromDisplay ||
        !temperatureToDisplay ||
        !temperatureDirection
    ) {

        return;

    }


    if (
        temperatureFromUnit === "C" &&
        temperatureToUnit === "K"
    ) {

        temperatureFromDisplay.textContent =
            "Celsius (°C)";

        temperatureToDisplay.textContent =
            "Kelvin (K)";

        temperatureDirection.textContent =
            "°C → K";

    }

    else {

        temperatureFromDisplay.textContent =
            "Kelvin (K)";

        temperatureToDisplay.textContent =
            "Celsius (°C)";

        temperatureDirection.textContent =
            "K → °C";

    }

}


/* =========================================================
   REVERSE TEMPERATURE
========================================================= */

if (temperatureSwapButton) {

    temperatureSwapButton.addEventListener(
        "click",
        function () {

            const oldFrom =
                temperatureFromUnit;


            temperatureFromUnit =
                temperatureToUnit;


            temperatureToUnit =
                oldFrom;


            updateTemperatureDirection();


            /* Clear old result */

            if (temperatureConversionValue) {

                temperatureConversionValue.textContent =
                    "—";

            }

        }
    );

}


/* =========================================================
   CONVERT TEMPERATURE
========================================================= */

if (convertTemperatureButton) {

    convertTemperatureButton.addEventListener(
        "click",
        function () {

            const value =
                Number(
                    temperatureValue.value
                );


            if (!Number.isFinite(value)) {

                alert(
                    "Please enter a temperature value."
                );

                temperatureValue.focus();

                return;

            }


            let result;


            /* Celsius → Kelvin */

            if (
                temperatureFromUnit === "C" &&
                temperatureToUnit === "K"
            ) {

                result =
                    value + 273.15;

            }


            /* Kelvin → Celsius */

            else {

                if (value < 0) {

                    alert(
                        "Kelvin temperature cannot be below 0 K."
                    );

                    temperatureValue.focus();

                    return;

                }


                result =
                    value - 273.15;

            }


            const formattedResult =
                formatNumber(result);


            const unit =
                temperatureToUnit === "K"
                    ? "K"
                    : "°C";


            if (temperatureConversionValue) {

                temperatureConversionValue.textContent =
                    `${formattedResult} ${unit}`;

            }

        }
    );

}


updateTemperatureDirection();


/* =========================================================
   16. HISTORY STORAGE
========================================================= */

function getCalculationHistory() {

    const savedHistory =
        localStorage.getItem(
            "thermpyx-history"
        );


    if (!savedHistory) {

        return [];

    }


    try {

        const history =
            JSON.parse(
                savedHistory
            );


        if (Array.isArray(history)) {

            return history;

        }


        return [];

    }

    catch (error) {

        console.error(
            "Could not read calculation history:",
            error
        );

        return [];

    }

}


/* =========================================================
   17. SAVE HISTORY
========================================================= */

function saveCalculationHistory(
    calculation
) {

    const history =
        getCalculationHistory();


    const newCalculation = {

        ...calculation,

        time:
            new Date().toLocaleString(
                "id-ID",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            )

    };


    history.unshift(
        newCalculation
    );


    localStorage.setItem(

        "thermpyx-history",

        JSON.stringify(history)

    );


    renderCalculationHistory();

}


/* =========================================================
   18. RENDER HISTORY
========================================================= */

function renderCalculationHistory() {

    const historyList =
        document.getElementById(
            "historyList"
        );


    if (!historyList) {

        return;

    }


    const history =
        getCalculationHistory();


    historyList.innerHTML = "";


    if (history.length === 0) {

        historyList.innerHTML = `

            <div class="history-empty">

                <div class="history-icon">
                    ◷
                </div>

                <h3>
                    No calculations yet
                </h3>

                <p>
                    Your previous calculations
                    will appear here.
                </p>

            </div>

        `;

        return;

    }


    history.forEach(
        function (item) {

            const historyItem =
                document.createElement(
                    "div"
                );


            historyItem.className =
                "history-item";


            historyItem.innerHTML = `

                <div class="history-item-header">

                    <span class="history-item-type">
                        ${item.type}
                    </span>

                    <span class="history-item-time">
                        ${item.time}
                    </span>

                </div>


                <div class="history-item-formula">
                    ${item.formula}
                </div>


                <div class="history-item-inputs">
                    ${item.inputs}
                </div>


                <div class="history-item-result">

                    <span>
                        RESULT
                    </span>

                    <strong>
                        ${item.result}
                    </strong>

                </div>

            `;


            historyList.appendChild(
                historyItem
            );

        }
    );

}


/* =========================================================
   19. CLEAR HISTORY
========================================================= */

const clearHistoryButton =
    document.getElementById(
        "clearHistoryButton"
    );


if (clearHistoryButton) {

    clearHistoryButton.addEventListener(
        "click",
        function () {

            const history =
                getCalculationHistory();


            if (history.length === 0) {

                return;

            }


            const confirmed =
                confirm(
                    "Are you sure you want to clear all calculation history?"
                );


            if (!confirmed) {

                return;

            }


            localStorage.removeItem(
                "thermpyx-history"
            );


            renderCalculationHistory();

        }
    );

}


/* =========================================================
   20. INITIALIZE HISTORY
========================================================= */

renderCalculationHistory();


/* =========================================================
   21. INITIAL MESSAGE
========================================================= */

console.log(
    "THERMPYX initialized successfully."
);

console.log(
    "Sidebar system: ready."
);

console.log(
    "Theme system: ready."
);

console.log(
    "Navigation system: ready."
);

console.log(
    "Heat Calculator: ready."
);

console.log(
    "Work Calculator: ready."
);
console.log(
    "Temperature Converter: ready."
);
console.log(
    "History system: ready."
);