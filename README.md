# NeedHelp — Tugas Modul 7 Kelompok 21
## PRD Final

[Buka PRD Final NeedHelp](https://drive.google.com/file/d/1SuC0Wx6kJNWk4dfgUdfk4fdsHmkRSTOr/view?usp=sharing)
Kelompok 21. Status: fondasi untuk dilanjutkan 3 anggota, **belum aplikasi final**.

Figma: https://www.figma.com/design/iP8nJj7pgr2LxL1nvtuTAa/Need-Based-Companion---Help-FIX?node-id=85-60

## Dasar proyek

Mengembangkan 9 halaman HTML semantik dan aset lokal dari ZIP Modul 6 pengguna. Stack: HTML, CSS, JavaScript, Vite (server/build), Inter lokal. Tidak memerlukan React atau backend. User flow: beranda/katalog/detail boleh dilihat tanpa login; membuat postingan dan chat meminta login, lalu kembali ke tujuan semula.

## Menjalankan di Windows

Pasang Node.js 22.12 atau lebih baru, ekstrak ZIP, buka folder `needhelp-ketua` di VS Code, lalu jalankan:

```sh
npm ci
npm run dev
```

Buka URL yang muncul pada terminal. Untuk produksi:

```sh
npm run build
npm run preview
```

Build mencakup seluruh 9 halaman, bukan hanya index.html. Jangan unggah node_modules/dist. `npm ci` memakai versi package-lock.json.

## Contoh yang tersedia

- Beranda publik dan 9 halaman lama tetap tersedia, dengan CSS fondasi bersama.
- Form login contoh berdasarkan Figma node 110:1615; bukan seluruh layar login.
- Validasi login, sesi demo, redirect kembali ke halaman tujuan, logout.
- Menu mobile buka/tutup dan modal informasi pada login.
- Form lain ditahan oleh handler sementara agar tidak melakukan POST ke server statis. Filter/posting/chat/rating belum menyimpan atau mengubah data.

Akun demo: `demo@needhelp.test` / `NeedHelp123!`. Autentikasi hanya simulasi frontend. Password tidak disimpan. Ingat saya menggunakan localStorage; tanpa centang menggunakan sessionStorage. Google/pemulihan email/pendaftaran belum aktif. Modal menjelaskan statusnya.

## Yang harus dilanjutkan

Suprihatini mencocokkan seluruh halaman dengan Figma, melengkapi panel kiri login, mengekspor aset Figma asli, dan menambah notifikasi (belum ada di Modul 6). CSS fondasi halaman lama belum membuktikan fidelitas Figma. Dua SVG dekorasi gagal diunduh sebagai aset valid; tidak disertakan. Token error masih sementara.

Arif Raharjo mengerjakan pencarian/filter nyata, data postingan, detail sesuai ID, validasi form/sukses, aktivitas, chat, dan rating demo. Felix Nicholas Juan Lee menguji dan menyelesaikan dokumen final. `rating.html` berasal dari Modul 6/user flow meskipun tidak ada dalam daftar 12 frame Final UI.

Ada konten lama yang harus diperiksa: alamat Gubeng pada beranda tidak sesuai fokus Yogyakarta, statistik belum terverifikasi, halaman detail masih sama untuk beberapa kartu. Log Modul 6 menyatakan validasi W3C 0 error; klaim itu adalah riwayat lama, bukan hasil uji ulang paket ini.

## Pembagian file

| Peran | File milik utama | Hasil |
|---|---|---|
| Ketua | package.json, vite.config.js, docs/PRD-Awal.md | fondasi, PRD, integrasi |
| Suprihatini — UI | *.html, assets/css/, assets/images/ | fidelitas dan responsif |
| Arif Raharjo — logika | assets/js/ | interaksi dan data demo |
| Felix Nicholas Juan Lee — QA/dokumen | README.md, docs/ | hasil pengujian, PRD PDF final |

Tim saat ini terdiri atas ketua, Suprihatini, Arif Raharjo, dan Felix Nicholas Juan Lee. Ketua mengisi nama lengkapnya serta tenggat internal.

## Git & GitHub

Satu commit setup lokal disertakan. Repository **belum dipublikasikan ke GitHub**; syarat repo publik dan minimal 5 commit tim belum terpenuhi. Buat repo GitHub publik kosong, lalu jalankan:

```sh
git remote add origin URL_REPOSITORY_KALIAN
git push -u origin main
```

Ganti placeholder URL dengan link asli. Undang tiga anggota menjadi collaborator. Isi URL itu di PRD final. Setiap anggota mengatur identitas Git sendiri. Kerjakan branch `ui`, `interaction`, `docs-testing`; ketua menjaga main. Contoh:

```sh
git switch -c ui
git diff
git add index.html katalog.html assets/css assets/images
git commit -m "feat: implement catalog responsive layout"
git push -u origin ui
```

Ajukan Pull Request dan tinjau sebelum merge. Minimal 5 commit berkala dengan perubahan nyata; jangan membuat commit kosong. Jangan mengedit file anggota lain tanpa koordinasi.

## Dokumen yang dibaca dahulu

1. docs/Instruksi-Anggota.md — tugas, urutan, kriteria serah terima.
2. docs/PRD-Awal.md dan PRD-Awal.pdf — acuan awal, wajib diperbarui setelah produk selesai.
3. docs/Log-AI.md — log pengerjaan baru.
4. docs/Prompt-Modul6.md — riwayat lama, dipertahankan sebagai sumber.
5. docs/Checklist-QA.md dan Hasil-Verifikasi.md — tes final dan hasil starter.

## Laporan Tugas Felix
