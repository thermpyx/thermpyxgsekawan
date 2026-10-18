# Perbaikan kegagalan QA dan tautan laporan

Run QA [39108099268](https://github.com/thermpyx/thermpyxgsekawan/actions/runs/39108099268) pada commit `589c494` gagal di langkah pemeriksaan antarmuka. Build dan deployment Pages pada commit tersebut berhasil. Keduanya adalah workflow terpisah.

## Intro Developer dibatalkan oleh sinkronisasi tema

Kegagalan dapat direproduksi saat membuka kembali halaman Developer melalui shell. Sinkronisasi tema memancarkan event `resize` untuk menyegarkan grafik, meskipun ukuran layar tetap sama. Handler intro lama menutup animasi pada setiap event tersebut. Akibatnya intro bisa hilang sebelum pengguna atau QA mengamatinya.

Handler kini membandingkan lebar dan tinggi viewport. Intro tetap berjalan saat menerima event pembaruan grafik, tetapi tetap ditutup bila ukuran layar benar-benar berubah. Mekanisme Escape, Lewati, putar ulang, pergantian halaman dan reduced motion dipertahankan.

Regresi baru memeriksa event sintetis tanpa perubahan ukuran. Regresi ini gagal pada implementasi sebelumnya dan lulus setelah perbaikan. Kasus perubahan viewport nyata juga tetap diperiksa; batas satu detik memastikan penutupan berasal dari perubahan ukuran, bukan sekadar menunggu intro selesai sendiri.

## Tes impor flashcard membaca sebelum proses selesai

Menjalankan sisa rantai QA juga mereproduksi kegagalan impor flashcard: tes melihat dua textarea sementara hasil akhirnya seharusnya empat. Klik tombol konfirmasi menutup dialog, kemudian event `close` melanjutkan pembuatan kartu secara asinkron. Tes sebelumnya langsung menghitung textarea sebelum kelanjutan ini berjalan.

Tes kini menunggu status penyelesaian pembuatan dua kartu, kemudian tetap memeriksa jumlah empat textarea beserta isi pertanyaan dan jawaban yang tepat. Parser dan logika flashcard produksi tidak diubah. Pemeriksaan akses cloud pribadi, pergantian pemilik, draf lokal, validasi impor dan perlindungan isi tetap dipertahankan.

## Diagnostik workflow

Dua puluh perintah browser QA dipisahkan menjadi langkah bernama masing-masing. Urutan, perintah, dan seluruh pemeriksaan tetap sama; tidak ada tes yang dilewati atau dinonaktifkan. Dengan demikian halaman Actions menampilkan nama suite yang gagal secara langsung.

## Unduh laporan

[Unduh Word langsung dari GitHub](https://github.com/thermpyx/thermpyxgsekawan/raw/refs/heads/codex/simulator-visual-refinement/docs/LAPORAN-PROYEK-THERMPYX.docx).

Tautan ini merespons HTTP 200. Seluruh berkas yang diunduh telah dibandingkan dengan sumber lokal melalui SHA-256 dan diperiksa sebagai arsip DOCX valid dengan 12 screenshot tertanam. README sekarang menyediakan tautan ini; unduhan tidak bergantung pada akses berkas ruang kerja Codex.
