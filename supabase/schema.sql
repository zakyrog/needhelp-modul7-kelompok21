-- ====================================================================
-- SKEMA BASIS DATA SUPABASE — NEEDHELP JOGJA
-- Versi: 2.2.0 (Transactional & Integrity Hardened)
-- Platform: Supabase PostgreSQL (dengan Supabase Auth, RLS, & Atomic RPCs)
-- ====================================================================

-- 1. TABEL PROFIL PENGGUNA (Terkoneksi ke auth.users)
-- Email tidak disimpan di tabel profil publik untuk perlindungan privasi.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    rating_average NUMERIC(3,2) DEFAULT 0.0 CHECK (rating_average >= 0.0 AND rating_average <= 5.0),
    rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cabut hak update umum; hanya kolom bio/avatar/nama yang dapat diubah oleh pemilik
REVOKE UPDATE ON public.profiles FROM authenticated, anon, public;
GRANT UPDATE (full_name, bio, avatar_url, updated_at) ON public.profiles TO authenticated;

-- Trigger pengaman reputasi: cegah manipulasi manual rating_average / rating_count dari client
CREATE OR REPLACE FUNCTION public.protect_profile_reputation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.rating_average IS DISTINCT FROM OLD.rating_average OR NEW.rating_count IS DISTINCT FROM OLD.rating_count) THEN
        IF current_setting('needhelp.system_updating_rating', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'Kolom rating_average dan rating_count dikelola otomatis oleh sistem.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_reputation ON public.profiles;
CREATE TRIGGER trg_protect_profile_reputation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_reputation();

-- Trigger otomatis untuk membuat profil saat pendaftaran akun baru di auth.users berhasil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. TABEL POSTINGAN (Saya Butuh & Saya Bisa)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nature TEXT NOT NULL CHECK(nature IN ('butuh', 'bisa')),
    title TEXT NOT NULL CHECK(char_length(title) >= 5 AND char_length(title) <= 100),
    category TEXT NOT NULL CHECK(category IN ('ditemani', 'bantuan', 'pendampingan', 'explore')),
    description TEXT NOT NULL CHECK(char_length(description) >= 20 AND char_length(description) <= 1000),
    planned_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    region TEXT NOT NULL CHECK(region IN ('sleman', 'kota', 'bantul', 'kulonprogo', 'gunungkidul')),
    address_general TEXT NOT NULL CHECK(char_length(address_general) >= 5 AND char_length(address_general) <= 150),
    compensation_type TEXT NOT NULL CHECK(compensation_type IN ('tarif', 'nego', 'patungan', 'bayarsendiri', 'traktir', 'sukarela')),
    amount NUMERIC(12,2) DEFAULT 0,
    compensation_note TEXT DEFAULT '',
    quota INTEGER DEFAULT 1 CHECK(quota >= 1),
    remaining_quota INTEGER DEFAULT 1 CHECK(remaining_quota >= 0),
    status TEXT NOT NULL DEFAULT 'aktif' CHECK(status IN ('aktif', 'kuota_penuh', 'ditutup', 'kedaluwarsa')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. TABEL RUANG OBROLAN (Chat Threads)
-- Satu percakapan per pasangan pengguna per postingan
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT different_chat_users CHECK (user1_id <> user2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_post_users 
ON public.chat_threads (post_id, LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));


-- 4. TABEL PESAN OBROLAN (Chat Messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text', 'deal_card', 'system_event')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. TABEL KARTU KESEPAKATAN (In-Chat Deals)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    meetup_location TEXT NOT NULL,
    compensation_type TEXT NOT NULL,
    compensation_value TEXT NOT NULL,
    requester_agreed BOOLEAN DEFAULT FALSE,
    helper_agreed BOOLEAN DEFAULT FALSE,
    deal_version INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'diajukan' CHECK(status IN ('diajukan', 'menunggu_revisi', 'disepakati', 'ditolak', 'dibatalkan')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT different_deal_participants CHECK (requester_id <> helper_id)
);


-- 6. TABEL KEGIATAN (Activities)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID UNIQUE NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'terjadwal' CHECK(status IN ('terjadwal', 'berlangsung', 'selesai', 'batal')),
    requester_confirmed_done BOOLEAN DEFAULT FALSE,
    helper_confirmed_done BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT DEFAULT '',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT different_activity_participants CHECK (requester_id <> helper_id)
);


-- 7. TABEL ULASAN & RATING (Reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
    comment TEXT NOT NULL CHECK(char_length(comment) >= 10 AND char_length(comment) <= 500),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_review_per_activity_reviewer UNIQUE (activity_id, reviewer_id),
    CONSTRAINT no_self_review CHECK (reviewer_id <> reviewee_id)
);


-- ====================================================================
-- VALIDASI TRIGGERS & PROSEDUR KONTROL TRANSAKSI ATOMIK
-- ====================================================================

-- Trigger 1: Validasi Ketat Pembuatan Deal (INSERT DEALS)
CREATE OR REPLACE FUNCTION public.validate_deal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_thread RECORD;
    v_post RECORD;
    current_uid UUID := auth.uid();
BEGIN
    -- Validasi 1: Peserta harus berbeda
    IF NEW.requester_id = NEW.helper_id THEN
        RAISE EXCEPTION 'Pemohon dan penolong harus merupakan pengguna yang berbeda.';
    END IF;

    -- Validasi 2: Status awal wajib 'diajukan' dan versi 1
    IF NEW.status <> 'diajukan' OR NEW.deal_version <> 1 THEN
        RAISE EXCEPTION 'Status awal kesepakatan harus diajukan pada versi 1.';
    END IF;

    -- Validasi 3: Pembuat harus merupakan salah satu peserta
    IF current_uid IS DISTINCT FROM NEW.requester_id AND current_uid IS DISTINCT FROM NEW.helper_id THEN
        RAISE EXCEPTION 'Pembuat kesepakatan harus merupakan pemohon atau penolong yang sah.';
    END IF;

    -- Validasi 4: Pembuat tidak boleh memberikan persetujuan atas nama pihak lain
    IF current_uid = NEW.requester_id AND NEW.helper_agreed = TRUE THEN
        RAISE EXCEPTION 'Pemohon tidak dapat memberikan persetujuan atas nama penolong.';
    END IF;
    IF current_uid = NEW.helper_id AND NEW.requester_agreed = TRUE THEN
        RAISE EXCEPTION 'Penolong tidak dapat memberikan persetujuan atas nama pemohon.';
    END IF;

    -- Validasi 5: Thread obrolan harus ada dan pesertanya cocok
    SELECT * INTO v_thread FROM public.chat_threads WHERE id = NEW.thread_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ruang obrolan rujukan tidak ditemukan.';
    END IF;
    IF NOT (
        (v_thread.user1_id = NEW.requester_id AND v_thread.user2_id = NEW.helper_id) OR
        (v_thread.user2_id = NEW.requester_id AND v_thread.user1_id = NEW.helper_id)
    ) THEN
        RAISE EXCEPTION 'Peserta kesepakatan tidak cocok dengan peserta obrolan.';
    END IF;
    IF v_thread.post_id <> NEW.post_id THEN
        RAISE EXCEPTION 'Postingan rujukan kesepakatan tidak cocok dengan konteks obrolan.';
    END IF;

    -- Validasi 6: Postingan harus cocok dengan peran
    SELECT * INTO v_post FROM public.posts WHERE id = NEW.post_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Postingan rujukan tidak ditemukan.';
    END IF;
    IF v_post.nature = 'butuh' AND v_post.author_id <> NEW.requester_id THEN
        RAISE EXCEPTION 'Pada postingan Saya Butuh, pembuat postingan harus menjadi pemohon.';
    END IF;
    IF v_post.nature = 'bisa' AND v_post.author_id <> NEW.helper_id THEN
        RAISE EXCEPTION 'Pada postingan Saya Bisa, pembuat postingan harus menjadi penolong.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_deal_creation ON public.deals;
CREATE TRIGGER trg_validate_deal_creation
    BEFORE INSERT ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.validate_deal_creation();


-- Trigger 2: Otomatisasi Penerbitan Pesan Kartu Kesepakatan Resmi ke Chat
CREATE OR REPLACE FUNCTION public.notify_deal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Masukkan kartu kesepakatan resmi dari operasi tepercaya
    INSERT INTO public.chat_messages (
        thread_id,
        sender_id,
        message_type,
        content,
        metadata
    )
    VALUES (
        NEW.thread_id,
        auth.uid(),
        'deal_card',
        'Mengajukan kartu kesepakatan bantuan baru (Versi 1).',
        jsonb_build_object(
            'deal_id', NEW.id,
            'version', NEW.deal_version,
            'scheduled_date', NEW.scheduled_date,
            'scheduled_time', NEW.scheduled_time,
            'meetup_location', NEW.meetup_location,
            'compensation_type', NEW.compensation_type,
            'compensation_value', NEW.compensation_value,
            'status', NEW.status
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_deal_created ON public.deals;
CREATE TRIGGER trg_notify_deal_created
    AFTER INSERT ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.notify_deal_created();


-- Prosedur RPC 1: Menyetujui Kesepakatan secara Atomik & Kunci Kuota
CREATE OR REPLACE FUNCTION public.agree_to_deal(
    p_deal_id UUID,
    p_target_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deal RECORD;
    v_post RECORD;
    current_uid UUID := auth.uid();
    v_both_agreed BOOLEAN := FALSE;
BEGIN
    -- 1. Kunci baris deal untuk mencegah persetujuan bersamaan yang saling tumpang tindih
    SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kesepakatan tidak ditemukan.';
    END IF;

    -- 2. Validasi otoritas pemanggil
    IF current_uid IS DISTINCT FROM v_deal.requester_id AND current_uid IS DISTINCT FROM v_deal.helper_id THEN
        RAISE EXCEPTION 'Anda bukan merupakan peserta dalam kesepakatan ini.';
    END IF;

    -- 3. Mencegah persetujuan pada kesepakatan yang sudah batal, ditolak, atau selesai
    IF v_deal.status IN ('dibatalkan', 'ditolak') THEN
        RAISE EXCEPTION 'Kesepakatan telah dibatalkan atau ditolak dan tidak dapat disetujui.';
    END IF;

    -- 4. Validasi versi kesepakatan: Tolak persetujuan versi lama
    IF v_deal.deal_version <> p_target_version THEN
        RAISE EXCEPTION 'Versi kesepakatan telah diperbarui menjadi versi %. Harap tinjau ulang rincian terbaru.', v_deal.deal_version;
    END IF;

    -- 5. Catat persetujuan pihak terkait
    IF current_uid = v_deal.requester_id THEN
        v_deal.requester_agreed := TRUE;
    ELSIF current_uid = v_deal.helper_id THEN
        v_deal.helper_agreed := TRUE;
    END IF;

    -- 6. Periksa konsensus: Apakah kedua pihak sudah setuju?
    IF v_deal.requester_agreed = TRUE AND v_deal.helper_agreed = TRUE THEN
        v_both_agreed := TRUE;

        -- ATOMIK: Kunci baris postingan untuk validasi kuota
        SELECT * INTO v_post FROM public.posts WHERE id = v_deal.post_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Postingan rujukan tidak ditemukan.';
        END IF;

        -- Khusus Saya Butuh: Periksa kuota dan status postingan
        IF v_post.nature = 'butuh' THEN
            IF v_post.status IN ('ditutup', 'kedaluwarsa') THEN
                RAISE EXCEPTION 'Postingan rujukan sudah tidak aktif.';
            END IF;
            IF v_post.remaining_quota <= 0 OR v_post.status = 'kuota_penuh' THEN
                RAISE EXCEPTION 'Kuota bantuan pada postingan ini sudah terpenuhi.';
            END IF;

            -- Kurangi kuota secara aman (hanya jika deal baru pertama kali disepakati)
            IF v_deal.status <> 'disepakati' THEN
                UPDATE public.posts
                SET remaining_quota = remaining_quota - 1,
                    status = CASE WHEN remaining_quota - 1 <= 0 THEN 'kuota_penuh' ELSE status END,
                    updated_at = timezone('utc'::text, now())
                WHERE id = v_post.id;
            END IF;
        END IF;

        -- Ubah status kesepakatan menjadi disepakati
        UPDATE public.deals
        SET requester_agreed = TRUE,
            helper_agreed = TRUE,
            status = 'disepakati',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_deal_id;

        -- Buat entitas kegiatan resmi berstatus 'terjadwal'
        INSERT INTO public.activities (deal_id, post_id, requester_id, helper_id, status)
        VALUES (v_deal.id, v_deal.post_id, v_deal.requester_id, v_deal.helper_id, 'terjadwal')
        ON CONFLICT (deal_id) DO NOTHING;

        -- Kirim pesan event sistem resmi ke ruang chat
        INSERT INTO public.chat_messages (thread_id, sender_id, message_type, content, metadata)
        VALUES (
            v_deal.thread_id,
            current_uid,
            'system_event',
            'Kesepakatan resmi disetujui oleh kedua belah pihak. Kegiatan telah dijadwalkan.',
            jsonb_build_object('deal_id', v_deal.id, 'status', 'disepakati', 'version', v_deal.deal_version)
        );

        RETURN jsonb_build_object('success', true, 'status', 'disepakati', 'version', v_deal.deal_version);
    ELSE
        -- Masih menunggu pihak lainnya
        UPDATE public.deals
        SET requester_agreed = v_deal.requester_agreed,
            helper_agreed = v_deal.helper_agreed,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_deal_id;

        RETURN jsonb_build_object('success', true, 'status', v_deal.status, 'waiting_for_partner', true);
    END IF;
END;
$$;


-- Prosedur RPC 2: Mengajukan Revisi Kesepakatan (Batal Persetujuan Lama & Naikkan Versi)
CREATE OR REPLACE FUNCTION public.revise_deal(
    p_deal_id UUID,
    p_target_version INTEGER,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_meetup_location TEXT,
    p_compensation_type TEXT,
    p_compensation_value TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deal RECORD;
    current_uid UUID := auth.uid();
    v_new_version INTEGER;
BEGIN
    SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kesepakatan tidak ditemukan.';
    END IF;

    IF current_uid IS DISTINCT FROM v_deal.requester_id AND current_uid IS DISTINCT FROM v_deal.helper_id THEN
        RAISE EXCEPTION 'Anda bukan merupakan peserta dalam kesepakatan ini.';
    END IF;

    IF v_deal.status IN ('dibatalkan', 'ditolak') THEN
        RAISE EXCEPTION 'Kesepakatan yang telah dibatalkan atau ditolak tidak dapat direvisi.';
    END IF;

    IF v_deal.deal_version <> p_target_version THEN
        RAISE EXCEPTION 'Versi kesepakatan telah berubah. Harap muat ulang data terbaru.';
    END IF;

    v_new_version := v_deal.deal_version + 1;

    -- Perbarui parameter, batalkan persetujuan lawan, naikkan versi
    UPDATE public.deals
    SET scheduled_date = p_scheduled_date,
        scheduled_time = p_scheduled_time,
        meetup_location = p_meetup_location,
        compensation_type = p_compensation_type,
        compensation_value = p_compensation_value,
        deal_version = v_new_version,
        status = 'menunggu_revisi',
        requester_agreed = (current_uid = v_deal.requester_id),
        helper_agreed = (current_uid = v_deal.helper_id),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_deal_id;

    -- Terbitkan kartu kesepakatan revisi resmi ke chat
    INSERT INTO public.chat_messages (
        thread_id,
        sender_id,
        message_type,
        content,
        metadata
    )
    VALUES (
        v_deal.thread_id,
        current_uid,
        'deal_card',
        'Mengajukan revisi rincian kesepakatan (Versi ' || v_new_version || ').',
        jsonb_build_object(
            'deal_id', v_deal.id,
            'version', v_new_version,
            'scheduled_date', p_scheduled_date,
            'scheduled_time', p_scheduled_time,
            'meetup_location', p_meetup_location,
            'compensation_type', p_compensation_type,
            'compensation_value', p_compensation_value,
            'status', 'menunggu_revisi'
        )
    );

    RETURN jsonb_build_object('success', true, 'status', 'menunggu_revisi', 'version', v_new_version);
END;
$$;


-- Prosedur RPC 3: Membatalkan Kesepakatan & Sinkronisasi Kuota
CREATE OR REPLACE FUNCTION public.cancel_deal(
    p_deal_id UUID,
    p_cancellation_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deal RECORD;
    v_post RECORD;
    current_uid UUID := auth.uid();
BEGIN
    SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kesepakatan tidak ditemukan.';
    END IF;

    IF current_uid IS DISTINCT FROM v_deal.requester_id AND current_uid IS DISTINCT FROM v_deal.helper_id THEN
        RAISE EXCEPTION 'Anda bukan merupakan peserta dalam kesepakatan ini.';
    END IF;

    IF v_deal.status = 'dibatalkan' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Kesepakatan sudah berstatus dibatalkan.');
    END IF;

    -- Jika sebelumnya sudah disepakati, pulihkan kuota postingan Saya Butuh
    IF v_deal.status = 'disepakati' THEN
        SELECT * INTO v_post FROM public.posts WHERE id = v_deal.post_id FOR UPDATE;
        IF FOUND AND v_post.nature = 'butuh' THEN
            UPDATE public.posts
            SET remaining_quota = remaining_quota + 1,
                status = 'aktif',
                updated_at = timezone('utc'::text, now())
            WHERE id = v_post.id;
        END IF;

        -- Batalkan entitas kegiatan terkait
        UPDATE public.activities
        SET status = 'batal',
            cancellation_reason = p_cancellation_reason,
            updated_at = timezone('utc'::text, now())
        WHERE deal_id = v_deal.id;
    END IF;

    UPDATE public.deals
    SET status = 'dibatalkan',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_deal_id;

    -- Terbitkan pesan event sistem resmi
    INSERT INTO public.chat_messages (thread_id, sender_id, message_type, content, metadata)
    VALUES (
        v_deal.thread_id,
        current_uid,
        'system_event',
        'Kesepakatan bantuan dibatalkan. Alasan: ' || COALESCE(p_cancellation_reason, 'Tidak dicantumkan'),
        jsonb_build_object('deal_id', v_deal.id, 'status', 'dibatalkan')
    );

    RETURN jsonb_build_object('success', true, 'status', 'dibatalkan');
END;
$$;


-- Trigger 3: Kunci Perubahan & Transisi Status pada Tabel Activities
CREATE OR REPLACE FUNCTION public.enforce_activity_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Kunci identitas dan relasi
    IF (NEW.id <> OLD.id OR NEW.deal_id <> OLD.deal_id OR NEW.post_id <> OLD.post_id OR
        NEW.requester_id <> OLD.requester_id OR NEW.helper_id <> OLD.helper_id) THEN
        RAISE EXCEPTION 'Identitas kegiatan, deal_id, dan post_id tidak dapat diubah.';
    END IF;

    -- 2. Transisi status yang sah
    IF OLD.status = 'terjadwal' AND NEW.status NOT IN ('terjadwal', 'berlangsung', 'batal') THEN
        RAISE EXCEPTION 'Kegiatan terjadwal hanya dapat berpindah ke berlangsung atau batal.';
    END IF;
    IF OLD.status = 'berlangsung' AND NEW.status NOT IN ('berlangsung', 'selesai', 'batal') THEN
        RAISE EXCEPTION 'Kegiatan berlangsung hanya dapat berpindah ke selesai atau batal.';
    END IF;
    IF OLD.status IN ('selesai', 'batal') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Kegiatan yang telah selesai atau batal bersifat final dan tidak dapat diubah.';
    END IF;

    -- 3. Mencegah status 'selesai' langsung lewat UPDATE biasa tanpa konfirmasi sah
    IF NEW.status = 'selesai' AND OLD.status <> 'selesai' THEN
        IF (NEW.requester_confirmed_done IS NOT TRUE AND NEW.helper_confirmed_done IS NOT TRUE) THEN
            RAISE EXCEPTION 'Kegiatan tidak dapat diselesaikan tanpa konfirmasi penyelesaian.';
        END IF;
        NEW.completed_at := timezone('utc'::text, now());
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_activity_integrity ON public.activities;
CREATE TRIGGER trg_enforce_activity_integrity
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_integrity();


-- Prosedur RPC 4: Konfirmasi Penyelesaian Kegiatan
CREATE OR REPLACE FUNCTION public.confirm_activity_completion(
    p_activity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_act RECORD;
    current_uid UUID := auth.uid();
BEGIN
    SELECT * INTO v_act FROM public.activities WHERE id = p_activity_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kegiatan tidak ditemukan.';
    END IF;

    IF current_uid IS DISTINCT FROM v_act.requester_id AND current_uid IS DISTINCT FROM v_act.helper_id THEN
        RAISE EXCEPTION 'Anda bukan merupakan peserta dalam kegiatan ini.';
    END IF;

    IF v_act.status = 'selesai' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Kegiatan sudah berstatus selesai.');
    END IF;

    IF v_act.status = 'batal' THEN
        RAISE EXCEPTION 'Kegiatan yang dibatalkan tidak dapat diselesaikan.';
    END IF;

    -- Catat konfirmasi pihak terkait
    IF current_uid = v_act.requester_id THEN
        v_act.requester_confirmed_done := TRUE;
    ELSIF current_uid = v_act.helper_id THEN
        v_act.helper_confirmed_done := TRUE;
    END IF;

    -- Pemohon bantuan berhak menyelesaikan kegiatan secara langsung saat puas,
    -- atau ketika kedua pihak telah sama-sama mengonfirmasi selesai
    IF v_act.requester_confirmed_done = TRUE OR (v_act.requester_confirmed_done = TRUE AND v_act.helper_confirmed_done = TRUE) THEN
        UPDATE public.activities
        SET requester_confirmed_done = v_act.requester_confirmed_done,
            helper_confirmed_done = v_act.helper_confirmed_done,
            status = 'selesai',
            completed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_activity_id;

        RETURN jsonb_build_object('success', true, 'status', 'selesai');
    ELSE
        UPDATE public.activities
        SET helper_confirmed_done = v_act.helper_confirmed_done,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_activity_id;

        RETURN jsonb_build_object('success', true, 'status', v_act.status, 'waiting_requester_confirmation', true);
    END IF;
END;
$$;


-- Trigger 4: Validasi Ketat Pengiriman Ulasan (INSERT REVIEWS)
CREATE OR REPLACE FUNCTION public.validate_review_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    act RECORD;
BEGIN
    SELECT * INTO act FROM public.activities WHERE id = NEW.activity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kegiatan rujukan tidak ditemukan.';
    END IF;

    IF act.status <> 'selesai' THEN
        RAISE EXCEPTION 'Ulasan hanya dapat diberikan untuk kegiatan yang telah tuntas berstatus selesai.';
    END IF;

    IF NOT (
        (act.requester_id = NEW.reviewer_id AND act.helper_id = NEW.reviewee_id) OR
        (act.helper_id = NEW.reviewer_id AND act.requester_id = NEW.reviewee_id)
    ) THEN
        RAISE EXCEPTION 'Pemberi dan penerima ulasan harus merupakan pasangan peserta sah pada kegiatan tersebut.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review_submission ON public.reviews;
CREATE TRIGGER trg_validate_review_submission
    BEFORE INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.validate_review_submission();

-- Trigger 5: Rekalkulasi Agregat Rating Profil
CREATE OR REPLACE FUNCTION public.recalculate_user_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM set_config('needhelp.system_updating_rating', 'true', true);

    UPDATE public.profiles
    SET rating_average = COALESCE((
            SELECT ROUND(AVG(stars)::numeric, 2)
            FROM public.reviews
            WHERE reviewee_id = NEW.reviewee_id
        ), 0.0),
        rating_count = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE reviewee_id = NEW.reviewee_id
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.reviewee_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
    AFTER INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_user_rating();


-- ====================================================================
-- ATURAN KEAMANAN TINGKAT BARIS (ROW LEVEL SECURITY - RLS)
-- ====================================================================

-- 1. RLS PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil dapat dibaca oleh siapa saja (publik)"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Pengguna hanya dapat memperbarui profil miliknya sendiri"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. RLS POSTS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Postingan dapat dibaca oleh siapa saja (publik)"
    ON public.posts FOR SELECT
    USING (true);

CREATE POLICY "Pengguna terautentikasi dapat membuat postingan miliknya"
    ON public.posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);

CREATE POLICY "Pembuat postingan dapat memperbarui postingannya"
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Pembuat postingan dapat menghapus postingannya"
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);

-- 3. RLS CHAT THREADS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya peserta obrolan yang dapat melihat thread"
    ON public.chat_threads FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Pengguna terautentikasi dapat membuat thread obrolan"
    ON public.chat_threads FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND (auth.uid() = user1_id OR auth.uid() = user2_id));

-- 4. RLS CHAT MESSAGES
-- PENTING: Pengguna biasa HANYA diizinkan menyisipkan pesan 'text' biasa.
-- Pesan bertipe 'deal_card' dan 'system_event' HANYA dapat diterbitkan oleh fungsi database tepercaya (SECURITY DEFINER).
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya peserta thread yang dapat melihat pesan"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads
            WHERE id = chat_messages.thread_id
              AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
    );

CREATE POLICY "Pengguna hanya dapat mengirim pesan teks biasa ke threadnya"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = sender_id
        AND message_type = 'text'
        AND EXISTS (
            SELECT 1 FROM public.chat_threads
            WHERE id = chat_messages.thread_id
              AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
    );

-- 5. RLS DEALS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya pihak pemohon atau penolong yang dapat melihat deal"
    ON public.deals FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = helper_id);

CREATE POLICY "Pihak yang terlibat dapat membuat deal"
    ON public.deals FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND (auth.uid() = requester_id OR auth.uid() = helper_id));

CREATE POLICY "Pihak yang terlibat dapat memperbarui deal"
    ON public.deals FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = helper_id);

-- 6. RLS ACTIVITIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya pihak yang terlibat yang dapat melihat kegiatan"
    ON public.activities FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = helper_id);

CREATE POLICY "Pihak yang terlibat dapat memperbarui status kegiatan"
    ON public.activities FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = helper_id);

-- 7. RLS REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ulasan dapat dibaca oleh publik"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Peninjau terautentikasi dapat mengirim ulasan sah"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = reviewer_id
        AND reviewer_id <> reviewee_id
    );

-- Berikan izin eksekusi prosedur RPC kepada pengguna terautentikasi
GRANT EXECUTE ON FUNCTION public.agree_to_deal(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revise_deal(UUID, INTEGER, DATE, TIME, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_deal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_activity_completion(UUID) TO authenticated;
