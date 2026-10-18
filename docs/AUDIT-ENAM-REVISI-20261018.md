# Audit enam revisi THERMPYX

Audit dilakukan pada 18 Oktober 2026, menggunakan branch publikasi `codex/simulator-visual-refinement`, dengan dasar commit `ed5799f`. `main` tidak menjadi tujuan perubahan. Branch publikasi telah memiliki fitur yang lebih lengkap daripada `main`, termasuk Firebase, Alur Belajar, flashcard, dan shell musik persisten.

## Hasil per permintaan

| Permintaan | Temuan pada branch publikasi | Tindakan audit ini |
| --- | --- | --- |
| Navigasi gradasi, ikon bersih, nama fitur saat hover | Sudah ada SVG, satu tooltip bersama, dukungan fokus/Escape, dan drawer/rail responsif. | Memverifikasi tema/navigasi pada browser, termasuk lebar 320 piksel. |
| Light mode berdesain dan perpindahan tema melingkar | Sudah ada grid, kontur, lapisan warna dan transisi lingkaran yang mencakup shell serta musik. Fallback dan reduced motion tersedia. | Memverifikasi pergantian dua arah, fallback, pengurangan gerakan dan satu perubahan per klik. |
| About tidak berulang dan tata letak rapi | About memiliki satu judul dan alur menuju belajar, kalkulator serta simulator. Ditemukan masalah lain: judul materi pada ponsel tertutup header setelah membuka tautan langsung. | Memperbaiki specificity `.tpx-study[id]`, sehingga jarak gulir 130 piksel pada layar kecil berlaku. Suite materi lulus setelah perbaikan. |
| Kartu Developer 360° utuh dan gantungan khas | Kartu sudah mempunyai rim tertutup dan gantungan berbulu: Nathan/biliar, John/mahkota, Van/gitar, Misel/naga. | Memeriksa gambar depan/samping/belakang, keyboard, tombol, empat aset, dan integritas tepian secara visual. Memperbaiki wordmark kecil yang terlalu gelap di atas permukaan foto/belakang ketika tema terang. |
| Leaderboard menuju halaman Periksa Jawaban dengan alasan | Sudah aktif pada Firebase. Tombol terbuka setelah sesi berakhir; halaman memakai snapshot soal, jawaban peserta, kunci dan pembahasan. | Delapan skenario review dan sepuluh skenario alur live lulus dengan fixture terisolasi. Menyelesaikan latihan lokal lima soal dan membuka rekap melalui tombol sebenarnya. |
| Warna primary/secondary konsisten pada dua tema | Primary cyan/teal dan secondary amber sudah tersedia. Sebagian label Developer masih memakai oranye lama dengan kontras sekitar 2,1:1 pada latar terang. | Label kini memakai secondary yang mengikuti tema, sekitar 5,4:1 pada dasar terang. Kontras wordmark di atas material gelap juga diperbaiki. |

Primary: `#5bd8d0` pada tema gelap, `#096b73` pada tema terang. Secondary: `#ffb367` pada tema gelap, `#9e4b18` pada tema terang. Indikator fisika dan status tetap mempertahankan arti masing-masing.

## Bukti pengujian lokal

| Suite | Hasil |
| --- | --- |
| `qa/test-interface-theme.cjs` | 42 pemeriksaan lulus |
| `qa/test-navigation-layout.cjs` | 60 pemeriksaan lulus |
| `qa/test-about-layout.cjs` | 15 pemeriksaan lulus |
| `qa/test-developer-intro.cjs` | 18 pemeriksaan lulus |
| `qa/test-developer-card.cjs` | 40 kelompok pemeriksaan lulus, termasuk 320/1440 piksel, ID/EN, kedua tema, kontras, rotasi dan empat gantungan |
| `qa/test-theory-material.cjs` | 706 pemeriksaan lulus setelah perbaikan jarak judul |
| `qa/test-answer-review.cjs` | 8 skenario lulus |
| `qa/test-firebase-live.cjs` | 10 skenario lulus |
| `qa/test-firebase-client.cjs` | 58 assertion lulus |
| `qa/test-learning-path.cjs` | 357 pemeriksaan lulus |
| `qa/test-learning-assessment.cjs` | 189 pemeriksaan lulus |
| `qa/test-calculator-stepper.cjs` | 40 pemeriksaan lulus |
| `qa/test-calculator-validation.cjs` | 4 skenario lulus |
| `qa/test-unit-converter.cjs` | 7 skenario lulus |
| `qa/test-rev08.cjs` | 20/20 pemeriksaan lulus |

Suite Developer baru serta suite materi ditambahkan ke workflow QA branch publikasi. Hasil lokal di atas terpisah dari hasil GitHub Actions setelah push. Pengujian backend menggunakan fixture; tidak membuat, mengubah, atau menghapus data produksi. Pemeriksaan ini tidak merupakan audit aksesibilitas seluruh situs atau pengujian keamanan ujian.

Untuk mengulang suite browser, jalankan server dari akar checkout:

```sh
python3 -m http.server 8003 --bind 127.0.0.1
```

Pada terminal lain dengan Playwright tersedia:

```sh
CHROMIUM_PATH=/usr/bin/chromium node qa/test-developer-card.cjs
CHROMIUM_PATH=/usr/bin/chromium node qa/test-theory-material.cjs
```

`TPX_TEST_URL` dapat mengubah alamat server. Tidak diperlukan build untuk menjalankan situs. Semua skrip, rumus, animasi, foto, musik, konfigurasi akun dan Rules Firebase dipertahankan.

## Laporan mata kuliah

[Isi laporan Bab I–V](LAPORAN-PROYEK-THERMPYX.md) tersedia juga dalam [format Word](LAPORAN-PROYEK-THERMPYX.docx). Sesuai permintaan, tidak disertakan sampul, kata pengantar atau daftar isi. Konteks institusi: Universitas Negeri Medan, Program Studi Bilingual Pendidikan Fisika.

Dua belas screenshot ditempatkan dekat pembahasan yang sesuai: dua tema beranda, mobile, Tentang, kartu Developer depan/samping, Alur Belajar, materi Hukum I, kalkulator, konverter, simulator Hukum I dan pembahasan latihan. Semuanya diambil dari antarmuka lokal sebenarnya. Contoh kalkulator menghasilkan ΔU = 300 J; gambar pembahasan berasal dari latihan lokal yang diselesaikan melalui antarmuka. Gambar simulator diambil saat proses isobarik dengan masukan Q = 300 J dijeda; nilai saat dijeda bukan keadaan akhir atau pengukuran eksperimen.

Dokumen memisahkan hasil audit baru, bukti emulator yang sebelumnya tercatat, laporan pengguna mengenai produksi, dan rencana penelitian pembelajaran. Tidak ada data responden, peningkatan nilai, atau efektivitas belajar yang dikarang. Format akhir dan sumber akademik dapat disesuaikan bersama dosen; rumus serta batas model tercantum di Bab II.
