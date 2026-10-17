# Menghubungkan THERMPYX ke Firebase

Kerjakan **satu tahap sampai hasilnya sesuai**, lalu lanjut ke tahap berikutnya. Gunakan proyek Firebase yang sudah dibuat, yaitu **thermpyx**.

Guru memakai **Masuk dengan Google** untuk menyimpan paket soal dan menjadi host. Siswa cukup memasukkan **kode ruang dan nama panggilan**; web menyiapkan identitas anonim di belakang layar. Membaca materi, menjalankan simulator, latihan mandiri dan menyusun draf lokal tetap bisa dilakukan tanpa login.

Provider **Google dan Anonymous**, domain situs, Realtime Database **Singapore / `asia-southeast1`**, URL kode dan Rules sudah disiapkan. Pengguna telah mengonfirmasi versi Google tampil pada Pages, login Google berhasil, soal dapat dibuat/digunakan, serta teman berhasil bergabung dan menjawab kuis pada web aktif. Ini laporan percobaan normal pengguna; agen tidak menulis data produksi untuk QA. Rilis tetap memakai `codex/simulator-visual-refinement`, tanpa unggah ulang atau pergantian cabang. Langkah 1–9 berikut dipertahankan untuk rujukan dan pengujian ulang; rincian batas konfirmasi ada pada [catatan revisi](REVISI-FIREBASE.md#status-pengaturan-proyek).

## 1. Buka proyek yang benar

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Pilih proyek **thermpyx**.
3. Pastikan nama proyek di bagian atas memang proyek tersebut.

**Hasil tahap ini:** Anda berada di Console proyek yang sama dengan konfigurasi web. Tidak perlu membuat proyek baru atau mengganti Web API key.

## 2. Periksa Google dan Anonymous

1. Buka **Build → Authentication**. Jika menu sulit ditemukan, gunakan [halaman provider proyek thermpyx](https://console.firebase.google.com/project/thermpyx/authentication/providers).
2. Pilih tab **Sign-in method** atau **Sign-in providers**, sesuai tampilan Console.
3. Pada **Google**, pastikan statusnya **Enabled**.
4. Pada **Anonymous / Anonim**, pastikan statusnya juga **Enabled**. Kedua provider ini sudah dikonfirmasi sebelumnya; jika masih sesuai, pertahankan dan lanjutkan.
5. Jika Anonymous belum diaktifkan pada pengaturan lain, klik **Add new provider / Tambahkan penyedia baru**, pilih **Anonymous**, aktifkan **Enable**, lalu klik **Save**.

**Hasil tahap ini:** daftar provider menampilkan **Google: Enabled** dan **Anonymous: Enabled**.

Anonymous digunakan siswa yang masuk ruang kuis. Identitas anonim tidak memberi akses bank soal pribadi atau menjadikan siswa akun guru. Alur Google tidak memakai kode email, template SMTP atau sandi THERMPYX terpisah.

## 3. Izinkan alamat website

1. Masih di **Authentication**, buka **Settings → Authorized domains**.
2. Klik **Add domain**.
3. Isi tepat:

   ```text
   thermpyx.github.io
   ```

4. Simpan. Jika domain tersebut sudah ada, tidak perlu menambah duplikat.
5. Pertahankan domain bawaan Firebase yang sudah tercantum.

**Hasil tahap ini:** `thermpyx.github.io` muncul pada daftar domain.

Isian ini hanya nama host. Alamat situs lengkap Anda tetap `https://thermpyx.github.io/thermpyxgsekawan/`, tetapi bagian `https://` dan `/thermpyxgsekawan/` tidak dimasukkan ke Authorized domains.

Untuk mencoba melalui server lokal, tambahkan juga **host yang benar-benar dibuka**, misalnya `127.0.0.1` atau `localhost`. Keduanya alamat berbeda; izinkan yang digunakan browser Anda.

## 4. Buat Realtime Database

Tahap ini sudah selesai untuk proyek `thermpyx`: database dibuat di Singapore. Langkah berikut berlaku sebagai rujukan jika menyiapkan ulang proyek.

1. Pada menu **Build**, pilih **Realtime Database**. Pilih produk ini, karena kode kuis menggunakan Realtime Database.
2. Klik **Create Database**. Jika database sudah tersedia, langsung buka database tersebut dan lanjut ke tahap 5.
3. Pilih lokasi **Singapore / `asia-southeast1`** jika tersedia. Periksa pilihan lokasi sebelum melanjutkan; lokasi database ditentukan saat pembuatan.
4. Pada pilihan keamanan, pilih **Start in locked mode / Mulai dalam mode terkunci**.
5. Klik **Enable / Create**, lalu tunggu halaman database terbuka.

**Hasil tahap ini:** tab **Data** dan **Rules** tersedia. Database boleh masih kosong. Mode terkunci akan diganti dengan aturan khusus aplikasi pada tahap 6; jangan memakai aturan publik `.read: true` dan `.write: true`.

## 5. Salin URL database ke kode web

URL proyek `thermpyx` telah dikonfirmasi dari Console dan diisi pada konfigurasi versi terbaru:

```js
databaseURL: "https://thermpyx-default-rtdb.asia-southeast1.firebasedatabase.app",
```

Jika nilai tersebut sudah sesuai, lanjutkan ke tahap 6. Untuk memeriksa atau menyiapkan ulang:

1. Buka tab **Data** pada Realtime Database.
2. Salin URL database yang ditampilkan di bagian atas. URL diawali `https://` dan menggunakan domain `firebasedatabase.app` atau `firebaseio.com`.
3. Pada folder proyek THERMPYX, buka [js/firebase-config.js](../js/firebase-config.js).
4. Cari properti **`databaseURL`**, lalu pastikan nilai di antara tanda kutip sama dengan URL asli dari Console, seperti contoh proyek di atas.
5. Jika nilainya berbeda atau kosong, tempel URL yang disalin, lalu simpan. Pertahankan tanda kutip, koma dan isian konfigurasi lainnya.

**Hasil tahap ini:** `databaseURL` berisi URL asli database Anda, bukan kosong atau teks contoh. Jangan menebak alamat database dari nama proyek.

Berkas ini hanya untuk **Firebase Web config**. Jangan memasukkan berkas service account, private key, Admin SDK credential, token administrator atau sandi akun Google ke kode web.

## 6. Pasang aturan akses khusus THERMPYX

Tahap ini sudah dikonfirmasi selesai oleh pengguna: **Publish Rules berhasil**. Langkah berikut menjadi rujukan saat menerapkan ulang aturan yang sesuai versi kode.

1. Buka [firebase/database.rules.json](../firebase/database.rules.json) dari proyek.
2. Salin seluruh isi berkas, mulai dari `{` pertama sampai `}` terakhir. Ini JSON; ikutkan seluruh isi tanpa menambah tanda Markdown.
3. Kembali ke Firebase → **Realtime Database → Rules**.
4. Klik area editor, pilih seluruh aturan yang ada, lalu tempel isi berkas tersebut.
5. Klik **Publish / Publikasikan**.

**Hasil tahap ini:** Console menyatakan aturan berhasil dipublikasikan. Jika editor menampilkan error, perbaiki berdasarkan teks error sebelum melanjutkan; jangan mengatasi penolakan akses dengan membuka seluruh database.

Aturan membatasi bank soal kepada guru pemilik, membedakan guru Google dan peserta anonim, serta memeriksa akses ruang, nama panggilan dan jawaban. Versi aturan yang dicatat pada [catatan pengujian](REVISI-FIREBASE.md#pengujian-dan-batasnya) telah lulus emulator resmi. Penerapan ke Console tetap dilakukan terpisah; mengunggah GitHub saja tidak menerapkan aturan database.

## 7. Terbitkan berkas web terbaru

Rilis Firebase menggunakan cabang GitHub Pages yang sudah digunakan, **`codex/simulator-visual-refinement`**, dan pengguna sudah mengonfirmasi tombol Google tampil pada situs aktif. Pengguna tidak perlu mengunggah berkas lagi atau mengganti pilihan cabang. Langkah berikut menjadi rujukan jika menerbitkan sendiri pada pembaruan berikutnya:

1. Pastikan berkas `js/firebase-config.js` yang diunggah sudah berisi URL database asli.
2. Unggah/push seluruh perubahan proyek ke cabang yang dipakai **GitHub Pages**. Pertahankan struktur folder.
3. Tunggu proses penerbitan selesai.
4. Buka `https://thermpyx.github.io/thermpyxgsekawan/`, lalu muat ulang agar kode terbaru digunakan.

**Hasil tahap ini:** tombol Masuk membuka pilihan **Lanjutkan dengan Google**. Web aktif tidak menyediakan form sandi, kode email atau pemulihan Supabase.

## 8. Coba satu paket soal guru

Login Google serta pembuatan/penggunaan soal sudah dilaporkan berhasil. Langkah berikut dapat dipakai untuk mengulang pemeriksaan lengkap, termasuk pemuatan ulang paket yang belum dikonfirmasi secara terpisah.

1. Klik **Masuk → Lanjutkan dengan Google**.
2. Pilih akun Google Anda pada popup. Jika browser memblokir popup, izinkan popup untuk situs ini lalu coba lagi.
3. Pastikan popup akun menampilkan identitas Google Anda dan tombol **Keluar**.
4. Buka **Latihan → Quiz → Bank Soal / Susun soal sendiri**.
5. Buat satu paket percobaan. Isi judul, satu pertanyaan, **empat pilihan berbeda**, satu jawaban benar dan pembahasan jika diperlukan.
6. Klik tombol untuk **menyimpan ke akun/cloud**. Penyimpanan draf lokal saja belum membuktikan database terhubung.
7. Setelah berhasil, muat ulang halaman lalu buka kembali paket dari daftar akun.

**Hasil yang diharapkan saat mengulang tes:** paket tersimpan pada akun Google yang sama dan dapat dibuka kembali setelah muat ulang. Jika penyimpanan gagal, draf lokal harus tetap tersedia.

Bank soal dan akun Supabase lama tidak berpindah otomatis ke Firebase. Simpan data lama; daftar Firebase yang masih kosong tidak berarti database lama terhapus.

## 9. Coba host dan siswa

Pengguna sudah melaporkan temannya berhasil bergabung dan menjawab kuis pada web aktif. Pemeriksaan berikut tetap menjadi rujukan untuk mengulang seluruh alur; hasil/leaderboard belum dilaporkan secara khusus.

1. Dari akun guru, pilih paket yang baru disimpan lalu buka sebagai host. Topik bawaan juga dapat dipakai.
2. Catat kode ruang yang ditampilkan.
3. Gunakan perangkat lain atau browser/profil terpisah sebagai siswa. Untuk percobaan, jendela privat terpisah membantu memastikan siswa tidak menggunakan sesi Google guru.
4. Pada web siswa, pilih bergabung, isi kode ruang dan nama panggilan, lalu masuk.
5. Pastikan siswa muncul pada daftar host. Mulai kuis dari host.
6. Jawab satu soal pada siswa dan periksa kemajuan, hasil serta leaderboard.

**Hasil yang diharapkan saat mengulang tes:** guru dan siswa melihat ruang yang sama, siswa dapat menjawab, serta hasil tampil. Beberapa tab dalam profil browser yang sama dapat berbagi identitas Firebase; gunakan identitas/browser terpisah untuk menguji beberapa siswa.

## Jika muncul pesan kendala

| Kendala | Periksa dahulu |
| --- | --- |
| Login Google belum diizinkan pada situs ini | Domain `thermpyx.github.io` di Authentication → Settings → Authorized domains. |
| Login Google belum diaktifkan | Provider Google masih Enabled pada proyek `thermpyx`. |
| Browser memblokir popup | Izinkan popup untuk situs, lalu ulangi klik Google. |
| Siswa tidak dapat masuk sebagai peserta | Provider Anonymous sudah Enabled. |
| Alamat database belum disiapkan | Nilai `databaseURL` di berkas yang benar-benar terbit. |
| Penyimpanan/akses ditolak | Akun Google yang sedang dipakai, aturan pada tab Rules, dan URL database yang sama. |
| Koneksi/SDK belum siap | Koneksi internet dan pesan status. Tunggu pemuatan selesai; web tidak boleh mengaku login atau tersimpan ketika gagal. |
| Paket lama Supabase tidak muncul | Backend Firebase memakai akun dan penyimpanan baru; tidak ada pemindahan otomatis. |

Kirimkan **teks pesan status** jika membutuhkan bantuan. Sandi, kode, token dan credential privat tetap disimpan sendiri. Detail arsitektur, pengujian lokal dan batas validasi tersedia pada [catatan revisi Firebase](REVISI-FIREBASE.md).


## Flashcard dan skill Prisma

Sesudah Rules terbaru dipublikasikan, buka Latihan → Flashcard. Materi manual serta PDF/DOCX dibaca dan diedit lokal. Masuk dengan Google, lalu pilih Simpan ke akun untuk menyimpan teks kartu secara pribadi. Muat ulang dan periksa koleksi; ubah judul atau hapus hanya materi milik akun tersebut. Gunakan akun Google kedua untuk memeriksa bahwa koleksi privat akun pertama tidak tampil. Dokumen asli tidak diunggah.

Pada Host Live Quiz, pilih Aktifkan bantuan Prisma sebelum membuat ruang. Pilihan ini tetap untuk ruang tersebut. Siswa mendapat satu token untuk menyingkirkan dua pilihan salah; pemakaian tersimpan dan tidak diperbarui oleh reload. Guru melihat soal yang dibantu pada monitor. Skor dan waktu kuis tidak berubah. Ruang lama tanpa pengaturan skill tetap dapat dimainkan tanpa Prisma.

Jika penyimpanan flashcard atau pembuatan ruang baru ditolak Rules, periksa bahwa seluruh `firebase/database.rules.json` versi baru sudah dipublikasikan di database Singapore yang digunakan web. Jangan memberi akses publik atau mematikan validasi untuk menghilangkan pesan tersebut.
