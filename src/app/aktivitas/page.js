"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getActivities, cancelActivity } from "../../lib/data.js";
import { getAuthUser, readSession } from "../../lib/auth.js";
import { createClient } from "../../utils/supabase/client";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

function ActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      setLoading(true);
      const user = await getAuthUser().catch(() => null);
      if (user && isMounted) {
        setCurrentUser(user);
        try {
          const supabase = createClient();
          if (supabase) {
            const { data, error } = await supabase
              .from("activities")
              .select(`
                id,
                deal_id,
                post_id,
                requester_id,
                helper_id,
                status,
                requester_confirmed_done,
                helper_confirmed_done,
                cancellation_reason,
                completed_at,
                created_at,
                post:post_id(id, title, nature, region),
                deal:deal_id(scheduled_date, scheduled_time, meetup_location, compensation_value),
                requester:requester_id(id, full_name, bio, rating_average),
                helper:helper_id(id, full_name, bio, rating_average)
              `)
              .or(`requester_id.eq.${user.id},helper_id.eq.${user.id}`)
              .order("created_at", { ascending: false });

            if (!error && data && data.length > 0 && isMounted) {
              setActivities(data);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Error fetching Supabase activities:", e);
        }
      }

      // Fallback lokal
      const local = readSession();
      if (local && isMounted) setCurrentUser(local);
      if (isMounted) {
        setActivities(getActivities());
        setLoading(false);
      }
    }

    loadActivities();

    if (searchParams.get("rated") === "1") {
      showToast("Terima kasih! Ulasanmu berhasil dicatat dan reputasi mitra telah diperbarui.", "success");
    }

    return () => { isMounted = false; };
  }, [searchParams, showToast]);

  // Handler Konfirmasi Selesai (Paritas Dua Pihak via RPC confirm_activity_completion)
  const handleConfirmDone = async (activityId) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const supabase = createClient();
      if (supabase && currentUser?.id) {
        const { data, error } = await supabase.rpc("confirm_activity_completion", {
          p_activity_id: activityId,
        });

        if (error) throw error;

        if (data?.status === "selesai") {
          showToast("🎉 Kegiatan resmi tuntas! Kedua pihak telah mengonfirmasi selesai.", "success");
        } else {
          showToast("Konfirmasi dicatat. Menunggu konfirmasi dari pihak mitra.", "info");
        }

        // Muat ulang daftar kegiatan
        window.location.reload();
        return;
      }

      showToast("Konfirmasi selesai berhasil dicatat (Mode Demo).", "success");
    } catch (err) {
      showToast(err.message || "Gagal mengonfirmasi kegiatan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler Pembatalan Kegiatan (via cancel_deal)
  const handleCancelActivity = async (dealId) => {
    const reason = window.prompt("Masukkan alasan pembatalan kegiatan:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      if (supabase && dealId) {
        const { error } = await supabase.rpc("cancel_deal", {
          p_deal_id: dealId,
          p_cancellation_reason: reason,
        });

        if (error) throw error;
        showToast("Kegiatan berhasil dibatalkan dan kuota postingan dipulihkan.", "info");
        window.location.reload();
        return;
      }

      // Fallback lokal
      cancelActivity(dealId);
      setActivities(getActivities());
      showToast("Aktivitas dibatalkan.", "info");
    } catch (err) {
      showToast(err.message || "Gagal membatalkan kegiatan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const visibleActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((act) => act.status === filter);
  }, [activities, filter]);

  const stats = useMemo(() => {
    const total = activities.length;
    const terjadwal = activities.filter((a) => a.status === "terjadwal" || a.status === "menunggu").length;
    const berlangsung = activities.filter((a) => a.status === "berlangsung").length;
    const selesai = activities.filter((a) => a.status === "selesai").length;
    const batal = activities.filter((a) => a.status === "batal").length;
    return { total, terjadwal, berlangsung, selesai, batal };
  }, [activities]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "terjadwal":
      case "menunggu":
        return <span className="activity-status-tag tag-waiting">📅 Terjadwal</span>;
      case "berlangsung":
        return <span className="activity-status-tag tag-confirmed">⚡ Sedang Berjalan</span>;
      case "selesai":
        return <span className="activity-status-tag tag-completed">✓ Selesai</span>;
      case "batal":
        return <span className="activity-status-tag tag-cancelled">✕ Dibatalkan</span>;
      default:
        return <span className="activity-status-tag">{status}</span>;
    }
  };

  return (
    <ThreeColumnLayout>
      <header className="page-header-section" style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0" }}>
          Aktivitas & Kegiatan Saya
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
          Pantau jadwal bantuan, konfirmasi penyelesaian bersama, dan berikan penilaian reputasi.
        </p>
      </header>

      {/* Statistik Cepat */}
      <section className="activity-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        <div className="stat-box" style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border-subtle)", textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "20px", fontWeight: "700", color: "var(--color-text-primary)" }}>{stats.total}</span>
          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Total Aktivitas</span>
        </div>
        <div className="stat-box" style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0", textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "20px", fontWeight: "700", color: "#166534" }}>{stats.terjadwal}</span>
          <span style={{ fontSize: "11px", color: "#166534" }}>Terjadwal</span>
        </div>
        <div className="stat-box" style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe", textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "20px", fontWeight: "700", color: "#1e40af" }}>{stats.selesai}</span>
          <span style={{ fontSize: "11px", color: "#1e40af" }}>Tuntas Selesai</span>
        </div>
        <div className="stat-box" style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca", textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "20px", fontWeight: "700", color: "#991b1b" }}>{stats.batal}</span>
          <span style={{ fontSize: "11px", color: "#991b1b" }}>Dibatalkan</span>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="activity-filter-chips" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {[
          { key: "all", label: "Semua" },
          { key: "terjadwal", label: "Terjadwal" },
          { key: "berlangsung", label: "Sedang Berjalan" },
          { key: "selesai", label: "Selesai" },
          { key: "batal", label: "Dibatalkan" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`filter-chip ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              border: filter === tab.key ? "1px solid var(--color-action-primary)" : "1px solid var(--color-border-subtle)",
              background: filter === tab.key ? "var(--color-action-primary-light)" : "#fff",
              color: filter === tab.key ? "var(--color-action-primary)" : "var(--color-text-secondary)",
              fontSize: "12px",
              fontWeight: filter === tab.key ? "700" : "500",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Aktivitas */}
      <section className="activity-list-container" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {visibleActivities.length > 0 ? (
          visibleActivities.map((act) => {
            const isSupabase = Boolean(act.requester_id);
            const isRequester = isSupabase ? currentUser?.id === act.requester_id : true;
            const partnerName = isSupabase
              ? (isRequester ? act.helper?.full_name : act.requester?.full_name) || "Mitra"
              : act.partner || "Rekan Bantuan";

            const partnerId = isSupabase
              ? (isRequester ? act.helper_id : act.requester_id)
              : act.partnerId;

            const postTitle = isSupabase ? act.post?.title : (act.postId || "Aktivitas Bantuan");
            const myConfirmed = isRequester ? act.requester_confirmed_done : act.helper_confirmed_done;
            const partnerConfirmed = isRequester ? act.helper_confirmed_done : act.requester_confirmed_done;

            const canConfirm = act.status === "terjadwal" || act.status === "berlangsung";
            const isDone = act.status === "selesai";

            return (
              <article key={act.id} className="feed-card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 4px" }}>
                      {postTitle}
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>
                      Mitra: <strong>{partnerName}</strong> ({isRequester ? "Sebagai Pemohon" : "Sebagai Penolong"})
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(act.status)}
                  </div>
                </div>

                {isSupabase && act.deal && (
                  <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "12px" }}>
                    📍 Titik Temu: {act.deal.meetup_location} • 💰 Imbalan: {act.deal.compensation_value}
                  </div>
                )}

                {/* Status Konfirmasi Selesai */}
                {canConfirm && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
                    <span>Status Konfirmasi: </span>
                    <strong style={{ color: myConfirmed ? "green" : "#b45309" }}>
                      Kamu: {myConfirmed ? "✓ Sudah Konfirmasi" : "Belum"}
                    </strong>
                    <span> • </span>
                    <strong style={{ color: partnerConfirmed ? "green" : "#b45309" }}>
                      Mitra: {partnerConfirmed ? "✓ Sudah Konfirmasi" : "Belum"}
                    </strong>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px" }}>
                  {/* Tombol Konfirmasi Selesai */}
                  {canConfirm && !myConfirmed && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleConfirmDone(act.id)}
                      className="button button-sm button-primary"
                    >
                      ✓ Konfirmasi Selesai
                    </button>
                  )}

                  {canConfirm && myConfirmed && !partnerConfirmed && (
                    <span style={{ fontSize: "12px", color: "var(--color-warning)", fontWeight: "600" }}>
                      ⏳ Menunggu konfirmasi dari {partnerName}...
                    </span>
                  )}

                  {/* Tombol Beri Ulasan */}
                  {isDone && (
                    <Link
                      href={`/rating?id=${encodeURIComponent(act.id)}&partner=${encodeURIComponent(partnerId || "")}&partnerName=${encodeURIComponent(partnerName)}`}
                      className="button button-sm button-primary"
                      style={{ background: "#eab308", borderColor: "#ca8a04", color: "#000" }}
                    >
                      ⭐ Beri Ulasan & Rating
                    </Link>
                  )}

                  {/* Tombol Batalkan */}
                  {canConfirm && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleCancelActivity(act.deal_id || act.id)}
                      className="button button-sm button-outline btn-cancel-text"
                    >
                      ✕ Batalkan
                    </button>
                  )}

                  <Link href="/chat" className="button button-sm button-outline">
                    💬 Buka Chat
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            icon="📋"
            title="Tidak ada aktivitas di filter ini"
            description="Mulai dengan mencari bantuan atau memasang postingan di katalog NeedHelp."
            actionText="Jelajahi Feed Bantuan"
            onAction={() => router.push("/katalog")}
          />
        )}
      </section>
    </ThreeColumnLayout>
  );
}

export default function AktivitasPage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 16px" }}><div style={{ height: "300px", background: "#fff", borderRadius: "12px" }} /></div>}>
      <ActivityContent />
    </Suspense>
  );
}
