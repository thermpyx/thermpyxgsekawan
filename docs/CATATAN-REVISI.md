# Catatan revisi THERMPYX

Web menggunakan HTML, CSS, dan JavaScript statis, dengan navigasi aplikasi yang menjaga pemutar musik tetap hidup. Paket memuat kode web, panduan, dan SQL yang dijalankan melalui Dashboard Supabase.

## Perubahan yang diminta

- Pilihan satuan dan menu pilihan mengikuti tampilan web, menggunakan sudut melengkung, warna sesuai tema, serta navigasi keyboard.
- Panel musik menyediakan enam lagu bawaan bernomor 01–06, file audio pilihan sendiri, ambiens, dan opsi link YouTube. Nama lagu tidak ditampilkan. Menutup panel pengaturan tidak memanggil pause; kontrol putar/jeda terpisah dari visibilitas panel.
- Ikon latihan diganti dengan bentuk yang berkaitan dengan kegiatan belajar, sesuai visual THERMPYX.
- Bank soal menyediakan paket soal yang dapat dipilih untuk host. Salinan soal tersimpan pada ruang sehingga sesi menggunakan soal yang konsisten.
- Flashcard menyediakan editor kartu dan impor PDF/DOCX menjadi draf yang dapat diperiksa sebelum disimpan.
- SQL tambahan dan [panduan Supabase bertahap](PANDUAN-SUPABASE.md) disertakan untuk penyimpanan konten dengan akun pengguna.

## Akun, Latihan, bahasa, dan riwayat

Beranda memiliki tombol Masuk/Buat akun serta penjelasan manfaat akun. Formulir yang sama tersedia di bank soal dan flashcard, mendukung pendaftaran, ulang kata sandi, verifikasi kode email, kirim ulang kode, keluar, serta pemulihan kata sandi. Sesi akun dipulihkan ketika berpindah halaman atau memuat ulang. Penyimpanan koleksi cloud memerlukan akun aplikasi; draf lokal, impor dokumen, dan alat belajar dapat dipakai tanpa masuk.

Kode email memakai Supabase Auth. Template THERMPYX ada di `supabase/confirm-signup-email.html`; pengirim email milik THERMPYX membutuhkan konfigurasi SMTP serta alamat pengirim yang terverifikasi. Pengiriman nyata belum dibuktikan oleh pengujian backend tiruan. Panduan ada di [EMAIL-THERMPYX.md](EMAIL-THERMPYX.md).

Beranda menyediakan satu tombol Mulai Latihan. Di dalamnya pengguna memilih Quiz atau Flashcard. Terjemahan ID/EN mencakup teks, atribut aksesibilitas, materi contoh, status, dan kontrol dinamis. Rumus dan tulisan pengguna dipertahankan. Wordmark memakai X judul utama, dengan ikon simulator piston/sensor yang digambar khusus.

Riwayat menyimpan maksimal 50 hasil kalkulasi, kuis, simulasi yang benar-benar selesai, serta sesi flashcard setelah seluruh kartu ditinjau. Navigasi, video, slider, mulai/jeda/reset tidak dicatat. Hasil identik dalam satu menit digabung, dan daftar hanya dirender ketika terlihat.

## Musik tanpa YouTube

Keenam audio lolos pemeriksaan codec dan dekode penuh tanpa galat. Pemutaran keenam lagu bawaan juga diuji langsung di browser, termasuk pergantian nomor, lanjut ke lagu berikutnya, dan pemulihan pilihan setelah muat ulang tanpa autoplay.

Keenam berkas yang diberikan sudah disertakan sebagai `assets/music/01.mp3` hingga `06.mp3`, sesuai urutan lampiran. Audio asli berformat MP3 meskipun ekstensi lampirannya `.mpeg`; hanya nama/ekstensi berkas yang disesuaikan, tanpa konversi atau perubahan kualitas. Daftar lagu dan indikator pemutaran hanya memakai nomor 01–06. Lagu bawaan diputar langsung dari situs tanpa YouTube atau Supabase. Tekan Putar untuk mulai; pemutaran tidak berjalan otomatis saat membuka halaman.

Pemilih file audio sendiri tetap tersedia. File hingga 50 MB disimpan di IndexedDB browser dan dipulihkan setelah muat ulang; tekan Putar lagi untuk mendengar. Nama file yang dipilih tidak ditampilkan pada panel. Jika penyimpanan browser gagal, file hanya tersedia pada halaman yang sedang terbuka.

Opsi link YouTube tetap tersedia. Browser membutuhkan tindakan pengguna untuk memulai audio; beberapa video tidak mengizinkan pemutaran melalui embed. Menutup panel pengaturan atau berpindah ke halaman lain di dalam situs tidak menghentikan musik. Pemutar ditempatkan pada halaman aplikasi yang tetap hidup, sementara halaman Teori, Simulator, Kalkulator, dan Konverter berganti di dalamnya. Muat ulang seluruh aplikasi atau membuka tab baru membuat sesi browser baru dan memerlukan tombol Putar lagi.

## Halaman kalkulator dan konverter

