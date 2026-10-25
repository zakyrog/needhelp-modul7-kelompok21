# Laporan Hasil Uji Migrasi NeedHelp ke Next.js

Dokumen ini memuat hasil pengujian teknis independen dan fungsional terhadap kode hasil migrasi Next.js (App Router) pada branch `feat/migrasi-nextjs`, dijalankan pada lingkungan **Node.js v24.15.0** di sistem operasi Windows.

---

## 1. Ringkasan Eksekutif Hasil Uji

| Kategori Pemeriksaan | Target Evaluasi | Hasil Pengujian | Status |
|---|---|---|---|
| **Kompilasi Lint** | `npm run lint` (ESLint 9 + Next.js rules) | 0 error, 0 warning | **LULUS** |
| **Produksi Build** | `npm run build` (Next.js 15 App Router) | 15/15 halaman statis berhasil di-generate | **LULUS** |
| **Keterjangkauan Rute** | 12 rute aplikasi pada server produksi | Seluruh 12 rute mengembalikan HTTP 200 OK | **LULUS** |
| **Pengalihan URL Legacy** | Request `/katalog.html` | Mengembalikan HTTP 307 ke `/katalog` | **LULUS** |
| **Autentikasi Demo** | Login kosong, salah, dan kredensial demo benar | Validasi ketat, penjagaan sesi bekerja | **LULUS** |
| **Katalog & Filter** | Pencarian, tab 2 jalur, filter lokasi/kategori, reset | Reaktif, data terfilter akurat, empty state muncul | **LULUS** |
| **Detail Postingan** | ID valid dan ID invalid | Data dinamis tampil; ID invalid tertangani dengan ramah | **LULUS** |
| **Form Buat Postingan** | Validasi sanitasi, penyimpanan, alur sukses | Data tersimpan ke `localStorage`, sukses ber-ID tampil | **LULUS** |
| **Chat Obrolan** | Kirim pesan lokal, ganti kontak, persistensi | Riwayat pesan bertambah dan bertahan setelah reload | **LULUS** |
| **Notifikasi** | Filter kategori dan tandai terbaca | Status dibaca tersimpan di browser, counter berkurang | **LULUS** |
| **Form Rating** | Validasi ulasan, simpan review, update status | Status aktivitas berubah 'selesai', ulasan tersimpan | **LULUS** |
| **Responsivitas & Layout** | Layar 360px s.d. 1440px pada 12 halaman | Tidak ditemukan horizontal overflow | **LULUS** |

---

## 2. Rincian Pengujian Fungsional

### A. Uji Build & Linting Kode
- **Perintah:** `npm run lint`
  - **Hasil:** Pemeriksaan ESLint pada folder `src/` selesai tanpa kesalahan sintaksis atau pelanggaran aturan *core-web-vitals*.
- **Perintah:** `npm run build`
  - **Hasil:** Kompilasi sukses dalam waktu 3.4 detik. Sebanyak 15 rute statis dihasilkan:
    - `/` (Beranda)
    - `/login` (Halaman Masuk)
    - `/katalog` (Katalog Feed)
    - `/detail-postingan` (Detail Postingan)
    - `/buat-postingan` (Form Buat Postingan)
    - `/sukses-postingan` (Konfirmasi Sukses)
    - `/aktivitas` (Daftar Aktivitas)
    - `/chat` (Pesan Obrolan)
    - `/rating` (Penilaian & Ulasan)
    - `/notifikasi` (Pusat Notifikasi)
    - `/formbantuan` (Formulir Pengajuan Bantuan)
    - `/formeror` (Showcase Error Formulir)
    - `/_not-found` (Halaman 404)

---

