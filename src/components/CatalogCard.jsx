"use client";

import React from "react";
import Link from "next/link";
import {
  REGION_LABELS,
  CATEGORY_LABELS,
  COMPENSATION_LABELS,
  formatDate,
  formatRupiah,
  formatRelativeTime,
} from "../lib/data.js";

export function CatalogCard({ post, backUrl = "/katalog" }) {
  if (!post) return null;

  // Harmonisasikan nama field (Supabase vs JSON)
  const id = post.id;
  const nature = post.nature || "butuh";
  const title = post.title;
  const description = post.description || post.summary || "";
  const category = post.category || "bantuan";
  const region = post.region || "sleman";
  const address = post.address_general || post.address || "Area Yogyakarta";
  const date = post.planned_date || post.date;
  const time = post.start_time || post.time;
  const endTime = post.end_time || post.endTime;
  const compType = post.compensation_type || post.compensation || "sukarela";
  const amount = post.amount;
  const compNote = post.compensation_note || post.compensationNote || "";
  const quota = post.quota || 1;
  const remainingQuota =
    post.remaining_quota !== undefined
      ? post.remaining_quota
      : post.remainingQuota !== undefined
        ? post.remainingQuota
        : 1;
  const status = post.status || "aktif";

  // Author details
  const authorName =
    post.profiles?.full_name ||
    post.authorName ||
    post.author?.name ||
    "Warga Jogja";
  const hasDbProfile = Boolean(post.profiles);
  const authorRating =
    hasDbProfile && post.profiles.rating_average !== undefined
      ? Number(post.profiles.rating_average).toFixed(1)
      : post.author?.rating
        ? post.author.rating.split("/")[0].trim()
        : "0.0";
  const authorRatingCount = hasDbProfile
    ? post.profiles.rating_count || 0
    : post.author?.rating
      ? 8
      : 0;
  const authorInitial = authorName.charAt(0).toUpperCase();

  const isNeed = nature === "butuh";
  const isExample = Boolean(post.isExample || (typeof id === "string" && id.startsWith("demo-post-")));
  const detailUrl = `/detail-postingan?id=${encodeURIComponent(id)}&back=${encodeURIComponent(backUrl)}${isExample ? "&demo=1" : ""}`;

  // Format kompensasi
  const compLabel = COMPENSATION_LABELS[compType] || "Sesuai Kesepakatan";
  let compFormatted = compLabel;
  if (compType === "tarif" && amount) {
    compFormatted = `${formatRupiah(amount)}${compNote ? ` ${compNote}` : ""}`;
  } else if (compNote) {
    compFormatted = compNote;
  }

  // Format waktu dan tanggal
  const dateFormatted = post.scheduleLabel || (date ? formatDate(date) : "Jadwal fleksibel");
  const relativeTime = isExample ? "Data Contoh" : formatRelativeTime(post.created_at || post.date);

  // Status kuota
  const isFull = status === "kuota_penuh" || remainingQuota <= 0;

  return (
    <article className={`post-feed-card ${isNeed ? "nature-need" : "nature-offer"}`}>
      {/* 1. Baris Avatar, Nama Pembuat, Lokasi, Waktu & Badges */}
      <header className="card-author-header">
        <div
          className={`card-avatar-circle ${isNeed ? "avatar-need" : "avatar-offer"}`}
          aria-hidden="true"
        >
          {authorInitial}
        </div>
        <div className="card-author-meta-block">
          <div className="author-identity-row">
            <span className="author-name-text">{authorName}</span>
            <span className="meta-sep" aria-hidden="true">•</span>
            <span className="author-location-text">{REGION_LABELS[region] || region}</span>
            <span className="meta-sep" aria-hidden="true">•</span>
            <span className="author-time-text">{relativeTime}</span>
            {authorRatingCount > 0 && (
              <>
                <span className="meta-sep" aria-hidden="true">•</span>
                <span className="author-rating-text" title={`${authorRatingCount} ulasan`}>
                  ⭐ {authorRating}
                </span>
              </>
            )}
          </div>

          <div className="card-badges-row">
            <span className={`post-nature-pill ${isNeed ? "pill-butuh" : "pill-bisa"}`}>
              {isNeed ? "Saya Butuh" : "Saya Bisa"}
            </span>
            <span className="post-category-pill">
              {CATEGORY_LABELS[category] || category}
            </span>
            {isExample && (
              <span className="post-demo-badge" title="Data ilustrasi mode pratinjau">
                Data Contoh
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Judul Kebutuhan / Penawaran */}
      <h3 className="card-post-title">
        <Link href={detailUrl} className="title-link">
          {title}
        </Link>
      </h3>

      {/* 3. Deskripsi Ringkas */}
      <p className="card-post-description">
        {description.length > 200 ? `${description.slice(0, 200)}...` : description}
      </p>

      {/* 4. Rincian Lokasi, Jadwal, dan Imbalan */}
      <div className="card-meta-chips-row">
        <div className="meta-chip-item" title="Lokasi kegiatan">
          <span className="chip-icon" aria-hidden="true">📍</span>
          <span className="chip-text">{address}</span>
        </div>
        <div className="meta-chip-item" title="Jadwal pelaksanaan">
          <span className="chip-icon" aria-hidden="true">📅</span>
          <span className="chip-text">{dateFormatted}</span>
        </div>
        <div className="meta-chip-item font-semibold" title="Kompensasi / Imbalan">
          <span className="chip-icon" aria-hidden="true">🏷️</span>
          <span className="chip-text">{compFormatted}</span>
        </div>
      </div>

      {/* 5. Informasi Kuota / Status & Tombol Lihat Detail */}
      <footer className="card-post-footer">
        <div className="footer-status-section">
          {isNeed ? (
            <span className={`quota-status-text ${isFull ? "status-full" : ""}`}>
              <span className="status-icon" aria-hidden="true">👥</span>
              {isFull ? "Kuota terpenuhi" : `Dibutuhkan ${remainingQuota} orang`}
            </span>
          ) : (
            <span className="offer-chat-hint">
              <span className="status-icon" aria-hidden="true">💬</span>
              Diskusikan kebutuhan lewat chat
            </span>
          )}
        </div>

        <Link href={detailUrl} className="card-detail-action-btn">
          <span>Lihat detail</span>
          <span className="action-arrow" aria-hidden="true">&rarr;</span>
        </Link>
      </footer>
    </article>
  );
}
