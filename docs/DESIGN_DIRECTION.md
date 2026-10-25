# Design Direction (DESIGN_DIRECTION) — NeedHelp Jogja
**Status:** Panduan Antarmuka & Tata Letak Desktop  
**Versi:** 2.0.0  
**Tanggal:** 26 Oktober 2026  
**Dasar Acuan:** Pola Desktop 3-Kolom LinkedIn (Struktur) + Jati Diri Komunitas NeedHelp Jogja (Visual & Bahasa)  

---

## 1. Filosofi Desain: LinkedIn sebagai Struktur, NeedHelp sebagai Jiwa

```
┌────────────────────────────────────────────────────────────────────────┐
│ STRUKTUR: LinkedIn Desktop                                            │
│ - Top Nav Bar Sticky                                                   │
│ - Tata letak 3 kolom hierarkis (Kiri: Profil, Tengah: Feed, Kanan: Info)│
│ - Surface cards dengan garis batas halus (subtle border)               │
│ - Quick-action post box di puncak feed                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ IDENTITAS & JIWA: NeedHelp Jogja                                       │
│ - Palet Warna: Toska khas Jogja (#4a9ba0, #2c7277, #e3fdfd)            │
│ - Tipografi: Inter (terbaca jernih pada berbagai ukuran layar)         │
│ - Bahasa: Hangat, bersahabat, setara ("teman tongkrongan mahasiswa")    │
│ - Dua Pintu: Penanda visual tegas SAYA BUTUH vs SAYA BISA              │
│ - Anti-Slop (Taste Skill): Setiap elemen memiliki fungsi konkret       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tata Letak Desktop Tiga Kolom (Breakdown Presisi)

Tata letak desktop dirancang untuk lebar layar &ge; 1024px dengan kontainer utama terpusat (maksimal 1200px):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           HEADER NAVIGASI ATAS (Sticky)                          │
│ [Logo NeedHelp]  [🔍 Cari bantuan...]       [🏠 Beranda] [📋 Feed] [💬 Chat] [👤]│
├─────────────────┬───────────────────────────────────────────────┬────────────────┤
│   KOLOM KIRI    │                  KOLOM TENGAH                 │   KOLOM KANAN  │
│  (Lebar 240px)  │             (Paling Dominan: ~640px)          │  (Lebar 280px) │
│                 │                                               │                │
│ ┌─────────────┐ │ ┌───────────────────────────────────────────┐ │ ┌────────────┐ │
│ │Mini Profile │ │ │ Quick Post Box: "Butuh bantuan apa?"      │ │ │ Aktivitas  │ │
│ │- Avatar     │ │ │ [+ Saya Butuh]        [+ Saya Bisa]       │ │ │ Berlangsung│ │
│ │- Nama & Bio │ │ └───────────────────────────────────────────┘ │ └────────────┘ │
│ │- Rating     │ │ ┌───────────────────────────────────────────┐ │ ┌────────────┐ │
│ └─────────────┘ │ │ Bar Filter: [Semua][Butuh][Bisa] [Wilayah]│ │ │ Panduan    │ │
│ ┌─────────────┐ │ └───────────────────────────────────────────┘ │ │ Keamanan   │ │
│ │Menu Cepat   │ │ ┌───────────────────────────────────────────┐ │ │ Tongkrongan│ │
│ │- Permintaan │ │ │ Feed Kartu 1: SAYA BUTUH (Pindahan Kos)   │ │ └────────────┘ │
│ │- Penawaran  │ │ └───────────────────────────────────────────┘ │                │
│ │- Disimpan   │ │ ┌───────────────────────────────────────────┐ │                │
│ └─────────────┘ │ │ Feed Kartu 2: SAYA BISA (Bersih-bersih)   │ │                │
│                 │ └───────────────────────────────────────────┘ │                │
└─────────────────┴───────────────────────────────────────────────┴────────────────┘
                                                       [💬 Docked Chat Drawer] (Pojok)
```

