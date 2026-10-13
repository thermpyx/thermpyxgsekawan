# THERMPYX — revisi terbaru

Paket ini menggunakan versi ZIP yang Anda kirim sebagai dasar. Unggah seluruh isi folder ke hosting statis, termasuk `app.html`, folder `js`, `css`, `quiz`, `simulator`, `theory`, `assets`, dan `vendor`. Tidak ada build atau instalasi npm yang diperlukan untuk menjalankan web.

Untuk mencoba secara lokal, dari folder ini jalankan:

```sh
python3 -m http.server 8003
```

Buka situs melalui HTTP/HTTPS. Halaman `index.html` akan diarahkan ke aplikasi `app.html` yang mempertahankan pemutar musik saat halaman berganti.

## Perubahan

- Beranda hanya menampilkan tombol Masuk. Form masuk, daftar, kode email, dan pemulihan kata sandi tampil di popup. Fitur yang memerlukan akun membuka popup yang sama.
- Menu navigasi memiliki animasi tiga garis menjadi X, penutupan dengan Escape/area luar pada ponsel, dan simbol logo yang tidak menyusut ketika sidebar ditutup.
- Kontrol kembali, berikutnya, dan navigasi halaman tidak memakai panah dekoratif. Simbol arah di rumus fisika dan konversi dipertahankan karena menjelaskan materi.
- Tutorial pertama hadir di beranda, teori, kalkulator, konverter, simulator, serta alur kuis. Panduan singkat dapat dibuka lagi, dilewati, dan mengikuti bahasa ID/EN.
- Latihan menyediakan Quiz dan Flashcard. Flashcard menampilkan Coming Soon; editor dan impor flashcard tidak tersedia pada antarmuka. Data lama di browser atau database tidak dihapus.
- Guru dapat menyusun paket soal dengan empat jawaban, kunci, dan pembahasan; menata urutan; memeriksa duplikasi; melihat pratinjau; lalu menyimpan dan membukanya di Host.
- Intro Developer memakai empat foto asli, bergerak dari tengah menuju pilihan profil setiap halaman dibuka, dengan opsi lewati/putar ulang dan dukungan reduced motion.
- Navigasi memiliki tata letak responsif tanpa scrollbar/tombol scroll yang tampak; judul, teks, dan tautan Developer pada About kini terpusat.
- Kalkulator menolak hasil tak terhingga dan suhu di bawah nol mutlak; alur masuk/keluar ruang kuis menangani klik ganda, UUID, serta kegagalan koneksi.

## Akun dan Supabase

Teori, kalkulator, konverter, simulator, musik, latihan mandiri, dan draf soal lokal dapat dipakai tanpa akun. Untuk menyimpan paket pribadi ke cloud dan menjadi host paket tersebut, guru perlu akun THERMPYX. Siswa pada alur saat ini cukup memakai kode ruang dan nama panggilan. Akun aplikasi berbeda dari akun Dashboard Supabase.

Mulai dengan [panduan Supabase bertahap](docs/PANDUAN-SUPABASE.md). Migrasi bank soal guru ada di `supabase/02-teacher-quiz.sql`. Migrasi ini mempertahankan tabel/data lama, tetapi tidak membuat skema multiplayer lama yang tidak tersedia dalam ZIP. Jangan mengunggah secret/service-role key ke frontend.

Database remote tidak diubah otomatis. Pengujian alur cloud menggunakan backend tiruan; setelah setup Supabase, login, simpan paket, dan sesi guru–siswa perlu diuji pada proyek sebenarnya. Versi ini untuk latihan kelas: kunci jawaban dan perhitungan skor masih berada di browser. Ujian dengan kerahasiaan kunci dan integritas nilai membutuhkan penilaian serta otorisasi peserta/host di server.

## Pengujian

Suite Node menggunakan modul bawaan; suite browser memerlukan Playwright dan Chromium. Pada lingkungan pengerjaan semua tersedia. Jalankan server port 8003 dari folder paket sebelum tes browser.

```sh
node qa/test-rev08.cjs
node qa/test-quiz.cjs
node qa/test-unit-converter.cjs
node qa/test-i18n.cjs
node qa/test-history.cjs
node qa/test-calculator-validation.cjs
node qa/test-live-entry.cjs
node qa/test-home-account.cjs
node qa/test-onboarding.cjs
node qa/test-developer-intro.cjs
node qa/test-about-layout.cjs
node qa/test-navigation-layout.cjs
node qa/test-learning-ui.cjs
node qa/test-upload-flow.cjs
node qa/test-shell-music.cjs
node qa/test-auth-navigation.cjs
node qa/test-simulator-history.cjs
```

Hasil dan batas pengujian ada di [catatan revisi](docs/CATATAN-REVISI.md). Musik bawaan 01–06, berkas foto, seluruh profil, materi, dan tujuh kalkulator serta sembilan kategori konverter dipertahankan.

Migrasi SQL juga memiliki tes PostgreSQL lokal opsional pada `qa/test-teacher-sql.cjs`, menggunakan paket `@electric-sql/pglite` yang dipasang di direktori sementara terpisah. Ini hanya dependensi QA, bukan kebutuhan runtime web.
