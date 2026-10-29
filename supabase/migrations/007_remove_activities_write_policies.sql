-- =============================================================================
-- Migration 007: Hapus policy activities_update_own dan activities_insert_own
-- =============================================================================
-- Menghapus policy WRITE pada tabel activities karena semua operasi write
-- sekarang dilakukan melalui RPC functions dengan SECURITY DEFINER.
--
-- PRASYARAT:
-- - Migration 002 (activities table + policies) sudah dijalankan
-- - Migration 006 (cancel_activity RPC) sudah dijalankan
-- - Fungsi startActivitySupabase() sudah dihapus dari codebase
-- - Semua operasi write ke activities sudah menggunakan RPC:
--   * cancel_activity (migration 006)
--   * complete_activity (migration 005)
--   * save_activity_rating (migration 005)
--   * accept_help_application (migration 004) — insert/update activity
--
-- CATATAN KEAMANAN:
-- - Policy SELECT TIDAK DIHAPUS (activities_select_own, activities_select_as_partner)
-- - Hanya policy UPDATE dan INSERT yang dihapus
-- - RPC functions menggunakan SECURITY DEFINER sehingga bypass RLS
-- - Setelah migration ini, tidak ada lagi jalur direct write ke activities
--   dari Supabase client (non-RPC)
--
-- RISIKO:
-- - Jika ada kode yang belum teraudit masih melakukan direct write ke activities,
--   operasi tersebut akan gagal setelah policy dihapus.
-- - Pastikan audit source code selesai sebelum menjalankan migration ini.
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi bahwa RPC functions sudah ada
-- =========================================================

DO $$
BEGIN
    -- Verifikasi cancel_activity RPC sudah ada
    IF to_regprocedure('public.cancel_activity(uuid)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.cancel_activity(uuid) tidak ditemukan. Jalankan migration 006 terlebih dahulu.';
    END IF;

    -- Verifikasi complete_activity RPC sudah ada
    IF to_regprocedure('public.complete_activity(uuid)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.complete_activity(uuid) tidak ditemukan. Jalankan migration 005 terlebih dahulu.';
    END IF;

    -- Verifikasi save_activity_rating RPC sudah ada
    IF to_regprocedure('public.save_activity_rating(uuid, smallint, text)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.save_activity_rating(uuid, smallint, text) tidak ditemukan. Jalankan migration 005 terlebih dahulu.';
    END IF;

    -- Verifikasi accept_help_application RPC sudah ada
    IF to_regprocedure('public.accept_help_application(uuid)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.accept_help_application(uuid) tidak ditemukan. Jalankan migration 004 terlebih dahulu.';
    END IF;
END
$$;

-- =========================================================
-- 2. Hapus policy activities_update_own
-- =========================================================
-- Policy ini memungkinkan user authenticated untuk UPDATE activity miliknya
-- secara langsung via Supabase client. Sekarang semua update dilakukan via RPC.

DROP POLICY IF EXISTS activities_update_own
    ON public.activities;

-- =========================================================
-- 3. Hapus policy activities_insert_own
-- =========================================================
-- Policy ini memungkinkan user authenticated untuk INSERT activity baru
-- secara langsung via Supabase client. Sekarang semua insert dilakukan via RPC
-- (accept_help_application membuat activity record saat pengajuan diterima).

DROP POLICY IF EXISTS activities_insert_own
    ON public.activities;

-- =========================================================
-- 4. Verifikasi: Policy SELECT masih ada
-- =========================================================
-- Memastikan kita tidak menghapus policy SELECT yang masih dibutuhkan.

DO $$
BEGIN
    -- Verifikasi activities_select_own masih ada
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'activities'
          AND policyname = 'activities_select_own'
    ) THEN
        RAISE WARNING 'Policy activities_select_own tidak ditemukan. Pastikan policy SELECT masih aktif.';
    END IF;

    -- Verifikasi activities_select_as_partner masih ada (dibuat di migration 005)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'activities'
          AND policyname = 'activities_select_as_partner'
    ) THEN
        RAISE WARNING 'Policy activities_select_as_partner tidak ditemukan. Pastikan policy SELECT partner masih aktif.';
    END IF;
END
$$;

COMMIT;

-- =============================================================================
-- DOKUMENTASI STATUS AKHIR
-- =============================================================================
--
-- Setelah migration ini dijalankan:
--
-- 1. Policy activities yang tersisa:
--    - activities_select_own (SELECT, user_id = auth.uid())
--    - activities_select_as_partner (SELECT, partner_id = auth.uid())
--
-- 2. Policy activities yang dihapus:
--    - activities_update_own (UPDATE) — semua update via RPC
--    - activities_insert_own (INSERT) — semua insert via RPC
--
-- 3. Operasi write ke activities hanya melalui RPC:
--    - cancel_activity (status → 'batal')
--    - complete_activity (status → 'selesai')
--    - save_activity_rating (review_rating, review_comment)
--    - accept_help_application (status → 'berlangsung', partner_id)
--
-- 4. Direct write dari Supabase client TIDAK DIMUNGKINKAN lagi.
--    Ini menutup risiko bypass validasi transisi status.
--
-- =============================================================================
