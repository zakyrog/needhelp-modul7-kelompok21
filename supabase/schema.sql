-- ====================================================================
-- SKEMA BASIS DATA SUPABASE — NEEDHELP JOGJA
-- Versi: 2.0.0
-- Platform: Supabase PostgreSQL (dengan Supabase Auth & RLS)
-- ====================================================================

-- 1. PROFIL PENGGUNA (Terkoneksi ke auth.users)
-- PERLINDUNGAN PRIVASI EMAIL: Kolom email sengaja TIDAK disimpan di public.profiles.
-- Email dikelola secara privat dan terenkripsi di skema auth.users, dan hanya dapat
-- diakses oleh pemilik akun yang bersangkutan melalui sesi JWT (supabase.auth.getUser()).
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    rating_average NUMERIC(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger untuk membuat profil secara otomatis saat pendaftaran berhasil di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT different_chat_users CHECK (user1_id <> user2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_users 
ON public.chat_threads (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));


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
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 6. TABEL KEGIATAN (Activities)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID UNIQUE NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'terjadwal' CHECK(status IN ('terjadwal', 'berlangsung', 'selesai', 'batal')),
    cancellation_reason TEXT DEFAULT '',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- Trigger untuk mengkalkulasi ulang rating_average dan rating_count pada profil
CREATE OR REPLACE FUNCTION public.recalculate_user_rating()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE POLICY "Hanya peserta thread yang dapat mengirim pesan"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = sender_id
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

CREATE POLICY "Pihak yang terlibat dapat membuat atau memperbarui deal"
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

CREATE POLICY "Peninjau terautentikasi dapat mengirim ulasan"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = reviewer_id
        AND reviewer_id <> reviewee_id
    );
