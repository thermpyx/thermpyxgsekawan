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
