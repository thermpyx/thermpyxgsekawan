# Migrasi akun dan kuis ke Firebase

Versi aktif memakai Firebase Authentication untuk **guru Google** dan **peserta anonim**, serta Realtime Database untuk bank soal pribadi dan kuis langsung. Ini menggantikan alur Supabase pada halaman aktif. [Panduan pemilik proyek](PANDUAN-FIREBASE.md) menjelaskan pengaturan Console secara bertahap.

## Perilaku yang berubah

- Popup akun hanya menyediakan **Lanjutkan dengan Google**, identitas akun yang terhubung dan Keluar. Tidak ada sandi THERMPYX, kode email atau reset email pada alur aktif.
- `js/firebase-config.js` berisi konfigurasi Web publik; `js/firebase-client.js` menggunakan SDK Firebase 13 yang dipatok versinya. Tidak ada runtime build, instalasi npm atau pemuatan Analytics.
- Siswa memakai kode ruang/nama panggilan. Firebase menyiapkan identitas anonim; identitas ini tidak diperlakukan sebagai akun guru.
- Bank soal dipisahkan per pemilik. Penyimpanan memeriksa pergantian akun, menjaga draf saat gagal, memvalidasi maksimal 100 soal dengan empat jawaban berbeda, dan memeriksa hasil cloud sebelum menampilkan keberhasilan.
- Halaman kuis menggunakan operasi dan langganan Realtime Database untuk ruang, peserta, pertanyaan, jawaban dan hasil. Ruang menyimpan snapshot paket soal agar penyuntingan bank berikutnya tidak mengubah kuis yang sudah dibuat.
- Tautan email Supabase lama dibersihkan dari kredensial sebelum masuk shell. Link lama dapat diarahkan ke popup akun Google; link tersebut tidak membuat sesi Firebase atau memberi akses perubahan sandi.

Shell dan pemutar musik, Alur Belajar tujuh topik, progres lokal, materi ID/EN, perhitungan fisika, simulator, kontrol volume Hukum I, kalkulator, konverter, foto dan aset pengguna dipertahankan. Flashcard tetap Coming Soon. Berkas SQL, konfigurasi dan dokumentasi Supabase disimpan sebagai arsip; tidak ada penghapusan atau migrasi otomatis akun/bank soal lama.

## Status pengaturan proyek

Google dan Anonymous telah dikonfirmasi **Enabled** pada proyek `thermpyx`, serta domain `thermpyx.github.io` sudah ditambahkan. Realtime Database sudah dibuat di **Singapore / `asia-southeast1`**; URL `https://thermpyx-default-rtdb.asia-southeast1.firebasedatabase.app` telah dikonfirmasi dari Console dan diisi pada `js/firebase-config.js`. Penerapan Rules, penerbitan frontend Firebase serta percobaan guru–siswa masih perlu diselesaikan. Kode dan hasil emulator tidak membuktikan layanan produksi sudah siap.

