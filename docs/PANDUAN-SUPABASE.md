# Mengaktifkan soal buatan guru di THERMPYX

Anda bisa menyusun dan melihat pratinjau soal sekarang, tanpa akun. Supabase diperlukan untuk menyimpan bank soal lintas perangkat dan membagikannya dalam kuis langsung. Paket web tidak menjalankan SQL atau mengubah database secara otomatis.

## Mulai dari satu langkah dahulu

Buka [Supabase Dashboard](https://supabase.com/dashboard), masuk, lalu pilih proyek yang sudah digunakan web THERMPYX. Cukup sampai halaman proyek ini terlebih dahulu. Jika Anda ingin dibimbing lewat chat, beri tahu ketika proyek sudah terbuka; tidak perlu mengirim kata sandi atau key rahasia.

Konfigurasi awal dalam `quiz/supabase.js` sudah memiliki URL proyek dan publishable key dari kode asal. Bila Anda menggunakan proyek yang sama, pertahankan keduanya.

## Siapa yang memerlukan akun?

| Kegiatan | Akun THERMPYX |
| --- | --- |
| Membaca teori, kalkulasi, konverter, simulasi, kuis mandiri | Tidak diperlukan |
| Menyusun, menyunting, dan melihat pratinjau draf soal | Tidak diperlukan; tersimpan di browser perangkat ini |
| Menyimpan atau memuat bank soal pribadi di cloud | Diperlukan |
| Menjadi host dengan soal pribadi yang tersimpan | Diperlukan |
| Menjadi host dengan topik bawaan | Formulir web tidak meminta akun; membutuhkan backend kuis yang sudah aktif |
| Siswa bergabung ke ruang kuis | Formulir web hanya meminta kode ruang dan nama panggilan |

Akun untuk masuk ke web berbeda dari akun Dashboard Supabase. Guru dapat membuat akun aplikasi melalui tombol **Sign in / Masuk → Create account / Buat akun**. Formulir terbuka sebagai popup. Jika proyek mengharuskan verifikasi email, guru harus menyelesaikan verifikasi sebelum login berhasil. Pengaturan pengiriman email dijelaskan di [panduan email](EMAIL-THERMPYX.md).

Jika email Anda **sudah terdaftar dan terkonfirmasi** pada proyek kuis live, gunakan akun itu. UID bukan sandi. Jika sandinya belum diketahui atau lupa, pilih **Lupa kata sandi** di web; jangan mendaftar ulang email yang sama untuk meminta kode pendaftaran. Tautan pemulihan yang valid akan membuka formulir sandi baru pada web yang sudah diperbarui.

## Langkah berikutnya setelah proyek terbuka

1. Pilih **SQL Editor**, lalu **New query**.
2. Buka [`supabase/02-teacher-quiz.sql`](../supabase/02-teacher-quiz.sql) dari paket revisi. Salin seluruh isinya ke editor, lalu klik **Run**.
3. Hasil akhir harus menampilkan `tpx_question_sets` dengan `rls_enabled = true`.

Jika hasil ini sudah Anda dapatkan, tahap SQL selesai. Lanjutkan login dan pengujian soal; tidak perlu menjalankan ulang SQL hanya karena ada masalah email.

Script menyiapkan bank soal pribadi dengan akses hanya bagi akun pemilik. Jika tabel `quiz_rooms` sudah ada, script menambahkan kolom `questions` untuk salinan soal ruang. Script dapat dijalankan lagi dan tidak menghapus data atau mengganti policy multiplayer yang sudah ada.

Jika hasilnya menyebut `quiz_rooms belum ada`, bank soal tetap tersedia, tetapi backend multiplayer belum lengkap. ZIP asal tidak menyertakan migrasi lengkap tabel `quiz_rooms`, `quiz_players`, dan `quiz_answers`. Langkah berikutnya adalah memeriksa skema dan policy proyek yang benar-benar ada; jangan menonaktifkan RLS atau membuat akses tulis publik untuk melewati error.

Jika query gagal, kirim teks error tanpa data akun. Semua perubahan script berada dalam satu transaksi sehingga kegagalan sebelum `COMMIT` membatalkan eksekusi itu.

`01-content-library.sql` adalah migrasi lama yang juga menyiapkan flashcard. Revisi ini menggunakan `02-teacher-quiz.sql` untuk fitur bank soal. Flashcard sekarang berstatus **Coming soon**; editor dan impor materi tidak dimuat. Tidak ada tabel atau data flashcard lama yang dihapus.

## Menguji alur guru dan siswa

1. Buka **Latihan → Quiz → Live Quiz → Host Quiz**.
2. Klik **Susun soal saya sendiri**. Beri nama paket, pilih topik, tulis minimal satu pertanyaan, isi empat pilihan berbeda, dan tandai satu jawaban benar. Pembahasan boleh dikosongkan.
3. Draf tersimpan otomatis di browser ini. Tombol **Pratinjau kuis** memperlihatkan tampilan soal; kunci jawaban dapat ditampilkan atau disembunyikan.
4. Klik **Masuk untuk simpan dan host**. Setelah login, klik **Simpan dan host kuis**. Pastikan pesan penyimpanan berhasil muncul; paket disimpan di akun, lalu halaman Host terbuka dengan paket tersebut sudah dipilih. Tombol ini belum membuat room secara otomatis. Untuk percobaan pertama, gunakan paket singkat berisi satu soal milik Anda.
5. Periksa daftar soal, lalu klik **Buat ruang**. Bagikan kode enam digit di ruang tunggu kepada siswa.
6. Di perangkat/browser lain, siswa memilih **Join Quiz**, mengisi kode dan nama panggilan, kemudian menunggu guru memulai.
7. Jalankan sesi, periksa jawaban, kemajuan, dan peringkat akhir.

Room menyimpan salinan soal saat dibuat. Menyunting bank soal sesudahnya tidak mengubah sesi yang sedang berjalan.

Untuk memastikan paket benar-benar tersimpan di cloud, muat ulang halaman lalu pilih **Muat ulang paket** pada Host dengan akun yang sama. Periksa judul dan isi paket. Draf yang masih terlihat di editor saja belum membuktikan penyimpanan cloud, karena editor juga memiliki salinan lokal. Bila ingin memeriksa lewat Dashboard, buka **Table Editor → tpx_question_sets** dan periksa paket uji Anda tanpa mengubah data lain.

Untuk memeriksa akses bank soal, gunakan dua akun aplikasi: akun A harus dapat menyimpan dan memuat soalnya; akun B dan pengguna yang sudah keluar tidak boleh membaca, mengubah, atau menghapus paket pribadi A. Tampilan Dashboard menggunakan hak admin sehingga bukan bukti pengujian RLS pengguna.

## Sambungan dan konfigurasi akun

Jika proyek yang digunakan berbeda, buka **Connect** atau **Project Settings → API** untuk mengambil Project URL dan publishable key/anon key. Masukkan hanya konfigurasi browser itu ke `quiz/supabase.js`. `service_role`, `sb_secret_...`, password database, dan token Dashboard tidak boleh dimasukkan ke kode browser.

Aktifkan provider Email di **Authentication → Sign In / Providers → Email**. Untuk akun uji yang dibuat sendiri dari Dashboard, gunakan **Authentication → Users → Add user → Create new user**; simpan password Anda sendiri dan gunakan Auto Confirm User bila tersedia.

Gunakan HTTP/HTTPS saat menjalankan web, misalnya Live Server. Jangan membuka `index.html` dengan `file://`. Di **Authentication → URL Configuration**, atur Site URL sesuai alamat hosting dan tambahkan Redirect URLs yang benar-benar digunakan, termasuk `index.html` dan `index.html?account=recovery`, tanpa `#account`. Sertakan subfolder bila web berada dalam subfolder. Untuk situs sekarang, lihat dua alamat lengkap pada [panduan email](EMAIL-THERMPYX.md#4-atur-tautan-pemulihan). Jika alamat lama dengan `#account` sudah disimpan, cukup tambahkan dua alamat baru; Site URL tetap sama.

## Batas yang perlu diketahui

Validasi antarmuka dan pengujian dengan backend tiruan tidak membuktikan multiplayer Supabase aktif. Setelah SQL dan akun tersedia, pengujian guru–siswa di atas masih perlu dijalankan pada proyek nyata. Fitur realtime juga bergantung pada skema, publication, dan policy multiplayer proyek yang sudah ada.

Kuis ini dirancang untuk latihan kelas. Versi asal memeriksa jawaban di browser dan menyimpan kunci pada salinan soal room, sehingga peserta dengan akses teknis ke room dapat melihat kunci. Ujian yang membutuhkan kerahasiaan jawaban dan pencegahan kecurangan memerlukan penilaian serta kontrol host di backend terpisah.

## Jika terjadi masalah

| Gejala | Pemeriksaan |
| --- | --- |
| Bank soal belum ditemukan | Jalankan `02-teacher-quiz.sql` pada proyek yang sama dengan URL web. |
| Login gagal | Akun aplikasi, email terverifikasi, password, dan provider Email. |
| Kode pendaftaran tidak datang | Jika email sudah terkonfirmasi, gunakan Masuk/Lupa kata sandi. Untuk email baru, periksa template Confirm signup, penerima yang diizinkan, kuota, dan SMTP pada [panduan email](EMAIL-THERMPYX.md). |
| Tautan reset hanya membuka beranda | Pastikan versi web perbaikan sudah terbit, URL pemulihan sudah diizinkan, template Reset password tetap memakai `{{ .ConfirmationURL }}`, lalu minta satu email pemulihan baru. |
| Simpan ditolak | Pastikan sudah login sebagai pemilik; periksa policy RLS tanpa mematikannya. |
| Paket tidak muncul di Host | Simpan ke cloud, gunakan akun yang sama, lalu klik Muat ulang paket. |
| Soal belum bisa disimpan | Isi nama paket, empat pilihan berbeda, dan satu jawaban benar; maksimal 100 pertanyaan. |
| Host gagal meski bank soal berhasil | Periksa tabel dan policy multiplayer lama serta kolom `quiz_rooms.questions`. |
| Koneksi tidak tersedia | Periksa koneksi, URL proyek, dan akses ke domain proyek `.supabase.co` serta CDN Supabase. |
| Penyimpanan browser penuh/diblokir | Jangan tutup editor sebelum menyimpan ke akun; status editor menjelaskan apakah salinan perangkat tersedia. |
