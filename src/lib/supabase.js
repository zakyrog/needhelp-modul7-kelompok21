/**
 * Modul Supabase client untuk browser (anon key saja).
 *
 * CARA KONFIGURASI:
 * 1. Salin .env.example menjadi .env.local
 * 2. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    dari dashboard Supabase → Settings → API
 * 3. Restart dev server setelah mengubah .env.local
 *
 * KEAMANAN:
 * - Hanya anon/publishable key yang digunakan di browser.
 * - JANGAN PERNAH menaruh service_role key di file ini atau env NEXT_PUBLIC_*.
 * - RLS di database melindungi data meskipun anon key terekspos.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Menilai apakah Supabase sudah dikonfigurasi dengan benar.
 * Berguna untuk feature-flagging: jika false, aplikasi bisa fallback
 * ke mode demo tanpa crash.
 *
 * @returns {boolean} true jika URL dan anon key tersedia dan bukan placeholder
 */
export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("your-supabase-url") &&
      !supabaseAnonKey.includes("your-anon-key"),
  );
}

/**
 * Instance Supabase client untuk penggunaan di browser.
 *
 * Menggunakan lazy initialization: client hanya dibuat saat pertama kali
 * diakses melalui getSupabase(). Ini mencegah crash saat modul diimpor
 * di environment yang belum memiliki env vars (misalnya SSR build atau
 * mode demo tanpa Supabase).
 *
 * Gunakan isSupabaseConfigured() SEBELUM memanggil getSupabase() untuk
 * memberikan fallback yang lebih baik ke mode demo.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 * @throws {Error} Jika Supabase belum dikonfigurasi
 */
let _client = null;

export function getSupabase() {
  if (_client) return _client;

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase belum dikonfigurasi. Salin .env.example menjadi .env.local " +
        "dan isi NEXT_PUBLIC_SUPABASE_URL serta NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "dari dashboard Supabase → Settings → API.",
    );
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Topik channel realtime
// ---------------------------------------------------------------------------

let _channelSeq = 0;

/**
 * Menghasilkan topik channel realtime yang UNIK per pemanggilan.
 *
 * Supabase client bersifat singleton dan `supabase.channel(topic)` mengembalikan
 * KEMBALI channel yang sudah ada bila topiknya sama. Bila dua pemanggil memakai
 * topik yang sama (mis. Header badge dan halaman notifikasi sama-sama `notifications:self`),
 * pemanggil kedua memasang `.on("postgres_changes", ...)` pada channel yang sudah
 * subscribe dan realtime-js melempar error
 * "cannot add postgres_changes callbacks ... after subscribe()".
 * Menyisipkan nonce membuat setiap langganan memakai channel sendiri, sehingga
 * handler selalu dipasang sebelum `.subscribe()`.
 *
 * @param {string} label - nama deskriptif untuk pembacaan log
 * @returns {string} topik unik (tanpa prefix `realtime:`; `channel()` menambahkannya)
 */
export function freshChannelTopic(label) {
  _channelSeq = (_channelSeq + 1) % Number.MAX_SAFE_INTEGER;
  const nonce =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${_channelSeq}`;
  return `${label}:${nonce}`;
}
