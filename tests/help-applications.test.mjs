// Unit test pemisahan pengajuan bantuan milik pemilik postingan vs pemohon.
// Jalankan: node --test tests/
//
// Supabase DIPALSUKAN lewat env dummy + stub SupabaseClient. Tidak ada request
// jaringan dan tidak ada akses database.
//
// Fokus:
// - fetchMyHelpApplications memisahkan pengajuan MASUK (pemilik post) dari
//   pengajuan milik user sendiri, dan memberi tanda isPostOwner/isOwnSubmission
// - RPC accept/reject hanya dijalankan untuk baris milik pemilik post
// - accept/reject tidak dilaporkan sukses bila status tidak benar-benar berubah
// - getMyActiveApplicationForPost hanya menganggap 'pending'/'accepted' sebagai
//   pengajuan aktif (rejected/withdrawn tidak memblokir pengajuan baru)
// - submitHelpApplication meneruskan penolakan duplikat dari RPC 010

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import test from "node:test";
import assert from "node:assert/strict";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // pemilik post A
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // pemohon / pemilik post B
const POST_A = "11111111-1111-4111-8111-111111111111"; // milik ME
const POST_B = "22222222-2222-4222-8222-222222222222"; // milik OTHER

const APP_INCOMING = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // OTHER → POST_A
const APP_MINE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // ME → POST_B

let modulesPromise = null;
function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import("../src/lib/supabase.js"),
      import("../src/lib/data.js"),
    ]).then(([supabase, data]) => ({ getSupabase: supabase.getSupabase, data }));
  }
  return modulesPromise;
}

const APPLICATIONS = [
  {
    id: APP_INCOMING,
    post_id: POST_A,
    applicant_id: OTHER,
    message: "Halo, saya tertarik membantu.",
    contact_info: "081234567890",
    available_time: "Sabtu",
    extra_note: "",
    status: "pending",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: APP_MINE,
    post_id: POST_B,
    applicant_id: ME,
    message: "Saya bisa bantu.",
    contact_info: "081200000000",
    available_time: "Minggu",
    extra_note: "",
    status: "pending",
    created_at: "2026-10-02T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
  },
];

const POSTS = [
  { id: POST_B, author_id: OTHER },
  { id: POST_A, author_id: ME },
];

const PROFILES = [
  { id: OTHER, name: "Pelamar", avatar_url: "" },
  { id: ME, name: "Pemilik", avatar_url: "" },
];

/**
 * Stub minimal untuk query berantai yang dipakai data.js:
 * from(table).select(...).order(...)            → fetchMyHelpApplications
 * from(table).select(...).in(...)               → posts / profiles / filter status
 * from(table).select(...).eq(...).eq(...).maybeSingle() → verifikasi status
 *   (atau getMyActiveApplicationForPost dengan chain .eq/.in/.order/.maybeSingle)
 */
