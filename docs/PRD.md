# Product Requirements Document (PRD) — NeedHelp Jogja
**Status:** Spesifikasi Arsitektur Multipengguna Riil  
**Versi:** 2.0.0  
**Tanggal Pembaruan:** 26 Oktober 2026  
**Dasar Keputusan Produk:**
1. M1_Kelompok21_ProblemStatement.pdf (Masalah & Arah Solusi)
2. Penjelasan_User_Flow_Kelompok_21 (4).pdf (Alur Interaksi Santai & Fleksibilitas Imbalan)
3. Design-Thinking-Map-Kelompok-21 V7 (2).pdf (POV, UVP, & Stakeholders)
4. Keputusan Arsitektur: Target sistem multipengguna nyata, cakupan 5 wilayah DIY, fokus fitur inti, dan kesepakatan melalui kartu interaktif di chat.

---

## 1. Visi, Masalah, dan Tujuan Produk

### 1.1 Pernyataan Masalah
Mahasiswa perantau dan pekerja muda di Yogyakarta kerap menghadapi kebutuhan bantuan praktis atau pendampingan situasional yang bersifat spontan, mendesak, atau berjangka waktu pendek (seperti pindahan kos, teman ngopi/diskusi, angkat lemari, teman perjalanan). Saat ini, permintaan dan penawaran bantuan tersebut tersebar secara tidak terorganisasi di media sosial (Threads, Instagram, WhatsApp) sehingga cepat tenggelam, sulit dibandingkan, tidak terstruktur menurut wilayah, waktu, dan imbalan, serta berisiko melewatkan bantuan yang tepat.

### 1.2 Tujuan Produk
NeedHelp adalah platform web komunitas tolong-menolong (*need-first mutual companion & help*) di Daerah Istimewa Yogyakarta. Platform ini mempertemukan permohonan (**Saya Butuh**) dan penawaran kemampuan/waktu (**Saya Bisa**) dalam sistem multipengguna nyata, memungkinkan dua pihak berkomunikasi dari perangkat berbeda, menyepakati bantuan secara transparan, serta membangun reputasi timbal balik.

---

## 2. Prinsip Inti & Batasan Sistem

### 2.1 Prinsip Produk (Wajib Dipertahankan)
1. **Penjelajahan Publik Bebas:** Tamu tanpa login dapat menjelajahi Beranda, Feed/Katalog, pencarian, filter, dan membuka Detail Postingan.
2. **Satu Akun, Peran Kontekstual:** Pemohon dan Penolong adalah peran per kegiatan/transaksi, bukan tipe akun permanen. Satu pengguna dapat menjadi pemohon pada suatu postingan dan menjadi penolong pada postingan lainnya.
3. **Inisiasi Percakapan Dua Arah yang Bebas:** Pembuat penawaran (*Saya Bisa*) dapat proaktif menghubungi pembuat permintaan (*Saya Butuh*), dan sebaliknya.
4. **Target Multipengguna Riil:** Akun, postingan, pesan obrolan, kesepakatan, status kegiatan, dan rating tersimpan pada database terpusat yang dapat diakses oleh Pengguna A dan Pengguna B secara simultan dari browser/perangkat berbeda. `localStorage` hanya diizinkan untuk preferensi antarmuka lokal pengguna (misalnya draft filter sementara atau preferensi visual).
5. **Percakapan Asli Antarpengguna:** Sistem tidak menggunakan bot simulasi untuk menggantikan percakapan pengguna riil.
6. **Bukan Marketplace Komersial:** Platform tidak memungut komisi transaksi, tidak memaksakan escrow rekening bersama, dan tidak menuntut kontrak kerja formal.

---

## 3. Cakupan Wilayah & Taksonomi Resmi

### 3.1 Cakupan Wilayah Layanan (5 Kabupaten/Kota DIY)
Sistem melayani 5 wilayah administratif di Daerah Istimewa Yogyakarta:
1. **Kabupaten Sleman** (Prioritas konten awal: Pogung, Palagan, Seturan, Jakal, Gejayan, Kampus UGM/UNY).
2. **Kota Yogyakarta** (Prioritas konten awal: Malioboro, Gondokusuman, Umbulharjo, Kotagede).
3. **Kabupaten Bantul** (Area kampus ISI, Sewon, Banguntapan, Kasihan).
4. **Kabupaten Kulon Progo**
5. **Kabupaten Gunungkidul**

> **Ketentuan Tampilan:** Wilayah yang belum memiliki data postingan aktif wajib menampilkan status kosong (*Empty State*) yang informatif dan jelas, bukan tampilan rusak atau halaman blank.

