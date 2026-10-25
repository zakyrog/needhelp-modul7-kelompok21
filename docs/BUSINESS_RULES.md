# Aturan Bisnis & Logika Sistem (BUSINESS_RULES) — NeedHelp Jogja
**Status:** Draf Perencanaan Arsitektur Multipengguna Riil  
**Versi:** 2.0.0  
**Tanggal Pembaruan:** 26 Oktober 2026  

---

## 1. Konsep Akun & Peran Pengguna

### 1.1 Akun Tunggal (*Single Account Model*)
* Setiap pengguna hanya memiliki **satu jenis akun pengguna umum** di sistem.
* Tidak ada pemisahan registrasi antara "akun pencari kerja" dan "akun pemberi kerja".
* Satu pengguna dapat memposting permohonan bantuan sekaligus menawarkan keahlian/jasanya.

### 1.2 Peran Bersifat Kontekstual per Transaksi
Peran ditentukan oleh keterlibatan pengguna dalam suatu postingan atau aktivitas:
* **Pemohon (Requester):** Pengguna yang menerbitkan postingan *Saya Butuh* atau pihak yang meminta bantuan dalam suatu kesepakatan.
* **Penolong (Helper):** Pengguna yang menerbitkan postingan *Saya Bisa* atau pihak yang menyetujui untuk memberikan bantuan dalam suatu kesepakatan.
* **Tamu Publik (Guest):** Pengunjung yang belum terautentikasi (hanya memiliki hak baca pada konten publik).

---

## 2. Pemisahan Tiga Entitas Status Independen

Sistem memisahkan status ke dalam 3 siklus hidup yang terpisah:
1. **Status Postingan (`post_status`):** Ketersediaan postingan di feed/katalog publik.
2. **Status Kesepakatan (`deal_status`):** Status negosiasi kartu kesepakatan di ruang chat.
3. **Status Kegiatan (`activity_status`):** Tahapan pelaksanaan nyata di lapangan.

```
[ POSTINGAN ]
aktif ──────────► kuota_penuh ──────────► ditutup / kedaluwarsa
  │                    ▲
  │ (jika batal)       │ (saat kesepakatan disetujui hingga kuota habis)
  └────────────────────┘

[ KESEPAKATAN / DEAL ]
diajukan ──(jika parameter diedit)──► menunggu_revisi
   │                                        │
   ├──► ditolak / dibatalkan                │
   │                                        ▼
   └────────────(keduanya setuju)─────► disepakati

[ KEGIATAN ]
terjadwal ────────► berlangsung ────────► selesai ────────► diulas
   │                     │
   └──► dibatalkan ◄─────┘
```

---

## 3. Rincian Siklus Status & Transisi

### 3.1 Status Postingan (`post_status`)

| Status | Makna | Visibilitas di Feed | Aturan Transisi |
|---|---|---|---|
| `aktif` | Postingan terbuka dan masih menerima tawaran/pesan. | Muncul di feed, hasil filter, dan pencarian. | Kondisi awal saat dipublikasikan; atau dipulihkan dari `kuota_penuh` jika ada kesepakatan yang dibatalkan. |
| `kuota_penuh` | Jumlah kesepakatan yang disetujui telah mencapai kuota kebutuhan postingan. | Diberi label badge "Kuota Terpenuhi" dan tombol "Ajukan Bantuan / Chat" dinonaktifkan untuk tawaran baru. | Otomatis berubah saat total kesepakatan berstatus `disepakati` = nilai kuota postingan (khusus *Saya Butuh*). |
| `ditutup` | Pembuat postingan menutup penawaran/permohonan secara sengaja, atau seluruh kegiatan telah tuntas. | Disembunyikan dari feed aktif; hanya tersimpan di arsip riwayat pengguna. | Diubah manual oleh pemilik postingan; atau otomatis saat semua kegiatan tuntas. |
| `kedaluwarsa` | Tanggal rencana aktivitas telah terlewati di masa lalu sebelum kuota terpenuhi. | Diberi penanda visual "Kedaluwarsa" dan diturunkan dari prioritas feed. | Diperiksa secara otomatis berdasarkan tanggal rencana vs tanggal hari ini. |

---

### 3.2 Status Kesepakatan / Deal Card (`deal_status`)

