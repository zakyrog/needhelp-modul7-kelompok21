// Test LOKAL (tanpa jaringan, tanpa database) untuk kontrak channel realtime:
// - handler `.on("postgres_changes", ...)` wajib dipasang SEBELUM `.subscribe()`.
// - setiap langganan memakai topik channel yang UNIK (tidak menabrak ``channel()``
//   reuse dari singleton supabase-js; lihat bug "cannot add postgres_changes
//   callbacks ... after subscribe()").
// - fungsi berhenti (cleanup) memanggil `removeChannel` untuk channel miliknya.
//
// Supabase client dipalsukan lewat singleton getSupabase() + stub `channel`/`removeChannel`.
// Stub MELAKUKAN aturan yang sama dengan @supabase/realtime-js: `.on()` untuk
// postgres_changes melempar bila dipanggil setelah `.subscribe()`.

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import test from "node:test";
import assert from "node:assert/strict";

const CONV_A = "99999999-9999-4999-8999-999999999999";
const CONV_B = "88888888-8888-4888-8888-888888888888";
const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let modsPromise = null;
function loadModules() {
  if (!modsPromise) {
    modsPromise = Promise.all([
      import("../src/lib/supabase.js"),
      import("../src/lib/notification-realtime.js"),
      import("../src/lib/chat.js"),
    ]).then(([supabase, realtime, chat]) => ({ supabase, realtime, chat }));
  }
  return modsPromise;
}

/**
 * Mengganti `channel`/`removeChannel` pada singleton supabase supaya setiap
 * langganan tercatat. Stub `channel` memberi channel baru OBJEK setiap topik
 * (bukan reuse), dan `.on('postgres_changes')` melempar bila channel sudah
 * subscribe — persis kontrak realtime-js yang mau kita jaga urutannya.
 *
 * Catatan: `supabase` di sini adalah MODULE (module namespace, dibekukan).
 * Klien nyata diambil lewat `supabase.getSupabase()` dan itulah yang boleh
 * diberi stub.
 */
function installRealtimeStub(supabaseModule) {
  const client = supabaseModule.getSupabase();
  const channels = [];
  const removals = [];

  client.channel = (topic) => {
    const ch = {
      topic,
      handlers: [],
      subscribed: false,
      on(type, filter, cb) {
        const isPg = type === "postgres_changes" || type === "presence";
        if (isPg && (ch.joined || ch.joining)) {
          throw new Error(`cannot add \`${type}\` callbacks for ${topic} after \`subscribe()\`.`);
        }
        ch.handlers.push({ type, filter, cb });
        return ch;
      },
      subscribe(statusCb) {
        ch.joining = true;
        ch.subscribed = true;
        ch.statusCb = statusCb;
        return ch;
      },
    };
    channels.push(ch);
    return ch;
  };

  client.removeChannel = async (ch) => {
    removals.push(ch.topic);
    ch.joined = false;
    ch.joining = false;
    return "ok";
  };

  return { channels, removals };
}

test("subscribeToNotifications memasang handler SEBELUM subscribe dan topik unik", async () => {
  const { supabase, realtime } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  // Tidak boleh melempar: berarti `.on('postgres_changes')` dipasang sebelum
  // `.subscribe()`. Kalau urutan terbalik, stub (seperti realtime-js) melempar.
  const stop = realtime.subscribeToNotifications(() => {});
  assert.equal(typeof stop, "function");

  assert.equal(channels.length, 1);
  assert.equal(channels[0].subscribed, true);
  assert.equal(channels[0].handlers.length, 1);
  assert.equal(channels[0].handlers[0].type, "postgres_changes");
  assert.deepEqual(
    { ...channels[0].handlers[0].filter },
    { event: "INSERT", schema: "public", table: "notifications" },
  );
  // Topik bukan "notifications:self" persis — menyisipkan nonce agar tidak
  // menabrak pemanggil lain (Header vs halaman notifikasi).
  assert.ok(channels[0].topic.startsWith("notifications:self:"), channels[0].topic);
});

