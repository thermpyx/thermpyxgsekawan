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
function validateCustomQuestions(items) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
        throw new Error("Tambahkan 1–100 pertanyaan untuk kuis ini.");
    }
    return items.map((item, index) => {
        const label = `Soal ${index + 1}`;
        if (!item || typeof item.question !== "string" || !item.question.trim() || item.question.trim().length > 500) {
            throw new Error(`${label}: isi pertanyaan wajib diisi, maksimal 500 karakter.`);
        }
        if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option => typeof option !== "string" || !option.trim() || option.trim().length > 240)) {
            throw new Error(`${label}: isi empat pilihan jawaban, maksimal 240 karakter per pilihan.`);
        }
        const options = item.options.map(option => option.trim());
        if (new Set(options.map(option => option.toLocaleLowerCase())).size !== 4) {
            throw new Error(`${label}: setiap pilihan jawaban harus berbeda.`);
        }
        if (!Number.isInteger(item.correctAnswer) || item.correctAnswer < 0 || item.correctAnswer > 3) {
            throw new Error(`${label}: pilih satu jawaban yang benar.`);
        }
        return { question: item.question.trim(), options, correctAnswer: item.correctAnswer };
    });
}
function getQuestionsForRoom(room) {
    if (!room || typeof room !== "object") throw new Error("Data ruang kuis tidak tersedia.");
    if (room.custom_questions != null) return validateCustomQuestions(room.custom_questions);
    if (room.topic === "custom") throw new Error("Pertanyaan milik host belum tersedia. Muat ulang ruang kuis.");
    return getQuestionsForTopic(room.topic);
}
(function (root) {
    root.TPXQuizQuestions = Object.freeze({ validateQuestions: validateCustomQuestions, getQuestionsForRoom });
})(typeof window !== "undefined" ? window : globalThis);
