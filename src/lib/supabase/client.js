import { createBrowserClient } from "@supabase/ssr";

/**
 * Membuat Supabase client untuk sisi browser (Client Components).
 * Menggunakan kredensial publik anon.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Memberikan objek pembantu agar aplikasi tidak crash jika kredensial belum diisi di .env.local
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
