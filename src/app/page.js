"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchPublicPosts,
  getActivities,
  getUserPosts,
  CATEGORY_LABELS,
  REGION_LABELS,
  formatRupiah,
  formatRelativeTime,
} from "../lib/data.js";
import { getAuthUser, readSession } from "../lib/auth.js";
import { EXAMPLE_POSTS_FIXTURE } from "../data/examplePostsFixture.js";
import { ThreeColumnLayout } from "../components/ThreeColumnLayout";
import { QuickPostBox } from "../components/QuickPostBox";

function HomeContent() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [latestPosts, setLatestPosts] = useState(() => EXAMPLE_POSTS_FIXTURE.slice(0, 2));
  const [userActivities, setUserActivities] = useState(() => {
    try {
      const allActs = getActivities();
      return allActs.filter((a) => a.status === "menunggu" || a.status === "berlangsung" || a.status === "terjadwal").slice(0, 2);
    } catch {
      return [];
    }
  });
  const [userActivePosts, setUserActivePosts] = useState(() => {
    try {
      const myPosts = getUserPosts();
      return myPosts.filter((p) => p.status === "aktif" || !p.status).slice(0, 2);
    } catch {
      return [];
    }
  });
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Memeriksa status sesi pengguna (Auth / Local)
    async function checkAuth() {
      try {
        const authUser = await getAuthUser();
        if (authUser && isMounted) {
          setSession({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Pengguna",
          });
        } else {
          const localSess = readSession();
          if (localSess && isMounted) {
            setSession(localSess);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    }

    // 2. Memuat postingan publik terbaru untuk cuplikan (maksimal 2-3 posting)
    async function loadFeed() {
      try {
        const publicPosts = await fetchPublicPosts();
        if (isMounted) {
          const source = publicPosts && publicPosts.length > 0 ? publicPosts : EXAMPLE_POSTS_FIXTURE;
          setLatestPosts(source.slice(0, 2));
          setLoadingPosts(false);
        }
      } catch {
        if (isMounted) {
          setLatestPosts(EXAMPLE_POSTS_FIXTURE.slice(0, 2));
          setLoadingPosts(false);
        }
      }
    }

    // 3. Memuat aktivitas nyata dan postingan aktif pengguna
    function loadUserData() {
      try {
        const allActs = getActivities();
        // Aktivitas yang perlu ditindaklanjuti (menunggu respon, berlangsung, atau terjadwal)
        const actionable = allActs.filter(
          (act) => act.status === "menunggu" || act.status === "berlangsung" || act.status === "terjadwal"
        );
        setUserActivities(actionable.slice(0, 2));

        const myPosts = getUserPosts();
        const active = myPosts.filter((p) => p.status === "aktif" || !p.status);
        setUserActivePosts(active.slice(0, 2));
      } catch {
        // Fallback
      }
    }

    checkAuth();
    loadFeed();
    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCategoryColorClass = (cat) => {
    switch (cat) {
      case "ditemani":
        return "badge-category-ditemani";
      case "pendampingan":
        return "badge-category-pendampingan";
      case "explore":
        return "badge-category-explore";
      case "bantuan":
      default:
        return "badge-category-bantuan";
    }
  };

  return (
    <ThreeColumnLayout>
      <div className="home-dashboard-wrapper">
        {/* 1. Header Judul & Deskripsi Beranda */}
        <header className="home-header-block">
          <h1 className="home-title">Beranda</h1>
          <p className="home-subtitle">Mulai bantuanmu, lanjutkan kegiatanmu.</p>
        </header>

        {/* 2. Kartu Aksi Dua Pintu: Apa yang ingin kamu lakukan? */}
        <QuickPostBox />

        {/* 3. Bagian: Perlu ditindaklanjuti */}
        <section className="home-section-card" aria-label="Aktivitas Perlu Ditindaklanjuti">
          <div className="home-section-header">
            <h2 className="home-section-heading">Perlu ditindaklanjuti</h2>
            <Link href="/aktivitas" className="home-section-link">
              Lihat aktivitas &rarr;
            </Link>
          </div>

          <div className="home-section-body">
            {session ? (
              userActivities.length > 0 ? (
                <div className="actionable-items-list">
                  {userActivities.map((act) => (
                    <div key={act.id} className="actionable-item-row">
                      <div className="actionable-icon-box icon-doc" aria-hidden="true">
                        {act.status === "berlangsung" ? "📄" : "✅"}
                      </div>
                      <div className="actionable-text-cluster">
                        <strong className="actionable-title">{act.title || "Kesepakatan bantuan"}</strong>
                        <span className="actionable-subtitle">
                          {act.note || (act.status === "berlangsung" ? "Menunggu tanggapanmu" : "Konfirmasi kegiatan selesai")}
                        </span>
                      </div>
                      <Link
                        href={`/aktivitas?id=${act.id}`}
                        className="button button-outline button-sm actionable-btn"
                      >
                        {act.status === "berlangsung" ? "Lihat kesepakatan" : "Buka kegiatan"}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="home-empty-notice">
                  <span className="notice-icon" aria-hidden="true">📋</span>
                  <div className="notice-content">
                    <p className="notice-text">Tidak ada kegiatan yang perlu ditindaklanjuti saat ini.</p>
                    <Link href="/aktivitas" className="notice-link">Buka riwayat aktivitas &rarr;</Link>
                  </div>
                </div>
              )
            ) : (
              <div className="home-guest-callout">
                <div className="guest-icon-box" aria-hidden="true">🔒</div>
                <div className="guest-text-box">
                  <strong className="guest-title">Masuk untuk melihat tindak lanjut kegiatanmu</strong>
                  <p className="guest-desc">Pantau status kesepakatan, obrolan bantuan, dan konfirmasi selesai.</p>
                </div>
                <Link href="/login" className="button button-primary button-sm">
                  Masuk Akun
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 4. Bagian: Posting aktifmu */}
        <section className="home-section-card" aria-label="Ringkasan Posting Aktif">
          <div className="home-section-header">
            <h2 className="home-section-heading">Posting aktifmu</h2>
            <Link href={session ? "/aktivitas" : "/login"} className="home-section-link">
              Kelola posting &rarr;
            </Link>
          </div>

          <div className="home-section-body">
            {session ? (
              userActivePosts.length > 0 ? (
                <div className="user-active-posts-list">
                  {userActivePosts.map((post) => {
                    const isNeed = post.nature === "butuh";
                    return (
                      <div key={post.id} className="active-post-row">
                        <div className={`active-post-icon-box ${isNeed ? "icon-box-need" : "icon-box-offer"}`} aria-hidden="true">
                          {isNeed ? "📦" : "📷"}
                        </div>
                        <div className="active-post-text-cluster">
                          <Link href={`/detail-postingan?id=${post.id}`} className="active-post-title-link">
                            <strong className="active-post-title">{post.title}</strong>
                          </Link>
                          <span className="active-post-meta">
                            {post.address || "Area Yogyakarta"} • {post.scheduleLabel || "Jadwal fleksibel"}
                          </span>
                        </div>
                        <div className="active-post-badges-cluster">
                          <span className={`post-nature-pill ${isNeed ? "pill-butuh" : "pill-bisa"}`}>
                            {isNeed ? "Saya Butuh" : "Saya Bisa"}
                          </span>
                          <span className="post-status-pill-green">
                            Aktif
                          </span>
                          <Link href={`/detail-postingan?id=${post.id}`} className="post-more-btn" title="Lihat detail">
                            •••
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="home-empty-notice">
                  <span className="notice-icon" aria-hidden="true">📝</span>
                  <div className="notice-content">
                    <p className="notice-text">Kamu belum memiliki postingan aktif.</p>
                    <Link href="/buat-postingan" className="notice-link">Buat postingan pertamamu &rarr;</Link>
                  </div>
                </div>
              )
            ) : (
              <div className="home-guest-callout">
                <div className="guest-icon-box" aria-hidden="true">📢</div>
                <div className="guest-text-box">
                  <strong className="guest-title">Masuk untuk mengelola postingan bantuanmu</strong>
                  <p className="guest-desc">Buat kebutuhan bantuan baru atau tawarkan kemampuanmu kepada warga.</p>
                </div>
                <Link href="/login" className="button button-outline button-sm">
                  Masuk Akun
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 5. Bagian: Terbaru di NeedHelp (Cuplikan 2-3 posting dengan link Lihat semua) */}
        <section className="home-section-card" aria-label="Postingan Komunitas Terbaru">
          <div className="home-section-header">
            <h2 className="home-section-heading">Terbaru di NeedHelp</h2>
            <Link href="/katalog" className="home-section-link">
              Lihat semua &rarr;
            </Link>
          </div>

          <div className="home-section-body">
            {loadingPosts ? (
              <div className="home-cards-skeleton-grid">
                <div className="skeleton-compact-card" />
                <div className="skeleton-compact-card" />
              </div>
            ) : (
              <div className="home-latest-cards-grid">
                {latestPosts.map((post) => {
                  const isNeed = post.nature === "butuh";
                  const authorName = post.profiles?.full_name || post.authorName || "Warga Jogja";
                  const authorInitial = authorName.charAt(0).toUpperCase();
                  const regionLabel = REGION_LABELS[post.region] || post.region || "Kota Yogyakarta";
                  const categoryLabel = CATEGORY_LABELS[post.category] || post.category;
                  const relativeTime = formatRelativeTime(post.created_at || post.date);
                  const amount = post.amount;
                  const compNote = post.compensation_note || post.compensationNote || "";
                  let compFormatted = "Sukarela";
                  if (post.compensation_type === "tarif" && amount) {
                    compFormatted = `${formatRupiah(amount)}${compNote ? `/${compNote.replace(/per\s*/i, "")}` : ""}`;
                  } else if (compNote) {
                    compFormatted = compNote;
                  }

                  return (
                    <article key={post.id} className="home-compact-post-card">
                      <header className="compact-card-header">
                        <div className="compact-author-group">
                          <div className={`compact-avatar-circle ${isNeed ? "avatar-need" : "avatar-offer"}`} aria-hidden="true">
                            {authorInitial}
                          </div>
                          <div className="compact-author-meta">
                            <span className="compact-author-name">{authorName}</span>
                            <span className="compact-location-time">{regionLabel} • {relativeTime}</span>
                          </div>
                        </div>
                        <span className={`compact-category-pill ${getCategoryColorClass(post.category)}`}>
                          {categoryLabel}
                        </span>
                      </header>

                      <h3 className="compact-card-title">
                        <Link href={`/detail-postingan?id=${post.id}`} className="compact-title-link">
                          {post.title}
                        </Link>
                      </h3>

                      <p className="compact-card-summary">
                        {post.summary || post.description?.slice(0, 110) || "Belajar bareng sambil menyelesaikan tugas masing-masing."}
                      </p>

                      <footer className="compact-card-footer">
                        <div className="compact-footer-meta">
                          <span className="compact-meta-chip">
                            📍 {post.address || regionLabel}
                          </span>
                          <span className="compact-meta-chip font-medium">
                            🏷️ {compFormatted}
                          </span>
                        </div>
                        <Link href={`/detail-postingan?id=${post.id}`} className="button button-outline button-xs compact-detail-btn">
                          Lihat detail
                        </Link>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </ThreeColumnLayout>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
