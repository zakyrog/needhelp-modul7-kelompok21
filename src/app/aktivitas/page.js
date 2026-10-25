"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getActivities,
  getActivityStats,
  getPost,
  cancelActivity,
} from "../../lib/data.js";
import { readSession } from "../../lib/auth.js";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";

function ActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState(() => getActivities());
  const [filter, setFilter] = useState("all");

  const loadActivities = () => {
    setActivities(getActivities());
  };

  useEffect(() => {
    const currentSession = readSession();
    setSession(currentSession);
    loadActivities();

    if (searchParams.get("rated") === "1") {
      showToast("Terima kasih! Ulasanmu berhasil disimpan.", "success");
    }
  }, [searchParams, showToast]);

  const stats = useMemo(() => {
    return getActivityStats(activities);
  }, [activities]);

  const visibleActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((act) => act.status === filter);
  }, [activities, filter]);

  const handleCancel = (activityId) => {
    if (window.confirm("Apakah kamu yakin ingin membatalkan aktivitas ini?")) {
      try {
        cancelActivity(activityId);
        loadActivities();
        showToast("Aktivitas berhasil dibatalkan.", "info");
      } catch {
        showToast("Gagal mengubah status aktivitas.", "error");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "menunggu":
        return <span className="activity-status-tag tag-waiting">&#9679; Menunggu</span>;
      case "berlangsung":
        return <span className="activity-status-tag tag-confirmed">&#9679; Sedang Berjalan</span>;
      case "selesai":
        return <span className="activity-status-tag tag-completed">&#9679; Selesai</span>;
      case "batal":
        return <span className="activity-status-tag tag-cancelled">&#9679; Dibatalkan</span>;
      default:
        return <span className="activity-status-tag">{status}</span>;
    }
  };

  return (
    <main>
      <header className="page-header-section">
        <h1>Aktivitas Saya</h1>
        <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
      </header>

      <section className="activity-stats-grid">
        <div className="stat-box">
          <span className="stat-num">{stats.total}</span>
          <span className="stat-desc">Total aktivitas</span>
        </div>
        <div className="stat-box tosca-bg-1">
          <span className="stat-num">
            {activities.filter((a) => a.status === "menunggu").length}
          </span>
          <span className="stat-desc">Menunggu respon</span>
        </div>
        <div className="stat-box tosca-bg-2">
          <span className="stat-num">{stats.berlangsung}</span>
          <span className="stat-desc">Sedang berjalan</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stats.selesai}</span>
          <span className="stat-desc">Selesai</span>
        </div>
      </section>

      <div className="activity-filter-chips">
        {[
          { key: "all", label: "Semua" },
          { key: "menunggu", label: "Menunggu" },
          { key: "berlangsung", label: "Sedang Berjalan" },
          { key: "selesai", label: "Selesai" },
          { key: "batal", label: "Dibatalkan" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`filter-chip${filter === tab.key ? " active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="activity-list-container">
        {visibleActivities.length > 0 ? (
          visibleActivities.map((activity) => {
            const post = getPost(activity.postId);
            const canOpenPost = Boolean(
              post && (post.owned || activity.status !== "batal"),
            );
            const avatarInitial = activity.partner
              ? activity.partner.charAt(0).toUpperCase()
              : post
                ? post.title.charAt(0).toUpperCase()
                : "A";

            const avatarClass =
              activity.status === "berlangsung"
                ? "avatar-blue"
                : activity.status === "selesai"
                  ? "avatar-green"
                  : activity.status === "batal"
                    ? "avatar-red"
                    : "avatar-tosca";

            return (
              <article key={activity.id}>
                <header>
                  <div className={`article-avatar ${avatarClass}`}>
                    {avatarInitial}
                  </div>
                  <div className="article-info">
                    <div className="article-title-row">
                      <h3>
                        {canOpenPost ? (
                          <Link
                            href={`/detail-postingan?id=${encodeURIComponent(post.id)}`}
                          >
                            {post.title}
                          </Link>
                        ) : post ? (
                          post.title
                        ) : (
                          "Aktivitas NeedHelp"
                        )}
                      </h3>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p>
                      {activity.partner && (
                        <>
                          <span className="role-label">Partner</span>{" "}
                          <strong>{activity.partner}</strong> &bull;{" "}
                        </>
                      )}
                      {activity.note}
                    </p>
                    {activity.review && (
                      <p style={{ marginTop: "4px", color: "var(--color-text-primary)" }}>
                        Ulasan: <em>&ldquo;{activity.review.comment}&rdquo;</em> ({activity.review.rating}.0 ★)
                      </p>
                    )}
                  </div>
                </header>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {canOpenPost && (
                    <Link
                      href={`/detail-postingan?id=${encodeURIComponent(post.id)}`}
                      className="btn-detail-outline"
                    >
                      Lihat Detail
                    </Link>
                  )}

                  {activity.status === "berlangsung" && activity.partnerId && (
                    <>
                      <Link
                        href={`/chat?user=${encodeURIComponent(activity.partnerId)}`}
                        className="btn-detail-outline"
                        style={{ color: "var(--color-action-primary)", borderColor: "var(--color-action-primary)" }}
                      >
                        Obrolan
                      </Link>
                      <Link
                        href={`/rating?id=${encodeURIComponent(activity.id)}`}
                        className="btn-detail-outline"
                      >
                        Selesaikan
                      </Link>
                    </>
                  )}

                  {activity.status === "selesai" && !activity.review && (
                    <Link
                      href={`/rating?id=${encodeURIComponent(activity.id)}`}
                      className="btn-detail-outline"
                      style={{ color: "var(--color-action-primary)", borderColor: "var(--color-action-primary)" }}
                    >
                      Beri Ulasan
                    </Link>
                  )}

                  {activity.status === "menunggu" && (
                    <button
                      type="button"
                      className="btn-detail-outline"
                      onClick={() => handleCancel(activity.id)}
                      style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            icon="📋"
            title="Belum ada aktivitas"
            description="Tidak ada aktivitas pada filter ini. Mulai dengan membuat postingan atau mencari bantuan di katalog."
            actionText="Jelajahi Katalog"
            onAction={() => router.push("/katalog")}
          />
        )}
      </section>
    </main>
  );
}

export default function AktivitasPage() {
  return (
    <Suspense fallback={<div className="activity-page"><p>Memuat aktivitas...</p></div>}>
      <ActivityContent />
    </Suspense>
  );
}
