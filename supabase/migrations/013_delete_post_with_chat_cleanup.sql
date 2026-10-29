-- =============================================================================
-- Migration 013: delete_post_with_cleanup juga membersihkan percakapan + pesan
-- =============================================================================
-- MASALAH YANG DIPERBAIKI:
-- - Migration 012 menambah FK conversations.post_id → public.posts(id)
--   ON DELETE RESTRICT. Fungsi dari 009 tidak membersihkan percakapan, sehingga
--   DELETE posts di dalam RPC selalu gagal (23503) untuk post yang punya chat.
-- - Selain itu, blok prasyarat 009 menolak bila ada tabel anak ketiga yang
--   merujuk posts(id); public.conversations membuat prasyarat itu gagal.
--   Migration ini MENGGANTI FUNGSI-nya, bukan blok prasyarat 009 (009 tidak
--   diubah). Blok prasyarat 009 juga tidak toleran terhadap tabel anak ketiga,
--   jadi pada instalasi baru 009 sudah gagal SEBELUM 013 dapat berjalan.
--   Lihat "CATATAN INSTALASI BARU" di akhir file.
--
-- YANG TIDAK DIUBAH:
-- - Aturan perlindungan pengajuan (pending/accepted/status tak dikenal) dan
--   aktivitas (non-batal, batal milik pengguna lain) disalin VERBATIM dari 009
--   TAHAP 4-5. Percakapan TIDAK dijadikan alasan penolakan.
-- - SECURITY DEFINER, SET search_path = '', validasi 1 baris post terhapus.
--
-- PROTOKOL LOCK (deterministik, ORDER BY id):
-- posts -> help_applications -> activities -> conversations -> messages
-- Seluruh RPC pembuat anak (003, 004, 012) memegang lock posts lebih dulu,
-- sehingga pembuatan percakapan baru tidak dapat berlomba dengan penghapusan.
--
-- IDEMPOTEN:
-- - CREATE OR REPLACE FUNCTION pada signature yang sama (uuid).
-- - REVOKE/GRANT diulang dengan aman.
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat: tabel, FK, aturan ON DELETE, indeks
-- =========================================================
-- Pemeriksaan berbasis relasi (pg_constraint: conrelid/confrelid/confkey),
-- bukan hanya nama constraint. Bila skema remote berbeda, migrasi GAGAL.

DO $$
DECLARE
    v_fk            RECORD;
    v_fk_count      INTEGER;
    v_fk_deltype    TEXT;
    v_has_unique    BOOLEAN;
    v_has_msg_index BOOLEAN;
    v_unexpected    TEXT;
