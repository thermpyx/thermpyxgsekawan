# THERMPYX: Firebase, akun Google dan kuis

Versi ini menggunakan **Firebase Authentication dan Realtime Database**. Guru masuk dengan Google untuk menyimpan bank soal dan menjadi host; siswa bergabung memakai kode ruang dan nama panggilan dengan identitas anonim Firebase. Form sandi, kode email dan pemulihan Supabase sudah tidak dipakai pada antarmuka aktif.

**Setelah versi Firebase tampil, lanjutkan ke [tahap 8: masuk Google dan simpan satu paket](docs/PANDUAN-FIREBASE.md#8-coba-satu-paket-soal-guru).** Google dan Anonymous sudah Enabled; `thermpyx.github.io` sudah diizinkan. Realtime Database Singapore dan URL kode sudah siap; pengguna mengonfirmasi Rules berhasil dipublikasikan. Rilis frontend memakai cabang Pages yang sama, `codex/simulator-visual-refinement`, sehingga pengguna tidak perlu mengunggah ulang atau mengganti cabang. Login Google nyata, simpan/muat ulang bank soal dan percobaan guru–siswa masih perlu diuji; konfigurasi saja tidak membuktikan produksi siap.

Teori ID/EN, tujuh modul Alur Belajar, simulator, kalkulator, konverter, musik, kuis mandiri dan draf soal lokal tetap tersedia tanpa akun. Gambar alat simulator, perbaikan volume Hukum I, kontrol angka kalkulator, foto dan aset asli dipertahankan. Flashcard masih Coming Soon; data lama tidak dihapus.

Situs tetap statis: **tidak perlu build atau npm untuk menjalankan web**, dan Analytics tidak diaktifkan. Unggah seluruh isi proyek beserta `index.html`, `app.html`, `js/`, `css/`, `quiz/`, `simulator/`, `theory/`, `assets/` dan `vendor/`. Untuk mencoba lokal:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Buka `http://127.0.0.1:8003/`. Shell `app.html` menjaga musik tetap berjalan saat halaman berganti. Login lokal juga memerlukan domain `127.0.0.1` atau `localhost` yang benar-benar digunakan diizinkan pada Firebase.

Aturan Realtime Database telah diuji pada emulator resmi: **6 skenario, 251 pemeriksaan**, termasuk 30 peserta, untuk hash berkas yang dicatat pada [rincian migrasi dan pengujian](docs/REVISI-FIREBASE.md). Hasil ini tidak menggantikan pengaturan Console atau percobaan guru–siswa pada proyek Firebase Anda.

[Catatan revisi Firebase](docs/REVISI-FIREBASE.md) memuat batas pengujian dan perintah QA. [Pedoman pengembangan](AGENTS.md), [revisi visual](docs/REVISI-VISUAL-SIMULATOR.md) dan [Alur Belajar](docs/REVISI-ALUR-BELAJAR.md) tetap berlaku. Dokumen/SQL Supabase disimpan sebagai arsip; akun dan bank soal Supabase tidak dipindahkan otomatis ke Firebase. Jangan menghapus data lama hanya karena frontend sudah berganti backend.