Perhitungan dan konversi tidak lagi memenuhi beranda dengan formulir. Keduanya memiliki kartu pembuka seperti Simulator. Halaman Kalkulator memuat seluruh tujuh modul yang telah tersedia. Unit Converter memuat suhu, tekanan, volume, energi, daya, massa, panjang, luas, dan waktu, dengan pilihan dua satuan, tukar arah, serta hasil dan validasi input.

Gradasi teal/cyan dan amber ditambahkan hanya pada beberapa kartu pilihan. Latar halaman, input, dan kartu lain tetap menggunakan permukaan biasa sehingga tampilan tidak monoton tanpa membuat seluruh web bergradasi.

## Impor dokumen

PDF yang memiliki teks dan DOCX dapat dibaca di browser. Teks dijadikan draf kartu, bukan ringkasan AI atau hasil yang otomatis dijamin benar. Periksa isi serta pasangan depan/belakang sebelum menyimpan. PDF hasil scan membutuhkan OCR yang belum termasuk. Gambar, formula, dan tata letak dokumen tidak diubah menjadi kartu gambar.

PDF/DOCX asli tidak diunggah ke Supabase. Hanya data kartu dan metadata sumber yang disimpan; Storage bucket tidak diperlukan. Draf lokal memungkinkan mencoba editor sebelum konfigurasi cloud selesai.

## Supabase dan multiplayer

Migrasi `supabase/01-content-library.sql` menambahkan tabel pustaka soal dan flashcard. RLS membatasi penulisan kepada pemilik akun; deck dapat dibaca publik hanya jika `is_public` bernilai `true`. Akses menulis anonim tidak diberikan.

Paket tidak mengubah database remote secara otomatis. SQL perlu dijalankan melalui Dashboard Supabase. URL dan browser key yang sudah ada dapat dipakai kembali bila Anda memilih proyek yang sama. Jangan menaruh key `service_role` atau `sb_secret_...` pada frontend.

Skema dan policy database multiplayer lama tidak tersedia lengkap pada sumber ZIP. SQL hanya menambahkan kolom opsional soal pada `quiz_rooms` bila tabel itu sudah ada; policy lama tidak diperluas atau dimatikan. Alur cloud dan multiplayer perlu diuji pada proyek nyata setelah Anda menjalankan SQL dan masuk dengan akun aplikasi.

Paket soal cloud bersifat pribadi sebelum digunakan dalam ruang. Salinan soal di ruang mengikuti hak baca ruang yang sudah ada dan menyertakan jawaban benar sesuai cara penilaian kuis di browser.

## Validasi SQL

Migrasi dijalankan pada PostgreSQL lokal melalui PGlite dengan role dan fungsi autentikasi simulasi. **48 pemeriksaan lulus**: eksekusi ulang, proyek dengan/tanpa tabel ruang lama, payload tidak valid, akses pemilik, penolakan akses lintas akun/anonim, akses baca deck publik, serta policy ruang lama yang tetap identik.

Pengujian lokal ini memeriksa perilaku SQL dan RLS; ia tidak membuktikan konfigurasi Authentication, koneksi, atau policy multiplayer pada proyek Supabase Anda. Pengujian remote dilakukan setelah tahap panduan selesai.

## Validasi web

Suite lama lulus: 20/20 pemeriksaan kalkulator, simulator, dan riwayat; seluruh lima grup kuis juga lulus. Empat tes impor dokumen lulus, termasuk ekstraksi DOCX sungguhan. Browser menguji PDF dua halaman melalui worker PDF.js, DOCX, edit dan penyimpanan lokal, kartu bolak-balik, musik dari WAV, penutupan panel tanpa berhenti, dropdown dan pergantian bahasa, serta tampilan mobile.

Alur cloud diuji dengan backend simulasi: login/penggantian akun, simpan/update/hapus konten, klik ganda, snapshot soal kustom, jumlah soal pemain, dan penyelesaian host. Ini bukan bukti sambungan Supabase remote. API YouTube sebenarnya diblokir proxy di lingkungan uji; kontrak player dan pesan kegagalan diuji secara terpisah.

Untuk revisi halaman terhubung, pemutaran MP3 nyata diuji saat membuka Teori, Simulator, Kalkulator, Konverter, dan memakai Kembali/Maju browser. Elemen audio tetap sama, waktunya terus bertambah, dan tidak ada jeda atau pemuatan ulang audio pada perpindahan tersebut. Tujuh kalkulator, sembilan kategori konverter, bahasa, tema, tampilan mobile, serta impor PDF/DOCX di dalam aplikasi juga diperiksa. Tujuh tes numerik konverter memeriksa definisi satuan, seluruh pasangan satuan, batas suhu, dan input tidak valid.

Pemeriksaan revisi akun memakai backend Auth tiruan, sehingga tidak mengirim email atau mengubah pengguna nyata. Pengujian browser juga memastikan token pemulihan tetap berada dalam fragmen URL, bukan parameter HTTP, selama navigasi aplikasi. Sambungan proyek, kebijakan multiplayer lama, dan SMTP tetap diuji di proyek nyata oleh pemilik.
