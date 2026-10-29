-- =============================================================================
-- Migration 014: Notifikasi dalam aplikasi (pesan, pengajuan, status pengajuan)
-- =============================================================================
-- KENAPA TABEL BARU: sebelum migration ini tidak ada tabel/fungsi notifikasi
-- sama sekali (halaman /notifikasi dan badge header masih data statis).
-- Tidak ada struktur lama yang bisa dipakai ulang.
--
-- SUMBER NOTIFIKASI (dibuat di SERVER lewat trigger, bukan dari frontend):
--   messages.kind            = 'chat'
--     AFTER INSERT ON public.messages  -> penerima = lawan bicara pengirim
--   help_applications.kind   = 'application'
--     AFTER INSERT  -> penerima = pemilik postingan (bukan pengaju)
--   help_applications.kind   = 'application_status'
--     AFTER UPDATE OF status -> penerima = pihak TERDAMPAK, bukan pelaku:
--       * pemilik menerima/menolak -> pelamar menerima notifikasi
--       * pelamar menarik          -> pemilik postingan menerima notifikasi
--     Hanya transisi status yang nyata (OLD.status berbeda dengan NEW.status).
--     Dibuat HANYA di trigger, sehingga tidak ada duplikasi dari frontend.
--
-- AKSES:
--   - RLS: pengguna hanya bisa SELECT baris miliknya (recipient_id = auth.uid()).
--   - UPDATE hanya lewat RPC mark_notification_read / mark_all_notifications_read
--     (SECURITY DEFINER, search_path = '', recipient_id dicek di dalam fungsi),
--     sehingga pengguna tidak bisa menandai baris milik orang lain.
--   - Tidak ada policy INSERT/DELETE untuk klien. Trigger yang menulis.
--   - Realtime: publication supabase_realtime, RLS tetap menyaring baris.
--
-- PRASYARAT: schema.sql, 002, 003, 004, 012 (tabel messages/help_applications).
-- Tidak mengubah tabel, RPC, atau policy yang sudah ada.
--
-- IDEMPOTEN: CREATE TABLE/INDEX/EXTENSION IF NOT EXISTS, CREATE OR REPLACE
-- FUNCTION, DROP TRIGGER IF EXISTS, DROP POLICY IF EXISTS, serta prasyarat
-- yang idempoten diulang aman.
-- =============================================================================

BEGIN;

-- =========================================================
-- 1. Prasyarat
-- =========================================================
DO $$
BEGIN
    IF to_regclass('public.posts') IS NULL
       OR to_regclass('public.help_applications') IS NULL
       OR to_regclass('public.messages') IS NULL
       OR to_regclass('public.conversations') IS NULL
       OR to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: public.posts, profiles, help_applications, conversations, dan messages harus ada. Jalankan schema.sql, 002, 003, dan 012 terlebih dahulu.';
    END IF;

    IF to_regprocedure('auth.uid()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Fungsi auth.uid() tidak ditemukan.';
    END IF;

    -- gen_random_uuid(): bawaan PostgreSQL 13+ (pg_catalog) atau dari pgcrypto di
    -- proyek lama. Kedua lokasi diperiksa agar migration tidak gagal di keduanya.
    IF to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL
       AND to_regprocedure('public.gen_random_uuid()') IS NULL THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: gen_random_uuid() tidak tersedia. Aktifkan ekstensi pgcrypto.';
    END IF;

    -- Trigger AFTER INSERT messages wajib ada (dibuat migration 012). Tanpa itu,
    -- notifikasi chat tidak pernah dibuat.
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'messages_validate_sender'
          AND tgrelid = 'public.messages'::regclass
    ) THEN
        RAISE EXCEPTION 'PRASYARAT GAGAL: Trigger messages_validate_sender tidak ditemukan. Jalankan migration 012 terlebih dahulu.';
    END IF;
END
$$;