BEGIN
    -- 1a. Tabel wajib
    IF to_regclass('public.posts') IS NULL
       OR to_regclass('public.activities') IS NULL
       OR to_regclass('public.help_applications') IS NULL
       OR to_regclass('public.conversations') IS NULL
       OR to_regclass('public.messages') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: public.posts, activities, help_applications, conversations, dan messages harus ada. Jalankan schema.sql, 002, 003, dan 012 terlebih dahulu.';
    END IF;

    IF to_regprocedure('public.delete_post_with_cleanup(uuid)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.delete_post_with_cleanup(uuid) tidak ditemukan. Jalankan migration 009 terlebih dahulu.';
    END IF;

    IF to_regprocedure('auth.uid()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi auth.uid() tidak ditemukan.';
    END IF;

    -- 1b. Tepat satu FK conversations(post_id) -> posts(id) dengan RESTRICT.
    -- Kolom lokal dan kolom referensi diverifikasi lewat pg_attribute.
    SELECT COUNT(*), MIN(con.confdeltype::TEXT) INTO v_fk_count, v_fk_deltype
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.conrelid = 'public.conversations'::regclass
      AND con.confrelid = 'public.posts'::regclass
      AND con.conkey = ARRAY[
            (SELECT att.attnum FROM pg_attribute att
             WHERE att.attrelid = 'public.conversations'::regclass
               AND att.attname = 'post_id'
               AND NOT att.attisdropped)
          ]::SMALLINT[]
      AND con.confkey = ARRAY[
            (SELECT att.attnum FROM pg_attribute att
             WHERE att.attrelid = 'public.posts'::regclass
               AND att.attname = 'id'
               AND NOT att.attisdropped)
          ]::SMALLINT[];

    IF v_fk_count <> 1 THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Diharapkan tepat 1 FK conversations(post_id) -> posts(id), ditemukan %.', v_fk_count;
    END IF;

    -- confdeltype: 'r' = RESTRICT, 'a' = NO ACTION (juga memblokir penghapusan)
    IF v_fk_deltype NOT IN ('r', 'a') THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: FK conversations -> posts(id) harus RESTRICT/NO ACTION (ditemukan %).', v_fk_deltype;
    END IF;

    -- 1c. Tepat satu FK messages(conversation_id) -> conversations(id) dengan CASCADE
    SELECT COUNT(*), MIN(con.confdeltype::TEXT) INTO v_fk_count, v_fk_deltype
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.conrelid = 'public.messages'::regclass
      AND con.confrelid = 'public.conversations'::regclass
      AND con.conkey = ARRAY[
            (SELECT att.attnum FROM pg_attribute att
             WHERE att.attrelid = 'public.messages'::regclass
               AND att.attname = 'conversation_id'
               AND NOT att.attisdropped)
          ]::SMALLINT[]
      AND con.confkey = ARRAY[
            (SELECT att.attnum FROM pg_attribute att
             WHERE att.attrelid = 'public.conversations'::regclass
               AND att.attname = 'id'
               AND NOT att.attisdropped)
          ]::SMALLINT[];

    IF v_fk_count <> 1 OR v_fk_deltype <> 'c' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Diharapkan tepat 1 FK messages(conversation_id) -> conversations(id) ON DELETE CASCADE (ditemukan % dengan deltype %).', v_fk_count, v_fk_deltype;
    END IF;

    -- 1d. FK lain yang merujuk posts(id) hanya boleh dari tiga tabel anak ini.
    FOR v_fk IN
        SELECT con.conrelid::regclass AS source_table, con.conname
        FROM pg_constraint con
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.posts'::regclass
          AND con.conrelid NOT IN (
              'public.activities'::regclass,
              'public.help_applications'::regclass,
              'public.conversations'::regclass
          )
    LOOP
        v_unexpected := COALESCE(v_unexpected || ', ', '') || v_fk.source_table::TEXT || ' (' || v_fk.conname || ')';
    END LOOP;

    IF v_unexpected IS NOT NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Ditemukan FK lain yang merujuk public.posts(id): %. Fungsi ini tidak membersihkannya.', v_unexpected;
    END IF;

    -- 1e. Indeks yang dibutuhkan (unique arbiter 012 + scan per post/percakapan)
    SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class idx ON idx.oid = i.indexrelid
        WHERE i.indrelid = 'public.conversations'::regclass
          AND i.indisunique
          AND idx.relname = 'uq_conversations_post_owner_partner'
          AND i.indnkeyatts = 3
          AND (SELECT array_agg(att.attname ORDER BY ord.n)
               FROM unnest(i.indkey) WITH ORDINALITY AS ord(attnum, n)
               JOIN pg_attribute att
                 ON att.attrelid = i.indrelid AND att.attnum = ord.attnum
               WHERE ord.n <= i.indnkeyatts)::TEXT[] = ARRAY['post_id', 'owner_id', 'partner_id']
    ) INTO v_has_unique;

    IF NOT v_has_unique THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Unique index uq_conversations_post_owner_partner(post_id, owner_id, partner_id) tidak ditemukan atau kolomnya berbeda.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class idx ON idx.oid = i.indexrelid
        WHERE i.indrelid = 'public.messages'::regclass
          AND idx.relname = 'idx_messages_conversation_created'
          AND i.indnkeyatts = 3
          AND (SELECT array_agg(att.attname ORDER BY ord.n)
               FROM unnest(i.indkey) WITH ORDINALITY AS ord(attnum, n)
               JOIN pg_attribute att
                 ON att.attrelid = i.indrelid AND att.attnum = ord.attnum
               WHERE ord.n <= i.indnkeyatts)::TEXT[] = ARRAY['conversation_id', 'created_at', 'id']
    ) INTO v_has_msg_index;

    IF NOT v_has_msg_index THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Index idx_messages_conversation_created(conversation_id, created_at, id) tidak ditemukan atau kolomnya berbeda.';
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: delete_post_with_cleanup (versi 013)
-- =========================================================
-- Perubahan dari 009: tahap lock + hapus conversations/messages (TAHAP 5b dan
-- 7b), serta sanity check yang menghitung sisa conversations. Semua validasi
-- lainnya identik dengan 009.

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
    v_conversation_count BIGINT;
    v_deleted_applications BIGINT;
    v_deleted_activities BIGINT;
    v_deleted_messages BIGINT;
    v_deleted_conversations BIGINT;
    v_deleted_post BIGINT;
    v_remaining_applications BIGINT;
    v_remaining_activities BIGINT;
    v_remaining_conversations BIGINT;
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

    -- TAHAP 4: Evaluasi pengajuan (IDENTIK dengan 009).
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

    -- TAHAP 5: Evaluasi aktivitas (IDENTIK dengan 009; agregat, bukan SELECT INTO multi-baris).
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

    -- TAHAP 5b (BARU): Setelah semua validasi lolos, kunci percakapan lalu pesan
    -- (setelah posts/help_applications/activities, konsisten dengan send_message
    -- yang mengunci conversations sebelum menyentuh messages).
    PERFORM c.id
    FROM public.conversations c
    WHERE c.post_id = p_post_id
    ORDER BY c.id
    FOR UPDATE;

    PERFORM m.id
    FROM public.messages m
    WHERE m.conversation_id IN (
        SELECT c.id FROM public.conversations c WHERE c.post_id = p_post_id
    )
    ORDER BY m.id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_conversation_count
    FROM public.conversations c
    WHERE c.post_id = p_post_id;

    -- TAHAP 6: Hapus pengajuan terminal (hanya 'rejected'/'withdrawn') — IDENTIK 009.
    IF v_terminal_applications > 0 THEN
        DELETE FROM public.help_applications
        WHERE post_id = p_post_id
          AND status IN ('rejected', 'withdrawn');

        GET DIAGNOSTICS v_deleted_applications = ROW_COUNT;
    ELSE
        v_deleted_applications := 0;
    END IF;

    -- TAHAP 7: Hapus aktivitas 'batal' milik pemilik post — IDENTIK 009.
    IF v_cancelled_activities > 0 THEN
        DELETE FROM public.activities
        WHERE post_id = p_post_id
          AND user_id = v_post_author
          AND status = 'batal';

        GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
    ELSE
        v_deleted_activities := 0;
    END IF;

    -- TAHAP 7b (BARU): Hapus pesan lalu percakapan milik postingan ini saja.
    -- Pesan dihapus eksplisit (bukan hanya mengandalkan cascade) agar jumlah
    -- baris yang tersentuh dapat dihitung dan sisa baris dapat diverifikasi.
    DELETE FROM public.messages
    WHERE conversation_id IN (
        SELECT c.id FROM public.conversations c WHERE c.post_id = p_post_id
    );

    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    DELETE FROM public.conversations
    WHERE post_id = p_post_id;

    GET DIAGNOSTICS v_deleted_conversations = ROW_COUNT;

    -- Extra sanity: percakapan yang dihitung di TAHAP 5b harus semuanya terhapus.
    IF v_deleted_conversations <> v_conversation_count THEN
        RAISE EXCEPTION 'Verifikasi gagal: dihapus % percakapan, tetapi sebelumnya terhitung %. Transaksi dibatalkan.',
            v_deleted_conversations, v_conversation_count;
    END IF;

    -- TAHAP 8: Hapus postingan — IDENTIK 009. FK lain yang masih merujuk membuat
    -- statement gagal dan seluruh transaksi rollback otomatis.
    DELETE FROM public.posts
    WHERE id = p_post_id
      AND author_id = v_caller_id;

    GET DIAGNOSTICS v_deleted_post = ROW_COUNT;

    IF v_deleted_post != 1 THEN
        RAISE EXCEPTION 'Gagal menghapus postingan. Diharapkan 1 baris, ditemukan %.', v_deleted_post;
    END IF;

    -- TAHAP 9: Sanity check diperluas (009 hanya menghitung pengajuan/aktivitas).
    SELECT
        (SELECT COUNT(*) FROM public.help_applications ha WHERE ha.post_id = p_post_id),
        (SELECT COUNT(*) FROM public.activities a WHERE a.post_id = p_post_id),
        (SELECT COUNT(*) FROM public.conversations c WHERE c.post_id = p_post_id)
    INTO v_remaining_applications, v_remaining_activities, v_remaining_conversations;

    IF v_remaining_applications > 0
       OR v_remaining_activities > 0
       OR v_remaining_conversations > 0 THEN
        RAISE EXCEPTION 'Verifikasi gagal: masih ditemukan % pengajuan, % aktivitas, dan % percakapan yang merujuk postingan setelah penghapusan. Transaksi dibatalkan.',
            v_remaining_applications, v_remaining_activities, v_remaining_conversations;
    END IF;

    RAISE NOTICE 'delete_post_with_cleanup: post % dihapus (% pengajuan terminal, % aktivitas batal, % percakapan / % pesan dibersihkan).',
        p_post_id, v_deleted_applications, v_deleted_activities,
        v_deleted_conversations, v_deleted_messages;
