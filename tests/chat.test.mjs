// Unit test data layer chat (src/lib/chat.js).
// Jalankan: node --test tests/
//
// Supabase DIPALSUKAN lewat env dummy + stub SupabaseClient. Tidak ada request
// jaringan dan tidak ada akses database.
//
// Fokus:
// - autentikasi: tanpa sesi tidak ada RPC/query yang dijalankan
// - validasi pesan 1-2000 karakter setelah trim
// - parameter RPC (sender tidak pernah dikirim dari klien; partner/post wajib)
// - pemetaan error server ke pesan + kode yang dipakai UI
// - aturan otorisasi percakapan (non-pemilik wajib punya hubungan sah)
// - pagination kursor dan dedupe pesan realtime

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import test from "node:test";
import assert from "node:assert/strict";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const POST_A = "11111111-1111-4111-8111-111111111111";
const CONV_A = "99999999-9999-4999-8999-999999999999";

let modulesPromise = null;
function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import("../src/lib/supabase.js"),
      import("../src/lib/chat.js"),
    ]).then(([supabase, chat]) => ({
      getSupabase: supabase.getSupabase,
      chat,
    }));
  }
  return modulesPromise;
}

/**
 * Stub SupabaseClient:
 * - auth.getUser
 * - rpc
 * - from(table).select(...).or(...).order(...).order(...).limit(...)
 *   from(table).select(...).eq(...).order(...).order(...).limit(...)
 *   from(table).select(...).in(...)
 * Setiap method builder mengembalikan builder yang THENABLE.
 */
async function stubSupabase({
  user = { id: ME },
  rpcImpl,
  conversations = [],
  profiles = [],
  messages = [],
  posts = [],
} = {}) {
  const { getSupabase } = await loadModules();
  const client = getSupabase();
  const calls = { rpc: [], from: [], queries: [] };

  client.auth.getUser = async () =>
    user ? { data: { user }, error: null } : { data: { user: null }, error: null };

  client.rpc = async (fn, args) => {
    calls.rpc.push({ fn, args });
    if (rpcImpl) return rpcImpl(fn, args);
    return { data: null, error: null };
  };

  client.from = (table) => {
    calls.from.push(table);
    const state = { table, eq: {}, in: {}, or: null, order: [], limit: null };

    const rows = () => {
      if (table === "conversations") return conversations;
      if (table === "profiles") return profiles;
      if (table === "messages") return messages;
      if (table === "posts") return posts;
      return [];
    };

    const filterRows = (list) => {
      let out = list;
      for (const [column, value] of Object.entries(state.eq)) {
        out = out.filter((row) => String(row[column]) === String(value));
      }
      for (const [column, values] of Object.entries(state.in)) {
        out = out.filter((row) => values.map(String).includes(String(row[column])));
      }
      return out;
    };

    const result = () => {
      calls.queries.push({ ...state, eq: { ...state.eq }, in: { ...state.in } });
      const filtered = filterRows(rows());
      // Hormati `.limit(1)` seperti query "pesan terbaru per percakapan".
      const limited = state.limit ? filtered.slice(0, state.limit) : filtered;
      return { data: limited, error: null };
    };

    const singleResult = () => {
      calls.queries.push({ ...state, eq: { ...state.eq }, in: { ...state.in }, single: true });
      const filtered = filterRows(rows());
      return { data: filtered[0] ?? null, error: null };
    };

    const builder = {
      select: () => builder,
      eq: (column, value) => {
        state.eq[column] = value;
        return builder;
      },
      in: (column, values) => {
        state.in[column] = values;
        return builder;
      },
      or: (expr) => {
        state.or = expr;
        return builder;
      },
      order: (column, opts) => {
        state.order.push({ column, ascending: opts?.ascending !== false });
        return builder;
      },
      limit: (n) => {
        state.limit = n;
        return builder;
      },
      maybeSingle: async () => singleResult(),
      single: async () => singleResult(),
      then: (onFulfilled, onRejected) =>
        Promise.resolve(result()).then(onFulfilled, onRejected),
    };
    return builder;
  };

  return { client, calls };
}

