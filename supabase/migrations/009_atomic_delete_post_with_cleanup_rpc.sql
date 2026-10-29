-- =============================================================================
-- Migration 009: RPC delete_post_with_cleanup (atomik)
-- =============================================================================
-- Menghapus postingan milik pemanggil bersama SEMUA data yang boleh dibersihkan
-- (aktivitas 'batal' milik pemilik, pengajuan berstatus terminal) di dalam SATU
-- transaksi PostgreSQL.
--
-- ALASAN:
-- - Alur lama (purge + DELETE posts via PostgREST) = dua request terpisah sehingga
--   tidak atomik. Satu pemanggilan fungsi PostgreSQL = satu transaksi.
--
-- STATUS YANG DIENFORCE:
-- - activities.status: CHECK (status IN ('menunggu','berlangsung','selesai','batal'))
--   → migration 002:13-14. Hanya 'batal' milik pemilik post yang boleh dihapus.
-- - help_applications.status: CHECK (status IN ('pending','accepted','rejected','withdrawn'))
--   → migration 003:141-142.
--     * 'pending'  → menghalangi (penghitung sendiri, v_pending_count)
--     * 'accepted' → menghalangi (penghitung sendiri, v_accepted_count)
--     * 'rejected'/'withdrawn' → status terminal, boleh dibersihkan
--     * NULL / nilai tak dikenal → menghalangi (fail-safe)
-- Blok prasyarat memverifikasi bahwa CHECK constraint benar-benar membatasi status
-- ke nilai-nilai tersebut. Jika skema remote berbeda, migrasi GAGAL, tidak lanjut
-- dengan asumsi. Fungsi juga tetap fail-safe terhadap status tak dikenal saat runtime,
-- sehingga perubahan skema setelah migrasi tidak menyebabkan penghapusan diam-diam.
--
-- BATASAN & JAMINAN KEAMANAN:
-- - SECURITY DEFINER + SET search_path = '' + semua objek schema-qualified.
-- - Validasi auth.uid(), kepemilikan postingan, dan seluruh baris anak.
-- - Aktivitas milik user lain tidak pernah dihapus; bila ada 'batal' milik user lain,
--   operasi dihentikan (fail-safe) dan seluruh transaksi rollback.
-- - Hanya baris help_applications 'rejected'/'withdrawn' yang dihapus; pelamar tidak
--   dapat menarik pengajuan yang sudah 'rejected', sehingga hasilnya setara dengan
--   pelamar menarik pengajuannya sendiri sebelum post dihapus.
--
-- PROTOKOL LOCK: posts → help_applications (ORDER BY id) → activities (ORDER BY id).
-- Ini superset berurutan dari protokol 004 (posts → help_applications → activities
-- → pending lain ORDER BY id) dan 005/006 (posts → activities).
--
-- PEMERIKSAAN FK (status remote yang dilaporkan):
-- - activities_post_id_restrict_fkey        → RESTRICT
-- - help_applications_post_id_restrict_fkey → RESTRICT
-- Kedua tabel anak itu ditangani fungsi ini sebelum DELETE posts. Blok prasyarat
-- memeriksa bahwa setiap FK yang merujuk public.posts(id) berasal dari salah satu
-- dua tabel tersebut; bila ada tabel anak ketiga, migrasi GAGAL (bukan menebak).
--
-- CATATAN: migrasi ini TIDAK mengubah constraint, FK, status, atau policy apa pun.

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
    v_col RECORD;
