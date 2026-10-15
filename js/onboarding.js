/* Short, repeatable introductions. All content stays on this device. */
(() => {
  "use strict";
  if (window.TPXOnboarding) return;
  const version = "v1", base = new URL("../", document.currentScript.src);
  const pair = (en, id) => ({en, id});
  const step = (en, id, bodyEn, bodyId, tipsEn, tipsId, example = "") => ({
    title: pair(en, id), body: pair(bodyEn, bodyId), tips: pair(tipsEn, tipsId), example
  });
  const topics = {
    home: {label: pair("YOUR THERMODYNAMICS LAB", "LABORATORIUM TERMODINAMIKA ANDA"), mark: "ΔU", steps: [
      step("Welcome to THERMPYX", "Selamat datang di THERMPYX",
        "Make sense of heat, work, and energy through a learning space that connects ideas with experiments.",
        "Pahami kalor, usaha, dan energi melalui ruang belajar yang menghubungkan konsep dengan eksperimen.",
        ["Read the theory to build your foundation.", "Try calculations and simulations to see an idea in action."],
        ["Baca teori untuk membangun pemahaman dasar.", "Coba kalkulator dan simulasi untuk melihat konsep bekerja."]),
      step("A learning path that fits you", "Mulai dari cara belajar yang Anda suka",
        "Follow Theory, Calculation, Simulator, and Practice from the navigation menu. You can explore in any order.",
        "Gunakan menu Teori, Perhitungan, Simulator, dan Latihan. Anda bebas memilih urutan belajarnya.",
        ["Use Unit Converter when a problem uses different units.", "Switch the language or theme to make the space comfortable."],
        ["Gunakan Konverter Satuan saat soal memakai satuan berbeda.", "Pilih bahasa dan tema yang paling nyaman untuk Anda."]),
      step("Explore first. Keep what matters.", "Jelajahi dulu, simpan yang penting",
        "Theory, calculations, simulations, and independent practice are ready to use without an account.",
        "Teori, kalkulator, simulator, dan latihan mandiri dapat digunakan tanpa akun.",
        ["Sign in when you want to save question sets to your account.", "Open Quick guide again whenever you need a reminder."],
        ["Masuk ketika ingin menyimpan paket soal ke akun Anda.", "Buka Panduan singkat lagi kapan saja jika perlu pengingat."])
    ]},
    theory: {label: pair("READ · UNDERSTAND · APPLY", "BACA · PAHAMI · TERAPKAN"), mark: "Q", steps: [
      step("Build the idea before the equation", "Pahami konsep sebelum rumusnya",
        "Each lesson connects a thermodynamic concept with its equations, examples, and related learning tools.",
        "Setiap materi menghubungkan konsep termodinamika dengan rumus, contoh, dan alat belajar yang berkaitan.",
        ["Start with the explanation, then read the meaning of each symbol.", "Use the worked examples to check how a formula is applied."],
        ["Mulai dari penjelasan, lalu baca arti setiap simbol.", "Pelajari contoh soal untuk melihat cara menerapkan rumus."]),
      step("Turn reading into understanding", "Hubungkan bacaan dengan percobaan",
        "Check the stated assumptions and units before using an equation. The sign of a value can describe the direction of energy transfer.",
        "Periksa asumsi dan satuan sebelum memakai rumus. Tanda positif atau negatif dapat menunjukkan arah perpindahan energi.",
        ["Open the related calculator to try your own values.", "Use the video or simulator links available in the lesson to explore further."],
        ["Buka kalkulator terkait untuk mencoba nilai Anda sendiri.", "Gunakan tautan video atau simulator yang tersedia di materi untuk menjelajah lebih jauh."], "ΔU = Q − W")
    ]},
    calculators: {label: pair("CALCULATOR LAB / 07 TOOLS", "LABORATORIUM KALKULATOR / 07 ALAT"), mark: "∑", steps: [
      step("Choose the right relationship", "Pilih hubungan yang sesuai",
        "Seven calculators help you explore the thermodynamic laws, heat, work, and ideal-gas processes.",
        "Tujuh kalkulator membantu Anda mempelajari hukum termodinamika, kalor, usaha, dan proses gas ideal.",
        ["Use the module tabs to jump to the topic you need.", "Read the formula and its assumptions above the inputs."],
        ["Gunakan tab materi untuk membuka topik yang dibutuhkan.", "Baca rumus dan asumsi di atas kolom masukan."]),
      step("Enter values with their units", "Isi nilai sesuai satuannya",
        "Each input shows its expected unit. Convert your values first if your problem uses another unit, then select Calculate.",
        "Setiap masukan menampilkan satuan yang digunakan. Konversikan dahulu jika soal memakai satuan lain, lalu pilih Hitung.",
        ["Use Kelvin for absolute temperature in entropy calculations.", "For the First Law, positive Q enters the system and positive W is work done by it."],
        ["Gunakan Kelvin untuk temperatur mutlak pada perhitungan entropi.", "Pada Hukum I, Q positif masuk ke sistem dan W positif adalah usaha oleh sistem."]),
      step("Read the result and its meaning", "Baca hasil beserta maknanya",
        "A calculation shows a numerical result and a short explanation. Compare both with the physical situation in your problem.",
        "Perhitungan menampilkan angka hasil dan penjelasan singkat. Cocokkan keduanya dengan kondisi fisik pada soal Anda.",
        ["Example: Q = 500 J and W = 200 J give ΔU = 300 J.", "A warning means an input or assumption needs checking; revise it and calculate again."],
        ["Contoh: Q = 500 J dan W = 200 J menghasilkan ΔU = 300 J.", "Peringatan berarti masukan atau asumsi perlu diperiksa; perbaiki lalu hitung kembali."], "500 J − 200 J = 300 J")
    ]},
    converter: {label: pair("UNIT CONVERTER / 09 QUANTITIES", "KONVERTER SATUAN / 09 BESARAN"), mark: "SI", steps: [
      step("Keep the quantity, change the unit", "Besarannya sama, satuannya berbeda",
        "Convert temperature, pressure, volume, energy, power, mass, length, area, and time in one place.",
        "Konversikan suhu, tekanan, volume, energi, daya, massa, panjang, luas, dan waktu dalam satu tempat.",
        ["Choose a quantity using the category tabs.", "Select the starting unit and the unit you want to obtain."],
        ["Pilih besaran melalui tab kategori.", "Pilih satuan awal dan satuan hasil yang diinginkan."]),
      step("A result as soon as you type", "Hasil langsung saat nilai diisi",
        "Enter a value and read the converted value in the same card. The swap button exchanges the selected units.",
        "Masukkan nilai lalu baca hasil konversi pada kartu yang sama. Tombol Tukar menukar satuan awal dan hasil.",
        ["Example: 25 °C is 298.15 K.", "Temperature conversions use absolute readings, rather than a temperature difference."],
        ["Contoh: 25 °C sama dengan 298,15 K.", "Konversi suhu memakai pembacaan suhu mutlak, bukan selisih suhu."], "25 °C = 298.15 K"),
      step("Check what the result represents", "Periksa makna hasil konversinya",
        "The result keeps the same physical quantity. Read the displayed unit before copying it into a calculation.",
        "Hasil tetap mewakili besaran fisik yang sama. Baca satuan yang ditampilkan sebelum memakainya dalam perhitungan.",
        ["Temperatures below absolute zero, 0 K, are rejected.", "The notes at the bottom explain unit definitions and display precision."],
        ["Suhu di bawah nol mutlak, 0 K, tidak dapat digunakan.", "Catatan di bagian bawah menjelaskan definisi satuan dan ketelitian tampilan."])
    ]},
    simulators: {label: pair("INTERACTIVE EXPERIMENTS", "EKSPERIMEN INTERAKTIF"), mark: "T", steps: [
      step("Watch an idea take shape", "Lihat konsep menjadi percobaan",
        "Simulators make invisible energy changes easier to follow using particle motion, diagrams, readings, and graphs.",
        "Simulator membantu Anda mengikuti perubahan energi melalui gerak partikel, diagram, angka, dan grafik.",
        ["Choose a law or a physical process you want to explore.", "Each experiment includes its own guide to controls and results."],
        ["Pilih hukum atau proses fisik yang ingin Anda pelajari.", "Setiap eksperimen memiliki panduan kontrol dan hasilnya sendiri."]),
      step("Change one thing at a time", "Ubah satu variabel setiap percobaan",
        "Set your inputs, start the experiment, and compare what changes. Pause to inspect a moment; reset to try another setup.",
        "Atur masukan, mulai percobaan, lalu bandingkan perubahannya. Jeda untuk mengamati; reset untuk mencoba kondisi lain.",
        ["Read the numerical data together with the animation.", "These models illustrate selected assumptions. They are learning tools, not laboratory measurements."],
        ["Baca data angka bersama tampilan animasinya.", "Model memakai asumsi tertentu untuk pembelajaran, bukan sebagai pengukuran laboratorium."])
    ]},
    "sim-zeroth": {label: pair("ZEROTH LAW / THERMAL EQUILIBRIUM", "HUKUM NOL / KESETIMBANGAN TERMAL"), mark: "T", steps: [
      step("When do temperatures agree?", "Kapan suhu menjadi sama?",
        "Observe Systems A and B and a shared thermometer, System C. The Zeroth Law connects equal temperatures with thermal equilibrium.",
        "Amati Sistem A, Sistem B, dan termometer sebagai Sistem C. Hukum Nol menghubungkan suhu yang sama dengan kesetimbangan termal.",
        ["Set the initial temperatures using the three sliders.", "Select Start to watch the model progress; Pause and Reset help you compare trials."],
        ["Atur suhu awal menggunakan tiga penggeser.", "Pilih Mulai untuk menjalankan model; Jeda dan Reset membantu membandingkan percobaan."]),
      step("Follow the temperatures together", "Amati semua suhu bersamaan",
        "Read the A, B, and thermometer temperatures beside the scene and in the data panel. The status reports whether the model has reached equilibrium.",
        "Baca suhu A, B, dan termometer di dekat tampilan serta panel data. Status menunjukkan apakah model telah mencapai kesetimbangan.",
        ["The temperature difference tells you how far A and B are from equilibrium.", "If A and C, and B and C, have the same temperature, A and B do too."],
        ["Selisih suhu menunjukkan seberapa jauh A dan B dari kesetimbangan.", "Jika suhu A sama dengan C, dan B sama dengan C, maka suhu A sama dengan B."], "Tₐ = T꜀ · Tᵦ = T꜀ · Tₐ = Tᵦ")
    ]},
    "sim-first": {label: pair("FIRST LAW / HEAT, WORK, ENERGY", "HUKUM I / KALOR, USAHA, ENERGI"), mark: "ΔU", steps: [
      step("Explore a gas in a cylinder", "Jelajahi gas di dalam silinder",
        "A piston and moving particles show how a gas responds to heat under different thermodynamic processes.",
        "Piston dan partikel bergerak memperlihatkan respons gas terhadap kalor pada berbagai proses termodinamika.",
        ["Choose isobaric, isochoric, isothermal, or adiabatic in the process menu.", "Read the process description, then set the available heat and initial-condition controls.", "For isothermal and adiabatic modes, set the final volume separately: above the initial volume for expansion, below it for compression."],
        ["Pilih isobarik, isokhorik, isotermal, atau adiabatik di menu proses.", "Baca penjelasan proses, lalu atur kalor dan kondisi awal yang tersedia.", "Pada mode isotermal dan adiabatik, atur volume akhir secara terpisah: lebih besar dari volume awal untuk ekspansi, lebih kecil untuk kompresi."]),
      step("Run, pause, compare", "Jalankan, jeda, bandingkan",
        "Select Start and watch the piston, gas, and data change. Pause freezes the experiment; Reset restores its starting state.",
        "Pilih Mulai lalu amati piston, gas, dan data. Jeda menghentikan percobaan sementara; Reset mengembalikan kondisi awal.",
        ["Watch pressure P, volume V, and temperature T together.", "Try the same heat input in two processes and compare the response."],
        ["Amati tekanan P, volume V, dan suhu T secara bersamaan.", "Coba kalor yang sama pada dua proses, lalu bandingkan responsnya."]),
      step("Account for every joule", "Telusuri setiap perubahan energi",
        "The data panel connects heat Q, work W, and internal-energy change ΔU. The graph traces the process as it progresses.",
        "Panel data menghubungkan kalor Q, usaha W, dan perubahan energi dalam ΔU. Grafik memperlihatkan proses saat berlangsung.",
        ["Positive W means the gas does work on its surroundings.", "Check ΔU = Q − W, then compare the result with the selected process."],
        ["W positif berarti gas melakukan usaha pada lingkungan.", "Periksa ΔU = Q − W, lalu cocokkan hasilnya dengan proses yang dipilih."], "ΔU = Q − W")
    ]},
    "sim-second": {label: pair("SECOND LAW / DIRECTION & ENTROPY", "HUKUM II / ARAH & ENTROPI"), mark: "η", steps: [
      step("Discover the direction of heat", "Temukan arah perpindahan kalor",
        "This experiment connects natural heat flow, entropy, reversible processes, and the limits of heat engines.",
        "Percobaan ini menghubungkan aliran kalor alami, entropi, proses reversibel, dan batas mesin kalor.",
        ["Set the hot and cold temperatures, then select Start.", "Use Pause to read a moment and Reset to begin another trial."],
        ["Atur suhu benda panas dan dingin, lalu pilih Mulai.", "Gunakan Jeda untuk membaca satu keadaan dan Reset untuk percobaan baru."]),
      step("Read change, not only motion", "Baca perubahan beserta animasinya",
        "Compare the two temperatures and the entropy display. Heat naturally moves from the hotter object toward the colder one.",
        "Bandingkan kedua suhu dan tampilan entropi. Kalor secara alami berpindah dari benda lebih panas menuju benda lebih dingin.",
        ["Compare reversible and irreversible examples where their controls are available.", "The heat-engine section shows efficiency; reservoirs must use absolute temperatures in Kelvin."],
        ["Bandingkan contoh reversibel dan ireversibel pada kontrol yang tersedia.", "Bagian mesin kalor menampilkan efisiensi; suhu reservoir dalam rumus menggunakan Kelvin."], "η = 1 − T꜀ / Tₕ")
    ]},
    "sim-third": {label: pair("THIRD LAW / APPROACHING ABSOLUTE ZERO", "HUKUM III / MENDEKATI NOL MUTLAK"), mark: "S", steps: [
      step("Cool a model crystal", "Dinginkan model kristal",
        "Explore how the displayed thermal motion, order, and entropy of a perfect-crystal model change at low temperatures.",
        "Jelajahi perubahan gerak termal, keteraturan, dan entropi yang ditampilkan pada model kristal sempurna bersuhu rendah.",
        ["Select the temperature unit and move the temperature slider.", "Use Start, Pause, and Reset to explore the animated model."],
        ["Pilih satuan suhu lalu gerakkan penggeser suhu.", "Gunakan Mulai, Jeda, dan Reset untuk menjelajahi model animasi."]),
      step("Read the graph as a model", "Baca grafik sebagai model",
        "Compare temperature with the entropy, motion, and order indicators. The graph illustrates the approach to absolute zero.",
        "Bandingkan suhu dengan indikator entropi, gerak, dan keteraturan. Grafik menggambarkan pendekatan menuju nol mutlak.",
        ["The Third Law applies to the entropy of a perfect crystal as T approaches 0 K.", "The displayed particle motion is illustrative; the Third Law does not eliminate quantum motion."],
        ["Hukum III berlaku untuk entropi kristal sempurna saat T mendekati 0 K.", "Gerak partikel pada tampilan bersifat ilustratif; Hukum III tidak meniadakan gerak kuantum."], "T ≈ 0 K · S ≈ 0")
    ]},
    "sim-heat": {label: pair("HEAT & TEMPERATURE / A HEATING MODEL", "KALOR & SUHU / MODEL PEMANASAN"), mark: "ΔT", steps: [
      step("Heat is energy, temperature is a reading", "Kalor adalah energi, suhu adalah pembacaan",
        "Supply heat to a sample and follow its temperature change. The material and mass determine the response.",
        "Berikan kalor pada sampel lalu amati perubahan suhunya. Jenis bahan dan massa menentukan responsnya.",
        ["Set the supplied heat Q, mass m, and material.", "Select Start; Pause holds the current scene and Reset begins a fresh run."],
        ["Atur kalor Q, massa m, dan jenis bahan.", "Pilih Mulai; Jeda menahan tampilan dan Reset memulai percobaan baru."]),
      step("Read the data beside the thermometer", "Baca data bersama termometernya",
        "Compare supplied heat, final temperature, temperature change, and the material's specific heat c. The graph helps you follow their relationship.",
        "Bandingkan kalor, suhu akhir, perubahan suhu, dan kalor jenis c bahan. Grafik membantu melihat hubungan besaran tersebut.",
        ["With the same Q and c, a larger mass gives a smaller temperature change.", "Q = mcΔT models heating with constant specific heat and without a phase change."],
        ["Untuk Q dan c yang sama, massa lebih besar menghasilkan perubahan suhu lebih kecil.", "Q = mcΔT memodelkan pemanasan dengan kalor jenis konstan dan tanpa perubahan fase."], "Q = mcΔT")
    ]},
    "sim-work": {label: pair("WORK & ENERGY / A PISTON MODEL", "USAHA & ENERGI / MODEL PISTON"), mark: "W", steps: [
      step("Connect force with displacement", "Hubungkan gaya dengan perpindahan",
        "A piston model shows how applied force and displacement contribute to mechanical work and the energy balance.",
        "Model piston memperlihatkan bagaimana gaya dan perpindahan berhubungan dengan usaha mekanik dan keseimbangan energi.",
        ["Set the force, displacement, and supplied energy using the sliders.", "Use Start, Pause, and Reset to compare different setups."],
        ["Atur gaya, perpindahan, dan energi yang diberikan melalui penggeser.", "Gunakan Mulai, Jeda, dan Reset untuk membandingkan kondisi berbeda."]),
      step("Compare work with supplied energy", "Bandingkan usaha dengan energi masukan",
        "Read the force, displacement, work, and internal-energy data together. The graph traces how work changes during the run.",
        "Baca data gaya, perpindahan, usaha, dan energi dalam bersama-sama. Grafik menggambarkan perubahan usaha selama percobaan.",
        ["For a constant force in the displacement direction, W = F × s.", "Check the remaining internal-energy change against the energy supplied and work performed."],
        ["Untuk gaya konstan searah perpindahan, W = F × s.", "Cocokkan perubahan energi dalam dengan energi masukan dan usaha yang dilakukan."], "W = F × s")
    ]},
    practice: {label: pair("PRACTICE / FIND YOUR RHYTHM", "LATIHAN / TEMUKAN RITME ANDA"), mark: "✓", steps: [
      step("Put your understanding to work", "Uji pemahaman Anda",
        "Choose Quiz to practice independently or join a live session with your class. Flashcards are marked Coming soon.",
        "Pilih Kuis untuk latihan mandiri atau mengikuti sesi langsung bersama kelas. Flashcard ditandai Segera hadir.",
        ["Independent Quiz lets you answer at your own pace.", "Live Quiz connects a host and players through a shared room code."],
        ["Kuis Mandiri dapat dikerjakan sesuai ritme Anda.", "Kuis Langsung menghubungkan host dan pemain melalui kode ruang."]),
      step("Bring your own questions", "Gunakan soal Anda sendiri",
        "Teachers and study groups can prepare question sets in the question bank, then choose a set when hosting a live quiz.",
        "Guru dan kelompok belajar dapat menyiapkan paket soal di bank soal, lalu memilih paket saat menjadi host kuis langsung.",
        ["Add answer choices and mark the correct answer for each question.", "Sign in when saving question sets to your account."],
        ["Tambahkan pilihan jawaban dan tandai jawaban benar setiap soal.", "Masuk saat menyimpan paket soal ke akun Anda."])
    ]},
    "independent-quiz": {label: pair("INDEPENDENT QUIZ / LEARN AT YOUR PACE", "KUIS MANDIRI / BELAJAR SESUAI RITME"), mark: "✓", steps: [
      step("Choose one topic or mix them", "Pilih satu topik atau gabungkan",
        "Select a topic to start a focused session, or choose All Materials for a mixed thermodynamics quiz.",
        "Pilih topik untuk sesi latihan terarah, atau Semua Materi untuk kuis termodinamika campuran.",
        ["Read each question, then choose the answer you think is correct.", "Independent practice does not require a login."],
        ["Baca setiap soal lalu pilih jawaban yang menurut Anda benar.", "Latihan mandiri tidak memerlukan login."]),
      step("Learn from the answer", "Belajar dari jawaban Anda",
        "Use the feedback and explanations to understand your result, then continue to the next question.",
        "Gunakan umpan balik dan penjelasan untuk memahami hasilnya, lalu lanjutkan ke soal berikutnya.",
        ["Review the final score and revisit a topic that needs more practice.", "Return to the related theory or calculator to check an unfamiliar idea."],
        ["Tinjau skor akhir dan ulangi topik yang perlu dilatih.", "Kembali ke teori atau kalkulator terkait untuk memeriksa konsep yang belum dipahami."])
    ]},
    live: {label: pair("LIVE QUIZ / A SHARED CLASSROOM", "KUIS LANGSUNG / RUANG BELAJAR BERSAMA"), mark: "LIVE", steps: [
      step("One host, one shared session", "Satu host, satu sesi bersama",
        "The host prepares the questions and controls the session. Players join using a six-digit room code.",
        "Host menyiapkan soal dan mengendalikan sesi. Pemain bergabung memakai kode ruang enam digit.",
        ["Choose Host Quiz to create a room and select a question set.", "Choose Join Quiz if your teacher or friend already has a room code."],
        ["Pilih Host Kuis untuk membuat ruang dan memilih paket soal.", "Pilih Gabung Kuis jika guru atau teman sudah memiliki kode ruang."]),
      step("Answer together, follow the results", "Jawab bersama, ikuti hasilnya",
        "Wait for the host to begin. Each player works through the question set using their own question timer, then the completed session shows the leaderboard.",
        "Tunggu host memulai. Setiap pemain mengerjakan paket soal dengan waktu masing-masing per soal, lalu sesi yang selesai menampilkan peringkat.",
        ["Use a stable connection so questions and scores stay synchronized.", "Players join with a nickname. A host signs in to use question sets saved to their account."],
        ["Gunakan koneksi stabil agar soal dan skor tetap tersinkron.", "Pemain memakai nama panggilan. Host masuk untuk memakai paket soal yang disimpan di akun."])
    ]},
    host: {label: pair("HOST / YOUR QUESTIONS, YOUR CLASS", "HOST / SOAL ANDA, KELAS ANDA"), mark: "HOST", steps: [
      step("Prepare a quiz for your group", "Siapkan kuis untuk kelompok Anda",
        "Use the available question bank or create a set with your own questions and answer choices before opening a live room.",
        "Gunakan bank soal yang tersedia atau buat paket berisi soal dan pilihan jawaban Anda sebelum membuka ruang langsung.",
        ["Mark exactly one correct answer for each multiple-choice question.", "Review the full set before your students join."],
        ["Tandai tepat satu jawaban benar untuk setiap soal pilihan ganda.", "Tinjau seluruh paket sebelum siswa bergabung."]),
      step("Create a room and invite players", "Buat ruang lalu undang pemain",
        "Select the question set and session settings, create the room, then share its six-digit code with your group.",
        "Pilih paket soal dan pengaturan sesi, buat ruang, lalu bagikan kode enam digit kepada kelompok Anda.",
        ["Built-in topics can be hosted without signing in. Sign in to use your own cloud question sets.", "Wait until the player list is ready before starting the quiz."],
        ["Topik bawaan dapat di-host tanpa login. Masuk untuk memakai paket soal Anda dari akun.", "Tunggu daftar pemain siap sebelum memulai kuis."]),
      step("Follow your class's progress", "Pantau kemajuan kelas Anda",
        "Start the session when your group is ready. Each player answers the same question set at their own pace, with a timer for each question.",
        "Mulai sesi saat kelompok siap. Setiap pemain menjawab paket soal yang sama dengan ritmenya sendiri dan waktu untuk setiap soal.",
        ["Monitor saved answers and completion. The session finishes automatically when everyone has submitted.", "Keep the host page open and your connection active throughout the session."],
        ["Pantau jawaban tersimpan dan peserta yang selesai. Sesi berakhir otomatis ketika semua peserta sudah mengirim jawaban.", "Biarkan halaman host terbuka dan koneksi aktif selama sesi."])
    ]},
    editor: {label: pair("QUESTION BANK / CREATE & REVIEW", "BANK SOAL / SUSUN & TINJAU"), mark: "A–D", steps: [
      step("Make a question set your own", "Susun paket soal Anda sendiri",
        "Give your set a clear title, add your questions and answer choices, and select the correct answer for each one.",
        "Beri judul yang jelas, tambahkan soal dan pilihan jawaban, lalu pilih jawaban benar setiap soal.",
        ["An explanation helps learners understand why an answer is correct.", "Preview and review the whole set before using it in a quiz."],
        ["Penjelasan membantu peserta memahami alasan jawaban benar.", "Lihat pratinjau dan tinjau seluruh paket sebelum dipakai dalam kuis."]),
      step("Save locally or to your account", "Simpan lokal atau ke akun Anda",
        "A local draft stays in this browser. Saving a set to your account lets you open it on another device and use it when hosting.",
        "Draf lokal tersimpan di browser ini. Menyimpan paket ke akun memungkinkan Anda membukanya di perangkat lain dan memakainya sebagai host.",
        ["Local drafts do not require a login.", "Sign in to save to your account, then choose the saved set from the host page."],
        ["Draf lokal tidak memerlukan login.", "Masuk untuk menyimpan ke akun, lalu pilih paket tersimpan di halaman host."])
    ]},
    join: {label: pair("JOIN / ENTER THE CLASSROOM", "GABUNG / MASUK KE RUANG KELAS"), mark: "6", steps: [
      step("Bring the room code", "Siapkan kode ruang",
        "Ask the host for the six-digit room code and choose a nickname your group can recognize.",
        "Minta kode ruang enam digit dari host dan pilih nama panggilan yang dikenali kelompok Anda.",
        ["Join while the host is still waiting for players.", "Wait in the room until the host starts, then follow each question and its timer."],
        ["Bergabunglah saat host masih menunggu pemain.", "Tunggu hingga host memulai, lalu ikuti soal dan waktu yang tersedia."])
    ]}
  };
  let dialog, replay, current, index = 0, returnFocus, autoTimer, scrollState, interacted = false;
  const storageKey = topic => `thermpyx-tutorial:${version}:${topic}`;
  const language = () => window.TPX?.getLanguage?.() === "id" ? "id" : "en";
  const text = value => value?.[language()] ?? value?.en ?? "";
  const tr = (en, id) => language() === "id" ? id : en;
  const seen = topic => {try {return Boolean(localStorage.getItem(storageKey(topic)));} catch (_) {return false;}};
  function routeTopic() {
    let route; try {route = decodeURIComponent(location.pathname).slice(base.pathname.length);} catch (_) {return null;}
    if (route === "index.html" || route === "") return "home";
    if (route === "calculators.html") return "calculators";
    if (route === "unit-converter.html") return "converter";
    if (route.startsWith("theory/")) return "theory";
    const routes = {"simulator/index.html": "simulators", "simulator/hkm0.html": "sim-zeroth", "simulator/hkm1.html": "sim-first", "simulator/hkm2.html": "sim-second", "simulator/hkm3.html": "sim-third", "simulator/heat-temperature.html": "sim-heat", "simulator/work&energy/index.html": "sim-work", "simulator/hkm 0/hkm0.html": "sim-zeroth", "simulator/hkm 2/index.html": "sim-second", "simulator/hkm 3/index.html": "sim-third", "simulator/heat&temp/index.html": "sim-heat", "quiz/quiz.html": "practice", "quiz/practice.html": "independent-quiz", "quiz/live.html": "live", "quiz/host.html": "host", "quiz/question-editor.html": "editor", "quiz/join.html": "join"};
    return routes[route] || null;
  }
  function mount() {
    dialog = document.createElement("dialog");
    dialog.className = "tpx-tutorial";
    dialog.setAttribute("aria-labelledby", "tpx-tutorial-title");
    dialog.setAttribute("aria-describedby", "tpx-tutorial-body");
    dialog.setAttribute("data-tpx-no-translate", "");
    dialog.innerHTML = `<div class="tpx-tutorial-shell"><div class="tpx-tutorial-art" aria-hidden="true"><div class="tpx-tutorial-orbit orbit-one"></div><div class="tpx-tutorial-orbit orbit-two"></div><span class="tpx-tutorial-particle particle-one"></span><span class="tpx-tutorial-particle particle-two"></span><span class="tpx-tutorial-mark"></span><span class="tpx-tutorial-art-caption">THERMPYX / FIELD NOTES</span></div><div class="tpx-tutorial-content"><div class="tpx-tutorial-top"><span class="tpx-tutorial-kicker"></span><button type="button" class="tpx-tutorial-dismiss" data-action="skip"></button></div><div class="tpx-tutorial-progress" aria-live="polite"><span class="tpx-tutorial-count"></span><span class="tpx-tutorial-bars" aria-hidden="true"></span></div><div class="tpx-tutorial-step"><p class="tpx-tutorial-topic"></p><h2 id="tpx-tutorial-title" tabindex="-1"></h2><p id="tpx-tutorial-body"></p><ul class="tpx-tutorial-tips"></ul><p class="tpx-tutorial-example"></p></div><div class="tpx-tutorial-footer"><button type="button" class="tpx-tutorial-back" data-action="back"></button><button type="button" class="tpx-tutorial-next" data-action="next"></button></div></div></div>`;
    document.body.append(dialog);
    dialog.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "skip") close("skipped");
      if (action === "back" && index > 0) {index--; render(true);}
      if (action === "next") {
        if (index === topics[current].steps.length - 1) close("done");
        else {index++; render(true);}
      }
    });
    dialog.addEventListener("cancel", event => {event.preventDefault(); close("skipped");});
    dialog.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const buttons = [...dialog.querySelectorAll("button")].filter(button => !button.hidden && !button.disabled);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.querySelector("h2"))) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    });
    dialog.addEventListener("close", () => {if (!dialog.open) restore();});
  }
  function render(focus = false) {
    const topic = topics[current], item = topic.steps[index], count = topic.steps.length;
    dialog.querySelector(".tpx-tutorial-kicker").textContent = tr("QUICK GUIDE", "PANDUAN SINGKAT");
    dialog.querySelector(".tpx-tutorial-dismiss").textContent = tr("Skip", "Lewati");
    dialog.querySelector(".tpx-tutorial-count").textContent = tr(`Step ${index + 1} of ${count}`, `Langkah ${index + 1} dari ${count}`);
    const bars = dialog.querySelector(".tpx-tutorial-bars"); bars.replaceChildren();
    for (let number = 0; number < count; number++) {const bar = document.createElement("span"); bar.classList.toggle("is-current", number === index); bar.classList.toggle("is-done", number < index); bars.append(bar);}
    dialog.querySelector(".tpx-tutorial-topic").textContent = text(topic.label);
    dialog.querySelector("h2").textContent = text(item.title);
    dialog.querySelector("h2").setAttribute("aria-label", text(item.title));
    dialog.querySelector("#tpx-tutorial-body").textContent = text(item.body);
    const tips = dialog.querySelector(".tpx-tutorial-tips"); tips.replaceChildren();
    for (const tip of text(item.tips)) {const li = document.createElement("li"); li.textContent = tip; tips.append(li);}
    const example = dialog.querySelector(".tpx-tutorial-example"); example.textContent = item.example; example.hidden = !item.example;
    dialog.querySelector(".tpx-tutorial-mark").textContent = topic.mark;
    const back = dialog.querySelector("[data-action='back']"); back.textContent = tr("Back", "Kembali"); back.hidden = index === 0;
    dialog.querySelector("[data-action='next']").textContent = index === count - 1 ? tr("Let's explore", "Mulai jelajahi") : tr("Next", "Lanjut");
    if (focus) dialog.querySelector("h2").focus({preventScroll: true});
  }
  function open(topic = routeTopic()) {
    if (!topics[topic]) return false;
    // Recovery/login and other modal workflows take precedence.
    if (document.querySelector("dialog[open]:not(.tpx-tutorial)")) return false;
    clearTimeout(autoTimer);
    if (!dialog) mount();
    current = topic; index = 0;
    if (!dialog.open) returnFocus = document.activeElement;
    render();
    if (!dialog.open) {
      scrollState = {html: document.documentElement.style.overflow, body: document.body.style.overflow};
      document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
      try {dialog.showModal();} catch (_) {restore(); return false;}
    }
    dialog.querySelector("h2").focus({preventScroll: true});
    return true;
  }
  function restore() {
    if (!scrollState) return;
    if (scrollState) {document.documentElement.style.overflow = scrollState.html; document.body.style.overflow = scrollState.body; scrollState = null;}
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({preventScroll: true});
    else replay?.focus({preventScroll: true});
    returnFocus = null;
  }
  function close(state = "skipped") {
    clearTimeout(autoTimer);
    if (!dialog?.open) return;
    try {localStorage.setItem(storageKey(current), state === "done" ? "done" : "skipped");} catch (_) {}
    dialog.close(); restore();
  }
  function automatic(topic, attempts = 0) {
    if (interacted) return;
    if (seen(topic) || /(?:^#account$|(?:^#|&)(?:access_token|refresh_token|error_description|type)=)/.test(location.hash)) return;
    try {if (sessionStorage.getItem("thermpyx-tutorial-auto") === "off") return;} catch (_) {}
    if (new URL(location.href).searchParams.get("tutorial") === "off") return;
    const typing = document.activeElement?.matches("input,textarea,select,[contenteditable='true']");
    if (typing) return;
    if (document.querySelector("dialog[open],.tpx-page-transition.tpx-show,[aria-modal='true']:not([hidden])")) {
      if (attempts < 25) autoTimer = window.setTimeout(() => automatic(topic, attempts + 1), 160);
      return;
    }
    open(topic);
  }
  function initialize() {
    const topic = routeTopic(); if (!topic) return;
    // A visitor who has already begun using the page should keep their flow.
    // This cancels only this visit's automatic introduction; replay still works.
    const cancelAutomatic = event => {
      if (!event.isTrusted || dialog?.open) return;
      interacted = true;
      clearTimeout(autoTimer);
    };
    document.addEventListener("pointerdown", cancelAutomatic, true);
    document.addEventListener("keydown", cancelAutomatic, true);
    replay = document.createElement("button"); replay.type = "button"; replay.className = "tpx-tutorial-replay";
    replay.setAttribute("data-tpx-no-translate", ""); replay.setAttribute("aria-haspopup", "dialog");
    const label = () => {replay.textContent = tr("Quick guide", "Panduan singkat"); replay.setAttribute("aria-label", tr("Open this page's quick guide", "Buka panduan singkat halaman ini"));}; label();
    replay.addEventListener("click", () => open(topic));
    const hero = [".home-section .hero-content", ".cl-hero", ".uc-hero", ".theory-hero", ".quiz-hero", ".simulator-hero .hero-content", ".simulator-hero", ".hero-banner .hero-content", ".hero > .hero-content", ".hero"]
      .map(selector => document.querySelector(selector)).find(Boolean);
    if (hero) hero.append(replay);
    else (document.querySelector("main") || document.body).prepend(replay);
    window.addEventListener("thermpyx:languagechange", () => {label(); if (dialog?.open) render();});
    autoTimer = window.setTimeout(() => automatic(topic), 720);
  }
  window.TPXOnboarding = {open, close, getTopic: routeTopic};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once: true});
  else initialize();
})();