// ---------------------------------------------------------------------------
// Autentikasi
// ---------------------------------------------------------------------------

test("getOrCreateConversation tanpa sesi -> NOT_AUTHENTICATED, RPC tidak dipanggil", async () => {
  const { calls } = await stubSupabase({ user: null });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.getOrCreateConversation({ postId: POST_A, partnerId: OTHER }),
    (err) => err.code === chat.CHAT_ERROR_CODES.NOT_AUTHENTICATED,
  );
  assert.equal(calls.rpc.length, 0);
});

test("fetchConversations / fetchMessages / sendMessage tanpa sesi tidak query apa pun", async () => {
  const { calls } = await stubSupabase({ user: null });
  const { chat } = await loadModules();
  for (const fn of [
    () => chat.fetchConversations(),
    () => chat.fetchMessages(CONV_A),
    () => chat.sendMessage(CONV_A, "Halo"),
  ]) {
    await assert.rejects(fn, (err) => err.code === chat.CHAT_ERROR_CODES.NOT_AUTHENTICATED);
  }
  assert.equal(calls.rpc.length, 0);
  assert.equal(calls.from.length, 0);
});

// ---------------------------------------------------------------------------
// Validasi pesan
// ---------------------------------------------------------------------------

test("validateMessageBody: 1-2000 karakter setelah trim", async () => {
  const { chat } = await loadModules();
  assert.equal(chat.validateMessageBody("   ").ok, false);
  assert.equal(chat.validateMessageBody("").ok, false);
  assert.equal(chat.validateMessageBody(null).ok, false);

  const ok = chat.validateMessageBody("  Halo  ");
  assert.equal(ok.ok, true);
  assert.equal(ok.body, "Halo");

  const max = "a".repeat(2000);
  assert.equal(chat.validateMessageBody(max).ok, true);
  assert.equal(chat.validateMessageBody(`${max}a`).ok, false);
  // Trim dilakukan dulu: spasi berlebih tidak dihitung ke panjang
  assert.equal(chat.validateMessageBody(`  ${max}  `).ok, true);
});

test("sendMessage menolak pesan tidak valid sebelum memanggil RPC", async () => {
  const { calls } = await stubSupabase();
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.sendMessage(CONV_A, "   "),
    (err) => err.code === chat.CHAT_ERROR_CODES.INVALID_MESSAGE,
  );
  await assert.rejects(
    () => chat.sendMessage(CONV_A, "a".repeat(2001)),
    (err) => err.code === chat.CHAT_ERROR_CODES.INVALID_MESSAGE,
  );
  assert.equal(calls.rpc.length, 0);
});

// ---------------------------------------------------------------------------
// Parameter RPC
// ---------------------------------------------------------------------------

test("getOrCreateConversation memanggil RPC dengan p_post_id dan p_partner_id saja", async () => {
  const { calls } = await stubSupabase({ rpcImpl: () => ({ data: CONV_A, error: null }) });
  const { chat } = await loadModules();
  const id = await chat.getOrCreateConversation({ postId: POST_A, partnerId: OTHER });

  assert.equal(id, CONV_A);
  assert.deepEqual(calls.rpc, [
    { fn: "get_or_create_conversation", args: { p_post_id: POST_A, p_partner_id: OTHER } },
  ]);
});

test("getOrCreateConversation menolak parameter kosong tanpa RPC", async () => {
  const { calls } = await stubSupabase();
  const { chat } = await loadModules();
  await assert.rejects(() => chat.getOrCreateConversation({ partnerId: OTHER }), /post_id/);
  await assert.rejects(() => chat.getOrCreateConversation({ postId: POST_A }), /partner_id/);
  assert.equal(calls.rpc.length, 0);
});

