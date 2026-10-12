# THERMPYX — versi diperbarui
Ekstrak ZIP ini, lalu gunakan semua berkas di dalam folder THERMPYX-DIPERBARUI sebagai situs statis. Buka melalui server lokal atau hosting statis agar impor/ekspor dan penyimpanan browser bekerja konsisten. Untuk pengembangan lokal, jalankan `python3 -m http.server 8000` dari folder situs.
## Perubahan
- Beranda menampilkan kartu pembuka kalkulator, converter, simulator, dan Latihan dengan gradasi; formulir kalkulator dan converter dipindahkan ke halaman khusus.
- `calculators.html` memuat tujuh kalkulator. `converters.html` menyediakan delapan skala suhu: Celsius, Fahrenheit, Kelvin, Réaumur, Rankine, Delisle, Newton, dan Rømer. Pilihan Dari/Ke, pertukaran satuan, serta tekanan dan volume tersedia dalam halaman yang sama.
- Menu Latihan (`quiz/quiz.html`) berisi kuis mandiri, kuis langsung, dan flashcard.
- Host kuis langsung dapat menambah/edit/hapus soal dengan empat pilihan serta kunci jawaban. Draf disimpan di browser dan rangkaian soal dibagikan sebagai snapshot pada ruang yang dibuat.
- Flashcard memiliki materi bawaan dan materi pribadi; tambah/edit/hapus, membalik kartu, navigasi, acak, serta impor/ekspor JSON. Materi pribadi tersimpan di browser yang dipakai, tanpa sinkronisasi akun. Supabase tambahan tidak diperlukan untuk versi ini.
- Musik lama dihapus. Playlist berisi The Spectre — Alan Walker; Alone — Marshmello; On & On — Cartoon, Jéja & Daniel Levi; A Sorrowful Reunion — Reality Club; Sparks — Coldplay; Foto Kita Blur — Sal Priadi. Musik diputar melalui video YouTube saat pengguna menekan Putar. Pilihan versi video dapat disimpan melalui bagian “Pilih versi video”. Tautan untuk A Sorrowful Reunion dan Foto Kita Blur masih perlu dilengkapi; judulnya tersedia, tetapi belum dapat diputar sebelum tautan video valid disimpan. Pemutaran eksternal belum diverifikasi karena akses YouTube diblokir pada lingkungan pengujian.
- Berkas kode tidak memiliki baris kosong; indentasi tetap dipertahankan agar dapat dibaca.
## Aktivasi soal guru di Supabase
1. Buka proyek Supabase yang sudah digunakan oleh situs.
2. Jalankan isi `SUPABASE_CUSTOM_QUIZ.sql` sekali melalui SQL Editor. SQL menambahkan kolom `custom_questions` pada `quiz_rooms`, tanpa menghapus data atau memperluas RLS/grants.
3. Muat ulang halaman host, pilih Pertanyaan sendiri, dan buat ruang. Jika izin membuat atau membaca ruang ditolak, pengelola perlu memeriksa kebijakan akses proyek yang sudah ada.
Kuis bawaan tetap menggunakan skema semula. Jangan menaruh service-role key pada kode browser. Pengujian kuis buatan guru menggunakan backend tiruan; perubahan database asli belum dilakukan dan alur lintas perangkat di Supabase asli belum diverifikasi.
## Pemeriksaan
Jalankan masing-masing perintah dari folder situs: `node qa/test-rev08.cjs`, `node qa/test-quiz.cjs`, `node qa/test-custom-quiz.cjs`, `node qa/test-converter.cjs`, dan `node qa/test-flashcards.cjs`. Pengujian browser converter membutuhkan Playwright/Chromium; pemeriksaan matematis tetap berjalan tanpa browser.

Hasil pemeriksaan lokal: suite REV08 20/20, seluruh skenario kuis bawaan, 8 kelompok skenario kuis kustom, suite converter 21/21 termasuk Chromium, serta suite flashcard lulus. Seluruh JavaScript lolos pemeriksaan sintaks. Sebanyak 426 tautan/aset lokal dalam 28 halaman paket terverifikasi tersedia. Backend Supabase pada pengujian kuis adalah tiruan.

Pengujian browser tambahan lulus: beranda dan navigasi halaman khusus, hasil kalkulator, gradasi, lokalisasi Latihan, enam pilihan lagu, pemuatan/penutupan pemutar dan validasi/persistensi tautan video, serta tata letak 320–1440 piksel. Flashcard juga diuji pada Chromium untuk tambah kartu, membalik lewat keyboard, penyimpanan setelah reload, dan tampilan mobile.
