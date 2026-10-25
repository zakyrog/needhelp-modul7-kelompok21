"use client";

import React from "react";
import Link from "next/link";
import {
  REGION_LABELS,
  CATEGORY_LABELS,
  COMPENSATION_LABELS,
  formatDate,
  formatRupiah,
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
  const time = post.start_time || post.time || "10:00";
  const endTime = post.end_time || post.endTime;
  const compType = post.compensation_type || post.compensation || "sukarela";
  const amount = post.amount;
  const compNote = post.compensation_note || post.compensationNote || "";
  const quota = post.quota || 1;
  const remainingQuota = post.remaining_quota !== undefined ? post.remaining_quota : (post.remainingQuota !== undefined ? post.remainingQuota : 1);
  const status = post.status || "aktif";

  // Author details
  const authorName = post.profiles?.full_name || post.authorName || post.author?.name || "Warga Jogja";
  const authorBio = post.profiles?.bio || post.authorBio || post.author?.bio || "Mahasiswa / Perantau di DIY";
  const hasDbProfile = Boolean(post.profiles);
  const authorRating = hasDbProfile && post.profiles.rating_average !== undefined
    ? Number(post.profiles.rating_average).toFixed(1)
    : (post.author?.rating ? post.author.rating.split("/")[0].trim() : "0.0");
  const authorRatingCount = hasDbProfile
    ? (post.profiles.rating_count || 0)
    : (post.author?.rating ? 8 : 0);
  const authorInitial = authorName.charAt(0).toUpperCase();

  const isNeed = nature === "butuh";
  const detailUrl = `/detail-postingan?id=${encodeURIComponent(id)}&back=${encodeURIComponent(backUrl)}`;
  const chatUrl = `/chat?postId=${encodeURIComponent(id)}&authorId=${encodeURIComponent(post.author_id || post.authorId || "")}`;

  // Format kompensasi
  const compLabel = COMPENSATION_LABELS[compType] || compType;
  let compFormatted = compLabel;
  if (compType === "tarif" && amount) {
    compFormatted = `${formatRupiah(amount)}${compNote ? ` (${compNote})` : ""}`;
  } else if (compNote) {
    compFormatted = `${compLabel} • ${compNote}`;
  }

  // Format waktu
  const timeFormatted = endTime ? `${time.slice(0, 5)} - ${endTime.slice(0, 5)} WIB` : `${time.slice(0, 5)} WIB`;
  const dateFormatted = formatDate(date);

  // Status kuota
  const isFull = status === "kuota_penuh" || remainingQuota <= 0;

  return (
    <article className={`feed-card ${isNeed ? "card-nature-butuh" : "card-nature-bisa"}`}>
      {/* 1. Header Pengguna & Reputasi */}
      <header className="feed-card-header">
        <div className="author-avatar-wrap" aria-hidden="true">
          <span className="author-initial">{authorInitial}</span>
        </div>
        <div className="author-meta">
          <div className="author-name-row">
            <span className="author-name">{authorName}</span>
            <span className="author-dot">•</span>
            <span className="author-bio-snippet">{authorBio}</span>
          </div>
          <div className="author-rating-row">
            {authorRatingCount > 0 ? (
              <span className="rating-badge">
                ⭐ {authorRating} <span className="text-muted">({authorRatingCount} ulasan)</span>
              </span>
            ) : (
              <span className="rating-badge rating-badge-new">
                ⭐ Anggota Baru
              </span>
            )}
            <span className="post-region-badge">
              📍 {REGION_LABELS[region] || region}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Badge Jenis & Kategori */}
      <div className="feed-card-badges">
        <span className={`nature-badge ${isNeed ? "badge-butuh" : "badge-bisa"}`}>
          {isNeed ? "SAYA BUTUH" : "SAYA BISA"}
        </span>
        <span className="category-badge">
          {CATEGORY_LABELS[category] || category}
        </span>
        {isNeed && (
          <span className={`quota-pill ${isFull ? "quota-full" : "quota-available"}`}>
            {isFull ? "Kuota Terpenuhi" : `Kuota: ${remainingQuota} dari ${quota} orang`}
          </span>
        )}
      </div>

      {/* 3. Judul & Ringkasan Deskripsi */}
      <h3 className="feed-card-title">
        <Link href={detailUrl} className="title-link">
          {title}
        </Link>
      </h3>
      <p className="feed-card-description">
        {description.length > 180 ? `${description.slice(0, 180)}...` : description}
      </p>

      {/* 4. Rincian Metadata Kegiatan */}
      <div className="feed-card-meta-grid">
        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span className="meta-text">{dateFormatted} ({timeFormatted})</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">📍</span>
          <span className="meta-text">{address}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">💰</span>
          <span className="meta-text font-semibold">{compFormatted}</span>
        </div>
      </div>

      {/* 5. Aksi Bawah */}
      <footer className="feed-card-footer">
        <div className="footer-left">
          {isFull ? (
            <span className="badge-closed">Bantuan Sedang Berjalan / Penuh</span>
          ) : (
            <Link href={chatUrl} className="button button-sm button-primary action-chat-btn">
              💬 Kirim Pesan & Sepakati
            </Link>
          )}
        </div>
        <div className="footer-right">
          <Link href={detailUrl} className="detail-link">
            Detail Selengkapnya &rarr;
          </Link>
        </div>
      </footer>
    </article>
  );
}
