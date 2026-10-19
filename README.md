# NeedHelp — Tugas Modul 7 Kelompok 21

**Need-Based Companion & Help** adalah prototipe web yang mempertemukan orang yang membutuhkan bantuan atau pendampingan dengan orang yang menawarkan waktu dan kemampuan di wilayah Yogyakarta.

Proyek ini melanjutkan struktur HTML Modul 6 dan rancangan Figma Modul 5 menjadi antarmuka responsif dengan interaksi berbasis JavaScript. Aplikasi menggunakan data dan akun demo di browser, tanpa backend atau database bersama.

## Tautan Pengumpulan

| Berkas / acuan | Tautan |
|---|---|
| Repository publik | [NeedHelp Modul 7 Kelompok 21](https://github.com/zakyrog/needhelp-modul7-kelompok21) |
| PRD final PDF | [Buka PRD Final NeedHelp di Google Drive](https://drive.google.com/file/d/1SuC0Wx6kJNWk4dfgUdfk4fdsHmkRSTOr/view?usp=sharing) |
| Desain Figma Modul 5 | [NeedHelp — Final UI](https://www.figma.com/design/iP8nJj7pgr2LxL1nvtuTAa/Need-Based-Companion---Help-FIX?node-id=85-60) |

PRD final menjadi acuan kebutuhan, kontribusi, hasil pengujian, dan keterbatasan implementasi. Dokumen PRD awal serta instruksi lama di folder `docs/` dipertahankan sebagai riwayat pengerjaan; gunakan pembagian terbaru di README ini dan PRD final.

## Anggota dan Kontribusi

| Nama | Tanggung jawab dan kontribusi |
|---|---|
| **Zaki Mubarok — Ketua** | Menyiapkan fondasi dan repository, mengoordinasikan pembagian tugas, memeriksa serta menggabungkan perubahan, dan menyiapkan dokumentasi pengumpulan. |
| **Suprihatini — Tampilan** | Menyusun dan merapikan halaman HTML berdasarkan Figma serta menambahkan halaman form bantuan, keadaan error, dan notifikasi. |
| **Felix Nicholas Juan Lee — Logika dan interaksi** | Mengembangkan navigasi, login/sesi demo, katalog/filter, utilitas data, dan logika posting, chat, aktivitas, serta rating. |
| **Arif Raharjo — QA dan dokumentasi** | Melakukan QA dan penyempurnaan UI, konsistensi navigasi, responsivitas, logika katalog/detail, utilitas data, dan konfigurasi build. |

Pembagian di atas merupakan pembagian terbaru setelah tugas Arif dan Felix ditukar. Setiap anggota dapat membantu bagian lain; kontribusi aktual ditelusuri melalui commit dan Pull Request.

## Konsep dan Alur Pengguna

NeedHelp menyediakan dua jalur:

- **Saya Butuh:** pengguna menyampaikan kebutuhan bantuan atau pendampingan.
- **Saya Bisa:** pengguna menawarkan waktu, keterampilan, atau jasa.

Beranda, katalog, dan detail postingan dapat dilihat tanpa login. Saat membuka fitur posting, chat, aktivitas, rating, notifikasi, atau konfirmasi sukses, aplikasi meminta sesi demo. Setelah login, pengguna diarahkan kembali ke tujuan yang diizinkan.

Alur produk yang dituju:

1. **Mencari bantuan:** beranda → katalog → pencarian/filter → detail → login bila perlu → komunikasi.
2. **Membuat postingan:** login → pilih Saya Butuh/Saya Bisa → isi form → validasi → sukses → katalog/aktivitas.
3. **Menutup aktivitas:** aktivitas berlangsung → selesai → rating dan ulasan.

Sebagian alur di atas masih memerlukan penyambungan antarmuka dengan handler JavaScript. Status hasil pengujian dijelaskan di bawah.

## Teknologi

| Komponen | Teknologi |
|---|---|
| Struktur halaman | HTML multi-halaman |
| Tampilan | CSS bersama dan CSS variables |
| Interaksi | JavaScript ES modules |
| Server pengembangan dan build | Vite; versi mengikuti `package.json` dan `package-lock.json` |
| Font | Inter melalui `@fontsource/inter` |
| Data demo | Data awal JavaScript dan utilitas penyimpanan browser |
| Kontrol versi | Git dan GitHub |

Proyek tidak memerlukan React, PHP, XAMPP, MySQL, atau layanan backend untuk dijalankan secara lokal.

## Cara Menjalankan di Komputer

### 1. Persiapan

- Pasang **Node.js versi 22.12.0 atau lebih baru** beserta npm.
- Unduh repository melalui **Code → Download ZIP**, lalu ekstrak. Atau gunakan Git:

```bash
git clone https://github.com/zakyrog/needhelp-modul7-kelompok21.git
cd needhelp-modul7-kelompok21
```

Jika menggunakan ZIP, buka folder hasil ekstraksi yang memuat `package.json`, `index.html`, `assets/`, dan `docs/` di VS Code. Nama folder hasil unduhan dapat berupa `needhelp-modul7-kelompok21-main`.

### 2. Instal dependensi

Buka terminal di folder proyek, kemudian jalankan:

```bash
npm ci
```

`npm ci` memasang dependensi sesuai versi yang tercatat pada `package-lock.json`. Folder `node_modules` akan dibuat otomatis dan tidak perlu diunggah ke GitHub.

### 3. Jalankan server lokal

```bash
npm run dev
```

Buka alamat yang ditampilkan terminal, biasanya `http://127.0.0.1:5173`. Biarkan terminal tetap berjalan. Tekan `Ctrl + C` untuk menghentikannya.

### 4. Periksa hasil build

```bash
npm run build
npm run preview
```

Build mencakup **12 halaman HTML**. Hasilnya berada di folder `dist`; buka alamat preview yang ditampilkan terminal untuk memeriksa hasil produksi.

### 5. Pemeriksaan dependensi

```bash
npm audit
```

Pada snapshot kode yang diperiksa untuk PRD, manifest masih mencatat Vite `7.1.7`; laporan npm pengguna menunjukkan dependensi tersebut perlu diperbarui. Setelah pembaruan, jalankan audit dan build ulang, lalu simpan perubahan **`package.json` dan `package-lock.json`** ke repository. Pembaruan di komputer pribadi tidak otomatis mengubah versi pada GitHub.

## Akun Demo

| Isian | Nilai |
|---|---|
| Email | `demo@needhelp.test` |
| Password | `NeedHelp123!` |

- Perhatikan huruf besar **N**, **H**, dan tanda **!** pada password.
- Login merupakan simulasi frontend, bukan autentikasi produksi.
- **Ingat saya** menggunakan `localStorage`; tanpa centang menggunakan `sessionStorage`.
- Penanda sesi disimpan di browser; password tidak disimpan oleh mekanisme sesi ini.
- Pendaftaran akun, pemulihan password, dan login Google belum aktif. Tombolnya menampilkan modal informasi.

## Daftar 12 Halaman

| File | Fungsi |
|---|---|
| `index.html` | Beranda publik dan kartu postingan |
| `login.html` | Login serta keadaan error input |
| `katalog.html` | Katalog Saya Butuh/Saya Bisa, pencarian, filter, dan pengurutan |
| `detail-postingan.html` | Detail sesuai ID postingan |
| `buat-postingan.html` | Form membuat permintaan atau penawaran |
| `formbantuan.html` | Tampilan form pengajuan bantuan |
| `formeror.html` | Contoh tampilan form bantuan dengan error |
| `sukses-postingan.html` | Tampilan konfirmasi sukses |
| `aktivitas.html` | Tampilan ringkasan dan daftar aktivitas |
| `chat.html` | Tampilan percakapan |
| `notifikasi.html` | Tampilan daftar notifikasi |
| `rating.html` | Form penilaian aktivitas |

Dua keadaan katalog dan error login/form tidak harus menjadi file terpisah. Karena itu, jumlah file HTML tidak identik dengan jumlah frame atau state pada Figma.

## Struktur File Penting

| Lokasi | Kegunaan |
|---|---|
| `assets/css/tokens.css` | Token warna, spasi, radius, dan font |
| `assets/css/base.css` | Gaya bersama dan responsivitas halaman |
| `assets/js/app.js` | Navigasi, autentikasi demo, dan pemasangan handler per halaman |
| `assets/js/data.js` | Data awal serta utilitas postingan, aktivitas, chat, rating, dan notifikasi |
| `assets/images/` | Logo, avatar, dan ikon lokal |
| `vite.config.js` | Entry build untuk seluruh 12 HTML |
| `docs/` | Dokumen awal, riwayat prompt AI, checklist, dan hasil verifikasi starter |
| `package.json` | Dependensi dan perintah menjalankan proyek |
| `package-lock.json` | Versi dependensi yang dikunci |

## Status Fitur dan Hasil Pengujian

Hasil berikut berasal dari pengujian penyusunan PRD final pada **19 Oktober 2026**, terhadap kode fitur pada commit [`b7f7111`](https://github.com/zakyrog/needhelp-modul7-kelompok21/tree/b7f711117f5ec262874d025bced8e33be38ddc80). Perubahan README setelahnya tidak mengubah kode fitur tersebut.

| Pemeriksaan | Hasil |
|---|---|
| Build produksi | Berhasil menghasilkan 12 HTML |
| Beranda publik | Dapat dibuka tanpa login; 3 kartu feed tampil |
| Login kosong dan akun demo benar | Error input kosong tampil; akun demo membuka beranda |
| Katalog Saya Butuh/Saya Bisa | Menampilkan data berbeda: 4 permintaan dan 2 penawaran pada data awal |
| Pencarian katalog | Pesan hasil kosong tampil untuk kata kunci yang tidak cocok |
| Detail dua ID postingan | Judul berubah sesuai ID yang dipilih |
| Menu mobile dan modal | Buka/tutup serta Escape berfungsi pada skenario uji |
| Responsivitas geometris | Tidak ditemukan overflow horizontal pada 12 halaman × 5 lebar, total 60 kombinasi |
| Posting hingga sukses/aktivitas | **Belum lulus:** submit valid belum mencapai alur sukses ber-ID |
| Kirim pesan chat | **Belum lulus:** pesan uji belum muncul pada riwayat |
| Tandai notifikasi dibaca | **Belum lulus:** jumlah belum dibaca tetap sama setelah tombol ditekan |
| Rating | **Belum lulus:** submit belum mencapai konfirmasi aktivitas dan persistensi yang diharapkan |

Ukuran layar yang diperiksa: **360, 390, 768, 1024, dan 1440 piksel**. Tidak tercatat page error JavaScript pada skenario uji. Namun, beberapa fungsi berhenti lebih awal karena selector tidak ditemukan, sehingga tidak adanya error bukan bukti semua fitur sudah aktif.

Pemeriksaan overflow tidak sama dengan audit visual seluruh Figma. Pengujian aksesibilitas formal WCAG, validasi W3C versi final, beban, keamanan menyeluruh, serta multi-user nyata belum dilakukan. Detail hasil dan batas pengujian tersedia pada [PRD final](https://drive.google.com/file/d/1SuC0Wx6kJNWk4dfgUdfk4fdsHmkRSTOr/view?usp=sharing).

## Pekerjaan yang Masih Perlu Diselesaikan

1. Hubungkan form posting dan rating dengan handler yang benar. Kode mencari `data-post-form`/`data-rating-form` atau class `body` tertentu, sedangkan markup belum memenuhi selector tersebut.
2. Hubungkan markup chat dengan selector `data-chat-messages` dan form pengiriman yang dipakai logika JavaScript.
3. Selaraskan selector daftar aktivitas dan notifikasi, kemudian uji perubahan daftar, filter, dan status dibaca.
4. Hubungkan ringkasan sukses dengan data postingan yang benar. Form bantuan tambahan masih merujuk `review-bantuan.html` yang belum tersedia; selaraskan tujuan alurnya.
5. Lengkapi log prompt dan perbaikan aktual setiap anggota, lalu perbarui hasil tes setelah koreksi kode.
6. Tindak lanjuti pembaruan dependensi, audit, dan build ulang.

Perbaikan di atas tidak otomatis selesai karena README atau PRD telah diperbarui. Setelah perubahan kode dilakukan, uji ulang dan revisi status pada README serta PRD agar keduanya konsisten.

## Data Lokal dan Batas Simulasi

Utilitas penyimpanan dalam kode menggunakan kunci:

| Kunci | Tujuan |
|---|---|
| `needhelp.demo-session` | Penanda sesi akun demo |
| `needhelp.demo-posts.v1` | Postingan lokal |
| `needhelp.demo-chats.v1` | Pesan/percakapan lokal |
| `needhelp.demo-activity-state.v1` | Perubahan aktivitas dan rating |
| `needhelp.demo-read-notifications.v1` | Daftar notifikasi yang ditandai dibaca |

Keberadaan utilitas tersebut tidak berarti seluruh UI pemanggilnya sudah tersambung. Data berlaku pada browser dan origin yang sama, tidak tersinkron antar perangkat atau pengguna. Menghapus data situs dapat menghapus data demo.

Statistik komunitas, jumlah pengguna online, identitas/badge, dan reputasi pada tampilan merupakan konten demo, bukan data operasional yang telah diverifikasi. Chat real-time, pembayaran, pengiriman email, Google OAuth, database bersama, serta verifikasi identitas bukan layanan aktif dalam prototipe ini.

## Git dan Pull Request

Repository sudah dipublikasikan di GitHub. Riwayat commit serta perubahan anggota dapat dilihat pada repository; jangan menggunakan keterangan lama bahwa repository belum dibuat.

| Pull Request | Kontribusi |
|---|---|
| [PR #1 — Suprihatini](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/1) | Perubahan tampilan HTML dan halaman tambahan |
| [PR #2 — Felix](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/2) | Logika navigasi, login, katalog/filter, posting, chat, dan logout |
| [PR #3 — Arif](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/3) | QA, UI/responsivitas, interaksi, utilitas data dan konfigurasi build |
| [PR #4 — Dokumentasi ketua](https://github.com/zakyrog/needhelp-modul7-kelompok21/pull/4) | Pembaruan awal judul README dan tautan PRD final |

PR tersebut sudah digabungkan saat pemeriksaan dokumentasi ini. Perubahan berikutnya dikerjakan pada branch, diajukan melalui PR, diperiksa, kemudian digabungkan ke `main`. Gunakan commit yang menjelaskan perubahan nyata; jangan unggah `node_modules` atau `dist` sebagai kode sumber.

## Penggunaan AI dan Catatan Perbaikan

AI digunakan untuk membantu penyusunan fondasi, penjelasan implementasi, pemeriksaan, dan dokumentasi. Hasilnya perlu ditinjau dan diuji terhadap kode serta desain.

### Contoh prompt yang dapat ditelusuri

**Fondasi Modul 7 — instruksi pengguna kepada Codex:**

> sekarang kerjakan bagian saya ketua dan apa saja yg harus saya siapkan contoh link figma

**Penyusunan dokumen akhir:**

> buatkan prd final

Riwayat prompt tahap HTML Modul 6 tersedia pada [`docs/Prompt-Modul6.md`](docs/Prompt-Modul6.md). Catatan fondasi Modul 7 tersedia pada [`docs/Log-AI.md`](docs/Log-AI.md). Contoh prompt saran di dokumen lama tidak dianggap sebagai prompt yang sudah dijalankan.

### Penyuntingan dan perbaikan kode yang tercatat

- Menyesuaikan struktur HTML dan CSS dengan acuan desain, termasuk token serta elemen bersama.
- Mengembangkan fondasi menjadi data/utilitas bersama melalui `assets/js/data.js`.
- Memperbaiki navigasi dan detail berdasarkan ID, alur tujuan login, pencarian/filter/sort katalog, serta header/footer.
- Menyempurnakan layout responsif dan mendaftarkan 12 HTML pada konfigurasi Vite.
- Memeriksa build, skenario interaksi, dan overflow horizontal; hasil yang belum lulus tetap dicatat.

Rincian prompt dan pemisahan hasil AI/perbaikan manual setiap anggota belum lengkap dalam log repository yang diperiksa. Tambahkan berdasarkan pekerjaan yang benar-benar dilakukan, beserta file, masalah, cara memperbaiki, hasil tes, serta commit/PR terkait. Jangan mengarang riwayat prompt atau hasil pengujian.

## Dokumen Pendukung

- [PRD final PDF](https://drive.google.com/file/d/1SuC0Wx6kJNWk4dfgUdfk4fdsHmkRSTOr/view?usp=sharing) — kebutuhan, kontribusi, hasil verifikasi dan batas produk.
- [`docs/PRD-Awal.md`](docs/PRD-Awal.md) dan [`docs/PRD-Awal.pdf`](docs/PRD-Awal.pdf) — riwayat perencanaan awal, bukan pengganti PRD final.
- [`docs/Checklist-QA.md`](docs/Checklist-QA.md) — acuan pengujian.
- [`docs/Hasil-Verifikasi.md`](docs/Hasil-Verifikasi.md) — hasil verifikasi **starter tanggal 14 Oktober 2026**, bukan hasil akhir seluruh fitur.
- [`docs/Log-AI.md`](docs/Log-AI.md) dan [`docs/Prompt-Modul6.md`](docs/Prompt-Modul6.md) — catatan AI yang tersedia.

Luaran Modul 7 adalah **repository publik, README lengkap, dan PRD PDF**. Repository merupakan tautan kode; tidak otomatis menjadi URL website yang sedang dihosting.
