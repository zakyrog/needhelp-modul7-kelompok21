# Log AI dan perbaikan manual

## Catatan awal â€” Codex, setup ketua

Instruksi pengguna: "sekarang kerjakan bagian saya ketua dan apa saja yg harus saya siapkan contoh link figma".

Sumber: brief Modul 7 dan Figma Final UI node 85:60. Struktur 12 layar dibaca melalui metadata. Detail form login node 110:1615 diekstraksi untuk contoh komponen.

Hasil: fondasi HTML/CSS/JavaScript + Vite berbasis 9 halaman Modul 6; token CSS; form login contoh; simulasi sesi, kembali ke tujuan login, menu mobile, dan modal; PRD awal; README; instruksi anggota.

Perbaikan manual dalam implementasi: mengubah kelas hasil konteks Figma menjadi CSS biasa; menambah validasi dan logika JavaScript; modal memakai dialog native agar Escape/fokus didukung; host development localhost untuk kompatibilitas lingkungan; font lokal; contoh dibatasi ke FormCard karena unduhan dua SVG dekorasi mengembalikan HTML, bukan aset valid.

Keterbatasan: bukan aplikasi final; belum repo publik; belum semua layar; Google/login nyata/pemulihan email belum tersedia. Jangan mencatat starter ini sebagai pekerjaan anggota yang belum mereka lakukan.

## Format entri anggota

- Nama/peran dan tanggal:
- Tool AI:
- Prompt asli:
- File/fitur yang dihasilkan:
- Masalah yang ditemukan:
- Perbaikan manual:
- Cara dan hasil pengujian:
- Commit/PR terkait:

## Contoh prompt lanjutan â€” belum digunakan

"Implementasikan tampilan katalog Saya Butuh dari Figma node 110:1835 pada fondasi HTML/CSS/JavaScript + Vite berbasis 9 halaman Modul 6 ini. Gunakan token di assets/css/tokens.css dan komponen yang sudah tersedia. Pisahkan logika filter di assets/js/ dari markup dan CSS. Pertahankan warna, hierarki, konten dan proporsi Figma serta layout responsif. Catat aset yang dibutuhkan dan bagian yang belum tersedia."

Contoh di atas adalah saran untuk tim; bukan riwayat prompt yang telah dijalankan.

## Penyesuaian setelah dokumen sebelumnya diterima

Membaca problem statement Modul 1, PDF user flow, gambar flow, dan seluruh inventaris ZIP Modul 6. Mengubah fondasi yang semula dicoba dengan React menjadi kelanjutan HTML lama. Mengoreksi alur masuk awal menjadi beranda publik. Mempertahankan Prompt-Modul6.md sebagai sumber lama tanpa mengklaim validasi W3C baru. Mencatat perbedaan 5 nama lama vs 4 orang tim sekarang, rating lama vs 12 frame Figma, alamat Gubeng, dan backend POST yang belum tersedia.


---

## Catatan Pengerjaan Anggota â€” Felix Nicholas Juan Lee (Logika Data & Form)

- **Nama / Peran:** Felix Nicholas Juan Lee â€” Data Dinamis & Form (Kelompok 21)
- **Tanggal:** 24 Oktober 2026
- **Tool AI:** Antigravity (Advanced Agentic AI)
- **Prompt asli:**
  > "saya ingin mengerjakan tugas felix tolong kerjakan bagian tugas felix" (dengan acuan panduan PDF Penugasan Modul 8 / Next.js NeedHelp Kelompok 21)
