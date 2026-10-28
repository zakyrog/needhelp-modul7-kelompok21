"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPostWithStatus,
  fetchPosts,
  fetchPostById,
  getPostAuthor,
  CATEGORY_LABELS,
  formatDate,
  formatTimeRange,
  formatCompensation,
  formatDateTime,
  deletePostSupabase,
  getPostLifecycleStatus,
  getMyActiveApplicationForPost,
} from "../../lib/data.js";
import { isSupabaseConfigured, getSupabase } from "../../lib/supabase.js";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

function DetailPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const id = searchParams.get("id");
  const backUrl = searchParams.get("back") || "/katalog";

  // Di mode Supabase, jangan inisialisasi dari getPost sync (cache bisa kosong).
  // Set loading=true agar tidak flash "tidak ditemukan" sebelum async fetch selesai.
  const supabaseMode = isSupabaseConfigured();
  const [post, setPost] = useState(() => {
    if (!id) return null;
    if (supabaseMode) return null;
    return getPostWithStatus(id);
  });
  const [loading, setLoading] = useState(() => supabaseMode && Boolean(id));
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Keanggotaan Supabase Auth yang sudah diverifikasi server. `post.owned` bisa
  // salah bila sesi belum terbaca saat fetch, jadi CTA pengajuan memakai ini.
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!supabaseMode) return;
    let isCancelled = false;
    getSupabase()
      .auth.getUser()
      .then(({ data, error: authError }) => {
        if (isCancelled) return;
        setUserId(authError ? null : data?.user?.id || null);
      })
      .catch(() => {
        if (!isCancelled) setUserId(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [supabaseMode]);

  // Pengajuan aktif (pending/accepted) milik user untuk postingan ini, agar tombol
  // formulir tidak menawarkan pengajuan kedua. null = belum diketahui / tidak ada.
  const [myApplication, setMyApplication] = useState(null);

  useEffect(() => {
    if (!supabaseMode || !userId || !id) {
      setMyApplication(null);
      return;
    }
    let isCancelled = false;
    getMyActiveApplicationForPost(id)
      .then((app) => {
        if (!isCancelled) setMyApplication(app);
      })
      .catch(() => {
        if (!isCancelled) setMyApplication(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [supabaseMode, userId, id]);

  useEffect(() => {
    if (!id) return;

    let isCancelled = false;

    if (supabaseMode) {
      // Jalur Supabase: fetch langsung dari database
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
      // Jalur demo: sync lookup + refresh dari seed/localStorage
      setPost(getPostWithStatus(id));
      fetchPosts()
        .then(() => {
          if (!isCancelled) {
            setPost(getPostWithStatus(id));
          }
        })
        .catch(() => {
          // Mode demo: silent fallback ke data yang sudah ada
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini tidak dapat dibatalkan.")) return;

    setDeleting(true);
    try {
      await deletePostSupabase(post.id);
      showToast("Postingan berhasil dihapus.", "success");
      router.push("/");
    } catch (err) {
      showToast(err.message || "Gagal menghapus postingan.", "error");
      setDeleting(false);
    }
  };

  // State loading
  if (loading) {
    return (
      <main className="detail-main-layout">
        <div style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <p>Memuat detail postingan...</p>
        </div>
      </main>
    );
  }

  // State error (Supabase terkonfigurasi tapi query gagal)
  if (error) {
    return (
      <main className="detail-main-layout">
        <div style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <EmptyState
            icon="⚠️"
            title="Gagal Memuat Postingan"
            description={error}
            actionText="Kembali ke Katalog"
            onAction={() => router.push(backUrl)}
          />
        </div>
      </main>
    );
  }

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

  // Status efektif diambil dari activities.status (lihat getPostLifecycleStatus).
  // Hanya "aktif" yang boleh menerima pengajuan baru atau memulai chat.
  const lifecycle = getPostLifecycleStatus(post);
  const isActive = lifecycle === "aktif";
  const isOwner = Boolean(post.owned);
  // Pemilik pasti tidak boleh membuka formulir pengajuan; bila sesi belum
  // terverifikasi, mengklik link hanya akan diarahkan ke /login.
  const ownsThisPost = Boolean(
    supabaseMode && userId && post.authorId === userId,
  );
  const applicationHref = ownsThisPost
    ? "/pengajuan"
    : supabaseMode && !userId
      ? `/login?next=${encodeURIComponent(`/formbantuan?id=${post.id}`)}`
      : `/formbantuan?id=${encodeURIComponent(post.id)}`;
  // Sudah punya pengajuan pending/accepted untuk post ini: tombol diganti status
  // non-aktif, tidak bisa diklik untuk mengajukan ulang. RPC 010 tetap menolak.
  const hasActiveApplication = Boolean(myApplication);
  const closedMessage =
    lifecycle === "selesai"
      ? "Aktivitas bantuan untuk postingan ini sudah selesai. Pengajuan bantuan baru tidak lagi dibuka."
      : lifecycle === "batal"
        ? "Aktivitas untuk postingan ini sudah dibatalkan. Pengajuan bantuan baru tidak lagi dibuka."
        : "Status postingan ini tidak dikenali, sehingga pengajuan bantuan baru tidak dibuka.";
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
        {!isActive ? (
          /* Read-only: post selesai/batal hanya boleh dilihat, termasuk oleh pemiliknya */
          <section className="action-box" data-post-closed>
            <h2>
              {lifecycle === "selesai" ? "Postingan Sudah Selesai" : "Postingan Tidak Aktif"}
            </h2>
            <p>{closedMessage}</p>
            {isOwner && (
              <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                Anda dapat melihat riwayat aktivitas dan ulasan di halaman Aktivitas.
              </p>
            )}
            <Link href="/aktivitas" className="btn-chat">
              Lihat Aktivitas
            </Link>
          </section>
        ) : isOwner ? (
          /* Pemilik tidak boleh mengajukan bantuan ke postingannya sendiri */
          <section className="action-box" data-post-owner>
            <h2>Postingan Anda</h2>
            <p>
              Kelola pengajuan bantuan yang masuk untuk postingan ini. Anda tidak
              dapat mengajukan bantuan ke postingan sendiri.
            </p>
            <Link href="/pengajuan" className="btn-bantu">
              Kelola Pengajuan Bantuan
            </Link>
          </section>
        ) : (
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

            {hasActiveApplication ? (
              <span
                className="btn-chat"
                aria-disabled="true"
                data-application-exists={myApplication.status}
                style={{ opacity: 0.65, cursor: "not-allowed" }}
              >
                &#10003; Sudah Mengajukan
                {myApplication.status === "accepted" ? " (Diterima)" : " (Menunggu)"}
              </span>
            ) : (
              <Link href={applicationHref} className="btn-chat">
                &#128221; Form Pengajuan Bantuan
              </Link>
            )}
          </section>
        )}

        {/* Tombol Hapus — hanya untuk pemilik postingan */}
        {post.owned && (
          <section style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "1px solid var(--color-error, #e53e3e)",
                borderRadius: "var(--radius-md, 8px)",
                color: "var(--color-error, #e53e3e)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {deleting ? "Menghapus..." : "🗑️ Hapus Postingan"}
            </button>
          </section>
        )}

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
