-- =============================================================================
-- Migration 011: RPC get_post_activity_status (read-only)
-- =============================================================================
-- TUJUAN:
-- Beranda, katalog, detail, dan form pengajuan perlu tahu apakah sebuah post masih
-- aktif. Sumber kebenaran status adalah public.activities.status, tetapi RLS pada
-- activities hanya mengizinkan pemilik (activities_select_own, migration 002) dan
-- partner (activities_select_as_partner, migration 005) membaca barisnya.
-- Akibatnya query langsung dari client mengembalikan 0 baris untuk pengguna lain,
-- sehingga post selesai/batal terlihat "aktif" (0 baris disalahartikan sebagai
-- "tanpa aktivitas"). RPC ini mengembalikan HANYA post_id, status, jumlah baris, dan
-- flag ambiguitas, tanpa membuka data pribadi aktivitas.
--
-- KEAMANAN:
-- - SECURITY DEFINER + SET search_path = '' + semua objek schema-qualified.
--   BATASAN PENTING: SECURITY DEFINER TIDAK berarti "RLS milik pemanggil ikut
--   berlaku". Fungsi berjalan dengan hak PEMILIK fungsi (biasanya role pemilik
--   schema public / postgres), sehingga policy RLS pemanggil TIDAK dievaluasi saat
--   fungsi membaca activities. Jadi yang membatasi akses di sini adalah:
--     (1) GRANT/REVOKE EXECUTE di bawah, dan
--     (2) filter di dalam badan fungsi.
--   Karena RLS tidak menyaring apa pun, satu-satunya pengaman terhadap data privat
--   adalah daftar kolom yang dikembalikan: hanya post_id, status agregat,
--   activity_count, dan ambiguous. Nama partner, catatan, rating, ulasan, dan ID
--   user tidak pernah dipilih maupun dikembalikan. Tambahan apa pun pada RETURNS
--   TABLE harus ditinjau ulang dari sisi ini.
--   Ambiguitas status juga tidak membocorkan status individual saat baris >1:
--   status dikembalikan NULL bersama jumlah baris saja.
-- - Hanya kolom post_id, status, activity_count, ambiguous. Tidak mengembalikan
--   user_id, partner_id, partner_name, note, review_rating, atau review_comment.
-- - Hanya mengembalikan status untuk post yang boleh dilihat publik. Aturan akses
--   posts yang ada: anon & authenticated boleh SELECT semua posts (posts_select_anon
--   di 001 dan posts_select_all di schema.sql). Karena itu filter "post boleh
--   dilihat publik" = baris ada di public.posts. Bila aturan akses posts dipersempit
--   kelak, filter di sini harus disesuaikan.
-- - Hak akses ditetapkan EKSPLISIT untuk kedua role:
--       REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon;
--       GRANT  EXECUTE ... TO authenticated;
--       GRANT  EXECUTE ... TO anon;
--   Alasan: Supabase memberi GRANT EXECUTE langsung ke role `anon` dan
--   `authenticated` (bukan lewat PUBLIC) saat fungsi dibuat, DAN fungsi baru
--   mewarisi EXECUTE dari PUBLIC secara default di PostgreSQL. Karena itu
--   REVOKE FROM PUBLIC saja TIDAK cukup untuk menyimpulkan atau mencabut akses
--   anon. Kedua role dicabut lalu diberikan ulang secara sengaja di bawah.
--   Anon diberi akses KARENA klien anon memakai RPC ini untuk katalog publik, dan
--   fungsi hanya mengembalikan post_id + status agregat untuk post yang anon
--   sendiri sudah bisa baca langsung lewat posts_select_anon. Untuk melarang anon,
--   hapus baris GRANT ... TO anon (lihat catatan di akhir file).
-- - Input dibatasi: NULL, array kosong, ID berlebih (>100), dan elemen NULL
--   ditolak. ID yang tidak ada di posts / tidak punya aktivitas tidak dikembalikan
--   (bukan error) — client memperlakukannya sebagai "tanpa aktivitas".
-- - Duplikasi dideteksi dari JUMLAH BARIS, bukan jumlah status berbeda: bila satu
--   post memiliki >1 baris activities (walau statusnya sama), baris dikembalikan
--   dengan status NULL dan ambiguous = true. Client wajib memperlakukan ambiguitas
--   sebagai TIDAK AMAN (tidak aktif, tidak selesai).
--
-- CATATAN: migrasi ini TIDAK mengubah policy RLS atau skema tabel apa pun.
-- Urutan penerapan yang disarankan: 010 lalu 011. Keduanya independen secara SQL,
-- tetapi 011 di-rollout sejak frontend memakainya, sehingga 010 (yang menolak
-- pengajuan ke post selesai/batal) sebaiknya sudah aktif lebih dulu.
-- Ambiguitas di 011 adalah lapisan pertahanan kedua bila constraint
-- uq_activities_user_post tidak ada/hilang di database remote (bandingkan dengan
-- verifikasi CONSTRAINT di 010).

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
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

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'activities'
          AND column_name = 'post_id' AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.post_id harus bertipe UUID.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'activities'
          AND column_name = 'status' AND data_type = 'text' AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.status harus TEXT NOT NULL.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'posts'
          AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom posts.id harus bertipe UUID.';
    END IF;

    -- Validasi CHECK constraint activities.status secara KETAT (identik dengan 010).
    -- Empat pemeriksaan LIKE saja terlalu longgar: constraint seperti
    --   IN ('menunggu','berlangsung','selesai','batal','ditunda')  tetap lolos LIKE,
    -- dan beberapa CHECK yang masing-masing memuat sebagian nilai juga lolos.
    -- Langkah:
    --   1. hanya CHECK yang benar-benar menyentuh kolom status (pg_conkey +
    --      att.attname) yang dihitung — CHECK pada kolom lain tidak ikut;
    --   2. harus TEPAT SATU;
    --   3. definisi dinormalisasi lalu dibandingkan PERSIS dengan dua bentuk yang
    --      diharapkan: `= ANY (ARRAY[...])` (format yang dikonfirmasi di Supabase)
    --      dan `IN (...)` (bila PostgreSQL tidak menormalkan ke ANY).
    -- Prefix "CHECK " bukan bagian dari pg_get_constraintdef(); dibuang oleh
    -- normalisasi agar aman.
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

    -- Normalisasi: hapus cast ::text DULU, baru hapus tanda baca (identik dengan
    -- 010). Bila tanda baca dihapus lebih dulu, bracket ARRAY[...] ikut hilang
    -- sebelum ::text dibuang, dan hasilnya tidak lagi sebanding dengan literal
    -- pembanding. Prefix "CHECK" bukan bagian dari pg_get_constraintdef(),
    -- tetapi dibuang juga agar aman.
    v_normalized := lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(v_status_check_def, '::text', '', 'g'),
                '[[:space:]"()\[\]]', '', 'g'
            ),
            '^CHECK', '', 'g'
        )
    );

    -- Dua bentuk pembanding (sama seperti 010):
    --   1. `= ANY (ARRAY[...])` — format yang dikonfirmasi di Supabase
    --   2. `IN (...)`           — bila PostgreSQL tidak menormalkan ke ANY
    -- Raw literal dinormalisasi dengan aturan yang sama persis, sehingga kedua
    -- sisi berada di ruang yang sama.
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
END
$$;

