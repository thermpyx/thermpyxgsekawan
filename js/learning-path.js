/* Guided sequence: outcomes concept experiment measured topic quiz reflection. */
(() => {
  "use strict";
  const api = window.TPXLearning;
  if (!api) return;
  const list = document.getElementById("learningModuleList"), detail = document.getElementById("learningModuleDetail");
  const ids = new Set(api.modules.map(item => item.id));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
  const t = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
  const label = (en, id, tag = "span", attrs = "") => `<${tag} data-en="${escape(en)}" data-id="${escape(id)}"${attrs ? " " + attrs : ""}>${escape(t(en, id))}</${tag}>`;
  const pair = (values, tag = "span", attrs = "") => label(...values, tag, attrs);
  let active = api.read().active;
  try { const requested = decodeURIComponent(location.hash.slice(1)); if (ids.has(requested)) active = requested; } catch (_) {}

  function renderList(state) {
    list.innerHTML = api.modules.map((module, index) => {
      const row = state.modules[module.id], completed = api.isComplete(row);
      const started = row.theory || row.apply || row.quiz;
      const status = completed ? ["Completed", "Tuntas"] : started ? ["In progress", "Sedang dipelajari"] : ["Not started", "Belum dimulai"];
      return `<li><button type="button" class="lp-module-tab${active === module.id ? " is-active" : ""}${completed ? " is-complete" : ""}" data-learning-module="${module.id}"${active === module.id ? ' aria-current="step"' : ""}><span class="lp-module-number" aria-hidden="true">${completed ? "✓" : String(index + 1).padStart(2, "0")}</span><span class="lp-module-tab-copy">${pair(module.name, "strong")}${pair(status, "small")}</span></button></li>`;
    }).join("");
  }
  function renderDetail(state) {
    const index = api.modules.findIndex(item => item.id === active), module = api.modules[index], row = state.modules[active];
    const previous = api.modules[index - 1], next = api.modules[index + 1];
    const quiz = row.quiz, latest = row.latestQuiz;
    const quizLabel = quiz?.passed ? ["Quiz passed", "Kuis lulus"] : quiz ? ["Keep practicing", "Lanjutkan latihan"] : ["Not taken yet", "Belum dikerjakan"];
    const result = quiz ? label(`Best result: ${quiz.correct}/${quiz.total} correct · ${quiz.percent}%`, `Hasil terbaik: ${quiz.correct}/${quiz.total} benar · ${quiz.percent}%`, "p", 'class="lp-quiz-result"') : "";
    const recent = latest && quiz && latest.percent < quiz.percent ? label(`Latest attempt: ${latest.correct}/${latest.total} correct · ${latest.percent}%. Your best result is kept.`, `Percobaan terakhir: ${latest.correct}/${latest.total} benar · ${latest.percent}%. Hasil terbaikmu tetap tersimpan.`, "p", 'class="lp-step-note"') : "";
    const prerequisite = previous && !api.isComplete(state.modules[previous.id]) ? `<div class="lp-prerequisite">${label("Recommended foundation:", "Bekal yang disarankan:", "strong")} <button type="button" data-learning-module="${previous.id}">${pair(previous.name)}</button>${label("You can still explore this module now.", "Kamu tetap bisa mempelajari modul ini sekarang.", "span")}</div>` : "";
    const check = (step, en, id) => `<label class="lp-self-check"><input type="checkbox" data-learning-step="${step}"${row[step] ? " checked" : ""}>${label(en, id)}</label>`;
    detail.innerHTML = `<article class="lp-lesson" id="${module.id}" aria-labelledby="learningModuleTitle">
      <div class="lp-lesson-head"><p class="lp-eyebrow">${label(`MODULE ${String(index + 1).padStart(2, "0")} / 07`, `MODUL ${String(index + 1).padStart(2, "0")} / 07`)}</p>${label(`≈ ${module.minutes} min`, `≈ ${module.minutes} menit`, "span", 'class="lp-time"')}</div>
      ${pair(module.name, "h3", 'id="learningModuleTitle" tabindex="-1"')}
      ${pair(module.intro, "p", 'class="lp-lesson-intro"')}
      ${prerequisite}
      <div class="lp-big-question">${label("START WITH A QUESTION", "MULAI DARI PERTANYAAN", "p", 'class="lp-eyebrow"')}${pair(module.question, "p")}</div>
      <section class="lp-module-outcomes" aria-labelledby="learningModuleOutcomes">${label("Your learning targets", "Tujuan pembelajaranmu", "h4", 'id="learningModuleOutcomes"')}${label("After this module, you should be able to:", "Setelah modul ini, kamu diharapkan mampu:", "p")}<ul>${module.objectives.map(item => pair(item, "li")).join("")}</ul></section>
      <div class="lp-study-steps">
        <section class="lp-step${row.theory ? " is-done" : ""}" aria-labelledby="learningTheoryTitle"><span class="lp-step-index" aria-hidden="true">01</span><div class="lp-step-content"><div class="lp-step-title">${label("Understand the concept", "Pahami konsepnya", "h4", 'id="learningTheoryTitle"')}${label("READ & EXPLAIN", "BACA & JELASKAN", "span", 'class="lp-step-kind"')}</div>${label("Read the explanation and at least one worked example. Explain the reasoning and assumptions in your own words before checking this step.", "Baca pembahasan dan minimal satu contoh soal. Jelaskan alasan serta asumsinya dengan bahasamu sendiri sebelum menandai langkah ini.", "p")}<a class="lp-resource-link" href="${module.theory}">${label("Open theory & examples", "Buka teori & contoh soal")}</a>${check("theory", "I can explain the concept and one worked example.", "Saya dapat menjelaskan konsep dan satu contoh soal.")}</div></section>
        <section class="lp-step${row.apply ? " is-done" : ""}" aria-labelledby="learningApplyTitle"><span class="lp-step-index" aria-hidden="true">02</span><div class="lp-step-content"><div class="lp-step-title">${label("Test your prediction", "Uji prediksimu", "h4", 'id="learningApplyTitle"')}${label("PREDICT / OBSERVE", "PREDIKSI / AMATI", "span", 'class="lp-step-kind"')}</div>${pair(module.experiment, "p")}<div class="lp-resource-links"><a class="lp-resource-link" href="${module.simulator}">${label("Open simulator", "Buka simulator")}</a><a class="lp-resource-secondary" href="${module.calculator}">${label("Related calculator", "Kalkulator terkait")}</a></div>${check("apply", "I compared two settings and can explain what changed.", "Saya sudah membandingkan dua pengaturan dan menjelaskan perubahannya.")}</div></section>
        <section class="lp-step${quiz?.passed ? " is-done" : ""}" aria-labelledby="learningQuizTitle"><span class="lp-step-index" aria-hidden="true">03</span><div class="lp-step-content"><div class="lp-step-title">${label("Check your understanding", "Ukur pemahamanmu", "h4", 'id="learningQuizTitle"')}${pair(quizLabel, "span", `class="lp-quiz-status${quiz?.passed ? " is-passed" : ""}"`)}</div>${label("Take the quiz for this topic. Aim for at least 80% correct, then review every explanation. You can retry whenever you need.", "Kerjakan kuis topik ini. Targetkan minimal 80% jawaban benar, lalu tinjau setiap penjelasan. Kamu dapat mengulang kapan pun diperlukan.", "p")}${result}${recent}<a class="lp-resource-link lp-quiz-link" href="quiz/practice.html?topic=${module.id}&amp;from=learning">${label(quiz ? "Practice this topic again" : "Start this topic quiz", quiz ? "Latih topik ini lagi" : "Mulai kuis topik ini")}</a>${label("This step is recorded from your quiz result, not from a checkbox.", "Langkah ini dicatat dari hasil kuis, bukan dari tanda centang.", "p", 'class="lp-step-note"')}</div></section>
      </div>
      <section class="lp-reflection" aria-labelledby="learningReflectionTitle">${label("Pause & connect", "Renungkan & hubungkan", "h4", 'id="learningReflectionTitle"')}${pair(module.reflection, "p")}${label("If you are unsure, revisit the example or change one simulator setting before moving on.", "Jika masih ragu, baca ulang contoh atau ubah satu pengaturan simulator sebelum melanjutkan.", "p", 'class="lp-step-note"')}</section>
      <div class="lp-lesson-bottom">${api.isComplete(row) ? label("✓ Module completed — keep exploring!", "✓ Modul tuntas — lanjutkan eksplorasimu!", "p", 'class="lp-completed-message"') : label("Your checklist is a self-assessment; quiz results provide a separate knowledge check.", "Daftar centang adalah penilaian mandiri; hasil kuis menjadi pemeriksaan pemahaman yang terpisah.", "p")}${next ? `<button type="button" class="lp-button lp-button-secondary" data-learning-module="${next.id}">${label("Next module", "Modul berikutnya")}</button>` : `<a class="lp-button lp-button-secondary" href="quiz/practice.html">${label("Review all topics", "Latih semua topik")}</a>`}</div>
    </article>`;
  }
  function render() {
    const state = api.read();
    if (!ids.has(active)) active = state.active;
    const rows = Object.values(state.modules), done = rows.filter(api.isComplete).length;
    const steps = rows.reduce((total, row) => total + Number(row.theory) + Number(row.apply) + Number(Boolean(row.quiz?.passed)), 0);
    const percent = Math.round(steps / 21 * 100);
    document.getElementById("learningPercent").textContent = `${percent}%`;
    document.querySelector(".lp-progress-orbit").style.setProperty("--lp-progress", `${percent}%`);
    const bar = document.getElementById("learningProgressBar");
    bar.setAttribute("aria-valuenow", String(percent)); bar.firstElementChild.style.width = `${percent}%`;
    const summary = document.getElementById("learningProgressSummary");
    summary.dataset.en = `${done} of 7 modules completed · ${steps}/21 steps`;
    summary.dataset.id = `${done} dari 7 modul tuntas · ${steps}/21 langkah`;
    summary.textContent = t(summary.dataset.en, summary.dataset.id);
    const continueButton = document.getElementById("learningContinue");
    const started = steps > 0 || rows.some(row => row.quiz);
    continueButton.dataset.en = done === 7 ? "Review your learning" : started ? "Continue learning" : "Start learning";
    continueButton.dataset.id = done === 7 ? "Tinjau pembelajaranmu" : started ? "Lanjutkan belajar" : "Mulai belajar";
    continueButton.textContent = t(continueButton.dataset.en, continueButton.dataset.id);
    const note = document.getElementById("learningStorageNote");
    note.dataset.en = api.isStorageAvailable() ? "Saved in this browser · no account needed" : "Browser storage is unavailable. Progress is kept for this page only.";
    note.dataset.id = api.isStorageAvailable() ? "Tersimpan di browser ini · tanpa akun" : "Penyimpanan browser tidak tersedia. Progres hanya bertahan pada halaman ini.";
    note.textContent = t(note.dataset.en, note.dataset.id);
    renderList(state); renderDetail(state);
  }
  function focusModule() {
    const title = document.getElementById("learningModuleTitle");
    title?.focus({preventScroll: true});
    detail.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start"});
  }
  function selectModule(id, focus = true) {
    if (!ids.has(id)) return;
    active = id; api.setActive(id);
    if (location.hash !== `#${id}`) location.hash = id;
    if (focus) focusModule();
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-learning-module]");
    if (button) selectModule(button.dataset.learningModule);
  });
  detail.addEventListener("change", event => {
    const input = event.target.closest("[data-learning-step]"); if (!input) return;
    const step = input.dataset.learningStep;
    api.updateStep(active, step, input.checked);
    // Re-rendered checkbox retains keyboard focus after changing local state.
    detail.querySelector(`[data-learning-step="${step}"]`)?.focus({preventScroll: true});
  });
  document.getElementById("learningContinue").addEventListener("click", () => {
    const state = api.read();
    const saved = state.modules[state.active];
    const next = saved && !api.isComplete(saved) ? state.active : api.modules.find(item => !api.isComplete(state.modules[item.id]))?.id || active;
    selectModule(next);
  });
  document.getElementById("learningReset").addEventListener("click", () => {
    if (!window.confirm(t("Reset all learning-path checklists and quiz results in this browser? This cannot be undone.", "Hapus seluruh daftar centang dan hasil kuis alur belajar di browser ini? Tindakan ini tidak dapat dibatalkan."))) return;
    active = "heat"; api.reset();
    if (location.hash !== "#heat") location.hash = "heat";
    document.getElementById("learningAnnouncement").textContent = t("Learning progress reset.", "Progres belajar berhasil diatur ulang.");
    document.getElementById("learningReset").focus({preventScroll: true});
  });
  window.addEventListener("hashchange", () => {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    if (ids.has(id) && id !== active) { active = id; api.setActive(id); focusModule(); }
  });
  window.addEventListener("thermpyx:learningchange", render);
  window.addEventListener("thermpyx:languagechange", render);
  window.addEventListener("storage", event => { if (event.key === api.storageKey || event.key === null) render(); });
  api.setActive(active);
})();
