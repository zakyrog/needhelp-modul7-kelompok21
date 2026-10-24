
"use client";

import { useToast } from "../../components/Toast";

export default function TestToastPage() {
  const { showToast } = useToast();

  return (
    <main style={{
      maxWidth: "600px",
      margin: "40px auto",
      padding: "20px",
    }}>
      <h1>Pengujian Toast Notification</h1>
      <p>Klik tombol untuk menguji tampilan notifikasi.</p>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "24px",
      }}>
        <button
          type="button"
          onClick={() => showToast(
            "Postingan berhasil diterbitkan!",
            "success"
          )}
        >
          Tes Success
        </button>

        <button
          type="button"
          onClick={() => showToast(
            "Gagal menyimpan postingan. Coba lagi.",
            "error"
          )}
        >
          Tes Error
        </button>

        <button
          type="button"
          onClick={() => showToast(
            "Informasi berhasil diperbarui.",
            "info"
          )}
        >
          Tes Info
        </button>

        <button
          type="button"
          onClick={() => showToast(
            "Ini contoh pesan notifikasi yang cukup panjang untuk menguji tampilan responsif.",
            "success",
          )}
        >
          Tes Pesan Panjang
        </button>
      </div>
    </main>
  );
}