-- =========================================================
-- 2. Tabel notifications
-- =========================================================
-- recipient_id : penerima (selalu auth.uid() dari sisi server)
-- actor_id     : pelaku kejadian (nama ditampilkan; boleh NULL bila tidak ada)
-- kind         : jenis notifikasi, dipakai UI untuk ikon dan tautan
--
-- payload berisi data minimal untuk tautan dan teks, misalnya:
--   chat              : {conversation_id, post_id, sender_name, preview}
--   application       : {application_id, post_id, applicant_name, post_title}
--   application_status: {application_id, post_id, status, post_title, other_name}
-- Semua nilai payload diisi dari server; frontend hanya membaca.

CREATE TABLE IF NOT EXISTS public.notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    kind         TEXT NOT NULL
                 CHECK (kind IN ('chat', 'application', 'application_status')),
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    href         TEXT NOT NULL,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_notifications_recipient_not_actor
        CHECK (actor_id IS NULL OR actor_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_recent
    ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(recipient_id)
    WHERE read_at IS NULL;

-- =========================================================
-- 2b. Verifikasi tabel yang SUDAH ADA (CREATE TABLE IF NOT EXISTS tidak
--     membandingkan skema)
-- =========================================================
-- Bila public.notifications sudah dibuat manual sebelum migration ini
-- diterapkan, IF NOT EXISTS hanya melewati pembuatan tabel. Seluruh isi di bawah
-- (RPC, trigger, RLS) mengasumsikan kolom dan nilai kind tertentu; tabel lama
-- dengan bentuk berbeda akan membuat trigger GAGAL dan membatalkan INSERT
-- pesan/pengajuan. Karena itu skema ASUMSI diperiksa lebih dulu.

DO $$
DECLARE
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_column  TEXT;
BEGIN
    IF to_regclass('public.notifications') IS NULL THEN
        RETURN; -- tidak mungkin: blok 2 sudah membuatnya
    END IF;

    FOREACH v_column IN ARRAY ARRAY[
        'id', 'recipient_id', 'actor_id', 'kind',
        'title', 'body', 'href', 'payload', 'read_at', 'created_at'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'notifications'
              AND column_name = v_column
        ) THEN
            v_missing := v_missing || ('kolom ' || quote_literal(v_column))::TEXT;
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE EXCEPTION 'SKEMA GAGAL: public.notifications sudah ada tetapi kolom % (recipient_id/payload/read_at/kind/...) tidak lengkap. Rename/perbaiki tabel lama sebelum menerapkan 014.', array_to_string(v_missing, ', ');
    END IF;
    -- Catatan: nama kolom yang wajib ada di atas — id, recipient_id, actor_id,
    -- kind, title, body, href, payload, read_at, created_at.

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'kind'
          AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'SKEMA GAGAL: kolom kind public.notifications harus bertipe text (dipakai trigger).';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'payload'
          AND data_type = 'jsonb'
    ) THEN
        RAISE EXCEPTION 'SKEMA GAGAL: kolom payload public.notifications harus bertipe jsonb (mark_conversation_read memakai payload->>).';
    END IF;

    -- Nilai kind yang dibutuhkan frontend/trigger: 'chat', 'application',
    -- 'application_status'. Constraint manual boleh bernama lain, jadi semua
    -- CHECK pada tabel diperiksa.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = 'public.notifications'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%''chat''%'
          AND pg_get_constraintdef(c.oid) LIKE '%''application''%'
          AND pg_get_constraintdef(c.oid) LIKE '%''application_status''%'
    ) THEN
        RAISE EXCEPTION 'SKEMA GAGAL: public.notifications harus mengizinkan kind ''chat'', ''application'', dan ''application_status''.';
    END IF;

    -- Blok 3 mengaktifkan RLS; peringatan di bawah menandai tabel peninggalan
    -- yang belum punya RLS agar tidak diam-diam lolos.
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notifications'::regclass) THEN
        RAISE NOTICE 'public.notifications ditemukan tanpa RLS; blok 3 mengaktifkannya.';
    END IF;
END
$$;

-- =========================================================
-- 3. RLS
-- =========================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (recipient_id = (SELECT auth.uid()));

