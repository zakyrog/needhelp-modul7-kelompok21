# Dokumentasi Migrasi NeedHelp ke Next.js (App Router)

Dokumen ini mencatat proses, arsitektur, dan panduan teknis migrasi penuh aplikasi **NeedHelp (Kelompok 21)** dari HTML, CSS, JavaScript murni, dan Vite menjadi **Next.js (App Router)** berbasis JavaScript.

---

## 1. Latar Belakang & Tujuan Migrasi

Pada penugasan Modul 7, prototipe NeedHelp dibangun menggunakan multi-halaman HTML statis, CSS terpusat, dan manipulasi DOM manual via JavaScript murni dengan bundler Vite. Memasuki penugasan Modul 8 (Data Dinamis & Logika Aplikasi) dan persiapan pengujian pengguna Modul 9, aplikasi membutuhkan arsitektur modern berbasis komponen yang reaktif, modular, dan terstruktur.

Tujuan utama migrasi:
1. **Full App Router React:** Memindahkan seluruh 12 halaman aktif menjadi halaman dan komponen React murni tanpa `iframe` atau `dangerouslySetInnerHTML`.
2. **Konsistensi Visual & Aset:** Mempertahankan identitas desain Figma (warna toska, font Inter, spacing, token, dan seluruh 15 aset ikon/avatar SVG).
3. **Pemisahan Perhatian (Separation of Concerns):** Memisahkan logika antarmuka (UI), validasi formulir, dan akses data ke dalam modul terpisah agar tim mudah melanjutkan tugasnya.
4. **Perbaikan Masalah Lama Modul 7:** Memperbaiki selektor DOM yang sebelumnya tidak tersambung (form submit postingan, riwayat obrolan chat, filter notifikasi, dan form rating) dengan state dan event handler React.
5. **Kesiapan Fondasi Modul 8:** Menyiapkan struktur penanganan *loading skeleton*, *empty state*, *error retry*, dan *toast notification* tanpa menggunakan `alert()` bawaan browser.

---

## 2. Struktur Direktori Proyek

Aplikasi Next.js berlokasi langsung pada direktori utama (root) repositori:

```text
needhelp-modul7-kelompok21/
├── archive/
│   └── legacy-modul7/            # Arsip berkas HTML & konfigurasi Vite lama (tidak aktif)
│       ├── index.html
│       ├── katalog.html
│       ├── ... (12 file HTML Modul 7)
│       └── vite.config.js
├── docs/                         # Dokumentasi teknis & penugasan
│   ├── Migrasi-Nextjs.md
│   ├── Pembagian-Tugas-Modul8.md
│   ├── Hasil-Uji-Migrasi.md
│   └── ...
├── public/                       # Aset publik statis (disajikan langsung di root URL)
│   └── assets/
│       └── images/               # 15 ikon dan avatar SVG (logo, kurir, search, dll.)
├── src/
│   ├── app/                      # Rute App Router Next.js
│   │   ├── layout.js             # Root Layout (Header, Footer, ToastProvider, Fonts)
│   │   ├── page.js               # Beranda (/)
│   │   ├── login/page.js         # Masuk demo (/login)
│   │   ├── katalog/page.js       # Katalog & filter (/katalog)
│   │   ├── detail-postingan/page.js # Detail postingan (/detail-postingan)
│   │   ├── buat-postingan/page.js   # Form buat postingan (/buat-postingan)
│   │   ├── sukses-postingan/page.js # Layar konfirmasi (/sukses-postingan)
│   │   ├── aktivitas/page.js     # Ringkasan & daftar aktivitas (/aktivitas)
│   │   ├── chat/page.js          # Percakapan & pesan demo (/chat)
│   │   ├── rating/page.js        # Penilaian & ulasan (/rating)
│   │   ├── notifikasi/page.js    # Notifikasi & tanda dibaca (/notifikasi)
│   │   ├── formbantuan/page.js   # Formulir ajukan bantuan (/formbantuan)
│   │   └── formeror/page.js      # Acuan status error form (/formeror)
│   ├── components/               # Komponen UI bersama
│   │   ├── Header.jsx            # Header navigasi responsif & status auth
│   │   ├── Footer.jsx            # Footer aplikasi
│   │   ├── PostCard.jsx          # Kartu postingan beranda
│   │   ├── CatalogCard.jsx       # Kartu postingan katalog feed
│   │   ├── FormField.jsx         # Field input berlabel dengan pesan error inline
│   │   ├── Toast.jsx             # Sistem notifikasi Toast pop-up halus
│   │   ├── Skeleton.jsx          # Animasi shimmer loading skeleton
│   │   ├── EmptyState.jsx        # Komponen tampilan kosong dengan tombol aksi/reset
│   │   ├── ErrorState.jsx        # Komponen tampilan error dengan tombol coba lagi
│   │   ├── Modal.jsx             # Dialog modal informasi interaktif
│   │   └── SimulationBanner.jsx  # Banner penanda simulasi demo lokal
│   ├── lib/                      # Lapisan data, validasi, dan autentikasi
│   │   ├── data.js               # Data awal, model data, utilitas browser storage
│   │   ├── validation.js         # Fungsi validasi & sanitasi input (.trim(), regex)
│   │   └── auth.js               # Pengelola sesi demo (localStorage / sessionStorage)
│   └── styles/                   # Berkas CSS
│       ├── tokens.css            # Token desain warna, spasi, dan font Figma
│       ├── base.css              # Gaya CSS komprehensif lama yang dipertahankan
│       └── ux-states.css         # Styling skeleton, toast, empty state, dan banner
├── .eslintrc.json / eslint.config.mjs # Konfigurasi ESLint modern
├── next.config.mjs               # Konfigurasi Next.js (redirects, metadata, root tracing)
├── package.json                  # Dependensi proyek & npm scripts
└── README.md                     # Panduan utama proyek
```

