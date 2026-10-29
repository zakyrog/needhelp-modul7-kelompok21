-- =============================================================================
-- Migration 012: Tabel conversations + messages (chat nyata)
-- =============================================================================
-- Menggantikan chat simulasi (localStorage) dengan penyimpanan nyata:
-- - conversations: satu baris per (postingan, pemilik post, lawan bicara)
-- - messages: pesan 1-2000 karakter, dikirim hanya oleh peserta percakapan
--
-- PRASYARAT:
-- - schema.sql (profiles, posts) sudah dijalankan
-- - Migration 002 (activities), 003 (help_applications) sudah dijalankan
-- - Migration 004 (accept_help_application) sudah dijalankan — partner_id diisi
--   saat pengajuan diterima
--
-- CATATAN KEAMANAN:
-- - Tabel HANYA untuk role `authenticated`. Tidak ada policy untuk anon. RPC
--   juga mencabut EXECUTE dari anon secara eksplisit (bukan hanya dari PUBLIC).
-- - Tidak ada policy INSERT/UPDATE/DELETE untuk klien. Semua penulisan lewat RPC
--   SECURITY DEFINER dengan SET search_path = '', REVOKE EXECUTE FROM PUBLIC,
--   dan GRANT EXECUTE TO authenticated (pola migration 003-006).
-- - sender_id dan owner_id selalu diambil di server (auth.uid() / posts.author_id),
--   tidak pernah dari argumen RPC.
-- - Pesan tidak dapat diedit atau dihapus oleh pengguna (tidak ada policy).
--
-- PROTOKOL LOCK (mencegah deadlock), konsisten dengan 004/005/006:
-- posts -> activities -> help_applications -> conversations -> messages
--
-- IDEMPOTEN:
-- - CREATE TABLE / INDEX / FUNCTION IF NOT EXISTS atau OR REPLACE
-- - DROP POLICY IF EXISTS sebelum CREATE POLICY
-- - DROP TRIGGER IF EXISTS sebelum CREATE TRIGGER
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat: Verifikasi skema
-- =========================================================

DO $$
DECLARE
    v_col_record RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'posts'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.posts tidak ditemukan.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'activities'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.activities tidak ditemukan. Jalankan migration 002 terlebih dahulu.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'help_applications'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.help_applications tidak ditemukan. Jalankan migration 003 terlebih dahulu.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Tabel public.profiles tidak ditemukan. Jalankan schema.sql terlebih dahulu.';
    END IF;

    -- posts.author_id: UUID NOT NULL
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom posts.author_id tidak ditemukan.';
    END IF;
    IF v_col_record.data_type != 'uuid' OR v_col_record.is_nullable != 'NO' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom posts.author_id harus UUID NOT NULL.';
    END IF;

    -- activities: user_id (= pemilik post), partner_id, status
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'partner_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.partner_id tidak ditemukan. Jalankan migration 002.';
    END IF;
    IF v_col_record.data_type != 'uuid' OR v_col_record.is_nullable != 'YES' THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.partner_id harus UUID NULL-able.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom activities.user_id tidak ditemukan.';
    END IF;

    -- help_applications: applicant_id, status
    SELECT data_type, is_nullable INTO v_col_record
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'help_applications' AND column_name = 'applicant_id';

    IF v_col_record.data_type IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom help_applications.applicant_id tidak ditemukan. Jalankan migration 003.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'help_applications' AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Kolom help_applications.status tidak ditemukan.';
    END IF;

    -- Fungsi pendukung update_updated_at()
    IF to_regprocedure('public.update_updated_at()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi public.update_updated_at() tidak ditemukan. Periksa schema.sql.';
    END IF;
END
$$;

-- =========================================================
-- 2. Tabel conversations
-- =========================================================
-- owner_id  : pemilik postingan (snapshot posts.author_id, diverifikasi trigger)
-- partner_id: lawan bicara (partner aktivitas / pelamar / pemilik post)

CREATE TABLE IF NOT EXISTS public.conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL,
    owner_id    UUID NOT NULL,
    partner_id  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_conversations_distinct
        CHECK (owner_id <> partner_id)
);

-- FK eksplisit + idempoten (ON DELETE RESTRICT bila postingan masih dirujuk)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversations_post_id_fkey'
          AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT conversations_post_id_fkey
            FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversations_owner_id_fkey'
          AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT conversations_owner_id_fkey
            FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversations_partner_id_fkey'
          AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT conversations_partner_id_fkey
            FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Satu percakapan per (postingan, pemilik, lawan bicara)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_post_owner_partner
    ON public.conversations(post_id, owner_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_recent
    ON public.conversations(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_partner_recent
    ON public.conversations(partner_id, updated_at DESC);

-- =========================================================
-- 3. Tabel messages
-- =========================================================
-- sender_id selalu auth.uid() (diisi RPC). Sengaja TANPA referensi ke
-- conversations di dalam CHECK constraint — validasi keanggotaan memakai
-- trigger BEFORE INSERT (PostgreSQL tidak mengizinkan subquery pada CHECK).

CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id       UUID NOT NULL,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_messages_body_length
        CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'messages_conversation_id_fkey'
          AND conrelid = 'public.messages'::regclass
    ) THEN
        ALTER TABLE public.messages
            ADD CONSTRAINT messages_conversation_id_fkey
            FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'messages_sender_id_fkey'
          AND conrelid = 'public.messages'::regclass
    ) THEN
        ALTER TABLE public.messages
            ADD CONSTRAINT messages_sender_id_fkey
            FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Pagination riwayat: (conversation_id, created_at, id) stabil walau created_at sama
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages(conversation_id, created_at, id);

