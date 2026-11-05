-- =============================================================================
-- Migration 015: Kolom avatar_key pada public.profiles
-- =============================================================================
-- File ini HANYA REFERENSI. Jangan jalankan tanpa review.
-- Untuk menerapkan: buka Supabase Dashboard → SQL Editor → paste dan run.
--
-- KENAPA KOLOM BARU:
--   Sebelum migration ini tidak ada tempat menyimpan identifier avatar
--   ILUSTRASI pilihan pengguna. Kolom yang sudah ada tidak cocok dipakai ulang:
--     * profiles.avatar_url  = URL gambar (dipakai sebagai foto/placeholder).
--     * profiles.avatar_class = KELAS WARNA tint (mis. 'avatar-blue') yang dibaca
--       chat & kartu sebagai kelas CSS; mengisinya dengan identifier ilustrasi
--       akan menghasilkan kelas CSS tak dikenal di banyak tempat.
--     * profiles.initial     = huruf inisial (avatar default saat belum memilih).
--   Jadi satu kolom baru yang khusus menampung identifier ilustrasi adalah
--   perubahan paling minimal, tanpa mengubah arti kolom mana pun.
--
-- SEMANTIK:
--   avatar_key = NULL      -> pengguna belum memilih ilustrasi; tampilkan inisial
--                             nama sebagai avatar default (fallback).
--   avatar_key = '<key>'   -> tampilkan ilustrasi /assets/images/avatars/<key>.svg.
--
-- KEAMANAN / RLS:
--   TIDAK ADA PERUBAHAN RLS. Policy `profiles_update_own`
--   (USING auth.uid() = id, WITH CHECK auth.uid() = id) sudah menjamin pengguna
--   hanya dapat mengubah baris profilnya sendiri, sehingga avatar pengguna lain
--   tidak dapat diubah lewat jalur ini. Kolom ini bersifat tampilan publik
--   (kelas data yang sama dengan avatar_url), jadi tidak sensitif.
--
-- PRASYARAT: schema.sql (tabel public.profiles).
-- Tidak mengubah tabel, kolom, RPC, atau policy yang sudah ada.
--
-- IDEMPOTEN: ADD COLUMN IF NOT EXISTS, dan constraint hanya ditambahkan bila
-- belum ada (dicek lewat pg_constraint). Aman dijalankan berulang kali.
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat
-- =========================================================
DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.profiles tidak ditemukan. Jalankan schema.sql terlebih dahulu.';
    END IF;
END $$;

-- =========================================================
-- 2. Tambah kolom avatar_key (nullable)
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_key TEXT DEFAULT NULL;

-- =========================================================
-- 3. Batasi nilai yang sah (hanya identifier yang benar-benar disediakan UI)
--    Ditambahkan sebagai constraint terpisah agar idempoten & mudah ditinjau.
-- =========================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_avatar_key_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_avatar_key_check
          CHECK (
            avatar_key IS NULL OR avatar_key IN (
              'fox', 'cat', 'owl', 'pandan',
              'kopi', 'merapi', 'becak', 'batik'
            )
          );
    END IF;
END $$;

-- =========================================================
-- 4. Dokumentasi kolom
-- =========================================================
COMMENT ON COLUMN public.profiles.avatar_key IS
  'Identifier avatar ilustrasi pilihan pengguna (mis. ''fox''). NULL = tampilkan inisial nama sebagai avatar default. Nilai sah dibatasi oleh constraint profiles_avatar_key_check.';

COMMIT;

-- =============================================================================
-- VERIFIKASI (jalankan manual setelah migration)
-- =============================================================================
-- -- 1. Kolom ada dengan tipe & default yang benar
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name = 'avatar_key';
--
-- -- 2. Constraint terpasang
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.profiles'::regclass
--   AND conname = 'profiles_avatar_key_check';
--
-- -- 3. RLS profiles TIDAK berubah (harus tetap 3 policy seperti sebelumnya)
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'profiles'
-- ORDER BY policyname;
--
-- -- 4. Nilai tidak sah DITOLAK (harus error 23514 check_violation)
-- UPDATE public.profiles SET avatar_key = 'tidak-ada' WHERE id = auth.uid();
--
-- -- 5. Nilai sah DITERIMA
-- UPDATE public.profiles SET avatar_key = 'fox' WHERE id = auth.uid();
-- =============================================================================
