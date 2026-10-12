# Hubungkan bank soal dan flashcard ke Supabase

Kode web dan SQL tambahan sudah disiapkan. Database Supabase Anda **belum diubah** oleh revisi ini. Ikuti satu tahap dahulu; kita bisa melanjutkan dari layar yang sedang Anda buka.

## 1. Buka proyek yang sudah dipakai web

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan masuk.
2. Pilih organisasi, lalu klik proyek milik web THERMPYX.
3. Jika web sebelumnya sudah menggunakan Supabase, gunakan proyek itu. URL dan key publik pada `quiz/supabase.js` sudah tersedia dalam versi asal; tidak perlu menggantinya apabila proyeknya sama.

Langkah pertama saat melanjutkan bersama: cukup sampai di halaman proyek tersebut. Jangan kirim kata sandi atau key rahasia melalui chat.

## 2. Jalankan SQL tambahan

1. Di menu kiri proyek, klik **SQL Editor**.
2. Klik **New query** (atau tombol **+** untuk membuka kueri baru).
3. Buka berkas [`supabase/01-content-library.sql`](../supabase/01-content-library.sql) dari paket revisi.
4. Salin **seluruh isi berkas** ke editor Supabase.
5. Klik **Run**. Tunggu hasil kueri.

Hasil akhir menampilkan `tpx_question_sets` dan `tpx_flashcard_decks`, masing-masing dengan `rls_enabled = true`. Anda juga bisa membuka **Table Editor** untuk melihat kedua tabel.

SQL ini boleh dijalankan kembali. Ia membuat tabel konten tambahan, validasi data, dan akses berdasarkan pemilik akun. Jika tabel lama `quiz_rooms` ada, SQL menambahkan kolom opsional `questions` untuk salinan soal dalam ruang. SQL tidak mengganti tabel, data, atau policy multiplayer lama.

Jika muncul pesan `quiz_rooms belum ada`, bank soal dan flashcard tetap dibuat, tetapi multiplayer membutuhkan skema lama proyek Anda. ZIP asal tidak menyediakan migrasi lengkap `quiz_rooms`, `quiz_players`, dan `quiz_answers`; kita perlu memeriksa tabel dan policy yang benar-benar ada sebelum melanjutkan fitur host. Jangan membuat policy akses bebas atau menonaktifkan RLS untuk menghilangkan error.

Jika muncul error, berhenti pada tahap ini dan kirim **teks error**, tanpa data akun. Script dibungkus transaksi sehingga kegagalan sebelum `COMMIT` membatalkan perubahan dari eksekusi tersebut. Jangan menjalankan potongan SQL acak untuk memperbaikinya.

## 3. Siapkan akun pembuat konten

Gunakan akun pengguna aplikasi yang sudah ada jika Anda memilikinya. Akun untuk masuk ke web berbeda dari akun untuk masuk ke Dashboard Supabase.

Jika belum ada akun aplikasi:

1. Klik **Authentication** di menu kiri, lalu **Users**.
2. Klik **Add user**, lalu pilih **Create new user**.
3. Isi email Anda dan kata sandi yang akan digunakan untuk masuk ke web.
4. Jika dialog menyediakan **Auto Confirm User**, aktifkan agar akun manual ini bisa langsung masuk.
5. Klik **Create user**.

Anda tidak perlu memilih **Invite user** atau mengirim undangan email untuk langkah ini. Jangan bagikan kata sandi tersebut di chat. Bila login email belum diaktifkan, periksa **Authentication → Sign In / Providers → Email** dan aktifkan penyedia Email. Nama bagian dapat sedikit berbeda mengikuti pembaruan Dashboard.

## 4. Periksa sambungan web

Lewati perubahan ini jika file `quiz/supabase.js` sudah menunjuk ke proyek yang dipilih pada tahap 1.

Jika Anda memakai proyek lain:

1. Di proyek Supabase, buka **Connect** untuk melihat URL proyek dan browser key; keduanya juga tersedia di **Project Settings → Data API / API** dan **API Keys**, sesuai tampilan Dashboard.
2. Salin **Project URL** ke `SUPABASE_URL` dalam `quiz/supabase.js`.
3. Salin **publishable key** (`sb_publishable_...`) atau **anon key** lama ke `SUPABASE_KEY`.
4. Simpan file, lalu muat ulang web.

**Jangan gunakan `service_role`, `sb_secret_...`, kata sandi database, atau access token Dashboard dalam kode browser.** Browser key boleh dipakai di frontend; keamanan penulisan konten berasal dari login pengguna dan RLS dalam SQL tadi.

Tidak perlu membuat Storage bucket untuk impor flashcard: web membaca dokumen di browser lalu menyimpan judul, isi kartu, serta metadata nama/jenis sumber. PDF/DOCX asli tidak diunggah ke database.

## 5. Uji bank soal

1. Buka bagian **Latihan** pada web, lalu fitur **Bank Soal**.
2. Klik **Akun cloud**, lalu isi email/kata sandi dan klik **Masuk** menggunakan akun aplikasi dari tahap 3.
3. Buat judul paket dan topik. Tambahkan minimal satu soal, empat pilihan jawaban, serta satu jawaban benar. Pembahasan bersifat opsional.
4. Draf soal tersimpan otomatis di browser. Setelah masuk, klik **Simpan ke cloud** untuk menyimpan paket ke akun.
5. Muat ulang halaman dan buka paket yang disimpan ke cloud. Pastikan soal dan pilihan jawaban kembali dengan benar.
6. Buka halaman **Host**, lalu pilih paket soal milik Anda untuk membuat ruang. Soal disalin ke ruang sehingga perubahan paket setelah itu tidak mengubah sesi berjalan.

