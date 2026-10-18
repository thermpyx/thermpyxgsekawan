# THERMPYX: pembelajaran, kuis dan masukan

Menu **Masukan / Feedback** membuka popup dengan draf untuk `thermpyx@gmail.com`, pilihan aplikasi email, Gmail, dan salin pesan. Form tidak memenuhi beranda. Pengguna tetap mengirim sendiri melalui layanan emailnya.

**Learning Path** memiliki latar teal/navy, grid dan kontur teknik, serta panel progres berwarna. Halaman belajar lainnya memakai atmosfer futuristik statis yang mendukung tema terang/gelap; perhitungan dan alat simulator tetap dipertahankan.

**Flashcard aktif**: susun kartu manual atau impor PDF/DOCX, periksa pratinjau teks, buat dan edit draf, lalu simpan lokal atau ke koleksi akun Google yang bersifat pribadi. Berkas asli tidak diunggah. Batas: 8 MB, 32 halaman PDF dan 100 kartu; PDF hasil scan tetap memerlukan OCR. Nama dan isi materi pengguna tidak diterjemahkan otomatis.

**Live quiz** memiliki Reaktor Energi (respons visual) dan Prisma (sekali per peserta per ruang, menyingkirkan dua pilihan salah). Guru memilih bantuan sebelum ruang dibuat. Waktu tetap 20 detik; jawaban benar 100 dan salah/kehabisan waktu 0. Pemakaian bantuan ditandai untuk host. [Rincian skill](docs/IDE-SKILL-QUIZ.md).

Versi ini menggunakan **Firebase Authentication dan Realtime Database**. Guru masuk dengan Google untuk menyimpan bank soal dan menjadi host; siswa bergabung memakai kode ruang dan nama panggilan dengan identitas anonim Firebase. Form sandi, kode email dan pemulihan Supabase sudah tidak dipakai pada antarmuka aktif.

**Pengguna sudah mengonfirmasi alur utama berjalan pada web aktif:** tombol Google tampil, login Google berhasil, soal dapat dibuat/digunakan, dan teman berhasil bergabung serta menjawab kuis. Ini laporan percobaan normal pengguna, terpisah dari QA lokal. Google, Anonymous, domain situs, Realtime Database Singapore dan Rules sudah disiapkan. Rilis tetap memakai `codex/simulator-visual-refinement`; tidak perlu unggah ulang atau mengganti cabang. [Panduan Firebase](docs/PANDUAN-FIREBASE.md) tetap tersedia untuk setup dan pengujian ulang.

Teori ID/EN, tujuh modul Alur Belajar, simulator, kalkulator, konverter, musik, kuis mandiri dan draf soal lokal tetap tersedia tanpa akun. Gambar alat simulator, perbaikan volume Hukum I, kontrol angka kalkulator, foto dan aset asli dipertahankan. Draf dan data lama tetap dipertahankan.

Situs tetap statis: **tidak perlu build atau npm untuk menjalankan web**, dan Analytics tidak diaktifkan. Untuk penayangan di tempat lain, pertahankan seluruh isi proyek beserta `index.html`, `app.html`, `js/`, `css/`, `quiz/`, `simulator/`, `theory/`, `assets/` dan `vendor/`. Untuk mencoba lokal:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Buka `http://127.0.0.1:8003/`. Shell `app.html` menjaga musik tetap berjalan saat halaman berganti. Login lokal juga memerlukan domain `127.0.0.1` atau `localhost` yang benar-benar digunakan diizinkan pada Firebase.

Aturan Realtime Database telah diuji pada emulator resmi: **9 skenario, 345 pemeriksaan**, termasuk privasi flashcard, pemakaian Prisma dan 30 peserta, untuk hash berkas yang dicatat pada [rincian migrasi dan pengujian](docs/REVISI-FIREBASE.md). Hasil ini tidak menggantikan pengaturan Console atau percobaan guru–siswa pada proyek Firebase Anda.

[Catatan revisi Firebase](docs/REVISI-FIREBASE.md) memuat batas pengujian dan perintah QA. [Pedoman pengembangan](AGENTS.md), [revisi visual](docs/REVISI-VISUAL-SIMULATOR.md) dan [Alur Belajar](docs/REVISI-ALUR-BELAJAR.md) tetap berlaku. Dokumen/SQL Supabase disimpan sebagai arsip; akun dan bank soal Supabase tidak dipindahkan otomatis ke Firebase. Jangan menghapus data lama hanya karena frontend sudah berganti backend.

Fitur cloud baru memerlukan Rules terbaru di `firebase/database.rules.json` dipublikasikan pada proyek yang sama. Pengujian emulator tidak memublikasikan Rules produksi. Frontend tetap ditujukan ke cabang Pages `codex/simulator-visual-refinement`; cabang tinjauan pengembangan adalah `codex/learning-skills-flashcards-20261017`.

## Unduh isi laporan mata kuliah

[Unduh laporan Word langsung](https://github.com/thermpyx/thermpyxgsekawan/raw/refs/heads/codex/simulator-visual-refinement/docs/LAPORAN-PROYEK-THERMPYX.docx). Berkas berisi Bab I–V dan 12 screenshot sesuai pembahasan, dengan konteks Universitas Negeri Medan, Program Studi Bilingual Pendidikan Fisika. Sampul dan kata pengantar disiapkan terpisah oleh kelompok.

[Sumber Markdown](docs/LAPORAN-PROYEK-THERMPYX.md) dan [gambar asli](docs/images/) juga tersedia. Jika membuka pratinjau berkas di GitHub, pilih **Download raw file** untuk menyimpan Word; tautan unduh langsung di atas tidak memerlukan akses ke ruang kerja Codex.

## Revised English report and direct feedback

The revised report is separate from the application's runtime files:

- [Download the English report (Word)](https://github.com/thermpyx/thermpyxgsekawan/raw/refs/heads/codex/simulator-visual-refinement/docs/THERMPYX-PROJECT-REPORT-EN.docx)
- [Download the English report (PDF)](https://thermpyx.github.io/thermpyxgsekawan/docs/THERMPYX-PROJECT-REPORT-EN.pdf)
- [Read the English report](docs/THERMPYX-PROJECT-REPORT-EN.md)
- [Report download page](https://thermpyx.github.io/thermpyxgsekawan/docs/reports/)
- [Verified journal and book sources](docs/report-sources.md)

The original Indonesian DOCX is retained. Publisher PDFs are linked rather than copied into application assets. The report distinguishes recorded software checks from classroom learning outcomes and production observations.

Developer keychains have been removed; photos and full card rotation are preserved. Feedback now submits through Firebase without opening an email application. Its dedicated Database Rules must be published before production can accept messages; see [feedback activation instructions](docs/EMAIL-THERMPYX.md). A frontend deployment alone does not publish Database Rules.

[Notifikasi email masukan](docs/NOTIFIKASI-EMAIL-FIREBASE.md): backend Cloud Functions opsional tersedia di `functions/`, dengan tujuan awal `thermpyx@gmail.com`. Aktivasi memerlukan Blaze, Gmail App Password yang disimpan pada Secret Manager, dan Firebase deploy. Kode di GitHub tidak otomatis mengaktifkan email.