-- Tidak ada policy INSERT/UPDATE/DELETE untuk authenticated.
-- Penulisan dilakukan trigger (SECURITY DEFINER) dan RPC di bawah.

-- =========================================================
-- 4. RPC: tandai dibaca (dibatasi milik pemanggil)
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_updated   INTEGER;
BEGIN
    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'notification_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    -- recipient_id = caller wajib: baris milik orang lain tidak tersentuh.
    UPDATE public.notifications
    SET read_at = COALESCE(read_at, now())
    WHERE id = p_notification_id
      AND recipient_id = v_caller_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_updated   INTEGER;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    UPDATE public.notifications
    SET read_at = now()
    WHERE recipient_id = v_caller_id
      AND read_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- =========================================================
-- 4b. RPC: tandai pesan chat percakapan ini sudah dibaca
-- =========================================================
-- Migration 012 tidak punya jalur bagi klien untuk menulis status baca
-- percakapan. RPC ini menandai notifikasi 'chat' milik percakapan tersebut,
-- hanya bila pemanggil benar-benar peserta percakapan (dicek di server).
-- Tidak mengubah messages/conversations.

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_owner_id UUID;
    v_partner_id UUID;
    v_updated INTEGER;
BEGIN
    IF p_conversation_id IS NULL THEN
        RAISE EXCEPTION 'conversation_id wajib diisi.';
    END IF;

    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Anda harus masuk terlebih dahulu.';
    END IF;

    SELECT c.owner_id, c.partner_id
    INTO v_owner_id, v_partner_id
    FROM public.conversations c
    WHERE c.id = p_conversation_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Percakapan tidak ditemukan.';
    END IF;

    IF v_caller_id <> v_owner_id AND v_caller_id <> v_partner_id THEN
        RAISE EXCEPTION 'Anda bukan peserta percakapan ini.';
    END IF;

    UPDATE public.notifications
    SET read_at = COALESCE(read_at, now())
    WHERE recipient_id = v_caller_id
      AND kind = 'chat'
      AND read_at IS NULL
      AND payload->>'conversation_id' = p_conversation_id::TEXT;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- =========================================================
-- 5. Trigger: pesan baru -> notifikasi untuk lawan bicara
-- =========================================================
-- Pengirim dikecualikan secara eksplisit: penerima = peserta lain, bukan sender.
-- sender_name diambil dari profiles (nama pemilik post / partner).

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner_id       UUID;
    v_partner_id     UUID;
    v_post_id        UUID;
    v_recipient_id   UUID;
    v_sender_name    TEXT;
    v_preview        TEXT;
BEGIN
    SELECT c.owner_id, c.partner_id, c.post_id
    INTO v_owner_id, v_partner_id, v_post_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_owner_id IS NULL THEN
        RETURN NEW; -- percakapan tidak ditemukan; FK seharusnya mencegah ini
    END IF;

    IF NEW.sender_id = v_owner_id THEN
        v_recipient_id := v_partner_id;
    ELSIF NEW.sender_id = v_partner_id THEN
        v_recipient_id := v_owner_id;
    ELSE
        RETURN NEW; -- pengirim bukan peserta (ditolak trigger 012)
    END IF;

    IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(btrim(p.name), ''), 'Pengguna NeedHelp')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;

    v_sender_name := COALESCE(v_sender_name, 'Pengguna NeedHelp');

    -- Cuplikan aman: dibatasi 100 karakter, baris baru dilipat menjadi spasi.
    v_preview := left(regexp_replace(NEW.body, '\s+', ' ', 'g'), 100);

    INSERT INTO public.notifications (recipient_id, actor_id, kind, title, body, href, payload)
    VALUES (
        v_recipient_id,
        NEW.sender_id,
        'chat',
        'Pesan baru dari ' || v_sender_name,
        v_preview,
        '/chat?c=' || NEW.conversation_id::TEXT,
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'post_id', v_post_id,
            'sender_name', v_sender_name,
            'preview', v_preview,
            'message_id', NEW.id
        )
    );

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM PUBLIC;