BEGIN
    IF to_regclass('public.posts') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.posts tidak ditemukan.';
    END IF;

    IF to_regclass('public.activities') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.activities tidak ditemukan.';
    END IF;

    IF to_regclass('public.help_applications') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.help_applications tidak ditemukan. Jalankan migration 003 terlebih dahulu.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom posts.author_id harus UUID NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'post_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.post_id harus UUID NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'user_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id harus UUID NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'status';

    IF v_col.data_type IS DISTINCT FROM 'text' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status harus TEXT NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'help_applications' AND column_name = 'post_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom help_applications.post_id harus UUID NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'help_applications' AND column_name = 'status';

    IF v_col.data_type IS DISTINCT FROM 'text' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom help_applications.status harus TEXT NOT NULL.';
    END IF;

    -- CHECK constraint status harus ada (sumber kebenaran nilai status yang diizinkan)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att
            ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.help_applications'::regclass
          AND con.contype = 'c'
          AND att.attname = 'status'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: CHECK constraint pada help_applications.status tidak ditemukan.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att
            ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.activities'::regclass
          AND con.contype = 'c'
          AND att.attname = 'status'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: CHECK constraint pada activities.status tidak ditemukan.';
    END IF;

    -- Nilai status harus sesuai. Dibandingkan dari definisi constraint aktual
    -- (bukan dari nama atau migrasi). Bila remote berbeda, migrasi berhenti.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att
            ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.help_applications'::regclass
          AND con.contype = 'c'
          AND att.attname = 'status'
          AND pg_get_constraintdef(con.oid) LIKE '%withdrawn%'
          AND pg_get_constraintdef(con.oid) LIKE '%rejected%'
          AND pg_get_constraintdef(con.oid) LIKE '%accepted%'
          AND pg_get_constraintdef(con.oid) LIKE '%pending%'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Nilai status pada help_applications tidak sesuai (harus memuat pending, accepted, rejected, withdrawn).';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        INNER JOIN pg_attribute att
            ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.activities'::regclass
          AND con.contype = 'c'
          AND att.attname = 'status'
          AND pg_get_constraintdef(con.oid) LIKE '%menunggu%'
          AND pg_get_constraintdef(con.oid) LIKE '%berlangsung%'
          AND pg_get_constraintdef(con.oid) LIKE '%selesai%'
          AND pg_get_constraintdef(con.oid) LIKE '%batal%'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Nilai status pada activities tidak sesuai (harus memuat menunggu, berlangsung, selesai, batal).';
    END IF;

    -- Tidak boleh ada tabel anak ketiga yang merujuk public.posts(id). Fungsi hanya
    -- membersihkan help_applications dan activities; tabel lain akan membuat
    -- DELETE posts gagal dan rollback (aman), tetapi operator harus tahu sebelum
    -- migrasi dijalankan agar tidak mengira fungsi ini menangani semuanya.
    IF EXISTS (
        SELECT 1
        FROM pg_constraint con
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.posts'::regclass
          AND con.conrelid NOT IN ('public.activities'::regclass, 'public.help_applications'::regclass)
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Ditemukan FK lain yang merujuk public.posts(id) selain activities dan help_applications. Tinjau FK tersebut sebelum menjalankan migrasi ini.';
    END IF;

    -- Fungsi auth.uid() harus tersedia untuk validasi kepemilikan.
    IF to_regprocedure('auth.uid()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi auth.uid() tidak ditemukan.';
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: delete_post_with_cleanup
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_post_with_cleanup(
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
    v_post_exists BOOLEAN := FALSE;
    v_pending_count BIGINT;
    v_accepted_count BIGINT;
    v_terminal_applications BIGINT;
    v_unknown_applications BIGINT;
    v_blocking_activities BIGINT;
    v_cancelled_activities BIGINT;
    v_other_user_batal BIGINT;
    v_deleted_applications BIGINT;
    v_deleted_activities BIGINT;
    v_deleted_post BIGINT;
    v_remaining_applications BIGINT;
    v_remaining_activities BIGINT;
BEGIN
    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'post_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Lock postingan + verifikasi kepemilikan (langkah pertama semua RPC).
    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = p_post_id
    FOR UPDATE;

    -- FOUND disalin segera: variabel global PL/pgSQL ini dapat ditimpa oleh pemanggilan
    -- fungsi trigger sebelum dibaca.
    v_post_exists := FOUND;

    IF NOT v_post_exists THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    IF v_post_author IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'Anda bukan pemilik postingan ini.';
    END IF;

    -- TAHAP 2: Lock pengajuan (urutan protokol 004: posts → help_applications → activities).
    PERFORM ha.id
    FROM public.help_applications ha
    WHERE ha.post_id = p_post_id
    ORDER BY ha.id
    FOR UPDATE;

    -- TAHAP 3: Lock aktivitas.
    PERFORM a.id
    FROM public.activities a
    WHERE a.post_id = p_post_id
    ORDER BY a.id
    FOR UPDATE;

    -- TAHAP 4: Evaluasi pengajuan.
    -- Aktif ('pending', 'accepted') menghalangi; terminal ('rejected', 'withdrawn')
    -- boleh dibersihkan; nilai lain (tidak mungkin menurut CHECK) diperlakukan
    -- sebagai penghalang (fail-safe).
    SELECT
        COUNT(*) FILTER (WHERE ha.status = 'pending'),
        COUNT(*) FILTER (WHERE ha.status = 'accepted'),
        COUNT(*) FILTER (WHERE ha.status IN ('rejected', 'withdrawn')),
        COUNT(*) FILTER (WHERE ha.status IS NULL
                            OR ha.status NOT IN ('pending', 'accepted', 'rejected', 'withdrawn'))
    INTO v_pending_count, v_accepted_count, v_terminal_applications, v_unknown_applications
    FROM public.help_applications ha
    WHERE ha.post_id = p_post_id;

    IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'Postingan ini tidak dapat dihapus karena masih memiliki pengajuan bantuan yang menunggu keputusan. Tolak pengajuan tersebut terlebih dahulu.';
    END IF;

    IF v_accepted_count > 0 THEN
        RAISE EXCEPTION 'Postingan ini tidak dapat dihapus karena sudah memiliki pengajuan yang diterima. Selesaikan atau batalkan aktivitas terlebih dahulu.';
    END IF;

    IF v_unknown_applications > 0 THEN
        RAISE EXCEPTION 'Penghapusan dihentikan: ditemukan pengajuan bantuan dengan status yang tidak dikenali. Tindakan manual diperlukan.';
    END IF;

    -- TAHAP 5: Evaluasi aktivitas (agregat, bukan SELECT INTO multi-baris).
    SELECT
        COUNT(*) FILTER (WHERE a.status IS DISTINCT FROM 'batal'),
        COUNT(*) FILTER (WHERE a.status = 'batal' AND a.user_id = v_post_author),
        COUNT(*) FILTER (WHERE a.status = 'batal' AND a.user_id IS DISTINCT FROM v_post_author)
    INTO v_blocking_activities, v_cancelled_activities, v_other_user_batal
    FROM public.activities a
    WHERE a.post_id = p_post_id;

    IF v_blocking_activities > 0 THEN
        RAISE EXCEPTION 'Postingan ini tidak dapat dihapus karena memiliki riwayat aktivitas. Batalkan atau selesaikan semua aktivitas terlebih dahulu sebelum menghapus postingan.';
    END IF;

    IF v_other_user_batal > 0 THEN
        RAISE EXCEPTION 'Penghapusan dihentikan: ditemukan aktivitas berstatus batal milik pengguna lain pada postingan ini. Tindakan manual diperlukan.';
    END IF;

    -- TAHAP 6: Hapus pengajuan terminal (hanya 'rejected'/'withdrawn').
    IF v_terminal_applications > 0 THEN
        DELETE FROM public.help_applications
        WHERE post_id = p_post_id
          AND status IN ('rejected', 'withdrawn');

        GET DIAGNOSTICS v_deleted_applications = ROW_COUNT;
    ELSE
        v_deleted_applications := 0;
    END IF;

    -- TAHAP 7: Hapus aktivitas 'batal' milik pemilik post.
    IF v_cancelled_activities > 0 THEN
        DELETE FROM public.activities
        WHERE post_id = p_post_id
          AND user_id = v_post_author
          AND status = 'batal';

        GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
    ELSE
        v_deleted_activities := 0;
    END IF;

    -- TAHAP 8: Hapus postingan. Bila tabel lain masih merujuk post ini dengan FK
    -- RESTRICT, statement gagal dan seluruh transaksi rollback otomatis.
    DELETE FROM public.posts
    WHERE id = p_post_id
      AND author_id = v_caller_id;

    GET DIAGNOSTICS v_deleted_post = ROW_COUNT;

    IF v_deleted_post != 1 THEN
        RAISE EXCEPTION 'Gagal menghapus postingan. Diharapkan 1 baris, ditemukan %.', v_deleted_post;
    END IF;

    -- TAHAP 9: Sanity check. Tidak boleh tersisa baris anak apa pun; jika ada
    -- (di luar ekspektasi), rollback seluruh transaksi.
    SELECT
        (SELECT COUNT(*) FROM public.help_applications ha WHERE ha.post_id = p_post_id),
        (SELECT COUNT(*) FROM public.activities a WHERE a.post_id = p_post_id)
    INTO v_remaining_applications, v_remaining_activities;

    IF v_remaining_applications > 0 OR v_remaining_activities > 0 THEN
        RAISE EXCEPTION 'Verifikasi gagal: masih ditemukan % pengajuan dan % aktivitas yang merujuk postingan setelah penghapusan. Transaksi dibatalkan.',
            v_remaining_applications, v_remaining_activities;
    END IF;

    RAISE NOTICE 'delete_post_with_cleanup: post % dihapus (% pengajuan terminal, % aktivitas batal dibersihkan).',
        p_post_id, v_deleted_applications, v_deleted_activities;
END;
$$;

-- Keamanan: cabut dari PUBLIC, hanya role authenticated yang boleh memanggil
REVOKE EXECUTE ON FUNCTION public.delete_post_with_cleanup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_post_with_cleanup(UUID) TO authenticated;

COMMIT;

-- =============================================================================
-- DOKUMENTASI & VERIFIKASI READ-ONLY (jalankan manual; tidak dijalankan migrasi ini)
-- =============================================================================
--
-- 1. Nilai status yang benar-benar diizinkan (jangan diasumsikan):
--
--    SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
--    FROM pg_constraint con
--    WHERE con.contype = 'c'
--      AND con.conrelid IN ('public.activities'::regclass, 'public.help_applications'::regclass)
--    ORDER BY con.conname;
--
-- 2. SEMUA FK yang merujuk public.posts(id) — memastikan tidak ada anak yang
--    luput ditangani fungsi ini:
--
--    SELECT con.conname,
--           con.conrelid::regclass AS source_table,
--           CASE con.confdeltype
--               WHEN 'a' THEN 'NO ACTION'
--               WHEN 'r' THEN 'RESTRICT'
--               WHEN 'c' THEN 'CASCADE'
--               WHEN 'n' THEN 'SET NULL'
--               WHEN 'd' THEN 'SET DEFAULT'
--           END AS on_delete
--    FROM pg_constraint con
--    WHERE con.contype = 'f'
--      AND con.confrelid = 'public.posts'::regclass
--    ORDER BY source_table, con.conname;
--
-- 3. Owner + search_path fungsi (owner HARUS bisa write ke ketiga tabel, dan
--    prosecdef harus true):
--
--    SELECT proname, proowner::regrole AS owner, prosecdef, proconfig
--    FROM pg_proc
--    WHERE pronamespace = 'public'::regnamespace
--      AND proname = 'delete_post_with_cleanup';
--
-- 3b. Bukti owner memiliki hak DELETE (pengganti RLS untuk SECURITY DEFINER):
--
--    SELECT r.rolname,
--           has_table_privilege(r.oid, 'public.posts', 'DELETE')             AS can_delete_posts,
--           has_table_privilege(r.oid, 'public.activities', 'DELETE')        AS can_delete_activities,
--           has_table_privilege(r.oid, 'public.help_applications', 'DELETE') AS can_delete_applications
--    FROM pg_roles r
--    WHERE r.oid = (SELECT proowner FROM pg_proc
--                   WHERE oid = 'public.delete_post_with_cleanup(uuid)'::regprocedure);
--
-- 4. Hak eksekusi (authenticated = true, anon = false):
--
--    SELECT has_function_privilege('authenticated', 'public.delete_post_with_cleanup(uuid)', 'EXECUTE') AS authenticated_ok,
--           has_function_privilege('anon',          'public.delete_post_with_cleanup(uuid)', 'EXECUTE') AS anon_ok;
--
-- =============================================================================