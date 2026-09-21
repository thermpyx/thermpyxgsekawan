/* =========================================================
   THERMPYX
   FIRST LAW OF THERMODYNAMICS
   CALCULATOR
========================================================= */


/* =========================================================
   1. GET ELEMENTS
========================================================= */

const firstLawQ =
    document.getElementById(
        "firstLawQ"
    );

const firstLawW =
    document.getElementById(
        "firstLawW"
    );

const firstLawDeltaU =
    document.getElementById(
        "firstLawDeltaU"
    );

const firstLawUnknown =
    document.getElementById(
        "firstLawUnknown"
    );

const firstLawCalculate =
    document.getElementById(
        "firstLawCalculate"
    );

const firstLawResult =
    document.getElementById(
        "firstLawResult"
    );

const firstLawResultValue =
    document.getElementById(
        "firstLawResultValue"
    );

const firstLawStep1 =
    document.getElementById(
        "firstLawStep1"
    );

const firstLawStep2 =
    document.getElementById(
        "firstLawStep2"
    );

const firstLawStep3 =
    document.getElementById(
        "firstLawStep3"
    );


/* =========================================================
   2. FORMAT NUMBER
========================================================= */

function formatFirstLawNumber(number) {

    return new Intl.NumberFormat(
        "en-US",
        {
            maximumFractionDigits: 6
        }
    ).format(number);

}


/* =========================================================
   3. CALCULATOR
========================================================= */

if (firstLawCalculate) {

    firstLawCalculate.addEventListener(
        "click",
        function () {

            const unknown =
                firstLawUnknown.value;


            const q =
                Number(
                    firstLawQ.value
                );

            const w =
                Number(
                    firstLawW.value
                );

            const deltaU =
                Number(
                    firstLawDeltaU.value
                );


            /* ==============================
               FIND ΔU
            =============================== */

            if (unknown === "deltaU") {

                if (
                    !Number.isFinite(q) ||
                    !Number.isFinite(w)
                ) {

                    alert(
                        "Please enter Q and W."
                    );

                    return;

                }


                const result =
                    q - w;


                const formattedQ =
                    formatFirstLawNumber(q);

                const formattedW =
                    formatFirstLawNumber(w);

                const formattedResult =
                    formatFirstLawNumber(result);


                firstLawResultValue.textContent =
                    `ΔU = ${formattedResult} J`;


                firstLawStep1.textContent =
                    "ΔU = Q − W";


                firstLawStep2.textContent =
                    `ΔU = (${formattedQ}) − (${formattedW})`;


                firstLawStep3.textContent =
                    `ΔU = ${formattedResult} J`;

            }


            /* ==============================
               FIND Q
            =============================== */

            else if (unknown === "Q") {

                if (
                    !Number.isFinite(deltaU) ||
                    !Number.isFinite(w)
                ) {

                    alert(
                        "Please enter ΔU and W."
                    );

                    return;

                }


                const result =
                    deltaU + w;


                const formattedDeltaU =
                    formatFirstLawNumber(
                        deltaU
                    );

                const formattedW =
                    formatFirstLawNumber(w);

                const formattedResult =
                    formatFirstLawNumber(result);


                firstLawResultValue.textContent =
                    `Q = ${formattedResult} J`;


                firstLawStep1.textContent =
                    "Q = ΔU + W";


                firstLawStep2.textContent =
                    `Q = (${formattedDeltaU}) + (${formattedW})`;


                firstLawStep3.textContent =
                    `Q = ${formattedResult} J`;

            }


            /* ==============================
               FIND W
            =============================== */

            else if (unknown === "W") {

                if (
                    !Number.isFinite(q) ||
                    !Number.isFinite(deltaU)
                ) {

                    alert(
                        "Please enter Q and ΔU."
                    );

                    return;

                }


                const result =
                    q - deltaU;


                const formattedQ =
                    formatFirstLawNumber(q);

                const formattedDeltaU =
                    formatFirstLawNumber(
                        deltaU
                    );

                const formattedResult =
                    formatFirstLawNumber(result);


                firstLawResultValue.textContent =
                    `W = ${formattedResult} J`;


                firstLawStep1.textContent =
                    "W = Q − ΔU";


                firstLawStep2.textContent =
                    `W = (${formattedQ}) − (${formattedDeltaU})`;


                firstLawStep3.textContent =
                    `W = ${formattedResult} J`;

            }


            /* Show Result */

            firstLawResult.classList.add(
                "show"
            );


            firstLawResult.scrollIntoView({

                behavior: "smooth",

                block: "nearest"

            });

        }
    );

}


console.log(
    "THERMPYX First Law Calculator: ready."
);