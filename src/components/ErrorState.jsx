import React from "react";

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Periksa koneksi atau coba lagi.",
  onRetry,
}) {
  return (
    <div className="error-state-card" role="alert">
      <h3>⚠ {title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="retry-button" onClick={onRetry}>
          Coba Lagi ↻
        </button>
      )}
    </div>
  );
}
