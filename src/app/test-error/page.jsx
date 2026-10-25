
"use client";

import { useState } from "react";
import { ErrorState } from "../../components/ErrorState";

export default function TestErrorPage() {
  const [showError, setShowError] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setRetryCount((count) => count + 1);
    setShowError(false);
  };

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h1>Pengujian Error State</h1>

      <p>Jumlah percobaan: {retryCount}</p>

      {showError ? (
        <ErrorState
          title="Gagal Memuat Data"
          message="Ini adalah simulasi error untuk pengujian."
          onRetry={handleRetry}
        />
      ) : (
        <section>
          <p>Simulasi pemuatan ulang berhasil.</p>

          <button
            type="button"
            onClick={() => setShowError(true)}
          >
            Tampilkan Error Lagi
          </button>
        </section>
      )}

      <hr style={{ margin: "24px 0" }} />

      <h2>Uji tanpa tombol retry</h2>

      <ErrorState
        title="Error tanpa Retry"
        message="Tombol Coba Lagi seharusnya tidak muncul."
      />
    </main>
  );
}
