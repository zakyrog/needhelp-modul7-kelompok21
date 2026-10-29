import { getSupabase, isSupabaseConfigured, freshChannelTopic } from "./supabase.js";

/**
 * Data layer chat nyata (tabel public.conversations + public.messages).
 *
 * Pola error mengikuti src/lib/data.js: fungsi melempar Error dengan `code` bila
 * kegagalan punya jenis yang perlu dibedakan UI (lihat RATING_ERROR_CODES),
 * dan error lain dilempar apa adanya dengan pesan berbahasa Indonesia.
 */

// ---------------------------------------------------------------------------
// Logging diagnostik SEMENTARA (tidak mencetak token/password/data sensitif).
// - Tahap sukses dicatat lewat console.log bila NEXT_PUBLIC_CHAT_DEBUG=1.
// - Kegagalan SELALU dicatat lewat console.warn agar macet mudah ditemukan.
// ---------------------------------------------------------------------------
const CHAT_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1";

function logChat(...args) {
  if (CHAT_DEBUG) console.log("[chat]", ...args);
}

function warnChat(...args) {
  console.warn("[chat]", ...args);
}

// Logging DIAGNOSTIK SEMENTARA yang SELALU terlihat di console browser (tanpa
// perlu NEXT_PUBLIC_CHAT_DEBUG=1). Hanya mencatat id/status/jumlah — bukan
// token/password/isi pesan sensitif. Dipakai untuk mencari bukti apakah event
// INSERT messages benar-benar sampai ke browser penerima. Hapus setelah akar
// masalah ditemukan; jangan dipakai untuk log operasional biasa.
function diagChat(...args) {
  console.info("[chat][diagnostik]", ...args);
}

export const CHAT_ERROR_CODES = Object.freeze({
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  NOT_PARTICIPANT: "NOT_PARTICIPANT",
  NOT_ALLOWED: "NOT_ALLOWED",
  NOT_FOUND: "NOT_FOUND",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  NOT_CONFIGURED: "NOT_CONFIGURED",
});

export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGES_PAGE_SIZE = 50;

/** Menandai error dengan `code` agar UI bisa membedakan jenis kegagalan. */
function withCode(error, code) {
  if (error && typeof error === "object") error.code = code;
  return error;
}

/**
 * Memetakan pesan error PostgreSQL/RPC ke Error berbahasa Indonesia + kode.
 * @param {string} message
 * @param {string} [fallback]
 * @returns {Error}
 */
export function mapChatError(message, fallback = "Gagal memproses percakapan.") {
  const text = String(message || "");
  if (/masuk terlebih dahulu|JWT|not authenticated/i.test(text)) {
    return withCode(new Error("Anda harus masuk terlebih dahulu."), CHAT_ERROR_CODES.NOT_AUTHENTICATED);
  }
  if (/bukan peserta/i.test(text)) {
    return withCode(new Error("Anda bukan peserta percakapan ini."), CHAT_ERROR_CODES.NOT_PARTICIPANT);
  }
  if (/tidak berhak|diri sendiri|harus sama dengan pemilik/i.test(text)) {
    return withCode(new Error("Anda tidak berhak memulai percakapan ini."), CHAT_ERROR_CODES.NOT_ALLOWED);
  }
  if (/tidak ditemukan/i.test(text)) {
    return withCode(new Error("Percakapan atau postingan tidak ditemukan."), CHAT_ERROR_CODES.NOT_FOUND);
  }
  if (/could not find the function|PGRST202|does not exist/i.test(text)) {
    return withCode(
      new Error("Fitur chat belum diterapkan pada database. Jalankan migration 012 dan 013."),
      CHAT_ERROR_CODES.NOT_CONFIGURED,
    );
  }
  return new Error(text || fallback);
}

/**
 * Memvalidasi isi pesan (sama dengan aturan server: 1-2000 karakter setelah trim).
 * @param {string} body
 * @returns {{ok: boolean, body: string, message: string|null}}
 */
export function validateMessageBody(body) {
  const trimmed = String(body ?? "").trim();
  if (trimmed.length < MESSAGE_MIN_LENGTH) {
    return { ok: false, body: trimmed, message: "Pesan tidak boleh kosong." };
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, body: trimmed, message: `Pesan maksimal ${MESSAGE_MAX_LENGTH} karakter.` };
  }
  return { ok: true, body: trimmed, message: null };
}