async function stubSupabase({ rpcImpl, finalStatus = null, activeApp = null } = {}) {
  const { getSupabase } = await loadModules();
  const client = getSupabase();
  const calls = { rpc: [], from: [] };

  client.auth.getUser = async () => ({ data: { user: { id: ME } }, error: null });
  client.rpc = async (fn, args) => {
    calls.rpc.push({ fn, args });
    if (rpcImpl) return rpcImpl(fn, args);
    return { data: null, error: null };
  };

  // Verifikasi status setelah RPC hanya mengembalikan baris bila status akhir
  // sama dengan status yang diminta (simulasi .eq("status", expected)).
  const verifyRow = (expected) =>
    finalStatus && finalStatus === expected
      ? { data: { id: "x", status: finalStatus }, error: null }
      : { data: null, error: null };

  // Satu-satunya pengajuan milik user. Supabase hanya mengembalikan baris ini bila
  // model mengirim filter status yang mencakup statusnya — jadi memperluas/
  // mengubah daftar status di kode akan membuat hasil test berubah (dan terdeteksi).
  const ownApplicationRow = (eqFilters, statusIn) => {
    if (!activeApp) return null;
    if (!statusIn || !statusIn.values.includes(activeApp.status)) return null;
    return { id: activeApp.id, status: activeApp.status, post_id: eqFilters.post_id };
  };

  // Query builder seperti PostgREST: setiap method mengembalikan builder yang
  // sama, dan builder itu THENABLE. Jadi `.in(...)` atau `.order(...)` di akhir
  // build sama-sama bisa langsung di-await, seperti pada @supabase/supabase-js.
  client.from = (table) => {
    calls.from.push(table);
    const eqFilters = {};
    const inFilters = [];

    const buildResult = () => {
      const statusIn = inFilters.find((f) => f.column === "status");
      // 1) Pengajuan milik user sendiri: eq applicant_id + in status
      if (eqFilters.applicant_id === ME && statusIn) {
        return { data: ownApplicationRow(eqFilters, statusIn), error: null };
      }
      // 2) Verifikasi status setelah RPC: eq id + eq status
      if (Object.prototype.hasOwnProperty.call(eqFilters, "status")) {
        return verifyRow(eqFilters.status);
      }
      // 3) Lookup baris yang bisa dibaca user (posts / profiles)
      if (inFilters.length > 0) {
        const idIn = inFilters.find((f) => f.column === "id");
        if (idIn) {
          return { data: table === "profiles" ? PROFILES : POSTS, error: null };
        }
      }
      // 4) Daftar pengajuan untuk pemilik (fetchMyHelpApplications)
      return { data: APPLICATIONS, error: null };
    };

    const builder = {
      select: () => builder,
      eq: (column, value) => {
        eqFilters[column] = value;
        return builder;
      },
      in: (column, values) => {
        inFilters.push({ column, values });
        return builder;
      },
      order: () => builder,
      maybeSingle: async () => {
        const result = buildResult();
        // Query milik user sendiri memang bisa mengembalikan null (tidak ada
        // pengajuan aktif) — jangan diubah menjadi error.
        if (eqFilters.applicant_id === ME) return result;
        return result.data !== null && !Array.isArray(result.data)
          ? result
          : { data: null, error: result.error };
      },
      then: (onFulfilled, onRejected) =>
        Promise.resolve(buildResult()).then(onFulfilled, onRejected),
    };

    return builder;
  };

  return { client, calls };
}
test("fetchMyHelpApplications: pengajuan masuk vs milik sendiri dipisah", async () => {
  await stubSupabase();
  const { data } = await loadModules();
  const result = await data.fetchMyHelpApplications();

  assert.deepEqual(result.applications.map((a) => a.id), [APP_INCOMING]);
  assert.deepEqual(result.myApplications.map((a) => a.id), [APP_MINE]);

  const incoming = result.applications[0];
  assert.equal(incoming.isPostOwner, true);
  assert.equal(incoming.isOwnSubmission, false);
  assert.equal(incoming.applicantId, OTHER);

  const mine = result.myApplications[0];
  assert.equal(mine.isPostOwner, false);
  assert.equal(mine.isOwnSubmission, true);
});

test("accept hanya dipanggil pada pengajuan yang dimiliki, bukan pengajuan sendiri", async () => {
  const { calls } = await stubSupabase({ finalStatus: "accepted" });
  const { data } = await loadModules();
  const result = await data.fetchMyHelpApplications();

  const actionable = result.applications.filter(
    (a) => a.status === "pending" && a.isPostOwner && !a.isOwnSubmission,
  );
  await data.acceptHelpApplication(actionable[0].id);

  assert.deepEqual(calls.rpc.map((c) => c.fn), ["accept_help_application"]);
  assert.deepEqual(calls.rpc[0].args, { p_application_id: APP_INCOMING });
});

test("accept: status tidak berubah setelah RPC → dianggap gagal", async () => {
  await stubSupabase({ finalStatus: null });
  const { data } = await loadModules();
  await assert.rejects(
    () => data.acceptHelpApplication(APP_INCOMING),
    /tidak berhasil diterima/,
  );
});

