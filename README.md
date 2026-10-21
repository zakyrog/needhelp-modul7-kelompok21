# NeedHelp — Need-Based Companion & Help (Kelompok 21)

**NeedHelp** adalah platform digital untuk mempertemukan orang yang membutuhkan bantuan atau pendampingan situasional dengan orang yang menawarkan waktu dan kemampuan di wilayah Kota Yogyakarta.

Aplikasi ini telah dimigrasikan secara penuh dari HTML, CSS, JavaScript murni, dan Vite menjadi **Next.js (App Router)** berbasis JavaScript, sebagai fondasi untuk pengerjaan **Modul 8: Data Dinamis & Logika Aplikasi** dan persiapan pengujian pengguna Modul 9.

---

## Tautan Proyek & Dokumen

| Berkas / Acuan | Tautan / Lokasi |
|---|---|
| Repository Publik GitHub | [zakyrog/needhelp-modul7-kelompok21](https://github.com/zakyrog/needhelp-modul7-kelompok21) |
| Desain Acuan Figma | [Figma Modul 5 — Final UI NeedHelp](https://www.figma.com/design/iP8nJj7pgr2LxL1nvtuTAa/Need-Based-Companion---Help-FIX?node-id=85-60) |
| **Dokumentasi Migrasi Next.js** | [`docs/Migrasi-Nextjs.md`](docs/Migrasi-Nextjs.md) |
| **Rencana & Pembagian Tugas Modul 8** | [`docs/Pembagian-Tugas-Modul8.md`](docs/Pembagian-Tugas-Modul8.md) |
| **Laporan Hasil Uji Migrasi** | [`docs/Hasil-Uji-Migrasi.md`](docs/Hasil-Uji-Migrasi.md) |
| Arsip Kode Modul 7 (HTML + Vite) | [`archive/legacy-modul7/`](archive/legacy-modul7/) |

---

## Anggota Tim & Pembagian Tanggung Jawab

| Nama Anggota | Peran Utama | Fokus Pengerjaan Modul 8 |
|---|---|---|
| **Zaki Mubarok (Ketua)** | Migrasi, Fondasi & Integrasi | Menyiapkan fondasi Next.js App Router, integrasi Pull Request, dan deployment produksi langsung tanpa publikasi kredensial. |
| **Suprihatini** | Tampilan & Pengalaman Pengguna (UX) | Memoles fidelitas Figma, merapikan UX states (Skeleton berdenyut, Empty state dengan reset, Toast notification pop-up), dan uji responsivitas mobile. |
| **Felix Nicholas Juan Lee** | Logika Data & Formulir | Mengembangkan koneksi data dinamis (JSON/MockAPI), validasi & sanitasi form (`.trim()`, inline errors), penguncian tombol saat kirim, dan operasi CRUD. |
| **Arif Raharjo** | QA & Dokumentasi | Menguji skenario form dan alur end-to-end, memastikan bebas horizontal overflow, menyusun laporan PDF pengumpulan, dan melengkapi log prompt AI. |

---

## Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Framework & Routing | **Next.js 15 (App Router)** berbasis JavaScript |
| UI Library | **React 19 & React DOM 19** |
| Bahasa | **JavaScript (ES Modules & JSX)** |
| Styling | CSS Variables bersama (`tokens.css`, `base.css`, `ux-states.css`) |
| Tipografi | Font Inter via `@fontsource/inter` |
| Komponen UX Modul 8 | `Skeleton.jsx`, `EmptyState.jsx`, `Toast.jsx`, `Modal.jsx`, `FormField.jsx` |
| Penyimpanan Demo | Browser `localStorage` & `sessionStorage` aman (hydration-safe) |
| Linter | **ESLint 9** dengan aturan `@next/next` dan `react-hooks` |
| Kontrol Versi | Git (branch kerja: `feat/migrasi-nextjs`) |

---

## Cara Menjalankan Proyek di Komputer Lokal

### 1. Persiapan Lingkungan
Pastikan komputer telah terpasang **Node.js minimal versi 22.12.0** (direkomendasikan versi 22 atau 24 LTS) beserta npm.

```bash
# Clone repository
git clone https://github.com/zakyrog/needhelp-modul7-kelompok21.git
cd needhelp-modul7-kelompok21

# Pindah ke branch migrasi
git checkout feat/migrasi-nextjs
```

### 2. Pasang Dependensi
Jalankan perintah instalasi di folder utama yang memuat `package.json`:
```bash
npm install
# atau
npm ci
```

### 3. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada alamat [http://localhost:3000](http://localhost:3000). Server pengembangan mendukung *Fast Refresh* seketika saat kode diubah.

### 4. Jalankan Pemeriksaan Lint
```bash
npm run lint
```
Memeriksa kepatuhan kode terhadap standar React dan Next.js (0 errors).

### 5. Jalankan Build & Server Produksi
```bash
npm run build
npm run start
```
Next.js akan mengompilasi seluruh rute statis secara teroptimasi dan menyajikan server produksi lokal pada port 3000.

---

## Akun Demo & Simulasi

Aplikasi menggunakan sesi demo di sisi peramban (*client-side demo simulation*):

| Kunci | Nilai Demo |
|---|---|
| **Email** | `demo@needhelp.test` |
| **Password** | `NeedHelp123!` |
| **Peran** | Pengguna Demo NeedHelp |

> **Catatan Kejujuran Teknis:** Autentikasi demo dan percakapan chat lokal adalah simulasi berbasis penyimpanan browser (`localStorage` / `sessionStorage`). Tidak ada backend database bersama, WebSocket nyata, atau pengiriman email produksi yang dipublikasikan secara fiktif.

---

## Daftar Rute Halaman Aplikasi

Seluruh halaman telah menjadi halaman atau komponen React aktif:

| Rute URL | Fungsi & Fitur Halaman | Status Proteksi |
|---|---|---|
| `/` | Beranda publik, hero action, kategori populer, dan feed 3 postingan terbaru. | Publik |
| `/katalog` | Feed bantuan dengan tab *Saya Butuh* / *Saya Bisa*, pencarian kata kunci, filter lokasi/kompensasi/kategori, pengurutan, pagination, dan *Empty State*. | Publik |
| `/detail-postingan` | Detail postingan berdasar ID (`?id=...`), profil pemohon, badge identitas, info waktu/lokasi, dan form kirim catatan cepat ke chat. | Publik |
| `/login` | Formulir masuk demo, validasi inline, modal dialog lupa password & Google login. | Publik |
| `/buat-postingan` | Formulir interaktif pasang permintaan/penawaran baru, validasi lengkap, sanitasi input, dan penyimpanan lokal. | Perlu Login Demo |
| `/sukses-postingan` | Layar konfirmasi penerbitan postingan ber-ID dinamis. | Perlu Login Demo |
| `/aktivitas` | Ringkasan statistik aktivitas, tab filter status (Menunggu, Berjalan, Selesai, Batal), tombol batalkan, dan tautan beri ulasan. | Perlu Login Demo |
| `/chat` | Ruang percakapan, daftar kontak (Sari, Budi, Rina), pengiriman pesan reaktif, dan auto-scroll. | Perlu Login Demo |
| `/rating` | Form pemberian rating bintang 1–5, apresiasi badge, ulasan minimal 10 karakter, dan penutupan aktivitas. | Perlu Login Demo |
| `/notifikasi` | Daftar pemberitahuan, filter kategori, penanda terbaca individual dan tombol "Tandai semua terbaca". | Publik |
| `/formbantuan` | Form pengajuan bantuan 3 tahap (Isi Form &rarr; Review &rarr; Konfirmasi). | Publik |
| `/formeror` | Showcase rujukan tampilan keadaan validasi error form. | Publik |

*Pengalihan Otomatis:* Akses ke berkas lama seperti `/katalog.html` atau `/login.html` otomatis dialihkan ke rute baru (`/katalog`, `/login`) oleh konfigurasi Next.js.

---

## Catatan Deployment & Batasan

1. **Kewenangan Deployment:** Deployment, hosting, dan konfigurasi domain dikelola langsung oleh ketua (Zaki Mubarok). Jangan pernah melakukan push, merge ke main, atau meminta kredensial hosting tim.
2. **Fleksibilitas Hosting:**
   - **Hosting Node.js (Vercel, Render, VPS):** Menggunakan `npm run build` dan `npm run start` secara langsung.
   - **Static Export (Shared Hosting cPanel / Apache):** Dapat diaktifkan dengan menambahkan `output: 'export'` pada `next.config.mjs` untuk menghasilkan folder `out/`. Konfigurasi final diputuskan Zaki setelah spesifikasi hosting dipastikan.
3. **Penyimpanan Lokal:** Data yang dibuat tersimpan pada `localStorage` peramban yang sama (`needhelp.demo-posts.v1`, `needhelp.demo-chats.v1`, `needhelp.demo-activity-state.v1`). Menghapus cache browser akan mereset data ke kondisi awal.