-- =========================================================
-- 2. RPC: get_post_activity_status
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_post_activity_status(
    p_post_ids UUID[]
)
RETURNS TABLE (
    post_id UUID,
    status TEXT,
    activity_count INTEGER,
    ambiguous BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_post_ids IS NULL THEN
        RAISE EXCEPTION 'Daftar post_id wajib diisi.';
    END IF;

    v_count := COALESCE(array_length(p_post_ids, 1), 0);

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Daftar post_id tidak boleh kosong.';
    END IF;

    IF v_count > 100 THEN
        RAISE EXCEPTION 'Maksimal 100 post_id per permintaan, diterima %.', v_count;
    END IF;

    -- Alias kolom eksplisit: unnest(p_post_ids) AS u(post_id) sehingga referensi
    -- u.post_id tidak ambigu dan tidak bergantung pada nama kolom hasil unnest.
    IF EXISTS (
        SELECT 1 FROM unnest(p_post_ids) AS u(post_id) WHERE u.post_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Daftar post_id tidak boleh berisi elemen NULL.';
    END IF;

    -- Hanya post yang benar-benar ada di public.posts. Saat ini policy posts
    -- (posts_select_all / posts_select_anon) membolehkan semua pengguna membaca
    -- semua baris, jadi EXISTS pada posts setara dengan "boleh dilihat publik".
    -- Jika kebijakan akses posts dipersempit, tambahkan kondisi yang sama di sini.
    --
    -- Agregasi dikerjakan di subquery ber-alias `agg` agar kolom OUT bernama
    -- `status` tidak bertabrakan dengan kolom a.status.
    -- Ambiguitas dideteksi dari COUNT(*) (jumlah baris), bukan COUNT(DISTINCT).
    RETURN QUERY
    SELECT
        agg.post_id,
        agg.resolved_status,
        agg.row_count,
        agg.is_ambiguous
    FROM (
        SELECT
            a.post_id                                   AS post_id,
            CASE WHEN COUNT(*) = 1
                 THEN MIN(a.status)
                 ELSE NULL
            END                                         AS resolved_status,
            COUNT(*)::INTEGER                           AS row_count,
            (COUNT(*) > 1)                              AS is_ambiguous
        FROM public.activities a
        WHERE a.post_id = ANY (p_post_ids)
          AND EXISTS (
              SELECT 1 FROM public.posts p WHERE p.id = a.post_id
          )
        GROUP BY a.post_id
    ) AS agg;
END;
$$;

-- =========================================================
-- 3. Hak akses: tetapkan eksplisit untuk PUBLIC, authenticated, dan anon
-- =========================================================

REVOKE EXECUTE ON FUNCTION public.get_post_activity_status(UUID[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_post_activity_status(UUID[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_post_activity_status(UUID[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_post_activity_status(UUID[]) TO authenticated;
-- Katalog publik dipakai client anon. Hapus baris ini bila anon harus dilarang.
GRANT EXECUTE ON FUNCTION public.get_post_activity_status(UUID[]) TO anon;

COMMIT;
-- =============================================================================
-- VERIFIKASI READ-ONLY SETELAH MIGRASI (jangan mengubah data)
-- =============================================================================
--
--   1. Fungsi terganti dan aman:
--      SELECT proname, proowner::regrole, prosecdef, proconfig, provolatile
--      FROM pg_proc
--      WHERE oid = 'public.get_post_activity_status(uuid[])'::regprocedure;
--      (harus: prosecdef = true, proconfig = {search_path=}, provolatile = 's')
--
--   2. Hak akses efektif (authenticated_ok = true; anon_ok = true bila anon
--      diizinkan oleh migrasi ini — lihat GRANT anon di atas):
--      SELECT has_function_privilege('authenticated', 'public.get_post_activity_status(uuid[])', 'EXECUTE') AS authenticated_ok,
--             has_function_privilege('anon',          'public.get_post_activity_status(uuid[])', 'EXECUTE') AS anon_ok,
--             (SELECT proacl FROM pg_proc WHERE oid = 'public.get_post_activity_status(uuid[])'::regprocedure) AS acl;
--      CATATAN: has_function_privilege('anon', ...) bernilai true baik karena
--      grant langsung ke anon MAUPUN karena warisan dari PUBLIC. Query ini saja
--      TIDAK membuktikan PUBLIC tidak punya EXECUTE. Untuk itu gunakan query 2b.
--      JANGAN memakai has_function_privilege('public', ...): 'public' di sana
--      dibaca sebagai nama role biasa dan akan gagal (role tidak ada).
--      PUBLIC (pseudo-role) hanya terlihat lewat aclexplode dengan grantee = 0.
--      Termasuk efek GRANT OPTION: has_function_privilege bernilai true untuk
--      entri "=X*", sehingga grant langsung dibuktikan terpisah di 2c.
--
--   2a. ACL mentah, termasuk perlakuan proacl IS NULL. proacl NULL berarti fungsi
--      memakai ACL bawaan. COALESCE dengan acldefault('f', proowner) membuat query
--      ini tetap benar dalam dua kondisi:
--        - proacl NULL -> ACL bawaan diperiksa; di PostgreSQL ACL bawaan fungsi
--          biasanya memberi EXECUTE kepada PUBLIC (grantee = 0), sehingga
--          public_execute = true (SALAH: migrasi seharusnya mencabutnya);
--        - proacl terisi -> hanya ACL hasil migrasi yang diperiksa.
--      Hasil benar: acl_null = false, public_execute = false.
--      SELECT p.proacl IS NULL AS acl_null,
--             EXISTS (
--                 SELECT 1
--                 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
--                 WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
--             ) AS public_execute,
--             p.proacl
--      FROM pg_proc p
--      WHERE p.oid = 'public.get_post_activity_status(uuid[])'::regprocedure;
--      Tafsir:
--        acl_null = false, public_execute = false -> BENAR (PUBLIC tidak punya EXECUTE)
--        acl_null = true                          -> SALAH (ACL bawaan masih berlaku)
--        public_execute = true                    -> SALAH (PUBLIC masih punya EXECUTE)
--      Catatan: entri "=<NULL>" (hak PUBLIC dicabut eksplisit) TIDAK menghasilkan
--      baris grantee = 0, jadi public_execute = false bila hanya itu entrinya.
--      Bentuk ACL yang diharapkan setelah migrasi:
--        {<owner>=X/<owner>,anon=X/<owner>,authenticated=X/<owner>}
--        (atau {=<NULL>,anon=X/<owner>,authenticated=X/<owner>,<owner>=X/<owner>};
--         keduanya berarti PUBLIC tidak punya hak.)
--
--   2b. Otomatis, HANYA bila fungsi sudah ada — dievaluasi kapan saja tanpa
--      memicu 'function "..." does not exist'. `::regprocedure` di 1, 2, dan 2a
--      TIDAK bisa dipadatkan dengan CASE: PostgreSQL tetap mengevaluasi literal
--      tersebut (terbukti di PostgreSQL 18.6). Target dipilih lewat signature, bukan
--      proname, karena proname bisa cocok dengan beberapa fungsi (mis. versi lama
--      dengan tipe argumen lain) dan EXISTS akan lolos karena fungsi lain.
--      "siap_diperiksa = false" berarti 1, 2, 2a, dan 2c belum terbuktikan.
--      SELECT proname,
--             proargtypes = '2951'::oidvector AS signature_sesuai,
--             to_regprocedure('public.get_post_activity_status(uuid[])') = oid AS siap_diperiksa,
--             proowner::regrole AS owner,
--             prosecdef AS security_definer,
--             provolatile AS volatilitas,
--             pg_catalog.to_jsonb(proconfig) AS konfigurasi,
--             EXISTS (
--                 SELECT 1 FROM pg_catalog.unnest(proconfig::text[]) AS c(elemen)
--                 WHERE split_part(c.elemen, '=', 1) = 'search_path'
--                   AND btrim(substr(c.elemen, position('=' IN c.elemen) + 1)) = '""'
--             ) AS search_path_kosong
--      FROM pg_proc
--      WHERE pronamespace = 'public'::regnamespace AND proname = 'get_post_activity_status';
--      Tafsir: harus tepat SATU baris dengan signature_sesuai = true dan
--      siap_diperiksa = true; security_definer = true; volatilitas = 's';
--      search_path_kosong = true. Proconfig menyimpan elemen sebagai
--      search_path="" (terbukti di PostgreSQL 18.6); string 'search_path=' TIDAK cocok.
--
--   2c. Grant anon & authenticated bersumber dari grant LANGSUNG, bukan warisan
--      PUBLIC. Hasil yang diharapkan: satu baris per role dengan grant_langsung =
--      true. grant_langsung = false (atau role tidak muncul) berarti role tsb hanya
--      mewarisi PUBLIC atau tidak punya EXECUTE (lihat 2). 2a hanya membuktikan
--      PUBLIC dicabut; grant langsung tetap perlu bukti ini.
--      NOT a.is_grantable mengecualikan entri "=X*" (GRANT OPTION saja) yang akan
--      membuat EXISTS lolos padahal belum tentu aksesnya dipakai.
--      SELECT r.rolname,
--             COALESCE((
--                 SELECT EXISTS (
--                     SELECT 1
--                     FROM pg_proc p,
--                          LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
--                          JOIN pg_roles gr ON gr.oid = a.grantee
--                     WHERE p.oid = to_regprocedure('public.get_post_activity_status(uuid[])')
--                       AND gr.rolname = r.rolname
--                       AND a.grantee <> 0
--                       AND a.privilege_type = 'EXECUTE'
--                       AND NOT a.is_grantable
--                 )
--             ), false) AS grant_langsung
--      FROM pg_catalog.unnest(ARRAY['anon','authenticated']) AS r(rolname);
--

--   2d. Bukti bahwa literal pembanding normalisasi di blok prasyarat memang sama
--       dengan format pg_get_constraintdef() Supabase. Query ini dijalankan
--       SEPARAT (di luar DO block) hanya untuk membandingkan kebenaran string; tidak
--       mengubah data. Hasil harus v_bentuk_any = true.
--       SELECT lower(regexp_replace(regexp_replace(pg_get_constraintdef(con.oid), '::text', '', 'g'), '[[:space:]"()\[\]]', '', 'g')) = lower(regexp_replace(regexp_replace(v_raw, '::text', '', 'g'), '[[:space:]"()\[\]]', '', 'g')) AS v_bentuk_any,
--              pg_get_constraintdef(con.oid) AS v_actual
--       FROM pg_constraint con
--       JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
--       CROSS JOIN LATERAL (SELECT 'status = ANY (ARRAY[''menunggu''::text, ''berlangsung''::text, ''selesai''::text, ''batal''::text])'::text AS v_raw) t
--       WHERE con.conrelid = 'public.activities'::regclass AND con.contype = 'c' AND att.attname = 'status';
--
--   3. Post dengan lebih dari satu baris activities (harusnya kosong; bila tidak,
--      RPC akan menandainya ambiguous = true):
--      SELECT post_id, COUNT(*) AS row_count
--      FROM public.activities
--      GROUP BY post_id
--      HAVING COUNT(*) > 1;
--
--   4. Contoh pemanggilan:
--      SELECT * FROM public.get_post_activity_status(
--          ARRAY['<uuid-post-1>'::uuid, '<uuid-post-2>'::uuid]
--      );
-- =============================================================================