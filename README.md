# NeedHelp Jogja — Kelompok 21 / Modul 8

NeedHelp mempertemukan orang yang membutuhkan bantuan atau teman situasional dengan orang yang menawarkan waktu dan kemampuan di Yogyakarta. Aplikasi menggunakan Next.js App Router, React, JavaScript, dan CSS Variables.

## Website dan dokumen

- **Website publik:** https://needhelpjogja.my.id/
- **Katalog untuk demo:** https://needhelpjogja.my.id/katalog
- **Aktivitas:** https://needhelpjogja.my.id/aktivitas
- **Repository:** https://github.com/zakyrog/needhelp-modul7-kelompok21
- **Figma:** https://www.figma.com/design/iP8nJj7pgr2LxL1nvtuTAa/Need-Based-Companion---Help-FIX?node-id=85-60
- **Log AI:** [docs/Log-AI.md](docs/Log-AI.md)
- **Laporan migrasi historis:** [docs/Hasil-Uji-Migrasi.md](docs/Hasil-Uji-Migrasi.md)

Pengembangan Modul 8 mengacu pada dokumen penugasan anggota Next.js Kelompok 21: data dinamis, formulir interaktif, status UX, pengujian, dan deployment. Laporan PDF memuat implementasi, panduan demonstrasi, serta hasil pengujian yang tersedia.

## Tim dan tanggung jawab

| Nama | Tanggung jawab |
|---|---|
| Zaki Mubarok — Ketua | Fondasi/migrasi Next.js, pemeriksaan kesesuaian persyaratan, dan pengiriman melalui form pengumpulan. |
| Suprihatini | Tampilan, responsivitas, dan komponen loading/empty/error/toast. |
| Felix Nicholas Juan Lee | Data JSON, pencarian/filter, validasi, dan penyimpanan form. |
| Arif Raharjo | Pengujian, deployment website, README, dan PDF dokumentasi. |

Pembagian ini mengikuti PDF penugasan: Suprihatini menangani UI/UX, Felix menangani data dan formulir, Arif menangani pengujian/deployment/dokumentasi, dan Zaki memeriksa persyaratan serta mengumpulkan tugas.

## Sasaran implementasi Modul 8

- Menampilkan postingan dari sumber data terstruktur menggunakan komponen React yang digunakan ulang.
- Menyediakan pencarian, filter Saya Butuh/Saya Bisa, kategori, wilayah, kompensasi, urutan, dan pagination.
- Memvalidasi serta menyimpan formulir postingan, kemudian menampilkan data kembali.
- Menyediakan skeleton loading, empty state dengan Reset, error state dengan Coba Lagi, dan toast.
- Menyediakan website publik dan dokumentasi untuk demonstrasi mentor.

## Sumber data dan layanan formulir yang digunakan

### Membaca postingan

1. `public/data/posts.json` menyediakan enam postingan awal pada versi yang diperiksa.
2. Browser mengambil `/data/posts.json` melalui `fetchSeedPosts()` di `src/lib/data.js`, menggunakan `cache: "no-store"` dan parameter waktu pada URL.
3. `src/data/posts.js` menyediakan fallback bawaan saat pembacaan JSON gagal; `src/data/posts.json` juga ada di source, tetapi jalur browser aktif adalah berkas di `public/data/`.
4. `fetchPublicPosts()` menggabungkan postingan awal dan postingan lokal, lalu mengeluarkan postingan yang dibatalkan.
5. Kartu dirender melalui komponen React dan loop; pencarian, filter kategori/wilayah/kompensasi, pengurutan, serta pagination memproses daftar tersebut.

### Menyimpan formulir

Form utama `/buat-postingan` menggunakan `createPost()` dan `savePost()` untuk menyimpan data terstruktur ke **localStorage**, dengan kunci `needhelp.demo-posts.v1`. Alurnya:

- Login menggunakan akun demo.
- Isi jenis Saya Butuh/Saya Bisa, judul, kategori, deskripsi, waktu, lokasi, kompensasi, dan persetujuan.
- Teks dibersihkan dengan `.trim()`; judul/alamat menghapus tanda `<` dan `>` melalui `sanitizeString()`. Sanitasi ini bekerja pada isian di sisi aplikasi.
- Validasi memeriksa kolom wajib, panjang teks, tanggal tidak lampau, pilihan yang sah, dan nominal tarif positif.
- Tombol terkunci saat proses, penyimpanan dijalankan, lalu toast sukses dan halaman `/sukses-postingan?id=...` ditampilkan.
- Data dibaca kembali oleh katalog, detail, dan aktivitas. Kegagalan simpan menampilkan pesan dan membuka kembali tombol.

