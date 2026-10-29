-- =============================================================================
-- Migration 006: RPC cancel_activity
-- =============================================================================
-- Fungsi untuk membatalkan aktivitas bantuan.
-- Mengubah status aktivitas menjadi 'batal' dengan validasi kepemilikan
-- dan status yang sesuai.
--
-- PRASYARAT:
-- - Migration 002 (activities table) sudah dijalankan
-- - Migration 005 (complete_activity, save_activity_rating) sudah dijalankan
-- - Tabel activities, posts sudah ada dengan struktur yang benar
--
-- PROTOKOL LOCK (untuk mencegah deadlock):
-- Urutan konsisten: posts → activities
-- 1. Lock post terlebih dahulu (FOR UPDATE pada posts)
-- 2. Lock activity record (FOR UPDATE pada activities)
--
-- CATATAN KEAMANAN:
-- - REVOKE EXECUTE FROM PUBLIC
-- - GRANT EXECUTE TO authenticated
-- - SET search_path = '' untuk mencegah shadowing
-- - SECURITY DEFINER untuk bypass RLS (karena activities_update_own masih aktif)
--
-- ATURAN BISNIS:
-- - Hanya pemilik postingan yang dapat membatalkan aktivitas
-- - Status yang boleh dibatalkan: 'menunggu', 'berlangsung'
-- - Status yang TIDAK boleh dibatalkan: 'selesai', 'batal'
-- - Aktivitas yang sudah selesai tidak dapat dibatalkan
-- - Aktivitas yang sudah batal tidak dapat dibatalkan lagi
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
    v_col_record RECORD;
BEGIN
    -- Tabel activities harus ada
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'activities'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.activities tidak ditemukan. Jalankan migration 002 terlebih dahulu.';
    END IF;

    -- Tabel posts harus ada
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'posts'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.posts tidak ditemukan.';
    END IF;

    -- Kolom activities.post_id (UUID NOT NULL)
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND column_name = 'post_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.post_id tidak ditemukan.';
    END IF;
    IF v_col_record.data_type != 'uuid' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.post_id harus bertipe UUID, ditemukan %.', v_col_record.data_type;
    END IF;
    IF v_col_record.is_nullable != 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.post_id harus NOT NULL.';
    END IF;

    -- Kolom activities.user_id (UUID NOT NULL)
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND column_name = 'user_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id tidak ditemukan.';
    END IF;
    IF v_col_record.data_type != 'uuid' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id harus bertipe UUID, ditemukan %.', v_col_record.data_type;
    END IF;
    IF v_col_record.is_nullable != 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id harus NOT NULL.';
    END IF;

    -- Kolom activities.status (TEXT NOT NULL)
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND column_name = 'status';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status tidak ditemukan.';
    END IF;
    IF v_col_record.data_type != 'text' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status harus bertipe TEXT, ditemukan %.', v_col_record.data_type;
    END IF;
    IF v_col_record.is_nullable != 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status harus NOT NULL.';
    END IF;

    -- Verifikasi CHECK constraint pada activities.status
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.activities'::regclass
          AND con.contype = 'c'  -- 'c' = CHECK
          AND att.attname = 'status'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: CHECK constraint pada activities.status tidak ditemukan.';
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: cancel_activity
-- =========================================================
-- Membatalkan aktivitas bantuan.
-- Validasi: user harus pemilik postingan, status harus 'menunggu' atau 'berlangsung'.
--
-- PROTOKOL LOCK: posts → activities (konsisten dengan migration 004 dan 005)
-- 1. Lock post terlebih dahulu untuk memverifikasi kepemilikan
-- 2. Lock activity record untuk mencegah race condition pada update status

CREATE OR REPLACE FUNCTION public.cancel_activity(
    p_post_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_post_author UUID;
    v_activity_status TEXT;
    v_row_count INT;
BEGIN
    -- Validasi input
    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'post_id wajib diisi.';
    END IF;

    -- Ambil ID caller dari session
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Lock post terlebih dahulu (konsisten dengan protokol posts → activities)
    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = p_post_id
    FOR UPDATE;

    IF v_post_author IS NULL THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    -- Validasi kepemilikan postingan
    IF v_post_author != v_caller_id THEN
        RAISE EXCEPTION 'Anda bukan pemilik postingan ini.';
    END IF;

    -- TAHAP 2: Lock activity record setelah post di-lock
    SELECT a.status INTO v_activity_status
    FROM public.activities a
    WHERE a.post_id = p_post_id
      AND a.user_id = v_caller_id
    FOR UPDATE;

    IF v_activity_status IS NULL THEN
        RAISE EXCEPTION 'Aktivitas tidak ditemukan untuk postingan ini.';
    END IF;

    -- Validasi status: hanya 'menunggu' dan 'berlangsung' yang boleh dibatalkan
    IF v_activity_status NOT IN ('menunggu', 'berlangsung') THEN
        IF v_activity_status = 'selesai' THEN
            RAISE EXCEPTION 'Aktivitas yang sudah selesai tidak dapat dibatalkan.';
        ELSIF v_activity_status = 'batal' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah dibatalkan sebelumnya.';
        ELSE
            RAISE EXCEPTION 'Status aktivitas saat ini (%) tidak memungkinkan untuk dibatalkan.', v_activity_status;
        END IF;
    END IF;

    -- Update status ke 'batal'
    UPDATE public.activities
    SET status = 'batal'
    WHERE post_id = p_post_id
      AND user_id = v_caller_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count != 1 THEN
        RAISE EXCEPTION 'Gagal membatalkan aktivitas. Diharapkan 1 baris, ditemukan %.', v_row_count;
    END IF;
END;
$$;

-- Keamanan: revoke dari public, grant ke authenticated
REVOKE EXECUTE ON FUNCTION public.cancel_activity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_activity(UUID) TO authenticated;

COMMIT;
