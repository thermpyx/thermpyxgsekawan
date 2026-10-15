/* Shared curriculum and local progress. Quiz callers pass correct answers, not points. */
(() => {
  "use strict";
  const modules = [
    {
      id: "heat", name: ["Heat & temperature", "Kalor & suhu"], minutes: 25,
      question: ["Why can a metal spoon feel colder than a wooden one in the same room?", "Mengapa sendok logam terasa lebih dingin daripada sendok kayu di ruangan yang sama?"],
      intro: ["Start with familiar observations: feeling hot or cold is different from measuring temperature.", "Mulai dari pengamatan sehari-hari: rasa panas atau dingin berbeda dengan pengukuran suhu."],
      objectives: [
        ["Distinguish temperature, internal energy, and heat transfer using an everyday example.", "Membedakan suhu, energi dalam, dan perpindahan kalor melalui contoh sehari-hari."],
        ["Calculate heat with Q = mcΔT and consistent SI units, assuming constant specific heat and no phase change.", "Menghitung kalor dengan Q = mcΔT dan satuan SI konsisten, dengan asumsi kalor jenis konstan tanpa perubahan fase."],
        ["Predict the direction of heat flow between objects at different temperatures.", "Memprediksi arah aliran kalor antara benda yang berbeda suhu."]
      ],
      theory: "theory/heat.html#materi-lengkap", simulator: "simulator/heat-temperature.html", calculator: "calculators.html#heat",
      experiment: ["Keep the material and mass fixed, then increase the heat input. Compare the resulting temperature change and explain the relationship between Q and ΔT.", "Tetapkan bahan dan massa, lalu perbesar kalor yang diberikan. Bandingkan perubahan suhu yang dihasilkan dan jelaskan hubungan antara Q dan ΔT."],
      reflection: ["The spoon and the wood can have the same temperature. Explain how the rate of heat transfer to your hand changes what you feel.", "Sendok dan kayu dapat memiliki suhu yang sama. Jelaskan bagaimana laju perpindahan kalor dari tangan memengaruhi sensasi yang dirasakan."]
    },
    {
      id: "zeroth-law", name: ["Zeroth law", "Hukum ke nol"], minutes: 20,
      question: ["What makes a thermometer a reliable way to compare two temperatures?", "Mengapa termometer dapat dipakai untuk membandingkan dua suhu?"],
      intro: ["Use your understanding of heat flow to investigate thermal equilibrium.", "Gunakan pemahaman tentang aliran kalor untuk menyelidiki kesetimbangan termal."],
      objectives: [
        ["State the transitive relationship of thermal equilibrium among three systems.", "Menyatakan hubungan transitif kesetimbangan termal pada tiga sistem."],
        ["Predict whether net heat transfer occurs when two systems are put in thermal contact.", "Memprediksi ada tidaknya perpindahan kalor bersih ketika dua sistem berkontak termal."],
        ["Explain why a thermometer must reach equilibrium before its reading is used.", "Menjelaskan mengapa termometer harus mencapai kesetimbangan sebelum hasilnya dibaca."]
      ],
      theory: "theory/zeroth-law.html#materi-lengkap", simulator: "simulator/hkm0.html", calculator: "calculators.html#zeroth",
      experiment: ["Choose two different initial temperatures. Observe the direction of heat transfer and their approach to equilibrium; repeat with equal temperatures.", "Pilih dua suhu awal yang berbeda. Amati arah perpindahan kalor dan perubahan menuju kesetimbangan; ulangi dengan suhu yang sama."],
      reflection: ["If A and B are each in thermal equilibrium with C, what can you conclude about A and B? Explain what equilibrium means for net heat flow.", "Jika A dan B masing-masing setimbang termal dengan C, apa kesimpulan tentang A dan B? Jelaskan arti kesetimbangan bagi aliran kalor bersih."]
    },
    {
      id: "work", name: ["Work & energy", "Usaha & energi"], minutes: 25,
      question: ["How can an expanding gas lift a piston?", "Bagaimana gas yang mengembang dapat mengangkat piston?"],
      intro: ["Connect mechanical work to changes in a gas and read its physical meaning on a P–V diagram.", "Hubungkan usaha mekanik dengan perubahan gas dan baca makna fisiknya pada diagram P–V."],
      objectives: [
        ["Identify the system and its boundary before tracking an energy transfer.", "Menentukan sistem dan batasnya sebelum menelusuri perpindahan energi."],
        ["Calculate constant-pressure boundary work using W = PΔV with consistent units.", "Menghitung usaha batas pada tekanan tetap dengan W = PΔV dan satuan yang konsisten."],
        ["Explain the sign of work during expansion and compression using work done by the gas.", "Menjelaskan tanda usaha saat ekspansi dan kompresi dengan konvensi usaha oleh gas."]
      ],
      theory: "theory/work-energy.html#materi-lengkap", simulator: "simulator/work%26energy/index.html", calculator: "calculators.html#work",
      experiment: ["Keep force fixed and double the target piston displacement. Compare work W = FΔx and the remaining internal energy. Use the related calculator to compare expansion and compression at constant pressure.", "Tetapkan gaya dan gandakan target perpindahan piston. Bandingkan usaha W = FΔx dan energi dalam yang tersisa. Gunakan kalkulator terkait untuk membandingkan ekspansi dan kompresi pada tekanan tetap."],
      reflection: ["For an expansion from 2 L to 5 L at 100 kPa, explain why work done by the gas is +300 J. What changes during compression?", "Untuk ekspansi dari 2 L ke 5 L pada 100 kPa, jelaskan mengapa usaha oleh gas adalah +300 J. Apa yang berubah saat kompresi?"]
    },
    {
      id: "first-law", name: ["First law", "Hukum pertama"], minutes: 30,
      question: ["Where does the energy go when a heated gas pushes a piston?", "Ke mana energi berpindah ketika gas yang dipanaskan mendorong piston?"],
      intro: ["Bring heat and work together in an energy balance for a closed system.", "Gabungkan kalor dan usaha dalam neraca energi untuk sistem tertutup."],
      objectives: [
        ["Apply ΔU = Q − W for a closed system with negligible bulk kinetic/potential energy changes; Q into the system and W done by it are positive.", "Menerapkan ΔU = Q − W pada sistem tertutup dengan perubahan energi kinetik/potensial makroskopis diabaikan; Q masuk dan W oleh sistem positif."],
        ["Determine a missing energy quantity and check the signs and units.", "Menentukan besaran energi yang belum diketahui serta memeriksa tanda dan satuannya."],
        ["Explain why heat supplied is not always equal to the increase in internal energy.", "Menjelaskan mengapa kalor masuk tidak selalu sama dengan pertambahan energi dalam."]
      ],
      theory: "theory/first-law.html#materi-lengkap", simulator: "simulator/hkm1.html", calculator: "calculators.html#first",
      experiment: ["Compare the isobaric and isochoric settings in the First Law simulator with the same heat input. Record Q, W, and ΔU, then check the energy balance using the displayed sign convention.", "Bandingkan pengaturan isobarik dan isokhorik pada simulator Hukum Pertama dengan kalor masuk yang sama. Catat Q, W, dan ΔU, lalu periksa neraca energi dengan konvensi tanda yang ditampilkan."],
      reflection: ["A system absorbs 500 J and does 200 J of work. Explain the +300 J change in internal energy without treating heat as a stored substance.", "Sistem menyerap 500 J dan melakukan usaha 200 J. Jelaskan perubahan energi dalam +300 J tanpa menganggap kalor sebagai zat yang tersimpan."]
    },
    {
      id: "processes", name: ["Thermodynamic processes", "Proses termodinamika"], minutes: 30,
      question: ["Can two paths between the same gas states require different amounts of work?", "Dapatkah dua lintasan antara keadaan gas yang sama menghasilkan usaha yang berbeda?"],
      intro: ["Compare what stays constant and how the path changes the transfer of energy.", "Bandingkan besaran yang tetap dan pengaruh lintasan terhadap perpindahan energi."],
      objectives: [
        ["Distinguish isothermal, isobaric, isochoric, and adiabatic processes by their constraints.", "Membedakan proses isotermal, isobarik, isokhorik, dan adiabatik berdasarkan batasannya."],
        ["Choose a process equation and state its assumptions before calculating.", "Memilih persamaan proses dan menyatakan asumsi sebelum menghitung."],
        ["Relate the area under a P–V curve to work and compare energy balances for ideal-gas processes.", "Menghubungkan luas di bawah kurva P–V dengan usaha dan membandingkan neraca energi proses gas ideal."]
      ],
      theory: "theory/processes.html#materi-lengkap", simulator: "simulator/hkm1.html", calculator: "calculators.html#processes",
      experiment: ["Compare isobaric and isochoric P–V paths with the same heat input; explain why isochoric work is zero. Then choose isothermal or adiabatic, set the final volume above or below the initial volume, and compare expansion and compression. Check the process relations with the calculator.", "Bandingkan lintasan P–V isobarik dan isokhorik dengan kalor masuk yang sama; jelaskan mengapa usaha isokhorik nol. Lalu pilih isotermal atau adiabatik, atur volume akhir di atas atau di bawah volume awal, dan bandingkan ekspansi serta kompresi. Periksa hubungan proses dengan kalkulator."],
      reflection: ["Explain why an isochoric process has W = 0, while an adiabatic process has Q = 0. These are different constraints.", "Jelaskan mengapa proses isokhorik memiliki W = 0, sedangkan proses adiabatik memiliki Q = 0. Keduanya merupakan batasan yang berbeda."]
    },
    {
      id: "second-law", name: ["Second law", "Hukum kedua"], minutes: 30,
      question: ["Why can a heat engine never turn all the heat it receives into work in a cycle?", "Mengapa mesin kalor tidak dapat mengubah seluruh kalor yang diterimanya menjadi usaha dalam satu siklus?"],
      intro: ["Study the direction of natural processes and the limits on useful work.", "Pelajari arah proses alami dan batas energi yang dapat menjadi usaha berguna."],
      objectives: [
        ["Explain the need for hot and cold reservoirs in a cyclic heat engine.", "Menjelaskan perlunya reservoir panas dan dingin pada mesin kalor siklik."],
        ["Calculate thermal efficiency and the Carnot limit using absolute temperatures in kelvin.", "Menghitung efisiensi termal dan batas Carnot menggunakan suhu mutlak dalam kelvin."],
        ["Distinguish the entropy change of a system from that of the system and surroundings together.", "Membedakan perubahan entropi sistem dari perubahan entropi gabungan sistem dan lingkungan."]
      ],
      theory: "theory/second-law.html#materi-lengkap", simulator: "simulator/hkm2.html", calculator: "calculators.html#second",
      experiment: ["Vary the hot and cold reservoir temperatures. Compare the displayed efficiency and rejected heat, keeping the cold reservoir below the hot reservoir.", "Ubah suhu reservoir panas dan dingin. Bandingkan efisiensi dan kalor yang dibuang; pertahankan suhu reservoir dingin di bawah reservoir panas."],
      reflection: ["For reservoirs at 600 K and 300 K, explain the 50% Carnot efficiency limit and why it is an upper bound for a real engine.", "Untuk reservoir 600 K dan 300 K, jelaskan batas efisiensi Carnot 50% dan mengapa nilai itu menjadi batas atas mesin nyata."]
    },
    {
      id: "third-law", name: ["Third law", "Hukum ketiga"], minutes: 20,
      question: ["What happens to entropy as a perfect crystal approaches absolute zero?", "Apa yang terjadi pada entropi kristal sempurna ketika mendekati nol mutlak?"],
      intro: ["Complete the journey by examining the low-temperature limit and its assumptions.", "Lengkapi perjalanan dengan menelaah batas suhu rendah beserta asumsi yang menyertainya."],
      objectives: [
        ["State the zero-entropy limit for a perfect crystal with a unique ground state as T approaches 0 K.", "Menyatakan batas entropi nol bagi kristal sempurna dengan keadaan dasar tunggal ketika T mendekati 0 K."],
        ["Distinguish approaching absolute zero from reaching it in a finite physical process.", "Membedakan mendekati nol mutlak dari mencapainya melalui proses fisik berhingga."],
        ["Explain why disorder or ground-state degeneracy can lead to residual entropy.", "Menjelaskan mengapa ketidakteraturan atau degenerasi keadaan dasar dapat menyebabkan entropi residual."]
      ],
      theory: "theory/third-law.html#materi-lengkap", simulator: "simulator/hkm3.html", calculator: "calculators.html#third",
      experiment: ["Lower the temperature in the simulator and observe the entropy trend and crystal-order model. Describe the limiting trend rather than claiming that the animation reaches absolute zero physically.", "Turunkan suhu pada simulator dan amati tren entropi serta model keteraturan kristal. Jelaskan kecenderungan batasnya tanpa menganggap animasi benar-benar mencapai nol mutlak secara fisik."],
      reflection: ["Explain the assumptions behind S → 0 as T → 0, and why a disordered solid may retain residual entropy.", "Jelaskan asumsi di balik S → 0 ketika T → 0, serta mengapa zat padat yang tidak teratur dapat memiliki entropi residual."]
    }
  ];
  const KEY = "thermpyx-learning-progress-v1", ids = new Set(modules.map(item => item.id));
  let fallback = null, storageAvailable = true;
  const empty = () => ({version: 1, active: "heat", modules: Object.fromEntries(modules.map(item => [item.id, {theory: false, apply: false, quiz: null}]))});
  function quizRecord(value) {
    if (!value || typeof value !== "object" || !Number.isInteger(value.correct) || !Number.isInteger(value.total) || value.total < 1 || value.total > 10000 || value.correct < 0 || value.correct > value.total) return null;
    // Never display 80% for a fraction just below the actual passing threshold.
    const percent = Math.floor(value.correct / value.total * 10000) / 100;
    return {correct: value.correct, total: value.total, percent, passed: value.correct / value.total >= .8, attempts: Number.isInteger(value.attempts) && value.attempts > 0 ? Math.min(value.attempts, 1000000) : 1, updatedAt: typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null};
  }
  function normalize(value) {
    const state = empty();
    if (!value || value.version !== 1) return state;
    if (ids.has(value.active)) state.active = value.active;
    for (const item of modules) {
      const saved = value.modules?.[item.id];
      if (!saved || typeof saved !== "object") continue;
      state.modules[item.id] = {theory: saved.theory === true, apply: saved.apply === true, quiz: quizRecord(saved.quiz)};
      const latest = quizRecord(saved.latestQuiz);
      if (latest) state.modules[item.id].latestQuiz = latest;
    }
    return state;
  }
  function read() {
    // A quota failure must not replace new in-page progress with an older disk copy.
    if (!storageAvailable && fallback) return normalize(fallback);
    let raw;
    try { raw = localStorage.getItem(KEY); }
    catch (_) { storageAvailable = false; return fallback ? normalize(fallback) : empty(); }
    if (!raw || raw.length > 40000) return empty();
    try { return normalize(JSON.parse(raw)); } catch (_) { return empty(); }
  }
  function save(state) {
    fallback = normalize(state);
    try { localStorage.setItem(KEY, JSON.stringify(fallback)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    window.dispatchEvent(new CustomEvent("thermpyx:learningchange"));
    return read();
  }
  function updateStep(id, step, checked) {
    if (!ids.has(id) || !["theory", "apply"].includes(step)) return false;
    const state = read(); state.modules[id][step] = checked === true; save(state); return true;
  }
  function recordQuiz(id, correct, total) {
    if (!ids.has(id)) return false;
    const result = quizRecord({correct, total}); if (!result) return false;
    const state = read(), row = state.modules[id], previous = row.quiz;
    result.attempts = (previous?.attempts || 0) + 1;
    result.updatedAt = new Date().toISOString();
    row.latestQuiz = {...result};
    row.quiz = previous && previous.correct / previous.total > correct / total ? {...previous, attempts: result.attempts} : {...result};
    state.active = id; save(state); return true;
  }
  window.TPXLearning = Object.freeze({
    modules, storageKey: KEY, read, updateStep, recordQuiz,
    setActive(id) { if (!ids.has(id)) return false; const state = read(); state.active = id; save(state); return true; },
    reset() { return save(empty()); },
    isComplete(row) { return Boolean(row?.theory && row?.apply && row?.quiz?.passed); },
    isStorageAvailable() { return storageAvailable; }
  });
})();