test("sendMessage mengirim body yang sudah di-trim dan TIDAK mengirim sender_id", async () => {
  const { calls } = await stubSupabase({ rpcImpl: () => ({ data: "msg-1", error: null }) });
  const { chat } = await loadModules();
  const result = await chat.sendMessage(CONV_A, "  Halo kak, masih tersedia?  ");

  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0].fn, "send_message");
  assert.deepEqual(calls.rpc[0].args, {
    p_conversation_id: CONV_A,
    p_body: "Halo kak, masih tersedia?",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(calls.rpc[0].args, "p_sender_id"), false);

  // Pengirim dilaporkan dari sesi (auth), bukan dari input
  assert.equal(result.senderId, ME);
  assert.equal(result.id, "msg-1");
});

// ---------------------------------------------------------------------------
// Pemetaan error server
// ---------------------------------------------------------------------------

test("mapChatError memetakan penolakan server ke kode yang jelas", async () => {
  const { chat } = await loadModules();

  const cases = [
    ["Anda bukan peserta percakapan ini.", chat.CHAT_ERROR_CODES.NOT_PARTICIPANT],
    ["Anda tidak berhak memulai percakapan ini.", chat.CHAT_ERROR_CODES.NOT_ALLOWED],
    ["Anda tidak dapat memulai percakapan dengan diri sendiri.", chat.CHAT_ERROR_CODES.NOT_ALLOWED],
    ["owner_id percakapan harus sama dengan pemilik postingan.", chat.CHAT_ERROR_CODES.NOT_ALLOWED],
    ["Percakapan tidak ditemukan.", chat.CHAT_ERROR_CODES.NOT_FOUND],
    ["Postingan tidak ditemukan.", chat.CHAT_ERROR_CODES.NOT_FOUND],
    ["Anda harus masuk terlebih dahulu.", chat.CHAT_ERROR_CODES.NOT_AUTHENTICATED],
  ];

  for (const [message, code] of cases) {
    const error = chat.mapChatError(message);
    assert.equal(error.code, code, message);
    assert.ok(error instanceof Error);
  }
});

test("RPC menolak non-peserta -> error NOT_PARTICIPANT dari sendMessage", async () => {
  await stubSupabase({
    rpcImpl: () => ({ data: null, error: { message: "Anda bukan peserta percakapan ini." } }),
  });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.sendMessage(CONV_A, "Halo"),
    (err) => err.code === chat.CHAT_ERROR_CODES.NOT_PARTICIPANT && /bukan peserta/.test(err.message),
  );
});

test("RPC chat dengan diri sendiri ditolak -> NOT_ALLOWED", async () => {
  await stubSupabase({
    rpcImpl: () => ({
      data: null,
      error: { message: "Anda tidak dapat memulai percakapan dengan diri sendiri." },
    }),
  });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.getOrCreateConversation({ postId: POST_A, partnerId: ME }),
    (err) => err.code === chat.CHAT_ERROR_CODES.NOT_ALLOWED,
  );
});

// ---------------------------------------------------------------------------
// Otorisasi percakapan (kontrak RPC get_or_create_conversation)
// ---------------------------------------------------------------------------
// Aturan inti dijalankan di PostgreSQL (tidak bisa diuji tanpa database).
// Yang bisa diuji di sini:
// 1) server menolak -> klien TIDAK melaporkan sukses dan memberi NOT_ALLOWED
// 2) klien tidak menyimpulkan otorisasi sendiri; cukup mengirim post_id +
//    partner_id, dan percaya keputusan server (tidak ada sender/owner dari UI)

/**
 * Cermin aturan otorisasi get_or_create_conversation untuk dokumentasi & regresi
 * kontrak. Harus dijaga sinkron dengan SQL 012:
 * - caller == post owner: partner sah bila partner aktivitas (activities.partner_id)
 *   atau pelamar pending/accepted
 * - caller != owner: partner harus owner DAN caller pelamar pending/accepted
 *   atau partner aktivitas (activities.partner_id)
 */
function conversationAllowed({ callerId, postAuthorId, partnerId, relations }) {
  if (partnerId === callerId) return false;
  const isApplicant = (r) =>
    r.type === "application" && r.userId === callerId && ["pending", "accepted"].includes(r.status);
  const isPartnerOfActivity = (r) => r.type === "activityPartner" && r.userId === callerId;
  const partnerHasApplication = relations.some(
    (r) =>
      r.type === "application" &&
      r.userId === partnerId &&
      ["pending", "accepted"].includes(r.status),
  );
  const partnerIsActivityPartner = relations.some(
    (r) => r.type === "activityPartner" && r.userId === partnerId,
  );

  if (callerId === postAuthorId) return partnerHasApplication || partnerIsActivityPartner;
  return partnerId === postAuthorId && (relations.some(isApplicant) || relations.some(isPartnerOfActivity));
}

