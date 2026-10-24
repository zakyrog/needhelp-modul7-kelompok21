
import React from "react";

export function SkeletonText({ className = "medium" }) {
  return (
    <div
      className={`skeleton skeleton-text ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <article
      className="skeleton-card"
      aria-busy="true"
      aria-label="Memuat data..."
    >
      <div className="skeleton-profile">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton-profile-info">
          <div className="skeleton skeleton-text short" />
          <div
            className="skeleton skeleton-text"
            style={{ width: "50%", height: "10px" }}
          />
        </div>
      </div>

      <div
        className="skeleton skeleton-text long"
        style={{ height: "18px" }}
      />
      <div className="skeleton skeleton-text long" />
      <div className="skeleton skeleton-text medium" />

      <div className="skeleton-tags">
        <div className="skeleton skeleton-tag" style={{ width: "80px" }} />
        <div className="skeleton skeleton-tag" style={{ width: "90px" }} />
      </div>
    </article>
  );
}

export function SkeletonList({ count = 3 }) {
  const safeCount = Math.max(
    0,
    Math.min(10, Math.floor(Number(count) || 0))
  );

  return (
    <div
      className="skeleton-list skeleton-grid"
      role="status"
      aria-label="Memuat daftar postingan"
    >
      {Array.from({ length: safeCount }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
      <span className="sr-only">Memuat data...</span>
    </div>
  );
}