**Integrasi formulir utama menggunakan localStorage terstruktur**, sesuai pilihan integrasi pada brief Modul 8.

Endpoint `/api/posts` tersedia: GET membaca JSON dari disk; POST mengembalikan respons penerimaan payload. Penyimpanan permanen pada server belum diterapkan di endpoint POST. Persistensi formulir utama menggunakan localStorage.

## Cara mentor mencoba aplikasi

### 1. Katalog, pencarian, dan filter

1. Buka https://needhelpjogja.my.id/katalog.
2. Pada browser baru, daftar awal memuat enam postingan; empat tampil pada halaman pertama.
3. Klik **Saya Bisa**: pada data awal terdapat dua postingan.
4. Cari `zzztidakada25` pada kolom Cari bantuan di panel Filter. Hasil menjadi kosong dan tombol **Bersihkan Filter** muncul.
5. Klik **Bersihkan Filter**: daftar awal kembali. Coba kategori, wilayah, kompensasi, dan urutan sesuai kebutuhan.

### 2. Form utama dan persistensi

1. Buka `/buat-postingan`; jika diarahkan, login memakai `demo@needhelp.test` / `NeedHelp123!`.
2. Coba kirim isian kosong: pesan validasi harus muncul di kolom terkait.
3. Isi contoh: jenis Saya Butuh; judul `Butuh teman diskusi tugas`; kategori Pendampingan; deskripsi minimal 20 karakter; tanggal besok; waktu 10.00; wilayah Sleman; lokasi `Area perpustakaan kampus`; kompensasi Sukarela; centang persetujuan.
4. Terbitkan dan periksa toast serta ringkasan sukses. Buka katalog/aktivitas dan temukan judul baru.
5. Reload pada browser dan domain yang sama. Data harus tetap tersedia.

Skenario demonstrasi formulir di atas menjadi acuan QA-04 dan QA-05 pada PDF penugasan. Hasil pengujian yang sudah dijalankan dicantumkan pada tabel verifikasi di bawah.

### 3. Error dan pemulihan

- Buka https://needhelpjogja.my.id/katalog?simulate_error=1, lalu klik **Coba Lagi**. Parameter simulasi dihapus dan daftar dimuat kembali.
- Pada form, kode menyediakan simulasi gagal simpan melalui judul yang mengandung `[simulasi-gagal]`. Gunakan hanya untuk pengujian; lengkapi isian valid lainnya, lalu pastikan tidak muncul sukses palsu.
- Kegagalan mengambil JSON biasa menggunakan fallback data lokal. Karena itu, adanya fallback perlu dibedakan dari simulasi error terkontrol.

## Menjalankan proyek lokal

Gunakan Node.js >=22.12.0 sesuai `package.json`. Jalankan perintah dari root repository:

```bash
git clone https://github.com/zakyrog/needhelp-modul7-kelompok21.git
cd needhelp-modul7-kelompok21
git checkout main
git pull origin main
npm ci
npm run dev
```

Buka http://localhost:3000. Pemeriksaan dan server produksi lokal:

```bash
npm run lint
npm run build
npm run start
```

Gunakan konfigurasi server Next.js sesuai lingkungan hosting. Pemeriksaan lokal mengikuti skrip dalam package.json. Hasil eksekusi terbaru dicatat pada laporan pengujian.

## Ringkasan pemeriksaan dokumentasi — 25 Oktober 2026

Kode yang dibaca: `main` pada commit `2a589e7`.

| Pemeriksaan | Hasil dan batas |
|---|---|
| Website `/aktivitas` | Dapat dibuka; tiga aktivitas contoh tampil sebagai tamu. |
| JSON publik | Dapat dibaca; enam postingan awal. |
| Katalog dan filter Saya Bisa | Diuji live; hasil berubah dari enam menjadi dua postingan. |
| Pencarian kosong dan Reset | Diuji live; 0 hasil lalu kembali enam. |
| Simulasi error dan Coba Lagi | Diuji live; error tampil dan daftar kembali. |
| Logika form | 13 pemeriksaan Node.js dengan storage memori lulus: validasi, trim, simpan/baca kembali, pencarian, dan kegagalan simpan. |
| Submit browser produksi dan reload | Belum diuji ulang pada pemeriksaan ini. |
| Lint/build dan semua viewport | Belum dijalankan ulang pada pemeriksaan ini. Laporan migrasi lama adalah bukti historis. |

