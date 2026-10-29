// Unit test LOKAL untuk kontrak klien penghapusan postingan (src/lib/data.js).
// Jalankan: node --test tests/
//
// PENTING: PostgreSQL TIDAK tersedia di lingkungan ini. Test ini TIDAK menguji
// isi migration 013 (SQL) dan tidak membuktikan SQL valid. Yang diuji:
// - klien memanggil RPC delete_post_with_cleanup hanya dengan p_post_id
// - tanpa sesi tidak ada RPC
// - penolakan server dipetakan ke pesan Indonesia yang benar (termasuk pesan
//   "Verifikasi gagal" yang juga dikirim 013)
// - pemetaan file SQL 013 vs 009 dibaca dari teks file (statis): signature,
//   atribut fungsi, urutan lock, DELETE, REVOKE/GRANT, sanity check.

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SQL_013 = path.join(ROOT, "supabase", "migrations", "013_delete_post_with_chat_cleanup.sql");
const POST_A = "11111111-1111-4111-8111-111111111111";

let modulesPromise = null;
function loadData() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import("../src/lib/supabase.js"),
      import("../src/lib/data.js"),
    ]).then(([supabase, data]) => ({ getSupabase: supabase.getSupabase, data }));
  }
  return modulesPromise;
}

async function stubSupabase({ user = { id: "me" }, rpcImpl } = {}) {
  const { getSupabase } = await loadData();
  const client = getSupabase();
  const calls = { rpc: [] };
  client.auth.getUser = async () =>
    user ? { data: { user }, error: null } : { data: { user: null }, error: null };
  client.rpc = async (fn, args) => {
    calls.rpc.push({ fn, args });
    if (rpcImpl) return rpcImpl(fn, args);
    return { data: null, error: null };
  };
  return { client, calls };
}

// ---------------------------------------------------------------------------
// Klien: deletePostSupabase
// ---------------------------------------------------------------------------

test("deletePostSupabase mengirim hanya p_post_id ke RPC delete_post_with_cleanup", async () => {
  const { calls } = await stubSupabase();
  const { data } = await loadData();
  await data.deletePostSupabase(POST_A);
  assert.deepEqual(calls.rpc, [
    { fn: "delete_post_with_cleanup", args: { p_post_id: POST_A } },
  ]);
});

test("deletePostSupabase tanpa sesi tidak memanggil RPC", async () => {
  const { calls } = await stubSupabase({ user: null });
  const { data } = await loadData();
  await assert.rejects(() => data.deletePostSupabase(POST_A), /masuk terlebih dahulu/);
  assert.equal(calls.rpc.length, 0);
});

test("penolakan perlindungan pengajuan/aktivitas tetap memakai pesan 009", async () => {
  const cases = [
    ["Postingan ini tidak dapat dihapus karena masih memiliki pengajuan bantuan yang menunggu keputusan. Tolak pengajuan tersebut terlebih dahulu.", /menunggu keputusan/i],
    ["Postingan ini tidak dapat dihapus karena sudah memiliki pengajuan yang diterima. Selesaikan atau batalkan aktivitas terlebih dahulu.", /sudah diterima/i],
    ["Postingan ini tidak dapat dihapus karena memiliki riwayat aktivitas. Batalkan atau selesaikan semua aktivitas terlebih dahulu sebelum menghapus postingan.", /aktivitas yang sedang berlangsung atau sudah selesai/i],
    ["Penghapusan dihentikan: ditemukan aktivitas berstatus batal milik pengguna lain pada postingan ini. Tindakan manual diperlukan.", /pengguna lain/i],
    ["Anda bukan pemilik postingan ini.", /tidak memiliki izin/i],
    ["Postingan tidak ditemukan.", /tidak ditemukan/i],
  ];
  for (const [message, uiPattern] of cases) {
    await stubSupabase({ rpcImpl: () => ({ data: null, error: { message } }) });
    const { data } = await loadData();
    // Klien mencocokkan teks SERVER (009/013) lalu menampilkan pesan UI-nya sendiri.
    await assert.rejects(() => data.deletePostSupabase(POST_A), uiPattern, message);
  }
});