test("aturan otorisasi percakapan: hubungan sah wajib, bukan hanya tahu post_id", () => {
  const OWNER = "owner";
  const STRANGER = "stranger";

  // Non-pemilik tanpa relasi -> ditolak walau tahu post_id & id pemilik
  assert.equal(
    conversationAllowed({ callerId: STRANGER, postAuthorId: OWNER, partnerId: OWNER, relations: [] }),
    false,
  );

  // Pelamar pending / accepted -> boleh
  for (const status of ["pending", "accepted"]) {
    assert.equal(
      conversationAllowed({
        callerId: STRANGER,
        postAuthorId: OWNER,
        partnerId: OWNER,
        relations: [{ type: "application", userId: STRANGER, status }],
      }),
      true,
      status,
    );
  }

  // Pelamar rejected / withdrawn -> ditolak
  for (const status of ["rejected", "withdrawn"]) {
    assert.equal(
      conversationAllowed({
        callerId: STRANGER,
        postAuthorId: OWNER,
        partnerId: OWNER,
        relations: [{ type: "application", userId: STRANGER, status }],
      }),
      false,
      status,
    );
  }

  // Partner aktivitas -> boleh
  assert.equal(
    conversationAllowed({
      callerId: STRANGER,
      postAuthorId: OWNER,
      partnerId: OWNER,
      relations: [{ type: "activityPartner", userId: STRANGER }],
    }),
    true,
  );

  // Non-pemilik tidak boleh memilih lawan bicara selain pemilik post
  assert.equal(
    conversationAllowed({
      callerId: STRANGER,
      postAuthorId: OWNER,
      partnerId: "someone-else",
      relations: [{ type: "activityPartner", userId: STRANGER }],
    }),
    false,
  );

  // Pemilik dengan partner yang tidak terkait -> ditolak
  assert.equal(
    conversationAllowed({ callerId: OWNER, postAuthorId: OWNER, partnerId: STRANGER, relations: [] }),
    false,
  );
});

test("non-pemilik ditolak server -> NOT_ALLOWED, tidak dianggap berhasil", async () => {
  const { calls } = await stubSupabase({
    rpcImpl: () => ({
      data: null,
      error: { message: "Anda tidak berhak memulai percakapan ini." },
    }),
  });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.getOrCreateConversation({ postId: POST_A, partnerId: OTHER }),
    (err) => err.code === chat.CHAT_ERROR_CODES.NOT_ALLOWED,
  );
  // Klien tetap hanya mengirim post + partner; keputusan otorisasi di server.
  assert.deepEqual(calls.rpc, [
    { fn: "get_or_create_conversation", args: { p_post_id: POST_A, p_partner_id: OTHER } },
  ]);
});

test("RPC gagal tanpa pesan dikenal -> error generik dengan pesan server", async () => {
  await stubSupabase({
    rpcImpl: () => ({ data: null, error: { message: "canceling statement due to lock timeout" } }),
  });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.sendMessage(CONV_A, "Halo"),
    (err) => /lock timeout/.test(err.message),
  );
});

test("getOrCreateConversation menolak hasil RPC null (data null tanpa error)", async () => {
  // RPC yang "berhasil" tapi tidak mengembalikan id dulu membuat UI menggantung
  // di "Mulai percakapan..." tanpa akhir. Klien wajib melempar, bukan return undefined.
  await stubSupabase({ rpcImpl: () => ({ data: null, error: null }) });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.getOrCreateConversation({ postId: POST_A, partnerId: OTHER }),
    /Gagal membuat percakapan/,
  );
});

