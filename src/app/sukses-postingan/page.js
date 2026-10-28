"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPost, fetchPostById, formatDateTime, formatDate, formatTimeRange } from "../../lib/data";
import { isSupabaseConfigured } from "../../lib/supabase";
import { EmptyState } from "../../components/EmptyState";

function SuksesPostinganContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // Di mode Supabase, jangan pakai getPost sync karena cache mungkin kosong
  const [post, setPost] = useState(() => {
    if (!id) return null;
    if (isSupabaseConfigured()) return null; // akan di-fetch async
    return getPost(id);
  });
  const [loading, setLoading] = useState(() => isSupabaseConfigured() && Boolean(id));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let isCancelled = false;

    if (isSupabaseConfigured()) {
      setLoading(true);
      setError(null);

      fetchPostById(id)
        .then((data) => {
          if (!isCancelled) {
            setPost(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err.message || "Gagal mengambil detail postingan.");
            setLoading(false);
          }
        });
    } else {
      // Mode demo: sync lookup
      setPost(getPost(id));
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // State loading (Supabase)
  if (loading) {
    return (
      <main className="form-page-wrapper">
        <div style={{ maxWidth: "560px", margin: "40px auto", textAlign: "center" }}>
          <p>Memuat data postingan...</p>
        </div>
      </main>
    );
  }

  // State error (Supabase query gagal)
  if (error) {
    return (
      <main className="form-page-wrapper">
        <div style={{ maxWidth: "560px", margin: "40px auto" }}>
          <EmptyState
            icon="⚠"
            title="Gagal Memuat Postingan"
            description={error}
            actionText="Kembali ke Katalog"
            onAction={() => (window.location.href = "/katalog")}
          />
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="form-page-wrapper">
        <div style={{ maxWidth: "560px", margin: "40px auto" }}>
          <EmptyState
            icon="⚠"
            title="Data Postingan Tidak Ditemukan"
            description="Tidak ada data postingan yang tersimpan dengan ID ini. Pastikan Anda telah membuat postingan terlebih dahulu."
            actionText="Buat Postingan Sekarang"
            onAction={() => (window.location.href = "/buat-postingan")}
          />
        </div>
      </main>
    );
  }

  const isNeed = post.nature === "butuh";
  const typeLabel = isNeed
    ? "Saya Butuh (Permintaan Bantuan)"
    : "Saya Bisa (Penawaran Bantuan)";
  const statusLabel = isNeed
    ? "Menunggu Penawaran Relawan"
    : "Menunggu Respon Peminta Bantuan";

  return (
    <main className="form-page-wrapper">
      <div className="form-container-box success-box text-center">
        <div className="success-icon-wrapper">
          <span className="success-icon">&#10003;</span>
        </div>

        <h1 className="success-title">Postingan Berhasil Diterbitkan 🎉</h1>
        <p className="success-desc">
          Postingan kamu telah aktif dan dapat ditemukan oleh pengguna lain di katalog.
        </p>

        <div className="success-summary-card">
          <div className="summary-row">
            <span className="summary-label">ID Postingan</span>
            <strong className="summary-value">#{post.id}</strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Judul</span>
            <strong className="summary-value">{post.title}</strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Jalur / Jenis</span>
            <strong className="summary-value">{typeLabel}</strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Status</span>
            <strong className="summary-value" style={{ color: "var(--color-action-primary)" }}>
              {statusLabel}
            </strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Waktu Rencana</span>
            <strong className="summary-value">
              {formatDate(post.date)} ({formatTimeRange(post)})
            </strong>
          </div>
          <div className="summary-row">
            <span className="summary-label">Dipublikasikan</span>
            <strong className="summary-value">{formatDateTime(post.createdAt)}</strong>
          </div>
        </div>

        <div className="success-actions">
          <Link href={`/detail-postingan?id=${encodeURIComponent(post.id)}`} className="btn-primary-custom">
            Lihat Detail Postingan
          </Link>
          <Link href="/aktivitas" className="btn-secondary-custom">
            Lihat Aktivitas
          </Link>
        </div>

        <div className="success-footer-link">
          <Link href="/katalog">&larr; Kembali ke Katalog Feed</Link>
        </div>
      </div>
    </main>
  );
}

export default function SuksesPostinganPage() {
  return (
    <Suspense fallback={<div className="form-page-wrapper"><p>Memuat status postingan...</p></div>}>
      <SuksesPostinganContent />
    </Suspense>
  );
}
