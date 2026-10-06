/* THERMPYX: shared fixed question bank for live player and host. */
function getQuestionsForTopic(topic){


    const key =
        String(topic || "")
            .toLowerCase()
            .trim();



    // ======================================================
    // HEAT & TEMPERATURE
    // ======================================================

    const heatQuestions = [

        {
            question:
                "What is the SI unit of temperature?",

            options:[
                "Celsius",
                "Kelvin",
                "Fahrenheit",
                "Joule"
            ],

            correctAnswer:1
        },


        {
            question:
                "Heat naturally flows from...",

            options:[
                "Low temperature to high temperature",
                "High temperature to low temperature",
                "Low pressure to high pressure",
                "Small volume to large volume"
            ],

            correctAnswer:1
        },


        {
            question:
                "Which symbol is commonly used for heat?",

            options:[
                "Q",
                "P",
                "V",
                "U"
            ],

            correctAnswer:0
        }

    ];




    // ======================================================
    // WORK & ENERGY
    // ======================================================

    const workQuestions = [

        {
            question:
                "Thermodynamic work at constant pressure can be expressed as...",

            options:[
                "W = PΔV",
                "W = mcΔT",
                "W = Q + T",
                "PV = nRT"
            ],

            correctAnswer:0
        },


        {
            question:
                "When a gas expands, its volume...",

            options:[
                "Decreases",
                "Remains constant",
                "Increases",
                "Becomes zero"
            ],

            correctAnswer:2
        },


        {
            question:
                "The SI unit of work is...",

            options:[
                "Pascal",
                "Kelvin",
                "Joule",
                "Watt"
            ],

            correctAnswer:2
        }

    ];





    // ======================================================
    // FIRST LAW OF THERMODYNAMICS
    // ======================================================

    const firstLawQuestions = [

        {
            question:
                "Which equation represents the First Law of Thermodynamics?",

            options:[
                "ΔU = Q - W",
                "P = F / A",
                "Q = mcΔT",
                "PV = nRT"
            ],

            correctAnswer:0
        },


        {
            question:
                "Internal energy is represented by the symbol...",

            options:[
                "P",
                "V",
                "U",
                "T"
            ],

            correctAnswer:2
        },


        {
            question:
                "In the First Law of Thermodynamics, Q represents...",

            options:[
                "Pressure",
                "Heat",
                "Volume",
                "Temperature"
            ],

            correctAnswer:1
        },


        {
            question:
                "According to the First Law of Thermodynamics, energy can enter a system through...",

            options:[
                "Heat and work",
                "Temperature and pressure",
                "Volume and density",
                "Mass and force"
            ],

            correctAnswer:0
        },


        {
            question:
                "A bicycle pump becomes hot after repeated use because...",

            options:[
                "Air creates energy by itself",
                "Work done on the air increases its internal energy",
                "Heat only comes from the hand",
                "Temperature is unrelated to energy"
            ],

            correctAnswer:1
        },


        {
            question:
                "If a system receives heat and does no work, its internal energy will...",

            options:[
                "Increase",
                "Decrease",
                "Remain constant",
                "Become zero"
            ],

            correctAnswer:0
        },


        {
            question:
                "A laptop becomes hot during heavy use because electrical energy is converted into...",

            options:[
                "Only mechanical energy",
                "Internal energy and heat released to surroundings",
                "Only chemical energy",
                "Only potential energy"
            ],

            correctAnswer:1
        },


        {
            question:
                "Why is it important to define the system before applying the First Law of Thermodynamics?",

            options:[
                "Because it determines energy interactions being analyzed",
                "Because temperature cannot be measured",
                "Because pressure is always constant",
                "Because heat does not exist"
            ],

            correctAnswer:0
        },


        {
            question:
                "When a gas is compressed by a piston, energy is transferred to the gas through...",
            options:[
                "Radiation",
                "Work",
                "Mass loss",
                "Temperature only"
            ],
            correctAnswer:1
        },
        {
            question:
                "Two objects have the same initial and final states. Their change in internal energy is...",
            options:[
                "Always different",
                "The same because internal energy is a state function",
                "Always zero",
                "Impossible to determine"
            ],
            correctAnswer:1
        }
    ];
    // ======================================================
    // THERMODYNAMIC PROCESSES
    // ======================================================
    const processQuestions = [

        {
            question:
                "An isobaric process occurs at constant...",

            options:[
                "Temperature",
                "Pressure",
                "Volume",
                "Internal energy"
            ],

            correctAnswer:1
        },
        {
            question:
                "An isochoric process occurs at constant...",

            options:[
                "Pressure",
                "Temperature",
                "Volume",
                "Heat"
            ],

            correctAnswer:2
        },
        {
            question:
                "An isothermal process occurs at constant...",

            options:[
                "Temperature",
                "Pressure",
                "Volume",
                "Work"
            ],

            correctAnswer:0
        }
    ];
    // ======================================================
    // TOPIC SELECTOR
    // ======================================================
    if(
        key.includes("heat")
    ){
        return heatQuestions;
    }
    if(
        key.includes("work")
        ||
        key.includes("energy")
    ){

        return workQuestions;
    }
    if(
    key.includes("first")
    &&
    key.includes("law")
    ){
    return firstLawQuestions;
    }
    if(
        key.includes("process")
    ){
        return processQuestions;
    }
    if(
        key.includes("all")
    ){
        return [

            ...heatQuestions,

            ...workQuestions,

            ...firstLawQuestions,

            ...processQuestions
        ];
    }
    return [];
}
