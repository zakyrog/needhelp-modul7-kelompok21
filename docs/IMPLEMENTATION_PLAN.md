# Implementation Plan (IMPLEMENTATION_PLAN) — NeedHelp Jogja
**Status:** Rencana Kerja Bertahap (Step-by-Step Implementation)  
**Versi:** 2.0.0  
**Tanggal:** 26 Oktober 2026  
**Pendekatan:** Satu Alur Utuh per Tahap (*End-to-End Vertical Slicing*), Uji Nyata, Tanpa Mock Data Palsu  

---

## 1. Ikhtisar Tahapan Implementasi

```
┌────────────────────────────────────────────────────────────────────────┐
│ TAHAP 1: Fondasi Database & Autentikasi Multipengguna Terpusat         │
│ (Menghubungkan DB terpusat, skema tabel, endpoint auth register/login) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 2: Shell Antarmuka Desktop 3-Kolom (LinkedIn-Style) & Navigasi   │
│ (Refactor Header sticky, layout 3-kolom, komponen shell, responsif)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 3: Alur 1 — Penjelajahan Publik, Filter 5 Wilayah DIY, & Detail  │
│ (Feed publik, URL searchParams 2-arah, empty state wilayah, detail)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 4: Alur 2 — Penerbitan Postingan (Saya Butuh & Saya Bisa)        │
│ (Form validasi ketat, simpan DB, pemisahan visual, penentuan kuota)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 5: Alur 3 — Chat Riil & Kartu Kesepakatan (In-Chat Deal Card)    │
│ (Percakapan antarpengguna, kartu deal, persetujuan ganda, penguncian)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 6: Alur 4 — Siklus Kegiatan (Aktivitas), Selesai, & Rating       │
│ (Dashboard aktivitas, konfirmasi selesai, pembatalan, submit review)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 7: Audit Kualitas, Uji Lintas Peramban, & Verifikasi Deployment  │
│ (Checklist QA, uji WCAG 2.2 AA, bebas overflow, lint/build 0-error)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Pekerjaan per Tahap

---

### TAHAP 1: Fondasi Supabase, Autentikasi Riil, & RLS
* **Tujuan:** Menyiapkan basis data Supabase terpusat, integrasi `@supabase/ssr` berbasis cookie, migrasi skema tabel, aturan RLS, dan sistem autentikasi akun riil (register, login, logout, profil).
* **ID Kebutuhan yang Dipenuhi:** `REQ-CORE-03`, `REQ-CORE-04`
* **Dependensi:** Pemasangan `@supabase/supabase-js` dan `@supabase/ssr`.
* **Rincian Tugas:**
  1. Pasang dependensi client SDK `@supabase/supabase-js` dan `@supabase/ssr`.
  2. Susun berkas migrasi SQL lengkap (`supabase/schema.sql`) mencakup pembuatan tabel, relasi profil ke `auth.users`, trigger profil otomatis, dan aturan Row Level Security (RLS).
  3. Buat utilitas Supabase resmi: `client.js` (browser), `server.js` (server cookies), dan `middleware.js` (sinkronisasi sesi).
  4. Pasang `middleware.js` di root Next.js untuk menjaga sesi cookie tetap terbarui pada setiap permintaan.
  5. Perbarui halaman login/register di `src/app/login/page.js` untuk mendukung autentikasi Supabase nyata dengan validasi input dan penanganan error terstruktur.
  6. Siapkan `.env.example` untuk memudahkan konfigurasi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Bukti Pengujian & Verifikasi:**
  * Pengujian Konfigurasi: Verifikasi pemanggilan client SDK dan fallback gracefully jika environment variables belum terisi.
  * Pengujian Multi-Akun (Live setelah user mengisi kredensial): Mendaftarkan Akun A dan Akun B, verifikasi login/logout, persistensi reload F5, verifikasi RLS (Akun A tidak bisa mengubah profil Akun B), dan verifikasi akses publik tamu.

---

### TAHAP 2: Shell Antarmuka Desktop 3-Kolom (LinkedIn-Style)
* **Tujuan:** Membangun kerangka visual desktop 3 kolom yang kokoh, konsisten, dan responsif sesuai panduan `DESIGN_DIRECTION.md`.
* **ID Kebutuhan yang Dipenuhi:** `REQ-UI-01`, `REQ-UI-02`
* **Dependensi:** Tahap 1 (untuk data profil di kolom kiri).
* **Rincian Tugas:**
  1. Refactor [`src/components/Header.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/Header.jsx): Navigasi sticky 64px, pencarian global, ikon menu dengan badge dinamis.
  2. Buat komponen tata letak: `ThreeColumnLayout.jsx` (Kolom Kiri 240px, Kolom Tengah 640px, Kolom Kanan 280px).
  3. Buat `ProfileMiniCard.jsx` (Kolom Kiri) dan `CommunityTipsWidget.jsx` (Kolom Kanan).
  4. Optimasi CSS di [`src/styles/base.css`](file:///C:/needhelp-modul7-kelompok21-main/src/styles/base.css) untuk membersihkan selektor ganda dan memastikan layout menyusut rapi pada tablet (768px) dan mobile (360px).
* **Bukti Pengujian & Verifikasi:**
  * Pengujian Visual: Tata letak 3 kolom tampil simetris di layar desktop 1440px dan 1024px.
  * Pengujian Responsif: Tidak ada scroll horizontal pada 360px, 390px, dan 768px.

---

### TAHAP 3: Alur 1 — Penjelajahan Publik, Filter 5 Wilayah DIY, & Detail Postingan
* **Tujuan:** Memungkinkan pengunjung tanpa login menjelajah feed, mencari, menyaring wilayah DIY, dan melihat rincian postingan dari database terpusat.
* **ID Kebutuhan yang Dipenuhi:** `REQ-CORE-01`, `REQ-CORE-02`, `REQ-CORE-07`
* **Dependensi:** Tahap 1 (API `/api/posts`), Tahap 2 (Layout feed).
* **Rincian Tugas:**
  1. Perbarui `/api/posts` (GET) untuk mendukung filter query: `type`, `category`, `region`, `compensation`, `q`, dan pagination.
  2. Hubungkan [`src/app/katalog/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/katalog/page.js) dengan `router.replace` agar filter memperbarui query URL dua arah secara instan.
  3. Implementasikan `EmptyState` khusus ketika wilayah DIY tertentu (misal Kulon Progo / Gunungkidul) belum memiliki postingan.
  4. Hubungkan [`src/app/detail-postingan/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/detail-postingan/page.js) untuk membaca data dinamis dari database terpusat.
* **Bukti Pengujian & Verifikasi:**
  * Buka `/katalog?region=kulonprogo` &rarr; Muncul EmptyState informatif dengan tombol reset.
  * Salin link `/katalog?type=bisa&category=bantuan&region=sleman` ke browser lain &rarr; Menampilkan hasil filter yang persis sama.

---

### TAHAP 4: Alur 2 — Penerbitan Postingan (Saya Butuh & Saya Bisa)
* **Tujuan:** Pengguna terautentikasi dapat menerbitkan permohonan bantuan atau penawaran keahlian ke database terpusat.
* **ID Kebutuhan yang Dipenuhi:** `REQ-CORE-05`, `REQ-CORE-06`
* **Dependensi:** Tahap 1 (Auth), Tahap 3 (Data post).
* **Rincian Tugas:**
  1. Implementasikan endpoint `POST /api/posts` yang menyimpan data terstruktur ke tabel `posts`.
  2. Perbarui form [`src/app/buat-postingan/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/buat-postingan/page.js):
     * Input kuota partner (default 1) untuk Saya Butuh.
     * Pilihan imbalan resmi (termasuk Bayar Sendiri-sendiri dan Sukarela).
     * Validasi tanggal tidak lampau dan sanitasi input.
  3. Tambahkan pemicu cepat (*Quick Post Box*) di puncak feed kolom tengah.
  4. Redirection sukses ke `/sukses-postingan?id=...` dan langsung muncul di feed publik.
* **Bukti Pengujian & Verifikasi:**
  * Pengguna A menerbitkan Saya Butuh di Browser Chrome.
  * Buka Browser Firefox (Pengguna B) &rarr; Postingan Pengguna A langsung terlihat di feed.

---

### TAHAP 5: Alur 3 — Chat Riil & Kartu Kesepakatan di Chat (*In-Chat Deal*)
* **Tujuan:** Pengguna A dan Pengguna B dapat berkomunikasi langsung dari perangkat berbeda dan menyetujui kartu kesepakatan formal di dalam ruang obrolan.
* **ID Kebutuhan yang Dipenuhi:** `REQ-CORE-08`, `REQ-CORE-09`
* **Dependensi:** Tahap 1 (Tabel deals & chats), Tahap 4 (Konteks post).
* **Rincian Tugas:**
  1. Bangun Route Handlers chat di `/api/chats` dan `/api/chats/[threadId]/messages`.
  2. Hubungkan [`src/app/chat/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/chat/page.js) agar membaca dan menulis pesan antarpengguna riil ke basis data.
  3. Buat komponen `DealCard.jsx` di dalam chat:
     * Menampilkan parameter: Bantuan, Peserta, Jadwal, Titik Temu, Imbalan.
     * Tombol aksi: "Setujui Kesepakatan" dan "Ajukan Perubahan".
     * Validasi versi kesepakatan: Jika salah satu pihak mengubah parameter, status persetujuan di-reset ke versi baru.
  4. Ketika kedua belah pihak klik "Setujui" pada versi yang sama:
     * Status kesepakatan berubah menjadi `disepakati`.
     * Kurangi kuota postingan *Saya Butuh* terkait (jika kuota = 0 &rarr; status postingan menjadi `kuota_penuh`).
     * Buat entitas *Kegiatan* baru berstatus `terjadwal`.
* **Bukti Pengujian & Verifikasi:**
  * Buka dua browser berdampingan (Chrome: Pengguna A, Edge: Pengguna B).
  * Pengguna A kirim kartu kesepakatan. Pengguna B klik setujui, Pengguna A klik setujui &rarr; Kartu terkunci dengan tanda "Disepakati", kuota postingan berkurang.

---

### TAHAP 6: Alur 4 — Siklus Kegiatan (Aktivitas), Selesai, & Rating
* **Tujuan:** Pengguna memantau kegiatan terjadwal, mengonfirmasi penyelesaian atau pembatalan, serta saling memberikan rating ulasan reputasi.
* **ID Kebutuhan yang Dipenuhi:** `REQ-CORE-10`, `REQ-CORE-11`, `REQ-CORE-12`
* **Dependensi:** Tahap 5 (Kesepakatan disetujui menghasilkan activity).
* **Rincian Tugas:**
  1. Perbarui [`src/app/aktivitas/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/aktivitas/page.js) untuk membaca entitas kegiatan dari tabel `activities`.
  2. Pisahkan tab visual: **Terjadwal**, **Berlangsung**, **Selesai**, dan **Dibatalkan**.
  3. Implementasikan aksi:
     * Tombol "Batalkan Kegiatan" (sebelum hari-H) &rarr; memulihkan kuota postingan *Saya Butuh*.
     * Tombol "Konfirmasi Selesai" &rarr; mengubah status menjadi `selesai`.
  4. Perbarui [`src/app/rating/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/rating/page.js):
     * Validasi: Hanya dapat diakses untuk kegiatan yang berstatus `selesai`.
     * Validasi anti self-rating dan pencegahan ulasan ganda (1 ulasan per pihak).
     * Simpan ulasan ke tabel `reviews` dan hitung ulang agregat rating di profil pengguna.
* **Bukti Pengujian & Verifikasi:**
  * Klik selesai &rarr; Buka form rating &rarr; Kirim ulasan 5 bintang.
  * Buka profil pengguna lawan &rarr; Skor rata-rata rating dan jumlah ulasan bertambah secara akurat.

---

### TAHAP 7: Audit Kualitas, Uji Lintas Peramban, & Verifikasi Deployment
* **Tujuan:** Memastikan aplikasi stabil, bebas error linting/build, dan siap dideploy ke server produksi.
* **Rincian Tugas:**
  1. Jalankan `npm run lint` &rarr; Pastikan 0 error dan 0 warning.
  2. Jalankan `npm run build` &rarr; Pastikan seluruh rute terkompilasi sukses.
  3. Uji tampilan pada 5 resolusi layar (1440px, 1024px, 768px, 390px, 360px).
  4. Uji alur penolakan akses (tamu klik buat post &rarr; dialihkan login &rarr; kembali ke tujuan).
* **Bukti Pengujian & Verifikasi:**
  * Laporan hasil uji akhir dicatat di `docs/Hasil-Verifikasi-Upgrade.md`.
