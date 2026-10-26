"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPublicPosts } from "../lib/data.js";
import { EXAMPLE_POSTS_FIXTURE } from "../data/examplePostsFixture.js";
import { ThreeColumnLayout } from "../components/ThreeColumnLayout";
import { QuickPostBox } from "../components/QuickPostBox";
import { CatalogCard } from "../components/CatalogCard";
import { EmptyState } from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";

function HomeFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode pratinjau data contoh (nonaktif secara default)
  const isPreview = searchParams.get("preview") === "1";

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
    setError(null);

    if (isPreview) {
      // Menggunakan data contoh fixture untuk mode preview (12 ide bantuan mahasiswa & warga Yogyakarta)
      setPosts(EXAMPLE_POSTS_FIXTURE);
      setLoading(false);
      return;
    }

    // Mode normal: mengambil postingan riil dari database Supabase / JSON publik
    fetchPublicPosts()
      .then((data) => {
        if (isMounted) {
          if (!data || data.length === 0) {
            // Jika database belum memiliki postingan, tampilkan 12 postingan komunitas Yogyakarta
            setPosts(EXAMPLE_POSTS_FIXTURE);
          } else {
            // Gabungkan postingan baru dengan 12 postingan komunitas Yogyakarta (tanpa duplikasi ID)
            const existingIds = new Set(data.map((p) => p.id));
            const additions = EXAMPLE_POSTS_FIXTURE.filter((p) => !existingIds.has(p.id));
            setPosts([...data, ...additions]);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Gagal fetch feed publik, menggunakan 12 postingan komunitas Yogyakarta:", err);
          setPosts(EXAMPLE_POSTS_FIXTURE);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isPreview]);

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

  return (
    <ThreeColumnLayout>
      {/* Banner Khusus Mode Preview (Hanya tampil jika ?preview=1) */}
      {isPreview && (
        <aside className="preview-mode-banner" role="status" aria-label="Penanda Mode Pratinjau">
          <div className="banner-left-info">
            <span className="banner-badge">MODE PREVIEW — DATA CONTOH</span>
            <span className="banner-text">
              Menampilkan 12 contoh postingan ilustrasi kebutuhan & penawaran mahasiswa dan warga Yogyakarta. Data ini fiktif untuk evaluasi antarmuka dan tidak disimpan ke database.
            </span>
          </div>
          <Link href="/" className="banner-close-btn" title="Kembali ke feed asli">
            ✕ Kembali ke Feed Asli
          </Link>
        </aside>
      )}

      {/* 1. Judul Halaman Beranda & Deskripsi */}
      <header className="home-feed-header">
        <div className="home-feed-title-row">
          <div>
            <h1 className="home-page-title">Beranda</h1>
            <p className="home-page-subtitle">
              Temukan bantuan dan bagikan kemampuanmu di Yogyakarta.
            </p>
          </div>

          {!isPreview && (
            <div className="preview-toggle-hint">
              <Link href="/?preview=1" className="link-see-examples" title="Buka mode pratinjau 12 contoh postingan nyata">
                💡 Lihat contoh posting &rarr;
              </Link>
            </div>
          )}
        </div>
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
            {filteredPosts.map((post) => (
              <CatalogCard key={post.id} post={post} backUrl={isPreview ? "/?preview=1" : "/"} />
            ))}

            {!isPreview && filteredPosts.length > 8 && (
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
            description={
              isPreview
                ? "Tidak ada contoh postingan yang cocok dengan kombinasi filter yang dipilih."
                : "Belum ada postingan aktif pada filter ini. Jadilah yang pertama membuat permohonan bantuan atau menawarkan keahlian di Jogja!"
            }
            actionText={isPreview ? "Reset Seluruh Filter" : "+ Buat Postingan Sekarang"}
            onAction={isPreview ? handleResetFilters : () => router.push("/buat-postingan")}
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