END;
$$;

-- =========================================================
-- 3. Hak eksekusi
-- =========================================================
-- Supabase memberi GRANT EXECUTE langsung ke role anon (lihat catatan 010/011),
-- jadi anon dicabut eksplisit di samping PUBLIC. Signature harus persis sama
-- (uuid) dengan fungsi 009 agar CREATE OR REPLACE menggantikan fungsi yang ada.

REVOKE EXECUTE ON FUNCTION public.delete_post_with_cleanup(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_post_with_cleanup(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_post_with_cleanup(UUID) TO authenticated;

-- =========================================================
-- 4. Verifikasi pasca (di dalam transaksi yang sama)
-- =========================================================

DO $$
DECLARE
    v_secdef   BOOLEAN;
    v_proconfig TEXT[];
BEGIN
    SELECT p.prosecdef, p.proconfig
    INTO v_secdef, v_proconfig
    FROM pg_proc p
    WHERE p.oid = 'public.delete_post_with_cleanup(uuid)'::regprocedure;

    IF v_secdef IS NOT TRUE THEN
        RAISE EXCEPTION 'VERIFIKASI GAGAL: delete_post_with_cleanup bukan SECURITY DEFINER.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(v_proconfig, ARRAY[]::TEXT[])) AS cfg
        WHERE cfg LIKE 'search\_path=%'
    ) THEN
        RAISE EXCEPTION 'VERIFIKASI GAGAL: search_path fungsi tidak diset secara eksplisit.';
    END IF;

    IF has_function_privilege('anon', 'public.delete_post_with_cleanup(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'VERIFIKASI GAGAL: role anon masih memiliki EXECUTE.';
    END IF;

    IF NOT has_function_privilege('authenticated', 'public.delete_post_with_cleanup(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'VERIFIKASI GAGAL: role authenticated tidak memiliki EXECUTE.';
    END IF;
END
$$;

COMMIT;

-- =============================================================================
-- CATATAN INSTALASI BARU (tidak diperbaiki oleh 013)
-- =============================================================================
-- Blok prasyarat migration 009 menolak bila ada FK dari tabel selain
-- activities/help_applications ke posts(id). Sejak 012 ada public.conversations,
-- maka pada database BARU 009 akan GAGAL di prasyarat dan fungsi ini tidak
-- pernah dibuat — sehingga 013 (yang mensyaratkan fungsi 009 sudah ada) juga
-- tidak dapat berjalan. Urutan migration 009 dan 012 TIDAK diubah diam-diam.
-- Opsi yang perlu keputusan (belum diterapkan):
--   1. Jalankan 009 sebelum 012 pada database baru (urutan: 001-011, 009, 012, 013
--      bila 013 berjalan setelah 012).
--   2. Migration 014 yang menggantikan blok prasyarat 009.
--
-- VERIFIKASI READ-ONLY (jalankan manual; tidak dijalankan migrasi ini):
--   SELECT con.conname, con.conrelid::regclass AS source_table,
--          CASE con.confdeltype WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
--               WHEN 'a' THEN 'NO ACTION' END AS on_delete
--   FROM pg_constraint con
--   WHERE con.contype = 'f' AND con.confrelid = 'public.posts'::regclass
--   ORDER BY source_table;
--
--   SELECT proname, prosecdef, proconfig, proacl
--   FROM pg_proc WHERE oid = 'public.delete_post_with_cleanup(uuid)'::regprocedure;
-- =============================================================================