/**
 * Memastikan sesi ada, lalu mengembalikan client Supabase.
 * @returns {Promise<{supabase: Object, user: Object}>}
 */
async function requireClient() {
  if (!isSupabaseConfigured()) {
    warnChat("requireClient: Supabase belum dikonfigurasi (NOT_CONFIGURED)");
    throw withCode(
      new Error("Chat nyata membutuhkan konfigurasi Supabase."),
      CHAT_ERROR_CODES.NOT_CONFIGURED,
    );
  }
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    warnChat("requireClient: sesi tidak tersedia", error?.message ?? "user null");
    throw withCode(
      new Error("Anda harus masuk terlebih dahulu untuk mengakses pesan."),
      CHAT_ERROR_CODES.NOT_AUTHENTICATED,
    );
  }
  logChat("requireClient: sesi tersedia (user.id =", user.id, ")");
  return { supabase, user };
}

/**
 * Membuat atau mendapatkan percakapan untuk (postingan, lawan bicara).
 * Idempoten: RPC memakai ON CONFLICT pada (post_id, owner_id, partner_id).
 *
 * @param {{postId: string, partnerId: string}} params
 * @returns {Promise<string>} id percakapan
 */
export async function getOrCreateConversation({ postId, partnerId } = {}) {
  if (!postId) throw new Error("post_id wajib diisi.");
  if (!partnerId) throw new Error("partner_id wajib diisi.");

  const { supabase } = await requireClient();
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_post_id: postId,
    p_partner_id: partnerId,
  });

  if (error) {
    warnChat("get_or_create_conversation: RPC gagal", error.message);
    throw mapChatError(error.message, "Gagal membuat percakapan.");
  }
  if (!data) {
    warnChat("get_or_create_conversation: RPC mengembalikan null");
    throw new Error("Gagal membuat percakapan.");
  }
  const conversationId = String(data);
  logChat("get_or_create_conversation: conversation id =", conversationId);
  return conversationId;
}

const CONVERSATION_SELECT = "id, post_id, owner_id, partner_id, updated_at, created_at";

/**
 * Memetakan baris conversations + profil lawan bicara + data postingan ke objek UI.
 *
 * Data postingan diambil SEKALI per kumpulan percakapan dari tabel posts
 * (posts_select_all membaca semua baris), sehingga kartu Topik Percakapan dan
 * tautan "Lihat Postingan" memakai judul nyata, bukan judul lama. Bila postingan
 * tidak ditemukan (sudah dihapus) postTitle bernilai null dan UI menampilkan
 * keadaan "postingan tidak tersedia"; migration 013 menghapus percakapannya,
 * jadi keadaan ini hanya muncul untuk data sisa sebelum 013 diterapkan.
 *
 * Status aktivitas post TIDAK diambil di sini; pemanggil memakai
 * fetchActivityStatusMap lewat data.js bila perlu, atau kolom activityStatus.
 */