### 2.1 Header Navigasi Atas (Sticky Top Navigation)
* **Tinggi:** 64px, posisi `sticky; top: 0; z-index: 100`.
* **Latar:** Putih solid dengan garis pembatas halus di bawah (`border-bottom: 1px solid var(--border-subtle)`).
* **Komponen:**
  * Kiri: Logo NeedHelp Jogja + Input pencarian instan (lebar fleksibel 260px).
  * Kanan: Navigasi ikon vertikal + teks ringkas:
    * **Beranda** (ikon rumah)
    * **Katalog / Feed** (ikon feed berkartu)
    * **Aktivitas Saya** (ikon checklist)
    * **Pesan / Chat** (ikon gelembung obrolan)
    * **Profil / Akun** (avatar lingkaran dengan menu dropdown)

### 2.2 Kolom Kiri: Profil Singkat & Navigasi Personal (~240px)
* **Kartu Profil Mini:**
  * Latar kartu putih ber-radius `8px` dengan border tipis `1px solid var(--border-subtle)`.
  * Foto profil/avatar, nama lengkap, dan status peran aktif.
  * Ringkasan reputasi: Bintang rata-rata dan jumlah ulasan selesai.
* **Tautan Navigasi Cepat:**
  * Filter satu klik: *"Postingan Saya"*, *"Aktivitas Aktif"*, *"Wilayah Sleman"*, *"Wilayah Kota"*.

### 2.3 Kolom Tengah: Ruang Interaksi Dominan (~640px)
* **Kotak Pemicu Cepat (*Start a Post Creator*):**
  * Terletak di bagian paling atas feed.
  * Kartu putih memuat avatar pengguna dan tombol pemicu bersahabat: *"Butuh bantuan atau ingin menawarkan keahlian hari ini?"*
  * Dua tombol pill aksi cepat:
    * `[+ Saya Butuh]` (Warna toska aksen) &rarr; Membuka dialog/halaman permohonan.
    * `[+ Saya Bisa]` (Warna hijau sage/outline) &rarr; Membuka dialog/halaman penawaran.
* **Bilah Filter Interaktif (*Filter Chips Bar*):**
  * Tombol tab jenis: **Semua**, **Saya Butuh**, **Saya Bisa**.
  * Dropdown wilayah (Sleman, Kota, Bantul, dll) dan kategori aktivitas.
* **Feed Kartu Postingan (*Feed Cards*):**
  * Lihat Bagian 3 untuk rincian anatomi kartu.

### 2.4 Kolom Kanan: Konteks & Informasi Pendukung (~280px)
* **Widget Aktivitas Berjalan:** Menampilkan 1-2 kegiatan terdekat yang sedang aktif (dengan tautan langsung ke obrolan/detail).
* **Widget Panduan Keamanan Komunitas:** 3 poin ringkas tips berinteraksi aman antarmahasiswa di Jogja (misal: bertemu di tempat publik/kafe ramai, verifikasi identitas di chat).
* **Tautan Footer Ringkas:** Hak cipta dan informasi platform tanpa elemen pengisi berlebih.

### 2.5 Panel Pesan Mengambang (*Docked Mini-Chat Drawer*)
* Tersemat di pojok kanan bawah desktop (lebar 320px).
* Dapat diminimalkan (*collapsed*) menjadi bilah kecil atau diperluas (*expanded*) untuk membalas percakapan seketika tanpa harus meninggalkan halaman feed.

---

## 3. Anatomi Kartu Postingan (Feed Card Design)

