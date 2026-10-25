
"use client";

import React from "react";

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Periksa koneksi atau coba lagi.",
  onRetry,
}) {
  return (
    <section
      className="error-state-card"
      role="alert"
      aria-live="assertive"
    >
      <span className="error-state-icon" aria-hidden="true">
        ⚠
      </span>

      <h3 className="error-state-title">{title}</h3>

      <p className="error-state-message">{message}</p>

      {typeof onRetry === "function" && (
        <button
          type="button"
          className="retry-button"
          onClick={onRetry}
        >
          Coba Lagi
        </button>
      )}
    </section>
  );
}