test("subscribeToNotifications dua pemanggil memakai topik BERBEDA", async () => {
  const { supabase, realtime } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  realtime.subscribeToNotifications(() => {});
  realtime.subscribeToNotifications(() => {});

  assert.equal(channels.length, 2);
  assert.notEqual(channels[0].topic, channels[1].topic);
});

test("stop() memanggil removeChannel untuk channel miliknya sendiri", async () => {
  const { supabase, realtime } = await loadModules();
  const { channels, removals } = installRealtimeStub(supabase);

  const stopA = realtime.subscribeToNotifications(() => {});
  const stopB = realtime.subscribeToNotifications(() => {});
  stopA();

  assert.equal(removals.length, 1);
  assert.equal(removals[0], channels[0].topic);
  assert.notEqual(removals[0], channels[1].topic, "channel pemanggil B tidak boleh dibersihkan");
  assert.equal(typeof stopB, "function");
  stopB();
  assert.equal(removals.length, 2);
});

test("subscribeToConversationMessages memakai filter conversation_id dan topik unik per percakapan", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  const stopA = chat.subscribeToConversationMessages(CONV_A, () => {});
  const stopB = chat.subscribeToConversationMessages(CONV_B, () => {});

  assert.equal(channels.length, 2);
  assert.notEqual(channels[0].topic, channels[1].topic, "pergantian percakapan tidak berbagi channel");
  assert.deepEqual({ ...channels[0].handlers[0].filter }, {
    event: "INSERT",
    schema: "public",
    table: "messages",
    filter: `conversation_id=eq.${CONV_A}`,
  });
  assert.ok(channels[0].handlers[0].filter.filter.includes(CONV_A));
  assert.ok(channels[1].handlers[0].filter.filter.includes(CONV_B));

  stopA();
  stopB();
});

test("subscribeToConversationMessages tanpa id berlangganan semua INSERT dan topik unik", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  const stop = chat.subscribeToConversationMessages(null, () => {});
  assert.equal(channels.length, 1);
  // Tanpa conversation_id, filter tidak boleh menyaring ke satu percakapan.
  assert.equal(channels[0].handlers[0].filter.filter, undefined);
  assert.ok(channels[0].topic.startsWith("messages:all:"), channels[0].topic);
  stop();
});

test("subscribeToConversationMessages menolak argumen tertukar (conversationId fungsi)", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  // Panggilan buggy lama: (handlerPesan, handlerStatus) — tidak ada conversationId.
  const stop = chat.subscribeToConversationMessages(
    () => {}, // <- seharusnya null
    () => {},
  );

  // Tanpa kawal, handler pesan ini akan menjadi `conversationId` (fungsi) dan
  // status terjebak "Menghubungkan pesan baru..." / event tidak masuk state.
  assert.equal(typeof stop, "function");
  assert.equal(channels.length, 0, "tidak boleh membuat channel bila argumen tertukar");
  stop();
});

test("subscribeToConversationMessages melaporkan status SUBSCRIBED dan error ke onStatus", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  const seen = [];
  const stop = chat.subscribeToConversationMessages(
    null,
    () => {},
    (status, err) => seen.push({ status, err }),
  );

  assert.equal(channels.length, 1);
  // Simulasikan status SUBSCRIBED dari server.
  channels[0].statusCb("SUBSCRIBED");
  channels[0].statusCb("CHANNEL_ERROR", new Error("boom"));

  assert.deepEqual(seen.map((s) => s.status), ["SUBSCRIBED", "CHANNEL_ERROR"]);
  assert.equal(seen[1].err.message, "boom");
  stop();
});

