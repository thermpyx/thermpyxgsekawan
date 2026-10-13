# Email verifikasi dari THERMPYX

Web menyediakan pendaftaran, formulir kode verifikasi, kirim ulang kode, serta pemulihan kata sandi. Supabase Auth mengelola akun. Nama dan alamat pengirim email diatur di Dashboard; perubahan kode web saja tidak dapat mengganti alamat pengirim.

## 1. Aktifkan konfirmasi email

1. Buka proyek yang sama di Supabase Dashboard.
2. Buka **Authentication → Sign In / Providers → Email** (pada versi lain: **Providers → Email**).
3. Aktifkan provider Email dan **Confirm email**. Pendaftaran baru akan meminta konfirmasi. Akun yang sebelumnya sudah dikonfirmasi tetap bisa masuk.

Jika Confirm email dimatikan, Supabase langsung memberi sesi saat mendaftar dan web langsung masuk tanpa meminta kode. Tidak perlu menghapus akun lama.

## 2. Pakai template kode THERMPYX

1. Buka **Authentication → Email / Email Templates → Confirm signup**.
2. Isi subjek **Kode verifikasi akun THERMPYX**.
3. Salin isi [`supabase/confirm-signup-email.html`](../supabase/confirm-signup-email.html) ke badan template, lalu simpan.
4. Pertahankan `{{ .Token }}`: Supabase menggantinya dengan kode nyata. Jangan mengetik kode tetap. Web memakai `verifyOtp` dengan tipe `signup` dan `resend` untuk kode pendaftaran.

Template ini mengirim kode yang dimasukkan di web. Email pemulihan kata sandi tetap menggunakan tautan: jangan mengganti `{{ .ConfirmationURL }}` pada template **Reset password** dengan token pendaftaran.

## 3. Atur nama dan alamat pengirim

Agar kolom **From** menampilkan THERMPYX dengan alamat milik Anda, gunakan pengirim SMTP yang sudah terverifikasi. Anda bisa memakai layanan email/domain atau penyedia SMTP yang Anda miliki.

1. Siapkan alamat pengirim, misalnya `akun@domain-anda`, di penyedia email. Jika diminta, tambahkan DNS verifikasi domain, SPF, dan DKIM sesuai petunjuk penyedia; tunggu sampai domain terverifikasi.
2. Di Supabase buka **Project Settings → Authentication → SMTP Settings**, atau **Authentication → Email → SMTP Settings**, sesuai tampilan Dashboard.
3. Aktifkan **Custom SMTP**.
4. Isi **Sender name** = `THERMPYX` dan **Sender email** = alamat pengirim terverifikasi.
5. Isi host, port, username, serta password SMTP sesuai penyedia. Simpan hanya di Dashboard.
6. Simpan pengaturan dan lakukan uji pendaftaran dengan alamat email milik Anda.

Tanpa custom SMTP, template dapat memakai identitas THERMPYX tetapi layanan email bawaan Supabase tetap memiliki alamat pengirim serta pembatasan penerima/pengiriman. Nama pengirim saja tidak menjamin bahwa email dapat dikirim ke semua pengguna. Jangan memasukkan password SMTP atau secret key ke JavaScript maupun GitHub.

## 4. Atur tautan pemulihan

Pada **Authentication → URL Configuration**:

- Isi **Site URL** dengan alamat hosting HTTPS web Anda.
- Tambahkan callback yang persis digunakan web pada **Redirect URLs**: `https://alamat-web-anda/index.html#account` dan `https://alamat-web-anda/index.html?account=recovery#account`. Jika web berada dalam subfolder, sertakan subfolder tersebut pada kedua URL. Site URL tetap menggunakan alamat utama web tanpa parameter pemulihan.
- Pendaftaran dengan kode tidak memerlukan pengguna berpindah lewat tautan email. Pemulihan kata sandi menggunakan alamat web tersebut dan alur akun di beranda.

Sesuaikan daftar redirect dengan URL yang benar-benar dipakai; jangan menambahkan wildcard luas untuk mengatasi error.

## 5. Uji alur nyata

1. Di beranda pilih **Buat akun**; gunakan email yang dapat Anda buka.
2. Periksa email, termasuk folder spam. Kolom pengirim harus menampilkan THERMPYX/alamat Anda setelah SMTP aktif.
3. Masukkan kode di web. Setelah berhasil, status akun menjadi terhubung.
4. Buka Latihan → Quiz → Bank Soal, simpan satu paket ke akun, lalu muat ulang.
5. Keluar dan coba masuk kembali. Jika diperlukan, uji **Lupa kata sandi** dan tautan pemulihan.

Jika email tidak terkirim, periksa **Authentication → Logs**, batas pengiriman, konfigurasi SMTP, serta status verifikasi domain. Kode salah/kedaluwarsa dapat dikirim ulang melalui web. Keberhasilan uji dengan backend tiruan tidak membuktikan SMTP proyek Anda sudah aktif.

Untuk Live Server, gunakan alamat lokal yang benar-benar tampil di browser. Contoh jika proyek disajikan langsung di port 5500: Site URL `http://127.0.0.1:5500`, Redirect URLs `http://127.0.0.1:5500/index.html#account` dan `http://127.0.0.1:5500/index.html?account=recovery#account`. `localhost` dan `127.0.0.1` adalah alamat berbeda; gunakan host yang sama dengan browser.
