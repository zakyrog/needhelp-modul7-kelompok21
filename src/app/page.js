"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchPublicPosts } from "../lib/data.js";
import { ThreeColumnLayout } from "../components/ThreeColumnLayout";
import { QuickPostBox } from "../components/QuickPostBox";
import { CatalogCard } from "../components/CatalogCard";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [filterNature, setFilterNature] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPublicPosts()
      .then((data) => {
        if (isMounted) {
          setPosts(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Gagal memuat feed beranda.");
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  const filteredPosts = posts.filter((post) => {
    if (filterNature === "all") return true;
    return post.nature === filterNature;
  });

  return (
    <ThreeColumnLayout>
      {/* 1. Welcoming Community Hero Banner */}
      <section className="feed-hero-banner" aria-label="Sambutan Komunitas">
        <div className="hero-banner-inner">
          <div className="online-status-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Komunitas Saling Bantu Mahasiswa & Warga DIY</span>
          </div>
          <h1 className="hero-title">
            Butuh bantuan atau teman di Jogja hari ini?
          </h1>
          <p className="hero-subtitle">
            Cari partner pindahan kos, teman nongkrong, pendampingan belajar, atau tawarkan keahlianmu secara aman dan saling percaya.
          </p>
          <div className="hero-category-pills">
            <Link href="/katalog?category=bantuan" className="cat-pill">
              📦 Bantuan Fisik
            </Link>
            <Link href="/katalog?category=pendampingan" className="cat-pill">
              📚 Belajar & Les
            </Link>
            <Link href="/katalog?category=ditemani" className="cat-pill">
              ☕ Ditemani Ngopi
            </Link>
            <Link href="/katalog?category=explore" className="cat-pill">
              🛵 Explore Jogja
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Quick Post Creator Box */}
      <QuickPostBox />

      {/* 3. Filter Bar (Semua / Saya Butuh / Saya Bisa) */}
      <div className="feed-filter-tabs-bar" role="tablist" aria-label="Filter Jenis Feed">
        <button
          type="button"
          role="tab"
          aria-selected={filterNature === "all"}
          className={`filter-tab-btn ${filterNature === "all" ? "active" : ""}`}
          onClick={() => setFilterNature("all")}
        >
          🌐 Semua Postingan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterNature === "butuh"}
          className={`filter-tab-btn tab-butuh ${filterNature === "butuh" ? "active" : ""}`}
          onClick={() => setFilterNature("butuh")}
        >
          🆘 Saya Butuh ({posts.filter(p => p.nature === "butuh").length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterNature === "bisa"}
          className={`filter-tab-btn tab-bisa ${filterNature === "bisa" ? "active" : ""}`}
          onClick={() => setFilterNature("bisa")}
        >
          ✨ Saya Bisa ({posts.filter(p => p.nature === "bisa").length})
        </button>
      </div>

      {/* 4. Feed Stream */}
      <div className="feed-stream" aria-live="polite">
        {loading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <div className="feed-error-card">
            <p>Terjadi kendala saat memuat feed: {error}</p>
            <button
              type="button"
              className="button button-sm button-primary"
              onClick={() => window.location.reload()}
            >
              Muat Ulang
            </button>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.slice(0, 6).map((post) => (
            <CatalogCard key={post.id} post={post} backUrl="/" />
          ))
        ) : (
          <EmptyState
            icon="📋"
            title="Belum ada postingan aktif"
            description="Jadilah yang pertama membuat permohonan bantuan atau menawarkan keahlian di Jogja!"
            actionText="+ Buat Postingan Sekarang"
            onAction={() => window.location.href = "/buat-postingan"}
          />
        )}
      </div>

      {/* 5. Tautan ke Katalog Penuh */}
      {filteredPosts.length > 0 && (
        <div className="feed-more-footer text-center" style={{ margin: "16px 0 32px" }}>
          <Link href="/katalog" className="button button-outline" style={{ display: "inline-block", width: "100%", padding: "10px 16px" }}>
            Jelajahi Seluruh Postingan & Filter 5 Wilayah DIY &rarr;
          </Link>
        </div>
      )}
    </ThreeColumnLayout>
  );
}
