# Revisi visual simulator dan kontrol angka

Revisi ini menggunakan hasil alur belajar sebelumnya sebagai dasar dan mempertahankan rumus serta seluruh skrip simulator, termasuk perbaikan volume Hukum I yang sudah disetujui.

## Area percobaan

Pada pemeriksaan lokal, stylesheet kalor dan suhu termuat. Masalah yang dapat direproduksi adalah informasi kalor terpotong di bawah area percobaan serta label yang ikut meredup bersama sumber panas. Visual bejana, termometer dan pemanas diperbaiki dengan gaya instrumen laboratorium yang mengikuti acuan piston Hukum I. Label informasi memiliki ruang sendiri dan tetap terbaca.

Simulator lain menggunakan bingkai instrumen, permukaan logam/kaca, dan warna energi yang selaras. Jarak kata, simbol, satuan, dan kontrol diperiksa terhadap batas panel, termasuk pada layar 320 piksel, tema terang/gelap, serta bahasa Indonesia/Inggris. Perubahan visual tidak memerlukan CDN tambahan atau layanan gambar eksternal.

## Teori

Pemisah tanda pisah panjang pada judul contoh soal diganti tanda titik dua. Garis aksen dekoratif pada kartu dan blok pembahasan dihapus. Label bagian diberi lebar dan padding sesuai isi, agar kata seperti MATERI tidak keluar dari kotaknya. Rumus, tanda minus matematis, nilai contoh soal dan rentang angka dipertahankan; padanan terjemahan diperbarui bersamaan.

## Kalkulator

Kontrol tambah/kurang terintegrasi ke kolom nilai dengan ikon yang konsisten, satuan yang memiliki ruang tersendiri, dan umpan balik singkat saat digunakan. Penyesuaian menggunakan langkah kecil sesuai besaran, misalnya 0,1 untuk massa/volume/rasio kalor jenis dan 1 untuk kalor/tekanan. Pengguna tetap dapat mengetik nilai pecahan dengan ketelitian lain.

Label input terhubung secara eksplisit ke kolom; tombol tidak mengirim formulir. Penyesuaian mendukung klik dan tombol panah keyboard, pembulatan desimal yang tepat, batas nilai, serta status nonaktif. Tombol dan keterangannya mengikuti pilihan ID/EN. Rumus kalkulator tetap menggunakan modul sebelumnya.

## Menjalankan

Jalankan server statis dari akar proyek:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Pengujian visual dilakukan pada browser nyata, mencakup tampilan alat dan batas area percobaan. Pengujian perilaku memeriksa perhitungan, animasi, riwayat, serta kontrol yang sudah ada. Pengujian ini tidak mengubah data Supabase produksi.

## Pemeriksaan revisi

- Kalor/suhu: 128 kombinasi route, lebar layar, tema, bahasa dan bahan, ditambah pemanasan langsung, grafik, tooltip, serta integritas skrip.
- Kalkulator: 40 pemeriksaan, mencakup seluruh 19 kolom angka, perhitungan tujuh kalkulator, presisi, keyboard, batas nilai dan label bilingual.
- Teori: 706 pemeriksaan untuk tujuh bab dan 35 contoh soal, cakupan terjemahan, penghapusan tanda pisah judul, ruang label, tautan, nilai ilmiah, serta tampilan responsif.
- Aparatus lain: 96 kombinasi, termasuk tampilan nyata alat/canvas, posisi label, keenam tautan simulator, serta kelengkapan CSS.
- Integritas aset: 910 referensi lokal HTML diperiksa tanpa berkas hilang.
- Regresi: integritas semua skrip simulator, proses volume Hukum I, riwayat hasil simulator, alur belajar/kuis, navigasi, dan editor soal diperiksa kembali.

Berkas pengujian ada di `qa/`; suite browser menggunakan Playwright dan Chromium. `TPX_TEST_URL` dapat mengubah alamat server pengujian dan `CHROMIUM_PATH` mengubah lokasi Chromium. Tidak diperlukan build atau dependensi tambahan untuk menjalankan situs.
