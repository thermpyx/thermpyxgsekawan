/* Frozen custom questions are shared by player and host. */
function getQuestionsForRoom(room) {
    if (room.questions == null) return getQuestionsForTopic(room.topic);
    if (!Array.isArray(room.questions) || room.questions.length < 1 || room.questions.length > 100) throw new Error("Invalid custom question snapshot.");
    return room.questions.map(item => {
        if (typeof item.question !== "string" || !item.question.trim() || item.question.length > 2000 || !Array.isArray(item.options) || item.options.length !== 4 || item.options.some(value => typeof value !== "string" || !value.trim() || value.length > 500) || !Number.isInteger(item.correctAnswer) || item.correctAnswer < 0 || item.correctAnswer > 3) throw new Error("Invalid custom question snapshot.");
        return { question: item.question, options: item.options.slice(), correctAnswer: item.correctAnswer, explanation: String(item.explanation || "") };
    });
}
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

            correctAnswer:1,
            explanation: "Kelvin (K) is the SI base unit of thermodynamic temperature. Celsius and Fahrenheit are other temperature scales; joule measures energy."
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

            correctAnswer:1,
            explanation: "Heat transfers spontaneously from higher temperature to lower temperature until thermal equilibrium is reached. Pressure alone does not determine this direction."
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

            correctAnswer:0,
            explanation: "Q denotes energy transferred as heat. P is pressure, V is volume, and U is internal energy."
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

            correctAnswer:0,
            explanation: "Boundary work is the integral of pressure with respect to volume. At constant pressure it becomes W = P(Vfinal − Vinitial) = PΔV."
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

            correctAnswer:2,
            explanation: "Expansion means the gas occupies more space, so its final volume is greater than its initial volume."
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

            correctAnswer:2,
            explanation: "Work is energy transfer and is measured in joules (J). Pascal measures pressure, kelvin temperature, and watt power."
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

            correctAnswer:0,
            explanation: "Energy conservation gives ΔU = Q − W when Q into the system is positive and W done by the system is positive."
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

            correctAnswer:2,
            explanation: "U denotes internal energy, the microscopic kinetic and potential energy stored within the system."
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

            correctAnswer:1,
            explanation: "Q is the energy transferred across the system boundary because of a temperature difference: heat."
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

            correctAnswer:0,
            explanation: "For a closed system, heat and work are the two ways energy crosses its boundary. They are transfers, unlike stored internal energy."
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

            correctAnswer:1,
            explanation: "Compressing the air does work on it. This increases internal energy and can raise temperature, making the pump feel hot."
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

            correctAnswer:0,
            explanation: "With no work done, W = 0. Positive heat input gives ΔU = Q > 0, so internal energy increases."
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

            correctAnswer:1,
            explanation: "Electrical work supplies energy to laptop components. Some increases their internal energy and is then transferred as heat to the surroundings."
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

            correctAnswer:0,
            explanation: "The system boundary determines which energy transfers count as heat and work entering or leaving the system."
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
            correctAnswer:1,
            explanation: "A moving piston compresses the gas through a force acting over a distance. This is mechanical work transferred to the gas."
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
            correctAnswer:1,
            explanation: "Internal energy is a state function. Its change depends only on the initial and final states, regardless of the path between them."
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

            correctAnswer:1,
            explanation: "An isobaric process holds pressure constant. The prefix iso means equal and baric refers to pressure."
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

            correctAnswer:2,
            explanation: "An isochoric process holds volume constant, so boundary work PΔV is zero."
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

            correctAnswer:0,
            explanation: "An isothermal process holds temperature constant. Pressure and volume may still change."
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