## Penggunaan AI dan penyempurnaan implementasi

AI digunakan sebagai pendamping pengembangan dengan acuan pembagian tugas, kode Next.js, dan kontrak komponen tim. Entri Modul 8 Felix pada [docs/Log-AI.md](docs/Log-AI.md) mencatat penggunaan Antigravity pada 24 Oktober 2026.

### Ringkasan prompt teknis Felix (parafrasa)

Kembangkan integrasi data dan formulir pada aplikasi NeedHelp berbasis Next.js App Router. Gunakan sumber JSON untuk data awal dan localStorage terstruktur untuk postingan baru. Pertahankan desain dan komponen UI yang tersedia. Hubungkan pencarian/filter, validasi dan pembersihan input, status proses, pencegahan kirim ganda, penanganan kegagalan, serta alur sukses. Pastikan postingan dapat dibaca kembali pada katalog, detail, dan aktivitas. Sertakan cara pengujian setiap perubahan.

Ringkasan tersebut menyajikan arahan teknis yang diperluas dari konteks penugasan dan entri log; bukan transkrip prompt asli.

### Penyempurnaan yang tercatat

| Area | Penyesuaian implementasi | Bukti |
|---|---|---|
| UI dan status UX | Penyempurnaan skeleton, empty/error state, toast, pesan per kolom, dan CSS responsif. | PR #6, commit 1916bc1. |
| Data dinamis | Pemisahan data awal JSON serta penggabungan dengan postingan lokal. | PR #7, commit 541e437. |
| Kontrak komponen | Penyelarasan props komponen UI dengan status dan callback data/form. | Catatan perbaikan manual Felix dalam docs/Log-AI.md. |
| Skenario gagal | Penambahan parameter simulasi error agar retry dan gagal simpan dapat diperiksa. | src/lib/data.js dan catatan Felix. |
| Tanggal | Perhitungan tanggal validasi berdasarkan zona waktu lokal browser. | src/lib/validation.js dan catatan Felix. |

Riwayat prompt dan perbaikan manual yang tersedia disimpan dalam docs/Log-AI.md. Tabel ini membedakan bukti perubahan kode dari catatan proses manual; keduanya tidak dianggap sebagai bukti pengujian yang sama.

## Jejak kolaborasi

- [PR #5](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/5): migrasi fondasi Next.js.
- [PR #6](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/6): UI dan komponen status Suprihatini.
- [PR #7](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/7): data dinamis dan formulir Felix.

Pekerjaan anggota dilakukan pada branch masing-masing, ditinjau melalui PR, dan digabung ke main. Arif mengelola pengujian serta deployment. Zaki memeriksa kesesuaian hasil dengan penugasan dan mengirim berkas/link melalui form pengumpulan.

## Batas implementasi dan keamanan

- Sesi login dan chat adalah simulasi lokal; belum ada autentikasi server atau chat real-time antarpengguna.
- Data localStorage berlaku pada browser dan origin yang sama. Data dari localhost tidak ikut pindah ke domain live, dan data pada browser lain tidak otomatis sama.
- Menghapus data situs/localStorage menghilangkan data lokal; menghapus cache HTTP saja tidak selalu menghapus localStorage.
- `.gitignore` mengabaikan `.env`, `.env.*` kecuali `.env.example`, `node_modules`, `.next`, dan `out`. Tidak ditemukan file `.env` terlacak pada snapshot yang diperiksa; ini bukan audit seluruh riwayat rahasia.
- Jangan menyimpan secret server dalam `NEXT_PUBLIC_*`, karena nilainya dapat dikirim ke browser.

## Acuan dan laporan

- Dokumen penugasan anggota Modul 8 / Next.js Kelompok 21: pembagian peran, checklist QA-01 sampai QA-09, kriteria selesai, dan alur PR.
- Brief Modul 8 Vinix: data dinamis, formulir, UX states, keamanan kode, README/PDF, dan website publik.
- Laporan PDF dokumentasi NeedHelp Modul 8: gambaran implementasi, panduan mentor, pengujian, dan ringkasan penggunaan AI.
- Kode acuan pemeriksaan: main pada commit 2a589e7; observasi website dan pemeriksaan logika pada 25 Oktober 2026.
