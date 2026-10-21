# Pembagian Tugas & Rencana Kerja Modul 8 — Kelompok 21

Dokumen ini menjadi panduan kerja terperinci bagi seluruh anggota Kelompok 21 dalam melanjutkan implementasi NeedHelp pada **Modul 8: Data Dinamis & Logika Aplikasi**, setelah fondasi migrasi ke Next.js (App Router) selesai disiapkan oleh Ketua.

---

## 1. Ikhtisar Penugasan Modul 8

Modul 8 menitikberatkan pada transformasi antarmuka web dari tampilan statis Modul 7 menjadi **aplikasi web dua arah (two-way)** yang hidup, interaktif, dan siap diuji oleh pengguna riil pada Modul 9 (Usability Testing).

### Target Utama Modul 8:
1. **Target 1 — Data Dinamis & Filter (Bobot 25%):**
   Bebas hardcode berulang, kartu di-looping menggunakan `.map()`, data terhubung ke sumber terstruktur (JSON/MockAPI/Supabase), serta fitur cari dan filter kategori berfungsi seketika.
2. **Target 2 — Form & Validasi Input (Bobot 25%):**
   Cegah input kosong/salah, pembersihan spasi (`.trim()`), format email/angka divalidasi, pesan error muncul tepat di bawah field, tombol terkunci saat mengirim (*submitting state*), dan data tersimpan nyata.
3. **Target 3 — Skeleton & Toast UX (Bobot 20%):**
   Animasi *loading skeleton* berdenyut saat data dimuat, tampilan kosong (*empty state*) dengan tombol reset pencarian, penanganan error (*try/catch*) yang ramah pengguna, dan notifikasi *toast* halus tanpa menggunakan `alert()` bawaan.
4. **Target 4 — Kerapian Kode, Keamanan .env, & Git Branch (Bobot 15%):**
   Komponen rapi, rahasia/API key disimpan di `.env.local` (tidak boleh masuk Git), commit teratur, dan alur branch/Pull Request disiplin.
5. **Target 5 — Dokumentasi PDF & README (Bobot 15%):**
   README lengkap, panduan skenario yang bisa dicoba mentor, log prompt AI dan perbaikan manual, serta tautan web produksi yang bisa diakses publik.

---

## 2. Rincian Pembagian Tugas Anggota

### A. Zaki Mubarok (Ketua Tim)
**Tanggung Jawab:** Fondasi arsitektur, koordinasi tim, integrasi branch/PR, dan deployment.
- [x] **Selesai:** Migrasi repositori dari HTML statis + Vite ke Next.js App Router (JavaScript).
- [x] **Selesai:** Penyiapan arsitektur folder (`src/app/`, `src/components/`, `src/lib/`, `src/styles/`).
- [x] **Selesai:** Pengarsipan aman kode Modul 7 ke folder `archive/legacy-modul7/`.
- [x] **Selesai:** Penyiapan fondasi reusable components (`ToastProvider`, `Skeleton`, `EmptyState`, `FormField`, `Modal`).
- [ ] **Tugas Lanjutan Modul 8:**
  1. Meninjau dan melakukan merge Pull Request dari anggota ke branch `main`.
  2. Menentukan target hosting (Vercel / Node.js Server / Shared Hosting via Static Export) dan mengeksekusi deployment langsung tanpa membagikan kredensial ke publik.
  3. Memastikan domain dan URL live dapat diakses publik dengan mulus.

---

### B. Felix Nicholas Juan Lee (Logika Data & Form)
**Tanggung Jawab:** Menyelesaikan logika form interaktif, sanitasi, dan integrasi sumber data.
- **Fokus File:** `src/lib/data.js`, `src/lib/validation.js`, `src/app/buat-postingan/page.js`, `src/app/formbantuan/page.js`.
- **Tugas Spesifik:**
  1. **Integrasi Sumber Data (Target 1):**
     - Memilih dan menghubungkan sumber data (pilihan: file JSON statis lokal, MockAPI.io, Supabase, atau Cloudflare D1).
     - Menyiapkan operasi CRUD sederhana (Read data postingan dan Create postingan baru ke API/JSON).
     - Menyiapkan variabel lingkungan di `.env.local` jika menggunakan API eksternal (contoh: `NEXT_PUBLIC_API_URL=...`) dan pastikan `.env.local` masuk ke `.gitignore`.
  2. **Validasi & Sanitasi Form (Target 2):**
     - Memperkuat validasi pada `src/lib/validation.js`: pembersihan `.trim()`, pengecekan batasan karakter, sanitasi XSS sederhana, dan validasi format nomor WhatsApp.
     - Mengunci tombol submit (`disabled={submitting}`) dan mengubah teks tombol menjadi "Mengirim..." saat pengiriman data berlangsung.
     - Memastikan postingan yang dibuat berhasil tersimpan ke sumber data sebelum dialihkan ke halaman sukses.
  3. **Penanganan Error Akses Data:**
     - Mengimplementasikan blok `try/catch` pada setiap operasi pengiriman/pengambilan data dengan pesan error yang manusiawi.

