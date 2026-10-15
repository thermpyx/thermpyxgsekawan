# THERMPYX — Materi Teori Diperluas

Buka index.html atau jalankan proyek dengan server statis sesuai alur penggunaan sebelumnya. Pilih menu Theory, buka topik, lalu klik “Baca pembahasan lengkap”. Materi tambahan tertanam langsung dalam HTML dan tidak memerlukan JavaScript untuk menampilkan isi Bahasa Indonesia. Dengan JavaScript aktif, pilihan ID/EN menerjemahkan seluruh pembahasan dan contoh soal.

## Cakupan revisi

- Tujuh halaman utama teori diperluas; halaman laws.html diberi indeks ke semua topik.
- Total 35 contoh soal tambahan, masing-masing berisi soal, data dan asumsi, langkah hitung, jawaban, dan makna hasil.
- Teori mencakup penjelasan konseptual, rumus, arti variabel, satuan, serta batas penggunaan.
- Materi tambahan memiliki terjemahan Indonesia/Inggris tertulis untuk konsep, tujuan, judul, variabel, asumsi, langkah penyelesaian, jawaban, makna hasil, dan aksesibilitas. Rumus serta data numerik dipertahankan.
- Terjemahan dimuat dari `js/i18n-dictionary.js` oleh pengaturan bahasa yang sama dengan antarmuka aplikasi; tidak memakai layanan penerjemahan eksternal.

## Konvensi materi

Q positif = kalor masuk sistem; W positif = usaha oleh sistem; ΔU = Q − W untuk sistem tertutup ketika perubahan energi kinetik dan potensial diabaikan. Pada mesin kalor, Qh dan Qc merupakan besar kalor positif. Suhu dalam rasio termodinamika memakai kelvin. Kalor jenis air pada contoh tambahan dibulatkan menjadi 4.200 J/(kg·K); nilai 4.186 yang digunakan dalam contoh awal juga merupakan pendekatan sah.

## Cara belajar

1. Baca tujuan dan konsep sebelum melihat rumus.
2. Periksa kondisi berlakunya setiap persamaan.
3. Kerjakan contoh tanpa melihat penyelesaian, lalu cocokkan tahap dan satuannya.
4. Gunakan simulator serta kalkulator yang telah tersedia untuk bereksperimen dengan nilai berbeda.

Materi disusun untuk pembelajaran pengantar; model ideal dan pendekatan setiap soal dituliskan pada pembahasannya.

## Aturan untuk penambahan materi berikutnya

1. Tulis teks Indonesia dan Inggris yang setara sejak awal. Untuk label singkat tanpa markup rumus, gunakan `data-id` dan `data-en`; untuk paragraf atau teks dengan penekanan inline, tambahkan pasangan pada bagian `Complete theory chapters` di `js/i18n-dictionary.js`. Setiap potongan teks di antara elemen inline memerlukan pasangan sendiri.
2. Jangan menambahkan `data-tpx-no-translate` atau `lang="id"` pada keseluruhan bab atau blok materi. Penanda pengecualian hanya sesuai untuk konten yang memang harus dipertahankan, misalnya kata kunci pencarian video berbahasa tertentu atau materi buatan pengguna.
3. Pertahankan rumus, nilai, satuan, dan konvensi tanda saat menerjemahkan. Pengenal seperti `Cwadah` adalah simbol rumus yang dijelaskan di kedua bahasa; jangan mengganti nama simbol hanya pada salah satu rumus.
4. Jalankan `node --test qa/test-i18n.cjs` dan, saat server statis berjalan di port 8003, `node qa/test-theory-material.cjs`. Suite browser memeriksa cakupan terjemahan setiap bab, 35 contoh soal, perpindahan bahasa berulang, tautan bagian, keyboard, serta tata letak pada layar 320 dan 1440 piksel.
5. Pada browser, `TPX.auditTranslations(document.getElementById('materi-lengkap')).uncovered` harus kosong. Teks baru yang belum diterjemahkan akan muncul di hasil audit. Perbarui daftar bab dan ekspektasi pengujian bila menambah topik baru.
