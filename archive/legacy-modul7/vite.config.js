import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        [
          "index",
          "login",
          "katalog",
          "detail-postingan",
          "buat-postingan",
          "sukses-postingan",
          "aktivitas",
          "chat",
          "rating",
          "notifikasi",
          "formbantuan",
          "formeror",
        ].map((name) => [name, resolve(import.meta.dirname, name + ".html")]),
      ),
    },
  },
});