Kesepakatan dilakukan secara eksplisit melalui **Kartu Kesepakatan** di dalam ruang chat yang memuat 5 parameter wajib:
1. Jenis/Judul Bantuan
2. Pihak Pemohon & Penolong
3. Jadwal Pelaksanaan (Tanggal & Jam mulai)
4. Titik Temu / Lokasi Pelaksanaan
5. Bentuk & Nilai Imbalan (Tarif, Nego, Patungan, Bayar Sendiri, Traktir, Sukarela)

| Status Kesepakatan | Makna | Aturan & Otorisasi |
|---|---|---|
| `diajukan` | Pihak A membuat dan mengirim kartu kesepakatan ke ruang chat. | Status menunggu respon Pihak B. Pihak B memiliki opsi: "Setujui" atau "Ubah Rincian". |
| `menunggu_revisi` | Salah satu pihak mengubah isi parameter (misal jadwal atau imbalan) setelah draft dibuat. | Persetujuan sebelumnya dianulir; kedua belah pihak wajib menyetujui ulang parameter baru tersebut. |
| `disepakati` | **Kedua belah pihak telah menyetujui versi parameter kesepakatan yang sama.** | 1. Memicu pembuatan entitas **Kegiatan** baru dengan status `terjadwal`.<br>2. Mengurangi sisa kuota pada postingan *Saya Butuh* terkait.<br>3. Kartu di chat terkunci dan menampilkan status "Kesepakatan Disetujui". |
| `ditolak` | Pihak penerima menolak kartu kesepakatan. | Obrolan tetap berlanjut; postingan tidak terpengaruh; pihak penawar dapat mengajukan tawaran revisi. |
| `dibatalkan` | Salah satu pihak membatalkan kesepakatan sebelum kegiatan dilaksanakan. | Mengubah status kegiatan menjadi `batal` dan mengembalikan kuota postingan *Saya Butuh*. |

---

### 3.3 Status Kegiatan (`activity_status`)

Entitas Kegiatan muncul di dashboard `/aktivitas` kedua belah pihak setelah kesepakatan berstatus `disepakati`:

| Status Kegiatan | Makna | Perbedaan & Syarat |
|---|---|---|
| `terjadwal` | **Sudah disepakati, tetapi belum dimulai** (masih menunggu waktu pelaksanaan / hari-H). | - Belum dapat dikonfirmasi selesai.<br>- Dapat dibatalkan secara wajar oleh salah satu pihak.<br>- Menampilkan hitung mundur waktu atau tanggal rencana. |
| `berlangsung` | **Kegiatan sedang berjalan di lapangan pada hari-H.** | - Tombol "Buka Obrolan Kontak Darurat" aktif.<br>- Tombol "Konfirmasi Selesai" mulai aktif.<br>- Pembatalan pada tahap ini memerlukan catatan alasan khusus. |
| `selesai` | **Kegiatan riil telah selesai dilaksanakan.** | - Hak akses form rating terbuka untuk kedua belah pihak.<br>- Postingan *Saya Butuh* yang terkait ditandai tuntas. |
| `batal` | Kegiatan dibatalkan sebelum selesai. | - Hak akses rating ditutup (kegiatan batal tidak dapat diulas).<br>- Tercatat di riwayat aktivitas dengan label "Dibatalkan". |

---

## 4. Aturan Khusus: Perbedaan "Saya Butuh" vs "Saya Bisa"

### 4.1 Logika Penutupan "Saya Butuh"
* **Berdasarkan Kuota, Bukan Asal 1 Deal:**
  * Postingan *Saya Butuh* menentukan `quota` (jumlah orang yang dibutuhkan). Default = 1 orang.
  * Jika postingan membutuhkan 2 orang (misal: butuh 2 orang untuk angkat lemari besar):
    * Kesepakatan ke-1 disetujui &rarr; Postingan tetap `aktif` (sisa kuota: 1).
    * Kesepakatan ke-2 disetujui &rarr; Postingan berubah menjadi `kuota_penuh` (sisa kuota: 0).
  * Postingan berstatus `kuota_penuh` tidak menerima pengajuan baru dari pengguna lain di katalog.

### 4.2 Logika Penayangan & Pencegahan Benturan "Saya Bisa"
* Postingan *Saya Bisa* merupakan penawaran kapasitas/keahlian (misal: jasa bersih kos atau teman olahraga sore).
* **Tetap Tayang di Feed:** Tercapainya satu kesepakatan tidak serta-merta menutup postingan *Saya Bisa*, karena penolong dapat melayani pengguna lain di slot waktu berbeda.
* **Pencegahan Benturan Jadwal (*Collision Prevention*):**
  * Penolong dilarang menyetujui kartu kesepakatan baru yang memiliki rentang waktu bertabrakan (*overlapping schedule*) dengan kegiatan berstatus `terjadwal` atau `berlangsung` miliknya.
  * Sistem memberikan peringatan validasi: *"Anda telah memiliki jadwal kegiatan lain pada waktu tersebut."*