test("sendMessage menolak hasil RPC null (data null tanpa error)", async () => {
  await stubSupabase({ rpcImpl: () => ({ data: null, error: null }) });
  const { chat } = await loadModules();
  await assert.rejects(
    () => chat.sendMessage(CONV_A, "Halo"),
    /Gagal mengirim pesan/,
  );
});

// ---------------------------------------------------------------------------
// Daftar percakapan
// ---------------------------------------------------------------------------

test("fetchConversations memfilter milik saya dan memetakan lawan bicara", async () => {
  const { calls } = await stubSupabase({
    conversations: [
      { id: CONV_A, post_id: POST_A, owner_id: OTHER, partner_id: ME, updated_at: "2026-10-01T00:00:00Z", created_at: "2026-10-01T00:00:00Z" },
      { id: "c2", post_id: POST_A, owner_id: ME, partner_id: OTHER, updated_at: "2026-10-02T00:00:00Z", created_at: "2026-10-02T00:00:00Z" },
    ],
    profiles: [{ id: OTHER, name: "Rina", avatar_url: "", initial: "R", avatar_class: "avatar-blue" }],
    posts: [{ id: POST_A, title: "Pindahan kos", author_id: OTHER }],
    messages: [
      { id: "m9", conversation_id: CONV_A, sender_id: OTHER, body: "Sampai ketemu besok", created_at: "2026-10-05T00:00:00Z" },
    ],
  });
  const { chat } = await loadModules();
  const list = await chat.fetchConversations();

  const convQuery = calls.queries.find((q) => q.table === "conversations");
  assert.equal(convQuery.or, `owner_id.eq.${ME},partner_id.eq.${ME}`);
  assert.deepEqual(convQuery.order[0], { column: "updated_at", ascending: false });

  const profileQuery = calls.queries.find((q) => q.table === "profiles");
  assert.deepEqual(profileQuery.in.id, [OTHER]);

  // Judul postingan diambil dari data aktual, bukan judul lama dari URL.
  const postQuery = calls.queries.find((q) => q.table === "posts");
  assert.deepEqual(postQuery.in.id, [POST_A]);

  assert.equal(list.length, 2);
  assert.ok(list.every((c) => c.otherUserId === OTHER));
  assert.equal(list[0].otherName, "Rina");
  assert.equal(list[0].postTitle, "Pindahan kos");
  assert.equal(list[0].postExists, true);

  // Preview pesan terakhir berasal dari pesan nyata percakapan tersebut.
  assert.equal(list[0].lastMessage, "Sampai ketemu besok");
  assert.equal(list[0].lastMessageIsMine, false);
  assert.equal(list[1].lastMessage, null, "percakapan tanpa pesan tidak meminjam preview lain");
});

test("fetchConversations menandai postingan yang sudah dihapus", async () => {
  await stubSupabase({
    conversations: [
      { id: CONV_A, post_id: POST_A, owner_id: OTHER, partner_id: ME, updated_at: "2026-10-01T00:00:00Z", created_at: "2026-10-01T00:00:00Z" },
    ],
    profiles: [{ id: OTHER, name: "Rina" }],
    posts: [],
  });
  const { chat } = await loadModules();
  const [conv] = await chat.fetchConversations();
  assert.equal(conv.postTitle, null);
  assert.equal(conv.postExists, false);
});