- **File & Fitur yang Dihasilkan / Dimodifikasi:**
  1. `public/data/posts.json` & `src/data/posts.js`: Pemisahan data seed awal menjadi berkas JSON eksternal yang dapat diubah dan dibaca dinamis.
  2. `src/app/api/posts/route.js`: Endpoint API Next.js `/api/posts` (GET & POST) untuk akses data postingan.
  3. `src/lib/data.js`: Penambahan `fetchPosts()`, `fetchPublicPosts()`, `fetchSeedPosts()`, pembacaan dinamis dengan `cache: "no-store"`, pembuatan ID unik anti-tabrakan, dan dukungan simulasi error terkontrol (QA-06).
  4. `src/lib/validation.js`: Validasi ketat `.trim()`, pengecekan rentang karakter (judul, deskripsi, alamat), validasi tanggal tidak boleh masa lalu (`< localToday`), validasi nominal tarif positif finite, sanitasi string anti-XSS, dan validasi format nomor WhatsApp Indonesia.
  5. `src/app/katalog/page.js`: Integrasi loading state (`SkeletonList`), error state (`ErrorState` dengan tombol "Coba Lagi"), filter multi-kategori, lokasi, sistem kompensasi, pagination ter-clamp, dan empty state dengan tombol "Bersihkan Filter".
  6. `src/app/buat-postingan/page.js`: Penguncian tombol submit saat proses (`disabled={submitting}`, teks "Menerbitkan..."), pencegahan klik ganda (*double-submit*), preservasi data isian jika simpan gagal, toast sukses/gagal, dan pengalihan ke halaman sukses.
  7. `src/app/formbantuan/page.js`: Penambahan validasi WhatsApp, sanitasi pesan, dan tombol locking saat pengiriman.
- **Masalah yang Ditemukan:**
  - Sebelumnya data postingan masih di-hardcode di `src/lib/data.js` tanpa pemisahan berkas JSON dinamis.
  - Form sebelumnya belum memiliki mekanisme penguncian kirim ganda (*rapid double click*) dan belum ada penanganan retry saat gagal simpan.
  - Parameter pagination di katalog sebelumnya berpotensi menyisakan halaman kosong jika filter mengubah jumlah item secara drastis saat pengguna berada di halaman belakang.
- **Perbaikan Manual:**
  - Menyelaraskan kontrak props antara komponen UX Tini dan logika Felix (`loading`, `error`, `submitting`, `onReset`, `onRetry`).
  - Menambahkan mekanisme pengujian error terkontrol via parameter query URL `?simulate_error=1` untuk mempermudah QA Arif menguji alur retry tanpa merusak data produksi.
  - Memastikan tanggal dihitung berdasarkan zona waktu lokal peramban (`toLocaleDateString('en-CA')`) bukan UTC mentah.
- **Cara dan Hasil Pengujian:**
  - Menjalankan skrip pengujian Node.js untuk validasi form kosong, spasi saja, tanggal lampau, nominal tidak valid, dan form valid: Semua lolos.
  - Menjalankan `npm run lint`: 0 error, 0 warning.
  - Menjalankan `npm run build`: Kompilasi sukses untuk seluruh 18 rute halaman & API.

---

## Catatan Pengerjaan Anggota â€” Arif Raharjo (QA & Dokumentasi)

- **Nama / Peran:** Arif Raharjo â€” QA Testing & Dokumentasi (Kelompok 21)
- **Tanggal:** 25 Oktober 2026
- **Tool AI:** Claude Code (CLI) dengan agent-browser untuk automated testing
- **Prompt asli:**
  > "Saya sedang menyelesaikan tugas QA dan deployment untuk proyek NeedHelp Modul 8. Branch aktif: chore/modul8-arif-qa-deploy. Tanggung jawab saya: 1. Menguji skenario form dan alur end-to-end. 2. Memastikan aplikasi bebas dari horizontal overflow. 3. Menyusun laporan PDF untuk pengumpulan. 4. Melengkapi log prompt AI."

  Prompt dilanjutkan dengan instruksi terperinci untuk audit proyek, pembaruan QA_REPORT_MODUL8.md, pemeriksaan horizontal overflow, pembuatan laporan PDF, dan verifikasi dokumentasi akhir.

- **File & Fitur yang Dihasilkan / Dimodifikasi:**
  1. `QA_REPORT_MODUL8.md`: Laporan QA lengkap dengan 30 test case (27 automated + 3 manual verification). Semua test case PASS.
  2. `docs/Log-AI.md`: Penambahan entri log prompt AI untuk pekerjaan QA dan dokumentasi.
  3. `Laporan_QA_Modul8.pdf`: Laporan PDF final untuk pengumpulan (dalam proses pembuatan).
  4. Verifikasi manual untuk 3 test case yang tidak dapat diotomasi: TC-HYD-04, TC-FORM-05, TC-UI-06.

