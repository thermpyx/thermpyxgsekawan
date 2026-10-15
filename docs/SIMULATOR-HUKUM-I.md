# Simulator Hukum I: volume awal dan akhir

Kontrol volume diperbaiki atas izin pengguna. Rumus proses dan siklus animasi tetap digunakan; volume awal dan volume akhir sekarang memiliki kontrol tersendiri. Semua skrip simulator lainnya tetap sama dengan versi ZIP pengguna.

- **Volume Awal / Initial Volume** menentukan kondisi awal V₀ bersama tekanan dan temperatur awal.
- **Volume Akhir V₁ / Final Volume V₁** muncul pada proses isotermal dan adiabatik. Rentang kedua slider 1–5 L. Nilai awal bawaan V₀ = 2 L dan V₁ = 3 L.
- V₁ > V₀ menghasilkan ekspansi; V₁ < V₀ menghasilkan kompresi. Nilai yang sama menghasilkan keadaan tanpa perubahan volume.
- Pada proses isotermal, T tetap dan PV konstan. Kalor sama dengan usaha sehingga ΔU = 0.
- Pada proses adiabatik, Q = 0; PV^γ dan TV^(γ−1) konstan, dengan γ = 1,4. Ekspansi menurunkan temperatur; kompresi menaikkannya.
- Pada proses isobarik/isokhorik, kalor Q tetap menjadi masukan dan volume akhir dihitung oleh model. Slider volume akhir disembunyikan.

Pilih proses dan kondisi awal, atur volume akhir, lalu tekan **Mulai**. Kontrol dikunci selama animasi agar kondisi awal tidak berubah di tengah proses. **Jeda** menghentikan gerak sekaligus membuka kontrol. **Lanjutkan** meneruskan progres yang sama jika kontrol belum diubah. Mengubah kontrol saat jeda menyiapkan percobaan baru dari keadaan awal. **Atur Ulang** mengembalikan keadaan awal tanpa menghapus pilihan slider. Animasi tetap bergerak bolak-balik dengan waktu 2,5 detik per arah.

Penanda keadaan saat ini pada grafik P–V mengikuti persamaan proses pada setiap bingkai. Neraca ΔU = Q − W tetap berlaku, termasuk selama ekspansi dan kompresi.

Validasi: `node qa/test-first-law-volume.cjs` memeriksa empat percobaan ekspansi/kompresi isotermal/adiabatik, kondisi antara, kurva grafik, kontrol, jeda/lanjutkan/atur ulang, bahasa ID/EN, dan lebar layar 320 px. `node qa/test-simulator-design.cjs` memeriksa tipografi, tautan alur belajar, responsivitas, dan tema seluruh halaman simulator. Jalankan situs dengan `python3 -m http.server 8003` sebelum menjalankan pengujian browser.

`qa/simulator-uploaded-source-integrity.json` menyimpan sidik sumber simulator dari ZIP awal. `qa/simulator-source-integrity.json` mencatat satu pengecualian yang diizinkan, yaitu `simulator/js hkm 1/script.js`; uji integritas menolak perubahan tak terduga pada sumber simulator lainnya.