function mapConversationRows(supabase, rows, me, profileById, postById) {
  return rows.map((row) => {
    const otherId = String(row.owner_id) === me ? String(row.partner_id) : String(row.owner_id);
    const profile = profileById.get(otherId) || {};
    const post = postById.get(String(row.post_id)) || null;
    return {
      id: String(row.id),
      postId: String(row.post_id),
      ownerId: String(row.owner_id),
      partnerId: String(row.partner_id),
      otherUserId: otherId,
      otherName: profile.name || "Pengguna NeedHelp",
      otherBio: profile.bio || "",
      otherAvatar: profile.avatar_url || "/assets/images/avatar-user.svg",
      otherInitial: profile.initial || (profile.name || "N").charAt(0).toUpperCase(),
      otherAvatarClass: profile.avatar_class || "avatar-blue",
      postTitle: post ? post.title : null,
      postAuthorId: post ? String(post.author_id) : null,
      postExists: Boolean(post),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  });
}

/**
 * Mengambil daftar percakapan milik pengguna (sebagai pemilik maupun partner).
 * Urut terbaru berdasarkan updated_at.
 *
 * @returns {Promise<Array<Object>>} percakapan + profil lawan bicara + judul post
 */
export async function fetchConversations() {
  const { supabase, user } = await requireClient();
  const me = String(user.id);

  const { data: rows, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`owner_id.eq.${me},partner_id.eq.${me}`)
    .order("updated_at", { ascending: false });

  if (error) throw mapChatError(error.message, "Gagal mengambil daftar percakapan.");

  const conversations = rows || [];
  if (conversations.length === 0) return [];

  const otherIds = [
    ...new Set(
      conversations.map((row) =>
        String(row.owner_id) === me ? String(row.partner_id) : String(row.owner_id),
      ),
    ),
  ];
  const postIds = [...new Set(conversations.map((row) => String(row.post_id)))];

  const [{ data: profiles }, { data: posts }, { data: latest }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, bio, avatar_url, initial, avatar_class")
      .in("id", otherIds),
    supabase
      .from("posts")
      .select("id, title, author_id")
      .in("id", postIds),
    fetchLatestMessages(supabase, conversations.map((row) => String(row.id))),
  ]);

  const profileById = new Map((profiles || []).map((p) => [String(p.id), p]));
  const postById = new Map((posts || []).map((p) => [String(p.id), p]));
  const latestById = new Map((latest || []).map((m) => [String(m.conversation_id), m]));

  return mapConversationRows(supabase, conversations, me, profileById, postById).map((c) => {
    const last = latestById.get(c.id) || null;
    return {
      ...c,
      lastMessage: last ? safeMessagePreview(last.body) : null,
      lastMessageAt: last ? last.created_at : null,
      lastMessageIsMine: last ? String(last.sender_id) === me : false,
    };
  });
}

