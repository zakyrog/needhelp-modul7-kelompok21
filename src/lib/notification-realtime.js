import { getSupabase, isSupabaseConfigured, freshChannelTopic } from "./supabase.js";

/**
 * Berlangganan INSERT notifikasi milik pengguna yang sedang login.
 * RLS notifications_select_own menyaring baris, sehingga klien hanya menerima
 * notifikasi untuk dirinya sendiri walau langganan tidak memakai filter.
 *
 * Mengembalikan fungsi berhenti. Aman dipanggil tanpa sesi / tanpa konfigurasi.
 *
 * @param {(row: Object) => void} onNotification - baris mentah notifications
 * @param {(status: string, err?: Error) => void} [onStatus]
 * @returns {() => void}
 */
export function subscribeToNotifications(onNotification, onStatus) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabase();

  const channel = supabase
    .channel(freshChannelTopic("notifications:self"))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      (payload) => {
        if (payload?.new) onNotification(payload.new);
      },
    )
    .subscribe((status, err) => {
      if (onStatus) onStatus(status, err);
    });

  return () => {
    try {
      supabase.removeChannel(channel).catch(() => {
        // channel sudah ditutup / gagal unsubscribe — abaikan.
      });
    } catch {
      // channel sudah ditutup
    }
  };
}

/**
 * Berlangganan perubahan pada SATU baris posts (judul diubah / postingan dihapus
 * / status siklus hidup berubah). Dipakai kartu "Topik Percakapan" agar judul
 * dan status tidak berasal dari state lama setelah postingan selesai,
 * dibatalkan, atau dihapus.
 *
 * Mengembalikan fungsi berhenti. `onChange` dipanggil untuk setiap perubahan
 * baris; pemanggil memuat ulang statusnya sendiri karena payload realtime tidak
 * memuat baris lama pada DELETE.
 *
 * Catatan: tabel posts HARUS ikut publication `supabase_realtime` agar event
 * ini benar-benar terkirim. Migration 014 hanya menambahkan `notifications`;
 * pemanggil tetap menyediakan pemuatan ulang (mis. saat berpindah percakapan)
 * sehingga fungsi tetap benar walau event tidak pernah datang.
 *
 * @param {string|null} postId
 * @param {() => void} onChange
 * @returns {() => void}
 */
export function subscribeToPostChanges(postId, onChange) {
  if (!isSupabaseConfigured() || !postId) return () => {};
  const supabase = getSupabase();

  const channel = supabase
    .channel(freshChannelTopic(`post:${postId}`))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `id=eq.${postId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel).catch(() => {
        // channel sudah ditutup / gagal unsubscribe — abaikan.
      });
    } catch {
      // channel sudah ditutup
    }
  };
}
