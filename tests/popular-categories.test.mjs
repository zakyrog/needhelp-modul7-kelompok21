// Unit test penghitungan kategori populer (src/lib/data.js).
// Jalankan: node --test tests/
//
// Fokus:
// - hanya kategori resmi (key CATEGORY_LABELS) yang dihitung
// - post selesai/batal/status tak dikenal tidak dihitung
// - urut jumlah terbanyak, seri mengikuti urutan kategori stabil
// - kategori tanpa post tetap tampil dengan 0 (atau disembunyikan bila diminta)

import test from "node:test";
import assert from "node:assert/strict";

import { computeCategoryCounts, CATEGORY_KEYS, CATEGORY_LABELS } from "../src/lib/data.js";

const none = { kind: "none", status: null, ambiguous: false };
const closed = (status) => ({ kind: "closed", status, ambiguous: false });
const unknown = { kind: "unknown", status: null, ambiguous: true };

const post = (category, activity = none) => ({ category, activity });

test("kategori resmi selalu dikembalikan dengan count 0 bila kosong", () => {
  const rows = computeCategoryCounts([]);
  assert.deepEqual(
    rows.map((row) => row.key),
    [...CATEGORY_KEYS],
  );
  assert.ok(rows.every((row) => row.count === 0));
  assert.ok(rows.every((row) => row.label === CATEGORY_LABELS[row.key]));
});

test("menghitung post per kategori resmi dan mengabaikan kategori lain", () => {
  const rows = computeCategoryCounts([
    post("bantuan"),
    post("bantuan"),
    post("explore"),
    post("Kebersihan"), // bukan key resmi
    post("lainnya"), // bukan key resmi
  ]);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row.count]));
  assert.deepEqual(byKey, { ditemani: 0, bantuan: 2, pendampingan: 0, explore: 1 });
});

test("post selesai, batal, dan status tak dikenal tidak dihitung", () => {
  const rows = computeCategoryCounts([
    post("pendampingan"),
    post("pendampingan", closed("selesai")),
    post("pendampingan", closed("batal")),
    post("pendampingan", unknown),
  ]);
  const ditemani = rows.find((row) => row.key === "pendampingan");
  assert.equal(ditemani.count, 1);
});

test("post menunggu/berlangsung dihitung sebagai aktif", () => {
  const active = (status) => ({ kind: "active", status, ambiguous: false });
  const rows = computeCategoryCounts([
    post("ditemani", active("menunggu")),
    post("ditemani", active("berlangsung")),
  ]);
  assert.equal(rows.find((row) => row.key === "ditemani").count, 2);
});

test("urut jumlah terbanyak; kategori kosong di akhir", () => {
  const rows = computeCategoryCounts([
    post("explore"),
    post("explore"),
    post("explore"),
    post("pendampingan"),
    post("bantuan"),
  ]);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["explore", "bantuan", "pendampingan", "ditemani"],
  );
});

test("seri menggunakan urutan kategori stabil (CATEGORY_KEYS)", () => {
  const rows = computeCategoryCounts([
    post("explore"),
    post("pendampingan"),
    post("bantuan"),
  ]);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["bantuan", "pendampingan", "explore", "ditemani"],
  );
  assert.deepEqual(
    rows.map((row) => row.count),
    [1, 1, 1, 0],
  );
});

test("includeEmpty: false menyembunyikan kategori tanpa post", () => {
  const rows = computeCategoryCounts([post("bantuan")], { includeEmpty: false });
  assert.deepEqual(rows.map((row) => row.key), ["bantuan"]);
  assert.equal(rows[0].count, 1);
});

test("limit memotong hasil setelah pengurutan", () => {
  const rows = computeCategoryCounts(
    [post("explore"), post("explore"), post("bantuan")],
    { limit: 2 },
  );
  assert.deepEqual(rows.map((row) => row.key), ["explore", "bantuan"]);
});

test("input bukan array tidak melempar error", () => {
  const rows = computeCategoryCounts(null);
  assert.equal(rows.length, CATEGORY_KEYS.length);
  assert.ok(rows.every((row) => row.count === 0));
});