"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../lib/data.js";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";
import { SimulationBanner } from "../../components/SimulationBanner";

export default function NotifikasiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState(() => getNotifications());
  const [filter, setFilter] = useState("all");

  const refreshNotifications = () => {
    setNotifications(getNotifications());
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((item) => item.type === filter);
  }, [notifications, filter]);

  const handleMarkAll = () => {
    try {
      markAllNotificationsRead();
      refreshNotifications();
      showToast("Semua notifikasi ditandai sudah dibaca.", "success");
    } catch {
      showToast("Gagal memperbarui status notifikasi.", "error");
    }
  };

  const handleClickItem = (item) => {
    try {
      markNotificationRead(item.id);
      refreshNotifications();
    } catch {}
    if (item.href) {
      router.push(item.href);
    }
  };

  const getIconData = (type) => {
    switch (type) {
      case "chat":
        return { icon: "💬", className: "tosca-icon" };
      case "rating":
        return { icon: "⭐", className: "yellow-icon" };
      case "post":
        return { icon: "📦", className: "green-icon" };
      default:
        return { icon: "🔔", className: "tosca-icon" };
    }
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
          >
            Tandai semua terbaca
          </button>
        )}
      </div>

      <SimulationBanner text="Status notifikasi dibaca disimpan di penyimpanan browser lokal." />

      <div className="notification-filters">
        {[
          { key: "all", label: "Semua" },
          { key: "post", label: "Permintaan" },
          { key: "chat", label: "Pesan" },
          { key: "rating", label: "Rating & Ulasan" },
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

      <div className="notification-list">
        {visibleNotifications.length > 0 ? (
          visibleNotifications.map((item) => {
            const iconData = getIconData(item.type);
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
                    <p>{item.message}</p>
                  </div>
                </div>
                <div className="notif-card-right">
                  <span className="notif-time">{item.timeLabel}</span>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            icon="🔔"
            title="Tidak Ada Notifikasi"
            description="Tidak ada notifikasi untuk kategori filter yang dipilih saat ini."
            actionText="Tampilkan Semua"
            onAction={() => setFilter("all")}
          />
        )}
      </div>
    </main>
  );
}
