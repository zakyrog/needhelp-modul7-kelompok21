# Dokumen Serah Terima (HANDOFF) — NeedHelp Jogja
**Proyek:** NeedHelp Jogja (Kelompok 21 / Modul 8 Upgrade)  
**Cabang Git:** `feat/phase-2-ui-features`  
**Waktu Pembaruan:** 26 Oktober 2026, 10:15 WIB  
**Status Sesi Mandiri:** Selesai & Terverifikasi (Perapian Header/Navbar Dropdown, Panel Filter 4-Baris Katalog, Quick Post Setara, & 17 Tangkapan Layar Responsif)

---

## 1. Perubahan yang Benar-Benar Selesai

Pada sesi ini, dilakukan serangkaian perbaikan konkret dan terukur berdasarkan instruksi dan Taste Skill:

### A. Perapian Header / Navbar & Menu Akun Dropdown
* **Menu Profil Dropdown LinkedIn-Style ([`src/components/Header.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/Header.jsx)):**
  * Memindahkan tombol teks "Keluar" dari deretan navigasi utama ke dalam menu popover akun (`.profile-menu-popover`).
  * Trigger navigasi profil kini berbentuk tombol ringkas (`.profile-nav-trigger-btn`) yang menampilkan avatar, nama ringkas, dan panah dropdown (caret).
  * Menu popover menampilkan info nama lengkap, email, link ke "👤 Lihat Profil Saya", link ke "🤝 Aktivitas & Kesepakatan", divider visual, dan tombol "🚪 Keluar".
  * Dilengkapi penutup otomatis saat klik di luar area (*click outside listener*) dan saat tombol keyboard `Escape` ditekan.
* **Pengaturan Ruang & Breakpoint Responsif Bebas Tumpukan:**
  * Ruang antara logo, kolom pencarian (`.header-search-bar`), navigasi, dan menu profil terbagi proporsional.
  * Pada layar 1280px dan 1152px (desktop zoom 125%), lebar input pencarian menyusut secara bertahap (`flex: 1`, min-width adaptif) dan gap navigasi memadat tanpa membuat elemen melompat ke baris kedua atau menimpa feed.
  * Header sticky tetap berada di `z-index: 1000` dengan `overflow: visible` sehingga bayangan dan popover dropdown tidak terpotong.
* **Isolasi CSS Warisan Modul 7 ([`src/styles/base.css`](file:///C:/needhelp-modul7-kelompok21-main/src/styles/base.css)):**
  * Memberi selektor `:not(.sticky-header)` pada aturan lama `body > header.site-header` yang sebelumnya memaksakan padding besar 16px 40px dan mempersempit area header.

### B. Perapian Quick Post & Struktur 4-Baris Panel Filter Katalog ([`src/app/katalog/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/katalog/page.js) & [`src/styles/three-column.css`](file:///C:/needhelp-modul7-kelompok21-main/src/styles/three-column.css))
* **Kotak Quick Post Rapi & Ergonomis:**
  * Bagian atas: avatar inisial/ikon + pemicu input placeholder "Butuh bantuan apa atau keahlian apa yang ingin kamu bagikan hari ini?".
  * Bagian bawah: dua tombol aksi setara `+ Saya Butuh Bantuan` (latar lembut merah pudar `#fff5f5`) dan `+ Saya Bisa Membantu` (latar lembut toska pudar `#f0fdf9`).
* **Panel Kontrol Filter 4 Baris Jelas:**
  * **Baris 1 (`.panel-top-row`):** Tab sifat postingan di sisi kiri (`Semua`, `🆘 Saya Butuh`, `✨ Saya Bisa`) dan dropdown pengurutan di sisi kanan (`Urutan: [Terbaru Diunggah / Terlama / Tenggat Terdekat]`).
  * **Baris 2 (`.panel-filter-row`):** Dropdown Wilayah DIY (`📍 Semua 5 Wilayah DIY`), Dropdown Imbalan (`💰 Semua Jenis Imbalan`), dan tombol `✕ Reset Filter` (muncul saat filter aktif).
  * **Baris 3 (`.panel-categories-row`):** Label tegas `Kategori Utama:` beserta 4 tombol chip kategori sah (`Bantuan Fisik`, `Ditemani`, `Pendampingan`, `Explore`).
  * **Baris 4 (`.panel-results-summary`):** Ringkasan jumlah ("Ditemukan X postingan aktif") dan chip lencana filter yang sedang aktif.

### C. Penyelarasan RPC & Skema Database Supabase
* **Penyelarasan Nama RPC Kesepakatan:** Memastikan pemanggilan RPC di kode antarmuka [`src/app/chat/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/chat/page.js) dan skrip pengujian [`scripts/test-suite.mjs`](file:///C:/needhelp-modul7-kelompok21-main/scripts/test-suite.mjs) menggunakan nama prosedur SQL yang sah dari [`supabase/schema.sql`](file:///C:/needhelp-modul7-kelompok21-main/supabase/schema.sql):
  * Prosedur: `public.agree_to_deal(p_deal_id UUID, p_target_version INTEGER)`.
  * Dokumentasi dan kode diselaraskan dari penyebutan lama `agree_deal_atomic` menjadi `agree_to_deal`.
  * Parameter revisi: `revise_deal(p_deal_id, p_target_version, p_scheduled_date, p_scheduled_time, p_meetup_location, p_compensation_type, p_compensation_value)`.
  * Parameter pembatalan: `cancel_deal(p_deal_id, p_cancellation_reason)`.
  * Parameter penyelesaian: `confirm_activity_completion(p_activity_id)`.

### D. Penghapusan Seluruh Indikator Palsu, Rating Palsu, dan Badge Tanpa Otorisasi
* **Penghapusan Rating Fiktif (`5.0` Default & Ulasan Palsu):**
  * Pada [`CatalogCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/CatalogCard.jsx), [`detail-postingan/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/detail-postingan/page.js), [`ProfileMiniCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/ProfileMiniCard.jsx), dan [`profil/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/profil/page.js):
    * Menghilangkan fallback fiktif yang memberikan nilai `5.0` dan 3–5 ulasan pada akun tanpa reputasi.
    * Akun dengan `rating_count === 0` kini secara jujur dan transparan menampilkan badge: **`⭐ Anggota Baru`** atau **`Belum ada ulasan`**.
* **Penghapusan Statistik Fiktif di Halaman Login ([`src/app/login/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/login/page.js)):**
  * Menghilangkan angka klaim palsu (`2.1k+ Permintaan`, `850+ Relawan`, `4.8★ Rating`).
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
