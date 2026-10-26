# Dokumen Serah Terima (HANDOFF) — NeedHelp Jogja
**Proyek:** NeedHelp Jogja (Kelompok 21 / Modul 8 Upgrade)  
**Cabang Git:** `feat/phase-2-ui-features`  
**Waktu Pembaruan:** 26 Oktober 2026, 12:38 WIB  
**Status Sesi Mandiri:** Selesai & Terverifikasi Penuh (Revisi Total Beranda Acuan Gambar Referensi: Layout 2-Kolom Terpusat, Sidebar Navigasi & Kartu Keamanan Terpisah, Dua Pintu Setara "Apa yang ingin kamu lakukan?", Kontrol Filter Beranda & Post Feed Card Baru, serta 19 Tangkapan Layar Multi-Resolusi)

---

## 1. Perubahan yang Benar-Benar Selesai

Pada sesi ini, telah diselesaikan implementasi komprehensif mengikuti gambar referensi beranda desktop:

### A. Transformasi Tata Letak 2-Kolom Terpusat (Tanpa Panel Kanan Permanen)
* **Kontainer & Proporsi Layar ([`src/styles/three-column.css`](file:///C:/needhelp-modul7-kelompok21-main/src/styles/three-column.css)):**
  * Kontainer utama terpusat dengan `max-width: 1240px` (rentang ideal 1200–1280px), padding `0 20px`, margin `24px auto`.
  * Lebar sidebar desktop tepat `268px` (`flex: 0 0 268px`) dengan jarak pemisah `24px` (`gap: 24px`).
  * Area konten utama feed mengambil seluruh sisa ruang secara fleksibel (`flex: 1 1 0%`, `min-width: 0`).
  * Panel kanan permanen telah dihilangkan dari tata letak beranda. Informasi pendukungnya dipindahkan ke tempat yang semestinya (kartu keamanan ke sidebar kiri, wilayah ke filter dropdown, dan footer ke bawah sidebar).
  * Sidebar bersifat sticky halus dengan offset header: `top: calc(var(--header-height) + 20px)` dan tinggi alami tanpa memaksa mengikuti panjang feed.

### B. Header / Navbar Minimalis Bersih Acuan Referensi
* **Komposisi 1 Baris Seimbang ([`src/components/Header.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/Header.jsx)):**
  * Sisi Kiri: Logo resmi NeedHelp Jogja.
  * Sisi Tengah: Kolom pencarian pill-shaped (`border-radius: 9999px`, latar `#f8fafc`, placeholder transparan `"Cari bantuan atau keahlian di Yogyakarta..."`).
  * Sisi Kanan: Ikon tombol Pesan (`💬` ke `/chat`), ikon tombol Notifikasi (`🔔` ke `/notifikasi` dengan dot merah penanda belum dibaca), dan Menu Akun Popover (Avatar inisial, nama pendek terpotong rapi dengan ellipsis, dan panah `▾`).
  * Tombol Keluar terintegrasi di dalam dropdown akun, dapat diakses dan ditutup dengan keyboard (`Escape`) atau klik di luar area.
  * Pada layar mobile (< 768px), tombol menu hamburger tetap menyediakan drawer navigasi penuh.

### C. Sidebar Kiri: Kartu Profil/Navigasi & Kartu Keamanan Terpisah ([`src/components/AppSidebar.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/AppSidebar.jsx))
* **Kartu 1 (Profil & Navigasi Utama):**
  * Ringkasan profil ringkas di bagian atas: Avatar lingkaran inisial warna toska, nama tebal (`sewididu` / pengguna asli), dan subtitle (`Warga Yogyakarta`).
  * Daftar 5 rute navigasi utama:
    1. **🏠 Beranda** (`/`) &mdash; berstatus aktif dengan latar toska lembut `#e6f4f1` dan teks toska gelap `#0d9488`.
    2. **🔍 Feed & Cari** (`/katalog`)
    3. **📄 Aktivitas** (`/aktivitas`)
    4. **💬 Pesan** (`/chat`)
    5. **👤 Profil Saya** (`/profil`)
  * Tinggi area klik 48px, teks 15-16px, ikon garis 22px, padding nyaman 16-18px.
* **Kartu 2 (Bantu dengan Aman &mdash; Terpisah 16px):**
  * Ikon perisai centang warna toska, judul tebal **Bantu dengan aman**, deskripsi *"Pilih tempat umum untuk bertemu. Gunakan kesepakatan di chat."*
  * Tombol interaktif **`Lihat panduan →`** yang membuka modal dialog popup berisi 3 prinsip aman (titik temu publik, kartu chat, konfirmasi bersama).
* **Footer Micro Links:**
  * Di bawah kartu kedua: `Bantuan • Privasi • Ketentuan` dalam teks abu-abu lembut.

### D. Area Buat Posting: "Apa yang ingin kamu lakukan?" ([`src/components/QuickPostBox.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/QuickPostBox.jsx))
* Menghilangkan bentuk input teks semu/palsu.
* Menampilkan kartu ringkas berisi dua pilihan aksi sejajar (*side-by-side* di desktop, bertumpuk di ponsel):
  1. **Saya Butuh Bantuan:** Latar lembut merah/rose (`#fff1f2`), garis batas merah pudar (`#fecdd3`), ikon tangan melambai (`✋`), judul tebal **Saya Butuh Bantuan**, subjudul *"Ceritakan kebutuhanmu"*, dan tombol lingkaran panah kanan `→`.
  2. **Saya Bisa Membantu:** Latar lembut hijau/mint (`#f0fdf4`), garis batas hijau pudar (`#bbf7d0`), ikon tangan merengkuh (`🤲`), judul tebal **Saya Bisa Membantu**, subjudul *"Tawarkan kemampuanmu"*, dan tombol lingkaran panah kanan `→`.
* Kedua kartu dapat diklik sepenuhnya, memiliki efek hover halus, focus-ring jelas, dan terhubung langsung ke formulir dengan prefill nature (`/buat-postingan?nature=butuh` & `nature=bisa`).

### E. Kontrol Filter Beranda & Dropdown Pengurutan ([`src/app/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/page.js))
* **Baris Pertama:**
  * Sisi kiri: Tab pill `Semua`, `Saya Butuh`, dan `Saya Bisa` (dengan state aktif toska/merah/hijau).
  * Sisi kanan: Dropdown pill `[Terbaru ▾]` (opsi: Terbaru, Terlama, Tenggat Terdekat) serta tombol `[⚙️ Filter]` dengan indikator titik dot aktif.
* **Baris Kedua:**
  * Sisi kiri: 4 Kategori utama berbentuk chip pill (`📦 Bantuan Fisik`, `👥 Ditemani`, `📋 Pendampingan`, `🧭 Explore`) yang dapat diaktifkan/dinonaktifkan secara instan.
  * Sisi kanan: Dropdown pill `[📍 Semua wilayah ▾]` (Sleman, Kota Jogja, Bantul, Kulon Progo, Gunungkidul).
* **Drawer Filter Tambahan:** Memuat input pencarian kata kunci judul/lokasi dan tombol `✕ Reset Seluruh Filter`.

### F. Kartu Postingan Feed yang Disempurnakan ([`src/components/CatalogCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/CatalogCard.jsx))
* Mengikuti anatomi gambar referensi:
  1. Baris atas: Avatar inisial (`W` toska atau `N` slate), nama pembuat (misal `Warga Jogja`), titik pemisah, nama wilayah (`Sleman`), titik pemisah, waktu relatif publikasi (`2 jam lalu`, `1 hari lalu` via helper `formatRelativeTime`).
  2. Lencana jenis & kategori: `Saya Butuh` (merah muda) / `Saya Bisa` (hijau muda) berdampingan dengan `Bantuan Fisik` / kategori terkait.
  3. Judul kebutuhan atau penawaran tebal terbaca jernih.
  4. Ringkasan deskripsi (teks ~15px, jarak baris 1.55 yang nyaman).
  5. Baris metadata kegiatan: `📍 Titik Lokasi`, `📅 Jadwal Kegiatan`, `🏷️ Nominal/Jenis Imbalan`.
  6. Bagian bawah: Sisi kiri memuat informasi kuota (`👥 Dibutuhkan 1 orang`) atau panduan chat (`💬 Diskusikan kebutuhan lewat chat`), sisi kanan memuat tombol solid toska **`Lihat detail →`**.
* Seluruh data menggunakan data asli aplikasi/database tanpa menanam data palsu.

---

## 2. Halaman & Viewport yang Sudah Diperiksa Secara Visual

Tangkapan layar resolusi tinggi disimpan pada folder [`docs/screenshots/`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/):

| Viewport & Halaman | Berkas Tangkapan Layar | Hasil Pemeriksaan Visual |
|---|---|---|
| **Beranda Desktop (1440px)** | [`docs/screenshots/01-desktop-1440-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1440-beranda.png) | **Sempurna sesuai gambar referensi:** 2 kolom, navbar 1 baris, sidebar dengan menu aktif & kartu keamanan terpisah, kartu dua pintu merah/hijau, 4 kategori chip & wilayah dropdown, feed kartu baru. |
| **Beranda Desktop (1280px)** | [`docs/screenshots/01-desktop-1280-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1280-beranda.png) | Komposisi tetap stabil dalam batas kontainer 1240px tanpa desak-desakan. |
| **Beranda Desktop Zoom 125% (1152px)** | [`docs/screenshots/01-desktop-1152-zoom125-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1152-zoom125-beranda.png) | Tidak ada elemen bertumpuk atau keluar wadah pada skala zoom desktop 125%. |
| **Tablet Beranda (1024px)** | [`docs/screenshots/07-tablet-1024-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/07-tablet-1024-beranda.png) | Sidebar 240px adaptif, feed tetap luas dan proporsional. |
| **Tablet Beranda (768px)** | [`docs/screenshots/07-tablet-768-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/07-tablet-768-beranda.png) | Susunan 1 kolom, feed dan kartu buat posting menjadi fokus di atas, navigasi bawah aktif. |
| **Mobile Beranda (390px)** | [`docs/screenshots/09-mobile-390-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/09-mobile-390-beranda.png) | Kolom tunggal, kartu dua pintu tersusun vertikal ergonomis, chip kategori adaptif, tombol navigasi bawah tetap (*Mobile Bottom Nav*). |
| **Katalog Desktop (1440px)** | [`docs/screenshots/02-desktop-1440-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1440-katalog.png) | Layout 2-kolom terintegrasi selaras dengan kartu postingan baru. |
| **Chat Desktop (1440px)** | [`docs/screenshots/04-desktop-1440-chat.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/04-desktop-1440-chat.png) | Halaman pesan berfungsi normal. |
| **Profil Desktop (1440px)** | [`docs/screenshots/06-desktop-1440-profil.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/06-desktop-1440-profil.png) | Layout 2-kolom sidebar profil selaras. |
  * Menggantinya dengan kartu informasi fitur riil: **5 Kab/Kota DIY**, **2 Arah (Saya Butuh & Saya Bisa)**, dan **Kesepakatan Bersama**.
  * Menambahkan banner pemberitahuan redirect kontekstual (`🔒 Silakan masuk atau daftar akun terlebih dahulu untuk melanjutkan ke halaman yang Anda tuju`).
* **Penghapusan Indikator Palsu di Chat ([`src/app/chat/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/chat/page.js)):**
  * Menghilangkan green pulsing dot dan label palsu `Online • Terverifikasi Komunitas`.
  * Menggantinya dengan status kontekstual yang sah: `💬 Obrolan Langsung • Anggota NeedHelp Jogja`.

### E. Mode Pratinjau UI Privat Terisolasi & Berlabel ([`src/app/dev-preview/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/dev-preview/page.js))
* Membangun rute pengujian visual khusus `/dev-preview` yang memenuhi 4 syarat ketat dari pengguna:
  1. **Terpisah:** Rute mandiri di luar rute utama aplikasi.
  2. **Nonaktif secara default:** Hanya dapat diakses dengan parameter otorisasi eksplisit `?enable=1`.
  3. **Berlabel tegas:** Menampilkan banner kuning di atas halaman bertuliskan `⚠️ PRATINJAU UI LOKAL BERLABEL: Seluruh mutasi hanya berjalan di memori peramban tanpa koneksi tulis ke Supabase`.
  4. **Tanpa mutasi database:** Formulir divalidasi dengan logika `validatePost` asli, namun aksi submit hanya memicu feedback lokal tanpa mengirim mutasi ke Supabase.
* Menyediakan pratinjau visual lengkap untuk 3 halaman privat:
  * Form Buat Postingan (`?view=buat-postingan`) dengan dua pintu setara (Saya Butuh vs Saya Bisa), 4 kategori, 5 wilayah DIY, dan 6 opsi imbalan.
  * Dashboard Aktivitas (`?view=aktivitas`) dengan tab status, detail titik temu, dan simulasi konfirmasi selesai dua pihak.
  * Formulir Rating (`?view=rating`) dengan selektor 1-5 bintang interaktif dan validasi ulasan 10-500 karakter.

---

## 2. Halaman yang Sudah Diperiksa Secara Visual

Semua halaman telah diperiksa secara visual melalui tangkapan layar Chrome Headless beresolusi tinggi (disimpan di folder [`docs/screenshots/`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/)):

| Halaman & Viewport | Berkas Tangkapan Layar | Hasil Pemeriksaan Visual |
|---|---|---|
| **Beranda Desktop (1440px)** | [`docs/screenshots/01-desktop-1440-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1440-beranda.png) | 3-kolom simetris, intro 4 kategori ringkas, QuickPostBox setara, feed cards dengan badge jujur `⭐ Anggota Baru`. Header bersih satu baris. |
| **Beranda Desktop Zoom 125% (1152px)** | [`docs/screenshots/01-desktop-1152-zoom125-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1152-zoom125-beranda.png) | Header tidak bertumpuk atau tumpah pada resolusi 1152px/zoom 125%. |
| **Katalog Desktop (1440px)** | [`docs/screenshots/02-desktop-1440-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1440-katalog.png) | Kolom tengah membentang penuh 100%, QuickPostBox dan panel filter 4-baris tersusun rapi, dropdown wilayah & imbalan simetris. |
| **Katalog Desktop (1280px)** | [`docs/screenshots/02-desktop-1280-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1280-katalog.png) | Header navbar dan panel filter tetap pas dalam batas lebar layar 1280px. |
| **Katalog Desktop Zoom 125% (1152px)** | [`docs/screenshots/02-desktop-1152-zoom125-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1152-zoom125-katalog.png) | Seluruh elemen header, quick post, dan filter panel berada di dalam wadah tanpa spillover. |
| **Chat Desktop (1440px)** | [`docs/screenshots/04-desktop-1440-chat.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/04-desktop-1440-chat.png) | Sidebar thread kontak, bubble chat toska Jogja, banner konteks bantuan, tanpa green dot atau badge palsu. |
| **Profil Desktop (1440px)** | [`docs/screenshots/06-desktop-1440-profil.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/06-desktop-1440-profil.png) | Empty state terstruktur ramah pengguna saat sesi tamu belum login. |
| **Proteksi Buat Post (1440px)** | [`docs/screenshots/03-desktop-1440-buat-postingan-unauth.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/03-desktop-1440-buat-postingan-unauth.png) | Terbukti diarahkan oleh middleware ke `/login?next=...` dengan alert hijau penjelas. |
| **Proteksi Aktivitas (1440px)** | [`docs/screenshots/05-desktop-1440-aktivitas-unauth.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/05-desktop-1440-aktivitas-unauth.png) | Terbukti diarahkan oleh middleware ke `/login?next=...`. |
| **Pratinjau Form Post (1440px)** | [`docs/screenshots/03-desktop-1440-buat-postingan-preview.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/03-desktop-1440-buat-postingan-preview.png) | Banner pratinjau aktif, dua pintu setara merah/hijau, 4 kategori, 5 wilayah DIY, input tanggal, imbalan, dan kuota. |
| **Pratinjau Aktivitas (1440px)** | [`docs/screenshots/05-desktop-1440-aktivitas-preview.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/05-desktop-1440-aktivitas-preview.png) | Kartu status Terjadwal/Selesai/Batal, status konfirmasi kamu/mitra, tombol konfirmasi selesai dan beri ulasan. |
| **Pratinjau Rating (1440px)** | [`docs/screenshots/12-desktop-1440-rating-preview.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/12-desktop-1440-rating-preview.png) | Selektor bintang 1-5 interaktif warna kuning amber, area ulasan dengan indikator karakter minimal 10. |
| **Tablet Beranda (1024px)** | [`docs/screenshots/07-tablet-1024-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/07-tablet-1024-beranda.png) | Tata letak 2-kolom responsif, kolom kanan tips disembunyikan rapi tanpa horizontal scroll. |
| **Tablet Katalog (1024px)** | [`docs/screenshots/08-tablet-1024-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/08-tablet-1024-katalog.png) | Kontrol panel katalog adaptif, navbar proporsional dengan kolom pencarian fleksibel. |
| **Mobile Beranda (390px)** | [`docs/screenshots/09-mobile-390-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/09-mobile-390-beranda.png) | Kolom tunggal, grid 2x2 kategori, tombol navigasi bawah tetap (*Mobile Bottom Nav*). |
| **Mobile Katalog (390px)** | [`docs/screenshots/10-mobile-390-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/10-mobile-390-katalog.png) | Filter bertumpuk ergonomis untuk sentuhan jari ponsel. |
| **Mobile Form Preview (390px)** | [`docs/screenshots/11-mobile-390-buat-postingan-preview.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/11-mobile-390-buat-postingan-preview.png) | Seluruh input formulir pas dengan lebar 390px tanpa terpotong. |

---

## 3. Hasil Lint, Build, dan Pengujian yang Dijalankan

* **ESLint (`npm run lint`):** **LULUS (0 Error, 0 Warning)** pada seluruh direktori `src`.
* **Kompilasi Next.js (`npm run build`):** **LULUS (20 dari 20 rute terkompilasi statis + middleware dalam 6.4 detik)**.
* **Pengujian Tangkapan Layar Otomatis (`scripts/capture-screenshots.mjs`):** **14 berkas tangkapan layar berhasil dibuat** via Chrome Headless v1440, v1024, dan v390.

---

## 4. Integrasi atau Pengujian yang Belum Terverifikasi

* **Pengujian Otomatis 23 Skenario Multi-User ([`scripts/test-suite.mjs`](file:///C:/needhelp-modul7-kelompok21-main/scripts/test-suite.mjs)):**
  * Skenario 1 - 23 mencakup otorisasi RLS, penolakan anonim, atomic agreement RPC, dan trigger recalculate user rating.
  * **Status:** Belum dijalankan karena menunggu Anda memasukkan kredensial 2 akun pengujian nyata ke `.test-credentials.local.json`.

---

## 5. Masalah Tersisa Berdasarkan Prioritas

1. **Prioritas Tinggi (Menunggu Kredensial Nyata):**
   * Verifikasi end-to-end multi-akun Supabase nyata via terminal (`node scripts/test-suite.mjs`).
2. **Prioritas Menengah (Penyempurnaan Polish Realtime Chat):**
   * Pengujian pertukaran pesan instan secara live antara Browser Chrome (Akun A) dan Browser Edge/Firefox (Akun B) untuk melihat kartu kesepakatan berubah status dari `diajukan` menjadi `disepakati` secara otomatis tanpa refresh.
3. **Prioritas Rendah (Backlog):**
   * Penambahan avatar upload kustom (saat ini menggunakan avatar inisial nama).

---

## 6. Riwayat Commit dan Cara Menjalankan

### Riwayat Commit Sesi Ini:
1. `18c6f47`: *refactor(ui): align RPC naming, eliminate fake ratings/badges, and truthify login/profile displays*
2. `3ab6612`: *style(feed): replace oversized banner with compact 4-category intro card and clean catalog labeling*
3. `da9850d`: *feat(preview): add isolated labeled local dev preview for private forms, activities, and ratings*
4. `9819613`: *fix(layout): neutralize legacy catalog CSS overrides, enforce center column flex width, and capture full visual verification suite*
5. `0bd7dc1`: *fix(ui): polish header navbar dropdown and catalog filter panel 4-row layout*
6. `feat/phase-2-ui-features`: *feat(ui): redesign homepage into 2-column layout matching reference design with modern feed and sidebar*

### Cara Menjalankan Aplikasi:
* Menjalankan server lokal: `npm run dev` (buka [http://localhost:3000](http://localhost:3000)).
* Menjalankan build produksi: `npm run build` dilanjutkan `npm run start`.
* Membuka mode pratinjau UI lokal berlabel: [http://localhost:3000/dev-preview?enable=1&view=buat-postingan](http://localhost:3000/dev-preview?enable=1&view=buat-postingan).
* Menjalankan pengambilan tangkapan layar otomatis: `node scripts/capture-screenshots.mjs`.

---

## 7. Tiga Langkah Paling Penting untuk Anda Setelah Kembali

1. **Buat 2 Akun Pengujian di Supabase:**
   * Buka browser di [http://localhost:3000/login](http://localhost:3000/login) (tab Daftar Akun Baru) atau langsung lewat Supabase Dashboard > Authentication > Users (klik *Add User*, centang *Auto Confirm User* agar tidak perlu konfirmasi email).
2. **Isi Berkas `.test-credentials.local.json`:**
   * Salin dari berkas contoh:
     ```bash
     Copy-Item .test-credentials.local.example.json .test-credentials.local.json
     ```
   * Masukkan email dan kata sandi kedua akun yang baru dibuat ke `.test-credentials.local.json`.
3. **Jalankan Skrip Pengujian Otomatis 23 Skenario:**
   * Jalankan di terminal:
     ```bash
     node scripts/test-suite.mjs
     ```
   * Seluruh 23 skenario (alur registrasi, pembuatan postingan, penolakan akses tamu, persetujuan atomik `agree_to_deal`, konfirmasi ganda `confirm_activity_completion`, dan pembaruan trigger rating reputasi) akan tereksekusi secara otomatis dengan laporan hasil kelulusan yang transparan.