---

## 5. Mekanisme Konfirmasi Selesai, Pembatalan, dan Rating

### 5.1 Mekanisme Konfirmasi Selesai
1. Salah satu pihak (biasanya Pemohon penerima bantuan, atau Penolong yang telah tuntas bekerja) menekan tombol **"Konfirmasi Selesai"** di halaman aktivitas.
2. Pihak lawan menerima permintaan konfirmasi di kartu aktivitas.
3. Status berubah menjadi `selesai` jika:
   * Pihak kedua mengonfirmasi selesai; ATAU
   * Pemohon bantuan secara sepihak menyatakan telah selesai dan puas.

### 5.2 Mekanisme Pembatalan
1. **Sebelum Hari-H (Status `terjadwal`):**
   * Salah satu pihak dapat menekan tombol "Batalkan Bantuan".
   * Wajib memilih alasan pembatalan (Jadwal mendadak bentrok / Hal tak terduga / Kesepakatan dibatalkan bersama).
   * Status kegiatan berubah menjadi `batal`. Kuota postingan *Saya Butuh* otomatis bertambah kembali dan status postingan kembali menjadi `aktif`.
2. **Saat Hari-H (Status `berlangsung`):**
   * Pembatalan memerlukan konfirmasi kedua pihak di obrolan agar tidak terjadi salah paham sepihak.

### 5.3 Syarat Mutlak Rating & Reputasi
1. **Hanya untuk Kegiatan Selesai:** Form rating hanya dapat diakses jika entitas kegiatan memiliki status `activity_status === "selesai"`. Obrolan tanpa kesepakatan atau kegiatan batal **dilarang memberikan rating**.
2. **Anti Self-Rating:** Pengguna tidak dapat memberi ulasan atau bintang kepada dirinya sendiri.
3. **Maksimal 1 Kali per Transaksi:** Setiap pihak hanya berhak memberi 1 ulasan untuk 1 kegiatan yang selesai. Setelah ulasan terkirim, ulasan tidak dapat dikirim ulang (mencegah manipulasi skor).
4. **Validasi Ulasan:**
   * Skor bintang: Bilangan bulat 1 sampai 5.
   * Komentar teks: Minimal 10 karakter, maksimal 500 karakter.
5. **Pembaruan Agregat Profil:** Setiap rating yang masuk secara langsung memperbarui `rating_average` dan `rating_count` pada profil pengguna yang diulas di basis data.

---

## 6. Kebijakan Privasi Informasi & Keamanan Kontak

1. **Informasi Terbuka (Publik):**
   * Nama depan / nama tampilan, inisial avatar.
   * Skor rata-rata rating dan jumlah ulasan selesai.
   * Wilayah kabupaten/kota DIY (Sleman, Kota Jogja, dll) dan titik patokan umum (contoh: *Dekat Pogung Baru*, *Sekitar Mirota Kampus*).
   * Teks deskripsi kebutuhan/keahlian dan format imbalan.
2. **Informasi Tertutup (Hanya di Ruang Chat Privat Antar-Pihak):**
   * Nomor telepon / WhatsApp.
   * Alamat presisi (nomor kamar kos, gang sempit, patokan rumah).
   * Dokumen pendukung atau foto pribadi.

---

## 7. Penanganan Kondisi Khusus UX

| Kondisi | Respon Sistem | Solusi Pemulihan Pengguna |
|---|---|---|
| **Wilayah Tanpa Postingan** | Komponen `EmptyState` menampilkan: *"Belum ada postingan aktif di wilayah [Nama Wilayah]. Jadilah yang pertama membuat permohonan atau penawaran!"* | Tampilkan tombol aksi cepat: `[+ Buat Saya Butuh]` dan `[+ Buat Saya Bisa]`. |
| **Gagal Koneksi ke Server / DB** | Komponen `ErrorState` ramah pengguna, bukan kode error JSON mentah. | Tombol "Coba Lagi" untuk melakukan query ulang secara mulus. |
| **Tamu Mencoba Aksi Interaktif** | Sistem menahan aksi dan mengarahkan ke `/login?next=[URL]` dengan pesan toast edukatif. | Setelah login berhasil, pengguna dikembalikan secara otomatis ke rute yang dituju. |
