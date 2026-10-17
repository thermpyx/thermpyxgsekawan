# Skill kuis THERMPYX

Status: **Reaktor Energi dan Prisma telah diimplementasikan** untuk kuis langsung Firebase. Ide lain di bawah tetap usulan dan belum aktif.

## Versi aktif

- **Reaktor Energi / Energy Reactor** mengisi satu dari tiga sel sesudah jawaban benar dikonfirmasi tersimpan. Pada sel ketiga, meter menyala singkat lalu kembali kosong. Tidak menambah poin atau waktu, tidak mengubah penguasaan materi, dan menghormati pengaturan pengurangan gerakan. Muat ulang memulihkan jumlah jawaban benar dari jawaban yang tersimpan.
- **Prisma / Prism** memberi satu token per peserta **untuk seluruh ruang**. Gunakan sebelum menjawab dan sebelum waktu habis untuk menonaktifkan dua pilihan salah. Pilihan benar selalu dipertahankan. Peniadaan pilihan hanya tampil setelah pemakaian dikonfirmasi oleh Firebase. Pilihan yang disingkirkan deterministik agar muat ulang memulihkan tampilan yang sama pada soal tersebut.
- Guru menentukan **Aktifkan bantuan Prisma** sebelum membuat ruang. Kotak awal tercentang untuk ruang baru; guru bisa mematikannya. `skills_enabled` tersimpan sebagai konfigurasi tetap. Ruang lama tanpa nilai ini tetap menonaktifkan Prisma. Reaktor tetap tampil karena hanya umpan balik visual.
- Saat permintaan Prisma sedang disimpan, pilihan jawaban dikunci sementara agar dua operasi tidak tumpang tindih. Waktu terus berjalan. Jika waktu habis selama permintaan, jawaban kehabisan waktu tetap dikirim pada batas 20 detik tanpa menunggu koneksi Prisma. Setelah jawaban tersimpan, soal berikutnya dapat dijawab meskipun permintaan Prisma lama masih menunggu. Konfirmasi yang terlambat tidak menyingkirkan pilihan pada soal berikutnya. Kegagalan konfirmasi memeriksa catatan pemakaian sebelum menawarkan percobaan lagi. Gangguan pemeriksaan token tidak menghalangi pemain menjawab biasa.
- Dashboard host menerima catatan bantuan melalui langganan Firebase, menampilkan peserta, nomor soal, dan jawaban benar/salah berbantuan. Skor tetap berdasarkan jawaban tersimpan: **benar 100, salah/kehabisan waktu 0; 20 detik per soal**. Jawaban dengan bantuan tidak diberi label sebagai penguasaan tanpa bantuan.

Catatan disimpan di `skillUses/{roomId}/{playerId}/prism` dengan `kind`, `question_index`, dan `used_at`. Aturan database memeriksa keanggotaan, ruang aktif, izin Prisma, soal aktif, belum ada jawaban, serta satu pemakaian yang tidak dapat diubah. Host hanya membaca catatan ruang miliknya; peserta hanya membaca/menulis catatan dirinya. Tenggat 20 detik diperiksa klien karena waktu mulai soal lama berbentuk ISO. Aturan lama untuk skor dan waktu respons jawaban tetap berlaku. Ini kuis latihan kelas, bukan sistem ujian dengan pengamanan antikecurangan menyeluruh.

Pengujian UI terisolasi: `node qa/test-quiz-skills.cjs` dan regresi alur kuis `node qa/test-firebase-live.cjs`. Keduanya memakai kontrak backend tiruan lokal, tanpa autentikasi atau penulisan ke produksi. Pengujian aturan Firebase dilakukan terpisah dengan emulator proyek `demo-*`; hasil emulator tidak membuktikan aturan sudah diterbitkan ke produksi.

## Ide tahap berikutnya

Alur kuis sekarang memberi waktu **20 detik per soal untuk setiap pemain**. Pemain melanjutkan setelah jawabannya tersimpan, sehingga peserta dapat berada pada soal berbeda. Jawaban benar bernilai 100, jawaban salah atau kehabisan waktu bernilai 0. Aturan Firebase juga memvalidasi nilai dan batas waktu tersebut. Capaian belajar pada tujuh modul tetap berdasarkan jumlah jawaban benar, dengan ambang penguasaan 80%.

