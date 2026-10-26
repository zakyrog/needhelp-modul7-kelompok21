# Dokumen Serah Terima (HANDOFF) — NeedHelp Jogja
**Proyek:** NeedHelp Jogja (Kelompok 21 / Modul 8 Upgrade)  
**Cabang Git:** `feat/phase-2-ui-features`  
**Waktu Pembaruan:** 26 Oktober 2026, 13:55 WIB  
**Status Sesi Mandiri:** Selesai & Terverifikasi Penuh (Pemisahan Peran Halaman Beranda vs Feed & Cari Sesuai Acuan Desain, Eliminasi Pencarian Ganda, Kartu Kategori & Filter Presisi, dan Verifikasi Tangkapan Layar Multi-Resolusi)

---

## 1. Perubahan yang Benar-Benar Selesai

Pada sesi ini, telah diselesaikan pemisahan tegas peran dan revisi antarmuka antara **Beranda** (`/`) dan **Feed & Cari** (`/katalog`) sesuai arahan gambar referensi:

### A. Beranda (`/`): Hub Memulai Bantuan & Melanjutkan Kegiatan
* **Judul & Deskripsi:**
  * Judul **Beranda** dengan subjudul *"Mulai bantuanmu, lanjutkan kegiatanmu."*
* **Kartu "Apa yang ingin kamu lakukan?":**
  * Dua pintu setara berdampingan:
    1. **Saya Butuh Bantuan:** Berwarna merah muda/rose, ikon tangan (`✋`), judul tebal, subjudul *"Minta bantuan dari komunitas"*, dan tombol panah `→` menuju `/buat-postingan?nature=butuh`.
    2. **Saya Bisa Membantu:** Berwarna mint/hijau, ikon relawan/orang (`👥`), judul tebal, subjudul *"Tawarkan waktu, keahlian, atau bantuan"*, dan tombol panah `→` menuju `/buat-postingan?nature=bisa`.
* **Bagian "Perlu ditindaklanjuti":**
  * Tautan cepat `Lihat aktivitas →` menuju `/aktivitas`.
  * Merangkum kegiatan pengguna yang menunggu tindak lanjut (status menunggu, berlangsung, terjadwal). Jika belum masuk, menampilkan kartu ringkas ramah pengguna untuk masuk akun.
* **Bagian "Posting aktifmu":**
  * Tautan cepat `Kelola posting →` menuju `/aktivitas?tab=posting`.
  * Merangkum postingan aktif milik pengguna sendiri.
* **Bagian "Terbaru di NeedHelp":**
  * Tautan `Lihat semua →` langsung menuju Feed & Cari (`/katalog`).
  * Menampilkan cuplikan ringkas 2 postingan komunitas terbaru dalam kartu 2 kolom (atau 1 kolom di ponsel).
* **Tanpa Panel Filter Lengkap di Beranda:**
  * Seluruh panel filter kompleks, pencarian sekunder, tab nature, dan filter wilayah/imbalan telah dibersihkan dari Beranda agar fokus menjadi hub kegiatan.

### B. Feed & Cari (`/katalog`): Tempat Mencari & Menelusuri Bantuan
* **Eliminasi Pencarian Ganda (Double Search):**
  * Bilah pencarian global pada Header (`site-header`) disembunyikan secara kondisional ketika pengguna berada di rute `/katalog` (`isKatalogPage = pathname === "/katalog"`).
  * Halaman Feed & Cari menggunakan satu-satunya kolom pencarian utama (*Primary Search Bar*) yang menonjol di area konten.
* **Header Halaman & Tombol Aksi:**
  * Judul **Feed & Cari** dengan subjudul *"Temukan bantuan yang sesuai kebutuhanmu."*
  * Tombol toska solid **`+ Buat posting`** di sudut kanan atas yang mengarah ke `/buat-postingan`.
* **Bilah Pencarian Utama:**
  * Ikon pencarian di sebelah kiri, placeholder *"Cari bantuan, keahlian, atau kegiatan..."*, tombol `✕` untuk menghapus kata kunci, dan tombol toska solid **`Cari`**.
* **Grup Tab Segmented Nature:**
  * Tab `Semua` dengan latar toska gelap `#0f766e` dan centang putih `✓` saat aktif.
  * Tab `Saya Butuh` dengan aksen merah muda lembut dan ikon tangan (`✋`).
  * Tab `Saya Bisa` dengan aksen hijau lembut dan ikon jabat tangan (`🤝`).
* **4 Kartu Kategori Utama (Tinggi 72–88px):**
  * Tersusun dalam grid seimbang (4 kolom di desktop, 2x2 di ponsel):
    1. **Bantuan Fisik:** Ikon paket (`📦`) dalam lingkaran oranye/peach.
    2. **Ditemani:** Ikon kamera/kegiatan (`👥`) dalam lingkaran ungu/lavender.
    3. **Pendampingan:** Ikon topi toga/edukasi (`🎓`) dalam lingkaran biru.
    4. **Explore:** Ikon kompas (`🧭`) dalam lingkaran hijau toska.
  * Kartu dapat diklik untuk memilih satu kategori secara toggle (dengan highlight toska jelas saat aktif).
* **Kontrol Dropdown Wilayah & Imbalan:**
  * Tersusun berdampingan 2 kotak dengan ikon:
    1. **Wilayah:** Ikon pin lokasi `📍`, label huruf kecil tebal `WILAYAH`, opsi dropdown (Semua wilayah, Kota Yogyakarta, Sleman, Bantul, Kulon Progo, Gunungkidul).
    2. **Imbalan:** Ikon dompet `👛` (*wallet icon*, bukan ikon kalender), label `IMBALAN`, opsi dropdown (Semua imbalan, Sukarela / Gratis, Rp 10.000 - Rp 50.000, Rp 50.000 - Rp 100.000, Di atas Rp 100.000, Sesuai Kesepakatan).
  * Tombol **Reset Filter** otomatis muncul ketika ada filter yang aktif.
