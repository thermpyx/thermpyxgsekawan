/* THERMPYX classroom assists. Only confirmed Firebase records spend a token. */
(() => {
  "use strict";
  const text = (en, id) => window.TPX?.t ? window.TPX.t(en, id) : en;
  function eliminatedOptions(question, questionIndex) {
    const correct = Number(question?.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3 || question?.options?.length !== 4) return [];
    // Rotate the retained distractor with the question. No random state is lost
    // on reload, and the correct answer is never removed.
    const wrong = [0, 1, 2, 3].filter(index => index !== correct);
    const retained = wrong[questionIndex % wrong.length];
    return wrong.filter(index => index !== retained);
  }
  function create(config) {
    const { root, options, live, roomId, playerId } = config;
    if (!root) return null;
    root.setAttribute("data-tpx-no-translate", "");
    root.className = "quiz-skills";
    root.innerHTML = '<div class="reactor-feedback"><div class="reactor-label"><strong></strong><span class="reactor-count"></span></div><div class="reactor-cells" aria-hidden="true"><i></i><i></i><i></i></div><small></small></div><div class="prism-assist"><button type="button" class="prism-button"><span class="prism-symbol" aria-hidden="true"></span><span class="prism-copy"><strong></strong><small></small></span></button><p class="prism-status" role="status" aria-live="polite"></p><button type="button" class="prism-sync" hidden></button></div>';
    const reactor = root.querySelector(".reactor-feedback"), count = root.querySelector(".reactor-count"), cells = [...root.querySelectorAll(".reactor-cells i")];
    const prism = root.querySelector(".prism-button"), status = root.querySelector(".prism-status"), retry = root.querySelector(".prism-sync");
    let enabled = false, synced = false, pending = false, locked = true, disposed = false, record = null, question = null, index = -1, pulseTimer = null;
    let statusCopy = null, syncFailed = false, pendingExpired = false, syncRevision = 0;
    const correctAnswers = new Set();
    const validRecord = value => value?.kind === "prism" && Number.isInteger(value.question_index) && value.question_index >= 0 && Number.isFinite(value.used_at) && value.used_at > 0;
    async function readUses() {
      let timer;
      try {
        return await Promise.race([
          live.listSkillUses(roomId, playerId),
          new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error("Token check timed out")), 6000); })
        ]);
      } finally { clearTimeout(timer); }
    }
    function available() {
      return enabled && synced && !record && !pending && !locked && question && config.isActive(index);
    }
    function update() {
      if (disposed) return;
      root.setAttribute("aria-label", text("Quiz skills", "Skill kuis"));
      reactor.querySelector("strong").textContent = text("Energy Reactor", "Reaktor Energi");
      reactor.querySelector("small").textContent = text("Correct answers fill three cells. Visual feedback only; no extra points or time.", "Jawaban benar mengisi tiga sel. Umpan balik visual saja; tanpa tambahan poin atau waktu.");
      const filled = reactor.classList.contains("reactor-release") ? 3 : correctAnswers.size % 3;
      count.textContent = `${filled} / 3`;
      cells.forEach((cell, position) => cell.classList.toggle("charged", position < filled));
      prism.querySelector("strong").textContent = text("Prism", "Prisma");
      prism.querySelector("small").textContent = pendingExpired ? text("Waiting for connection…", "Menunggu koneksi…") : pending ? text("Confirming…", "Mengonfirmasi…") : record ? text("Token used · 0 left", "Token terpakai · tersisa 0") : text("Remove 2 wrong options · 1 use per room", "Singkirkan 2 pilihan salah · 1 kali per ruang");
      prism.disabled = !available();
      prism.setAttribute("aria-busy", String(pending));
      if (!enabled) status.textContent = text("Prism is turned off for this room.", "Prisma dinonaktifkan untuk ruang ini.");
      else if (pendingExpired) status.textContent = text("Prism still awaits the connection. No extra time was added; you can keep answering.", "Prisma masih menunggu koneksi. Waktu tidak ditambah; Anda bisa lanjut menjawab.");
      else if (statusCopy) status.textContent = text(...statusCopy);
      else if (!synced) status.textContent = text("Checking your room token…", "Memeriksa token ruang Anda…");
      else if (record) status.textContent = record.question_index === index ? text("Prism confirmed. Two options are removed; time keeps running.", "Prisma terkonfirmasi. Dua pilihan disingkirkan; waktu tetap berjalan.") : text(`Used on question ${record.question_index + 1}. Your score and time rules stay the same.`, `Dipakai pada soal ${record.question_index + 1}. Aturan skor dan waktu tetap sama.`);
      else status.textContent = text("Use before answering. The timer keeps running and the host can see assisted answers.", "Gunakan sebelum menjawab. Waktu tetap berjalan dan host dapat melihat jawaban berbantuan.");
      retry.hidden = !syncFailed || pending;
      retry.textContent = text("Retry token check", "Coba periksa token lagi");
    }
    function applyOptions() {
      const removed = record?.question_index === index ? eliminatedOptions(question, index) : [];
      options.querySelectorAll(".answer-option").forEach((button, choice) => {
        const eliminated = removed.includes(choice);
        button.classList.toggle("prism-eliminated", eliminated);
        button.toggleAttribute("data-prism-eliminated", eliminated);
        if (eliminated) button.disabled = true;
        // Keep the original teacher text in the DOM. The visible replacement
        // is authored UI and cannot translate that teacher text accidentally.
        let label = button.querySelector(".prism-eliminated-label");
        if (eliminated && !label) {
          const original = document.createElement("span"); original.className = "prism-answer-text"; original.textContent = button.textContent;
          label = document.createElement("span"); label.className = "prism-eliminated-label"; label.setAttribute("data-tpx-no-translate", "");
          button.replaceChildren(original, label);
        }
        if (label) label.textContent = text("Removed by Prism", "Disingkirkan Prisma");
      });
    }
    async function sync(answers = []) {
      const revision = ++syncRevision;
      answers.forEach(answer => { if (answer.is_correct === true && Number.isInteger(Number(answer.question_index))) correctAnswers.add(Number(answer.question_index)); });
      if (!enabled) { synced = true; update(); return; }
      synced = false; syncFailed = false; statusCopy = null; update();
      try {
        if (typeof live?.listSkillUses !== "function") throw new Error("Skill connection unavailable");
        const response = await readUses();
        if (disposed || revision !== syncRevision) return;
        if (response.error || !Array.isArray(response.data)) throw response.error || new Error("Token check not confirmed");
        record = response.data.find(validRecord) || null;
        synced = true; statusCopy = null; applyOptions();
      } catch (error) {
        if (disposed || revision !== syncRevision) return;
        syncFailed = true;
        statusCopy = ["Your token could not be checked. You can keep answering or retry the check.", "Token belum dapat diperiksa. Anda tetap bisa menjawab atau mencoba pemeriksaan lagi."];
      }
      update();
    }
    async function activate() {
      if (!available()) return;
      const target = index;
      pending = true; pendingExpired = false; statusCopy = ["Confirming Prism. Time keeps running…", "Mengonfirmasi Prisma. Waktu tetap berjalan…"];
      config.onPendingChange(true); update();
      try {
        const response = await live.useSkill(roomId, playerId, { kind: "prism", question_index: target });
        if (disposed) return;
        if (response.error || !validRecord(response.data)) throw response.error || new Error("Token use not confirmed");
        record = response.data; synced = true; statusCopy = null;
        if (config.isActive(index) && !locked) applyOptions();
      } catch (error) {
        if (disposed) return;
        // A failed reply may follow a successful write. Read the immutable
        // record before offering another attempt; the server never grants a
        // second token, including a duplicate request from another tab.
        let checked = false;
        try {
          const saved = await readUses();
          if (disposed) return;
          if (!saved.error && Array.isArray(saved.data)) {
            record = saved.data.find(validRecord) || null;
            checked = true; synced = true; if (config.isActive(index) && !locked) applyOptions();
          }
        } catch (readError) { /* The answer controls must remain usable offline. */ }
        if (record) statusCopy = null;
        else if (checked) statusCopy = ["Prism was not confirmed. Try again while this question is open, or keep answering.", "Prisma belum terkonfirmasi. Coba lagi selama soal terbuka, atau lanjut menjawab."];
        else {
          synced = false; syncFailed = true;
          statusCopy = ["Your token could not be checked. You can keep answering or retry the check.", "Token belum dapat diperiksa. Anda tetap bisa menjawab atau mencoba pemeriksaan lagi."];
        }
      } finally {
        pending = false; pendingExpired = false;
        if (!disposed) { config.onPendingChange(false); update(); }
      }
    }
    prism.addEventListener("click", activate);
    retry.addEventListener("click", () => sync());
    const languageChanged = () => { update(); applyOptions(); };
    window.addEventListener("thermpyx:languagechange", languageChanged);
    update();
    return {
      configure(room) { enabled = room?.skills_enabled === true; update(); },
      restore: sync,
      renderQuestion(value, item) { index = value; question = item; locked = false; statusCopy = null; applyOptions(); update(); },
      setLocked(value) { locked = Boolean(value); update(); },
      questionTimedOut() { if (pending) pendingExpired = true; update(); },
      confirmAnswer(answer) {
        const answered = Number(answer?.question_index);
        if (answer?.is_correct !== true || !Number.isInteger(answered) || correctAnswers.has(answered)) return;
        correctAnswers.add(answered);
        if (correctAnswers.size % 3 === 0) {
          clearTimeout(pulseTimer); reactor.classList.add("reactor-release");
          pulseTimer = setTimeout(() => { reactor.classList.remove("reactor-release"); update(); }, 700);
        }
        update();
      },
      dispose() { disposed = true; clearTimeout(pulseTimer); window.removeEventListener("thermpyx:languagechange", languageChanged); },
      eliminatedOptions: () => record?.question_index === index ? eliminatedOptions(question, index) : []
    };
  }
  window.TPXQuizSkills = Object.freeze({ create, eliminatedOptions });
})();