test("fetchConversation menolak percakapan milik orang lain", async () => {
  await stubSupabase({
    conversations: [
      { id: "c3", post_id: POST_A, owner_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", partner_id: OTHER, updated_at: "2026-10-01T00:00:00Z", created_at: "2026-10-01T00:00:00Z" },
    ],
  });
  const { chat } = await loadModules();
  const found = await chat.fetchConversation({ conversationId: "c3" });
  assert.equal(found, null);
});

test("markConversationRead memanggil RPC dengan conversation_id saja", async () => {
  const { calls } = await stubSupabase({
    rpcImpl: (fn) => (fn === "mark_conversation_read" ? { data: 2, error: null } : { data: null, error: null }),
  });
  const { chat } = await loadModules();
  const marked = await chat.markConversationRead(CONV_A);
  assert.equal(marked, 2);
  assert.deepEqual(calls.rpc, [
    { fn: "mark_conversation_read", args: { p_conversation_id: CONV_A } },
  ]);
});

// ---------------------------------------------------------------------------
// Riwayat pesan & pagination
// ---------------------------------------------------------------------------

test("fetchMessages: urut terbaru lalu dibalik jadi lama -> baru", async () => {
  const { calls } = await stubSupabase({
    messages: [
      { id: "m2", conversation_id: CONV_A, sender_id: OTHER, body: "Kedua", created_at: "2026-10-02T00:00:00Z" },
      { id: "m1", conversation_id: CONV_A, sender_id: ME, body: "Pertama", created_at: "2026-10-01T00:00:00Z" },
    ],
  });
  const { chat } = await loadModules();
  const { messages, hasMore } = await chat.fetchMessages(CONV_A, { limit: 2 });

  assert.deepEqual(messages.map((m) => m.id), ["m1", "m2"]);
  assert.deepEqual(messages.map((m) => m.isMine), [true, false]);
  assert.equal(hasMore, true, "penuh satu halaman -> mungkin masih ada lagi");

  const query = calls.queries.find((q) => q.table === "messages");
  assert.equal(query.eq.conversation_id, CONV_A);
  assert.equal(query.limit, 2);
  assert.equal(query.or, null);
});

test("fetchMessages: kursor memakai (created_at, id) dan hasMore false bila kurang dari limit", async () => {
  const { calls } = await stubSupabase({
    messages: [
      { id: "m1", conversation_id: CONV_A, sender_id: ME, body: "Satu", created_at: "2026-10-01T00:00:00Z" },
    ],
  });
  const { chat } = await loadModules();
  const { messages, hasMore } = await chat.fetchMessages(CONV_A, {
    limit: 5,
    before: { createdAt: "2026-10-02T00:00:00Z", id: "m9" },
  });

  assert.equal(messages.length, 1);
  assert.equal(hasMore, false);

  const query = calls.queries.find((q) => q.table === "messages");
  assert.equal(
    query.or,
    "created_at.lt.2026-10-02T00:00:00Z,and(created_at.eq.2026-10-02T00:00:00Z,id.lt.m9)",
  );
});

test("fetchMessages membatasi limit ke ukuran halaman maksimum", async () => {
  const { calls } = await stubSupabase({ messages: [] });
  const { chat } = await loadModules();
  await chat.fetchMessages(CONV_A, { limit: 999 });
  const query = calls.queries.find((q) => q.table === "messages");
  assert.equal(query.limit, chat.MESSAGES_PAGE_SIZE);
});

test("fetchMessages menolak tanpa conversation_id", async () => {
  await stubSupabase();
  const { chat } = await loadModules();
  await assert.rejects(() => chat.fetchMessages(null), /conversation_id/);
});

// ---------------------------------------------------------------------------
// Dedupe realtime
// ---------------------------------------------------------------------------

test("mergeIncomingMessage tidak menggandakan pesan yang sama", async () => {
  const { chat } = await loadModules();
  const existing = [
    { id: "m1", conversationId: CONV_A, senderId: ME, body: "Halo", createdAt: "2026-10-01T00:00:00Z", isMine: true },
  ];

  const same = chat.mergeIncomingMessage(existing, { id: "m1", body: "Halo" }, ME);
  assert.equal(same.length, 1);

  const incoming = chat.mergeIncomingMessage(
    existing,
    {
      id: "m2",
      conversation_id: CONV_A,
      sender_id: OTHER,
      body: "Hai",
      created_at: "2026-10-02T00:00:00Z",
    },
    ME,
  );
  assert.equal(incoming.length, 2);
  assert.equal(incoming[1].isMine, false);
  assert.equal(incoming[1].conversationId, CONV_A);
});

test("mergeIncomingMessage mengabaikan payload tanpa id", async () => {
  const { chat } = await loadModules();
  const existing = [];
  assert.deepEqual(chat.mergeIncomingMessage(existing, {}, ME), []);
  assert.deepEqual(chat.mergeIncomingMessage(existing, null, ME), []);
});