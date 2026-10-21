import React from "react";

export function SkeletonText({ className = "medium" }) {
  return <div className={`skeleton skeleton-text ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <article className="skeleton-card" aria-busy="true" aria-label="Memuat data...">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="skeleton skeleton-avatar" />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text short" />
          <div className="skeleton skeleton-text" style={{ width: "50%", height: "10px" }} />
        </div>
      </div>
      <div className="skeleton skeleton-text long" style={{ height: "18px" }} />
      <div className="skeleton skeleton-text long" />
      <div className="skeleton skeleton-text medium" />
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "999px" }} />
        <div className="skeleton" style={{ width: "90px", height: "24px", borderRadius: "999px" }} />
      </div>
    </article>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}
