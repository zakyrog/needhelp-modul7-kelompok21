-- =============================================================================
-- Migration 004: RPC accept/reject/withdraw help_application
-- =============================================================================
-- Fungsi untuk mengelola siklus hidup pengajuan bantuan:
-- - accept_help_application: menerima pengajuan, mengaktifkan aktivitas dengan partner_id
-- - reject_help_application: menolak pengajuan
-- - withdraw_help_application: menarik kembali pengajuan oleh pelamar
--
-- PRASYARAT:
-- - Migration 003 (help_applications table) sudah dijalankan
-- - Tabel activities memiliki constraint uq_activities_user_post
-- - Kolom activities.partner_id tersedia
--
-- PROTOKOL LOCK (untuk mencegah deadlock):
-- Urutan konsisten: posts → help_applications → activities
-- 1. Lock post terlebih dahulu (FOR UPDATE pada posts)
-- 2. Lock application target (FOR UPDATE pada help_applications)
-- 3. Lock activity record jika ada (FOR UPDATE pada activities)
-- 4. Lock pending applications lain untuk auto-reject (ORDER BY id)
--
-- CATATAN: Urutan ini konsisten dengan migration 005 (complete_activity, save_activity_rating)
-- yang juga mengikuti pola posts → activities.
--
-- CATATAN KEAMANAN:
-- - REVOKE EXECUTE FROM PUBLIC pada semua fungsi
-- - GRANT EXECUTE TO authenticated
-- - SET search_path = '' untuk mencegah shadowing
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
    v_col_record RECORD;
BEGIN
    -- Tabel help_applications harus ada
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'help_applications'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.help_applications tidak ditemukan. Jalankan migration 003 terlebih dahulu.';
    END IF;

    -- Tabel activities harus ada
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'activities'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.activities tidak ditemukan. Jalankan migration 002 terlebih dahulu.';
    END IF;

    -- Kolom activities.partner_id (UUID, nullable karena default NULL di migration 002)
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND column_name = 'partner_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.partner_id tidak ditemukan.';
    END IF;
    IF v_col_record.data_type != 'uuid' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.partner_id harus bertipe UUID, ditemukan %.', v_col_record.data_type;
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

    -- Constraint uq_activities_user_post harus ada dan merupakan UNIQUE constraint
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_activities_user_post'
          AND conrelid = 'public.activities'::regclass
          AND contype = 'u'  -- 'u' = UNIQUE
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Constraint uq_activities_user_post (UNIQUE) tidak ditemukan pada tabel activities. Jalankan migration 002 terlebih dahulu.';
    END IF;

    -- Verifikasi bahwa constraint uq_activities_user_post mencakup kolom user_id dan post_id
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conname = 'uq_activities_user_post'
          AND con.conrelid = 'public.activities'::regclass
          AND att.attname IN ('user_id', 'post_id')
        GROUP BY con.conname
        HAVING COUNT(DISTINCT att.attname) = 2
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Constraint uq_activities_user_post harus mencakup kolom user_id dan post_id.';
    END IF;

    -- Verifikasi partial unique index pada help_applications
    -- Index ini menjamin satu user hanya boleh punya 1 pengajuan pending/accepted per post
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'help_applications'
          AND indexname = 'uq_help_applications_pending_accepted'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Partial unique index uq_help_applications_pending_accepted tidak ditemukan pada help_applications. Jalankan migration 003 terlebih dahulu.';
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: accept_help_application
-- =========================================================
-- Menerima pengajuan bantuan. Mengubah status aplikasi menjadi 'accepted',
-- menolak semua pengajuan pending lain, dan mengaktifkan aktivitas dengan partner_id.