test("sanity check 013 yang gagal juga dipetakan ke pesan 'data berubah bersamaan'", async () => {
  const message =
    "Verifikasi gagal: masih ditemukan 0 pengajuan, 0 aktivitas, dan 1 percakapan yang merujuk postingan setelah penghapusan. Transaksi dibatalkan.";
  await stubSupabase({ rpcImpl: () => ({ data: null, error: { message } }) });
  const { data } = await loadData();
  await assert.rejects(() => data.deletePostSupabase(POST_A), /data berubah bersamaan/i);
});

// ---------------------------------------------------------------------------
// Pemeriksaan statis file SQL 013 (bukan eksekusi SQL!)
// ---------------------------------------------------------------------------

const sql = fs.readFileSync(SQL_013, "utf8");
const positionOf = (needle) => {
  const idx = sql.indexOf(needle);
  assert.notEqual(idx, -1, `tidak ditemukan di 013: ${needle}`);
  return idx;
};

test("013 memakai CREATE OR REPLACE dengan signature 009 dan atribut keamanan yang sama", () => {
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.delete_post_with_cleanup\(\s*p_post_id UUID\s*\)/,
  );
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = ''/);
  assert.match(sql, /RETURNS VOID/);
});

test("013 mencabut EXECUTE dari PUBLIC dan anon lalu memberi authenticated", () => {
  assert.match(
    sql,
    /REVOKE EXECUTE ON FUNCTION public\.delete_post_with_cleanup\(UUID\) FROM PUBLIC;/,
  );
  assert.match(
    sql,
    /REVOKE EXECUTE ON FUNCTION public\.delete_post_with_cleanup\(UUID\) FROM anon;/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.delete_post_with_cleanup\(UUID\) TO authenticated;/,
  );
});

test("013 mengunci dalam urutan posts -> help_applications -> activities -> conversations -> messages", () => {
  const body = sql.slice(positionOf("CREATE OR REPLACE FUNCTION public.delete_post_with_cleanup"));
  const pFnBody = body.indexOf("BEGIN"); // lewati komentar header sebelum badan fungsi
  const pPosts = body.indexOf("FROM public.posts", pFnBody);
  const pApps = body.indexOf("FROM public.help_applications ha", pFnBody);
  const pActs = body.indexOf("FROM public.activities a", pFnBody);
  const pConvs = body.indexOf("FROM public.conversations c", pFnBody);
  const pMsgs = body.indexOf("FROM public.messages m", pFnBody);
  for (const [name, p] of [["apps", pApps], ["acts", pActs], ["convs", pConvs], ["msgs", pMsgs]]) {
    assert.ok(p > pPosts, `lock ${name} harus setelah posts`);
  }
  assert.ok(pApps < pActs, "lock pengajuan harus sebelum aktivitas");
  assert.ok(pActs < pConvs, "lock aktivitas harus sebelum percakapan");
  assert.ok(pConvs < pMsgs, "lock percakapan harus sebelum pesan");
  // Tepat 4 statement lock PERFORM … FOR UPDATE (pengajuan, aktivitas,
// percakapan, pesan). Lock posts memakai SELECT … INTO … FOR UPDATE terpisah.
  const fnEnd = body.indexOf("\n$$;", pFnBody);
  const fnBody = body.slice(pFnBody, fnEnd);
  assert.equal(
    (fnBody.match(/PERFORM [\s\S]*?FOR UPDATE;/g) || []).length,
    4,
    "jumlah PERFORM … FOR UPDATE lock",
  );
  // Deterministik
  // pMsgs menunjuk "FROM" di dalam IN; lock pesan berakhir di FOR UPDATE setelahnya.
  const lockBlock = body.slice(pApps, body.indexOf("FOR UPDATE", pMsgs) + "FOR UPDATE;".length);
  // Blok ini memuat 4 lock (apps, activities, conversations, dan messages lewat IN).
  assert.equal((lockBlock.match(/ORDER BY /g) || []).length, 4);
  assert.equal((lockBlock.match(/FOR UPDATE;/g) || []).length, 4);
  assert.ok(
    /WHERE m\.conversation_id IN \([\s\S]*?\)\s*ORDER BY m\.id\s*FOR UPDATE;/.test(lockBlock),
    "lock pesan harus lewat IN pada percakapan post ini lalu FOR UPDATE",
  );
});