* **Baris Jumlah Hasil & Pengurutan:**
  * Sisi kiri: `{count} posting ditemukan` dalam font tebal.
  * Sisi kanan: Kontrol `Urutkan: [ Terbaru ▾ ]` (pilihan: Terbaru, Terlama, Tenggat Terdekat).
* **Daftar Lengkap Postingan (Feed Stream):**
  * Menampilkan 12 postingan otentik mahasiswa & warga Yogyakarta tanpa kartu besar "Apa yang ingin kamu lakukan?".

---

## 2. Halaman & Viewport yang Sudah Diperiksa Secara Visual

Tangkapan layar resolusi tinggi disimpan pada folder [`docs/screenshots/`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/):

| Viewport & Halaman | Berkas Tangkapan Layar | Hasil Pemeriksaan Visual |
|---|---|---|
| **Beranda Desktop (1440px)** | [`docs/screenshots/01-desktop-1440-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1440-beranda.png) | **Sempurna sesuai acuan revisi:** Dua pintu "Apa yang ingin kamu lakukan?", ringkasan "Perlu ditindaklanjuti", ringkasan "Posting aktifmu", dan cuplikan "Terbaru di NeedHelp". |
| **Feed & Cari Desktop (1440px)** | [`docs/screenshots/02-desktop-1440-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1440-katalog.png) | **Sempurna:** Nol pencarian ganda, bilah pencarian utama menonjol dengan tombol Cari, tab segmented nature, 4 kartu kategori (72-88px), filter Wilayah & Imbalan (ikon dompet), baris hitung/urutkan, feed 12 postingan. |
| **Beranda Desktop (1280px)** | [`docs/screenshots/01-desktop-1280-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1280-beranda.png) | Komposisi tetap stabil dalam batas kontainer 1240px tanpa desak-desakan. |
| **Feed & Cari Desktop (1280px)** | [`docs/screenshots/02-desktop-1280-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1280-katalog.png) | Grid 4 kategori dan dropdown filter tersusun rapi tanpa patah baris yang janggal. |
| **Tablet Beranda (1024px)** | [`docs/screenshots/07-tablet-1024-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/07-tablet-1024-beranda.png) | Sidebar 240px adaptif, feed tetap luas dan proporsional. |
| **Tablet Feed & Cari (1024px)** | [`docs/screenshots/08-tablet-1024-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/08-tablet-1024-katalog.png) | Kartu kategori dan dropdown beradaptasi rapi di layar tablet 1024px. |
| **Mobile Beranda (390px)** | [`docs/screenshots/09-mobile-390-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/09-mobile-390-beranda.png) | Kolom tunggal vertikal ergonomis, kartu dua pintu mudah dijangkau jempol, navigasi bawah tetap (*Mobile Bottom Nav*). |
| **Mobile Feed & Cari (390px)** | [`docs/screenshots/10-mobile-390-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/10-mobile-390-katalog.png) | Tombol "+ Buat posting" lebar penuh, pencarian utama, kategori grid 2x2, filter bertumpuk nyaman, daftar feed responsif. |

---

## 3. Hasil Lint, Build, dan Pengujian yang Dijalankan

* **ESLint (`npm run lint`):** **LULUS (0 Error, 0 Warning)** pada seluruh direktori `src`.
* **Kompilasi Next.js (`npm run build`):** **LULUS (20 dari 20 rute terkompilasi statis + dynamic dalam 6.8 detik)**.
* **Server Produksi (`npm run start`):** Berjalan stabil dan responsif pada port 3000 (status HTTP 200).
* **Pengujian Tangkapan Layar Otomatis:** Tangkapan layar Chrome Headless v1440, v1280, v1024, dan v390 berhasil dibuat dan diverifikasi secara visual.

---

## 4. Riwayat Commit Sesi Ini:
1. `18c6f47`: *refactor(ui): align RPC naming, eliminate fake ratings/badges, and truthify login/profile displays*
2. `3ab6612`: *style(feed): replace oversized banner with compact 4-category intro card and clean catalog labeling*
3. `da9850d`: *feat(preview): add isolated labeled local dev preview for private forms, activities, and ratings*
4. `9819613`: *fix(layout): neutralize legacy catalog CSS overrides, enforce center column flex width, and capture full visual verification suite*
5. `0bd7dc1`: *fix(ui): polish header navbar dropdown and catalog filter panel 4-row layout*
6. `ef0d3c7`: *feat(ui): redesign homepage into 2-column layout matching reference design with modern feed and sidebar*
7. `9b4e6a0`: *feat(ui): revise Beranda and Feed & Cari to match reference mockup with distinct page roles*
8. `5110387`: *style(home): enforce exact vertical spacing and single stack container for Beranda sections*

---

## 3. Keamanan, Otorisasi RLS & Tata Kelola Data
* **Pembersihan Klaim Kosong & Kredensial:** Seluruh data contoh terisolasi murni sebagai fixture lokal (`src/data/examplePostsFixture.js`) dan tidak pernah dikirim ke database Supabase.
* **Proteksi Rute Server:** Halaman `/buat-postingan` dan `/aktivitas` tetap dilindungi di sisi server (redirect otomatis ke login bagi pengunjung tamu).
* **Otorisasi RPC:** Fungsi `agree_to_deal` dan `confirm_activity_completion` tetap terlindungi dengan keamanan SECURITY DEFINER dan pengecekan pengguna yang ketat.

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
6. `ef0d3c7`: *feat(ui): redesign homepage into 2-column layout matching reference design with modern feed and sidebar*

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
