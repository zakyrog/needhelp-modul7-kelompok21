-- =============================================================================
-- Migration 010: Pengajuan hanya untuk postingan aktif dan bukan milik sendiri
-- =============================================================================
-- Menulis ulang public.submit_help_application dengan signature yang SAMA
-- (UUID, TEXT, TEXT, TEXT, TEXT), sehingga pemanggilan dari frontend tidak berubah.
--
-- MASALAH YANG DIPERBAIKI:
-- - Versi 003 hanya menolak aktivitas 'berlangsung'/'selesai'/'batal'. Post dengan
--   aktivitas 'menunggu' tetap bisa menerima pengajuan baru.
-- - Versi 003 memakai `SELECT ... INTO ... FOR UPDATE` untuk aktivitas. Bila
--   ditemukan lebih dari satu baris, PostgreSQL melempar P0003 dan fungsi gagal
--   dengan error tak jelas. uq_activities_user_post menjamin satu baris per
--   (user_id, post_id); versi ini tetap aman bila constraint tersebut berubah.
-- - Kepemilikan postingan hanya divalidasi lewat trigger activities. Versi ini
--   memvalidasi langsung di RPC supaya permintaan langsung ke Supabase tidak
--   bisa melewati aturan UI.
--
-- ATURAN STATUS (sumber: CHECK constraint migration 002):
--   activities.status IN ('menunggu','berlangsung','selesai','batal')
--   * tanpa record          -> pengajuan DIIZINKAN
--   * 'menunggu'            -> pengajuan DIIZINKAN
--   * 'berlangsung'         -> DITOLAK
--   * 'selesai'             -> DITOLAK
--   * 'batal'               -> DITOLAK
--   * status tak dikenal    -> DITOLAK (fail-safe)
--
-- KOMPATIBILITAS DENGAN 003 (semua perilaku berikut PERTAHANAN, tidak dihapus):
-- - Signature dan parameter default identik (UUID, TEXT, TEXT, TEXT, TEXT) -> RETURN UUID,
--   sehingga GRANT lama pada signature yang sama tetap berlaku dan frontend tidak berubah.
-- - Lock post lalu aktivitas pemilik post (post_id, user_id = author_id), sama seperti 003.
-- - Penolakan post sendiri: 003 sudah melakukannya (pemeriksaan author_id); tetap ada.
-- - Pesan error batal/selesai/berlangsung sama persis dengan 003.
-- - Cek "sudah ada pengajuan accepted" dan cek duplikat pelamar (pending/accepted) tetap.
-- - Insert selalu berstatus 'pending' dan mengembalikan id baru.
--
-- PROTOKOL LOCK: posts (FOR UPDATE) -> activities (FOR UPDATE). Urutan ini konsisten
-- dengan accept_help_application (004), reject/withdraw (004), complete_activity &
-- save_activity_rating (005), cancel_activity (006), dan delete_post_with_cleanup (009),
-- yang semuanya mengunci posts lebih dulu. Insert ke help_applications oleh fungsi ini
-- tidak membuat urutan terbalik terhadap lock tersebut.
--
-- DEADLOCK YANG MASIH MUNGKIN (tidak dapat dihilangkan di level fungsi):
-- - Dua submit untuk berbeda post saling menunggu saat menulis help_applications tidak
--   terjadi (baris baru, tanpa lock sebelumnya).
-- - accept_help_application membaca post_id dari help_applications SEBELUM mengunci
--   posts. Bila delete_post_with_cleanup menghapus post di antara keduanya, lock post
--   di 004 akan gagal dengan "Postingan tidak ditemukan" (error transien, data tetap
--   konsisten). Ini keterbatasan 004 yang tidak diubah oleh migrasi ini.
-- - PostgreSQL bisa mendeteksi 40P01 pada kombinasi lock yang sangat jarang; client
--   menerima error dan dapat mencoba lagi tanpa efek samping (transaksi rollback penuh).
--
-- DUPLIKASI & STATUS TIDAK KONSISTEN:
-- - uq_activities_user_post menjamin satu baris per (user_id, post_id). Versi ini tetap
--   memakai agregat (COUNT / MIN) alih-alih `SELECT ... INTO ... FOR UPDATE` yang akan
--   melempar P0003 bila baris >1, sehingga data duplikat (mis. constraint pernah
--   di-drop) menghasilkan error yang jelas, bukan error kabur.
--
-- CATATAN: migrasi ini TIDAK mengubah tabel, constraint, FK, atau policy apa pun.
-- Hanya isi fungsi yang diganti. Rollback = jalankan ulang isi fungsi dari 003.
-- Jalankan 010 SEBELUM 011.

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
    v_col RECORD;
    v_status_check_count INTEGER;
    v_status_check_def   TEXT;
    v_normalized         TEXT;
    v_normalized_expect  TEXT;
    v_normalized_in_form TEXT;
    v_literal_outer_raw   TEXT;
    v_literal_in_raw      TEXT;
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

    IF to_regprocedure('public.submit_help_application(uuid, text, text, text, text)') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi submit_help_application(uuid, text, text, text, text) tidak ditemukan. Jalankan migration 003 terlebih dahulu.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom posts.author_id harus UUID NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'status';

    IF v_col.data_type IS DISTINCT FROM 'text' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status harus TEXT NOT NULL.';
    END IF;

    SELECT data_type, is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'user_id';

    IF v_col.data_type IS DISTINCT FROM 'uuid' OR v_col.is_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id harus UUID NOT NULL.';
    END IF;

    -- Nilai status harus sesuai nilai yang dienforce fungsi ini.
    -- Pemeriksaan KETAT, identik dengan migration 011. Empat pemeriksaan LIKE
    -- sebelumnya terlalu longgar: constraint seperti
    --   IN ('menunggu','berlangsung','selesai','batal','ditunda')  tetap lolos LIKE,
    -- dan beberapa CHECK yang masing-masing memuat sebagian nilai juga lolos.
    -- Langkah:
    --   1. hanya CHECK yang benar-benar menyentuh kolom status (pg_conkey +
    --      att.attname) yang dihitung — CHECK pada kolom lain (mis. review_rating)
    --      tidak dihitung;
    --   2. harus TEPAT SATU;
    --   3. definisi dinormalisasi lalu dibandingkan PERSIS dengan dua bentuk yang
    --      diharapkan: `= ANY (ARRAY[...])` (format yang dikonfirmasi di Supabase)
    --      dan `IN (...)`.
    -- Format pg_get_constraintdef() yang dikonfirmasi di database Supabase:
    --   CHECK ((status = ANY (ARRAY['menunggu'::text, 'berlangsung'::text,
    --          'selesai'::text, 'batal'::text])))
    -- (prefix "CHECK " bukan bagian dari definisi).
    SELECT COUNT(*),
           MAX(pg_get_constraintdef(con.oid))
    INTO v_status_check_count, v_status_check_def
    FROM pg_constraint con
    INNER JOIN pg_attribute att
        ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.activities'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status';

    IF v_status_check_count <> 1 THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Diharapkan tepat 1 CHECK pada activities.status, ditemukan %.', v_status_check_count;
    END IF;

    -- Normalisasi (identik dengan 011): hapus cast ::text DULU, baru hapus tanda
    -- baca `(` `)` `[` `]` `"` dan whitespace, lalu lowercase.
    -- Urutan ini penting: bila tanda baca dihapus lebih dulu, bracket ARRAY[...]
    -- ikut hilang sebelum ::text dibuang dan hasilnya tidak lagi sebanding
    -- dengan literal pembanding.
    -- Prefix "CHECK " bukan bagian dari pg_get_constraintdef(), tetapi dibuang
    -- juga agar hasil normalisasi tetap benar bila definisi diambil dari
    -- tampilan yang menyertakan prefix tersebut.
    v_normalized := lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(v_status_check_def, '::text', '', 'g'),
                '[[:space:]"()\[\]]', '', 'g'
            ),
            '^CHECK', '', 'g'
        )
    );

    -- Dua bentuk pembanding, sesuai dua bentuk yang mungkin dihasilkan
    -- pg_get_constraintdef() untuk CHECK berbasis daftar nilai:
    --   1. `= ANY (ARRAY[...])` (format yang dikonfirmasi di Supabase)
    --   2. `IN (...)`          (bila PostgreSQL tidak menormalkan ke ANY)
    -- Raw literal dan aturan normalisasinya (tanpa regex) sama persis dengan
    -- v_normalized: ::text dibuang, lalu tanda baca dan spasi dibuang, lalu
    -- lowercase. Raw literal ditulis di sini dalam bentuk kanonik yang sudah
    -- memuat `[`/`]`; kesamaan dengan hasil normalisasi dibuktikan oleh blok
    -- VERIFIKASI di bawah.
    v_literal_outer_raw := 'status = ANY (ARRAY[''menunggu''::text, ''berlangsung''::text, ''selesai''::text, ''batal''::text])';
    v_literal_in_raw    := 'status IN (''menunggu'', ''berlangsung'', ''selesai'', ''batal'')';

    v_normalized_expect := lower(
        regexp_replace(
            regexp_replace(v_literal_outer_raw, '::text', '', 'g'),
            '[[:space:]"()\[\]]', '', 'g'
        )
    );
    v_normalized_in_form := lower(
        regexp_replace(
            regexp_replace(v_literal_in_raw, '::text', '', 'g'),
            '[[:space:]"()\[\]]', '', 'g'
        )
    );

    IF v_normalized IS DISTINCT FROM v_normalized_expect
       AND v_normalized IS DISTINCT FROM v_normalized_in_form
    THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: CHECK activities.status tidak persis sama dengan (menunggu, berlangsung, selesai, batal). Ditemukan: %', v_status_check_def;
    END IF;

    IF to_regprocedure('auth.uid()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi auth.uid() tidak ditemukan.';
    END IF;
END
$$;

-- =========================================================
-- 2. RPC: submit_help_application (versi 010)
-- =========================================================

CREATE OR REPLACE FUNCTION public.submit_help_application(
    p_post_id UUID,
    p_message TEXT DEFAULT '',
    p_contact_info TEXT DEFAULT '',
    p_available_time TEXT DEFAULT '',
    p_extra_note TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_applicant_id UUID;
    v_post_author UUID;
    v_post_exists BOOLEAN := FALSE;
    v_activity_count BIGINT;
    v_activity_status TEXT;
    v_has_accepted BOOLEAN;
    v_new_id UUID;
BEGIN
    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'post_id wajib diisi.';
    END IF;

    v_applicant_id := (SELECT auth.uid());
    IF v_applicant_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- TAHAP 1: Lock post (langkah pertama protokol lock).
    -- FOUND dibaca LANGSUNG setelah pernyataan ini, tanpa pernyataan SQL lain di
    -- antaranya, lalu disalin ke variabel lokal (v_post_exists). FOUND adalah
    -- variabel global yang di-set ulang oleh pernyataan SQL apa pun (SELECT,
    -- INSERT, UPDATE, DELETE, PERFORM, ...), jadi beberapa baris di bawah FOUND
    -- sudah tidak dapat dipercaya. Seluruh logika sesudah ini hanya memakai
    -- v_post_exists.
    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = p_post_id
    FOR UPDATE;

    v_post_exists := FOUND;

    -- Pemeriksaan kedua (defensif): posts.author_id adalah UUID NOT NULL, jadi bila
    -- FOUND true namun author_id NULL berarti skema tidak seperti yang diasumsikan.
    IF v_post_exists AND v_post_author IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: posts.author_id NULL untuk postingan ini (seharusnya UUID NOT NULL).';
    END IF;

    IF NOT v_post_exists THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    -- Pemilik tidak boleh mengajukan ke postingannya sendiri (lapisan backend).
    IF v_post_author = v_applicant_id THEN
        RAISE EXCEPTION 'Anda tidak dapat mengajukan bantuan ke postingan sendiri.';
    END IF;

    -- TAHAP 2: Lock aktivitas pemilik post, lalu evaluasi status dengan agregat.
    PERFORM a.id
    FROM public.activities a
    WHERE a.post_id = p_post_id
      AND a.user_id = v_post_author
    FOR UPDATE;

    SELECT COUNT(*), MIN(a.status) FILTER (WHERE TRUE)
    INTO v_activity_count, v_activity_status
    FROM public.activities a
    WHERE a.post_id = p_post_id
      AND a.user_id = v_post_author;

    IF v_activity_count > 1 THEN
        RAISE EXCEPTION 'Pengajuan ditolak: ditemukan lebih dari satu aktivitas untuk postingan ini. Tindakan manual diperlukan.';
    END IF;

    -- Agregat di atas hanya melihat aktivitas MILIK pemilik post (user_id = author_id),
    -- sama seperti 003 (yang memfilter a.user_id = v_post_author). Aktivitas pemilik
    -- lain tidak boleh memblokir pengajuan.
    IF v_activity_count = 1 THEN
        IF v_activity_status = 'batal' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah dibatalkan. Buat postingan baru jika masih membutuhkan bantuan.';
        ELSIF v_activity_status = 'selesai' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah selesai. Pengajuan tidak dapat dilakukan.';
        ELSIF v_activity_status = 'berlangsung' THEN
            RAISE EXCEPTION 'Aktivitas ini sudah berlangsung. Pengajuan tidak dapat dilakukan.';
        ELSIF v_activity_status = 'menunggu' THEN
            -- Pengajuan pertama masih menunggu; boleh menerima pengajuan lain.
            NULL;
        ELSE
            RAISE EXCEPTION 'Postingan tidak menerima pengajuan: status aktivitas "%" tidak dikenali.', v_activity_status;
        END IF;
    END IF;

    -- TAHAP 3: Tidak boleh ada pengajuan yang sudah diterima.
    SELECT EXISTS (
        SELECT 1
        FROM public.help_applications ha
        WHERE ha.post_id = p_post_id
          AND ha.status = 'accepted'
    ) INTO v_has_accepted;

    IF v_has_accepted THEN
        RAISE EXCEPTION 'Sudah ada pengajuan yang diterima untuk postingan ini.';
    END IF;

    -- TAHAP 4: Cek duplikat (pending atau accepted dari pelamar yang sama).
    IF EXISTS (
        SELECT 1
        FROM public.help_applications ha
        WHERE ha.post_id = p_post_id
          AND ha.applicant_id = v_applicant_id
          AND ha.status IN ('pending', 'accepted')
    ) THEN
        RAISE EXCEPTION 'Anda sudah memiliki pengajuan pending atau diterima untuk postingan ini.';
    END IF;

    -- TAHAP 5: Insert pengajuan baru.
    INSERT INTO public.help_applications (
        post_id,
        applicant_id,
        message,
        contact_info,
        available_time,
        extra_note,
        status
    ) VALUES (
        p_post_id,
        v_applicant_id,
        COALESCE(p_message, ''),
        COALESCE(p_contact_info, ''),
        COALESCE(p_available_time, ''),
        COALESCE(p_extra_note, ''),
        'pending'
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- Hak akses eksplisit: hanya pengguna login yang boleh mengajukan bantuan.
-- REVOKE FROM PUBLIC saja tidak cukup (fungsi baru mewarisi EXECUTE dari PUBLIC, dan
-- Supabase juga memberi grant langsung ke role anon), jadi anon dicabut secara eksplisit.
REVOKE EXECUTE ON FUNCTION public.submit_help_application(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_help_application(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_help_application(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

-- =============================================================================
-- VERIFIKASI READ-ONLY (jalankan manual setelah migrasi)
-- =============================================================================
--
-- 1. Fungsi terganti dan aman:
--    SELECT proname, proowner::regrole, prosecdef, proconfig
--    FROM pg_proc
--    WHERE oid = 'public.submit_help_application(uuid,text,text,text,text)'::regprocedure;
--
-- 2. Hak eksekusi (authenticated=true, anon=false):
--    SELECT has_function_privilege('authenticated', 'public.submit_help_application(uuid,text,text,text,text)', 'EXECUTE') AS authenticated_ok,
--           has_function_privilege('anon',          'public.submit_help_application(uuid,text,text,text,text)', 'EXECUTE') AS anon_ok,
--           (SELECT proacl FROM pg_proc WHERE oid = 'public.submit_help_application(uuid,text,text,text,text)'::regprocedure) AS acl;
--    CATATAN: has_function_privilege('anon', ...) bernilai true baik karena grant
--    langsung ke anon maupun karena warisan dari PUBLIC. Query ini saja TIDAK
--    membuktikan PUBLIC tidak punya EXECUTE. JANGAN memakai
--    has_function_privilege('public', ...): 'public' di sana dibaca sebagai nama
--    role biasa dan akan gagal (role tidak ada). PUBLIC (pseudo-role) hanya
--    terlihat lewat aclexplode dengan grantee = 0. Termasuk efek GRANT OPTION:
--    has_function_privilege bernilai true untuk entri "=X*", sehingga grant
--    langsung dibuktikan terpisah di 2c.
--
-- 2a. ACL mentah, termasuk perlakuan proacl IS NULL. proacl NULL berarti fungsi
--    memakai ACL bawaan; COALESCE dengan acldefault('f', proowner) membuat query
--    tetap benar: bila proacl NULL, ACL bawaan diperiksa (di PostgreSQL ACL
--    bawaan fungsi biasanya memberi EXECUTE kepada PUBLIC -> public_execute = true).
--    Hasil benar: acl_null = false, public_execute = false.
--    SELECT p.proacl IS NULL AS acl_null,
--           EXISTS (
--               SELECT 1
--               FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
--               WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
--           ) AS public_execute,
--           p.proacl
--    FROM pg_proc p
--    WHERE p.oid = 'public.submit_help_application(uuid,text,text,text,text)'::regprocedure;
--    Tafsir: acl_null = true -> SALAH (ACL bawaan); public_execute = true -> SALAH
--    (PUBLIC masih punya EXECUTE). Entri "=<NULL>" tidak menghasilkan baris
--    grantee = 0, jadi public_execute = false bila hanya itu entrinya.
--
-- 2b. Otomatis, HANYA bila fungsi sudah ada — dievaluasi kapan saja tanpa memicu
--    'function "..." does not exist'. `::regprocedure` di 1, 2, dan 2a TIDAK bisa
--    dipadatkan dengan CASE: PostgreSQL tetap mengevaluasi literal tersebut
--    (terbukti di PostgreSQL 18.6). Target dipilih lewat signature, bukan proname,
--    karena proname bisa cocok dengan beberapa fungsi dan EXISTS akan lolos karena
--    fungsi lain.
--    "siap_diperiksa = false" berarti 1, 2, 2a, dan 2c belum terbuktikan.
--    SELECT proname,
--           proargtypes = ARRAY[2950, 25, 25, 25, 25]::oidvector AS signature_sesuai,
--           to_regprocedure('public.submit_help_application(uuid,text,text,text,text)') = oid AS siap_diperiksa,
--           proowner::regrole AS owner,
--           prosecdef AS security_definer,
--           pg_catalog.to_jsonb(proconfig) AS konfigurasi,
--           EXISTS (
--               SELECT 1 FROM pg_catalog.unnest(proconfig::text[]) AS c(elemen)
--               WHERE split_part(c.elemen, '=', 1) = 'search_path'
--                 AND btrim(substr(c.elemen, position('=' IN c.elemen) + 1)) = '""'
--           ) AS search_path_kosong
--    FROM pg_proc
--    WHERE pronamespace = 'public'::regnamespace AND proname = 'submit_help_application';
--    Tafsir: harus tepat SATU baris dengan signature_sesuai = true dan
--    siap_diperiksa = true. search_path_kosong = true berarti proconfig memuat
--    elemen search_path="". Representasi itu yang dikeluarkan PostgreSQL; string
--    'search_path=' TIDAK cocok. Bila search_path_kosong = false, 010 tidak
--    memakai SET search_path (perlu dicek manual di badan fungsi).
--
-- 2c. Grant langsung (bukan warisan PUBLIC). Hasil benar: satu baris per role
--    dengan grant_langsung = true. grant_langsung = false berarti role hanya
--    mewarisi PUBLIC atau tidak punya EXECUTE sama sekali (lihat anon_ok/1 dan 2a).
--    NOT a.is_grantable mengecualikan entri "=X*" (GRANT OPTION saja) yang akan
--    membuat EXISTS lolos padahal belum tentu aksesnya dipakai.
--    SELECT r.rolname,
--           COALESCE((
--               SELECT EXISTS (
--                   SELECT 1
--                   FROM pg_proc p,
--                        LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
--                        JOIN pg_roles gr ON gr.oid = a.grantee
--                   WHERE p.oid = to_regprocedure('public.submit_help_application(uuid,text,text,text,text)')
--                     AND gr.rolname = r.rolname
--                     AND a.grantee <> 0
--                     AND a.privilege_type = 'EXECUTE'
--                     AND NOT a.is_grantable
--               )
--           ), false) AS grant_langsung
--    FROM pg_catalog.unnest(ARRAY['authenticated', 'anon']) AS r(rolname);
--
-- 2d. Bukti bahwa literal pembanding normalisasi di blok prasyarat memang sama
--     dengan format pg_get_constraintdef() Supabase. Dijalankan SEPARAT (tidak di
--     dalam DO block) hanya untuk membaca perilaku dua sisi secara berdampingan;
--     tidak mengubah data. Harus menghasilkan v_bentuk_any = true.
--     SELECT lower(regexp_replace(regexp_replace(pg_get_constraintdef(con.oid), '::text', '', 'g'), '[[:space:]"()\[\]]', '', 'g')) = lower(regexp_replace(regexp_replace(v_raw, '::text', '', 'g'), '[[:space:]"()\[\]]', '', 'g')) AS v_bentuk_any,
--            pg_get_constraintdef(con.oid) AS v_actual
--     FROM pg_constraint con
--     JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
--     CROSS JOIN LATERAL (SELECT 'status = ANY (ARRAY[''menunggu''::text, ''berlangsung''::text, ''selesai''::text, ''batal''::text])'::text AS v_raw) t
--     WHERE con.conrelid = 'public.activities'::regclass AND con.contype = 'c' AND att.attname = 'status';
--
-- 3. Post yang masih punya record activities non-'menunggu' tetapi terlihat di katalog
--    (harusnya kosong setelah frontend memfilter; query ini memeriksa konsistensi data):
--    SELECT p.id, a.status
--    FROM public.posts p
--    JOIN public.activities a ON a.post_id = p.id
--    WHERE a.status <> 'menunggu';
--
-- =============================================================================