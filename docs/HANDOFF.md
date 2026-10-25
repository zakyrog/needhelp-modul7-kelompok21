# Dokumen Serah Terima (HANDOFF) — NeedHelp Jogja
**Proyek:** NeedHelp Jogja (Kelompok 21 / Modul 8 Upgrade)  
**Cabang Git:** `feat/phase-2-ui-features`  
**Tanggal:** 26 Oktober 2026  
**Status:** Tahap 1 - 7 Diimplementasikan & Diverifikasi Lokal; Pengujian Multi-Akun Live Supabase Siap Dijalankan Besok  

---

## 1. Halaman dan Fitur yang Selesai

Seluruh arsitektur visual dan fungsional NeedHelp Jogja telah berhasil dibangun sesuai spesifikasi [`docs/PRD.md`](file:///C:/needhelp-modul7-kelompok21-main/docs/PRD.md), [`docs/BUSINESS_RULES.md`](file:///C:/needhelp-modul7-kelompok21-main/docs/BUSINESS_RULES.md), [`docs/TECH_SPEC.md`](file:///C:/needhelp-modul7-kelompok21-main/docs/TECH_SPEC.md), dan arahan desain [`docs/DESIGN_DIRECTION.md`](file:///C:/needhelp-modul7-kelompok21-main/docs/DESIGN_DIRECTION.md):

### A. Tata Letak Fondasi & Kerangka Desktop 3-Kolom (LinkedIn-Style)
* **Tata Letak 3-Kolom ([`ThreeColumnLayout.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/ThreeColumnLayout.jsx)):**
  * **Kolom Kiri (240px):** Menampilkan [`ProfileMiniCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/ProfileMiniCard.jsx) dengan status profil pengguna (atau kartu ajakan login bagi tamu), statistik reputasi bintang, dan tautan pintas navigasi aktivitas.
  * **Kolom Tengah (640px):** Area konten utama dinamis untuk feed postingan, formulir pencarian/filter, rincian bantuan, chat, dan formulir rating.
  * **Kolom Kanan (280px):** Menampilkan [`CommunityTipsWidget.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/CommunityTipsWidget.jsx) berisi tips keamanan interaksi di Jogja, tombol pintas 5 wilayah DIY, dan catatan hak cipta komunitas.
* **Header Sticky 64px ([`Header.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/Header.jsx)):**
  * Logo NeedHelp Jogja dengan warna Jogja toska (`#4a9ba0`) dan slate gelap (`#0f2e33`).
  * Kolom pencarian global cepat terintegrasi langsung dengan katalog.
  * Ikon menu navigasi: Beranda, Katalog, Buat Postingan, Aktivitas, Obrolan, dan Profil.
* **Docked Chat Drawer ([`DockedChatDrawer.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/DockedChatDrawer.jsx)):**
  * Laci obrolan mengambang (*docked*) di pojok kanan bawah desktop ala LinkedIn, dapat dibuka/tutup tanpa meninggalkan halaman saat ini.
* **Navigasi Seluler Bawah ([`BottomNav.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/BottomNav.jsx)):**
  * Bilah navigasi tetap (*fixed bottom bar*) pada layar ponsel (`< 768px`) dengan tombol utama Beranda, Jelajah, Buat Postingan, Aktivitas, dan Chat.

---

### B. Beranda & Feed Komunitas ([`src/app/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/page.js))
* **Hero Banner Sambutan Jogja:** Banner bergradien toska-slate dengan indikator komunitas aktif dan pill filter cepat kategori populer (*Bantuan Fisik*, *Belajar & Les*, *Ditemani Ngopi*, *Explore Jogja*).
* **Quick Post Box ([`QuickPostBox.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/QuickPostBox.jsx)):** Input cepat di bagian atas feed dengan dua tombol aksi setara: `+ Saya Butuh` (merah bata lembut) dan `+ Saya Bisa` (hijau sage lembut).
* **Tab Filter Feed:** Pilihan cepat tab *🌐 Semua Postingan*, *🆘 Saya Butuh*, dan *✨ Saya Bisa* dengan penghitung jumlah postingan aktif secara real-time.
* **Feed Stream:** Menampilkan kartu postingan menggunakan [`CatalogCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/CatalogCard.jsx) yang memuat avatar pembuat, nama, rating, badge wilayah DIY, deskripsi, kuota, tanggal kegiatan, dan tombol aksi.

---

### C. Penjelajahan Publik & Filter 5 Wilayah DIY ([`src/app/katalog/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/katalog/page.js))
* **Sinkronisasi Dua Arah URL `searchParams`:** Setiap perubahan filter langsung tersinkronisasi ke URL (`q`, `type`, `region`, `compensation`, `category`, `sort`, `page`), sehingga tautan dapat dibagikan atau di-bookmark.
* **Filter Wilayah 5 Kab/Kota DIY:** Sleman, Kota Yogyakarta, Bantul, Kulon Progo, dan Gunungkidul.
* **Filter 6 Opsi Imbalan Resmi:** Tarif Pasti, Nego di Chat, Patungan Biaya, Bayar Sendiri-sendiri, Traktir Makan/Minum, dan Sukarela (Tanpa Imbalan).
* **Filter Kategori Cepat:** Chip tombol kategori yang dapat dipilih ganda (multi-select).
* **Kondisi Kosong Wilayah (*Empty State*):** Jika suatu wilayah belum memiliki postingan, ditampilkan kartu informatif yang ramah dengan opsi reset filter atau ajakan membuat postingan pertama.
* **Paginasi & Pengurutan:** Paginasi halaman terintegrasi dan pengurutan berdasarkan *Terbaru Diunggah* atau *Jadwal Terdekat*.

---

### D. Detail Postingan ([`src/app/detail-postingan/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/detail-postingan/page.js))
* Tata letak 3-kolom yang konsisten.
* Informasi kuota sisa yang jelas dengan badge status (*Tersedia* vs *Kuota Penuh*).
* Profil pembuat postingan lengkap dengan bintang reputasi dan jumlah ulasan terverifikasi.
* Tombol aksi "Kirim Pesan / Bicarakan Bantuan" yang langsung membuka percakapan ke pengguna tersebut.
* Tombol "Bagikan Postingan" untuk menyalin tautan langsung.

---

### E. Formulir Penerbitan Postingan ([`src/app/buat-postingan/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/buat-postingan/page.js))
* **Dua Pintu Setara:** Pemilih jenis postingan *Saya Butuh* vs *Saya Bisa* dengan penjelasan tujuan yang jelas.
* **Validasi Ketat:**
  * Judul minimal 6 karakter.
  * Deskripsi minimal 20 karakter.
  * Tanggal kegiatan tidak boleh di masa lampau.
  * Kuota penerima minimal 1 orang (untuk Saya Butuh).
  * 6 pilihan imbalan resmi (termasuk Bayar Sendiri-sendiri).
* **Proteksi Akses Server:** Rute diproteksi oleh [`src/middleware.js`](file:///C:/needhelp-modul7-kelompok21-main/src/middleware.js); tamu tanpa login dialihkan ke `/login?next=/buat-postingan`.
* **Penyimpanan:** Insert langsung ke tabel Supabase `posts` dengan fallback lokal yang aman.

---

### F. Percakapan & Kartu Kesepakatan di Chat ([`src/app/chat/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/chat/page.js))
* **Daftar Thread Percakapan:** Menampilkan daftar obrolan aktif dengan mitra bantuan.
* **Streaming Pesan & Supabase Realtime:** Aliran pesan teks dengan langganan saluran `supabase.channel` untuk pembaruan instan antarpengguna tanpa perlu reload.
* **Kartu Kesepakatan di Chat ([`DealCard.jsx`](file:///C:/needhelp-modul7-kelompok21-main/src/components/DealCard.jsx)):**
  * Memuat parameter lengkap: judul bantuan, peserta, waktu pelaksanaan, titik temu, jenis imbalan, dan nominal.
  * Pelacakan persetujuan ganda (*mutual consensus*): Menampilkan status persetujuan masing-masing pihak secara transparan.
  * **Aksi Persetujuan Atomik:** Memanggil RPC Supabase `agree_deal_atomic` yang mengunci status menjadi `disepakati` hanya setelah kedua pihak setuju pada nomor versi yang sama.
  * **Modal Ajukan Revisi:** Perubahan isi memicu kenaikan nomor versi (`version + 1`) dan membatalkan persetujuan versi lama.
  * **Modal Batalkan Kesepakatan:** Membatalkan deal dengan alasan terstruktur.

---

### G. Aktivitas & Siklus Selesai ([`src/app/aktivitas/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/aktivitas/page.js))
* **Tab Status Kegiatan:** Memisahkan kegiatan berdasarkan status: *Semua*, *Berjalan / Terjadwal*, *Selesai*, dan *Dibatalkan*.
* **Konfirmasi Ganda Penyelesaian:**
  * Tombol "Konfirmasi Selesai" memanggil RPC Supabase `confirm_activity_completion`.
  * Status kegiatan hanya berganti menjadi `selesai` jika kedua belah pihak telah memberikan konfirmasi masing-masing.
* **Tautan Penilaian:** Ketika kegiatan telah berstatus `selesai`, muncul tombol langsung untuk memberi ulasan ke mitra bantuan.

---

### H. Ulasan & Rating Reputasi ([`src/app/rating/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/rating/page.js))
* Validasi kegiatan: Hanya kegiatan berstatus `selesai` yang dapat dinilai.
* Pemilih bintang interaktif (1 sampai 5 bintang).
* Kolom ulasan tekstual (10 sampai 500 karakter).
* Perlindungan anti self-rating dan perlindungan ulasan ganda (satu ulasan per pihak per kegiatan, dijamin oleh constraint unik database).
* Trigger database Supabase `update_profile_rating` secara otomatis memperbarui nilai `rating_average` dan `rating_count` pada profil pengguna tanpa manipulasi manual.

---

### I. Autentikasi & Profil Pengguna ([`src/app/login/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/login/page.js), [`src/app/profil/page.js`](file:///C:/needhelp-modul7-kelompok21-main/src/app/profil/page.js))
* Pendaftaran akun baru dan login berbasis email/password dengan Supabase Auth.
* Penanganan redirect tujuan (`?next=...`) setelah login berhasil.
* Halaman profil menampilkan statistik reputasi, badge anggota terverifikasi, formulir ubah nama dan bio, serta riwayat postingan yang dibuat pengguna.

---

## 2. Integrasi yang Terhubung dan Status Fallback

| Komponen Integrasi | Status Keterhubungan | Catatan Teknis & Mode Fallback |
|---|---|---|
| **Database Supabase (`podbybeihwbawmamfkua`)** | ✅ **Terhubung & Skema Aktif** | Seluruh 7 tabel (`profiles`, `posts`, `chat_threads`, `chat_messages`, `deals`, `activities`, `reviews`) telah dibuat dan RLS aktif. |
| **Aturan Keamanan (RLS & RPC)** | ✅ **Terhubung** | RPC `agree_deal_atomic`, `confirm_activity_completion`, dan `increment_deal_version` telah terpasang dengan `SECURITY DEFINER` dan pembatasan otorisasi. |
| **Supabase SSR Sesi Cookie** | ✅ **Terhubung** | Menggunakan `@supabase/ssr` melalui [`src/lib/supabase/server.js`](file:///C:/needhelp-modul7-kelompok21-main/src/lib/supabase/server.js), [`src/lib/supabase/client.js`](file:///C:/needhelp-modul7-kelompok21-main/src/lib/supabase/client.js), dan [`src/middleware.js`](file:///C:/needhelp-modul7-kelompok21-main/src/middleware.js). |
| **Proteksi Server Route** | ✅ **Aktif** | Middleware menolak akses unauthenticated pada `/buat-postingan`, `/aktivitas`, `/rating` dan mengarahkan ke `/login`. |
| **Supabase Realtime Channel** | ✅ **Terhubung di Chat** | Langganan `postgres_changes` aktif pada tabel `chat_messages` dan `deals`. |
| **Data Feed & Katalog Publik** | ✅ **Terhubung + Fallback Graceful** | Membaca data riil dari Supabase; jika koneksi gagal atau data remote masih kosong, sistem secara transparan menyajikan data contoh wilayah DIY agar antarmuka tetap dapat didemonstrasikan. |
| **Akun Uji Pengguna Riil** | ⏳ **Menunggu Kredensial Pengujian** | Pengujian 23 skenario otomatis ditunda sampai besok sesuai arahan pengguna. File konfigurasi `.test-credentials.local.json` telah disiapkan dan diabaikan oleh Git. |

---

## 3. Pemeriksaan yang Dijalankan dan Hasilnya

### A. Pemeriksaan Lint (`npm run lint`)
* **Hasil:** **LULUS (0 Error, 0 Warning)**
* **Waktu:** 26 Oktober 2026, 01:51 WIB

### B. Pemeriksaan Build Produksi (`npm run build`)
* **Hasil:** **LULUS (19 dari 19 rute terkompilasi sukses dalam 5.9 detik)**
* Seluruh halaman publik, rute dinamis, dan middleware terkompilasi optimal tanpa issue CSS atau JavaScript.

### C. Pemeriksaan Visual Antarmuka (Chrome Headless Screenshots)
Tangkapan layar resolusi tinggi telah diambil secara otomatis di tiga format viewport (Desktop 1440px, Tablet 1024px, dan Ponsel 390px) dan tersimpan di folder [`docs/screenshots/`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/):

| Viewport | Halaman | Berkas Tangkapan Layar | Status Tampilan |
|---|---|---|---|
| **Desktop 1440x900** | Beranda Feed | [`docs/screenshots/01-desktop-1440-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/01-desktop-1440-beranda.png) | 3-kolom simetris, Hero Banner bergradien, Quick Post Box, Feed Card |
| **Desktop 1440x900** | Katalog & Filter | [`docs/screenshots/02-desktop-1440-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/02-desktop-1440-katalog.png) | Panel filter terstruktur, dropdown wilayah DIY, chip kategori |
| **Desktop 1440x900** | Buat Postingan | [`docs/screenshots/03-desktop-1440-buat-postingan.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/03-desktop-1440-buat-postingan.png) | Redirect ke Login via Middleware (proteksi server berfungsi) |
| **Desktop 1440x900** | Percakapan & Chat | [`docs/screenshots/04-desktop-1440-chat.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/04-desktop-1440-chat.png) | Antarmuka chat, panel thread, integrasi kartu kesepakatan |
| **Desktop 1440x900** | Aktivitas | [`docs/screenshots/05-desktop-1440-aktivitas.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/05-desktop-1440-aktivitas.png) | Redirect ke Login via Middleware (proteksi server berfungsi) |
| **Desktop 1440x900** | Profil Pengguna | [`docs/screenshots/06-desktop-1440-profil.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/06-desktop-1440-profil.png) | Kartu reputasi bintang, detail profil pengguna, daftar postingan |
| **Tablet 1024x768** | Beranda Feed | [`docs/screenshots/07-tablet-1024-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/07-tablet-1024-beranda.png) | Tata letak menyesuaikan responsif, kolom kanan tertata rapi |
| **Tablet 1024x768** | Katalog | [`docs/screenshots/08-tablet-1024-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/08-tablet-1024-katalog.png) | Kontrol panel filter responsif dan mudah ditekan |
| **Mobile 390x844** | Beranda Feed | [`docs/screenshots/09-mobile-390-beranda.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/09-mobile-390-beranda.png) | Kolom tunggal, Bottom Nav aktif di bagian bawah, bebas scroll horizontal |
| **Mobile 390x844** | Katalog | [`docs/screenshots/10-mobile-390-katalog.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/10-mobile-390-katalog.png) | Filter bertumpuk vertikal yang ergonomis untuk sentuhan jari |
| **Mobile 390x844** | Buat Postingan | [`docs/screenshots/11-mobile-390-buat-postingan.png`](file:///C:/needhelp-modul7-kelompok21-main/docs/screenshots/11-mobile-390-buat-postingan.png) | Halaman login redirect tampil presisi dan ramah layar ponsel |

---

## 4. Pengujian yang Ditunda

Sesuai arahan pengguna ("*Pengujian yang membutuhkan akun Supabase saya tunda sampai besok*"):
* **Pengujian Otomatis 23 Skenario Multi-User ([`scripts/test-suite.mjs`](file:///C:/needhelp-modul7-kelompok21-main/scripts/test-suite.mjs)):**
  * Skenario 1 - 5: Registrasi, login, logout, dan persistensi sesi Akun A & B.
  * Skenario 6 - 8: RLS Profile (isolasi edit profil lawan, proteksi kolom reputasi).
  * Skenario 9 - 11: Penerbitan postingan Saya Butuh (Akun A) dan Saya Bisa (Akun B).
  * Skenario 12 - 16: Pengujian Chat riil dan RLS Pesan (tamu/pihak ketiga tidak bisa menyusup).
  * Skenario 17 - 20: Persetujuan kesepakatan atomik (`agree_deal_atomic`), penurunan kuota, pembuatan kegiatan.
  * Skenario 21 - 23: Konfirmasi penyelesaian ganda (`confirm_activity_completion`), ulasan rating, dan pembaruan trigger reputasi.

---

## 5. Masalah Tersisa dan Langkah Berikutnya Bagi Pengguna

Tidak ada kendala pemblokir (*blocking issues*) pada kode aplikasi saat ini. Seluruh kode siap diuji dengan akun nyata. Berikut langkah mudah yang dapat Anda lakukan besok:

### Langkah 1: Siapkan 2 Akun Pengujian di Supabase
Anda dapat mendaftarkan dua email pengujian (misal `tester.a@needhelp.jogja` dan `tester.b@needhelp.jogja`):
* Opsi A: Lewat antarmuka aplikasi di [http://localhost:3000/login](http://localhost:3000/login) &rarr; klik tab **Daftar Akun Baru**.
* Opsi B: Lewat Supabase Dashboard &rarr; **Authentication** &rarr; **Users** &rarr; **Add User** (centang *Auto Confirm User* jika tidak ingin repot verifikasi tautan email saat pengujian).

### Langkah 2: Buat Berkas Kredensial Lokal Pengujian
Salin berkas contoh:
```bash
Copy-Item .test-credentials.local.example.json .test-credentials.local.json
```
Buka `.test-credentials.local.json` dan isi email serta kata sandi kedua akun tersebut:
```json
{
  "userA": {
    "email": "akunA@example.com",
    "password": "passwordAkunA123"
  },
  "userB": {
    "email": "akunB@example.com",
    "password": "passwordAkunB123"
  }
}
```
*(Catatan: Berkas `.test-credentials.local.json` sudah diabaikan secara ketat oleh `.gitignore`, sehingga tidak akan pernah terdorong ke repositori Git).*

### Langkah 3: Jalankan Skrip Pengujian Otomatis
Jalankan perintah berikut di terminal:
```bash
node scripts/test-suite.mjs
```
Skrip akan menguji seluruh 23 skenario positif dan negatif (termasuk proteksi RLS dan RPC atomik) dan mencetak laporan kelulusan (*Pass/Fail*).

### Langkah 4: Uji Interaktif di Dua Peramban Berbeda
1. Buka Chrome biasa untuk Akun A dan Chrome Incognito / Firefox untuk Akun B.
2. Login pada kedua jendela.
3. Akun A menerbitkan postingan *Saya Butuh*.
4. Akun B membuka detail postingan dan mengklik *Kirim Pesan*.
5. Buka `/chat` pada kedua jendela dan amati pesan mengalir secara *realtime*.
6. Kirim kartu kesepakatan (*Deal Card*) dan klik *Setujui* dari kedua belah pihak untuk melihat status berubah menjadi *Disepakati* dan kuota postingan berkurang secara instan.

---

## 6. Cara Menjalankan Aplikasi Secara Lokal

### Menjalankan Server Pengembangan:
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

### Menjalankan Build Produksi:
```bash
npm run build
npm run start
```

### Menjalankan Linter:
```bash
npm run lint
```

### Mengambil Ulang Tangkapan Layar:
```bash
node scripts/capture-screenshots.mjs
```
*(Membutuhkan Google Chrome terpasang di path standar Windows).*
