"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPost,
  getPublicPost,
  fetchPosts,
  CATEGORY_LABELS,
  REGION_LABELS,
  COMPENSATION_LABELS,
  formatDate,
  formatRupiah,
  formatDateTime,
} from "../../lib/data.js";
import { createClient } from "../../utils/supabase/client";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

function DetailPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const id = searchParams.get("id");
  const backUrl = searchParams.get("back") || "/katalog";

  const [post, setPost] = useState(() => (id ? getPost(id) || getPublicPost(id) : null));
  const [loading, setLoading] = useState(!post);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setLoading(false);
      return;
    }

    async function loadPostData() {
      // 1. Coba ambil dari Supabase
      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase
            .from("posts")
            .select(`
              id,
              author_id,
              nature,
              title,
              category,
              description,
              planned_date,
              start_time,
              end_time,
              region,
              address_general,
              compensation_type,
              amount,
              compensation_note,
              quota,
              remaining_quota,
              status,
              created_at,
              profiles:author_id (
                full_name,
                bio,
                avatar_url,
                rating_average,
                rating_count
              )
            `)
            .eq("id", id)
            .single();

          if (!error && data && isMounted) {
            setPost(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Supabase detail fetch error, trying local:", err);
      }

      // 2. Fallback ke data lokal
      const local = getPost(id) || getPublicPost(id);
      if (local && isMounted) {
        setPost(local);
        setLoading(false);
      } else {
        fetchPosts()
          .then(() => {
            if (isMounted) {
              setPost(getPost(id) || getPublicPost(id));
              setLoading(false);
            }
          })
          .catch(() => {
            if (isMounted) setLoading(false);
          });
      }
    }

    loadPostData();

    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <ThreeColumnLayout>
        <div className="skeleton-loading-box" style={{ padding: "40px", background: "#fff", borderRadius: "12px" }}>
          <div style={{ height: "24px", width: "60%", background: "#e2e8f0", marginBottom: "16px", borderRadius: "4px" }} />
          <div style={{ height: "16px", width: "40%", background: "#e2e8f0", marginBottom: "24px", borderRadius: "4px" }} />
          <div style={{ height: "120px", background: "#f8fafc", borderRadius: "8px" }} />
        </div>
      </ThreeColumnLayout>
    );
  }

  if (!id || !post) {
    return (
      <ThreeColumnLayout>
        <EmptyState
          icon="🔎"
          title="Postingan tidak ditemukan"
          description="Postingan yang kamu cari tidak tersedia, sudah ditutup, atau tautan tidak valid."
          actionText="Kembali ke Feed Bantuan"
          onAction={() => router.push(backUrl)}
        />
      </ThreeColumnLayout>
    );
  }

  // Normalisasi data (Supabase vs JSON)
  const isNeed = (post.nature || "butuh") === "butuh";
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
  const createdAt = post.created_at || post.createdAt;

  // Author info
  const authorName = post.profiles?.full_name || post.authorName || "Warga Jogja";
  const authorBio = post.profiles?.bio || post.authorBio || "Mahasiswa / Warga Yogyakarta";
  const authorRating = post.profiles?.rating_average !== undefined
    ? Number(post.profiles.rating_average).toFixed(1)
    : "5.0";
  const authorRatingCount = post.profiles?.rating_count !== undefined ? post.profiles.rating_count : 5;
  const authorId = post.author_id || post.authorId || "";

  const timeFormatted = endTime ? `${time.slice(0, 5)} - ${endTime.slice(0, 5)} WIB` : `${time.slice(0, 5)} WIB`;
  const dateFormatted = formatDate(date);

  // Kompensasi text
  const compLabel = COMPENSATION_LABELS[compType] || compType;
  let compFormatted = compLabel;
  if (compType === "tarif" && amount) {
    compFormatted = `${formatRupiah(amount)}${compNote ? ` (${compNote})` : ""}`;
  } else if (compNote) {
    compFormatted = `${compLabel} • ${compNote}`;
  }

  const isFull = status === "kuota_penuh" || remainingQuota <= 0;
  const chatUrl = `/chat?postId=${encodeURIComponent(post.id)}&authorId=${encodeURIComponent(authorId)}`;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      showToast("Tautan postingan berhasil disalin!", "success");
    }
  };

  return (
    <ThreeColumnLayout>
      <nav aria-label="Jejak Navigasi" style={{ marginBottom: "12px" }}>
        <Link href={backUrl} className="detail-back-link" style={{ fontSize: "13px", fontWeight: "600", textDecoration: "none", color: "var(--color-action-primary)" }}>
          &larr; Kembali ke Feed
        </Link>
      </nav>

      <article className="feed-card detail-article-card" style={{ padding: "24px" }}>
        {/* Badges Bar */}
        <div className="feed-card-badges" style={{ marginBottom: "14px" }}>
          <span className={`nature-badge ${isNeed ? "badge-butuh" : "badge-bisa"}`}>
            {isNeed ? "SAYA BUTUH BANTUAN" : "SAYA BISA MEMBANTU"}
          </span>
          <span className="category-badge">
            Kategori: {CATEGORY_LABELS[category] || category}
          </span>
          <span className="post-region-badge">
            📍 {REGION_LABELS[region] || region}
          </span>
          {isNeed && (
            <span className={`quota-pill ${isFull ? "quota-full" : "quota-available"}`}>
              {isFull ? "Kuota Terpenuhi" : `Sisa Kuota: ${remainingQuota} dari ${quota} orang`}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 16px 0", lineHeight: "1.3" }}>
          {title}
        </h1>

        {/* Author Section */}
        <div className="feed-card-header" style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", marginBottom: "20px" }}>
          <div className="author-avatar-wrap">
            <span className="author-initial">{authorName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="author-meta">
            <div className="author-name-row">
              <span className="author-name" style={{ fontSize: "15px" }}>{authorName}</span>
              <span className="rating-badge">⭐ {authorRating} ({authorRatingCount} ulasan)</span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
              {authorBio}
            </p>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 8px 0", color: "var(--color-text-primary)" }}>
            {isNeed ? "Rincian Kebutuhan Bantuan:" : "Rincian Keahlian yang Ditawarkan:"}
          </h2>
          <div style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text-secondary)", whiteSpace: "pre-line" }}>
            {description}
          </div>
        </div>

        {/* Meta Info Grid */}
        <div className="feed-card-meta-grid" style={{ padding: "16px", gap: "10px", marginBottom: "24px" }}>
          <div className="meta-item">
            <span className="meta-icon" style={{ fontSize: "16px" }}>📅</span>
            <div>
              <strong style={{ display: "block", fontSize: "11px", color: "var(--color-text-muted)" }}>Jadwal Pelaksanaan</strong>
              <span>{dateFormatted} pukul {timeFormatted}</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon" style={{ fontSize: "16px" }}>📍</span>
            <div>
              <strong style={{ display: "block", fontSize: "11px", color: "var(--color-text-muted)" }}>Titik Temu / Lokasi</strong>
              <span>{address} ({REGION_LABELS[region] || region})</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon" style={{ fontSize: "16px" }}>💰</span>
            <div>
              <strong style={{ display: "block", fontSize: "11px", color: "var(--color-text-muted)" }}>Bentuk Imbalan / Kompensasi</strong>
              <span style={{ color: "var(--color-action-secondary)", fontWeight: "600" }}>{compFormatted}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "18px" }}>
          {isFull ? (
            <div className="badge-closed" style={{ padding: "8px 16px", fontSize: "13px" }}>
              ⛔ Bantuan ini sudah terpenuhi kuotanya.
            </div>
          ) : (
            <Link href={chatUrl} className="button button-primary" style={{ padding: "10px 24px", fontSize: "14px", fontWeight: "600" }}>
              💬 Kirim Pesan & Sepakati
            </Link>
          )}

          <button
            type="button"
            className="button button-outline"
            onClick={handleShare}
            style={{ padding: "10px 18px", fontSize: "13px" }}
          >
            🔗 Bagikan Postingan
          </button>
        </div>

        {createdAt && (
          <p style={{ margin: "20px 0 0", fontSize: "11px", color: "var(--color-text-light)" }}>
            Diunggah pada {formatDateTime(createdAt)}
          </p>
        )}
      </article>
    </ThreeColumnLayout>
  );
}

export default function DetailPostPage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 16px" }}><div style={{ height: "300px", background: "#fff", borderRadius: "12px" }} /></div>}>
      <DetailPostContent />
    </Suspense>
  );
}
