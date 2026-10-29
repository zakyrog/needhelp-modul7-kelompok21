BEGIN;

-- =========================================================
-- 1. Tabel activities
-- =========================================================

CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL
        REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'menunggu'
        CHECK (status IN ('menunggu', 'berlangsung', 'selesai', 'batal')),
    partner_name TEXT DEFAULT '',
    partner_id UUID DEFAULT NULL,
    note TEXT DEFAULT '',
    review_rating SMALLINT DEFAULT NULL
        CHECK (review_rating BETWEEN 1 AND 5),
    review_comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 2. Indeks
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_activities_user_id
    ON public.activities(user_id);

CREATE INDEX IF NOT EXISTS idx_activities_post_id
    ON public.activities(post_id);

CREATE INDEX IF NOT EXISTS idx_activities_status
    ON public.activities(status);

-- =========================================================
-- 3. Periksa duplikat sebelum membuat UNIQUE constraint
-- =========================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.activities
        GROUP BY user_id, post_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Migrasi dibatalkan: ditemukan duplikat user_id dan post_id pada activities. Periksa dan selesaikan duplikat terlebih dahulu.';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_activities_user_post'
          AND conrelid = 'public.activities'::regclass
    ) THEN
        ALTER TABLE public.activities
            ADD CONSTRAINT uq_activities_user_post
            UNIQUE (user_id, post_id);
    END IF;
END
$$;

-- =========================================================
-- 4. Trigger updated_at
-- Memastikan fungsi pendukung tersedia
-- =========================================================

DO $$
BEGIN
    IF to_regprocedure('public.update_updated_at()') IS NULL THEN
        RAISE EXCEPTION
            'Fungsi public.update_updated_at() tidak ditemukan. Periksa schema.sql sebelum melanjutkan.';
    END IF;
END
$$;

DROP TRIGGER IF EXISTS activities_updated_at
    ON public.activities;

CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- =========================================================
-- 5. Fungsi validasi kepemilikan postingan
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_activity_post_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.posts
        WHERE id = NEW.post_id
          AND author_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION
            'post_id tidak dimiliki oleh user_id yang bersangkutan';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_validate_post_owner
    ON public.activities;

CREATE TRIGGER activities_validate_post_owner
    BEFORE INSERT OR UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_activity_post_ownership();

-- =========================================================
-- 6. Aktifkan Row Level Security
-- =========================================================

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- SELECT: pengguna hanya membaca aktivitas miliknya
DROP POLICY IF EXISTS activities_select_own
    ON public.activities;

CREATE POLICY activities_select_own
    ON public.activities
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- INSERT: pengguna hanya membuat aktivitas atas namanya
DROP POLICY IF EXISTS activities_insert_own
    ON public.activities;

CREATE POLICY activities_insert_own
    ON public.activities
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE: pengguna hanya memperbarui aktivitas miliknya
DROP POLICY IF EXISTS activities_update_own
    ON public.activities;

CREATE POLICY activities_update_own
    ON public.activities
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Tidak membuat policy DELETE:
-- pembatalan menggunakan status 'batal'.

COMMIT;