Bank soal cloud bersifat pribadi untuk akun pemilik. Setelah dipakai dalam ruang kuis, salinan soal mengikuti akses tabel `quiz_rooms` yang sudah ada. Akun yang bisa membaca suatu ruang dapat membaca salinan soal ruang itu; format kuis web juga memuat jawaban benar untuk pemeriksaan di browser.

Validasi multiplayer berikutnya dilakukan setelah skema lama dan akses proyek dipastikan: buat ruang dari host, masuk sebagai peserta di browser lain, jawab soal kustom, lalu periksa progres dan papan peringkat. Berhasil menyimpan bank soal saja belum membuktikan seluruh alur multiplayer berhasil.

## 6. Uji flashcard dan impor dokumen

1. Buka **Latihan → Flashcard**.
2. Klik **Susun materi baru**, lalu isi judul dan topik. Anda dapat menulis kartu langsung atau membuka **Impor materi dari PDF / DOCX → Pilih dokumen**.
3. Tunggu teks muncul dalam **Pratinjau teks / tempel materi**, lalu klik **Buat draf kartu dari teks**. Hasilnya adalah **draf yang dapat diedit**: periksa pasangan bagian depan dan belakang setiap kartu sebelum menyimpan.
4. Klik **Simpan materi** untuk menyimpan lokal. Untuk menyimpan ke cloud, masuk melalui **Akun cloud**, centang **Simpan ke akun Supabase**, lalu klik **Simpan materi**. Centang **Izinkan pengguna lain membaca materi** hanya jika deck memang ingin dipublikasikan.
5. Muat ulang halaman, buka deck, lalu coba membalik dan berpindah kartu.

Dokumen maksimal 8 MB; PDF maksimal 32 halaman. PDF perlu memiliki teks yang bisa diseleksi. PDF hasil foto/pemindaian tanpa teks membutuhkan OCR terlebih dahulu; OCR belum tersedia dalam revisi ini. DOCX didukung; format `.doc` lama perlu disimpan ulang sebagai `.docx`. Tabel, rumus, gambar, dan susunan beberapa kolom mungkin tidak mengikuti tata letak dokumen asal karena yang dibaca adalah teksnya.

Deck cloud menggunakan `is_public = false` sebagai nilai awal. Deck yang sengaja dipublikasikan dapat dibaca tanpa login; hanya pemilik yang dapat mengubah atau menghapusnya. Paket soal tidak memiliki akses baca publik.

## 7. Periksa akses dengan dua akun

Untuk memastikan sambungan dan RLS sudah benar, lakukan pemeriksaan berikut setelah konfigurasi selesai:

- Akun A bisa menyimpan dan memuat kembali paket soal serta deck miliknya.
- Setelah keluar, paket soal dan deck pribadi A tidak dapat dimuat dari cloud.
- Akun B tidak dapat membaca, mengubah, atau menghapus konten pribadi A, termasuk bila mengetahui ID-nya.
- Deck yang dibuat publik dapat dibaca tanpa login, tetapi tidak dapat diubah oleh akun B.

Tabel pada Dashboard dapat terlihat oleh pemilik proyek karena Dashboard menggunakan hak admin. Gunakan akun web/API pengguna untuk membuktikan pembatasan RLS; tampilan Table Editor saja bukan pengujian pembatasan pengguna.

## Jika ada masalah

| Gejala | Yang diperiksa |
| --- | --- |
| Tabel `tpx_question_sets`/`tpx_flashcard_decks` tidak ditemukan | Jalankan tahap 2 di proyek yang sesuai dengan URL web. |
| Login ditolak | Email/kata sandi akun aplikasi, konfirmasi akun, dan penyedia Email. |
| Simpan ditolak RLS | Pastikan login berhasil. `owner_id` memakai ID pengguna aktif; jangan mengisi ID akun lain. |
| Data ditolak constraint | Isi judul, topik, soal/kartu; setiap soal memiliki empat pilihan dan indeks jawaban 0–3. Paket maksimal 100 soal, deck maksimal 100 kartu. |
| Host masih gagal, pustaka berhasil | Periksa skema dan RLS tabel multiplayer lama. SQL tambahan ini tidak memperluas aksesnya. |
| Impor PDF kosong | Coba seleksi teks pada PDF. Dokumen hasil scan membutuhkan OCR. |
| Koneksi gagal dari lingkungan cloud | Pastikan domain proyek `.supabase.co` dan domain CDN yang diperlukan web diizinkan. Uji ulang setelah pengaturan jaringan diterapkan; pesan gagal koneksi tidak membuktikan key salah. |

## Penghapusan tambahan jika nanti diperlukan

Tidak ada penghapusan otomatis. Jika Anda ingin membatalkan fitur cloud, ekspor dahulu isi dua tabel baru melalui Dashboard. Menghapus tabel akan menghapus seluruh paket/deck di dalamnya.

Objek tambahan revisi ini adalah `tpx_question_sets`, `tpx_flashcard_decks`, fungsi `tpx_questions_valid`/`tpx_cards_valid`, serta constraint `tpx_quiz_rooms_questions_valid` dan kolom `quiz_rooms.questions`. Hapus hanya setelah memastikan tidak dipakai aplikasi. Jangan menghapus `quiz_rooms`, `quiz_players`, `quiz_answers`, pengguna Authentication, atau policy lama. Jika kolom `questions` sudah ada sebelum menjalankan script, pertahankan kolom tersebut.

Bila pembatalan benar-benar diperlukan, kita dapat menyiapkan kueri penghapusan terbatas setelah melihat objek mana yang sebelumnya sudah ada; panduan ini sengaja tidak mengeksekusi penghapusan data.