Lanjutkan dari [tahap 6 panduan Firebase](PANDUAN-FIREBASE.md#6-pasang-aturan-akses-khusus-thermpyx) untuk menerbitkan aturan, lalu terbitkan frontend dan jalankan percobaan. Tahap pembuatan database/penyalinan URL tetap disertakan sebagai rujukan. Menayangkan berkas GitHub tidak mengubah provider atau aturan Firebase secara otomatis.

## Pengujian dan batasnya

Aturan Realtime Database telah lulus **emulator resmi** melalui [run CI 38868957697](https://github.com/thermpyx/thermpyxgsekawan/actions/runs/38868957697): **6 skenario, 251 pemeriksaan**, termasuk 30 peserta. [Laporan hasil](https://github.com/thermpyx/thermpyxgsekawan/blob/0adb388/qa/firebase-ci-result.json) mengacu pada commit sumber `f9f7170` dan SHA-256 aturan:

```text
31d9c048f3554bde2740da34f6d532a2f31bf84a673337a841318606b2b13c57
```

Hasil ini hanya berlaku untuk isi aturan dengan hash tersebut. Suite memeriksa pemilik bank soal, penolakan pengguna lain/anonim, reservasi kode, keanggotaan, nama panggilan, keadaan ruang dan jawaban. Ini berbeda dari fixture jaringan RTDB yang menguji alur antarmuka tanpa mengeksekusi aturan.

Pengujian akun browser memakai mock Firebase untuk popup/error, aktivasi klik, klik ganda, penyimpanan, pergantian akun, draft, ID/EN, tema dan lebar 320 piksel. Pengujian SDK terpisah memakai Firebase 13 asli dengan **Auth emulator lokal**. Google credential pengujian bersifat sintetis dan lalu lintas RTDB pada suite SDK menggunakan fixture lokal; itu tidak menguji login ke Google produksi atau aturan yang sedang terpasang pada proyek pengguna.

Pemeriksaan inti lulus: **30** pemeriksaan client, **20** akun, **10** alur live, **86** navigasi dan **43** integrasi SDK asli. Regresi bersama juga lulus: Alur Belajar **357**, asesmen **189**, terjemahan **7**, tata letak navigasi **60**, kontrol kalkulator **40**, riwayat **12** beserta browser, riwayat simulator **3**, dan musik melewati **6** halaman. Pemeriksaan HTTP melayani **7** halaman serta **47** aset dengan respons 200.

Percobaan Google nyata, konfigurasi domain/provider, URL database dan penyimpanan guru–siswa pada proyek `thermpyx` tetap perlu dilakukan pemilik setelah Console siap. Tidak ada login produksi, email atau penulisan data Firebase pengguna yang dilakukan untuk QA ini.

Sebagai aplikasi latihan, peserta yang diizinkan menerima data soal ruang dan pembahasannya. Hasil pemeriksaan akses tidak menjadikan aplikasi sistem ujian dengan kerahasiaan kunci di server.

## Menjalankan pemeriksaan Firebase

Jalankan server statis proyek terlebih dahulu:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Dengan Node, Playwright dan Chromium yang tersedia:

```sh
node qa/test-firebase-client.cjs
node qa/test-firebase-account.cjs
node qa/test-firebase-live.cjs
node qa/test-firebase-navigation.cjs
```

Dependensi QA dipatok di `qa/firebase/package-lock.json`. Instalasi berikut hanya untuk pengujian, bukan syarat menjalankan web:

```sh
npm ci --prefix qa/firebase --cache /tmp/thermpyx-firebase-npm-cache --ignore-scripts --no-audit --no-fund
```

Untuk aturan asli, siapkan Java 21 dan jalankan emulator resmi pada proyek demo terisolasi:

```sh
NODE_PATH="$PWD/qa/firebase/node_modules" TPX_FIREBASE_TEST_PROJECT=demo-thermpyx-qa qa/firebase/node_modules/.bin/firebase emulators:exec --only database --project demo-thermpyx-qa "node qa/test-firebase-rules.cjs"
```

`firebase.json` dan CLI memasok alamat emulator ke suite. Suite menolak proyek produksi atau emulator nonlokal; kegagalan mengunduh/menjalankan emulator bukan kelulusan dan tidak boleh diatasi dengan mematikan verifikasi atau beralih ke database produksi.

`qa/test-firebase-sdk.cjs` menjelaskan cara membangun bundle Firebase **untuk QA saja**, menjalankan Auth emulator proyek `demo-thermpyx-qa` di `127.0.0.1:9099`, lalu memasok `TPX_FIREBASE_SDK_BUNDLE` ke tes. Bundle dan data emulator tidak perlu disertakan dalam situs yang diterbitkan.

Untuk navigasi, musik, simulasi dan materi, jalankan suite terkait yang tercantum di [AGENTS.md](../AGENTS.md). Tes dengan nama lama seperti `test-auth-sdk`, `test-auth-recovery`, `test-home-account`, `test-email-template`, `test-teacher-sql`, `test-question-set-flow`, `test-host-auth-race`, `test-upload-flow`, `test-live-entry` dan `test-quiz` masih memuat asumsi Supabase. Berkasnya dipertahankan untuk riwayat; hasilnya tidak membuktikan alur Firebase aktif.
