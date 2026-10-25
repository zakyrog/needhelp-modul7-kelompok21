# Dokumentasi & Riwayat Prompt AI (prompt-log.md)
**Penugasan:** Modul 06 - Konversi Desain Figma ke HTML5  
**Proyek:** NeedHelp (Need-Based Companion & Help - Kelompok 21 Kota Yogyakarta)  
**Tujuan:** Menghasilkan markah HTML5 semantik murni (tanpa CSS), valid standar W3C (0 error, 0 warning), dan mencerminkan user flow & prototipe Figma secara komprehensif.

---

## 1. Strategi Prompting & Alur Kerja Iteratif
Untuk memenuhi standar tinggi pada rubrik evaluasi, proses generasi kode dilakukan secara modular (per seksi komponen dan per layar alur kerja), diikuti oleh audit manual dan validasi ketat W3C Nu Validator API:

1. **Tahap Konseptualisasi & User Flow Mapping:** Memetakan 8+ layar prototipe Figma ke arsitektur dokumen HTML.
2. **Tahap Prompting Terstruktur:** Memberikan instruksi spesifik kepada AI dengan batasan negatif yang ketat (*no CSS files, no style tags, no inline styles, no divs for styling, no obsolete tags*).
3. **Tahap Audit Semantik (Refaktorisasi):**
   - Menghapus pembungkus `<div>` yang tidak memiliki makna semantik (*div-soup elimination*).
   - Memastikan hierarki heading logis (`<h1>` tunggal &rarr; `<h2>` &rarr; `<h3>` &rarr; `<h4>`).
   - Memastikan seluruh kontrol formulir berada di dalam `<fieldset>` dengan `<legend>`, serta atribut `for` pada `<label>` terikat secara eksplisit dengan `id` input.
4. **Tahap Verifikasi W3C:** Menguji seluruh dokumen ke `https://validator.w3.org/nu/` hingga status 100% bebas dari galat (*0 error, 0 warning*).

---

## 2. Riwayat Prompt Terstruktur (Prompt History)

### Prompt 1: Inisialisasi Struktur Beranda (`index.html`)
> *"Buat dokumen HTML5 semantik murni untuk halaman Beranda (Landing Page) aplikasi NeedHelp berdasarkan desain Figma. Jangan gunakan CSS eksternal, inline style, maupun tag `<style>`. Gunakan landmark standar `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, dan `<footer>`. Masukkan seksi Hero ('Butuh bantuan atau teman hari ini?'), Kategori Populer (Les Privat, Jasa Kebersihan, Kurir/Titip, Teknis, Lainnya), Permintaan Terbaru di Sekitar Kamu (kartu artikel Sari Wijaya, Budi Pratama, Rina Putri), serta seksi tabel statistik komunitas untuk memenuhi komponen data `<table>` yang diwajibkan modul."*

### Prompt 2: Halaman Autentikasi (`login.html`)
> *"Buat halaman `login.html` semantik murni sesuai desain Figma NeedHelp. Tampilkan logo dengan link ke `index.html`, kutipan nilai platform ('Platform yang mempertemukan niat baik...'), metrik statistik, dan formulir login. Form harus menggunakan `<form action="#" method="post">`, dibungkus `<fieldset>` dan `<legend>`, relasi `<label for="...">` dengan `<input id="...">`, tombol submit, serta pesan peringatan validasi semantik dengan role='alert'."*

### Prompt 3: Halaman Feed & Katalog Pencarian (`katalog.html`)
> *"Buat halaman `katalog.html` yang menampilkan feed kebutuhan dua arah ('Saya Butuh' dan 'Saya Bisa'). Sertakan `<aside>` untuk filter pencarian (tipe postingan radio, checkbox kategori aktivitas, select wilayah Sleman/Kota/Bantul, dan select model kompensasi). Buat daftar postingan interaktif menggunakan `<article>`, `<header>`, `<dl>` untuk jadwal & imbalan, serta elemen navigasi halaman `<nav>` dengan `<ol>` pagination."*

### Prompt 4: Halaman Detail Postingan & Ajukan Bantuan (`detail-postingan.html`)
> *"Buat halaman `detail-postingan.html` untuk rincian kebutuhan Sari Wijaya ('Butuh bantuan pindahan kos & angkat lemari'). Sertakan breadcrumb navigasi `<ol>`, profil pembuat bantuan dengan reputasi/ulasan, rincian aktivitas dan barang yang dipindahkan (`<ul>`), rincian jadwal dan kompensasi patungan (`<dl>`), serta formulir pengajuan pesan singkat dan link menuju ruang chat."*

### Prompt 5: Formulir Pasang Postingan Baru (`buat-postingan.html`)
> *"Buat halaman formulir pasang postingan `buat-postingan.html` dengan form multi-bagian: 1) Radio pintu masuk 'Saya Butuh' vs 'Saya Bisa', 2) Detail judul, kategori select (dengan placeholder value kosong), dan textarea deskripsi, 3) Tanggal, jam, select wilayah, dan alamat pertemuan, 4) Pilihan sistem kompensasi (Tarif pasti, Nego, Patungan, Traktir, Sukarela), dan 5) Checkbox persetujuan pedoman komunitas. Pastikan form menggunakan action='sukses-postingan.html' method='post'."*

