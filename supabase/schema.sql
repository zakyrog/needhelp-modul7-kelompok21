-- =============================================================================
-- NeedHelp — Skema Referensi Supabase
-- =============================================================================
-- File ini HANYA REFERENSI. Jangan jalankan langsung tanpa review.
-- Untuk menerapkan: buka Supabase Dashboard → SQL Editor → paste dan run.
--
-- Catatan:
-- - Tabel profiles melengkapi Supabase Auth (auth.users).
-- - Tabel posts menggunakan author_id yang merujuk ke auth.users.id.
-- - RLS diaktifkan untuk semua tabel; anon key hanya bisa operasi sesuai policy.
-- - Semua timestamp menggunakan timestamptz agar konsisten lintas zona waktu.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel Profiles (melengkapi auth.users dari Supabase Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  bio         TEXT DEFAULT '',
  avatar_url  TEXT DEFAULT '/assets/images/avatar-user.svg',
  initial     TEXT DEFAULT 'N',
  avatar_class TEXT DEFAULT 'avatar-blue',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: otomatis buat profile saat user baru mendaftar via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, initial)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Pengguna NeedHelp'),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', 'N'), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Semua authenticated users bisa membaca profil siapa pun
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- User hanya bisa update profil sendiri
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User hanya bisa insert profil sendiri (seharusnya ditangani trigger, tapi jaga-jaga)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 2. Tabel Posts
-- ---------------------------------------------------------------------------
-- Kolom disesuaikan dengan struktur data existing di src/data/posts.js
CREATE TABLE IF NOT EXISTS public.posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nature            TEXT NOT NULL CHECK (nature IN ('butuh', 'bisa')),
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 100),
  summary           TEXT DEFAULT '',
  description       TEXT NOT NULL CHECK (char_length(description) >= 20),
  category          TEXT NOT NULL CHECK (category IN ('ditemani', 'bantuan', 'pendampingan', 'explore')),
  region            TEXT NOT NULL CHECK (region IN ('sleman', 'kota', 'bantul', 'kulonprogo', 'gunungkidul')),
  address           TEXT NOT NULL CHECK (char_length(address) >= 5),
  destination       TEXT DEFAULT '',
  date              DATE NOT NULL,
  time              TIME NOT NULL,
  end_time          TIME,
  compensation      TEXT NOT NULL CHECK (compensation IN ('tarif', 'nego', 'patungan', 'traktir', 'sukarela')),
  amount            NUMERIC(12, 2),
  compensation_note TEXT DEFAULT '',
  author_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_demo           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk query umum
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_region ON public.posts(region);
CREATE INDEX IF NOT EXISTS idx_posts_nature ON public.posts(nature);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_date ON public.posts(date);
CREATE INDEX IF NOT EXISTS idx_posts_is_demo ON public.posts(is_demo);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- SELECT: semua authenticated users bisa membaca postingan (termasuk milik orang lain)
CREATE POLICY "posts_select_all"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: authenticated users bisa membuat postingan atas nama sendiri
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: hanya penulis yang bisa mengupdate postingannya sendiri
CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: hanya penulis yang bisa menghapus postingannya sendiri
CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);


-- ---------------------------------------------------------------------------
-- 3. Seed Data Demo (opsional, untuk development)
-- ---------------------------------------------------------------------------
-- Data demo ditandai is_demo = TRUE.
-- GANTI '<demo-user-uuid>' dengan UUID user demo yang dibuat via Supabase Auth.
--
-- INSERT INTO public.posts (nature, title, summary, description, category, region,
--   address, destination, date, time, end_time, compensation, amount,
--   compensation_note, author_id, is_demo)
-- VALUES
--   ('butuh', 'Butuh bantuan pindahan kos & angkat lemari',
--    'Butuh bantuan membawa lemari dan kardus pakaian dari Pogung Baru ke kos baru di Palagan.',
--    'Halo teman-teman! Saya butuh bantuan tenaga 1 orang untuk bantu angkut barang pindahan kos...',
--    'bantuan', 'sleman', 'Pogung Baru Blok D, Mlati, Sleman',
--    'Jl. Palagan KM 8, Sariharjo, Ngaglik, Sleman',
--    '2026-10-24', '09:00', '12:00', 'tarif', 50000, 'Traktir makan siang',
--    '<demo-user-uuid>', TRUE);
