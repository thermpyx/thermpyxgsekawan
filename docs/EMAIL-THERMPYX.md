# Masukan langsung dari web / Direct website feedback

Form **Masukan / Feedback** pada navigasi beranda sekarang mengirim pesan langsung ke Firebase Realtime Database. Pengunjung tidak perlu membuka aplikasi email atau masuk dengan Google. Jika belum masuk, aplikasi memakai identitas Firebase Anonymous yang sudah tersedia. Nama opsional, pesan maksimal 2.000 karakter; draf tetap berada dalam formulir saat popup ditutup, bahasa diganti atau permintaan gagal.

The homepage **Feedback** popup now submits directly to Firebase Realtime Database. Visitors do not need an email application or Google login. An existing Google identity or Firebase Anonymous Authentication is used. The name is optional and messages are limited to 2,000 characters. Closing the popup, changing languages or retrying a failed request keeps the local form draft.

## Aktivasi satu kali / One-time activation

1. Buka proyek Firebase **thermpyx** yang sama, lalu **Build → Realtime Database → Rules**.
2. Salin seluruh isi [`firebase/database.rules.json`](../firebase/database.rules.json) dari branch `codex/simulator-visual-refinement`, periksa, lalu **Publish**. Berkas ini mempertahankan aturan akun, bank soal, kuis dan flashcard; hanya jalur `feedback` yang ditambahkan. Jangan mengganti dengan aturan baca/tulis publik.
3. Buka web versi terbaru dan gunakan **Masukan → Kirim masukan** untuk pesan sungguhan ketika diperlukan. Status sukses hanya muncul setelah server mengonfirmasi rekaman. Pengujian pengembangan tidak mengirim masukan ke produksi.
4. Sebagai administrator proyek, buka tab **Data → feedback → UID pengirim → ID masukan** untuk melihat `name`, `category`, `message`, `language`, `page` dan `submitted_at` (waktu server dalam milidetik Unix). Pesan tidak dikirim ke Gmail dan tidak dibuka untuk pengguna lain.

Open the existing **thermpyx** project in **Firebase Console → Build → Realtime Database → Rules**. Replace the Rules with the complete version linked above and choose **Publish**. Deploying GitHub Pages alone does not publish database Rules. Administrators read submissions under **Data → feedback → sender UID → submission ID**. No frontend secret, email service or public database access is needed.

## Jika muncul “The connection failed” saat mengirim

Versi sebelum perbaikan diagnostik dapat menampilkan pesan koneksi ketika Firebase sebenarnya menolak pembacaan awal record masukan. Firebase SDK dapat mengembalikan `Error("Permission denied")` tanpa properti `code`. Situs sekarang mengenali bentuk galat ini dan menampilkan penolakan akses, bukan menyebutnya sebagai kegagalan jaringan.

Jika Rules `feedback` belum dipublikasikan, lakukan aktivasi di atas pada database proyek `thermpyx` yang benar, lalu tekan **Kirim masukan** lagi. Tidak perlu mengubah atau menghapus draf. Jika Rules sudah dipublikasikan, cocokkan isi aktifnya dengan berkas lengkap pada cabang publik; penolakan akses juga dapat berarti akun tidak memenuhi aturan. Pesan jaringan yang tetap muncul perlu diperiksa sebagai kegagalan koneksi/SDK/autentikasi, sehingga tidak boleh langsung disimpulkan sebagai Rules yang belum dipublikasikan.

The earlier generic connection message could hide a code-less Realtime Database read-denial error. This error shape was reproduced using the real Firebase 13 SDK against an isolated official database emulator. The updated site distinguishes this access denial from a network failure and keeps the draft available for retry. Publishing the feedback Rules is still a separate prerequisite; the diagnostic fix does not publish Rules or prove successful production delivery.

## Batas dan kegagalan / Limits and errors