### Prompt 6: Konfirmasi Berhasil & Dashboard Aktivitas (`sukses-postingan.html` & `aktivitas.html`)
> *"Buat halaman konfirmasi penerbitan tiket postingan `sukses-postingan.html` dengan rincian status tiket dan instruksi langkah berikutnya. Selanjutnya, buat `aktivitas.html` sebagai dashboard pengguna yang memuat rekapitulasi status dalam format `<table>`, serta kartu artikel aktivitas sedang berjalan, menunggu respon, dan selesai."*

### Prompt 7: Ruang Chat Negosiasi & Rating Kepuasan (`chat.html` & `rating.html`)
> *"Buat halaman obrolan `chat.html` dengan bilah daftar kontak di `<aside>`, riwayat pesan urut waktu menggunakan `<ol>` dan `<article>`, serta formulir pengiriman balasan pesan. Kemudian buat halaman `rating.html` untuk menutup siklus transaksi, berisi ringkasan aktivitas selesai, pilihan rating radio 1-5 bintang, checkbox aspek apresiasi, textarea ulasan, dan select rekomendasi."*

### Prompt 8: Penambahan Metadata Lanjutan (Open Graph & Schema.org)
> *"Tambahkan metadata Open Graph (`og:title`, `og:description`, `og:image`, `og:type`, `og:locale`) dan data terstruktur Schema.org (JSON-LD WebApplication) ke dalam `index.html` sesuai opsi lanjutan Modul 06 Tahap 6 untuk mengoptimalkan SEO dan keterbacaan bot/crawler, dengan tetap memastikan 0 error di W3C Nu Validator."*

---

## 3. Analisis Perbandingan Sebelum vs. Sesudah Refaktorisasi

| Komponen / Aspek | Kode Awal (Keluaran Generik / Mentah AI) | Kode Akhir Hasil Refaktorisasi Semantik | Alasan Perbaikan & Standar W3C |
| :--- | :--- | :--- | :--- |
| **Bungkus Kontainer** | Menggunakan banyak lapis `<div><div class="card"><div class="content">...</div></div></div>` (*div-soup*). | Menggunakan tag semantik murni: `<article>`, `<header>`, `<section>`, tanpa `<div>` pembungkus berlebih. | Menghilangkan kompleksitas pohon DOM dan memudahkan *screen reader* mengenali batas independen konten. |
| **Struktur Form** | Input hanya dibungkus `<div>` tanpa `<fieldset>` atau `<legend>`. | Dikelompokkan rapi ke dalam `<fieldset>` tematik dengan `<legend>` yang jelas. | Sesuai instruksi Modul 06 Tahap 4 untuk aksesibilitas navigasi keyboard & pembaca layar. |
| **Kaitan Label & Input** | Teks label berada di samping input tanpa atribut `for` dan `id`. | Setiap `<label for="x">` terikat secara eksplisit dengan `<input id="x">`. | Memungkinkan klik pada label untuk memfokuskan input dan meningkatkan skor a11y. |
| **Elemen Placeholder Select** | Tag `<select required>` langsung diawali `<option value="sleman">` tanpa pilihan kosong. | Ditambahkan `<option value="">-- Pilih Wilayah --</option>` sebagai opsi pertama. | Memperbaiki galat validasi resmi W3C Nu Validator pada elemen `<select required>`. |
| **Hierarki Heading** | Melompati tingkat heading (misal dari `<h1>` langsung ke `<h4>` atau `<h5>`). | Mengikuti hierarki terurut: satu `<h1>` utama per dokumen, dilanjutkan `<h2>`, `<h3>`, dan `<h4>`. | Navigasi dokumen logis dan terstruktur sesuai standar W3C. |
| **Atribut Non-Standar** | Terdapat atribut typo acak seperti `idbadge="punctual"`. | Dihapus bersih menjadi atribut standar W3C murni: `id="badge-punctual"`. | Memastikan 100% lulus uji W3C tanpa error maupun peringatan sintaksis. |
| **Komponen Gambar** | Menggunakan link eksternal atau gambar tanpa teks `alt`. | Semua gambar mengarah ke `./assets/images/` lokal dengan format SVG murni dan atribut `alt` deskriptif / `alt=""` jika dekoratif. | Memenuhi standar pengorganisasian berkas modul dan aksesibilitas web. |

---

## 4. Hasil Validasi W3C Nu Validator
Seluruh 9 file HTML telah diuji secara otomatis dan manual terhadap API resmi W3C Nu HTML Checker:
- `index.html` : **0 Errors, 0 Warnings** &check;
- `login.html` : **0 Errors, 0 Warnings** &check;
- `katalog.html` : **0 Errors, 0 Warnings** &check;
- `detail-postingan.html` : **0 Errors, 0 Warnings** &check;
- `buat-postingan.html` : **0 Errors, 0 Warnings** &check;
- `sukses-postingan.html` : **0 Errors, 0 Warnings** &check;
- `aktivitas.html` : **0 Errors, 0 Warnings** &check;
- `chat.html` : **0 Errors, 0 Warnings** &check;
- `rating.html` : **0 Errors, 0 Warnings** &check;