DROP TRIGGER IF EXISTS messages_notify_recipient ON public.messages;
CREATE TRIGGER messages_notify_recipient
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_message();

-- =========================================================
-- 6. Trigger: pengajuan baru / perubahan status pengajuan
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_on_help_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_post_author      UUID;
    v_post_title       TEXT;
    v_applicant_name   TEXT;
    v_actor            UUID;
    v_actor_name       TEXT;
    v_reason           TEXT;
    v_recipient_id     UUID;
    v_status_label     TEXT;
BEGIN
    SELECT p.author_id, p.title
    INTO v_post_author, v_post_title
    FROM public.posts p
    WHERE p.id = NEW.post_id;

    IF v_post_author IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(btrim(p.name), ''), 'Pengguna NeedHelp')
    INTO v_applicant_name
    FROM public.profiles p
    WHERE p.id = NEW.applicant_id;

    v_applicant_name := COALESCE(v_applicant_name, 'Pengguna NeedHelp');

    IF TG_OP = 'INSERT' THEN
        -- Pelaku = pengaju (NEW.applicant_id); penerima = pemilik postingan.
        -- Pengaju tidak pernah menerima notifikasi untuk tindakannya sendiri.
        IF NEW.applicant_id = v_post_author THEN
            RETURN NEW; -- dijaga juga oleh RPC 010/003
        END IF;

        INSERT INTO public.notifications (recipient_id, actor_id, kind, title, body, href, payload)
        VALUES (
            v_post_author,
            NEW.applicant_id,
            'application',
            'Pengajuan baru dari ' || v_applicant_name,
            v_applicant_name || ' mengajukan bantuan untuk "' || v_post_title || '".',
            '/pengajuan?application=' || NEW.id::TEXT,
            jsonb_build_object(
                'application_id', NEW.id,
                'post_id', NEW.post_id,
                'applicant_name', v_applicant_name,
                'post_title', v_post_title
            )
        );

        RETURN NEW;
    END IF;

    -- UPDATE: hanya transisi status yang nyata yang menghasilkan notifikasi.
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    -- Penerima = pihak yang TERDAMPAK, bukan pelaku tindakan.
    -- Dua aktor yang mungkin: pemilik postingan (menerima/menolak) atau
    -- pelamar (menarik). Ditentukan dari transisi yang terjadi.
    -- v_actor adalah PEMBUAT notifikasi (who), v_reason adalah ALASAN lampiran
    -- pada postingan (what) — keduanya bukan orang yang sama untuk penerimaan/
    -- penolakan, jadi nama yang ditampilkan diambil dari pelaku, bukan pengaju.
    IF NEW.status = 'withdrawn' AND OLD.status = 'pending' THEN
        -- Pelamar menarik: pelakunya pelamar, penerima pemilik postingan.
        v_recipient_id := v_post_author;
        v_actor := NEW.applicant_id;
        v_reason := 'pengajuan "' || COALESCE(v_post_title, 'tanpa judul') || '"';
        v_status_label := 'menarik';
    ELSIF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
        -- Pemilik menerima/menolak: pelaku pemilik, penerima pelamar.
        v_recipient_id := NEW.applicant_id;
        v_actor := v_post_author;
        v_reason := 'pengajuan Anda untuk "' || COALESCE(v_post_title, 'tanpa judul') || '"';
        v_status_label := CASE NEW.status
            WHEN 'accepted' THEN 'menerima'
            ELSE 'menolak'
        END;
    ELSE
        -- Transisi lain (mis. pengajuan diterima lalu dibatalkan) tidak
        -- menghasilkan notifikasi agar tidak ada duplikasi/salah penerima.
        RETURN NEW;
    END IF;

    IF v_recipient_id IS NULL OR v_recipient_id = v_actor THEN
        RETURN NEW; -- cegah notifikasi untuk diri sendiri
    END IF;

    -- Nama pelaku (bukan pengaju) agar kalimat benar untuk kedua arah.
    SELECT COALESCE(NULLIF(btrim(p.name), ''), 'Pengguna NeedHelp')
    INTO v_actor_name
    FROM public.profiles p
    WHERE p.id = v_actor;

    v_actor_name := COALESCE(v_actor_name, 'Pengguna NeedHelp');

    INSERT INTO public.notifications (recipient_id, actor_id, kind, title, body, href, payload)
    VALUES (
        v_recipient_id,
        v_actor,
        'application_status',
        CASE
            WHEN NEW.status = 'withdrawn' THEN 'Pelamar menarik pengajuan'
            WHEN NEW.status = 'accepted' THEN 'Pengajuan Anda diterima'
            ELSE 'Pengajuan Anda ditolak'
        END,
        v_actor_name || ' ' || v_status_label || ' ' || v_reason || '.',
        CASE
            WHEN NEW.status = 'withdrawn' THEN '/pengajuan?application=' || NEW.id::TEXT
            WHEN NEW.status = 'accepted' THEN '/aktivitas'
            ELSE '/pengajuan?application=' || NEW.id::TEXT
        END,
        jsonb_build_object(
            'application_id', NEW.id,
            'post_id', NEW.post_id,
            'status', NEW.status,
            'post_title', v_post_title
        )
    );

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_help_application() FROM PUBLIC;

