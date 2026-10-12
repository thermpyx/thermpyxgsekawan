# THERMPYX — paket revisi

Situs ini tetap memakai HTML, CSS, dan JavaScript statis. Salin isi folder ke hosting statis yang digunakan web Anda. Tidak perlu `npm install` untuk menjalankan situs.

Untuk mencoba di komputer lokal, jalankan dari folder ini:

```sh
python3 -m http.server 8000
```

Buka alamat server melalui browser. Impor PDF memerlukan HTTP/HTTPS, bukan membuka HTML lewat `file://`. Hosting perlu menyajikan `.mjs` dengan MIME JavaScript agar worker PDF berjalan.

Mulai dari `index.html`. Beranda menyediakan tombol Buka Kalkulator, Buka Unit Converter, dan Buka Simulator. Kalkulator memiliki tujuh modul; Unit Converter memiliki sembilan kategori: suhu, tekanan, volume, energi, daya, massa, panjang, luas, dan waktu. Latihan/Kuis menyediakan Bank Soal pada halaman Host serta Flashcard dengan editor manual dan impor PDF/DOCX. Keduanya dapat dicoba secara lokal sebelum cloud siap.

Untuk Supabase, ikuti [panduan bertahap](docs/PANDUAN-SUPABASE.md). SQL ada di `supabase/01-content-library.sql`; database Anda belum diubah oleh paket ini. [Catatan revisi](docs/CATATAN-REVISI.md) menjelaskan fungsi dan batasan musik, dokumen, serta multiplayer.

Uji bawaan dengan Node.js:

```sh
node qa/test-rev08.cjs
node qa/test-quiz.cjs
node qa/test-document-import.cjs
node qa/test-unit-converter.cjs
```

Enam lagu bawaan sudah tersedia sebagai `assets/music/01.mp3` hingga `06.mp3`, sesuai urutan file yang diberikan. Daftar lagu menampilkan nomor saja. Tekan Putar untuk mendengar langsung dari situs; tidak membutuhkan YouTube atau Supabase. Pemilih audio dari perangkat dan input link YouTube tetap tersedia. Musik tetap berjalan ketika membuka halaman lain di dalam situs atau menutup panel musik. Muat ulang seluruh situs atau membuka tab baru memerlukan tombol Putar lagi.

Navigasi menggunakan `app.html` untuk mempertahankan satu pemutar musik. Alamat halaman tetap dapat dibagikan, dan tombol Kembali/Maju browser tetap tersedia. Unggah seluruh isi paket, termasuk `app.html`, `js/app-shell.js`, dan `js/persistent-navigation.js`, agar navigasi dan musik tetap terhubung. Gradasi hanya ditambahkan pada kartu pilihan, bukan pada seluruh halaman.