---

## 3. Pemetaan Rute (Route Mapping)

Seluruh 12 halaman HTML lama dipetakan ke rute Next.js App Router dengan dukungan pengalihan otomatis (*HTTP redirect*) agar tautan lama atau penanda browser tetap bekerja:

| Halaman Lama Modul 7 | Rute Baru Next.js | Tipe Komponen | Parameter URL yang Didukung |
|---|---|---|---|
| `index.html` | `/` | Client / SSR | - |
| `login.html` | `/login` | Client (`'use client'`) | `?next=<path>` |
| `katalog.html` | `/katalog` | Client (`'use client'`) | `?q=`, `?type=`, `?category=`, `?location=`, `?compensation=`, `?sort=`, `?page=` |
| `detail-postingan.html` | `/detail-postingan` | Client (`'use client'`) | `?id=<post-id>`, `?back=<url>` |
| `buat-postingan.html` | `/buat-postingan` | Client (`'use client'`) | Membutuhkan sesi login demo |
| `sukses-postingan.html` | `/sukses-postingan` | Client (`'use client'`) | `?id=<post-id>` |
| `aktivitas.html` | `/aktivitas` | Client (`'use client'`) | `?rated=1` (menampilkan toast sukses) |
| `chat.html` | `/chat` | Client (`'use client'`) | `?user=<user-id>`, `?topic=<text>` |
| `rating.html` | `/rating` | Client (`'use client'`) | `?id=<activity-id>` |
| `notifikasi.html` | `/notifikasi` | Client (`'use client'`) | - |
| `formbantuan.html` | `/formbantuan` | Client (`'use client'`) | `?id=<post-id>` |
| `formeror.html` | `/formeror` | Client (`'use client'`) | Showcase validasi error |

*Catatan:* Konfigurasi `next.config.mjs` menyertakan aturan `redirects()` otomatis dari berkas `*.html` ke rute Next.js yang bersesuaian dengan status HTTP 307.

---

## 4. Arsitektur Pemisahan Kode

Untuk memudahkan kolaborasi 4 anggota tim pada Modul 8, kode dipisahkan secara tegas:

1. **Komponen Antarmuka (`src/components/`):**
   - Menangani presentasi visual tanpa mencampurkan logika bisnis berat.
   - Contoh: `PostCard`, `CatalogCard`, `FormField`, `Toast`, `Skeleton`.
2. **Logika Validasi (`src/lib/validation.js`):**
   - Murni fungsi JavaScript yang menerima objek data input dan mengembalikan objek `errors`.
   - Menggunakan sanitasi `.trim()`, pengecekan batasan panjang (min/max), format email regex, validasi tanggal tidak boleh lampau, dan nominal angka positif.
   - Anggota data (Felix) dapat menambah atau menyesuaikan aturan validasi di sini tanpa mengutak-atik tampilan.