- Sebelum Rules baru dipublikasikan, pengiriman ditolak; formulir menampilkan kesalahan dan mempertahankan draf. / Until the new Rules are published, submissions fail visibly and drafts are preserved.
- Setiap pesan memakai ID tetap saat dicoba ulang; rekaman bersifat **create-only**. Pengirim hanya dapat membaca rekaman miliknya untuk konfirmasi, bukan daftar masukan orang lain. / Retrying uses the same ID; records are create-only and sender-readable for confirmation.
- URL halaman tidak mencakup parameter atau fragment. Jangan sertakan kata sandi maupun data sensitif dalam pesan. / Page context excludes query strings and fragments; do not include passwords or sensitive data.
- Aturan ukuran dan kepemilikan melindungi data, tetapi ini bukan sistem moderasi atau pembatasan spam tingkat server. / Field limits and ownership checks are enforced; dedicated server-side moderation or rate limiting is not included.

---

## Arsip: email autentikasi Supabase

Panduan di bawah bersifat historis dan bukan alur masukan aktif.

> **Arsip email Supabase.** Versi aktif menggunakan Google melalui Firebase dan tidak memakai kode/reset email ini. Ikuti [panduan Firebase](PANDUAN-FIREBASE.md); panduan lama berikut dipertahankan untuk riwayat.

# Email verifikasi dari THERMPYX

Web menyediakan pendaftaran, formulir kode verifikasi, kirim ulang kode, serta pemulihan kata sandi. Supabase Auth mengelola akun. Nama dan alamat pengirim email diatur di Dashboard; perubahan kode web saja tidak dapat mengganti alamat pengirim atau memastikan email diterima.

## Mulai dengan akun yang tepat

Gunakan proyek Supabase yang sudah dipakai kuis live. Tidak perlu membuat proyek baru, menghapus pengguna lama, atau mengganti key untuk mengatur sandi.

1. Buka **Authentication → Users** dan periksa email Anda.
2. Jika akun sudah terkonfirmasi, gunakan **Masuk**. Jika lupa/belum tahu sandinya, gunakan **Lupa kata sandi**. **UID bukan kata sandi**, dan sandi lama tidak dapat dilihat di Dashboard.
3. **Buat akun** dan **Kirim ulang kode** digunakan untuk pendaftaran yang belum dikonfirmasi. Keduanya bukan cara mengatur sandi akun lama yang sudah terkonfirmasi. Mendaftarkan ulang email lama dapat menghasilkan jawaban umum dari Supabase tanpa mengirim email konfirmasi baru, untuk melindungi informasi keberadaan akun.
4. Untuk menguji pendaftaran baru, gunakan alamat email lain milik Anda yang belum terdaftar serta memenuhi pengaturan penerima email proyek di bawah.

Jangan mengirim password, kode sekali pakai, atau tautan pemulihan ke chat/GitHub. Pesan bahwa permintaan diterima tidak membuktikan email sudah tiba.

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
5. Pertahankan juga `{{ .ConfirmationURL }}` pada tombol konfirmasi. Template menyediakan kode **dan** tautan sebagai dua pilihan untuk konfirmasi yang sama; cukup gunakan salah satunya. Setelah meminta kirim ulang, gunakan email yang terbaru.

Mengubah berkas HTML di GitHub tidak otomatis mengubah template email proyek Supabase. Salin template ke Dashboard dan simpan. Jika template **Confirm signup** bawaan Anda hanya mempunyai tautan, pengguna dapat mengkliknya; email tersebut memang tidak menampilkan angka untuk disalin ke kolom kode.

Jika tab **Source**, subjek, atau Body tidak dapat diedit dan terlihat **Set up custom SMTP to edit templates**, proyek sedang memakai pembatasan template bawaan. [Studio Supabase menerapkan pembatasan ini](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Auth/EmailTemplates/CustomEmailTemplateRestrictionAdmonition.tsx) pada proyek yang belum memenuhi syarat pengeditan. Siapkan pengirim Custom SMTP bila ingin memakai template kode sendiri. Sementara itu, konfirmasi melalui tombol pada email bawaan tetap didukung. **Perbaikan reset sandi tidak memerlukan pengubahan template**; gunakan template Reset password bawaan dan alamat tujuan tanpa fragment pada bagian 4.

**Jangan menyalin template Confirm signup ke Reset password.** Email pemulihan kata sandi harus tetap menggunakan tautan `{{ .ConfirmationURL }}` dari template **Reset password**. Token pendaftaran tidak dapat digunakan untuk mengganti kata sandi.

## 3. Atur nama dan alamat pengirim

