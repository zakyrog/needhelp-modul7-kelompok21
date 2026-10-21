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
} from "../../lib/data.js";
import { EmptyState } from "../../components/EmptyState";

function DetailPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");
  const backUrl = searchParams.get("back") || "/katalog";

  const [post, setPost] = useState(() => (id ? getPost(id) || getPublicPost(id) : null));

  useEffect(() => {
    if (id) {
      setPost(getPost(id) || getPublicPost(id));
    }
  }, [id]);

  if (!id || !post) {
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
            width={48}
            height={48}
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
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "8px 0 16px 0" }}>
            Dipublikasikan oleh <strong>{author.name}</strong> pada{" "}
            <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          </p>
          <div style={{ lineHeight: "1.7" }}>
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
              width={20}
              height={20}
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
              width={20}
              height={20}
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
              width={20}
              height={20}
            />
            <div>
              <div className="info-label">Waktu</div>
              <div className="info-value">
                {formatDate(post.date)} ({formatTimeRange(post)})
              </div>
            </div>
          </div>

          <div className="info-card">
            <img
              src="/assets/images/icon-search.svg"
              alt="Lokasi"
              width={20}
              height={20}
            />
            <div>
              <div className="info-label">Lokasi</div>
              <div className="info-value">
                {post.destination ? `${post.address} → ${post.destination}` : post.address}
              </div>
            </div>
          </div>
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

          <Link href={`/formbantuan?id=${encodeURIComponent(post.id)}`} className="btn-chat">
            &#128221; Form Pengajuan Bantuan
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