- **Masalah yang Ditemukan:**
  - Agent-browser tidak dapat mengontrol React controlled inputs (date/time picker) karena memerlukan synthetic events.
  - Agent-browser tidak mendukung viewport emulation command untuk pengujian responsivitas otomatis.
  - Karakter encoding rusak pada laporan awal (Ã¢Å“â€¦, Ã¢Å¡ Ã¯Â¸, Ã¢â€º") perlu diperbaiki menjadi emoji Unicode yang benar.

- **Perbaikan Manual:**
  - Melakukan verifikasi manual untuk 3 test case yang tidak dapat diotomasi (TC-HYD-04, TC-FORM-05, TC-UI-06).
  - Memperbaiki seluruh karakter encoding yang rusak di QA_REPORT_MODUL8.md.
  - Memperbarui statistik laporan menjadi 30 PASS, 0 FAILED, 0 BLOCKED setelah konfirmasi manual.
  - Memastikan konsistensi antara executive summary, tabel statistik, caveats, recommendations, dan sign-off.

- **Cara dan Hasil Pengujian:**
  - **Automated Testing (27 test cases):** Menggunakan agent-browser untuk navigasi, validasi form, pencarian, filter, pemeriksaan console errors, dan inspeksi CSS.
  - **Manual Verification (3 test cases):**
    - TC-HYD-04: Membuat postingan baru via form dengan date/time picker, kemudian hard reload homepage. Tidak ada hydration error.
    - TC-FORM-05: Mengisi seluruh field form termasuk date/time, submit form. Postingan berhasil tersimpan dan muncul di katalog.
    - TC-UI-06: Menguji layout responsif menggunakan browser DevTools responsive mode pada berbagai viewport (360px, 390px, 768px, 1440px). Tidak ada horizontal overflow.
  - **Hasil Akhir:** 30 PASS, 0 FAILED, 0 BLOCKED/NOT TESTED.

- **Commit/PR terkait:**
  - Branch: `chore/modul8-arif-qa-deploy`
  - Status: Dalam proses review untuk merge ke main

### Ringkasan Prompt Tambahan (Rekonstruksi)

Berikut adalah ringkasan prompt yang digunakan selama sesi QA, direkonstruksi berdasarkan artefak proyek yang tersedia:

1. **Prompt Audit Proyek:**
   - Tujuan: Memeriksa struktur folder, dokumen yang tersedia, konsistensi, dan bukti pengujian.
   - File terkait: QA_REPORT_MODUL8.md, README.md, docs/Pembagian-Tugas-Modul8.md, docs/Checklist-QA.md
   - Hasil: Identifikasi 3 test case yang perlu verifikasi manual, karakter encoding yang rusak, dan statistik yang tidak konsisten.

2. **Prompt Pembaruan QA Report:**
   - Tujuan: Memperbarui status TC-HYD-04, TC-FORM-05, TC-UI-06 menjadi PASS berdasarkan verifikasi manual.
   - File terkait: QA_REPORT_MODUL8.md
   - Hasil: Laporan diperbarui dengan statistik 30 PASS, 0 FAILED, 0 BLOCKED. Encoding karakter diperbaiki.

3. **Prompt Pemeriksaan Horizontal Overflow:**
   - Tujuan: Memastikan aplikasi bebas horizontal overflow di berbagai viewport.
   - Metode: Inspeksi CSS media queries dan verifikasi manual dengan browser DevTools.
   - Hasil: Konfirmasi manual bahwa layout responsif tanpa horizontal overflow.

4. **Prompt Pembuatan Laporan PDF:**
   - Tujuan: Menyusun laporan PDF final untuk pengumpulan Modul 8.
   - Sumber: QA_REPORT_MODUL8.md, README.md, docs/Pembagian-Tugas-Modul8.md
   - Status: Dalam proses pembuatan.

**Catatan:** Prompt historis di atas adalah ringkasan rekonstruksi berdasarkan artefak proyek dan hasil yang terverifikasi. Bukan transkrip literal dari percakapan AI.