Agar kolom **From** menampilkan THERMPYX dengan alamat milik Anda, gunakan pengirim SMTP yang sudah terverifikasi. Anda bisa memakai layanan email/domain atau penyedia SMTP yang Anda miliki.

1. Siapkan alamat pengirim, misalnya `akun@domain-anda`, di penyedia email. Jika diminta, tambahkan DNS verifikasi domain, SPF, dan DKIM sesuai petunjuk penyedia; tunggu sampai domain terverifikasi.
2. Di Supabase buka **Project Settings → Authentication → SMTP Settings**, atau **Authentication → Email → SMTP Settings**, sesuai tampilan Dashboard.
3. Aktifkan **Custom SMTP**.
4. Isi **Sender name** = `THERMPYX` dan **Sender email** = alamat pengirim terverifikasi.
5. Isi host, port, username, serta password SMTP sesuai penyedia. Simpan hanya di Dashboard.
6. Simpan pengaturan dan lakukan uji pendaftaran dengan alamat email milik Anda.

Jika **Custom SMTP belum aktif**, layanan bawaan Supabase ditujukan untuk percobaan dan membatasi pengiriman ke alamat anggota tim organisasi proyek, bukan semua alamat yang ditambahkan ke **Authentication → Users**. Karena itu, email pemulihan ke alamat pemilik proyek bisa diterima, sementara pendaftaran dengan alamat lain tidak bisa menerima email. Menambahkan pengguna aplikasi atau mengganti template tidak menghapus batas ini.

Layanan bawaan juga memiliki kuota kecil; dokumentasi Supabase menyebut **dua email per jam per proyek** sebagai batas default gabungan untuk pendaftaran, pemulihan, dan endpoint email terkait. Itu bukan hasil pemeriksaan kuota proyek Anda. Periksa **Authentication → Rate Limits** dan kebijakan pengiriman yang berlaku untuk proyek tersebut; pengaturan batas yang dapat diubah mengikuti konfigurasi SMTP proyek. Jangan menekan kirim ulang berkali-kali. Custom SMTP tetap memiliki batas Supabase dan batas penyedianya sendiri.

Untuk uji terbatas, gunakan alamat anggota tim yang sudah ada. Untuk mengizinkan dosen/siswa mendaftar dengan alamat mereka, siapkan **Custom SMTP** dengan pengirim terverifikasi. Jangan menambah semua siswa sebagai anggota organisasi Supabase hanya untuk menerima email. Jangan memasukkan password SMTP atau secret key ke JavaScript maupun GitHub.

## 4. Atur tautan pemulihan

Pada **Authentication → URL Configuration**:

- Isi **Site URL** dengan alamat hosting HTTPS web Anda.
- Tambahkan callback yang persis digunakan web pada **Redirect URLs**: `https://alamat-web-anda/index.html` dan `https://alamat-web-anda/index.html?account=recovery`. Jangan menambahkan `#account` atau tanda `#` pada kedua alamat ini. Jika web berada dalam subfolder, sertakan subfolder tersebut pada kedua URL. Site URL tetap menggunakan alamat utama web tanpa parameter pemulihan.
- Pendaftaran dengan kode tidak memerlukan pengguna berpindah lewat tautan email. Pemulihan kata sandi menggunakan alamat web tersebut dan alur akun di beranda.

Sesuaikan daftar redirect dengan URL yang benar-benar dipakai; jangan menambahkan wildcard luas untuk mengatasi error.

Untuk situs THERMPYX yang sekarang, nilainya adalah:

| Pengaturan | Nilai |
| --- | --- |
| Site URL | `https://thermpyx.github.io/thermpyxgsekawan/` |
| Redirect URL konfirmasi | `https://thermpyx.github.io/thermpyxgsekawan/index.html` |
| Redirect URL pemulihan | `https://thermpyx.github.io/thermpyxgsekawan/index.html?account=recovery` |

Jika sebelumnya sudah menyimpan alamat yang diakhiri `#account`, tambahkan dua alamat baru tanpa fragment pada tabel di atas. Alamat lama boleh tetap ada untuk kompatibilitas; Site URL tidak perlu diubah. Supabase menambahkan fragment sesi pada alamat tujuan, sehingga anchor tambahan dapat membuat token tidak terbaca. Web juga menangani bentuk tautan lama tersebut sebelum SDK dijalankan.

