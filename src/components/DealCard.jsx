"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDate } from "../lib/data";

export function DealCard({
  deal,
  currentUserId,
  onAgree,
  onRevise,
  onCancel,
  postTitle = "Kegiatan Bantuan",
  requesterName = "Pemohon",
  helperName = "Penolong",
}) {
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseDate, setReviseDate] = useState(deal.scheduled_date || "");
  const [reviseTime, setReviseTime] = useState(deal.scheduled_time ? deal.scheduled_time.slice(0, 5) : "09:00");
  const [reviseLocation, setReviseLocation] = useState(deal.meetup_location || "");
  const [reviseCompType, setReviseCompType] = useState(deal.compensation_type || "tarif");
  const [reviseCompVal, setReviseCompVal] = useState(deal.compensation_value || "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!deal) return null;

  const isRequester = currentUserId === deal.requester_id;
  const isHelper = currentUserId === deal.helper_id;
  const myAgreed = isRequester ? deal.requester_agreed : deal.helper_agreed;
  const partnerAgreed = isRequester ? deal.helper_agreed : deal.requester_agreed;

  const isAgreed = deal.status === "disepakati";
  const isCancelled = deal.status === "dibatalkan";
  const isPending = deal.status === "diajukan" || deal.status === "menunggu_revisi";

  const handleAgreeClick = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await onAgree(deal.id, deal.deal_version);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviseSubmit = async (e) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await onRevise(deal.id, deal.deal_version, {
        scheduled_date: reviseDate,
        scheduled_time: reviseTime.length === 5 ? `${reviseTime}:00` : reviseTime,
        meetup_location: reviseLocation,
        compensation_type: reviseCompType,
        compensation_value: reviseCompVal,
      });
      setShowReviseModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await onCancel(deal.id, cancelReason || "Kesepakatan dibatalkan oleh pengguna");
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`in-chat-deal-card deal-status-${deal.status}`}>
      {/* 1. Header Kartu Kesepakatan */}
      <div className="deal-card-header">
        <div className="deal-header-title">
          <span className="deal-icon">🤝</span>
          <strong>KARTU KESEPAKATAN BANTUAN</strong>
          <span className="deal-version-pill">v{deal.deal_version}</span>
        </div>
        <span className={`deal-status-tag tag-${deal.status}`}>
          {isAgreed ? "Disepakati" : isCancelled ? "Dibatalkan" : "Menunggu Persetujuan"}
        </span>
      </div>

      {/* 2. Rincian Kesepakatan */}
      <div className="deal-card-body">
        <div className="deal-row">
          <span className="deal-row-label">Kebutuhan:</span>
          <span className="deal-row-val font-semibold">{postTitle}</span>
        </div>
        <div className="deal-row">
          <span className="deal-row-label">Pemohon:</span>
          <span className="deal-row-val">{requesterName} {isRequester ? "(Kamu)" : ""}</span>
        </div>
        <div className="deal-row">
          <span className="deal-row-label">Penolong:</span>
          <span className="deal-row-val">{helperName} {isHelper ? "(Kamu)" : ""}</span>
        </div>
        <div className="deal-row">
          <span className="deal-row-label">Jadwal Temu:</span>
          <span className="deal-row-val">{formatDate(deal.scheduled_date)} pukul {deal.scheduled_time?.slice(0, 5)} WIB</span>
        </div>
        <div className="deal-row">
          <span className="deal-row-label">Titik Temu:</span>
          <span className="deal-row-val">{deal.meetup_location}</span>
        </div>
        <div className="deal-row">
          <span className="deal-row-label">Imbalan:</span>
          <span className="deal-row-val font-semibold">{deal.compensation_value}</span>
        </div>

        {/* 3. Status Persetujuan Kedua Belah Pihak */}
        <div className="deal-approval-status-box">
          <div className="approval-row">
            <span>{requesterName} (Pemohon):</span>
            <span className={`approval-badge ${deal.requester_agreed ? "agreed" : "waiting"}`}>
              {deal.requester_agreed ? "✓ Telah Menyetujui" : "⏳ Menunggu Persetujuan"}
            </span>
          </div>
          <div className="approval-row">
            <span>{helperName} (Penolong):</span>
            <span className={`approval-badge ${deal.helper_agreed ? "agreed" : "waiting"}`}>
              {deal.helper_agreed ? "✓ Telah Menyetujui" : "⏳ Menunggu Persetujuan"}
            </span>
          </div>
        </div>

        {isAgreed && (
          <div className="deal-success-banner">
            <p>🎉 <strong>Resmi Disepakati!</strong> Kegiatan telah otomatis dijadwalkan.</p>
            <Link href="/aktivitas" className="button button-sm button-primary" style={{ marginTop: "6px" }}>
              Buka Halaman Aktivitas &rarr;
            </Link>
          </div>
        )}

        {isCancelled && (
          <div className="deal-cancelled-banner">
            <p>✕ Kesepakatan ini telah dibatalkan.</p>
          </div>
        )}

        {/* 4. Tombol Aksi Persetujuan & Revisi */}
        {isPending && (
          <div className="deal-actions-row">
            {!myAgreed && (
              <button
                type="button"
                onClick={handleAgreeClick}
                disabled={actionLoading}
                className="button button-sm button-primary"
              >
                {actionLoading ? "Memproses..." : "✓ Setujui Kesepakatan Ini"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReviseModal(true)}
              disabled={actionLoading}
              className="button button-sm button-outline"
            >
              ✏️ Ajukan Perubahan
            </button>

            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="button button-sm button-outline btn-cancel-text"
            >
              ✕ Batalkan
            </button>
          </div>
        )}
      </div>

      {/* Modal Revisi */}
      {showReviseModal && (
        <div className="deal-modal-backdrop">
          <div className="deal-modal-content">
            <h3>Ajukan Perubahan Kesepakatan (Versi {deal.deal_version + 1})</h3>
            <p className="text-muted" style={{ fontSize: "12px", margin: "4px 0 16px" }}>
              Perubahan rincian akan menaikkan versi kesepakatan dan memerlukan persetujuan ulang dari kedua pihak.
            </p>
            <form onSubmit={handleReviseSubmit}>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Tanggal Temu</label>
                <input
                  type="date"
                  value={reviseDate}
                  onChange={(e) => setReviseDate(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Jam Temu</label>
                <input
                  type="time"
                  value={reviseTime}
                  onChange={(e) => setReviseTime(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Titik Temu</label>
                <input
                  type="text"
                  value={reviseLocation}
                  onChange={(e) => setReviseLocation(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Imbalan / Catatan</label>
                <input
                  type="text"
                  value={reviseCompVal}
                  onChange={(e) => setReviseCompVal(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowReviseModal(false)} className="button button-sm button-outline">
                  Batal
                </button>
                <button type="submit" disabled={actionLoading} className="button button-sm button-primary">
                  {actionLoading ? "Mengirim..." : "Kirim Revisi (v" + (deal.deal_version + 1) + ")"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Batal */}
      {showCancelModal && (
        <div className="deal-modal-backdrop">
          <div className="deal-modal-content">
            <h3>Batalkan Kesepakatan Bantuan</h3>
            <p className="text-muted" style={{ fontSize: "12px", margin: "4px 0 16px" }}>
              Apakah kamu yakin ingin membatalkan kesepakatan ini? Alasan akan dicatat pada riwayat chat.
            </p>
            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Alasan Pembatalan</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Jadwal mendadak bentrok / hal tak terduga"
                  style={{ width: "100%", padding: "6px 8px" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCancelModal(false)} className="button button-sm button-outline">
                  Kembali
                </button>
                <button type="submit" disabled={actionLoading} className="button button-sm button-primary" style={{ background: "var(--color-error)" }}>
                  {actionLoading ? "Membatalkan..." : "Ya, Batalkan Kesepakatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