-- =========================================================
-- 4. Trigger updated_at
-- =========================================================

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;

CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- =========================================================
-- 5. Trigger: validasi percakapan ↔ postingan
-- =========================================================
-- owner_id harus pemilik postingan; owner_id <> partner_id.

CREATE OR REPLACE FUNCTION public.validate_conversation_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_post_author UUID;
BEGIN
    SELECT p.author_id INTO v_post_author
    FROM public.posts p
    WHERE p.id = NEW.post_id;

    IF v_post_author IS NULL THEN
        RAISE EXCEPTION 'Postingan untuk percakapan ini tidak ditemukan.';
    END IF;

    IF v_post_author <> NEW.owner_id THEN
        RAISE EXCEPTION 'owner_id percakapan harus sama dengan pemilik postingan.';
    END IF;

    IF NEW.owner_id = NEW.partner_id THEN
        RAISE EXCEPTION 'Percakapan tidak boleh dengan diri sendiri.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_conversation_membership() FROM PUBLIC;

DROP TRIGGER IF EXISTS conversations_validate_membership ON public.conversations;

CREATE TRIGGER conversations_validate_membership
    BEFORE INSERT OR UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_conversation_membership();

-- =========================================================
-- 6. Trigger: validasi pengirim pesan adalah peserta percakapan
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_message_sender()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner_id UUID;
    v_partner_id UUID;
BEGIN
    SELECT c.owner_id, c.partner_id
    INTO v_owner_id, v_partner_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Percakapan tidak ditemukan.';
    END IF;

    IF NEW.sender_id <> v_owner_id AND NEW.sender_id <> v_partner_id THEN
        RAISE EXCEPTION 'Anda bukan peserta percakapan ini.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_message_sender() FROM PUBLIC;

DROP TRIGGER IF EXISTS messages_validate_sender ON public.messages;

CREATE TRIGGER messages_validate_sender
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_message_sender();

-- =========================================================
-- 7. Row Level Security
-- =========================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- conversations: hanya peserta yang bisa membaca. Tidak ada policy menulis.
DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;

CREATE POLICY conversations_select_participant
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = owner_id
        OR (SELECT auth.uid()) = partner_id
    );

-- messages: hanya peserta percakapan induk yang bisa membaca.
DROP POLICY IF EXISTS messages_select_participant ON public.messages;

CREATE POLICY messages_select_participant
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (
                  c.owner_id = (SELECT auth.uid())
                  OR c.partner_id = (SELECT auth.uid())
              )
        )
    );

-- messages: hanya bisa menyisipkan pesan atas nama sendiri ke percakapan
-- tempat ia menjadi peserta. Tidak ada policy UPDATE/DELETE → pesan tidak
-- dapat diedit atau dihapus pengguna.
DROP POLICY IF EXISTS messages_insert_participant ON public.messages;

CREATE POLICY messages_insert_participant
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (
                  c.owner_id = (SELECT auth.uid())
                  OR c.partner_id = (SELECT auth.uid())
              )
        )
    );

-- Tanpa policy INSERT/UPDATE/DELETE untuk klien pada conversations.

-- =========================================================
-- 8. RPC: get_or_create_conversation
-- =========================================================
-- Idempoten: memakai ON CONFLICT pada uq_conversations_post_owner_partner,
-- aman dari race dua tab / dua klik bersamaan.
--
-- ATURAN PESERTA:
-- - p_partner_id = caller  -> ditolak (tidak boleh chat dengan diri sendiri)
-- - caller = pemilik post  -> partner sah bila:
--       a) activities.partner_id = p_partner_id (partner resmi yang diterima), atau
--       b) help_applications p_partner_id -> post_id dengan status
--          'pending' / 'accepted' (pemilik boleh menghubungi pelamar)
-- - caller bukan pemilik   -> partner harus pemilik post DAN caller wajib punya
--       hubungan sah dengan post: pelamar dengan status 'pending' / 'accepted'
--       di help_applications, atau partner pada activities (partner_id = caller).
--       Mengetahui post_id saja tidak cukup.
-- - selain itu             -> ditolak

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    p_post_id UUID,
    p_partner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_post_author UUID;
    v_partner_allowed BOOLEAN := FALSE;
    v_conversation_id UUID;