function safeMessagePreview(body, max = 80) {
  const flat = String(body ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Mengambil pesan terbaru untuk sekumpulan percakapan.
 * PostgREST tidak mendukung "DISTINCT ON" lintas filter sederhana, jadi setiap
 * percakapan diminta satu baris terbaru secara paralel. Jumlah percakapan
 * dibatasi praktik aplikasi (satu per post-partner), sehingga permintaan kecil.
 */
async function fetchLatestMessages(supabase, conversationIds) {
  if (conversationIds.length === 0) return { data: [], error: null };
  const results = await Promise.all(
    conversationIds.map((id) =>
      supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  );
  return {
    data: results.map((r) => r.data).filter(Boolean),
    error: results.find((r) => r.error)?.error || null,
  };
}

/**
 * Mengambil satu percakapan milik pengguna berdasarkan id (atau pasangan
 * post + partner). Mengembalikan null bila percakapan tidak ada atau bukan milik
 * pemanggil — RLS conversations_select_participant juga menyaring, filter
 * eksplisit ditulis agar tidak hanya bergantung pada RLS.
 *
 * @param {{conversationId?: string, postId?: string, partnerId?: string}} params
 * @returns {Promise<Object|null>}
 */
export async function fetchConversation({ conversationId, postId, partnerId } = {}) {
  if (!conversationId && !(postId && partnerId)) {
    return null;
  }
  const { supabase, user } = await requireClient();
  const me = String(user.id);

  let query = supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .limit(1);

  if (conversationId) {
    query = query.eq("id", conversationId);
  } else {
    query = query.eq("post_id", postId).eq("partner_id", partnerId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw mapChatError(error.message, "Gagal mengambil percakapan.");
  if (!data) return null;
  if (String(data.owner_id) !== me && String(data.partner_id) !== me) return null;

  const otherId = String(data.owner_id) === me ? String(data.partner_id) : String(data.owner_id);
  const [{ data: profiles }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, bio, avatar_url, initial, avatar_class")
      .eq("id", otherId),
    supabase
      .from("posts")
      .select("id, title, author_id")
      .eq("id", data.post_id),
  ]);

  const profileById = new Map((profiles || []).map((p) => [String(p.id), p]));
  const postById = new Map((posts || []).map((p) => [String(p.id), p]));
  return mapConversationRows(supabase, [data], me, profileById, postById)[0] || null;
}

/**
 * Mengambil riwayat pesan sebuah percakapan dengan pagination kursor.
 * Urut lama → baru. Kursor = baris terakhir yang sudah dimuat.
 *
 * @param {string} conversationId
 * @param {{limit?: number, before?: {createdAt: string, id: string}|null}} [options]
 * @returns {Promise<{messages: Array<Object>, hasMore: boolean}>}
 */
export async function fetchMessages(conversationId, options = {}) {
  if (!conversationId) throw new Error("conversation_id wajib diisi.");
  const { limit = MESSAGES_PAGE_SIZE, before = null } = options;
  const pageSize = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MESSAGES_PAGE_SIZE) : MESSAGES_PAGE_SIZE;

  const { supabase, user } = await requireClient();
  const me = String(user.id);

  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

  if (before?.createdAt) {
    const createdAt = before.createdAt;
    const beforeId = before.id ? String(before.id) : "";
    // (created_at, id) < (kursor) menggunakan sintaks logika PostgREST.
    query = query.or(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${beforeId})`,
    );
  }

  const { data, error } = await query;
  if (error) throw mapChatError(error.message, "Gagal mengambil riwayat pesan.");

  const rows = data || [];
  const hasMore = rows.length === pageSize;
  const messages = rows
    .slice()
    .reverse()
    .map((row) => ({
      id: String(row.id),
      conversationId: String(row.conversation_id),
      senderId: String(row.sender_id),
      body: row.body,
      createdAt: row.created_at,
      isMine: String(row.sender_id) === me,
    }));

  return { messages, hasMore };
}

/**
 * Mengirim pesan sebagai pengguna yang sedang login.
 * Server selalu memakai auth.uid() sebagai sender_id.
 *
 * @param {string} conversationId
 * @param {string} body
 * @returns {Promise<{id: string, conversationId: string, senderId: string, body: string}>}
 */
export async function sendMessage(conversationId, body) {
  if (!conversationId) throw new Error("conversation_id wajib diisi.");

  const validation = validateMessageBody(body);
  if (!validation.ok) {
    throw withCode(new Error(validation.message), CHAT_ERROR_CODES.INVALID_MESSAGE);
  }

  const { supabase, user } = await requireClient();
  const { data, error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_body: validation.body,
  });

  if (error) {
    warnChat("send_message: RPC gagal", error.message);
    throw mapChatError(error.message, "Gagal mengirim pesan.");
  }
  if (!data) {
    warnChat("send_message: RPC mengembalikan null (tidak ada message id)");
    throw new Error("Gagal mengirim pesan.");
  }

  logChat("send_message: berhasil (message id =", data, ")");
  return {
    id: String(data),
    conversationId: String(conversationId),
    senderId: String(user.id),
    body: validation.body,
  };
}

/**
 * Menandai pesan masuk pada satu percakapan sudah dibaca oleh pemanggil.
 * RPC 014 hanya mengubah baris read_at untuk percakapan milik pemanggil; gagal
 * bila bukan peserta. UI mengabaikan kegagalan (tidak memblokir tampilan).
 *
 * @param {string} conversationId
 * @returns {Promise<number>} jumlah notifikasi yang ditandai
 */
export async function markConversationRead(conversationId) {
  if (!conversationId) return 0;
  const { supabase } = await requireClient();
  const { data, error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) throw mapChatError(error.message, "Gagal menandai pesan dibaca.");
  return typeof data === "number" ? data : 0;
}

/**
 * Berlangganan INSERT pesan pada satu percakapan lewat Supabase Realtime.
 * RLS messages_select_participant menyaring baris yang dikirim ke klien.
 * `conversationId` falsy berarti berlangganan semua INSERT pada tabel messages;
 * RLS membatasi ke percakapan milik pengguna, jadi aman dipakai untuk daftar
 * pesan. Mengembalikan fungsi berhenti.
 *
 * @param {string|null} conversationId
 * @param {(row: Object) => void} onMessage - menerima baris mentah messages
 * @param {(status: string, err?: Error) => void} [onStatus]
 * @returns {() => void}
 */
export function subscribeToConversationMessages(conversationId, onMessage, onStatus) {
  if (!isSupabaseConfigured()) return () => {};

  // onMessage WAJIB fungsi dan conversationId WAJIB string/null (bukan fungsi).
  // Memanggil dengan urutan argumen tertukar — mis. `(handlerPesan, handlerStatus)`
  // — membuat handler pesan jatuh ke slot conversationId dan event INSERT tidak
  // pernah masuk ke state; status pun terjebak di "Menghubungkan pesan baru...".
  if (typeof conversationId === "function") {
    warnChat("subscribeToConversationMessages: conversationId berupa fungsi — kemungkinan argumen tertukar (seharusnya conversationId, onMessage, onStatus)");
    return () => {};
  }
  if (typeof onMessage !== "function") {
    warnChat("subscribeToConversationMessages: onMessage wajib fungsi (menerima baris pesan)");
    return () => {};
  }
  if (onStatus != null && typeof onStatus !== "function") {
    warnChat("subscribeToConversationMessages: onStatus harus fungsi (atau dihilangkan)");
    return () => {};
  }

  const supabase = getSupabase();

  const changeConfig = { event: "INSERT", schema: "public", table: "messages" };
  if (conversationId) changeConfig.filter = `conversation_id=eq.${conversationId}`;

  const topic = freshChannelTopic(`messages:${conversationId || "all"}`);
  diagChat(
    "subscribeToConversationMessages: buka channel",
    "- conversation =", conversationId ?? "all",
    "- filter =", changeConfig.filter ?? "(tanpa filter, andalkan RLS messages_select_participant)",
  );

  const channel = supabase
    .channel(topic)
    .on("postgres_changes", changeConfig, (payload) => {
      // DIAGNOSTIK SEMENTARA: bukti bahwa event INSERT messages benar-benar
      // sampai ke klien. Nama event + conversation_id + message_id dicatat
      // SEBELUM diteruskan ke onMessage, supaya dua kemungkinan dapat
      // dibedakan: (a) event TIDAK pernah sampai (= publikasi/RLS realtime),
      // (b) event sampai tapi state tidak berubah (= callback/merge/race di UI).
      diagChat(
        "realtime messages: event DITERIMA",
        "- eventType =", payload?.eventType,
        "- schema/table =", payload?.schema, "/", payload?.table,
        "- conversation_id =", payload?.new?.conversation_id ?? payload?.old?.conversation_id ?? null,
        "- message_id =", payload?.new?.id ?? payload?.old?.id ?? null,
        "- ada payload.new =", Boolean(payload?.new),
      );
      if (!payload?.new) {
        warnChat("realtime messages: event tanpa payload.new (mungkin UPDATE/DELETE), diabaikan karena langganan INSERT");
        return;
      }
      onMessage(payload.new);
    })
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        diagChat("subscribeToConversationMessages: SUBSCRIBED (conversation =", conversationId ?? "all", ")");
      } else {
        // realtime-js bisa mengirim string ENUM (mis. "CHANNEL_ERROR") tanpa
        // Error; pertahankan string persis untuk status UI, tapi kegagalan
        // SELALU dicatat agar macet mudah ditemukan.
        warnChat("subscribeToConversationMessages: status", status, "-", err?.message ?? "tanpa error");
      }
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
 * Menggabungkan event realtime ke daftar pesan tanpa duplikasi.
 * Pesan yang sama bisa datang dari respons RPC dan dari channel realtime.
 *
 * @param {Object[]} messages - daftar pesan saat ini (urut lama → baru)
 * @param {Object} incoming - {id, conversationId, senderId, body, createdAt}
 * @param {string} currentUserId
 * @returns {Object[]}
 */
export function mergeIncomingMessage(messages, incoming, currentUserId) {
  const list = Array.isArray(messages) ? messages : [];
  if (!incoming?.id) return list;
  if (list.some((m) => String(m.id) === String(incoming.id))) return list;

  const message = {
    id: String(incoming.id),
    conversationId: String(incoming.conversationId ?? incoming.conversation_id ?? ""),
    senderId: String(incoming.senderId ?? incoming.sender_id ?? ""),
    body: incoming.body,
    createdAt: incoming.createdAt ?? incoming.created_at,
    isMine:
      String(incoming.senderId ?? incoming.sender_id ?? "") === String(currentUserId),
  };
  return [...list, message];
}