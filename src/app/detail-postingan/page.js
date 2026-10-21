"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPost,
  getPublicPost,
  getPostAuthor,
  CATEGORY_LABELS,
  formatDate,
  formatTimeRange,
  formatCompensation,
  formatDateTime,
  saveMessage,
} from "../../lib/data";
import { readSession } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";

function DetailPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const id = searchParams.get("id");
  const backUrl = searchParams.get("back") || "/katalog";

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const found = getPost(id) || getPublicPost(id);
    setPost(found);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <main className="detail-main-layout">
        <div style={{ maxWidth: "800px", margin: "40px auto", width: "100%" }}>
          <SkeletonCard />
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="detail-main-layout">
        <div style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <EmptyState
            icon="🔎"
            title="Postingan tidak ditemukan"
            description="Postingan yang kamu cari tidak tersedia atau mungkin sudah dihapus."
            actionText="Kembali ke Katalog"
            onAction={() => router.push(backUrl)}
          />
        </div>
      </main>
    );
  }

  const author = getPostAuthor(post);
  const isNeed = post.nature === "butuh";
  const typeLabel = isNeed ? "Saya Butuh" : "Saya Bisa";
  const categoryLabel = CATEGORY_LABELS[post.category] || post.category;
  const chatUrl = `/chat?user=${encodeURIComponent(author.id)}&topic=${encodeURIComponent(post.title)}`;
  const formBantuanUrl = `/formbantuan?id=${encodeURIComponent(post.id)}`;

  const handleSendNote = (e) => {
    e.preventDefault();
    const session = readSession();
    if (!session) {
      showToast("Silakan masuk terlebih dahulu untuk mengirim pesan.", "info");
      router.push(`/login?next=${encodeURIComponent(`/detail-postingan?id=${post.id}`)}`);
      return;
    }

    const trimmed = noteMessage.trim();
    if (!trimmed) {
      setNoteError("Tulis catatan atau penawaran terlebih dahulu.");
      return;
    }

    try {
      saveMessage(author.id, trimmed, post.title);
      showToast("Pesan berhasil dikirim ke obrolan!", "success");
      router.push(chatUrl);
    } catch {
      setNoteError("Gagal menyimpan pesan ke penyimpanan lokal.");
    }
  };

  return (
    <main className="detail-main-layout">
      <nav aria-label="Jejak Navigasi" className="breadcrumb-nav">
        <p className="breadcrumb-back">
          <Link href={backUrl} data-detail-back>
            &larr; Kembali ke Feed
          </Link>
        </p>
        <div className="breadcrumb-status">
          <span className="status-title">Detail Postingan #{post.id}</span>
          <span className="status-badge">
            <mark>{typeLabel}</mark> &bull; Kategori: {categoryLabel}
          </span>
        </div>
      </nav>

      <article className="detail-article">
        <section className="requester-section">
          <img
            src={author.avatar || "/assets/images/avatar-user.svg"}
            alt={`Foto profil ${author.name}`}
            width="48"
            height="48"
            className="requester-img"
          />
          <div>
            <h3 className="requester-name">{author.name}</h3>
            <p className="requester-info">{author.bio}</p>
          </div>
          <div className="requester-rating">
            &star; <span>{author.rating ? author.rating.split(" ")[0] : "4.9"}</span>
          </div>
        </section>

        <header className="article-header">
          <h1>{post.title}</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            Dipublikasikan oleh <strong>{author.name}</strong> pada{" "}
            <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          </p>
          <div style={{ marginTop: "16px", lineHeight: "1.7" }}>
            <h2>{isNeed ? "Deskripsi Kebutuhan" : "Deskripsi Penawaran"}</h2>
            {post.description.split(/\n{2,}/).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </header>

        <section className="info-grid-section">
          <div className="info-card">
            <img
              src="/assets/images/icon-kurir.svg"
              alt="Kategori"
              width="20"
              height="20"
            />
            <div>
              <div className="info-label">Kategori</div>
              <div className="info-value">{categoryLabel}</div>
            </div>
          </div>

          <div className="info-card">
            <img
              src="/assets/images/icon-quote.svg"
              alt="Kompensasi"
              width="20"
              height="20"
            />
            <div>
              <div className="info-label">Kompensasi</div>
              <div className="info-value">{formatCompensation(post)}</div>
            </div>
          </div>

          <div className="info-card">
            <img
              src="/assets/images/icon-bell.svg"
              alt="Waktu"
              width="20"
              height="20"
            />
            <div>
              <div className="info-label">Waktu Rencana</div>
              <div className="info-value">
                {formatDate(post.date)} ({formatTimeRange(post)})
              </div>
            </div>
          </div>

          <div className="info-card">
            <img
              src="/assets/images/icon-search.svg"
              alt="Lokasi"
              width="20"
              height="20"
            />
            <div>
              <div className="info-label">Lokasi</div>
              <div className="info-value">
                {post.destination ? `${post.address} → ${post.destination}` : post.address}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Note Form */}
        <section
          style={{
            marginTop: "32px",
            padding: "20px",
            background: "var(--color-bg-subtle, #e3fdfd)",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
            Kirim Catatan Cepat ke {author.name}
          </h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            Tertarik dengan bantuan ini? Kirim pesan pembuka yang langsung masuk ke ruang obrolan.
          </p>
          <form onSubmit={handleSendNote}>
            <textarea
              rows="3"
              value={noteMessage}
              onChange={(e) => {
                setNoteMessage(e.target.value);
                setNoteError("");
              }}
              placeholder={`Halo ${author.name}, saya tertarik membantu terkait "${post.title}"...`}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-default)",
                marginBottom: "8px",
                fontFamily: "inherit",
              }}
            />
            {noteError && (
              <p style={{ color: "var(--color-error)", fontSize: "13px", margin: "4px 0" }}>
                ⚠ {noteError}
              </p>
            )}
            <button type="submit" className="button button-primary">
              Kirim Catatan &amp; Buka Chat
            </button>
          </form>
        </section>
      </article>

      <div className="detail-sidebar">
        <section className="action-box">
          <h2>
            {isNeed ? "Ajukan Penawaran Bantuan" : "Tertarik dengan Tawaran Ini?"}
          </h2>
          <p>
            {isNeed
              ? `Tertarik membantu ${author.name} menyelesaikan kebutuhan ini?`
              : `Hubungi ${author.name} untuk menanyakan detail tawaran bantuan ini.`}
          </p>

          <Link href={chatUrl} className="btn-bantu">
            {isNeed ? "Mulai Chat & Tawarkan Bantuan" : "Mulai Chat & Tanyakan Detail"}
          </Link>

          <Link href={formBantuanUrl} className="btn-chat" style={{ textAlign: "center" }}>
            📝 Ajukan Form Bantuan
          </Link>
        </section>

        {/* Kotak Tips Aman */}
        <section className="safety-box">
          <h3>🛡️ Tips aman</h3>
          <p>
            Selalu ketemu di tempat ramai pertama kali. Jangan transfer uang
            muka sebelum ketemu langsung.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function DetailPostPage() {
  return (
    <Suspense fallback={<div className="detail-main-layout"><p>Memuat detail postingan...</p></div>}>
      <DetailPostContent />
    </Suspense>
  );
}
