const APP_ORIGIN = "https://needhelp.local";

/**
 * Menormalkan tujuan navigasi agar selalu berada di dalam aplikasi.
 * Nilai eksternal, protokol berbahaya, dan URL protocol-relative ditolak.
 */
export function getSafeInternalPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;

  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
