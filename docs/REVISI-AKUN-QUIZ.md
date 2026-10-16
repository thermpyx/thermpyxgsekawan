# Perbaikan akun dan bank soal

## Pemulihan kata sandi

Sebelumnya, SDK Supabase dapat memproses tautan email sebelum tampilan akun siap. Penanda pemulihan hilang ketika URL dibersihkan, sehingga beranda muncul tanpa formulir sandi baru.

Web sekarang menangkap maksud callback sebelum SDK memproses URL, berlangganan perubahan Auth lebih awal, dan membuka formulir **Buat kata sandi baru** serta **Ulangi kata sandi baru** setelah sesi pemulihan divalidasi. Tautan yang tidak lengkap, kedaluwarsa, atau sudah dipakai menampilkan petunjuk meminta tautan baru. Parameter `account=recovery` sendiri tidak memberikan izin mengubah sandi. Token akses/pemulihan tidak dimasukkan ke parameter halaman aplikasi dan dibersihkan sesudah pemrosesan SDK.

Alamat tujuan Auth sebelumnya diakhiri `#account`, sedangkan [GoTrue menambahkan `#` beserta data sesi](https://github.com/supabase/auth/blob/master/internal/tokens/service.go). Bentuk hasilnya dapat menjadi `#account#access_token=…`, sehingga SDK tidak mengenali token pertama. Pengujian SDK dengan bentuk server ini mereproduksi formulir yang kembali ke permintaan email tanpa verifikasi sesi. Alamat tujuan baru tidak memakai fragment. Penanganan awal halaman juga menormalkan bentuk lama yang dikenali sebelum SDK membaca URL, sambil mempertahankan token pada fragment.

Tambahkan dua alamat tanpa `#account` pada **Supabase → Authentication → URL Configuration → Redirect URLs** sesuai [panduan email](EMAIL-THERMPYX.md#4-atur-tautan-pemulihan). Site URL tetap sama. Setelah versi baru terbit, muat ulang web; jika batas pengiriman email sudah pulih, minta satu email terbaru melalui **Lupa kata sandi**. Jangan membagikan tautan pemulihan, sandi, atau kode email. Pesan **Please wait before requesting another email** adalah pembatasan Supabase dan tidak dihilangkan oleh perubahan frontend.

Perbaikan lanjutan menangani pergantian tab, misalnya saat membaca email lalu kembali ke web. SDK dapat mengumumkan ulang sesi yang sama; sebelumnya web menganggapnya login baru dan mengganti formulir sandi menjadi permintaan tautan lagi. Pemulihan yang sudah divalidasi kini tetap berlaku untuk sesi yang sama, sedangkan login/logout eksplisit, perubahan akun/sesi, dan keberhasilan penggantian sandi mengakhiri izin pemulihan tersebut.

## Konfirmasi email

Template bawaan **Confirm signup** hanya menampilkan tautan. Untuk menyediakan kode angka dan tombol konfirmasi, salin isi [template konfirmasi](../supabase/confirm-signup-email.html) ke **Authentication → Email / Email Templates → Confirm signup**, lalu simpan. Pertahankan `{{ .Token }}` dan `{{ .ConfirmationURL }}`. Template **Reset password** tetap memakai tautan pemulihannya sendiri.

Pesan web membedakan permintaan yang diterima dari email yang benar-benar diterima pengguna. Akun yang sudah terkonfirmasi perlu **Masuk** atau **Lupa kata sandi**, bukan pendaftaran ulang. Jika email tidak tiba, periksa log Auth, Spam, batas pengiriman, dan SMTP proyek. Petunjuk lengkap ada pada [panduan email](EMAIL-THERMPYX.md). Mengubah template atau kode web tidak mengaktifkan SMTP.

## Paket soal guru

Alur pemeriksaan mencakup penyusunan soal dan empat pilihan, kunci jawaban, pembahasan, pratinjau, penyimpanan draf, penyimpanan cloud, pemuatan ulang, serta snapshot soal untuk ruang kuis. Penyimpanan gagal harus mempertahankan draf dan tidak boleh menampilkan status berhasil. Hasil permintaan lama tidak boleh diterapkan ke akun lain. Salinan cloud yang bersih boleh mengikuti pembaruan terbaru tanpa menimpa suntingan lokal yang belum disimpan.

Migrasi [bank soal](../supabase/02-teacher-quiz.sql) dan RLS pemilik tetap digunakan. Jika migrasi sudah berhasil dan RLS bernilai `true`, tidak perlu menjalankannya ulang untuk pembaruan frontend ini. Pembuatan ruang yang sedang berlangsung tidak mengalihkan browser atau menyimpan sesi host setelah akun berubah.

## Batas pengujian

Pengujian browser menggunakan Auth/database tiruan atau PostgreSQL lokal. Pengujian SDK memakai SDK Supabase asli dengan respons jaringan lokal yang dikendalikan. Tidak ada email yang dikirim dan tidak ada data proyek Supabase pengguna yang ditulis untuk pengujian.

Diagnostik tautan kini membedakan kedaluwarsa/sudah dipakai, data sesi tidak lengkap, penolakan sesi, serta kegagalan koneksi/layanan. Penyebab awal dibaca dari hasil inisialisasi SDK yang tersimpan karena `getSession()` dapat mengembalikan `error: null` setelah kegagalan tersebut. Tampilan hanya menggunakan kategori tetap dan teks ID/EN, tanpa menampilkan token, URL callback, atau pesan error mentah.

Pemeriksaan revisi ini lulus: 28 skenario dengan SDK Supabase 2.118.0, 10 skenario urutan callback/pemulihan, 15 pemeriksaan akun, 14 alur editor lama, 14 alur bank soal dengan SQL lokal, 10 pemeriksaan migrasi/RLS, 46 pemeriksaan perubahan akun saat membuat ruang, serta pemeriksaan template email, kuis, terjemahan, navigasi, riwayat, dan musik. Modal pemulihan diperiksa pada lebar 320 piksel dalam ID/EN dan tema gelap/terang. Uji tambahan membuktikan kode sebelumnya gagal ketika tab kembali aktif dan ketika server menambahkan fragment pada alamat tujuan lama. Callback dibangun dari `redirect_to` yang benar-benar dikirim SDK, mengikuti penambahan fragment oleh GoTrue; pemulihan, konfirmasi, dan kirim ulang diuji memakai bentuk baru serta bentuk lama. Pengujian juga memeriksa rotasi token, penolakan login biasa sebagai bukti pemulihan, serta kategori galat awal SDK.

Hasil tersebut memeriksa alur kode, validasi, kegagalan, dan batas akses lokal. Penerimaan email nyata, konfigurasi SMTP, serta penyimpanan pada proyek yang diterbitkan tetap perlu diuji oleh pemilik setelah pembaruan web dan template diterapkan. Lakukan satu paket percobaan milik sendiri: simpan ke akun, muat ulang, pastikan paket dapat dibuka kembali, lalu gunakan pada Host.