test("subscribeToConversationMessages meneruskan payload.new event INSERT ke onMessage", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  const received = [];
  const stop = chat.subscribeToConversationMessages(null, (row) => received.push(row));

  // Simulasikan event INSERT yang benar-benar sampai ke channel (digantikan
  // stub untuk handler). Ini bukti jalur "channel menerima -> onMessage".
  const payload = {
    eventType: "INSERT",
    schema: "public",
    table: "messages",
    new: { id: "m-1", conversation_id: CONV_A, sender_id: OTHER, body: "halo", created_at: "2026-10-29T00:00:00Z" },
  };
  channels[0].handlers[0].cb(payload);

  assert.equal(received.length, 1, "event INSERT dengan payload.new wajib diteruskan");
  assert.equal(received[0].id, "m-1");
  assert.equal(received[0].conversation_id, CONV_A);
  stop();
});

test("subscribeToConversationMessages tidak meneruskan event tanpa payload.new (UPDATE/DELETE)", async () => {
  const { supabase, chat } = await loadModules();
  const { channels } = installRealtimeStub(supabase);

  const received = [];
  const stop = chat.subscribeToConversationMessages(null, (row) => received.push(row));

  // Langganan event INSERT tidak boleh memperlakukan DELETE tanpa `new`.
  channels[0].handlers[0].cb({
    eventType: "DELETE",
    schema: "public",
    table: "messages",
    old: { id: "m-1", conversation_id: CONV_A },
  });

  assert.equal(received.length, 0, "event tanpa payload.new tidak boleh diteruskan");
  stop();
});

test("mergeIncomingMessage tidak mencampur pesan dari percakapan berbeda", async () => {
  const { chat } = await loadModules();
  // Dua percakapan berbeda mengirim pesan ke daftar yang sama lewat merge;
  // id berbeda artinya keduanya hadir tanpa saling menimpa. Pemisahan menurut
  // percakapan dilakukan di page.js (filter conversation_id === activeId) —
  // merge sengaja dangkal dan idempoten berdasarkan id saja.
  const list = chat.mergeIncomingMessage(
    [],
    { id: "m-a", conversation_id: CONV_A, sender_id: OTHER, body: "A", created_at: "2026-10-29T00:00:00Z" },
    ME,
  );
  const afterB = chat.mergeIncomingMessage(
    list,
    { id: "m-b", conversation_id: CONV_B, sender_id: ME, body: "B", created_at: "2026-10-29T00:00:01Z" },
    ME,
  );

  assert.equal(afterB.length, 2);
  assert.equal(afterB[0].id, "m-a");
  assert.equal(afterB[1].id, "m-b");
  assert.equal(afterB[0].conversationId, CONV_A);
  assert.equal(afterB[1].conversationId, CONV_B);

  // Pesan yang sama (id sama) dari percakapan manapun tetap di-dedupe.
  const afterDup = chat.mergeIncomingMessage(
    afterB,
    { id: "m-a", conversation_id: CONV_A, sender_id: OTHER, body: "A", created_at: "2026-10-29T00:00:00Z" },
    ME,
  );
  assert.equal(afterDup.length, 2, "pesan id ganda tidak boleh menambah panjang");
});

test("mergeIncomingMessage tidak menggandakan pesan sendiri saat echo realtime datang", async () => {
  const { chat } = await loadModules();
  // Skema: respons RPC send_message sudah menaruh pesan ke daftar, lalu event
  // realtime untuk INSERT yang sama datang lagi. Merge harus idempoten.
  const sent = {
    id: "msg-1",
    conversationId: CONV_A,
    senderId: ME,
    body: "Halo",
    createdAt: "2026-10-29T00:00:00Z",
    isMine: true,
  };
  const afterSend = chat.mergeIncomingMessage([], sent, ME);
  assert.equal(afterSend.length, 1);

  const afterEcho = chat.mergeIncomingMessage(
    afterSend,
    { id: "msg-1", conversation_id: CONV_A, sender_id: ME, body: "Halo", created_at: "2026-10-29T00:00:00Z" },
    ME,
  );
  assert.equal(afterEcho.length, 1, "pesan sendiri tidak tampil ganda");
});