### 3.2 Taksonomi Kategori Aktivitas
Mengacu pada Problem Statement Modul 1 (halaman 1 & 4), terdapat 4 kategori utama:
1. **Ditemani:** Ngopi, gym, nonton bioskop, mancing, teman jalan/explore Jogja.
2. **Bantuan Fisik:** Pindahan kos, angkat barang/lemari, bersih-bersih kos, beresin gudang, kurir kilat barang tertinggal.
3. **Pendampingan:** Temani beli perangkat elektronik/laptop, diskusi materi/skripsi, partner belajar.
4. **Pengalaman / Explore:** Wisata kuliner murah, pemandu wisata/jalan, berburu hidden gem Jogja.

### 3.3 Sistem Imbalan Fleksibel
Mendukung 6 opsi imbalan resmi:
* **Tarif Pasti:** Nominal pasti dalam Rupiah (misal: Rp50.000 atau Rp30.000/jam).
* **Nego di Chat:** Nominal atau bentuk imbalan dibicarakan lebih lanjut dalam obrolan.
* **Patungan (Split Bill):** Pembagian biaya bersama (misal: patungan bensin mobil mendaki gunung).
* **Bayar Sendiri-sendiri:** Masing-masing pihak menanggung pengeluaran pribadinya (misal: nonton bioskop atau makan bareng).
* **Traktir:** Salah satu pihak mentraktir pihak lain (misal: "Aku traktir kopi di Cosan").
* **Sukarela:** Tanpa imbalan materi/finansial (gotong royong murni). *Catatan: Opsi ini merupakan tambahan yang disetujui dalam keputusan perancangan, bukan kutipan eksplisit teks PDF.*

---

## 4. Matriks Kebutuhan Fungsional (Core Scope MVP)

