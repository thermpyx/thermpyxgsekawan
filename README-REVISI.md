# THERMPYX — paket revisi

Situs ini tetap memakai HTML, CSS, dan JavaScript statis. Salin isi folder ke hosting statis yang digunakan web Anda. Tidak perlu `npm install` untuk menjalankan situs.

Untuk mencoba di komputer lokal, jalankan dari folder ini:

```sh
python3 -m http.server 8000
```

Buka alamat server melalui browser. Impor PDF memerlukan HTTP/HTTPS, bukan membuka HTML lewat `file://`. Hosting perlu menyajikan `.mjs` dengan MIME JavaScript agar worker PDF berjalan.

Mulai dari `index.html`. Beranda menyediakan tombol Buka Kalkulator, Buka Unit Converter, dan Buka Simulator. Kalkulator memiliki tujuh modul; Unit Converter memiliki sembilan kategori: suhu, tekanan, volume, energi, daya, massa, panjang, luas, dan waktu. Beranda memiliki satu tombol Mulai Latihan. Di dalamnya tersedia Quiz dan Flashcard; Bank Soal dapat dibuka dari pilihan Quiz. Draf soal serta kartu, termasuk impor PDF/DOCX, bisa dikerjakan lokal tanpa masuk. Akun THERMPYX diperlukan untuk menyimpan dan memuat koleksi cloud.

Untuk Supabase, ikuti [panduan bertahap](docs/PANDUAN-SUPABASE.md). SQL ada di `supabase/01-content-library.sql`; SQL dijalankan melalui Dashboard Supabase, bukan otomatis oleh paket ini. Login aplikasi tersedia di beranda; akun Dashboard Supabase berbeda dari akun aplikasi. Untuk kode email dengan nama pengirim THERMPYX, ikuti [pengaturan email dan SMTP](docs/EMAIL-THERMPYX.md). [Catatan revisi](docs/CATATAN-REVISI.md) menjelaskan fungsi dan batasan musik, dokumen, serta multiplayer.

Uji bawaan dengan Node.js:

```sh
node qa/test-rev08.cjs
node qa/test-quiz.cjs
node qa/test-document-import.cjs
node qa/test-unit-converter.cjs
node qa/test-i18n.cjs
node qa/test-history.cjs
```

Enam lagu bawaan sudah tersedia sebagai `assets/music/01.mp3` hingga `06.mp3`, sesuai urutan file yang diberikan. Daftar lagu menampilkan nomor saja. Tekan Putar untuk mendengar langsung dari situs; tidak membutuhkan YouTube atau Supabase. Pemilih audio dari perangkat dan input link YouTube tetap tersedia. Musik tetap berjalan ketika membuka halaman lain di dalam situs atau menutup panel musik. Muat ulang seluruh situs atau membuka tab baru memerlukan tombol Putar lagi.

Navigasi menggunakan `app.html` untuk mempertahankan satu pemutar musik. Alamat halaman tetap dapat dibagikan, dan tombol Kembali/Maju browser tetap tersedia. Unggah seluruh isi paket, termasuk `app.html`, `js/app-shell.js`, dan `js/persistent-navigation.js`, agar navigasi dan musik tetap terhubung. Gradasi hanya ditambahkan pada kartu pilihan, bukan pada seluruh halaman.

Pengujian browser menggunakan Chromium dan Playwright. Jalankan server HTTP pada port 8003 untuk perintah berikut:

```sh
TPX_TEST_URL=http://127.0.0.1:8003 node qa/test-learning-ui.cjs
TPX_TEST_URL=http://127.0.0.1:8003 node qa/test-home-account.cjs
TPX_TEST_URL=http://127.0.0.1:8003 node qa/test-upload-flow.cjs
TPX_TEST_URL=http://127.0.0.1:8003 node qa/test-auth-navigation.cjs
TPX_TEST_URL=http://127.0.0.1:8003/ node qa/test-simulator-history.cjs
node qa/test-history.cjs --browser
```

Riwayat menyimpan maksimal 50 hasil belajar yang bermakna. Navigasi, video, slider, mulai/jeda/reset tidak dicatat. Materi contoh dan antarmuka ID/EN diterjemahkan; tulisan dan nama yang dimasukkan pengguna dipertahankan. Wordmark memakai bentuk X yang sama dengan judul utama, dan ikon simulator memakai ilustrasi piston/sensor.
