# Catatan revisi terbaru THERMPYX

Revisi ini dikerjakan pada versi ZIP `thermpyxgsekawan-codex-thermpyx-revisi-musik`, tanpa menimpa checkout repositori versi lama.

## Akun dan navigasi

Form akun dipindah ke dialog modal; beranda tidak lagi memuat blok form/penjelasan akun yang memenuhi halaman. Masuk, buat akun, verifikasi email, kirim ulang kode, lupa kata sandi, dan pemulihan memakai dialog yang sama. Fokus kembali ke tombol pembuka saat dialog ditutup, dan Escape dapat menutupnya. Password tidak ditinggalkan pada form setelah popup ditutup.

Menu bergerak dengan transisi yang sama untuk lebar sidebar, posisi konten, dan topbar. Ikon tiga garis dibentuk dengan CSS, sehingga tidak bergantung pada glyph font. Logo memiliki ukuran tetap ketika menu mengecil. Sidebar ponsel tersembunyi tidak dapat menerima fokus, dan dapat ditutup dengan Escape atau area luar. Pada layar kecil pemilih bahasa tersedia di sidebar agar tombol Masuk tetap terlihat.

Panah dekoratif pada kontrol navigasi dihapus, termasuk kontrol lagu sebelumnya/berikutnya yang kini berupa teks. Panah dalam rumus, diagram, dan arah konversi tetap menjelaskan konsep fisika.

## Pengenalan fitur

Tutorial mengikuti topik halaman dan tersimpan di browser setelah selesai atau dilewati. Tiap simulator menjelaskan kontrol, satuan, dan cara membaca grafik/hasil sesuai modelnya. Panduan dapat diputar ulang; modal mengikuti bahasa, tema terang/gelap, layar ponsel, dan preferensi pengurangan gerakan. Tutorial tidak otomatis muncul pada halaman kuis yang sedang berlangsung dan memberi prioritas pada login/pemulihan akun.

## Latihan dan bank soal guru

Flashcard kini Coming Soon. Editor/impor flashcard tidak dipanggil oleh halaman pengguna; data historis tidak dihapus. SQL dan modul lama tetap tersedia sebagai arsip kompatibilitas, bukan fitur aktif.

Bank soal menyediakan judul/topik, pertanyaan, empat opsi, satu jawaban benar, pembahasan, penggandaan/urutan soal, validasi duplikasi, dan pratinjau dengan kunci tersembunyi secara default. Draf lokal tersimpan otomatis bila browser mengizinkan. Kegagalan penyimpanan perangkat atau cloud ditampilkan dengan jelas. Klik Simpan dan host menyimpan paket ke akun dan membuka Host dengan paket terpilih. Membuat ruang tetap tindakan terpisah agar guru sempat memeriksa soal.

Paket pada room adalah salinan saat ruang dibuat; perubahan pustaka berikutnya tidak mengubah sesi. Host memulai sekali, lalu peserta mengerjakan paket dengan timer masing-masing. Host memantau jawaban tersimpan dan penyelesaian; sesi berakhir ketika semua selesai atau host menutupnya.

## Developer dan perbaikan tambahan

Empat foto asli tampil sebagai kelompok di tengah sebelum bergerak ke posisi pilihan profil. Intro singkat hanya otomatis pada kunjungan pertama dalam sesi, dengan lewati/putar ulang. Intro dibatalkan dengan aman saat layar berubah, pengguna menggulir, atau preferensi reduced motion aktif. Detail keempat profil tetap tersedia.

Kalkulator menangani overflow dan pencampuran massa besar tanpa hasil NaN, serta menolak suhu pencampuran di bawah nol mutlak. Join kuis memiliki pesan inline, guard klik ganda/Enter, dan retry koneksi. Keluar ruang mendukung ID UUID, mengonfirmasi operasi database sebelum membersihkan sesi, serta mengirim peserta ke leaderboard ketika ruang sudah selesai.

## Batas validasi

Validasi UI mencakup login/OTP/pemulihan dengan backend tiruan, soal guru dan snapshot room, tutorial, intro Developer, responsivitas, kalkulator, riwayat, dan masuk/keluar kuis. Pemutaran MP3 sungguhan juga diperiksa saat membuka enam halaman dan menutup panel musik; elemen audio tetap sama dan waktu putar terus bertambah.

Pengujian tersebut tidak mengirim email nyata, membuat akun nyata, atau mengubah database Supabase remote. Authentication, SMTP, multiplayer realtime, dan policy proyek sebenarnya perlu diverifikasi setelah langkah pada PANDUAN-SUPABASE.md selesai. SQL bank soal tidak membuat atau melonggarkan policy multiplayer lama. Kuis menggunakan penilaian browser sehingga belum memenuhi integritas ujian formal.

## Hasil pengujian terakhir

- Login/menu: 15 pemeriksaan browser; tutorial: 34; Developer: 16; Latihan: 10; soal guru: 13.
- SQL guru: 10 pemeriksaan PostgreSQL lokal, meliputi idempotensi, RLS pemilik/lintas akun/anonim, constraints, data/policy lama, serta rollback tipe kolom yang tidak sesuai.
- REV08: 20; konverter: 7; riwayat: 12; i18n: 6; validasi kalkulator baru: 4; join/ruang tunggu baru: 9; suite quiz dan parser dokumen juga lulus.
- Riwayat simulator: 3 alur browser; musik MP3 nyata tetap berjalan melalui enam halaman; token recovery tetap pada fragmen URL.
- 46 berkas JavaScript lolos pemeriksaan sintaks; 119 permintaan halaman/aset lokal berhasil; empat foto dan keenam lagu asli tidak berubah.

Angka tersebut adalah validasi lokal versi ini. Perilaku database produksi, pengiriman email, dan multiplayer lintas perangkat belum dibuktikan oleh tes lokal.
