# Mengaktifkan notifikasi email masukan

Form masukan saat ini menyimpan pesan di Realtime Database. Backend opsional yang disiapkan di [`functions/`](../functions/) menambahkan alur berikut:

**Masukan baru tersimpan → Cloud Function → SMTP Gmail → kotak masuk administrator.**

Alamat tujuan awal adalah **thermpyx@gmail.com**. Pengunjung tetap menekan **Kirim masukan** dari website, tanpa membuka aplikasi email. Secret pengiriman hanya tersedia pada backend. Kode ini disiapkan dan diuji secara lokal; keberadaannya di GitHub **belum mengaktifkan email**.

## Jika proyek masih Spark atau paketnya belum diketahui

**Notifikasi Gmail dengan backend ini belum bisa diaktifkan pada paket Spark.** Penyimpanan masukan ke Firebase tetap bekerja dengan Rules yang sudah dipublikasikan; administrator dapat membacanya di **Realtime Database → Data → feedback**. Status sukses pada formulir berarti pesan tersimpan di database, bukan email sudah masuk.

Periksa paket di [Firebase Console proyek thermpyx](https://console.firebase.google.com/project/thermpyx/overview), bagian **Usage and billing / Penggunaan dan penagihan**. Jangan mengganti proyek, database atau Rules untuk mengaktifkan email. Perubahan paket harus dipilih sendiri oleh pemilik proyek. Panduan di bawah berlaku setelah pemilik memutuskan menggunakan Blaze; pembaruan website tidak mengubah paket atau penagihan.

Setelah Blaze dipilih, cukup siapkan Gmail pengirim beserta App Password, simpan dua secret melalui Firebase CLI, lalu deploy fungsi yang sudah tersedia. Tidak perlu membuat Supabase lagi atau menaruh sandi Gmail di website.

## 1. Aktifkan persyaratan Firebase

Deploy Cloud Functions memerlukan paket **Blaze** dan akun Google yang memiliki izin deployment pada proyek `thermpyx`. Blaze memakai penagihan sesuai pemakaian; mengaktifkannya merupakan tindakan pada akun Firebase Anda, bukan bagian dari push GitHub Pages. Atur anggaran di Google Cloud sesuai kebutuhan.

Fungsi menggunakan Node.js 22 dan region `asia-southeast1`, sama dengan lokasi database. Aturan database yang sudah berjalan tidak perlu diganti untuk menambahkan notifikasi ini.

## 2. Siapkan Gmail pengirim

1. Masuk ke akun Gmail yang akan mengirim, misalnya `thermpyx@gmail.com`.
2. Aktifkan **Verifikasi 2 Langkah / 2-Step Verification** pada akun Google tersebut.
3. Buka [Google App Passwords](https://myaccount.google.com/apppasswords) dan buat sandi aplikasi untuk THERMPYX.
4. Simpan sandi aplikasi tersebut untuk langkah Secret Manager. Gunakan **App Password**, bukan kata sandi login Gmail. Jangan menaruhnya di JavaScript browser, commit GitHub, atau chat.

Ketersediaan App Passwords bergantung pada pengaturan akun; beberapa akun organisasi atau akun dengan Advanced Protection tidak menyediakannya. [Panduan resmi Google](https://support.google.com/accounts/answer/185833) menjelaskan ketentuannya.

## 3. Siapkan direktori proyek dan Firebase CLI

Jalankan dengan Node.js 22 dari checkout cabang publik. Jika belum mempunyai checkout lokal:

```sh
git clone --branch codex/simulator-visual-refinement https://github.com/thermpyx/thermpyxgsekawan.git
cd thermpyxgsekawan
```

Untuk checkout yang sudah ada, gunakan cabang `codex/simulator-visual-refinement` dan perbarui dengan `git pull --ff-only`; pertahankan perubahan lokal yang belum disimpan.

```sh
npm install -g firebase-tools
firebase login
npm ci --prefix functions
```

Pilih akun yang memiliki akses proyek `thermpyx` ketika login Firebase.

## 4. Simpan Gmail dan App Password dengan aman

Jalankan satu per satu; Firebase CLI akan meminta nilainya melalui terminal:

```sh
firebase functions:secrets:set FEEDBACK_GMAIL_USER --project thermpyx
firebase functions:secrets:set FEEDBACK_GMAIL_APP_PASSWORD --project thermpyx
```

- `FEEDBACK_GMAIL_USER`: alamat Gmail pengirim.
- `FEEDBACK_GMAIL_APP_PASSWORD`: App Password dari langkah 2, tanpa spasi tampilan.

Masukkan nilainya pada prompt Firebase CLI, bukan sebagai argumen perintah. Kedua secret disimpan dalam Google Cloud Secret Manager dan terikat hanya ke fungsi ini.

## 5. Tentukan alamat penerima

Tujuan bawaan adalah `thermpyx@gmail.com`. Jika ingin menggantinya, buat atau sunting berkas lokal **`functions/.env.thermpyx`**:

```dotenv
FEEDBACK_EMAIL_TO=alamat-penerima-anda@gmail.com
```

`functions/.env.example` berisi contoh non-secret. Berkas `.env.thermpyx` diabaikan Git. Alamat tujuan ditentukan administrator di server; pengguna form tidak dapat memilih penerima atau menjadikannya layanan pengiriman email ke alamat bebas.

## 6. Uji dan deploy fungsi

```sh
npm test --prefix functions
firebase deploy --only functions:feedback-mail:notifyFeedbackEmail --project thermpyx
```

Perintah tersebut men-deploy fungsi **`notifyFeedbackEmail`**, bukan seluruh aplikasi atau Rules. Pada deployment pertama, Firebase dapat meminta aktivasi API dan pemberian izin layanan yang diperlukan. Periksa hasil terminal sampai deployment benar-benar berhasil.

Push GitHub Pages hanya memperbarui frontend. Fungsi baru aktif setelah perintah Firebase deploy berhasil. Workflow **Feedback email backend QA** hanya menjalankan pengujian; workflow itu tidak deploy dan tidak mengirim email.

Untuk memeriksa daftar fungsi pada proyek yang Anda kelola tanpa mengirim pesan atau membuat record database:

```sh
firebase functions:list --project thermpyx
```

Pastikan `notifyFeedbackEmail` tercantum dengan region `asia-southeast1`. Daftar fungsi membuktikan fungsi terpasang, bukan bahwa Gmail sudah menerima pesan.

## 7. Periksa hasil setelah deploy

Ketika Anda benar-benar memerlukan pengiriman masukan, kirim pesan baru dari website. Fungsi hanya menangani masukan yang dibuat **setelah** deployment; masukan lama tidak dikirim ulang otomatis.

- Pesan asli tetap berada di **Realtime Database → Data → feedback → UID → ID**.
- Status notifikasi berada di **Data → _feedbackEmail → UID → ID** dan hanya dapat diakses administrator melalui Console/Admin SDK.
- `smtp-accepted`: Gmail menerima permintaan SMTP. Ini belum menjamin penempatan di Inbox; periksa juga Spam dan seluruh email pada alamat tujuan yang dikonfigurasi.
- `failed`: pengiriman tidak terkonfirmasi. Periksa kode seperti `EAUTH` dan konfigurasi Gmail/secret, lalu lihat log fungsi.
- `processing` yang menetap atau `uncertain`: proses terputus atau konfirmasi status gagal; pesan asli tetap tersedia di database.

Untuk melihat log:

```sh
firebase functions:log --only notifyFeedbackEmail --project thermpyx
```

Jika nilai secret diubah, deploy ulang fungsi agar menggunakan versi secret terbaru. Jangan menghapus record masukan atau melonggarkan Rules untuk memperbaiki masalah SMTP.

## Perilaku, batas, dan bukti pengujian

Email berupa teks biasa dengan nama opsional, kategori, isi, waktu UTC dan ID masukan. Isi pengunjung tidak dimasukkan ke header atau HTML. Tidak ada `replyTo`, karena form sekarang tidak meminta alamat email pengunjung. Balasan ke pengunjung memerlukan fitur kontak terpisah.

Penanda transaksi terpisah membatasi pengiriman ulang untuk record yang sama. Retry otomatis fungsi dinonaktifkan agar kegagalan konfigurasi tidak menimbulkan pengiriman berulang. Email gagal tidak dikirim ulang atau di-backfill otomatis setelah kredensial diperbaiki; database tetap menjadi sumber masukan utama. SMTP dan penulisan database tidak merupakan satu transaksi, sehingga kode ini tidak menjanjikan pengiriman exactly-once atau penempatan Inbox.

Pengujian memakai SMTP dan penyimpanan tiruan: validasi record, alamat tujuan tetap, ID/EN, penolakan penerima, kegagalan SMTP, penanganan event ganda dan konfirmasi yang hilang. Registrasi trigger nyata juga diperiksa untuk region, instance, jenis event, dan pengikatan secret. Pengujian tidak mengirim email sungguhan dan tidak membuat data produksi.

Referensi resmi: [Realtime Database triggers](https://firebase.google.com/docs/functions/database-events), [secret parameters](https://firebase.google.com/docs/functions/config-env#secret_parameters), [Firebase Functions samples](https://github.com/firebase/functions-samples), [Google App Passwords](https://support.google.com/accounts/answer/185833).