---

### C. Suprihatini (Tampilan & Pengalaman Pengguna / UX)
**Tanggung Jawab:** Memoles antarmuka, fidelitas Figma, responsivitas, dan implementasi UX states.
- **Fokus File:** `src/styles/base.css`, `src/styles/tokens.css`, `src/components/`, `src/app/katalog/page.js`, `src/app/detail-postingan/page.js`.
- **Tugas Spesifik:**
  1. **Penyempurnaan UX States (Target 3):**
     - Memastikan animasi *Loading Skeleton* (`src/components/Skeleton.jsx`) muncul saat katalog atau detail postingan sedang memuat data.
     - Menyempurnakan tampilan *Empty State* (`src/components/EmptyState.jsx`) ketika pencarian tidak menemukan hasil, lengkap dengan ikon dan tombol "Reset Filter".
     - Menyelaraskan pop-up notifikasi *Toast* (`src/components/Toast.jsx`) agar konsisten dengan warna tema Figma pada saat aksi berhasil atau gagal.
  2. **Penyelarasan Tampilan & Fidelitas Figma:**
     - Memeriksa kesesuaian visual setiap rute terhadap frame acuan Figma Modul 5 (*Need-Based Companion - Help FIX*).
     - Menjaga konsistensi warna toska (`#4a9ba0`), background subtle (`#e3fdfd`), radius tombol, dan tipografi Inter.
  3. **Uji Responsivitas Mobile (Layar HP):**
     - Memastikan navigasi hamburger, filter samping di katalog, form input di mobile, dan toast tetap rapi pada lebar layar 360px, 390px, 768px, dan desktop.

---

### D. Arif Raharjo (Pengujian / QA & Dokumentasi)
**Tanggung Jawab:** Pengujian menyeluruh, penulisan laporan QA, dan penyusunan dokumen penyerahan.
- **Fokus File:** `docs/Checklist-QA.md`, `docs/Hasil-Uji-Migrasi.md`, `README.md`, `docs/Log-AI.md`.
- **Tugas Spesifik:**
  1. **Pengujian Fungsional & Form (Target 2 & 4):**
     - Menguji skenario pengisian form kosong, input dengan spasi saja, format email salah, password tidak memenuhi syarat, dan tanggal di masa lalu.
     - Memverifikasi data yang tersimpan tetap ada setelah browser di-*refresh* (*data persistence*).
     - Menguji seluruh skenario alur navigasi dari Beranda → Katalog → Filter/Cari → Detail Postingan → Kirim Pesan / Buat Postingan → Sukses → Aktivitas → Beri Rating.
  2. **Pengujian Geometri & Bebas Overflow:**
     - Memeriksa ke-12 rute halaman pada 5 ukuran lebar layar (360px, 390px, 768px, 1024px, 1440px) untuk memastikan tidak ada *horizontal scroll/overflow*.
  3. **Penyusunan Dokumentasi Pengumpulan (Target 5):**
     - Memperbarui `README.md` dengan panduan langkah uji untuk mentor.
     - Menyusun dokumen laporan PDF penyerahan Modul 8 yang berisi link GitHub publik, link website live yang telah dideploy, bukti tangkapan layar fitur fungsional, dan ringkasan kontribusi anggota.
     - Mendokumentasikan log prompt AI yang digunakan serta catatan perbaikan manual yang dilakukan setiap anggota di `docs/Log-AI.md`.

---

## 3. Alur Kerja Git & Kolaborasi Tim

1. **Branch Utama:**
   - Seluruh pekerjaan migrasi awal berada pada branch `feat/migrasi-nextjs`.
   - Anggota membuat branch baru untuk pekerjaannya dari branch ini:
     - `feat/felix-data-form` (Felix)
     - `feat/suprihatini-ui-ux` (Suprihatini)
     - `feat/arif-qa-docs` (Arif)
2. **Disiplin Commit:**
   - Gunakan pesan commit yang deskriptif (contoh: `feat: integrasikan mockapi pada form postingan`, `fix: perbaiki padding kartu di layar mobile`).
   - Jangan menyertakan folder `.next`, `node_modules`, berkas `.env.local`, atau rahasia API ke dalam commit.
3. **Pull Request (PR):**
   - Ajukan Pull Request ke branch kerja tim sebelum digabungkan ke `main`.
   - Zaki akan mereview, memastikan build lolos (`npm run build`), dan menggabungkan perubahan.
