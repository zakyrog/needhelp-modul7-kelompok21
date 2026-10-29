-- =============================================================================
-- NeedHelp — Migrasi RLS untuk Akses Publik (Anon) [REVISI]
-- =============================================================================
-- File ini HANYA REFERENSI. Jangan jalankan tanpa review.
-- Untuk menerapkan: buka Supabase Dashboard → SQL Editor → paste dan run.
--
-- Tujuan: Memungkinkan pengunjung yang BELUM LOGIN (role anon) membaca
-- postingan publik dan profil penulis. Operasi tulis tetap memerlukan login.
--
-- CATATAN KEAMANAN:
-- - Hanya SELECT yang dibuka untuk anon. INSERT/UPDATE/DELETE tetap authenticated-only.
-- - Tabel posts TIDAK memiliki kolom status (is_active/deleted_at). Semua baris
--   dianggap postingan aktif yang memang bersifat publik. Jika nanti ditambahkan
--   kolom status, policy posts_select_anon harus diperbarui dengan filter yang sesuai.
-- - Policy profiles_select_anon memberikan akses ke SEMUA kolom tabel profiles
--   (RLS membatasi baris, bukan kolom). Saat ini kolom yang terekspos hanyalah
--   metadata profil publik (name, bio, avatar) plus timestamp created_at/updated_at
--   yang risikonya sangat rendah. Jika nanti profil mendapat kolom sensitif
--   (email, phone, alamat lengkap), GANTI policy ini dengan view yang membatasi kolom.
-- - Tidak ada konflik dengan policy existing (posts_select_all, profiles_select)
--   karena policy existing menggunakan role 'authenticated', bukan 'anon'.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Izinkan anon membaca semua postingan
--    (tabel posts tidak memiliki kolom status; semua baris = postingan aktif)
-- ---------------------------------------------------------------------------
CREATE POLICY "posts_select_anon"
  ON public.posts FOR SELECT
  TO anon
  USING (true);

-- ---------------------------------------------------------------------------
-- 2. Izinkan anon membaca profil penulis
--    (membatasi baris ke semua profil; kolom yang terekspos saat ini aman)
--    REVISI: Jika profil mendapat kolom sensitif, ganti dengan view publik.
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_anon"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);
