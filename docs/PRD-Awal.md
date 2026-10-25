# PRD Awal — NeedHelp

Kelompok 21 | Versi 0.1 | 14 Oktober 2026 | Status: dokumen kickoff, belum PRD final pengumpulan.

## 1. Masalah dan tujuan

Mahasiswa perantau, pekerja muda, dan masyarakat Yogyakarta kesulitan menemukan orang untuk bantuan/pendampingan spesifik dan sementara karena informasi tersebar di media sosial dan jaringan pribadi. NeedHelp mempertemukan kebutuhan Saya Butuh dengan penawaran Saya Bisa berdasarkan kategori, lokasi, waktu, dan kompensasi.

Tujuan Modul 7: mengembangkan desain Figma menjadi prototipe web responsif dan interaktif, melanjutkan HTML Modul 6, serta menunjukkan disiplin Git dan dokumentasi AI. Bukan membuat marketplace operasional lengkap.

## 2. Sumber dan status identitas

Acuan visual: Final UI Figma, https://www.figma.com/design/iP8nJj7pgr2LxL1nvtuTAa/Need-Based-Companion---Help-FIX?node-id=85-60

Acuan masalah: M1_Kelompok21_ProblemStatement..pdf. Acuan perilaku: Penjelasan_User_Flow_Kelompok_21 (3).pdf dan gambar flow pengguna. Fondasi kode: Tugas_Modul6_NeedHelp(2).zip. Rubrik: Brief & Rubrik Penilaian Modul 7.pdf.

Repository GitHub publik: BELUM DIBUAT/DIHUBUNGKAN. Ketua wajib memasukkan URL sebenarnya sebelum final. Nama anggota saat ini: Suprihatini, Arif Raharjo, dan Felix Nicholas Juan Lee. Nama lengkap ketua dan tenggat belum diberikan. Daftar lima nama Modul 1 tidak digunakan sebagai daftar tim saat ini.

## 3. User flow yang dipertahankan

Pengguna baru langsung membuka beranda/feed tanpa login. Katalog, pencarian/filter, dan detail dapat dijelajahi dahulu. Login diminta ketika membuat postingan atau memulai chat; sesudah login kembali ke halaman tujuan.

Jalur posting: beranda → buat postingan → login jika perlu → pilih Saya Butuh/Saya Bisa → isi deskripsi/lokasi/waktu → pilih kompensasi → publish → sukses → feed/aktivitas.

Jalur mencari: beranda/katalog → filter → detail → tertarik → login jika perlu → chat dua arah → kesepakatan atau kembali mencari → aktivitas selesai → rating.

Kompensasi fleksibel: tarif pasti, nego, patungan, bayar sendiri-sendiri, traktir, atau gratis/sukarela. Chat dapat dimulai dari pencari maupun pemberi bantuan. Pembayaran, matching otomatis, dan pelaksanaan aktivitas nyata tidak diproses di starter.

## 4. Teknologi dan lingkup

HTML semantik + CSS variables + JavaScript; Vite sebagai server/build multi-halaman; Inter lokal. Sembilan HTML dan aset SVG Modul 6 digunakan kembali. Tidak memerlukan React. Autentikasi dan data merupakan simulasi frontend. Backend/database, Google OAuth, pemulihan email, dan chat real-time belum diimplementasikan.

Lingkup target meliputi 12 frame Final UI. LoginError/FormError adalah state, bukan wajib menjadi file terpisah. rating.html dari Modul 6 dipertahankan sebagai penutup user flow; tampilan rating perlu disepakati karena tidak termasuk 12 frame Final UI. Notifikasi belum tersedia pada Modul 6 dan harus ditambahkan.

## 5. Pemetaan Figma ke kode

| Layar Figma | Node | Kode awal |
|---|---|---|
| 01_Login | 110:1592 | login.html |
| 02_LoginError | 110:1645 | state login.html |
| 03_Homepage | 110:1693 | index.html |
| 04_KatalogSayaButuh | 110:1835 | katalog.html |
| 05_KatalogSayaBisa | 110:2045 | katalog.html |
| 06_DetailPost | 110:2255 | detail-postingan.html |
| 07_FormBantuan | 110:2343 | buat-postingan.html |
| 08_FormError | 110:2418 | state buat-postingan.html |
| 09_Success | 110:2505 | sukses-postingan.html |
| 10_Aktivitas | 110:2554 | aktivitas.html |
| 11_Chat | 110:2683 | chat.html |
| 12_Notifikasi | 110:2859 | belum tersedia |

Detail visual starter diekstraksi untuk form login 110:1615. Halaman lain memakai markup lama dan CSS fondasi; belum dianggap cocok dengan Figma. Anggota UI wajib memeriksa detail masing-masing frame.

## 6. Kebutuhan dan kriteria penerimaan

F01 Akses publik: beranda/katalog/detail tampil tanpa login; posting/chat meminta login dan kembali ke tujuan. Fondasi tersedia.