3. **Akses Data & Penyimpanan (`src/lib/data.js`):**
   - Menyediakan data statis acuan (`DEMO_POSTS`, `PEOPLE`, `DEMO_ACTIVITIES`, `SEED_CONVERSATIONS`, `DEMO_NOTIFICATIONS`).
   - Menyediakan fungsi CRUD lokal (`getPosts()`, `savePost()`, `createPost()`, `getActivities()`, `setActivityState()`, `saveMessage()`, `markNotificationRead()`).
   - Melindungi akses `localStorage` dari kegagalan SSR (*Server-Side Rendering*) dengan pengujian `typeof window !== 'undefined'`.
   - Menjadi titik integrasi saat tim nantinya beralih ke MockAPI, JSON Server, atau Supabase pada Modul 8.
4. **Autentikasi & Sesi Demo (`src/lib/auth.js`):**
   - Menyimpan penanda sesi pengguna demo (`needhelp.demo-session`) di `localStorage` (jika Ingat Saya dicentang) atau `sessionStorage`.
   - Memastikan identitas akun demo `demo@needhelp.test` / `NeedHelp123!`.

---

## 5. Perbaikan Masalah Lama Modul 7

Sesuai catatan PRD Modul 7 dan README sebelumnya, beberapa fitur mengalami kendala akibat ketidakcocokan querySelector DOM:
- **Posting Form:** Form pada `buat-postingan.html` sebelumnya tidak terpicu karena selektor `data-post-form` tidak ada pada markup. Di Next.js, form ditangani langsung melalui event `onSubmit` React dan fungsi `createPost()`, kemudian mengarahkan ke `/sukses-postingan?id=...`.
- **Halaman Sukses:** Diperbaiki sehingga hanya menampilkan detail konfirmasi bila data postingan dengan ID terkait benar-benar ditemukan di `localStorage`.
- **Chat Lokal:** Input pengiriman pesan dan daftar kontak sebelumnya tidak tersambung. Di Next.js, chat sepenuhnya reaktif dengan state obrolan dan auto-scroll ke pesan terbaru.
- **Notifikasi:** Tombol "Tandai semua terbaca" dan filter kini langsung memperbarui state dan persisten di browser.
- **Rating:** Form ulasan memvalidasi bintang 1–5 serta komentar minimal 10 karakter, lalu mengupdate status aktivitas menjadi "selesai" di `localStorage`.
- **Form Bantuan:** Tautan lama yang merujuk ke `review-bantuan.html` (berkas fiktif) kini diganti dengan form interaktif 3 tahap (Isi Form → Review → Konfirmasi) yang terhubung ke pesan obrolan.

---

## 6. Panduan Deployment

Deployment ditangani sendiri oleh Zaki Mubarok (Ketua). Aplikasi Next.js ini dirancang fleksibel untuk dua jenis target hosting:

### A. Hosting Berbasis Node.js (Vercel, Render, Railway, VPS, Cloudflare OpenNext)
- Mendukung fitur dinamis Next.js, Server Components, dan redirects server-side.
- Konfigurasi saat ini di `next.config.mjs` sudah siap untuk lingkungan ini.
- Perintah build: `npm run build`
- Perintah start: `npm run start`

### B. Static HTML Export (Shared Hosting cPanel, GitHub Pages, Netlify Static)
- Jika hosting target **tidak** mendukung Node.js (hanya web server statis Apache/Nginx):
  1. Tambahkan `output: 'export'` pada `next.config.mjs`:
     ```javascript
     const nextConfig = {
       output: 'export',
       trailingSlash: true,
       // ...
     };
     ```
  2. Jalankan `npm run build`. Next.js akan menghasilkan folder `out/` berisi berkas HTML/CSS/JS statis murni yang dapat langsung diunggah via FTP/File Manager ke folder `public_html`.
  3. Konfigurasi final deployment dapat diputuskan Zaki setelah informasi spesifikasi hosting diperoleh.

---

## 7. Perintah Menjalankan Proyek

Semua perintah dijalankan di direktori root repositori:

```bash
# 1. Pasang dependensi
npm install
# atau
npm ci

# 2. Jalankan server pengembangan lokal (Next.js)
npm run dev
# Buka http://localhost:3000 di browser

# 3. Jalankan pemeriksaan lint kode
npm run lint

# 4. Bangun paket produksi
npm run build

# 5. Jalankan server produksi lokal
npm run start
```
