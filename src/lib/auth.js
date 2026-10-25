import { createClient } from "./supabase/client.js";

export const SESSION_KEY = "needhelp.demo-session";

/**
 * Mengecek apakah Supabase sudah terkonfigurasi dengan variabel lingkungan.
 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Mendaftarkan akun baru di Supabase Auth.
 * Nama lengkap disimpan di metadata dan otomatis disalin ke tabel public.profiles oleh trigger PostgreSQL.
 */
export async function signUpUser(email, password, fullName) {
  const supabase = createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase belum terkonfigurasi. Silakan atur .env.local terlebih dahulu.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

/**
 * Masuk menggunakan akun email dan password di Supabase.
 */
export async function signInUser(email, password) {
  const supabase = createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase belum terkonfigurasi. Silakan atur .env.local terlebih dahulu.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Sinkronkan cache sesi lokal untuk kompatibilitas tampilan header
  if (data?.user) {
    syncLocalSession(data.user);
  }

  return { success: true, user: data.user, session: data.session };
}

/**
 * Keluar dari sesi akun aktif.
 */
export async function signOutUser() {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  clearLocalSession();
}

/**
 * Mengambil data pengguna aktif dari Supabase Auth.
 */
export async function getAuthUser() {
  const supabase = createClient();
  if (!supabase) {
    return readSession();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    clearLocalSession();
    return null;
  }

  return user;
}

/**
 * Mengambil data profil publik pengguna dari tabel public.profiles.
 */
export async function getUserProfile(userId) {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Memperbarui data profil pengguna sendiri (terlindungi oleh RLS).
 */
export async function updateUserProfile(userId, updates) {
  const supabase = createClient();
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, profile: data };
}

// ----------------------------------------------------------------------
// Utilitas Sesi Klien (Sinkronisasi Antarmuka Lokal)
// ----------------------------------------------------------------------

function syncLocalSession(user) {
  if (typeof window === "undefined") return;
  try {
    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email.split("@")[0],
      at: new Date().toISOString(),
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch {}
}

export function clearLocalSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSession(remember, user) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(user);
  try {
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, payload);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, payload);
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    window.sessionStorage.setItem(SESSION_KEY, payload);
  }
}

export function clearSession() {
  clearLocalSession();
}
