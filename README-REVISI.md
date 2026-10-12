# THERMPYX — paket revisi

Situs ini tetap memakai HTML, CSS, dan JavaScript statis. Salin isi folder ke hosting statis yang digunakan web Anda. Tidak perlu `npm install` untuk menjalankan situs.

Untuk mencoba di komputer lokal, jalankan dari folder ini:

```sh
python3 -m http.server 8000
```

Buka alamat server melalui browser. Impor PDF memerlukan HTTP/HTTPS, bukan membuka HTML lewat `file://`. Hosting perlu menyajikan `.mjs` dengan MIME JavaScript agar worker PDF berjalan.

Mulai dari `index.html`, lalu buka Latihan/Kuis. Bank Soal terdapat pada halaman Host; Flashcard menyediakan editor manual dan impor PDF/DOCX. Keduanya dapat dicoba secara lokal sebelum cloud siap.

Untuk Supabase, ikuti [panduan bertahap](docs/PANDUAN-SUPABASE.md). SQL ada di `supabase/01-content-library.sql`; database Anda belum diubah oleh paket ini. [Catatan revisi](docs/CATATAN-REVISI.md) menjelaskan fungsi dan batasan musik, dokumen, serta multiplayer.

Uji bawaan dengan Node.js:

```sh
node qa/test-rev08.cjs
node qa/test-quiz.cjs
node qa/test-document-import.cjs
```

Enam lagu bawaan sudah tersedia sebagai `assets/music/01.mp3` hingga `06.mp3`, sesuai urutan file yang diberikan. Daftar lagu menampilkan nomor saja. Tekan Putar untuk mendengar langsung dari situs; tidak membutuhkan YouTube atau Supabase. Pemilih audio dari perangkat dan input link YouTube tetap tersedia. Menutup panel musik mempertahankan pemutaran pada halaman yang sedang dibuka; pindah halaman/muat ulang perlu menekan Putar lagi.