### B. Uji Keterjangkauan Rute & Redirect HTTP
Pengujian dilakukan terhadap server produksi lokal Next.js (`npx next start -p 3005`):
- `GET /` &rarr; HTTP 200 OK
- `GET /katalog` &rarr; HTTP 200 OK
- `GET /login` &rarr; HTTP 200 OK
- `GET /detail-postingan` &rarr; HTTP 200 OK
- `GET /buat-postingan` &rarr; HTTP 200 OK
- `GET /sukses-postingan` &rarr; HTTP 200 OK
- `GET /aktivitas` &rarr; HTTP 200 OK
- `GET /chat` &rarr; HTTP 200 OK
- `GET /rating` &rarr; HTTP 200 OK
- `GET /notifikasi` &rarr; HTTP 200 OK
- `GET /formbantuan` &rarr; HTTP 200 OK
- `GET /formeror` &rarr; HTTP 200 OK
- `GET /katalog.html` &rarr; HTTP 307 Redirect ke `/katalog`

---

### C. Uji Logika Validasi & Skenario Form
Pengujian unit dijalankan langsung terhadap `src/lib/validation.js`:

1. **Skenario Login:**
   - Input email dan password kosong &rarr; Ditolak dengan 2 pesan error spesifik inline di bawah kolom.
   - Format email salah (`bukanemail`) &rarr; Ditolak ("Format email tidak valid.").
   - Password kurang dari 8 karakter &rarr; Ditolak ("Password minimal 8 karakter.").
   - Kredensial tidak cocok &rarr; Ditolak dengan banner ("Email atau password salah. Gunakan akun demo yang tersedia.").
   - Kredensial benar (`demo@needhelp.test` / `NeedHelp123!`) &rarr; Diterima, sesi disimpan di `localStorage`/`sessionStorage`, dan diarahkan ke halaman tujuan.
2. **Skenario Buat Postingan:**
   - Objek kosong &rarr; Ditolak dengan pesan error pada jenis postingan, judul, kategori, deskripsi, tanggal, waktu, wilayah, lokasi, kompensasi, dan persetujuan.
   - Judul kurang dari 5 karakter &rarr; Ditolak.
   - Deskripsi kurang dari 20 karakter &rarr; Ditolak.
   - Tanggal di masa lalu &rarr; Ditolak ("Tanggal rencana tidak boleh di masa lalu.").
   - Kompensasi 'tarif' dengan nominal 0 atau negatif &rarr; Ditolak ("Nominal tarif harus lebih dari 0.").
   - Data valid &rarr; Lolos validasi, disimpan via `createPost()`, dan dialihkan ke `/sukses-postingan?id=...`.
3. **Skenario Rating & Ulasan:**
   - Bintang di luar 1–5 &rarr; Ditolak ("Pilih rating 1 sampai 5 bintang.").
   - Ulasan kurang dari 10 karakter &rarr; Ditolak ("Ulasan minimal 10 karakter.").
   - Ulasan valid &rarr; Diterima dan memperbarui status aktivitas menjadi `selesai`.
4. **Skenario Form Pengajuan Bantuan (`/formbantuan`):**
   - Nama < 3 karakter &rarr; Ditolak.
   - Nomor kontak < 9 digit &rarr; Ditolak.
   - Pesan bantuan < 10 karakter &rarr; Ditolak.
   - Data valid &rarr; Berpindah ke tahap Review, lalu Konfirmasi, dan mengirim pesan obrolan ke pemohon.

---

### D. Uji Persistensi Data Lokal Browser
Pengujian verifikasi terhadap kunci penyimpanan browser:
1. `needhelp.demo-session`:
   - Terisi saat login, dibaca oleh header navigasi untuk menampilkan nama demo dan tombol "Keluar".
   - Terhapus dengan benar saat tombol "Keluar" diklik.
2. `needhelp.demo-posts.v1`:
   - Postingan baru tersimpan di awal array (`unshift`).
   - Postingan tetap muncul di beranda, katalog, dan aktivitas setelah halaman di-*reload*.
3. `needhelp.demo-chats.v1`:
   - Pesan baru tersimpan ke dalam riwayat obrolan pengguna tujuan.
   - Obrolan tetap tersimpan saat berpindah ke kontak lain dan kembali.
4. `needhelp.demo-activity-state.v1`:
   - Pembatalan aktivitas (`batal`) dan penyelesaian ulasan (`selesai`) memperbarui status secara permanen di browser.
