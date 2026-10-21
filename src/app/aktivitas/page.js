"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getActivities,
  getActivityStats,
  getPost,
  cancelActivity,
  CATEGORY_LABELS,
  formatDateTime,
} from "../../lib/data";
import { readSession } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";
import { SimulationBanner } from "../../components/SimulationBanner";

const ACTIVITY_LABELS = {
  berlangsung: "Sedang Berlangsung",
  menunggu: "Menunggu Respon",
  selesai: "Selesai",
  batal: "Dibatalkan",
};

function ActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadActivities = () => {
    setActivities(getActivities());
  };

  useEffect(() => {
    const currentSession = readSession();
    if (!currentSession) {
      showToast("Silakan masuk untuk mengakses halaman aktivitas.", "info");
      router.replace("/login?next=/aktivitas");
    } else {
      setSession(currentSession);
      setCheckingAuth(false);
      loadActivities();
      setLoading(false);

      if (searchParams.get("rated") === "1") {
        showToast("Terima kasih! Ulasanmu berhasil disimpan.", "success");
      }
    }
  }, [router, searchParams, showToast]);

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

  if (checkingAuth) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <p>Memeriksa sesi pengguna...</p>
      </main>
    );
  }

  return (
    <main className="activity-page">
      <header className="page-header-section">
        <h1>Aktivitas Saya</h1>
        <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
      </header>

      <SimulationBanner text="Daftar aktivitas mencakup postingan yang Anda buat dan aktivitas demo terhubung." />

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
            style={{ cursor: "pointer" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="activity-list-container" style={{ marginTop: "24px" }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : visibleActivities.length > 0 ? (
          visibleActivities.map((activity) => {
            const post = getPost(activity.postId);
            const statusLabel =
              ACTIVITY_LABELS[activity.status] || activity.status;
            const category = post
              ? CATEGORY_LABELS[post.category] || post.category
              : "Aktivitas";
            const canOpenPost = Boolean(
              post && (post.owned || activity.status !== "batal"),
            );

            return (
              <article
                key={activity.id}
                className="activity-card-item"
                style={{
                  background: "var(--color-bg-surface, #fff)",
                  border: "1px solid var(--color-border-default, #cfdadc)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <header>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "12px",
                          margin: "0 0 4px 0",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <mark
                          style={{
                            background:
                              activity.status === "selesai"
                                ? "#d4edda"
                                : activity.status === "batal"
                                  ? "#f8d7da"
                                  : "var(--color-bg-subtle)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {statusLabel}
                        </mark>{" "}
                        &bull; Kategori: {category}
                      </p>
                      <h3 style={{ margin: "4px 0", fontSize: "16px" }}>
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
                      {activity.partner && (
                        <p style={{ margin: "4px 0", fontSize: "13px" }}>
                          Partner Relawan: <strong>{activity.partner}</strong>
                        </p>
                      )}
                      {post && post.createdAt && (
                        <p
                          style={{
                            margin: "4px 0",
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          Dipasang: {formatDateTime(post.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </header>

                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    margin: "12px 0",
                  }}
                >
                  {activity.note}
                </p>

                {activity.review && (
                  <div
                    style={{
                      background: "var(--color-bg-default)",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      marginBottom: "12px",
                    }}
                  >
                    Ulasan kamu: <em>&ldquo;{activity.review.comment}&rdquo;</em>{" "}
                    (<strong>{activity.review.rating}.0 / 5.0 ★</strong>)
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    alignItems: "center",
                    marginTop: "12px",
                  }}
                >
                  {canOpenPost && (
                    <Link
                      href={`/detail-postingan?id=${encodeURIComponent(post.id)}`}
                      className="button button-outline"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      Lihat Detail
                    </Link>
                  )}

                  {activity.status === "berlangsung" && activity.partnerId && (
                    <>
                      <Link
                        href={`/chat?user=${encodeURIComponent(activity.partnerId)}`}
                        className="button button-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Buka Obrolan Chat
                      </Link>
                      <Link
                        href={`/rating?id=${encodeURIComponent(activity.id)}`}
                        className="button button-outline"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Selesaikan &amp; Beri Ulasan
                      </Link>
                    </>
                  )}

                  {activity.status === "selesai" && !activity.review && (
                    <Link
                      href={`/rating?id=${encodeURIComponent(activity.id)}`}
                      className="button button-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      Beri Ulasan
                    </Link>
                  )}

                  {activity.status === "menunggu" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(activity.id)}
                      style={{
                        background: "transparent",
                        color: "var(--color-error, #a52626)",
                        border: "1px solid var(--color-error, #a52626)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Batalkan Postingan
                    </button>
                  )}

                  {activity.status === "batal" && (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Postingan telah dibatalkan.
                    </span>
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
