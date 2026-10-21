import React from "react";

export function EmptyState({
  icon = "🔍",
  title = "Tidak ada postingan yang cocok",
  description = "Coba ubah kata kunci atau sesuaikan filter untuk menemukan bantuan.",
  actionText,
  onAction,
}) {
  return (
    <div className="empty-state-card" role="status">
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          className="button button-outline"
          onClick={onAction}
          style={{ marginTop: "8px" }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