BEGIN
    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'post_id wajib diisi.';
    END IF;
    IF p_partner_id IS NULL THEN
        RAISE EXCEPTION 'partner_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    IF p_partner_id = v_caller_id THEN
        RAISE EXCEPTION 'Anda tidak dapat memulai percakapan dengan diri sendiri.';
    END IF;

    -- TAHAP 1: Lock post (protokol posts -> ... )
    SELECT author_id INTO v_post_author
    FROM public.posts
    WHERE id = p_post_id
    FOR UPDATE;

    IF v_post_author IS NULL THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan.';
    END IF;

    IF v_caller_id = v_post_author THEN
        -- Pemilik post: partner harus partner aktivitas atau pelamar yang relevan
        SELECT EXISTS (
            SELECT 1
            FROM public.activities a
            WHERE a.post_id = p_post_id
              AND a.user_id = v_post_author
              AND a.partner_id = p_partner_id
        ) OR EXISTS (
            SELECT 1
            FROM public.help_applications ha
            WHERE ha.post_id = p_post_id
              AND ha.applicant_id = p_partner_id
              AND ha.status IN ('pending', 'accepted')
        ) INTO v_partner_allowed;
    ELSE
        -- Bukan pemilik: p_partner_id harus pemilik post (tidak boleh mengarang
        -- partner lain) DAN caller harus punya hubungan sah dengan post ini.
        -- Mengetahui p_post_id saja tidak cukup sebagai bukti otorisasi.
        v_partner_allowed := (p_partner_id = v_post_author) AND (
            EXISTS (
                SELECT 1
                FROM public.help_applications ha
                WHERE ha.post_id = p_post_id
                  AND ha.applicant_id = v_caller_id
                  AND ha.status IN ('pending', 'accepted')
            ) OR EXISTS (
                SELECT 1
                FROM public.activities a
                WHERE a.post_id = p_post_id
                  AND a.partner_id = v_caller_id
            )
        );
    END IF;

    IF NOT v_partner_allowed THEN
        RAISE EXCEPTION 'Anda tidak berhak memulai percakapan ini.';
    END IF;

    -- TAHAP 2: get-or-create idempoten
    INSERT INTO public.conversations (post_id, owner_id, partner_id)
    VALUES (p_post_id, v_post_author, p_partner_id)
    ON CONFLICT (post_id, owner_id, partner_id) DO NOTHING
    RETURNING id INTO v_conversation_id;

    IF v_conversation_id IS NULL THEN
        SELECT c.id INTO v_conversation_id
        FROM public.conversations c
        WHERE c.post_id = p_post_id
          AND c.owner_id = v_post_author
          AND c.partner_id = p_partner_id
        FOR UPDATE;

        IF v_conversation_id IS NULL THEN
            RAISE EXCEPTION 'Gagal membuat percakapan.';
        END IF;
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- Supabase memberi GRANT EXECUTE langsung ke role anon, jadi REVOKE dari PUBLIC
-- saja tidak cukup (lihat catatan 010/011). anon dicabut secara eksplisit.
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated;

-- =========================================================
-- 9. RPC: send_message
-- =========================================================
-- sender_id selalu auth.uid() (tidak ada parameter pengirim); body 1-2000
-- karakter setelah trim; caller wajib peserta percakapan (dicek di sini dan
-- diulang oleh trigger validate_message_sender serta policy INSERT).

CREATE OR REPLACE FUNCTION public.send_message(
    p_conversation_id UUID,
    p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_owner_id UUID;
    v_partner_id UUID;
    v_body TEXT;
    v_message_id UUID;
BEGIN
    IF p_conversation_id IS NULL THEN
        RAISE EXCEPTION 'conversation_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    v_body := btrim(COALESCE(p_body, ''));
    IF char_length(v_body) < 1 THEN
        RAISE EXCEPTION 'Pesan tidak boleh kosong.';
    END IF;
    IF char_length(v_body) > 2000 THEN
        RAISE EXCEPTION 'Pesan maksimal 2000 karakter.';
    END IF;

    -- Lock percakapan untuk keamanan urutan lock conversations -> messages
    SELECT c.owner_id, c.partner_id
    INTO v_owner_id, v_partner_id
    FROM public.conversations c
    WHERE c.id = p_conversation_id
    FOR UPDATE;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Percakapan tidak ditemukan.';
    END IF;

    IF v_caller_id <> v_owner_id AND v_caller_id <> v_partner_id THEN
        RAISE EXCEPTION 'Anda bukan peserta percakapan ini.';
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (p_conversation_id, v_caller_id, v_body)
    RETURNING id INTO v_message_id;

    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_message(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_message(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

-- =========================================================
-- 10. Realtime
-- =========================================================
-- Menambahkan messages ke publication supabase_realtime bila tersedia.
-- RLS tetap berlaku pada perubahan yang dikirim ke klien, sehingga peserta
-- yang tidak sah tidak menerima pesan. Idempoten: dicek via pg_publication_tables.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = 'messages'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END
$$;

COMMIT;