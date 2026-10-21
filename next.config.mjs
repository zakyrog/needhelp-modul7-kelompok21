import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/katalog.html", destination: "/katalog", permanent: false },
      { source: "/login.html", destination: "/login", permanent: false },
      {
        source: "/detail-postingan.html",
        destination: "/detail-postingan",
        permanent: false,
      },
      {
        source: "/buat-postingan.html",
        destination: "/buat-postingan",
        permanent: false,
      },
      {
        source: "/sukses-postingan.html",
        destination: "/sukses-postingan",
        permanent: false,
      },
      { source: "/aktivitas.html", destination: "/aktivitas", permanent: false },
      { source: "/chat.html", destination: "/chat", permanent: false },
      { source: "/rating.html", destination: "/rating", permanent: false },
      {
        source: "/notifikasi.html",
        destination: "/notifikasi",
        permanent: false,
      },
      {
        source: "/formbantuan.html",
        destination: "/formbantuan",
        permanent: false,
      },
      { source: "/formeror.html", destination: "/formeror", permanent: false },
    ];
  },
};

export default nextConfig;