| Ide | Cara memperoleh dan memakai | Pengaruh pada permainan |
| --- | --- | --- |
| **Reaktor Energi / Energy Reactor (aktif)** | Setiap jawaban benar yang sudah tersimpan mengisi satu dari tiga sel energi. Setelah tiga sel terisi, reaktor menyala singkat lalu meter kembali kosong. Tidak perlu tombol. | Umpan balik visual saja; tidak memberi poin tambahan, bantuan jawaban, atau waktu. Animasi mengikuti pengaturan pengurangan gerakan. |
| **Prisma / Prism (aktif)** | Semua peserta mendapat satu token per ruang jika guru mengaktifkannya. Tekan tombol sebelum menjawab dan sebelum waktu habis untuk menonaktifkan dua pilihan salah pada soal itu. Token tidak dapat dipakai kembali setelah memuat ulang. | Bantuan nyata untuk memilih jawaban. Waktu tetap berjalan dan poin tetap 100 atau 0. Catatan bantuan ditampilkan pada dashboard host. |
| **Kartu Konsep / Concept Card** | Semua peserta mendapat satu token. Guru menulis petunjuk opsional untuk soal, misalnya “Ubah suhu ke kelvin sebelum menghitung efisiensi.” Pemain membuka kartu sebelum menjawab; tombol hanya tersedia jika soal mempunyai petunjuk. | Bantuan belajar tanpa menampilkan pilihan benar. Waktu tetap berjalan. Teks guru ditampilkan sesuai bahasa aslinya; petunjuk bawaan disediakan dalam Indonesia dan Inggris. |
| **Perisai Kombo / Combo Shield** | Dua jawaban benar berturut-turut yang sudah tersimpan memberikan satu perisai, maksimal satu per ruang. Perisai otomatis dipakai pada jawaban salah berikutnya untuk mempertahankan tampilan kombo, lalu kombo berlanjut hanya setelah jawaban benar berikutnya. | Hadiah kosmetik: kombo tidak mengalikan poin. Jawaban salah tetap salah dan bernilai 0, termasuk pada laporan guru dan capaian belajar. Tampilkan “kombo dilindungi” agar maknanya jelas. |
| **Jeda Pendinginan / Cooling Break** | Dalam mode latihan yang diaktifkan guru, setiap peserta memperoleh satu token untuk menambah lima detik pada soal yang sedang dikerjakannya. Aktifkan sebelum menjawab dan sebelum batas waktu awal habis. | Bantuan waktu nyata. Hanya memperpanjang waktu peserta tersebut, tanpa membekukan peserta lain. Ini usulan tahap lanjut karena memerlukan perubahan pencatatan tenggat, validasi waktu, pemulihan sesi, serta perhitungan pemeringkatan berdasarkan waktu. |

## Arah pengembangan

Versi pertama menggunakan **Reaktor Energi dan Prisma**. Kombinasi ini memberi rasa permainan dan satu keputusan sederhana tanpa mengubah nilai jawaban atau durasi soal. Kartu Konsep dapat menyusul setelah penyusun soal mendukung petunjuk.

Guru memilih sebelum ruang dimulai apakah bantuan aktif. Mode penilaian dapat menonaktifkan semua bantuan; energi reaktor tetap dapat tampil karena tidak memberikan keuntungan. Semua peserta dalam ruang mendapat jenis dan jumlah token yang sama, termasuk peserta yang bergabung ulang. Pemakaian bantuan harus tercatat terpisah dari skor dan jawaban benar.

## Batas implementasi berikutnya

- Pilihan guru dan kuota skill menjadi bagian konfigurasi ruang yang tidak berubah setelah permainan dimulai. Pemakaian token disimpan per peserta dengan operasi atomik dan validasi akses; klik ganda, pengiriman ulang, atau muat ulang tidak boleh memberikan token kedua.
- Skill hanya boleh aktif pada soal yang sedang berlangsung, sebelum jawaban tersimpan. Jawaban yang sudah tersimpan tidak dapat diganti. Kegagalan jaringan tidak boleh menampilkan pemakaian sebagai berhasil tanpa konfirmasi penyimpanan.
- Pengurangan pilihan, petunjuk, perisai kosmetik, dan tambahan waktu merupakan mekanisme berbeda. Jangan menggunakan istilah “bonus” jika tidak ada perubahan skor, atau menyebut progres visual sebagai penguasaan materi.
- Hindari serangan terhadap pemain lain, pengurangan skor lawan, serta hadiah acak yang menentukan hasil. Fokus pada bantuan belajar dan respons visual yang dapat dimatikan.
- Sediakan label Indonesia/Inggris, tombol yang nyaman di layar kecil, navigasi papan ketik, serta status yang tetap terbaca tanpa warna atau animasi. Nama dan teks soal milik guru tidak diterjemahkan secara tebakan.
- Uji dengan emulator dan kondisi koneksi terputus sebelum dipublikasikan. Jangan mengubah Rules produksi untuk melonggarkan validasi skor/waktu. Kuis ini ditujukan untuk latihan kelas; penambahan skill tidak menjadikannya sistem ujian dengan perlindungan kecurangan menyeluruh.
