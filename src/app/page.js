"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPublicPosts, REGION_LABELS, CATEGORY_LABELS } from "../lib/data.js";
import { ThreeColumnLayout } from "../components/ThreeColumnLayout";
import { QuickPostBox } from "../components/QuickPostBox";
import { CatalogCard } from "../components/CatalogCard";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";

function HomeFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Membaca initial filter dari URL jika ada
  const initialType = searchParams.get("type") || "all";
  const initialCategory = searchParams.get("category") || "";
  const initialRegion = searchParams.get("region") || searchParams.get("location") || "";
  const initialSort = searchParams.get("sort") || "terbaru";
  const initialQ = searchParams.get("q") || "";

  const [posts, setPosts] = useState([]);
  const [filterNature, setFilterNature] = useState(initialType);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
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

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter logika lengkap
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Filter Nature (Semua / Butuh / Bisa)
    if (filterNature !== "all") {
      result = result.filter((post) => post.nature === filterNature);
    }

    // Filter Kategori
    if (selectedCategory) {
      result = result.filter((post) => post.category === selectedCategory);
    }

    // Filter Wilayah
    if (selectedRegion) {
      result = result.filter((post) => (post.region || "").toLowerCase() === selectedRegion.toLowerCase());
    }

    // Filter Search Query jika ada
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((post) => {
        const titleMatch = (post.title || "").toLowerCase().includes(q);
        const descMatch = (post.description || post.summary || "").toLowerCase().includes(q);
        const locMatch = (post.address_general || post.address || "").toLowerCase().includes(q);
        return titleMatch || descMatch || locMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (selectedSort === "terlama") {
        return new Date(a.created_at || a.date || 0) - new Date(b.created_at || b.date || 0);
      }
      if (selectedSort === "deadline") {
        return new Date(a.planned_date || a.date || "2099-01-01") - new Date(b.planned_date || b.date || "2099-01-01");
      }
      // default: terbaru
      return new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0);
    });

    return result;
  }, [posts, filterNature, selectedCategory, selectedRegion, searchQuery, selectedSort]);

  // Cek apakah ada filter aktif selain default
  const hasActiveFilters =
    filterNature !== "all" ||
    Boolean(selectedCategory) ||
    Boolean(selectedRegion) ||
    Boolean(searchQuery.trim()) ||
    selectedSort !== "terbaru";

  const handleResetFilters = () => {
    setFilterNature("all");
    setSelectedCategory("");
    setSelectedRegion("");
    setSelectedSort("terbaru");
    setSearchQuery("");
  };

  const categoriesList = [
    { id: "bantuan", label: "Bantuan Fisik", icon: "📦" },
    { id: "ditemani", label: "Ditemani", icon: "👥" },
    { id: "pendampingan", label: "Pendampingan", icon: "📋" },
    { id: "explore", label: "Explore", icon: "🧭" },
  ];

  const countButuh = posts.filter((p) => p.nature === "butuh").length;
  const countBisa = posts.filter((p) => p.nature === "bisa").length;

  return (
    <ThreeColumnLayout>
      {/* 1. Judul Halaman Beranda & Deskripsi */}
      <header className="home-feed-header">
        <h1 className="home-page-title">Beranda</h1>
        <p className="home-page-subtitle">
          Temukan bantuan dan bagikan kemampuanmu di Yogyakarta.
        </p>
      </header>

      {/* 2. Kartu Pilihan Buat Post: Apa yang ingin kamu lakukan? */}
      <QuickPostBox />

      {/* 3. Filter Kontrol Baris 1: Tab Sifat + Pengurutan & Tombol Filter */}
      <section className="feed-controls-section" aria-label="Kontrol Filter Feed">
        <div className="filter-controls-row-top">
          {/* Tab Sifat: Semua, Saya Butuh, Saya Bisa */}
          <div className="nature-pill-tabs" role="tablist" aria-label="Filter Jenis Bantuan">
            <button
              type="button"
              role="tab"
              aria-selected={filterNature === "all"}
              className={`nature-tab-btn ${filterNature === "all" ? "active" : ""}`}
              onClick={() => setFilterNature("all")}
            >
              Semua
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterNature === "butuh"}
              className={`nature-tab-btn ${filterNature === "butuh" ? "active active-butuh" : ""}`}
              onClick={() => setFilterNature("butuh")}
            >
              Saya Butuh
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterNature === "bisa"}
              className={`nature-tab-btn ${filterNature === "bisa" ? "active active-bisa" : ""}`}
              onClick={() => setFilterNature("bisa")}
            >
              Saya Bisa
            </button>
          </div>

          {/* Pengurutan & Tombol Filter di Kanan */}
          <div className="filter-actions-right">
            <div className="sort-select-wrap">
              <select
                className="select-sort-pill"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                aria-label="Urutkan postingan berdasarkan"
              >
                <option value="terbaru">Terbaru</option>
                <option value="terlama">Terlama</option>
                <option value="deadline">Tenggat Terdekat</option>
              </select>
            </div>

            <button
              type="button"
              className={`btn-filter-toggle ${showFilterDrawer || hasActiveFilters ? "active" : ""}`}
              onClick={() => setShowFilterDrawer((prev) => !prev)}
              aria-expanded={showFilterDrawer}
              aria-label="Buka filter lanjutan"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filter</span>
              {hasActiveFilters && <span className="active-filter-indicator-dot" />}
            </button>
          </div>
        </div>

        {/* Filter Kontrol Baris 2: 4 Kategori Utama + Dropdown Wilayah */}
        <div className="filter-controls-row-bottom">
          <div className="category-chips-group" role="group" aria-label="4 Kategori Utama">
            {categoriesList.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-chip-btn ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCategory(isActive ? "" : cat.id)}
                  aria-pressed={isActive}
                >
                  <span className="cat-chip-icon" aria-hidden="true">{cat.icon}</span>
                  <span className="cat-chip-text">{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="region-dropdown-wrap">
            <select
              className="select-region-pill"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              aria-label="Pilih wilayah Yogyakarta"
            >
              <option value="">📍 Semua wilayah</option>
              <option value="sleman">📍 Sleman</option>
              <option value="kota">📍 Kota Jogja</option>
              <option value="bantul">📍 Bantul</option>
              <option value="kulonprogo">📍 Kulon Progo</option>
              <option value="gunungkidul">📍 Gunungkidul</option>
            </select>
          </div>
        </div>

        {/* Panel Filter Lanjutan (Jika Ditekan atau Ada Filter Aktif) */}
        {showFilterDrawer && (
          <div className="advanced-filter-drawer" aria-label="Filter Tambahan">
            <div className="drawer-inner-grid">
              <div className="drawer-field">
                <label htmlFor="feed-search-input" className="drawer-label">Kata Kunci:</label>
                <input
                  id="feed-search-input"
                  type="search"
                  className="drawer-input"
                  placeholder="Cari judul atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <div className="drawer-reset-wrap">
                  <button
                    type="button"
                    className="drawer-reset-btn"
                    onClick={handleResetFilters}
                  >
                    ✕ Reset Seluruh Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. Feed Stream */}
      <div className="home-feed-stream" aria-live="polite">
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
          <>
            {filteredPosts.slice(0, 8).map((post) => (
              <CatalogCard key={post.id} post={post} backUrl="/" />
            ))}

            {filteredPosts.length > 8 && (
              <div className="feed-more-footer text-center" style={{ margin: "20px 0 32px" }}>
                <Link
                  href="/katalog"
                  className="button button-outline"
                  style={{ display: "inline-block", width: "100%", padding: "12px 18px", borderRadius: "10px" }}
                >
                  Jelajahi Seluruh {filteredPosts.length} Postingan di Feed & Cari &rarr;
                </Link>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="🔍"
            title="Tidak ada postingan yang sesuai"
            description="Coba ubah filter atau bersihkan kata kunci pencarian untuk melihat postingan lainnya."
            actionText="Reset Seluruh Filter"
            onAction={handleResetFilters}
          />
        )}
      </div>
    </ThreeColumnLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "1240px", margin: "40px auto", padding: "0 20px" }}><SkeletonList count={3} /></div>}>
      <HomeFeedContent />
    </Suspense>
  );
}