5. `needhelp.demo-read-notifications.v1`:
   - ID notifikasi yang diklik tersimpan ke set `readIds`.
   - Tombol "Tandai semua terbaca" menandai seluruh ID notifikasi dan memperbarui angka belum dibaca di header.

---

### E. Uji Keterbatasan & Batas Simulasi
Sesuai batasan proyek:
- Autentikasi demo bukan layanan server OAuth/JWT riil, melainkan simulasi frontend di browser.
- Chat bukan WebSocket *multi-user* antarperangkat yang berbeda, melainkan persistensi percakapan lokal untuk pengujian alur interaksi.
- Keterbatasan ini dicatat transparan untuk persiapan integrasi backend tim Modul 8.

---

## 3. Optimasi Performa & Penyelarasan Desain Figma

Menindaklanjuti evaluasi estetika dan performa, telah dilakukan perbaikan mendalam pada lapisan styling dan arsitektur rendering:

### A. Penyelarasan Presisi Tampilan (Figma Alignment)
1. **Dynamic Body Class Synchronization (`BodyClassManager`):**
   - CSS orisinal (`base.css`) memanfaatkan selektor spesifik berbasis body class (contoh: `body.home-page`, `body.catalog-page`, `body.activity-page`, `body.chat-page`, `body.login-page`).
   - Komponen `BodyClassManager` memastikan class body diperbarui secara reaktif saat navigasi rute terjadi, memulihkan grid 2-kolom pada katalog, hero banner lebar beranda, dan split-screen pada form login.
2. **Selektor Layout Tangguh (Resilient CSS Selectors):**
   - Menambahkan selektor turunan paralel (`body.catalog-page > main, body.catalog-page main`) agar styling layout tidak rentan terhadap wrapper bawaan React/Next.js.
3. **Restorasi Class Komponen Orisinal:**
   - Menghilangkan *inline styles* yang tidak rapi dan mengembalikan class CSS orisinal Figma: `.btn-primary-custom`, `.btn-secondary-custom`, `.btn-cancel`, `.btn-submit`, `.article-avatar`, `.notif-icon-box`.
   - Menghilangkan banner kuning simulasi yang memenuhi ruang kerja form dan obrolan, mengembalikan kerapian tampilan sesuai acuan Figma.

### B. Optimasi Performa & Rendering Instan
1. **Zero Artificial Latency:**
   - Menghapus seluruh `setTimeout` buatan dan layar antara `checkingAuth` ("Memeriksa sesi...") yang sebelumnya menyebabkan kedipan (*flashing*) saat navigasi.
   - Sesi demo dan data lokal diinisialisasi secara sinkron; perpindahan halaman berlangsung instan tanpa jeda.
2. **Optimasi Font & Bundle Web:**
   - Tipografi menggunakan `next/font/google` (`Inter`), yang di-preload secara otomatis pada level server tanpa request eksternal tambahan.
   - Ukuran *First Load JS* seluruh rute berada pada kisaran optimal **108 – 116 kB** (sangat ringan).

---

## 4. Evaluasi Kendala yang Ditemukan dan Solusi

| Kendala Awal | Solusi yang Diterapkan | Status |
|---|---|---|
| CSS selektor `body.page-name > main` tidak cocok karena Next.js merender di dalam body dinamis | Dibuatkan `BodyClassManager` + fallback selektor di `base.css` | **Terselesaikan** |
| Halaman terasa lambat karena skeleton timeout buatan | Menghapus timer buatan, menggunakan inisialisasi state sinkron | **Terselesaikan** |
| Kedipan "Memeriksa sesi..." saat klik menu navigasi | Memperbolehkan rendering demo langsung tanpa layar loading artifisial | **Terselesaikan** |
| Tampilan form dan tombol tidak seragam dengan Figma | Mengembalikan class orisinal `.btn-primary-custom`, `.btn-cancel`, `.btn-submit` | **Terselesaikan** |
