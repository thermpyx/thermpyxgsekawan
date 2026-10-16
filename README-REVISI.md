# THERMPYX: Firebase, akun Google dan kuis

Versi ini menggunakan **Firebase Authentication dan Realtime Database**. Guru masuk dengan Google untuk menyimpan bank soal dan menjadi host; siswa bergabung memakai kode ruang dan nama panggilan dengan identitas anonim Firebase. Form sandi, kode email dan pemulihan Supabase sudah tidak dipakai pada antarmuka aktif.

**Lanjutkan dari [tahap 6 panduan Firebase](docs/PANDUAN-FIREBASE.md#6-pasang-aturan-akses-khusus-thermpyx).** Google dan Anonymous sudah Enabled; `thermpyx.github.io` sudah diizinkan. Realtime Database sudah dibuat di Singapore dan URL aslinya sudah diisi pada konfigurasi kode. Penerapan Rules, penerbitan frontend Firebase serta percobaan guru–siswa masih perlu diselesaikan; penyimpanan cloud dan kuis produksi belum dinyatakan siap.

Teori ID/EN, tujuh modul Alur Belajar, simulator, kalkulator, konverter, musik, kuis mandiri dan draf soal lokal tetap tersedia tanpa akun. Gambar alat simulator, perbaikan volume Hukum I, kontrol angka kalkulator, foto dan aset asli dipertahankan. Flashcard masih Coming Soon; data lama tidak dihapus.

Situs tetap statis: **tidak perlu build atau npm untuk menjalankan web**, dan Analytics tidak diaktifkan. Unggah seluruh isi proyek beserta `index.html`, `app.html`, `js/`, `css/`, `quiz/`, `simulator/`, `theory/`, `assets/` dan `vendor/`. Untuk mencoba lokal:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Buka `http://127.0.0.1:8003/`. Shell `app.html` menjaga musik tetap berjalan saat halaman berganti. Login lokal juga memerlukan domain `127.0.0.1` atau `localhost` yang benar-benar digunakan diizinkan pada Firebase.

Aturan Realtime Database telah diuji pada emulator resmi: **6 skenario, 251 pemeriksaan**, termasuk 30 peserta, untuk hash berkas yang dicatat pada [rincian migrasi dan pengujian](docs/REVISI-FIREBASE.md). Hasil ini tidak menggantikan pengaturan Console atau percobaan guru–siswa pada proyek Firebase Anda.

[Catatan revisi Firebase](docs/REVISI-FIREBASE.md) memuat batas pengujian dan perintah QA. [Pedoman pengembangan](AGENTS.md), [revisi visual](docs/REVISI-VISUAL-SIMULATOR.md) dan [Alur Belajar](docs/REVISI-ALUR-BELAJAR.md) tetap berlaku. Dokumen/SQL Supabase disimpan sebagai arsip; akun dan bank soal Supabase tidak dipindahkan otomatis ke Firebase. Jangan menghapus data lama hanya karena frontend sudah berganti backend.
