// Unit test modul avatar (src/lib/avatars.js).
// Jalankan: node --test tests/
//
// Fokus Batch 6:
// - Daftar avatar harus sinkron dengan CHECK constraint migration 015
//   (profiles_avatar_key_check). Kalau tidak sinkron, simpan avatar di mode
//   Supabase akan ditolak database (error 23514) — jadi urutan dan isinya
//   diuji eksplisit di sini.
// - resolveAvatarSrc() harus fallback berjenjang: avatar_key -> foto asli ->
//   null (null = pemanggil menampilkan inisial nama, avatar default).
// - Placeholder lama (aset teal) TIDAK boleh dianggap foto asli.
// - Nilai/identifier tak dikenal tidak boleh menghasilkan aset yang salah.

import test from "node:test";
import assert from "node:assert/strict";

import {
  AVATAR_KEYS,
  AVATAR_DIR,
  LEGACY_AVATAR_PLACEHOLDER,
  isValidAvatarKey,
  avatarSrc,
  avatarLabel,
  getAvatarOptions,
  resolveAvatarSrc,
} from "../src/lib/avatars.js";

// Daftar ini adalah kutipan langsung CHECK constraint migration 015.
// Sengaja ditulis manual (bukan diimpor) supaya perubahan tak sengaja pada
// AVATAR_KEYS langsung ketahuan di sini, bukan diam-diam gagal saat runtime.
const CONSTRAINT_VALUES = [
  "fox",
  "cat",
  "owl",
  "pandan",
  "kopi",
  "merapi",
  "becak",
  "batik",
];

test("AVATAR_KEYS sama persis dengan CHECK constraint migration 015", () => {
  assert.deepEqual([...AVATAR_KEYS], CONSTRAINT_VALUES);
});

test("AVATAR_KEYS beku (tidak bisa diubah dari luar)", () => {
  assert.equal(Object.isFrozen(AVATAR_KEYS), true);
});

test("isValidAvatarKey hanya menerima key yang terdaftar", () => {
  for (const key of CONSTRAINT_VALUES) {
    assert.equal(isValidAvatarKey(key), true, `${key} harus sah`);
  }
  for (const bad of [
    null,
    undefined,
    "",
    "  ",
    "Fox", // case-sensitive
    "rubah", // label, bukan identifier
    "dragon",
    42,
    {},
    [],
    "fox ",
  ]) {
    assert.equal(isValidAvatarKey(bad), false, `${String(bad)} harus ditolak`);
  }
});

test("avatarSrc membangun path aset lokal, bukan URL luar", () => {
  for (const key of CONSTRAINT_VALUES) {
    const src = avatarSrc(key);
    assert.equal(src, `${AVATAR_DIR}/${key}.svg`);
    assert.match(src, /^\/assets\/images\/avatars\/[a-z]+\.svg$/);
  }
  assert.equal(avatarSrc("dragon"), null);
  assert.equal(avatarSrc(null), null);
});

test("avatarLabel memberi label Indonesia, null bila tak dikenal", () => {
  assert.equal(avatarLabel("fox"), "Rubah");
  assert.equal(avatarLabel("merapi"), "Gunung Merapi");
  assert.equal(avatarLabel("dragon"), null);
  assert.equal(avatarLabel(null), null);
});

test("getAvatarOptions menghasilkan satu entri siap-render per key", () => {
  const options = getAvatarOptions();
  assert.equal(options.length, CONSTRAINT_VALUES.length);
  assert.deepEqual(
    options.map((o) => o.key),
    CONSTRAINT_VALUES,
  );
  for (const option of options) {
    assert.equal(typeof option.label, "string");
    assert.ok(option.label.length > 0);
    assert.equal(option.src, `${AVATAR_DIR}/${option.key}.svg`);
  }
});

test("resolveAvatarSrc: avatar_key menang atas avatar_url", () => {
  assert.equal(
    resolveAvatarSrc({ key: "owl", url: "https://cdn.example.com/me.jpg" }),
    `${AVATAR_DIR}/owl.svg`,
  );
});

test("resolveAvatarSrc: tanpa key, pakai foto asli", () => {
  assert.equal(
    resolveAvatarSrc({ key: null, url: "https://cdn.example.com/me.jpg" }),
    "https://cdn.example.com/me.jpg",
  );
});

test("resolveAvatarSrc: key tak dikenal jatuh ke foto, bukan aset salah", () => {
  assert.equal(
    resolveAvatarSrc({ key: "dragon", url: "https://cdn.example.com/me.jpg" }),
    "https://cdn.example.com/me.jpg",
  );
  // key tak dikenal tanpa foto -> null (inisial), bukan /avatars/dragon.svg
  assert.equal(resolveAvatarSrc({ key: "dragon" }), null);
});

test("resolveAvatarSrc: placeholder lama TIDAK dianggap foto asli", () => {
  assert.equal(resolveAvatarSrc({ url: LEGACY_AVATAR_PLACEHOLDER }), null);
  assert.equal(
    resolveAvatarSrc({ key: null, url: LEGACY_AVATAR_PLACEHOLDER }),
    null,
  );
});

test("resolveAvatarSrc: nilai kosong/absen -> null (inisial default)", () => {
  assert.equal(resolveAvatarSrc(), null);
  assert.equal(resolveAvatarSrc({}), null);
  assert.equal(resolveAvatarSrc({ key: null, url: null }), null);
  assert.equal(resolveAvatarSrc({ key: null, url: "" }), null);
  assert.equal(resolveAvatarSrc({ key: null, url: "   " }), null);
  assert.equal(resolveAvatarSrc({ key: null, url: undefined }), null);
});

test("resolveAvatarSrc: data lama berbentuk aneh tidak melempar error", () => {
  // Toleran terhadap tipe tak terduga — tidak crash, hasilnya null/foto.
  assert.equal(resolveAvatarSrc({ key: 123, url: 456 }), null);
  assert.equal(resolveAvatarSrc({ key: {}, url: [] }), null);
  assert.equal(
    resolveAvatarSrc({ key: [], url: "/assets/images/avatar-sari.svg" }),
    "/assets/images/avatar-sari.svg",
  );
});
