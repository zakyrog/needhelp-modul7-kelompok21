# Instruksi serah terima dari ketua

## Sebelum mulai

Ketua mengisi nama lengkapnya, tanggal tenggat tiap tahap, dan URL repository GitHub publik. Tiga anggota telah ditetapkan: Suprihatini, Arif Raharjo, Felix Nicholas Juan Lee. Dokumen Modul 1 memuat 5 nama, tetapi tim sekarang 4 orang. Jangan menyalin daftar lama tanpa verifikasi. Kirim ZIP awal, link Figma, PRD awal, serta dokumen ini. Setiap anggota harus berhasil menjalankan proyek sebelum mengerjakan bagiannya.

## Suprihatini — Tampilan dan responsivitas

1. Cocokkan token, font, dan komponen dengan Figma Final UI.
2. Lengkapi 01_Login, tampilan error 02_LoginError, dan sesuaikan index.html dengan 03_Homepage.
3. Sesuaikan halaman HTML lama untuk 04_KatalogSayaButuh, 05_KatalogSayaBisa, 06_DetailPost, 07_FormBantuan, state 08_FormError, 09_Success, 10_Aktivitas, 11_Chat, dan 12_Notifikasi.
4. Ekspor dua dekorasi login dan aset asli lain yang digunakan. Simpan di assets/images/, tidak memakai URL Figma sementara.
5. Buat komponen bersama: Header, PostCard, filter, field, tombol, dan status/error. Gunakan CSS variables di assets/css/tokens.css. Kode HTML Modul 6 dipertahankan dan dikembangkan; tidak perlu migrasi React.
6. Periksa desktop 1440, tablet 768, dan mobile 390/360 piksel. Tidak boleh ada scroll horizontal tak disengaja.

Serah terima: Pull Request, daftar halaman selesai, screenshot, daftar aset, dan catatan selisih terhadap Figma. Hasil UI harus dapat menerima data dan callback dari Arif Raharjo.

## Arif Raharjo — Interaksi dan alur

Pertahankan beranda/katalog/detail publik. Login hanya saat membuat postingan/chat; simpan halaman tujuan agar pengguna tidak mengulang langkah. Rating setelah aktivitas selesai merupakan kelanjutan user flow dan rating.html Modul 6.

1. Bersama Suprihatini, sepakati kontrak komponen: data yang diterima dan callback yang dipanggil.
2. Atur perpindahan beranda publik → katalog/detail → login saat posting/chat → kembali ke tujuan → form/sukses. Tautan kembali harus tersedia.
3. Implementasikan drawer mobile buka/tutup dan filter katalog yang mengubah hasil. Ini target minimum dua aksi dinamis.
4. Validasi form; setelah submit, tampilkan sukses dan postingan di aktivitas menggunakan data demo lokal.
5. Aktifkan kirim pesan demo dan tandai notifikasi dibaca jika termasuk lingkup PRD yang disepakati.
6. Pertahankan pemisahan data, logika, dan tampilan. Simpan logika/data demo di assets/js/. Jangan mengganti gaya global tanpa koordinasi.

Serah terima: Pull Request, langkah mencoba tiap fitur, perilaku error, keterbatasan simulasi, log prompt, dan perbaikan manual. Tidak boleh mengklaim backend atau layanan eksternal aktif bila hanya simulasi.

## Felix Nicholas Juan Lee — QA dan dokumentasi

1. Mulai sejak awal dengan membaca PRD, menyiapkan checklist, dan mengisi identitas tim.
2. Jalankan checklist per halaman ketika UI dan interaksi tersedia.
3. Tulis bug dengan langkah reproduksi, hasil aktual, hasil yang diharapkan, ukuran layar, dan pemilik perbaikan.
4. Kumpulkan log AI tiap anggota; jangan mengarang prompt, kontribusi, atau hasil tes.
5. Perbarui README, PRD markdown, dan ekspor PRD final ke PDF. Cantumkan URL Figma, GitHub publik, panduan lokal, kontribusi, log prompt, dan perbaikan.
6. Periksa minimal 5 commit nyata, clone bersih + npm ci + build, dan tidak ada crash/runtime error pada alur utama.

Serah terima: Pull Request dokumentasi, PRD PDF final, daftar tes lulus/gagal, bug belum selesai, dan daftar kontribusi.

## Ketua — Integrasi dan pengumpulan

Review Pull Request satu per satu. Untuk file sama yang bentrok, minta anggota menyepakati perubahan dahulu. Lakukan tes akhir dari clone baru. Pastikan PRD menggambarkan aplikasi final, bukan rencana awal. Kumpulkan repository publik, README lengkap, dan PRD PDF sesuai brief.

## Urutan checkpoint

A: ketua menyerahkan fondasi dan semua anggota berhasil menjalankan proyek.
B: UI awal dan kontrak komponen selesai; dokumentasi mulai terisi.
C: UI lengkap dan interaksi terpasang; QA melaporkan bug.
D: pemilik bagian memperbaiki bug; Felix Nicholas Juan Lee memperbarui dokumen.
E: ketua menggabungkan, melakukan tes akhir, dan mengumpulkan.

Tanggal A–E wajib ditetapkan ketua berdasarkan deadline kuliah; belum ditentukan di paket ini.

## Peta halaman awal

index.html = beranda; login.html = login/error; katalog.html = dua tab katalog; detail-postingan.html = detail; buat-postingan.html = form/error; sukses-postingan.html = sukses; aktivitas.html = aktivitas; chat.html = chat; rating.html = penutup alur lama. Notifikasi belum ada dan perlu ditambahkan.

Periksa konten Gubeng yang tidak sesuai fokus Yogyakarta; statistik/distance adalah konten prototipe, bukan angka operasional terverifikasi. Kartu berbeda harus menuju detail yang tepat. Form POST lama tidak memiliki backend; handler sementara harus diganti per fitur.