CREATE OR REPLACE FUNCTION public.accept_help_application(
    p_application_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_post_id UUID;
    v_post_author UUID;
    v_applicant_id UUID;
    v_app_status TEXT;
    v_activity_exists BOOLEAN;
    v_activity_status TEXT;
    v_row_count INT;
    v_verify_count INT;
    v_verify_status TEXT;
    v_verify_partner UUID;
BEGIN
    -- Validasi input
    IF p_application_id IS NULL THEN
        RAISE EXCEPTION 'application_id wajib diisi.';
    END IF;

    -- Ambil ID caller dari session
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Cari post_id dari aplikasi, lalu lock post
    SELECT ha.post_id INTO v_post_id
    FROM public.help_applications ha
    WHERE ha.id = p_application_id;

    IF v_post_id IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    -- Lock post untuk mencegah race condition
    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = v_post_id
    FOR UPDATE;

    IF v_post_author IS NULL THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    -- Hanya pemilik postingan yang bisa menerima pengajuan
    IF v_post_author != v_caller_id THEN
        RAISE EXCEPTION 'Hanya pemilik postingan yang dapat menerima pengajuan.';
    END IF;

    -- TAHAP 2: Lock aplikasi target
    SELECT applicant_id, status
    INTO v_applicant_id, v_app_status
    FROM public.help_applications
    WHERE id = p_application_id
      AND post_id = v_post_id
    FOR UPDATE;

    IF v_applicant_id IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau tidak terkait dengan postingan ini.';
    END IF;

    -- Validasi status aplikasi
    IF v_app_status != 'pending' THEN
        IF v_app_status = 'accepted' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah diterima sebelumnya.';
        ELSIF v_app_status = 'rejected' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditolak.';
        ELSIF v_app_status = 'withdrawn' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditarik oleh pelamar.';
        ELSE
            RAISE EXCEPTION 'Status pengajuan saat ini (%) tidak memungkinkan untuk diterima.', v_app_status;
        END IF;
    END IF;

    -- TAHAP 3: Lock dan cek kebijakan aktivitas berdasarkan status
    -- Lock activity untuk mencegah race condition dengan complete_activity atau submit_help_application
    SELECT a.status INTO v_activity_status
    FROM public.activities a
    WHERE a.post_id = v_post_id
      AND a.user_id = v_post_author
    FOR UPDATE;

    v_activity_exists := FOUND;

    IF v_activity_exists THEN
        IF v_activity_status = 'batal' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah dibatalkan. Buat postingan baru jika masih membutuhkan bantuan.';
        ELSIF v_activity_status = 'berlangsung' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah berlangsung. Tidak dapat menerima pengajuan baru.';
        ELSIF v_activity_status = 'selesai' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah selesai. Tidak dapat menerima pengajuan baru.';
        END IF;
        -- Status 'menunggu': OK, akan di-update ke 'berlangsung'
    END IF;
    -- Jika tidak ada activity record: OK, akan di-insert baru

    -- TAHAP 4: Lock semua pengajuan pending lain untuk auto-reject
    -- ORDER BY id untuk konsistensi lock ordering (mencegah deadlock)
    PERFORM id
    FROM public.help_applications
    WHERE post_id = v_post_id
      AND status = 'pending'
      AND id != p_application_id
    ORDER BY id
    FOR UPDATE;

    -- TAHAP 5: Update status aplikasi target menjadi 'accepted'
    UPDATE public.help_applications
    SET status = 'accepted'
    WHERE id = p_application_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count != 1 THEN
        RAISE EXCEPTION 'Gagal mengubah status pengajuan. Diharapkan 1 baris, ditemukan %.', v_row_count;
    END IF;

    -- TAHAP 6: Auto-reject semua pengajuan pending lain
    UPDATE public.help_applications
    SET status = 'rejected'
    WHERE post_id = v_post_id
      AND status = 'pending'
      AND id != p_application_id;

    -- TAHAP 7: Aktifkan/update aktivitas dengan partner_id
    IF v_activity_exists THEN
        -- Update existing activity
        UPDATE public.activities
        SET status = 'berlangsung',
            partner_id = v_applicant_id
        WHERE post_id = v_post_id
          AND user_id = v_post_author;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count != 1 THEN
            RAISE EXCEPTION 'Gagal mengupdate aktivitas. Diharapkan 1 baris, ditemukan %.', v_row_count;
        END IF;
    ELSE
        -- Insert new activity
        INSERT INTO public.activities (
            post_id,
            user_id,
            status,
            partner_id,
            note
        ) VALUES (
            v_post_id,
            v_post_author,
            'berlangsung',
            v_applicant_id,
            'Aktivitas dimulai setelah pengajuan diterima.'
        );

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count != 1 THEN
            RAISE EXCEPTION 'Gagal membuat aktivitas baru. Diharapkan 1 baris, ditemukan %.', v_row_count;
        END IF;
    END IF;

    -- TAHAP 8: Set partner_name dari profiles
    UPDATE public.activities a
    SET partner_name = COALESCE(p.name, '')
    FROM public.profiles p
    WHERE a.post_id = v_post_id
      AND a.user_id = v_post_author
      AND p.id = v_applicant_id;

    -- TAHAP 9: Verifikasi akhir — pastikan state konsisten
    -- Hitung dulu, baru ambil detail jika tepat 1
    SELECT COUNT(*)
    INTO v_verify_count
    FROM public.activities a
    WHERE a.post_id = v_post_id
      AND a.user_id = v_post_author;

    IF v_verify_count IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'Verifikasi gagal: ditemukan % aktivitas untuk postingan ini, diharapkan tepat 1.', v_verify_count;
    END IF;

    -- Tepat 1 baris, aman untuk ambil detail
    SELECT a.status, a.partner_id
    INTO v_verify_status, v_verify_partner
    FROM public.activities a
    WHERE a.post_id = v_post_id
      AND a.user_id = v_post_author;

    IF v_verify_status != 'berlangsung' THEN
        RAISE EXCEPTION 'Verifikasi gagal: status aktivitas adalah "%", diharapkan "berlangsung".', v_verify_status;
    END IF;

    IF v_verify_partner IS DISTINCT FROM v_applicant_id THEN
        RAISE EXCEPTION 'Verifikasi gagal: partner_id (%) tidak sesuai dengan pelamar yang disetujui (%).', v_verify_partner, v_applicant_id;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_help_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_help_application(UUID) TO authenticated;

-- =========================================================
-- 3. RPC: reject_help_application
-- =========================================================
-- Menolak pengajuan bantuan. Hanya pemilik postingan yang bisa menolak.

CREATE OR REPLACE FUNCTION public.reject_help_application(
    p_application_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_post_id UUID;
    v_post_author UUID;
    v_app_status TEXT;
    v_row_count INT;
BEGIN
    IF p_application_id IS NULL THEN
        RAISE EXCEPTION 'application_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Cari post_id, lalu lock post
    SELECT ha.post_id INTO v_post_id
    FROM public.help_applications ha
    WHERE ha.id = p_application_id;

    IF v_post_id IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = v_post_id
    FOR UPDATE;

    IF v_post_author IS NULL THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    IF v_post_author != v_caller_id THEN
        RAISE EXCEPTION 'Hanya pemilik postingan yang dapat menolak pengajuan.';
    END IF;

    -- TAHAP 2: Lock aplikasi target
    SELECT status INTO v_app_status
    FROM public.help_applications
    WHERE id = p_application_id
      AND post_id = v_post_id
    FOR UPDATE;

    IF v_app_status IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau tidak terkait dengan postingan ini.';
    END IF;

    IF v_app_status != 'pending' THEN
        IF v_app_status = 'rejected' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditolak sebelumnya.';
        ELSIF v_app_status = 'accepted' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah diterima. Tidak dapat ditolak.';
        ELSIF v_app_status = 'withdrawn' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditarik oleh pelamar.';
        ELSE
            RAISE EXCEPTION 'Status pengajuan saat ini (%) tidak memungkinkan untuk ditolak.', v_app_status;
        END IF;
    END IF;

    -- TAHAP 3: Update status
    UPDATE public.help_applications
    SET status = 'rejected'
    WHERE id = p_application_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count != 1 THEN
        RAISE EXCEPTION 'Gagal menolak pengajuan. Diharapkan 1 baris, ditemukan %.', v_row_count;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_help_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_help_application(UUID) TO authenticated;

-- =========================================================
-- 4. RPC: withdraw_help_application
-- =========================================================
-- Menarik kembali pengajuan oleh pelamar sendiri.

CREATE OR REPLACE FUNCTION public.withdraw_help_application(
    p_application_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_post_id UUID;
    v_applicant_id UUID;
    v_app_status TEXT;
    v_row_count INT;
BEGIN
    IF p_application_id IS NULL THEN
        RAISE EXCEPTION 'application_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Cari post_id, lalu lock post (untuk konsistensi protokol lock)
    SELECT ha.post_id, ha.applicant_id INTO v_post_id, v_applicant_id
    FROM public.help_applications ha
    WHERE ha.id = p_application_id;

    IF v_post_id IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    -- Hanya pelamar sendiri yang bisa menarik
    IF v_applicant_id != v_caller_id THEN
        RAISE EXCEPTION 'Hanya pelamar yang dapat menarik pengajuannya sendiri.';
    END IF;

    -- Lock post untuk konsistensi
    PERFORM id
    FROM public.posts
    WHERE id = v_post_id
    FOR UPDATE;

    -- TAHAP 2: Lock aplikasi target
    SELECT status INTO v_app_status
    FROM public.help_applications
    WHERE id = p_application_id
      AND applicant_id = v_caller_id
    FOR UPDATE;

    IF v_app_status IS NULL THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    IF v_app_status != 'pending' THEN
        IF v_app_status = 'withdrawn' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditarik sebelumnya.';
        ELSIF v_app_status = 'accepted' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah diterima. Tidak dapat ditarik.';
        ELSIF v_app_status = 'rejected' THEN
            RAISE EXCEPTION 'Pengajuan ini sudah ditolak. Tidak dapat ditarik.';
        ELSE
            RAISE EXCEPTION 'Status pengajuan saat ini (%) tidak memungkinkan untuk ditarik.', v_app_status;
        END IF;
    END IF;

    -- TAHAP 3: Update status
    UPDATE public.help_applications
    SET status = 'withdrawn'
    WHERE id = p_application_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count != 1 THEN
        RAISE EXCEPTION 'Gagal menarik pengajuan. Diharapkan 1 baris, ditemukan %.', v_row_count;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.withdraw_help_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_help_application(UUID) TO authenticated;

COMMIT;