test("reject: status tidak berubah setelah RPC → dianggap gagal", async () => {
  await stubSupabase({ finalStatus: null });
  const { data } = await loadModules();
  await assert.rejects(
    () => data.rejectHelpApplication(APP_INCOMING),
    /tidak berhasil ditolak/,
  );
});

test("reject: RPC mengubah status → sukses tanpa error", async () => {
  const { calls } = await stubSupabase({ finalStatus: "rejected" });
  const { data } = await loadModules();
  await data.rejectHelpApplication(APP_INCOMING);
  assert.deepEqual(calls.rpc.map((c) => c.fn), ["reject_help_application"]);
});

test("error RPC 'Hanya pemilik postingan' diterjemahkan, tidak dilaporkan sukses", async () => {
  await stubSupabase({
    rpcImpl: () => ({
      data: null,
      error: { message: "Hanya pemilik postingan yang dapat menerima pengajuan." },
    }),
    finalStatus: "pending",
  });
  const { data } = await loadModules();
  await assert.rejects(
    () => data.acceptHelpApplication(APP_INCOMING),
    /Hanya pemilik postingan yang dapat menerima pengajuan\./,
  );
});

test("getMyActiveApplicationForPost: hanya pengajuan pending/accepted milik user yang dilaporkan", async () => {
  await stubSupabase({ activeApp: { id: APP_MINE, status: "pending" } });
  const { data } = await loadModules();
  const app = await data.getMyActiveApplicationForPost(POST_B);
  // Hanya id+status yang dikembalikan ke UI (bukan seluruh isi pengajuan).
  assert.equal(app.id, APP_MINE);
  assert.equal(app.status, "pending");
});

test("getMyActiveApplicationForPost: rejected/withdrawn tidak dianggap aktif → null", async () => {
  // Stub hanya mengembalikan baris bila status baris termasuk filter
  // pending/accepted yang dikirim kode (sama seperti aturan RPC 010).
  for (const status of ["rejected", "withdrawn"]) {
    await stubSupabase({ activeApp: { id: APP_MINE, status } });
    const { data } = await loadModules();
    const app = await data.getMyActiveApplicationForPost(POST_B);
    assert.equal(app, null, `status ${status} tidak boleh memblokir pengajuan baru`);
  }
});

test("getMyActiveApplicationForPost: accepted dilaporkan sebagai pengajuan aktif", async () => {
  await stubSupabase({ activeApp: { id: APP_MINE, status: "accepted" } });
  const { data } = await loadModules();
  const app = await data.getMyActiveApplicationForPost(POST_B);
  assert.equal(app.id, APP_MINE);
  assert.equal(app.status, "accepted");
});

test("submitHelpApplication: RPC menolak duplikat → error diterjemahkan, bukan sukses", async () => {
  await stubSupabase({
    rpcImpl: () => ({
      data: null,
      error: { message: "Anda sudah memiliki pengajuan pending atau diterima untuk postingan ini." },
    }),
  });
  const { data } = await loadModules();
  await assert.rejects(
    () =>
      data.submitHelpApplication(POST_B, {
        message: "Halo, saya tertarik membantu.",
        contactInfo: "081234567890",
        availableTime: "Sabtu",
      }),
    /Anda sudah memiliki pengajuan pending atau diterima untuk postingan ini\./,
  );
});

test("submitHelpApplication: tidak memanggil RPC bagi pengguna yang belum login", async () => {
  const { client, calls } = await stubSupabase();
  client.auth.getUser = async () => ({ data: { user: null }, error: null });
  const { data } = await loadModules();
  await assert.rejects(
    () => data.submitHelpApplication(POST_B, { message: "Halo, saya tertarik membantu." }),
    /Anda harus masuk terlebih dahulu\./,
  );
  assert.equal(calls.rpc.length, 0);
});
