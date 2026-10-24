# Checklist QA & Hasil Uji Felix (Modul 8)

## Status Hasil Uji Bagian Felix Nicholas Juan Lee (Data Dinamis & Form)

| ID Uji | Lingkungan / URL | Langkah Pengujian | Harapan | Hasil Aktual | Status | Bukti / Catatan |
|---|---|---|---|---|---|---|
| **QA-01** | `localhost:3000/katalog` & `public/data/posts.json` | 1. Buka katalog.<br>2. Ubah data di `public/data/posts.json`.<br>3. Refresh halaman. | Kartu berasal dari sumber JSON dinamis; perubahan data di JSON langsung tampak di kartu katalog. | Data dimuat via `fetchPublicPosts()` dari `/data/posts.json` dengan `cache: "no-store"`. Perubahan file langsung tampil seketika setelah refresh. | **LULUS** | `public/data/posts.json` & endpoint `/api/posts`. |
| **QA-02** | `localhost:3000/katalog` | 1. Cari judul di input search.<br>2. Ganti tab Saya Butuh/Saya Bisa.<br>3. Pilih kategori & lokasi.<br>4. Periksa pagination. | Hasil filter akurat; pergantian filter tidak menyisakan halaman kosong atau pagination rusak. | `page` otomatis reset ke 1 setiap filter berganti; `activePage` selalu ter-clamp pada `pageCount`. | **LULUS** | Filter multi-kategori, lokasi, tipe, dan sorting terverifikasi. |
| **QA-03** | `localhost:3000/katalog` | Cari kata kunci yang tidak ada (contoh: "xyz123"). | Menampilkan Empty State dengan pesan jelas dan tombol Reset/Bersihkan Filter. | Muncul `EmptyState` ("Tidak ada postingan yang cocok"); klik "Bersihkan Filter" memulihkan daftar postingan. | **LULUS** | Komponen `EmptyState` dengan `onAction={handleReset}`. |
| **QA-04** | `localhost:3000/buat-postingan` | Kirim form kosong, spasi saja, tanggal lampau, dan nominal tarif <= 0. | Data ditolak dan tidak tersimpan; pesan error spesifik muncul di bawah field terkait. | Semua field divalidasi dengan `.trim()`, tanggal lokal dicek `< localToday`, nominal tarif harus angka `> 0`. Error inline merah muncul. | **LULUS** | Fungsi `validatePost()` di `src/lib/validation.js`. |
| **QA-05** | `localhost:3000/buat-postingan` | Isi form lengkap valid, lalu kirim postingan. | Tombol terkunci (`disabled`), klik ganda dicegah, toast sukses muncul, dialihkan ke `/sukses-postingan`, postingan muncul di katalog & aktivitas serta bertahan saat reload. | ID unik dihasilkan (`post-${Date.now()}-${rand}`), status tersimpan di `localStorage`, toast pop-up sukses muncul, halaman sukses & aktivitas menampilkan data baru. | **LULUS** | Data tersimpan di `needhelp.demo-posts.v1` dan tahan reload F5. |
| **QA-06** | `localhost:3000/katalog?simulate_error=1` & judul form `[simulasi-gagal]` | 1. Uji baca gagal: buka katalog dengan `?simulate_error=1`.<br>2. Uji simpan gagal: buat postingan dengan judul memuat `[simulasi-gagal]`. | 1. Muncul ErrorState dengan tombol "Coba Lagi" yang dapat memulihkan data.<br>2. Tombol submit terbuka kembali, form tidak terhapus, toast error muncul. | Error tertangkap rapi oleh `try/catch`. Tombol "Coba Lagi" di ErrorState membersihkan query param dan memuat ulang data dengan sukses. | **LULUS** | Simulasi terkontrol terpasang pada `data.js` & `buat-postingan/page.js`. |
| **QA-07** | `localhost:3000/detail-postingan?id=id-acak-tidak-ada` | Akses langsung halaman detail dengan parameter ID palsu. | Menampilkan EmptyState informasi tidak ditemukan tanpa merusak tampilan atau menampilkan detail orang lain. | Muncul `EmptyState` "Postingan tidak ditemukan" dengan tombol navigasi kembali ke katalog. | **LULUS** | Penanganan ID invalid di `detail-postingan/page.js` & `sukses-postingan/page.js`. |

---

## Ringkasan Pemeriksaan Kode & Lingkungan
- `npm run lint`: **0 errors, 0 warnings**.
- `npm run build`: **Compiled successfully** (seluruh rute 18/18 berstatus Static dan Dynamic `/api/posts` aktif).
- Keamanan: Tidak ada kredensial atau rahasia yang disimpan di client-side repository.
