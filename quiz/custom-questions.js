(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const storageKey = "thermpyx:custom-quiz:v1";
    const questionInput = $("customQuestion");
    const optionInputs = [0, 1, 2, 3].map(index => $("customOption" + index));
    const correctInput = $("customCorrect");
    const form = $("customQuestionForm");
    const list = $("customQuestionList");
    const sourceInputs = Array.from(document.querySelectorAll('input[name="questionSource"]'));
    let questions = [], editing = -1, disabled = false;
    function notice(message, error = false) {
        $("customEditorMessage").textContent = message;
        $("customEditorMessage").classList.toggle("is-error", error);
    }
    function formValue() {
        return { question: questionInput.value, options: optionInputs.map(input => input.value), correctAnswer: correctInput.value === "" ? null : Number(correctInput.value) };
    }
    function applyForm(item) {
        questionInput.value = item?.question || "";
        optionInputs.forEach((input, index) => { input.value = item?.options?.[index] || ""; });
        correctInput.value = item?.correctAnswer == null ? "" : String(item.correctAnswer);
        $("saveCustomQuestionBtn").textContent = editing < 0 ? "Tambahkan pertanyaan" : "Simpan perubahan";
        $("cancelCustomEditBtn").hidden = editing < 0;
    }
    function selectedSource() {
        return sourceInputs.find(input => input.checked)?.value || "builtin";
    }
    function persist() {
        try {
            localStorage.setItem(storageKey, JSON.stringify({ version: 1, questions, editing, form: formValue(), source: selectedSource(), topic: $("topic").value }));
            $("customDraftStatus").textContent = "Draf tersimpan di browser ini.";
        } catch (error) {
            $("customDraftStatus").textContent = "Penyimpanan browser tidak tersedia. Draf hanya tersimpan selama halaman ini terbuka.";
        }
    }
    function render() {
        list.replaceChildren();
        $("customQuestionCount").textContent = `${questions.length} / 100 soal`;
        if (!questions.length) {
            const empty = document.createElement("p");
            empty.className = "custom-empty";
            empty.textContent = "Belum ada pertanyaan. Tulis soal dan empat pilihan jawaban di bawah.";
            list.append(empty);
        }
        questions.forEach((item, index) => {
            const card = document.createElement("article");
            card.className = "custom-question-item";
            const copy = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = `${index + 1}. ${item.question}`;
            const answer = document.createElement("small");
            answer.textContent = `Jawaban: ${String.fromCharCode(65 + item.correctAnswer)} · ${item.options[item.correctAnswer]}`;
            copy.append(title, answer);
            const actions = document.createElement("div");
            actions.className = "custom-item-actions";
            ["Edit", "Hapus"].forEach(action => {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = action;
                button.disabled = disabled;
                button.setAttribute("aria-label", `${action} pertanyaan ${index + 1}`);
                button.addEventListener("click", () => {
                    if (disabled) return;
                    if (action === "Edit") {
                        editing = index;
                        applyForm(item);
                        notice(`Mengedit soal ${index + 1}.`);
                        questionInput.focus();
                    } else {
                        if (!confirm(`Hapus pertanyaan ${index + 1}?`)) return;
                        questions.splice(index, 1);
                        if (editing === index) { editing = -1; applyForm(null); }
                        else if (editing > index) editing--;
                        render();
                        notice("Pertanyaan dihapus dari draf.");
                    }
                    persist();
                });
                actions.append(button);
            });
            card.append(copy, actions);
            list.append(card);
        });
    }
    function toggleSource() {
        const own = selectedSource() === "custom";
        $("customQuestionsPanel").hidden = !own;
        $("builtinTopicField").hidden = own;
        sourceInputs.forEach(input => input.closest("label").classList.toggle("is-selected", input.checked));
    }
    function commitForm() {
        const item = TPXQuizQuestions.validateQuestions([formValue()])[0];
        if (editing < 0 && questions.length >= 100) throw new Error("Maksimal 100 soal per ruang kuis.");
        if (editing < 0) questions.push(item);
        else questions[editing] = item;
        editing = -1;
        applyForm(null);
        render();
        persist();
        notice("Pertanyaan tersimpan dalam draf.");
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (disabled) return;
        try { commitForm(); } catch (error) { notice(error.message, true); }
    });
    form.addEventListener("input", persist);
    $("cancelCustomEditBtn").addEventListener("click", () => { editing = -1; applyForm(null); persist(); notice("Edit dibatalkan."); });
    sourceInputs.forEach(input => input.addEventListener("change", () => { toggleSource(); persist(); }));
    $("topic").addEventListener("change", persist);
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (saved?.version === 1) {
            questions = saved.questions?.length ? TPXQuizQuestions.validateQuestions(saved.questions) : [];
            editing = Number.isInteger(saved.editing) && saved.editing >= 0 && saved.editing < questions.length ? saved.editing : -1;
            applyForm(saved.form);
            sourceInputs.forEach(input => { input.checked = input.value === (saved.source === "custom" ? "custom" : "builtin"); });
            if (["heat", "work", "first-law", "process", "all"].includes(saved.topic)) $("topic").value = saved.topic;
            notice("Draf sebelumnya berhasil dimuat.");
        }
    } catch (error) { notice("Draf sebelumnya tidak dapat dimuat. Silakan buat draf baru.", true); }
    render();
    toggleSource();
    window.TPXCustomQuizEditor = Object.freeze({
        getPayload() {
            if (selectedSource() !== "custom") return { topic: $("topic").value };
            const draft = formValue();
            if (draft.question.trim() || draft.options.some(option => option.trim()) || draft.correctAnswer != null) commitForm();
            return { topic: $("topic").value, custom_questions: TPXQuizQuestions.validateQuestions(questions) };
        },
        setDisabled(value) {
            disabled = Boolean(value);
            document.querySelectorAll("#questionSourceChoice input, #customQuestionsPanel input, #customQuestionsPanel textarea, #customQuestionsPanel select, #customQuestionsPanel button, #topic").forEach(control => { control.disabled = disabled; });
            render();
        }
    });
})();