test("013 menghapus pesan lalu percakapan sebelum postingan", () => {
  const body = sql.slice(positionOf("CREATE OR REPLACE FUNCTION public.delete_post_with_cleanup"));
  const delMsgs = body.indexOf("DELETE FROM public.messages");
  const delConvs = body.indexOf("DELETE FROM public.conversations");
  const delPosts = body.indexOf("DELETE FROM public.posts");
  assert.ok(delMsgs > 0 && delConvs > delMsgs && delPosts > delConvs);
  // Hapus hanya untuk percakapan pada post yang dihapus
  assert.match(body, /DELETE FROM public\.conversations\s+WHERE post_id = p_post_id;/);
});

test("013 mempertahankan validasi 009 (pesan error identik) tanpa menambah penolakan karena chat", () => {
  const required = [
    "Postingan tidak ditemukan.",
    "Anda bukan pemilik postingan ini.",
    "masih memiliki pengajuan bantuan yang menunggu keputusan",
    "sudah memiliki pengajuan yang diterima",
    "pengajuan bantuan dengan status yang tidak dikenali",
    "memiliki riwayat aktivitas",
    "aktivitas berstatus batal milik pengguna lain",
    "Diharapkan 1 baris, ditemukan %",
  ];
  for (const text of required) assert.ok(sql.includes(text), `harus ada: ${text}`);

  // Tidak boleh ada penolakan yang didasarkan pada keberadaan percakapan.
  assert.doesNotMatch(sql, /RAISE EXCEPTION[^;]*percakapan[^;]*(tidak dapat dihapus|ditolak)/i);
});

test("013 memiliki sanity check akhir yang menghitung pengajuan, aktivitas, dan percakapan", () => {
  const body = sql.slice(positionOf("CREATE OR REPLACE FUNCTION public.delete_post_with_cleanup"));
  const finalCheck = body.slice(body.lastIndexOf("-- TAHAP 9"));
  assert.match(finalCheck, /FROM public\.help_applications ha WHERE ha\.post_id = p_post_id/);
  assert.match(finalCheck, /FROM public\.activities a WHERE a\.post_id = p_post_id/);
  assert.match(finalCheck, /FROM public\.conversations c WHERE c\.post_id = p_post_id/);
  assert.match(finalCheck, /v_remaining_conversations > 0/);
  assert.match(body, /RAISE NOTICE 'delete_post_with_cleanup: post % dihapus/);
});

test("013 memeriksa FK berdasarkan relasi+kolom, bukan hanya nama constraint", () => {
  assert.match(sql, /con\.conrelid = 'public\.conversations'::regclass/);
  assert.match(sql, /con\.confrelid = 'public\.posts'::regclass/);
  assert.match(sql, /con\.conkey = ARRAY\[/);
  assert.match(sql, /con\.confkey = ARRAY\[/);
  assert.match(sql, /att\.attname = 'post_id'/);
  assert.match(sql, /att\.attname = 'conversation_id'/);
  assert.doesNotMatch(sql, /IF NOT EXISTS \(\s*SELECT 1 FROM pg_constraint\s*WHERE conname/);
});

test("013 menjelaskan bahwa instalasi baru tetap gagal sebelum 013 tanpa mengubah 009/012", () => {
  assert.match(sql, /CATATAN INSTALASI BARU/);
});