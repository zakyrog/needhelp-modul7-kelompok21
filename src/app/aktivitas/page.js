"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getActivities,
  getActivityStats,
  getPost,
  cancelActivity,
  fetchActivities,
  cancelActivitySupabase,
  completeActivitySupabase,
  fetchPosts,
} from "../../lib/data.js";
import { readSession } from "../../lib/auth.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";

function ActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const supabaseMode = isSupabaseConfigured();

  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState(() => {
    // Mode demo: sync init; mode Supabase: kosong (akan di-fetch async)
    return supabaseMode ? [] : getActivities();
  });
  const [loading, setLoading] = useState(supabaseMode);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [startingId, setStartingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  // Load activities
  useEffect(() => {
    const currentSession = readSession();
    setSession(currentSession);

    if (!currentSession) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    if (supabaseMode) {
      setLoading(true);
      setError(null);

      // Fetch posts terlebih dahulu agar cache _lastFetchedPosts terisi
      // (diperlukan untuk getPost() saat render activity card)
      fetchPosts()
        .then(() => fetchActivities())
        .then((data) => {
          if (!isCancelled) {
            setActivities(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err.message || "Gagal memuat aktivitas.");
            setLoading(false);
          }
        });
    } else {
      setActivities(getActivities());
      setLoading(false);
    }

    if (searchParams.get("rated") === "1") {
      showToast("Terima kasih! Ulasanmu berhasil disimpan.", "success");
    }

    return () => { isCancelled = true; };
  }, [searchParams, showToast, supabaseMode]);

  const stats = useMemo(() => {
    return getActivityStats(activities);
  }, [activities]);

  const visibleActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((act) => act.status === filter);
  }, [activities, filter]);

  const handleCancel = async (activityId, postId) => {
    if (!window.confirm("Apakah kamu yakin ingin membatalkan aktivitas ini?")) return;

    try {
      if (supabaseMode) {
        await cancelActivitySupabase(postId);
        // Refresh activities dari Supabase
        const refreshed = await fetchActivities();
        setActivities(refreshed);
      } else {
        cancelActivity(activityId);
        setActivities(getActivities());
      }
      showToast("Aktivitas berhasil dibatalkan.", "info");
    } catch (err) {
      showToast(err.message || "Gagal mengubah status aktivitas.", "error");
    }
  };

  const handleStart = async (activityId, postId) => {
    if (!window.confirm("Mulai aktivitas ini sekarang? Status akan berubah menjadi 'Sedang Berjalan'.")) return;

    setStartingId(activityId);
    try {
      // Mode demo: gunakan setActivityState untuk mengubah status
      // Catatan: Dalam mode Supabase, tombol "Mulai Aktivitas" tidak ditampilkan
      // karena aktivitas dimulai otomatis saat pengajuan diterima via accept_help_application.
      const { setActivityState } = await import("../../lib/data.js");
      setActivityState(activityId, { status: "berlangsung" });
      setActivities(getActivities());
      showToast("Aktivitas berhasil dimulai!", "success");
    } catch (err) {
      showToast(err.message || "Gagal memulai aktivitas.", "error");
    } finally {
      setStartingId(null);
    }
  };

  const handleComplete = async (activityId, postId) => {
    if (!window.confirm("Tandai aktivitas ini sebagai selesai? Anda masih bisa memberikan ulasan setelahnya.")) return;

    setCompletingId(activityId);
    try {
      if (supabaseMode) {
        await completeActivitySupabase(postId);
        // Refresh activities dari Supabase untuk mendapatkan data terbaru
        const refreshed = await fetchActivities();
        setActivities(refreshed);
      } else {
        // Mode demo: fallback ke setActivityState
        const { setActivityState } = await import("../../lib/data.js");
        setActivityState(activityId, { status: "selesai" });
        setActivities(getActivities());
      }
      showToast("Aktivitas ditandai sebagai selesai!", "success");
    } catch (err) {
      showToast(err.message || "Gagal menyelesaikan aktivitas.", "error");
    } finally {
      setCompletingId(null);
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

  // Loading state
  if (loading) {
    return (
      <main>
        <header className="page-header-section">
          <h1>Aktivitas Saya</h1>
          <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
        </header>
        <div style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <p>Memuat aktivitas...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main>
        <header className="page-header-section">
          <h1>Aktivitas Saya</h1>
          <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
        </header>
        <div style={{ maxWidth: "600px", margin: "40px auto" }}>
          <EmptyState
            icon="⚠️"
            title="Gagal Memuat Aktivitas"
            description={error}
            actionText="Coba Lagi"
            onAction={() => window.location.reload()}
          />
        </div>
      </main>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <main>
        <header className="page-header-section">
          <h1>Aktivitas Saya</h1>
          <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
        </header>
        <div style={{ maxWidth: "600px", margin: "40px auto" }}>
          <EmptyState
            icon="🔒"
            title="Masuk untuk Melihat Aktivitas"
            description="Silakan masuk terlebih dahulu untuk melihat aktivitas bantuan Anda."
            actionText="Masuk Sekarang"
            onAction={() => router.push("/login?next=/aktivitas")}
          />
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="page-header-section">
        <h1>Aktivitas Saya</h1>
        <p>Semua permintaan dan tawaran bantuanmu dalam satu tempat.</p>
        {supabaseMode && session && (
          <div style={{ marginTop: "12px" }}>
            <Link
              href="/pengajuan"
              className="btn-detail-outline"
              style={{ fontSize: "14px" }}
            >
              📋 Kelola Pengajuan Bantuan
            </Link>
          </div>
        )}
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
            // Aktivitas batal tidak boleh membuka detail postingan dari halaman Aktivitas
            const isCancelled = activity.status === "batal";
            const canOpenPost = Boolean(post && !isCancelled);
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
                    {isCancelled && (
                      <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--color-error)" }}>
                        Aktivitas ini sudah dibatalkan. Detail postingan tidak tersedia.
                      </p>
                    )}
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

                  {activity.status === "berlangsung" && (
                    <>
                      {activity.partnerId && (
                        <Link
                          href={`/chat?user=${encodeURIComponent(activity.partnerId)}`}
                          className="btn-detail-outline"
                          style={{ color: "var(--color-action-primary)", borderColor: "var(--color-action-primary)" }}
                        >
                          Obrolan
                        </Link>
                      )}
                      <button
                        type="button"
                        className="btn-detail-outline"
                        onClick={() => handleComplete(activity.id, activity.postId)}
                        disabled={completingId === activity.id}
                      >
                        {completingId === activity.id ? "Menyelesaikan..." : "Selesaikan"}
                      </button>
                    </>
                  )}

                  {activity.status === "selesai" && !activity.review && (
                    <Link
                      href={`/rating?id=${encodeURIComponent(activity.id)}&postId=${encodeURIComponent(activity.postId)}`}
                      className="btn-detail-outline"
                      style={{ color: "var(--color-action-primary)", borderColor: "var(--color-action-primary)" }}
                    >
                      Beri Ulasan
                    </Link>
                  )}

                  {activity.status === "menunggu" && (
                    <>
                      {/* Tombol Mulai Aktivitas hanya untuk mode demo.
                          Dalam mode Supabase, aktivitas dimulai otomatis saat pengajuan diterima. */}
                      {!supabaseMode && (
                        <button
                          type="button"
                          className="btn-detail-outline"
                          onClick={() => handleStart(activity.id, activity.postId)}
                          disabled={startingId === activity.id}
                          style={{ color: "var(--color-action-primary)", borderColor: "var(--color-action-primary)" }}
                        >
                          {startingId === activity.id ? "Memulai..." : "Mulai Aktivitas"}
                        </button>
                      )}
                      {/* Aktivitas sintetis (belum punya baris di tabel activities) tidak bisa
                          dibatalkan: RPC cancel_activity hanya mengubah record database. */}
                      {!activity._defaultActivity && (
                        <button
                          type="button"
                          className="btn-detail-outline"
                          onClick={() => handleCancel(activity.id, activity.postId)}
                          disabled={startingId === activity.id}
                          style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
                        >
                          Batalkan
                        </button>
                      )}
                    </>
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
