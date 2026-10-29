"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  mergeIncomingNotifications,
  applyReadLocally,
  formatNotificationTime,
  NOTIFICATION_ERROR_CODES,
} from "../../lib/notifications.js";
import { subscribeToNotifications } from "../../lib/notification-realtime.js";
import { readSession } from "../../lib/auth.js";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";

const FILTER_MAP = {
  all: null,
  post: ["application", "application_status"],
  chat: ["chat"],
  status: ["application_status"],
};

export default function NotifikasiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // readSession() mengembalikan objek BARU pada setiap pemanggilan (hasil
  // JSON.parse localStorage). Kalau dipanggil langsung tiap render, `session`
  // berubah identitas terus sehingga `load` dan useEffect realtime ikut berubah
  // tiap render (langganan ulang + fetch berulang). Baca sekali per mount agar
  // referensinya stabil. Header sudah mengarahkan keluar saat logout.
  const session = useMemo(() => {
    if (typeof window === "undefined") return null;
    return readSession();
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const rows = await fetchNotifications();
      setNotifications((prev) => mergeIncomingNotifications(prev, rows));
    } catch (err) {
      setError(
        err.code === NOTIFICATION_ERROR_CODES.NOT_AUTHENTICATED
          ? "Silakan masuk terlebih dahulu untuk melihat notifikasi."
          : err.message || "Gagal memuat notifikasi.",
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: notifikasi baru masuk tanpa reload. Status baca hanya bisa
  // berubah menjadi dibaca (mergeIncomingNotifications), bukan sebaliknya.
  useEffect(() => {
    if (!session) return undefined;
    const stop = subscribeToNotifications((row) => {
      setNotifications((prev) => mergeIncomingNotifications(prev, row));
    });
    // Sinkronisasi berkala ringan sebagai cadangan bila realtime terputus.
    const interval = setInterval(() => {
      load();
    }, 60_000);
    return () => {
      stop();
      clearInterval(interval);
    };
  }, [session, load]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    const allowed = FILTER_MAP[filter];
    if (!allowed) return notifications;
    return notifications.filter((n) => allowed.includes(n.kind));
  }, [notifications, filter]);

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      setNotifications((prev) => applyReadLocally(prev, unreadIds));
      showToast("Semua notifikasi ditandai sudah dibaca.", "success");
    } catch (err) {
      showToast(err.message || "Gagal memperbarui status notifikasi.", "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickItem = async (item) => {
    // Navigasi tetap dilakukan walau penandaan baca gagal.
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
      } catch {
        // abaikan; badge akan tersinkron pada muat berikutnya
      }
      setNotifications((prev) => applyReadLocally(prev, [item.id]));
    }
    router.push(item.href);
  };

  const getIconData = (kind) => {
    switch (kind) {
      case "chat":
        return { icon: "💬", className: "tosca-icon" };
      case "application":
        return { icon: "📩", className: "green-icon" };
      case "application_status":
        return { icon: "🔔", className: "yellow-icon" };
      default:
        return { icon: "🔔", className: "tosca-icon" };
    }
  };

  const renderBody = () => {
    if (!session) {
      return (
        <EmptyState
          icon="🔒"
          title="Masuk untuk melihat notifikasi"
          description="Notifikasi hanya ditampilkan untuk akun yang sedang masuk."
          actionText="Masuk"
          onAction={() => router.push("/login?next=/notifikasi")}
        />
      );
    }
    if (loading) {
      return (
        <p style={{ textAlign: "center", padding: "40px 0", color: "#5e7a80" }}>
          Memuat notifikasi...
        </p>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="⚠️"
          title="Gagal Memuat Notifikasi"
          description={error}
          actionText="Coba Lagi"
          onAction={load}
        />
      );
    }
    if (visibleNotifications.length === 0) {
      return (
        <EmptyState
          icon="🔔"
          title="Tidak Ada Notifikasi"
          description={
            notifications.length === 0
              ? "Belum ada notifikasi. Notifikasi pesan, pengajuan, dan status pengajuan akan muncul di sini."
              : "Tidak ada notifikasi untuk kategori filter yang dipilih saat ini."
          }
          actionText={notifications.length === 0 ? undefined : "Tampilkan Semua"}
          onAction={notifications.length === 0 ? undefined : () => setFilter("all")}
        />
      );
    }
    return visibleNotifications.map((item) => {
      const iconData = getIconData(item.kind);
      return (
        <article
          key={item.id}
          className={`notification-card${item.read ? "" : " unread"}`}
          onClick={() => handleClickItem(item)}
          style={{ cursor: "pointer" }}
        >
          <div className="notif-card-left">
            <div className={`notif-icon-box ${iconData.className}`}>
              {iconData.icon}
            </div>
            <div className="notif-text-content">
              <div className="notif-title-row">
                <h3>{item.title}</h3>
                {!item.read && <span className="unread-dot-badge" />}
              </div>
              <p>{item.body}</p>
            </div>
          </div>
          <div className="notif-card-right">
            <span className="notif-time">{formatNotificationTime(item.createdAt)}</span>
          </div>
        </article>
      );
    });
  };

  return (
    <main className="notification-main">
      <div className="notification-top-section">
        <div className="title-group">
          <h1>Notifikasi</h1>
          <p>
            {unreadCount} belum dibaca &bull; {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn-mark-all"
            onClick={handleMarkAll}
            disabled={markingAll}
          >
            {markingAll ? "Menandai..." : "Tandai semua terbaca"}
          </button>
        )}
      </div>

      <div className="notification-filters">
        {[
          { key: "all", label: "Semua" },
          { key: "post", label: "Pengajuan" },
          { key: "chat", label: "Pesan" },
          { key: "status", label: "Status Pengajuan" },
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

      <div className="notification-list">{renderBody()}</div>
    </main>
  );
}