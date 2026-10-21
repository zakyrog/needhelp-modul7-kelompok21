"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../lib/data";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";
import { SimulationBanner } from "../../components/SimulationBanner";

export default function NotifikasiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
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
            style={{ cursor: "pointer" }}
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
            style={{ cursor: "pointer" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="notification-list" style={{ marginTop: "20px" }}>
        {visibleNotifications.length > 0 ? (
          visibleNotifications.map((item) => (
            <article
              key={item.id}
              className={`notification-card${item.read ? "" : " unread"}`}
              onClick={() => handleClickItem(item)}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border-default)",
                background: item.read ? "#fff" : "var(--color-bg-subtle, #e3fdfd)",
                borderRadius: "10px",
                marginBottom: "8px",
              }}
            >
              <div
                className="notif-card-left"
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <div
                  className="notif-icon-box"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <img
                    src={item.icon || "/assets/images/icon-bell.svg"}
                    alt=""
                    width="20"
                    height="20"
                  />
                </div>
                <div className="notif-text-content">
                  <div
                    className="notif-title-row"
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <h3 style={{ margin: 0, fontSize: "15px" }}>{item.title}</h3>
                    {!item.read && (
                      <span
                        className="unread-dot-badge"
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "var(--color-action-primary, #4a9ba0)",
                          display: "inline-block",
                        }}
                      />
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {item.message}
                  </p>
                </div>
              </div>
              <div className="notif-card-right">
                <span
                  className="notif-time"
                  style={{ fontSize: "12px", color: "var(--color-text-muted)" }}
                >
                  {item.timeLabel}
                </span>
              </div>
            </article>
          ))
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