| ID Kebutuhan | Fitur / Alur | Deskripsi Kebutuhan | Kriteria Penerimaan (Dapat Diuji) |
|---|---|---|---|
| **REQ-CORE-01** | Akses Feed Publik | Tamu tanpa login dapat menjelajah Beranda dan Feed/Katalog. | 1. URL `/` dan `/katalog` dapat dibuka tanpa sesi login.<br>2. Menampilkan daftar postingan aktif dari basis data terpusat.<br>3. Tidak ada pengalihan paksa ke halaman login saat membaca konten publik. |
| **REQ-CORE-02** | Filter & Pencarian Dinamis | Pengguna dapat menyaring postingan menurut kata kunci, jenis (Semua / Butuh / Bisa), kategori, wilayah DIY, dan opsi imbalan. | 1. Perubahan filter memperbarui daftar postingan seketika.<br>2. Filter tersinkronisasi dua arah dengan parameter query URL browser.<br>3. Wilayah tanpa postingan memunculkan pesan Empty State dengan tombol "Bersihkan Filter". |
| **REQ-CORE-03** | Autentikasi Pengguna Riil | Pengguna dapat mendaftar (*register*), masuk (*login*), dan keluar (*logout*) menggunakan akun individual. | 1. Pengguna A dan Pengguna B dapat mendaftar dengan email dan kata sandi berbeda.<br>2. Kata sandi dienkripsi dengan aman di sisi server/database.<br>3. Login yang berhasil menyimpan token sesi aman; logout membersihkan sesi.<br>4. Akses aksi interaktif saat belum login diarahkan ke `/login?next=...` dan kembali ke halaman semula setelah login. |
| **REQ-CORE-04** | Profil Pengguna Dasar | Setiap pengguna memiliki data profil dasar yang dapat dilihat oleh pengguna lain. | 1. Menampilkan nama tampilan, bio singkat, rating rata-rata, jumlah ulasan, dan waktu bergabung.<br>2. Menampilkan daftar postingan aktif yang sedang diterbitkan oleh pengguna tersebut. |
| **REQ-CORE-05** | Form "Saya Butuh" | Pengguna login dapat memposting kebutuhan bantuan spesifik. | 1. Form memvalidasi: judul (5-100 kar), kategori sah, deskripsi (20-1000 kar), tanggal (>= hari ini), waktu, wilayah DIY sah, titik patokan umum (5-150 kar), kuota partner (default 1), dan imbalan.<br>2. Data tersimpan ke database terpusat dan langsung muncul di feed publik serta profil pengguna.<br>3. Tombol submit terkunci saat proses untuk mencegah kiriman ganda. |
| **REQ-CORE-06** | Form "Saya Bisa" | Pengguna login dapat memposting penawaran waktu/kemampuan. | 1. Memiliki validasi setara dengan form Saya Butuh.<br>2. Mendukung opsi jadwal fleksibel/ketersediaan waktu dan kapasitas penanganan.<br>3. Kartu penawaran diberi penanda visual tegas yang membedakannya dari kartu Saya Butuh. |
| **REQ-CORE-07** | Detail Postingan | Halaman rincian lengkap dari suatu postingan. | 1. Menampilkan detail postingan, jadwal rencana, titik patokan umum, imbalan, dan profil pembuat.<br>2. ID tidak valid menampilkan halaman 404/EmptyState ramah pengguna.<br>3. Tersedia tombol pemicu "Mulai Chat / Ajukan Bantuan" yang mengarahkan ke obrolan kontekstual. |
| **REQ-CORE-08** | Chat Riil Dua Arah | Percakapan langsung antarpengguna riil berbasis thread kontekstual. | 1. Pengguna A di Browser 1 dapat mengirim pesan ke Pengguna B di Browser 2.<br>2. Pesan tersimpan di basis data terpusat dan muncul pada riwayat obrolan kedua pihak.<br>3. Klik chat dari postingan yang sama tidak membuat ruang obrolan duplikat. |
| **REQ-CORE-09** | Kartu Kesepakatan di Chat (*In-Chat Deal Card*) | Fitur pengajuan dan persetujuan kesepakatan formal langsung di dalam ruang chat. | 1. Kartu memuat parameter: judul bantuan, pemohon, penolong, jadwal (tanggal & jam), titik temu, dan imbalan yang disepakati.<br>2. Kartu memerlukan persetujuan eksplisit dari KEDUA belah pihak pada versi data yang sama.<br>3. Jika salah satu pihak mengubah parameter sebelum disetujui, status kesepakatan kembali menjadi draft/menunggu persetujuan ulang.<br>4. Setelah disetujui kedua pihak, status kesepakatan menjadi `disepakati`. |
| **REQ-CORE-10** | Pengelolaan Siklus Aktivitas | Pengguna memantau status kegiatan bersama di halaman `/aktivitas`. | 1. Memisahkan status: Terjadwal (disepakati belum mulai), Berlangsung (sedang berjalan), Selesai, dan Dibatalkan.<br>2. Kuota postingan *Saya Butuh* otomatis terkunci dari pelamar baru saat kuotanya terpenuhi.<br>3. Postingan *Saya Bisa* tetap tayang namun mencegah jadwal yang bertabrakan. |
| **REQ-CORE-11** | Konfirmasi Selesai & Pembatalan | Mekanisme formal penyelesaian dan pembatalan kegiatan. | 1. Kedua belah pihak dapat mengajukan pembatalan sebelum kegiatan berlangsung, dengan mencantumkan alasan singkat.<br>2. Pembatalan mengembalikan postingan *Saya Butuh* ke status aktif jika kuota belum habis dari kesepakatan lain.<br>3. Konfirmasi selesai memerlukan persetujuan pemohon atau kedua pihak sebelum status berubah menjadi `selesai`. |
| **REQ-CORE-12** | Rating & Ulasan Berkelanjutan | Pengguna saling memberikan ulasan reputasi setelah kegiatan selesai. | 1. Form rating hanya terbuka untuk kegiatan berstatus `selesai`.<br>2. Validasi: skor 1-5 bintang dan teks ulasan 10-500 karakter.<br>3. Mencegah self-rating dan ulasan berulang untuk transaksi yang sama.<br>4. Ulasan tersimpan ke basis data dan memperbarui agregasi nilai rating profil penerima ulasan. |

---

## 5. Fitur yang Ditunda ke Backlog (Tahap Selanjutnya)

Fitur-fitur berikut diakui relevan namun **ditunda** agar implementasi tahap ini berfokus 100% pada keandalan fitur inti:
* Pusat notifikasi push dinamis dan integrasi email.
* Unggah berkas gambar/foto banyak (*multi-image gallery*).
* Integrasi peta digital GPS interaktif (Google Maps / Mapbox).
* Fitur verifikasi dokumen identitas kampus resmi via pengunggahan KTM/email domain.
* Fitur blokir dan pelaporan pengguna mendalam (*abuse reporting system*).

---

## 6. Persyaratan Kualitas Teknis & Pengujian

1. **Integritas Persistensi Data:** Seluruh aksi (register, login, posting, pesan chat, deal, status aktivitas, rating) tersimpan di basis data terpusat dan teruji dapat diakses silang antardua peramban berbeda.
2. **Kepatuhan Aksesibilitas (WCAG 2.2 AA):** Menjadi target pengujian, di mana rasio kontras warna, navigasi keyboard (`:focus-visible`), dan atribut ARIA wajib diuji secara nyata pada browser sebelum diklaim patuh.
3. **Kerapian Antarmuka:** Bebas overflow horizontal pada layar desktop (1440px), laptop (1024px), tablet (768px), dan ponsel (360px–390px).