DROP TRIGGER IF EXISTS help_applications_notify_owner ON public.help_applications;
CREATE TRIGGER help_applications_notify_owner
    AFTER INSERT OR UPDATE OF status ON public.help_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_help_application();

-- =========================================================
-- 7. Realtime (RLS tetap menyaring; setiap klien hanya menerima barisnya)
-- =========================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = 'notifications'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    -- posts: dibutuhkan kartu "Topik Percakapan" agar judul/status/hapus
    -- postingan terlihat tanpa muat ulang halaman. Migration 012 hanya
    -- menambahkan messages, jadi posts belum tentu ada di publikasi.
    -- Tanpa baris ini langganan realtime di klien tidak akan pernah menerima
    -- event; UI tetap benar karena status dimuat ulang saat berpindah
    -- percakapan, hanya tidak otomatis.
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = 'posts'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;
END
$$;

-- =========================================================
-- 8. BATASAN YANG TIDAK DIJAMIN OLEH MIGRATION INI
-- =========================================================
-- 1) accept_help_application (004) ikut MENGUBAH pengajuan pending lain pada
--    postingan yang sama menjadi 'rejected' (TAHAP 6). Trigger ini membaca
--    setiap transisi pending -> rejected, sehingga semua pelamar lain menerima
--    notifikasi "ditolak" saat satu pengajuan diterima. Itu memang perilaku yang
--    diinginkan (mereka benar-benar ditolak), tetapi artinya sekali klik Terima
--    dapat menghasilkan beberapa baris notifikasi. Bukan duplikat: satu baris
--    per pengajuan, dengan application_id berbeda.
-- 2) Trigger berjalan SECURITY DEFINER di transaksi yang sama dengan INSERT
--    pesan/pengajuan. Bila INSERT notifikasi gagal (CHECK/FK), pesan atau
--    pengajuan ikut dibatalkan. Prasyarat dan blok 2b memeriksa bentuk tabel
--    agar kegagalan itu tidak terjadi karena skema tabel berbeda.
-- 3) FK actor_id REFERENCES auth.users(id) ON DELETE SET NULL butuh privilese
--    pemilik auth.users; di Supabase SQL Editor (postgres) biasanya tersedia.
-- 4) Penambahan notifications dan posts ke publication supabase_realtime
--    dilewati bila publikasi tidak ada. Tanpa realtime, UI tetap benar setelah
--    muat ulang/pindah percakapan, hanya tidak otomatis.
-- 5) Notifikasi TIDAK dihapus saat postingan dihapus (013 hanya membersihkan
--    messages/conversations). Baris notifikasi lama menjadi tautan mati;
--    halaman /pengajuan dan /chat menampilkan keadaan kosong, bukan error.
-- =========================================================

COMMIT;
