# Log AI dan perbaikan manual

## Catatan awal — Codex, setup ketua

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

## Contoh prompt lanjutan — belum digunakan

"Implementasikan tampilan katalog Saya Butuh dari Figma node 110:1835 pada fondasi HTML/CSS/JavaScript + Vite berbasis 9 halaman Modul 6 ini. Gunakan token di assets/css/tokens.css dan komponen yang sudah tersedia. Pisahkan logika filter di assets/js/ dari markup dan CSS. Pertahankan warna, hierarki, konten dan proporsi Figma serta layout responsif. Catat aset yang dibutuhkan dan bagian yang belum tersedia."

Contoh di atas adalah saran untuk tim; bukan riwayat prompt yang telah dijalankan.

## Penyesuaian setelah dokumen sebelumnya diterima

Membaca problem statement Modul 1, PDF user flow, gambar flow, dan seluruh inventaris ZIP Modul 6. Mengubah fondasi yang semula dicoba dengan React menjadi kelanjutan HTML lama. Mengoreksi alur masuk awal menjadi beranda publik. Mempertahankan Prompt-Modul6.md sebagai sumber lama tanpa mengklaim validasi W3C baru. Mencatat perbedaan 5 nama lama vs 4 orang tim sekarang, rating lama vs 12 frame Figma, alamat Gubeng, dan backend POST yang belum tersedia.


---

## Catatan Pengerjaan Anggota — Felix Nicholas Juan Lee (Logika Data & Form)

- **Nama / Peran:** Felix Nicholas Juan Lee — Data Dinamis & Form (Kelompok 21)
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
