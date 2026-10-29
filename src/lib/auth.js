import { CURRENT_USER } from "./data.js";
import { isSupabaseConfigured, getSupabase } from "./supabase.js";

export const SESSION_KEY = "needhelp.demo-session";
const SUPABASE_SESSION_KEY = "needhelp.supabase-session";

// ---------------------------------------------------------------------------
// Demo Session (sync, backward-compatible)
// ---------------------------------------------------------------------------

/**
 * Membaca sesi demo dari localStorage/sessionStorage.
 * Hanya menerima user yang cocok dengan CURRENT_USER.
 * @returns {Object|null}
 */
function readDemoSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (
      session &&
      typeof session === "object" &&
      session.id === CURRENT_USER.id &&
      session.email === CURRENT_USER.email
    ) {
      return session;
    }
    return null;
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
    // Storage quota or restriction fallback
    window.sessionStorage.setItem(SESSION_KEY, payload);
  }
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Supabase Session Helpers
// ---------------------------------------------------------------------------

/**
 * Menyimpan metadata sesi Supabase ke localStorage agar readSession() sync
 * bisa mendeteksi bahwa user sedang login via Supabase tanpa perlu await.
 * Metadata ini BUKAN token auth — hanya cache identitas untuk UI sync.
 * Token auth dikelola oleh Supabase client secara internal.
 */
function writeSupabaseSessionCache(user) {
  if (typeof window === "undefined" || !user) return;
  try {
    window.localStorage.setItem(
      SUPABASE_SESSION_KEY,
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
        at: new Date().toISOString(),
      }),
    );
  } catch {}
}

function clearSupabaseSessionCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SUPABASE_SESSION_KEY);
  } catch {}
}

function readSupabaseSessionCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SUPABASE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.id && session.email) return session;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Unified readSession (sync, dual-mode)
// ---------------------------------------------------------------------------

/**
 * Membaca sesi pengguna secara sinkron.
 * - Jika Supabase terkonfigurasi: baca cache sesi Supabase.
 * - Jika tidak: baca sesi demo dari localStorage.
 * - Tidak pernah mengembalikan keduanya sekaligus.
 *
 * @returns {Object|null} Objek sesi {id, email, name, at} atau null
 */
export function readSession() {
  if (isSupabaseConfigured()) {
    // Mode Supabase: hanya terima sesi Supabase, abaikan sesi demo
    return readSupabaseSessionCache();
  }
  // Mode demo: hanya terima sesi demo
  return readDemoSession();
}

// ---------------------------------------------------------------------------
// Async Supabase Auth Functions
// ---------------------------------------------------------------------------

/**
 * Mengambil user yang sedang login dari Supabase Auth (async).
 * Gunakan ini saat butuh verifikasi server-side atau sebelum operasi sensitif.
 *
 * @returns {Promise<Object|null>} User object Supabase atau null
 */
export async function getSupabaseUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Login dengan email dan password via Supabase Auth.
 * Setelah berhasil, menyimpan cache sesi untuk readSession() sync.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured()) {
    return { user: null, error: "Supabase belum dikonfigurasi." };
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      return { user: null, error: error.message };
    }
    if (data.user) {
      // Bersihkan sesi demo agar tidak ada dual-session
      clearDemoSession();
      // Simpan cache sesi Supabase
      writeSupabaseSessionCache(data.user);
      return { user: data.user, error: null };
    }
    return { user: null, error: "Login berhasil tetapi data user tidak tersedia." };
  } catch (err) {
    return { user: null, error: err.message || "Terjadi kesalahan saat login." };
  }
}

/**
 * Registrasi akun baru via Supabase Auth.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} name - Nama tampilan untuk disimpan di user_metadata
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function signUp(email, password, name) {
  if (!isSupabaseConfigured()) {
    return { user: null, error: "Supabase belum dikonfigurasi." };
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });
    if (error) {
      return { user: null, error: error.message };
    }
    if (data.user) {
      clearDemoSession();
      writeSupabaseSessionCache(data.user);
      return { user: data.user, error: null };
    }
    return { user: null, error: "Registrasi berhasil tetapi data user tidak tersedia." };
  } catch (err) {
    return { user: null, error: err.message || "Terjadi kesalahan saat registrasi." };
  }
}

/**
 * Logout: membersihkan sesi sesuai mode aktif.
 * - Supabase: panggil signOut() + hapus cache sesi Supabase + hapus sesi demo.
 * - Demo: hanya hapus sesi demo.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {
      // Lanjutkan pembersihan lokal meskipun signOut API gagal
    }
    clearSupabaseSessionCache();
  }
  clearDemoSession();
}

// Backward-compatible alias
export const clearSession = () => {
  // Untuk kompatibilitas sync caller lama (Header.jsx dll.)
  // Lakukan pembersihan sync; signOut async sebaiknya dipanggil terpisah
  if (isSupabaseConfigured()) {
    clearSupabaseSessionCache();
  }
  clearDemoSession();
};

export { CURRENT_USER };
