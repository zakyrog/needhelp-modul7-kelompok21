"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getRateableActivity,
  getPost,
  saveRating,
  formatDate,
} from "../../lib/data.js";
import { readSession } from "../../lib/auth.js";
import { validateRating } from "../../lib/validation.js";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";

function RatingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const id = searchParams.get("id");

  const [activity, setActivity] = useState(null);
  const [unrateableReason, setUnrateableReason] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stars, setStars] = useState(5);
  const [badges, setBadges] = useState(["tepat-waktu", "ramah", "sangat-membantu"]);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState("yes");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const { activity: foundActivity, reason } = getRateableActivity(id);
    if (!foundActivity) {
      setUnrateableReason(reason);
      setActivity(null);
    } else {
      setActivity(foundActivity);
      setUnrateableReason(null);
      if (foundActivity.review) {
        setStars(foundActivity.review.rating || 5);
        setComment(foundActivity.review.comment || "");
        if (foundActivity.review.badges) {
          setBadges(foundActivity.review.badges);
        }
      }
    }
    setLoading(false);
  }, [id]);

  const handleBadgeToggle = (badgeKey) => {
    setBadges((prev) =>
      prev.includes(badgeKey)
        ? prev.filter((b) => b !== badgeKey)
        : [...prev, badgeKey],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateRating(stars, comment);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Periksa kembali bintang atau isi ulasan.", "error");
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      saveRating(activity.id, {
        rating: Number(stars),
        comment: comment.trim(),
        badges,
        recommend,
        at: new Date().toISOString(),
      });
      showToast("Penilaian berhasil disimpan!", "success");
      router.push("/aktivitas?rated=1");
    } catch (err) {
      setSubmitting(false);
      setErrors({
        general: err.message || "Gagal menyimpan ulasan.",
      });
      showToast("Gagal menyimpan ulasan.", "error");
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <main style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Memuat data aktivitas...</p>
        </div>
      </main>
    );
  }

  if (unrateableReason) {
    const errorMessages = {
      missing: "Pilih aktivitas dari halaman Aktivitas sebelum memberi ulasan.",
      "not-found": "Aktivitas yang akan dinilai tidak ditemukan.",
      pending: "Aktivitas ini belum berlangsung, jadi belum dapat dinilai.",
      cancelled: "Aktivitas yang dibatalkan tidak dapat dinilai.",
      "invalid-status": "Aktivitas dengan status ini tidak dapat dinilai.",
    };

    return (
      <main style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
        <EmptyState
          icon="⭐"
          title="Tidak Dapat Memberi Penilaian"
          description={
            errorMessages[unrateableReason] ||
            "Aktivitas ini tidak memenuhi syarat untuk dinilai."
          }
          actionText="Buka Daftar Aktivitas"
          onAction={() => router.push("/aktivitas")}
        />
      </main>
    );
  }

  // Safety check: activity should not be null at this point
  if (!activity) {
    return (
      <main style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
        <EmptyState
          icon="⚠️"
          title="Data Aktivitas Tidak Tersedia"
          description="Terjadi masalah saat memuat data aktivitas. Silakan coba lagi atau kembali ke daftar aktivitas."
          actionText="Buka Daftar Aktivitas"
          onAction={() => router.push("/aktivitas")}
        />
      </main>
    );
  }

  const post = getPost(activity.postId);
  const partnerName = activity.partner || "Rekan Bantuan";

  return (
    <main>
      <header>
        <h1>Beri Ulasan dan Penilaian</h1>
        <p>
          Bantu bangun reputasi komunitas dengan memberikan ulasan jujur setelah
          aktivitas bantuan selesai dilaksanakan.
        </p>
      </header>

      {/* Ringkasan Kegiatan */}
      <article>
        <header>
          <h2>Ringkasan Aktivitas</h2>
          <p>
            Aktivitas: <strong>{post?.title || "Aktivitas NeedHelp"}</strong>
          </p>
          <p>
            Rekan Bantuan: <strong>{partnerName}</strong>
          </p>
        </header>
        <dl>
          <dt>Tanggal Pelaksanaan</dt>
          <dd>{post ? formatDate(post.date) : activity.note}</dd>
          <dt>Lokasi</dt>
          <dd>
            {post
              ? `${post.address}${post.destination ? ` ke ${post.destination}` : ""}`
              : "Sesuai kesepakatan"}
          </dd>
          <dt>Status</dt>
          <dd>
            <mark>
              {activity.status === "selesai" ? "Aktivitas Selesai" : "Aktivitas Berlangsung"}
            </mark>
          </dd>
        </dl>
      </article>

      {errors.general && (
        <p className="error-banner" role="alert">
          {errors.general}
        </p>
      )}

      {/* Formulir Evaluasi & Rating */}
      <form onSubmit={handleSubmit} noValidate>
        {/* 1. Bintang Kepuasan */}
        <fieldset>
          <legend>1. Berikan Bintang Kepuasan (Skala 1 - 5)</legend>
          {[
            { value: 5, label: "★★★★★ (5 - Luar Biasa)" },
            { value: 4, label: "★★★★☆ (4 - Sangat Baik)" },
            { value: 3, label: "★★★☆☆ (3 - Cukup Baik)" },
            { value: 2, label: "★★☆☆☆ (2 - Kurang Memuaskan)" },
            { value: 1, label: "★☆☆☆☆ (1 - Tidak Memuaskan)" },
          ].map((starOpt) => (
            <p key={starOpt.value}>
              <input
                type="radio"
                id={`star-${starOpt.value}`}
                name="star_rating"
                value={starOpt.value}
                checked={Number(stars) === starOpt.value}
                onChange={() => setStars(starOpt.value)}
              />
              <label htmlFor={`star-${starOpt.value}`}>{starOpt.label}</label>
            </p>
          ))}
          {errors.rating && (
            <small className="field-error" role="alert">
              {errors.rating}
            </small>
          )}
        </fieldset>

        {/* 2. Aspek Positif */}
        <fieldset>
          <legend>2. Apa yang Paling Kamu Apresiasi dari {partnerName}?</legend>
          {[
            { key: "tepat-waktu", label: "Tepat Waktu & Disiplin" },
            { key: "ramah", label: "Ramah & Menyenangkan" },
            { key: "sangat-membantu", label: "Tenaga Kuat & Sangat Membantu" },
            { key: "komunikatif", label: "Komunikatif & Responsif di Chat" },
          ].map((badge) => (
            <p key={badge.key}>
              <input
                type="checkbox"
                id={`badge-${badge.key}`}
                name="badges"
                value={badge.key}
                checked={badges.includes(badge.key)}
                onChange={() => handleBadgeToggle(badge.key)}
              />
              <label htmlFor={`badge-${badge.key}`}>{badge.label}</label>
            </p>
          ))}
        </fieldset>

        {/* 3. Ulasan Terbuka */}
        <fieldset>
          <legend>3. Catatan &amp; Testimoni</legend>
          <p>
            <label htmlFor="review-comment">Ceritakan pengalamanmu:</label>
            <textarea
              id="review-comment"
              name="review"
              rows={4}
              cols={50}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errors.comment) {
                  setErrors((prev) => ({ ...prev, comment: undefined }));
                }
              }}
              placeholder="Tulis ulasan tentang keandalan rekan bantuan untuk ditampilkan di profilnya..."
              aria-invalid={Boolean(errors.comment)}
            />
            {errors.comment && (
              <small className="field-error" role="alert">
                {errors.comment}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="recommend-user">
              Apakah kamu merekomendasikan {partnerName} ke teman lain?
            </label>
            <select
              id="recommend-user"
              name="recommend"
              value={recommend}
              onChange={(e) => setRecommend(e.target.value)}
            >
              <option value="yes">Sangat Merekomendasikan</option>
              <option value="neutral">Netral</option>
              <option value="no">Tidak Merekomendasikan</option>
            </select>
          </p>
        </fieldset>

        {/* 4. Konfirmasi Akhir */}
        <fieldset>
          <legend>4. Konfirmasi Akhir</legend>
          <p style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={submitting}
            >
              {submitting ? "Menyimpan..." : "Kirim Penilaian & Selesaikan Bantuan"}
            </button>
            <Link href="/aktivitas" className="button button-outline">
              Kembali ke Aktivitas
            </Link>
          </p>
        </fieldset>
      </form>
    </main>
  );
}

export default function RatingPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}><p>Memuat form penilaian...</p></div>}>
      <RatingContent />
    </Suspense>
  );
}
