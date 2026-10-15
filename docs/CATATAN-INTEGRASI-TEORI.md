# THERMPYX — Integrasi Materi Teori

Paket ini menggunakan `thermpyxgsekawan-42911070a32d279feaccb619a918f7243b9bb2a5.zip` sebagai dasar web final dan membandingkannya dengan `THERMPYX_TEORI_LENGKAP.zip`.

Seluruh isi ZIP teori sudah terdapat secara identik di web final. Karena itu, materi tidak digandakan. Pembaruan memperjelas aksesnya dan mempertahankan 37 bagian pendalaman serta 35 contoh soal asli.

## Cara membuka materi

1. Buka situs, lalu pilih **Theory / Teori**.
2. Di bawah empat kartu teori yang sudah ada, pilih **BUKA MATERI LENGKAP / OPEN COMPLETE MATERIAL**.
3. Pilih salah satu dari tujuh topik untuk membaca konsep dan rumus, atau gunakan tautan **5 contoh soal dan penyelesaian**.
4. Pada setiap topik, tautan cepat di dekat judul membuka pembahasan lengkap atau contoh soal. Daftar contoh soal membuka masing-masing soal secara langsung.

Materi lengkap mengikuti pilihan ID/EN, termasuk seluruh paragraf dan 35 contoh soal. Terjemahan tertulis disimpan bersama kamus aplikasi; rumus, simbol, dan nilai numerik dipertahankan. Panduan penambahan materi dan pemeriksaan cakupan ada di `PANDUAN-MATERI-DIPERLUAS.md`.

## Cakupan materi

- Kalor dan Suhu
- Hukum ke Nol Termodinamika
- Usaha dan Energi
- Hukum Pertama Termodinamika
- Proses Termodinamika
- Hukum Kedua Termodinamika
- Hukum Ketiga Termodinamika

Setiap topik memiliki lima soal dengan data, asumsi, langkah penyelesaian, jawaban, dan makna hasil. Konten konsep, rumus, dan soal dipertahankan dari lampiran.

## Menjalankan web

Ekstrak ZIP, lalu dari dalam folder `THERMPYX` jalankan:

```sh
python3 -m http.server 8003
```

Buka web melalui HTTP pada port tersebut, atau unggah seluruh isi folder `THERMPYX` ke hosting statis. Tidak ada langkah build atau instalasi npm untuk menggunakan situs. Semua aset web final, termasuk musik, profil, simulator, dan vendor impor dokumen, tetap disertakan.

## Perubahan

- `index.html`: akses materi lengkap dari bagian Theory.
- `theory/laws.html`: indeks tujuh topik dengan tautan konsep serta contoh soal.
- Tujuh halaman topik `theory/*.html`: tautan cepat dan daftar lima contoh soal.
- `css/theory-expanded.css`: gaya tambahan terbatas pada komponen materi, mengikuti warna dan tipografi situs.
- `qa/test-theory-material.cjs`: pemeriksaan browser untuk materi, navigasi jangkar, keyboard, bahasa, dan tata letak.

JavaScript aplikasi, konfigurasi akun/Supabase, kalkulator, simulator, musik, serta seluruh aset web final tidak diubah. Paket unduhan ini berisi seluruh web dan dapat dipakai secara mandiri setelah diekstrak.

## Verifikasi

Pemeriksaan lokal menggunakan HTTP dan Chromium, tanpa menulis data ke backend Supabase:

```sh
node qa/test-theory-material.cjs
node qa/test-rev08.cjs
node qa/test-quiz.cjs
node qa/test-i18n.cjs
node qa/test-navigation-layout.cjs
node qa/test-onboarding.cjs
node qa/test-shell-music.cjs
```

Suite browser memerlukan Playwright dan Chromium. `TPX_TEST_URL` dapat dipakai untuk mengganti alamat server tes. `CHROMIUM_PATH` dapat dipakai untuk mengganti lokasi Chromium. Pengujian backend akun dan sesi kuis langsung tidak termasuk dalam perubahan materi ini.

Hasil lokal: 234 pemeriksaan materi, 60 pemeriksaan tata letak navigasi, 34 pemeriksaan tutorial, 20 pemeriksaan REV08, 6 tes bahasa, seluruh skenario kuis tiruan, serta kelangsungan musik selama enam perpindahan halaman lulus. Empat kartu teori asli identik secara piksel pada pembandingan desktop/ponsel dan terang/gelap. Seluruh 395 referensi lokal pada halaman yang diubah valid.