Setiap kartu dirancang untuk memberikan informasi esensial secara cepat dan jelas tanpa dekorasi semu:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Avatar]  Sari Wijaya • Mahasiswi Pogung                 15 menit lalu │
│           [ ⭐ 4.9 (8 ulasan) ]                                        │
│                                                                        │
│ [ SAYA BUTUH ]  [ Kategori: Bantuan Fisik ]                            │
│                                                                        │
│ Butuh bantuan pindahan kos & angkat lemari                             │
│ Butuh bantuan tenaga 1 orang untuk bantu angkut barang pindahan kos    │
│ dari Pogung Baru ke kos baru di Palagan Tentara Pelajar...             │
│                                                                        │
│ 📅 Sabtu, 24 Okt 2026 (09.00 - 12.00 WIB)                              │
│ 📍 Titik Temu: Pogung Baru Blok D, Mlati, Sleman                       │
│ 💰 Imbalan: Tarif Pasti — Rp50.000 (+ Traktir makan siang)             │
│ 👥 Kuota: 1 orang mitra (Tersedia)                                     │
├────────────────────────────────────────────────────────────────────────┤
│ [ Ajukan Bantuan / Chat ]                        [ Detail Selengkapnya]│
└────────────────────────────────────────────────────────────────────────┘
```

### Aturan Tipografi & Aksesibilitas Kartu:
1. **Pembeda Jenis Eksplisit:** Label jenis tidak boleh hanya dibedakan oleh warna latar belakang. Wajib menggunakan teks kapital tegas: **`[ SAYA BUTUH ]`** dan **`[ SAYA BISA ]`**.
2. **Hierarki Teks:**
   * Judul Postingan: `1.125rem` (18px), `font-weight: 600`, warna teks utama (`#1e293b`).
   * Teks Deskripsi: `0.9375rem` (15px), `line-height: 1.5`, warna teks sekunder (`#475569`).
   * Metadata (Waktu/Lokasi/Imbalan): `0.875rem` (14px) dengan ikon penjelas.
3. **Kontras & Fokus Keyboard:**
   * Kontras warna teks memenuhi ambang batas minimum WCAG 2.2 AA (minimal 4.5:1 untuk teks normal).
   * Seluruh elemen tombol memiliki selektor `:focus-visible` dengan outline `2px solid var(--color-primary)` dan offset `2px`.

---

## 4. Desain Kartu Kesepakatan di Ruang Chat (*In-Chat Deal Card*)

Ketika dua pihak bersepakat, kartu interaktif muncul di tengah linimasa obrolan:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🤝 KARTU KESEPAKATAN BANTUAN (Versi 1)                                 │
├────────────────────────────────────────────────────────────────────────┤
│ Kebutuhan : Pindahan kos & angkat lemari                               │
│ Pemohon   : Sari Wijaya                                                │
│ Penolong  : Budi Pratama                                               │
│ Jadwal    : Sabtu, 24 Oktober 2026 pukul 09.00 WIB                     │
│ Titik Temu: Kos Putri Pogung Baru Blok D                               │
│ Imbalan   : Tarif Pasti Rp50.000 (Dibayar tunai/QRIS setelah selesai)  │
├────────────────────────────────────────────────────────────────────────┤
│ Status Persetujuan:                                                    │
│ - Sari Wijaya (Pemohon) : [ ✅ Menyetujui ]                            │
│ - Budi Pratama (Penolong): [ ⏳ Menunggu Persetujuan ]                 │
├────────────────────────────────────────────────────────────────────────┤
│ [ Setujui Kesepakatan Ini ]                     [ Ajukan Perubahan ]   │
└────────────────────────────────────────────────────────────────────────┘
```

* Jika tombol *"Ajukan Perubahan"* ditekan, form modal terbuka untuk mengubah jam/imbalan. Versi kesepakatan bertambah menjadi `Versi 2`, dan persetujuan pihak sebelumnya otomatis di-reset.

---

## 5. Responsivitas Tablet & Ponsel

* **Desktop (&ge; 1024px):** Layout lengkap 3 kolom (Kiri 240px, Tengah fleksibel, Kanan 280px).
* **Tablet (768px - 1023px):** Kolom kanan disembunyikan/dipindahkan ke bawah; kolom kiri menyusut atau menjadi menu drawer; kolom tengah mengambil ruang utama.
* **Ponsel (< 768px):** 
  * Layout berubah menjadi **1 kolom vertikal penuh**.
  * Header navigasi atas disederhanakan; menu berpindah ke **Bilah Navigasi Bawah (*Bottom Navigation Bar*)** dengan akses cepat ke: Beranda, Feed, Buat Post (+), Chat, dan Aktivitas.
  * Kartu postingan menggunakan padding yang proporsional (`16px`) tanpa pembungkus yang memicu overflow horizontal pada layar sempit (360px - 390px).