F02 Login demo: input kosong, format salah, password pendek/salah memberi pesan; akun demo benar memulai sesi; logout membersihkannya. Checkbox Ingat saya menentukan localStorage/sessionStorage. Fondasi tersedia; visual error belum cocok sepenuhnya dengan Figma.

F03 Katalog: dua jenis postingan, pencarian dan filter kategori/lokasi/kompensasi benar-benar mengubah hasil; ada keadaan kosong. Markup tersedia, logika belum.

F04 Detail: kartu berbeda membuka data detail yang tepat; informasi konsisten; tombol menuju chat berfungsi. Markup tersedia, data dinamis belum.

F05 Posting: input wajib divalidasi; publish menyimpan postingan demo; halaman sukses/aktivitas menampilkan hasil yang sama. Markup tersedia, logika belum.

F06 Menu mobile/modal: menu buka/tutup dengan state; modal buka/tutup dan Escape. Contoh tersedia; UI perlu disesuaikan.

F07 Chat/aktivitas/rating: percakapan dua arah disimulasikan, pesan baru masuk daftar, status dan rating tersimpan lokal sesuai cakupan. Markup tersedia, logika belum.

F08 Notifikasi: daftar, filter jenis, dan tandai dibaca; perlu markup dan logika baru.

NF01 Tampilan mengikuti warna, tipografi, hierarki dan proporsi Figma. NF02 Responsif pada 360/390/768/1440 piksel tanpa broken layout. NF03 Build bersih dan bebas crash/runtime error pada alur utama. NF04 Repository GitHub publik dengan minimal lima commit nyata berkala. NF05 README dan PRD PDF memuat URL Figma/GitHub, panduan lokal, kontribusi, contoh prompt, dan perbaikan manual.

## 7. Pembagian tanggung jawab

Ketua: menetapkan lingkup, setup proyek, PRD awal, pemilik file, GitHub publik, integrasi dan pemeriksaan akhir. File utama: package.json, vite.config.js, docs/PRD-Awal.md.

Suprihatini: semua tampilan sesuai Figma, aset lokal, komponen dan layout responsif. File utama: *.html, assets/css/, assets/images/. Serah terima: PR, screenshot dan daftar selisih desain.

Arif Raharjo: logika JavaScript, data lokal, navigasi, filter, form, chat, rating dan notifikasi. File utama: assets/js/. Serah terima: PR dan langkah menguji tiap fitur. Koordinasikan selector/data attribute dengan Suprihatini.

Felix Nicholas Juan Lee: QA semua layar, laporan bug, README final, PRD PDF final dan rekap kontribusi/log AI. File utama: docs/, README.md. Dokumentasi dimulai sejak awal.

Setiap anggota wajib mencatat prompt asli, perubahan manual, hasil tes dan commit sendiri. Jangan menganggap riwayat Modul 6 sebagai kontribusi baru.

## 8. Status, gap, dan keputusan ketua

Tersedia: 9 halaman dasar Modul 6, CSS/token, font lokal, contoh form login, validasi/sesi/logout, kembali ke tujuan, menu mobile dan modal informasi. Form lain memiliki pengaman sementara untuk mencegah POST statis yang tidak didukung.

Belum selesai: fidelitas semua layar/panel kiri login, aset dekorasi Figma, pencarian/filter nyata, data postingan/detail/aktivitas/chat/rating/notifikasi, repo publik dan minimal 5 commit tim, tes seluruh alur, PRD final. Google/pemulihan email/daftar hanya modal status.

Konten perlu koreksi: Gubeng dalam beranda tidak sesuai fokus Yogyakarta; wilayah/detail dan statistik harus konsisten. Statistik, jarak dan jumlah online harus diposisikan sebagai konten demo, bukan data operasional terverifikasi. Dua dekorasi Figma gagal diunduh sebagai SVG valid; anggota UI mengekspor aset asli. Token error starter masih sementara.

Daftar disebut dalam user flow tetapi belum memiliki layar terpisah di Final UI/Modul 6. Tentukan apakah diperlukan form daftar demo, lalu selaraskan desain, kode, dan PRD. Tiga anggota kini telah ditetapkan: Suprihatini, Arif Raharjo, Felix Nicholas Juan Lee; nama lengkap ketua belum diberikan.

## 9. Urutan dan definisi selesai

A: fondasi diserahkan, nama/tenggat ditetapkan dan semua anggota berhasil menjalankan proyek. B: UI/kontrak selector selesai, dokumentasi berjalan. C: logika terpasang, QA menguji. D: pemilik bagian memperbaiki bug. E: ketua integrasi, clone bersih, build/tes akhir dan pengumpulan.

Tanggal checkpoint ditetapkan berdasarkan tenggat kuliah; belum tersedia. Definisi selesai: lingkup desain terimplementasi, minimal dua interaksi dinamis, alur utama utuh, responsif, bebas crash/runtime error, repo publik dengan commit nyata, README lengkap, PRD PDF sesuai produk aktual dan log kontribusi jujur.
