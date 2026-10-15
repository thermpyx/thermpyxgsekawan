# Revisi alur belajar, terjemahan, dan simulator

Dasar pekerjaan: isi `THERMPYX_FINAL_DENGAN_TEORI.zip` yang diberikan pengguna. Fitur dan aset versi ZIP dipertahankan, kemudian revisi ini ditambahkan. Perubahan dibandingkan versi GitHub lama juga mencakup fitur yang memang sudah ada di ZIP.

## Alur belajar

Buka **Alur Belajar / Learning Path** di menu atau tombol **Mulai Belajar** pada beranda. Pengguna memperoleh tujuan pembelajaran umum, persyaratan awal, urutan tujuh modul, pertanyaan pemantik, capaian per topik, tautan materi, aktivitas simulator/kalkulator, refleksi, dan kuis yang sesuai.

Urutan yang disarankan: kalor dan suhu → hukum ke nol → usaha dan energi → hukum pertama → proses termodinamika → hukum kedua → hukum ketiga. Topik tetap dapat dipilih bebas untuk mengulang materi.

Membaca dan melakukan aktivitas ditandai sendiri. Hasil kuis baru dicatat setelah seluruh soal dijawab. Nilai minimal 80% menunjukkan penguasaan kuis topik; sebuah modul selesai ketika bacaan, aktivitas, dan kuisnya selesai. Ini indikator belajar mandiri, bukan sertifikat atau penilaian ujian yang aman dari manipulasi browser.

Progres tersimpan pada browser yang sama, tanpa akun; bukan sinkronisasi cloud. Tombol atur ulang meminta konfirmasi dan hanya menghapus progres belajar, bukan akun, musik, bank soal, atau riwayat lain. Jika penyimpanan browser tidak tersedia, antarmuka memberi tahu pengguna dan mempertahankan progres selama sesi berjalan.

Kuis mandiri menyediakan tujuh topik, masing-masing lima soal. Kuis campuran memilih tiga soal per topik (21 soal) agar semua materi terwakili. Kuis langsung dan bank soal guru dipertahankan terpisah.

## Terjemahan dan desain

Materi pendalaman yang sebelumnya dikecualikan dari terjemahan mendapat padanan Indonesia–Inggris yang ditulis secara eksplisit. Rumus, satuan, struktur contoh soal, dan tautan jangkar dipertahankan. Pedoman pemeliharaan di `AGENTS.md` mewajibkan pemeriksaan dua arah untuk konten baru.

Gaya simulator diselaraskan dengan tipografi dan komponen situs, termasuk tema terang/gelap serta layar kecil. JavaScript dan skrip executable inline dibandingkan dengan ZIP awal. Satu perbaikan perilaku telah diizinkan secara eksplisit oleh pengguna: kontrol volume awal dan akhir simulator Hukum I dipisahkan agar mode isotermal dan adiabatik dapat melakukan ekspansi maupun kompresi. Rumus proses, neraca energi, dan animasinya dipertahankan; skrip simulator lain tetap sama. Keadaan antara dan marker grafik mengikuti persamaan proses yang sama dengan keadaan akhir; waktu serta siklus animasi tetap. Pengujian memeriksa ekspansi/kompresi nontrivial, konservasi energi, Start/Jeda/Lanjut/Reset, penguncian kontrol, serta posisi marker grafik.

Audit juga memperbaiki kontrol jawaban editor soal yang dapat tertutup header saat digulir pada ponsel.

## Menjalankan dan memeriksa

Tidak ada proses build untuk situs ini. Dari direktori proyek:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Tes Node menggunakan modul bawaan. Tes browser memakai Playwright dan Chromium; alamat server dapat diganti lewat `TPX_TEST_URL`, lokasi Chromium lewat `CHROMIUM_PATH`. Hasil akhir pengujian dicatat pada laporan pekerjaan; pengujian lokal tidak membuktikan login, kebijakan database, pengiriman email, atau sesi kuis multiplayer Supabase pada proyek produksi.

## Hasil validasi revisi ini

- Alur belajar: 357 pemeriksaan, termasuk progres, kuota penyimpanan, penguasaan kuis, lanjut/reset, bahasa, dan tema.
- Materi: 538 pemeriksaan browser serta 7 tes bahasa; tujuh bab dan 35 contoh soal memiliki cakupan terjemahan.
- Simulator: 66 kombinasi halaman/lebar/tema; 33 pemeriksaan khusus volume Hukum I, termasuk kondisi antara dan marker grafik.
- Integrasi kuis: seluruh 35 soal dari tujuh topik dijawab melalui browser, umpan balik ID/EN, hasil tersimpan, tautan antarf fitur, dan kuis campuran yang seimbang.
- Navigasi: 60 pemeriksaan desktop/ponsel; musik mempertahankan elemen MP3 yang sama melewati enam halaman.
- Editor: 14 pemeriksaan impor/penyusunan soal, termasuk kontrol yang tidak tertutup header.
- Migrasi PostgreSQL lokal: 10 pemeriksaan, termasuk RLS, penolakan akses anonim, pengulangan migrasi, dan rollback.
- Tidak ditemukan referensi lokal HTML yang hilang (906 referensi diperiksa).

Pengujian browser menggunakan layanan lokal dan menonaktifkan/mengganti permintaan backend eksternal. Tidak ada data Supabase produksi yang dibuat, diubah, atau dihapus; pengiriman email, login produksi, dan kuis multiplayer langsung belum diverifikasi pada layanan produksi.