Setelah pembaruan web terbit dan batas pengiriman email sudah pulih, minta **satu tautan pemulihan baru** melalui **Lupa kata sandi** dan buka email terbaru. Tautan lama dapat sudah digunakan atau kedaluwarsa. Halaman harus membuka formulir **Buat kata sandi baru** dan **Ulangi kata sandi baru**. URL pemulihan saja bukan izin mengganti sandi: Supabase tetap harus memvalidasi sesi dari tautan email. Pesan **Please wait before requesting another email** menunjukkan batas pengiriman; perubahan kode atau URL tidak menghapus batas tersebut. Jangan menekan kirim ulang berulang kali.

## 5. Uji alur nyata

1. Untuk pendaftaran baru, di beranda pilih **Buat akun**; gunakan email yang dapat Anda buka, belum terdaftar, dan diizinkan pengaturan email proyek. Untuk akun lama, pilih **Masuk** atau **Lupa kata sandi**.
2. Periksa email, termasuk folder spam. Kolom pengirim harus menampilkan THERMPYX/alamat Anda setelah SMTP aktif.
3. Masukkan kode di web. Setelah berhasil, status akun menjadi terhubung.
4. Buka Latihan → Quiz → Bank Soal, simpan satu paket ke akun, lalu muat ulang.
5. Keluar dan coba masuk kembali. Jika diperlukan, uji **Lupa kata sandi** dan tautan pemulihan.

Jika email tidak terkirim, jangan langsung menghapus atau membuat ulang akun. Ikuti pemeriksaan ini:

1. Perhatikan teks error di web dan waktu percobaannya.
2. Di Supabase buka **Authentication → Logs** atau **Logs → Auth**, sesuai tampilan Dashboard. Cari kejadian pada waktu yang sama. Jangan menyalin token atau data pribadi ke laporan.
3. Jika permintaan **ditolak**, periksa kode/pesan error: penerima tidak diizinkan, kuota email habis, provider Email nonaktif, atau masalah SMTP. Perbaiki penyebabnya sebelum mencoba lagi.
4. Jika permintaan **diterima**, itu baru berarti Supabase menerima permintaan. Periksa apakah email sudah terkonfirmasi, template hanya berisi tautan, folder spam, dan log pengiriman penyedia SMTP jika dipakai. Status diterima bukan jaminan pesan masuk ke kotak email.
5. Jika kode salah/kedaluwarsa, tunggu sesuai pesan lalu minta kode baru sekali; gunakan email terbaru. Untuk akun terkonfirmasi yang lupa sandi, gunakan pemulihan sandi, bukan kirim ulang pendaftaran.

Keberhasilan uji dengan backend tiruan tidak membuktikan SMTP proyek Anda sudah aktif atau email nyata sudah terkirim. Tidak diperlukan pengiriman email otomatis untuk pengujian kode lokal.

Untuk Live Server, gunakan alamat lokal yang benar-benar tampil di browser. Contoh jika proyek disajikan langsung di port 5500: Site URL `http://127.0.0.1:5500`, Redirect URLs `http://127.0.0.1:5500/index.html` dan `http://127.0.0.1:5500/index.html?account=recovery`. `localhost` dan `127.0.0.1` adalah alamat berbeda; gunakan host yang sama dengan browser.

Rujukan pengaturan resmi: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [batas Auth](https://supabase.com/docs/guides/auth/rate-limits), dan [template email](https://supabase.com/docs/guides/auth/auth-email-templates). Dashboard proyek dan log aktual menentukan status pengiriman yang sedang berlaku.

## Notifikasi ke kotak masuk email

Backend opsional untuk mengirim notifikasi Gmail setelah masukan baru tersimpan tersedia di `functions/`. Ikuti [panduan aktivasi notifikasi email](NOTIFIKASI-EMAIL-FIREBASE.md). Ini memerlukan Cloud Functions/Blaze, Secret Manager dan deployment Firebase tersendiri. Push GitHub Pages tidak mengaktifkannya; fungsi belum dideploy atau diuji dengan pengiriman email produksi.
