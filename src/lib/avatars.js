/**
 * Avatar ilustrasi NeedHelp.
 *
 * Satu sumber kebenaran untuk daftar avatar ilustrasi yang disediakan aplikasi,
 * label yang ditampilkan ke pengguna, dan cara menerjemahkan identifier
 * (`avatar_key` di tabel profiles) menjadi path aset.
 *
 * ATURAN PENTING:
 * - Daftar AVATAR_KEYS HARUS sama persis dengan CHECK constraint
 *   `profiles_avatar_key_check` pada migration 015_profile_avatar_key.sql.
 *   Menambah key di sini tanpa menyesuaikan constraint akan membuat simpan
 *   gagal (error 23514) saat mode Supabase.
 * - Identifier yang tidak dikenal → null. Pemanggil WAJIB mem-fallback ke
 *   inisial nama (avatar default), bukan menampilkan aset yang salah.
 * - Aset adalah SVG lokal di /assets/images/avatars/<key>.svg (bukan emoji,
 *   bukan unggahan pengguna).
 *
 * File ini bebas dari Supabase/localStorage sehingga bisa diuji unit murni.
 */

/** Urutan tampil di pemilih avatar. */
export const AVATAR_KEYS = Object.freeze([
  "fox",
  "cat",
  "owl",
  "pandan",
  "kopi",
  "merapi",
  "becak",
  "batik",
]);

/** Label bahasa Indonesia untuk setiap avatar (dipakai sebagai teks aksesibel). */
const AVATAR_LABELS = Object.freeze({
  fox: "Rubah",
  cat: "Kucing",
  owl: "Burung Hantu",
  pandan: "Pandan",
  kopi: "Kopi",
  merapi: "Gunung Merapi",
  becak: "Becak",
  batik: "Batik",
});

/** Direktori aset avatar ilustrasi. */
export const AVATAR_DIR = "/assets/images/avatars";

/**
 * Kunci cache profil untuk mode demo (tanpa Supabase).
 *
 * Mode Supabase menyimpan pilihan avatar di kolom `profiles.avatar_key`. Mode
 * demo tidak punya database, jadi perubahan profil yang diketik pengguna
 * sendiri (nama, bio, avatar_key) disimpan di localStorage perangkat ini agar
 * tetap terpakai setelah reload. Dipakai bersama oleh halaman /profil (penulis)
 * dan Header (pembaca) supaya avatar yang dipilih konsisten.
 */
export const DEMO_PROFILE_KEY = "needhelp.demo-profile.v1";

/**
 * Placeholder lama dari design system sebelumnya (teal). Bila `avatar_url`
 * masih menunjuk aset ini, artinya pengguna belum punya foto — jadi bukan
 * avatar yang layak ditampilkan; pemanggil mem-fallback ke inisial.
 */
export const LEGACY_AVATAR_PLACEHOLDER = "/assets/images/avatar-user.svg";

/**
 * Menentukan gambar avatar yang layak ditampilkan dari data profil.
 *
 * Urutan prioritas (fallback berjenjang, requirement 9):
 *   1. avatar_key sah  -> ilustrasi /assets/images/avatars/<key>.svg
 *   2. avatar_url nyata (bukan placeholder lama & bukan kosong) -> foto
 *   3. selain itu      -> null, artinya pemanggil menampilkan INISIAL nama
 *                         (avatar default, requirement 5)
 *
 * Tidak pernah mengarang data: bila tidak ada yang tersedia, hasilnya null.
 *
 * @param {{key?: unknown, url?: unknown}} [profile]
 * @returns {string|null}
 */
export function resolveAvatarSrc(profile = {}) {
  const { key, url } = profile;
  if (isValidAvatarKey(key)) return `${AVATAR_DIR}/${key}.svg`;
  if (typeof url === "string" && url.trim() && url !== LEGACY_AVATAR_PLACEHOLDER) {
    return url;
  }
  return null;
}

/**
 * Menilai apakah sebuah nilai adalah identifier avatar yang sah.
 * @param {unknown} key
 * @returns {boolean}
 */
export function isValidAvatarKey(key) {
  return typeof key === "string" && AVATAR_KEYS.includes(key);
}

/**
 * Path aset untuk sebuah identifier avatar.
 * @param {unknown} key
 * @returns {string|null} path SVG, atau null bila identifier tidak sah
 */
export function avatarSrc(key) {
  return isValidAvatarKey(key) ? `${AVATAR_DIR}/${key}.svg` : null;
}

/**
 * Label Indonesia untuk sebuah identifier avatar.
 * @param {unknown} key
 * @returns {string|null}
 */
export function avatarLabel(key) {
  return isValidAvatarKey(key) ? AVATAR_LABELS[key] : null;
}

/**
 * Daftar avatar siap-render untuk pemilih di halaman profil.
 * @returns {{key: string, label: string, src: string}[]}
 */
export function getAvatarOptions() {
  return AVATAR_KEYS.map((key) => ({
    key,
    label: AVATAR_LABELS[key],
    src: `${AVATAR_DIR}/${key}.svg`,
  }));
}
