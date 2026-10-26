"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchPublicPosts,
  filterPosts,
  REGION_LABELS,
  CATEGORY_LABELS,
  COMPENSATION_LABELS,
} from "../../lib/data.js";
import { EXAMPLE_POSTS_FIXTURE } from "../../data/examplePostsFixture.js";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { CatalogCard } from "../../components/CatalogCard";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonList } from "../../components/Skeleton";

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Membaca parameter awal dari URL
  const initialQ = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";
  const initialRegion = searchParams.get("region") || searchParams.get("location") || "";
  const initialCompensation = searchParams.get("compensation") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialSort = searchParams.get("sort") || "terbaru";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [postType, setPostType] = useState(initialType);
  const [category, setCategory] = useState(initialCategory);
  const [region, setRegion] = useState(initialRegion);
  const [compensation, setCompensation] = useState(initialCompensation);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const [allPosts, setAllPosts] = useState(() => EXAMPLE_POSTS_FIXTURE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2. Mengambil data dari API / database
  useEffect(() => {
    let isCancelled = false;

    fetchPublicPosts()
      .then((data) => {
        if (!isCancelled) {
          if (!data || data.length === 0) {
            setAllPosts(EXAMPLE_POSTS_FIXTURE);
          } else {
            const existingIds = new Set(data.map((p) => p.id));
            const additions = EXAMPLE_POSTS_FIXTURE.filter((p) => !existingIds.has(p.id));
            setAllPosts([...data, ...additions]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("Gagal memuat postingan publik, menggunakan postingan komunitas Yogyakarta:", err);
          setAllPosts(EXAMPLE_POSTS_FIXTURE);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // 3. Sinkronisasi state ketika URL searchParams berubah
  useEffect(() => {
    const qFromUrl = searchParams.get("q") || "";
    setSearchInput(qFromUrl);
    setQuery(qFromUrl);
    setPostType(searchParams.get("type") || "all");
    setCategory(searchParams.get("category") || "");
    setRegion(searchParams.get("region") || searchParams.get("location") || "");
    setCompensation(searchParams.get("compensation") || "");
    setSort(searchParams.get("sort") || "terbaru");
    setPage(Math.max(1, Number(searchParams.get("page")) || 1));
  }, [searchParams]);

  // 4. Update query params di URL secara 2 arah
  const updateURL = (overrides = {}) => {
    const params = new URLSearchParams();
    const qVal = overrides.query !== undefined ? overrides.query : query;
    const typeVal = overrides.postType !== undefined ? overrides.postType : postType;
    const catVal = overrides.category !== undefined ? overrides.category : category;
    const regVal = overrides.region !== undefined ? overrides.region : region;
    const compVal = overrides.compensation !== undefined ? overrides.compensation : compensation;
    const sortVal = overrides.sort !== undefined ? overrides.sort : sort;
    const pageVal = overrides.page !== undefined ? overrides.page : page;

    if (qVal) params.set("q", qVal);
    if (typeVal && typeVal !== "all") params.set("type", typeVal);
    if (catVal) params.set("category", catVal);
    if (regVal) params.set("region", regVal);
    if (compVal) params.set("compensation", compVal);
    if (sortVal && sortVal !== "terbaru") params.set("sort", sortVal);
    if (pageVal > 1) params.set("page", String(pageVal));

    const qs = params.toString();
    router.replace(`/katalog${qs ? `?${qs}` : ""}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setQuery(trimmed);
    setPage(1);
    updateURL({ query: trimmed, page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setQuery("");
    setPage(1);
    updateURL({ query: "", page: 1 });
  };

  const handleTypeSelect = (type) => {
    setPostType(type);
    setPage(1);
    updateURL({ postType: type, page: 1 });
  };

  const handleCategorySelect = (catId) => {
    const next = category === catId ? "" : catId;
    setCategory(next);
    setPage(1);
    updateURL({ category: next, page: 1 });
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    setPage(1);
    updateURL({ region: newRegion, page: 1 });
  };

  const handleCompensationChange = (newComp) => {
    setCompensation(newComp);
    setPage(1);
    updateURL({ compensation: newComp, page: 1 });
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
    updateURL({ sort: newSort, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setQuery("");
    setPostType("all");
    setCategory("");
    setRegion("");
    setCompensation("");
    setSort("terbaru");
    setPage(1);
    router.replace("/katalog");
  };

  // 5. Filter & Sorting
  const filteredAndSortedPosts = useMemo(() => {
    if (loading && allPosts.length === 0) return [];

    const categoriesArray = category ? [category] : [];
    const filtered = filterPosts(allPosts, {
      query,
      type: postType,
      categories: categoriesArray,
      location: region,
      compensation,
    });

    const sorted = [...filtered];
    if (sort === "jadwal" || sort === "deadline") {
      sorted.sort((a, b) =>
        `${a.date || a.planned_date || "9999-12-31"}T${a.time || a.start_time || "23:59"}`.localeCompare(
          `${b.date || b.planned_date || "9999-12-31"}T${b.time || b.start_time || "23:59"}`
        )
      );
    } else if (sort === "terlama") {
      sorted.sort((a, b) =>
        (a.created_at || a.createdAt || "").localeCompare(b.created_at || b.createdAt || "")
      );
    } else {
      // default: terbaru
      sorted.sort((a, b) =>
        (b.created_at || b.createdAt || "").localeCompare(a.created_at || a.createdAt || "")
      );
    }

    return sorted;
  }, [loading, error, allPosts, query, postType, category, region, compensation, sort]);

  const hasActiveFilters = Boolean(
    query || postType !== "all" || category || region || compensation || sort !== "terbaru"
  );

  const categoriesData = [
    {
      id: "bantuan",
      label: "Bantuan Fisik",
      icon: "📦",
      theme: "cat-theme-peach",
    },
    {
      id: "ditemani",
      label: "Ditemani",
      icon: "👥",
      theme: "cat-theme-lavender",
    },
    {
      id: "pendampingan",
      label: "Pendampingan",
      icon: "🎓",
      theme: "cat-theme-blue",
    },
    {
      id: "explore",
      label: "Explore",
      icon: "🧭",
      theme: "cat-theme-mint",
    },
  ];

  return (
    <ThreeColumnLayout>
      <div className="catalog-feed-page-wrapper">
        {/* 1. Header Bar: Judul Feed & Cari + Tombol Buat Posting */}
        <header className="catalog-top-header">
          <div className="catalog-header-text">
            <h1 className="catalog-page-title">Feed & Cari</h1>
            <p className="catalog-page-subtitle">Temukan bantuan yang sesuai kebutuhanmu.</p>
          </div>
          <Link href="/buat-postingan" className="button button-primary catalog-create-btn">
            <span className="create-btn-plus" aria-hidden="true">+</span> Buat posting
          </Link>
        </header>

        {/* 2. Satu Kolom Pencarian Utama */}
        <form className="catalog-primary-search-bar" onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="catalog-main-search-input" className="sr-only">
            Cari bantuan, keahlian, atau kegiatan
          </label>
          <div className="search-input-wrapper">
            <span className="search-icon-symbol" aria-hidden="true">🔍</span>
            <input
              id="catalog-main-search-input"
              type="search"
              className="primary-search-input"
              placeholder="Cari bantuan, keahlian, atau kegiatan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Cari bantuan, keahlian, atau kegiatan"
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                aria-label="Hapus kata kunci pencarian"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="button button-primary search-submit-action-btn">
            Cari
          </button>
        </form>

        {/* 3. Panel Filter: Tab Jenis Posting, 4 Kategori, Wilayah & Imbalan */}
        <section className="catalog-filter-controls-card" aria-label="Filter dan Kategori Bantuan">
          {/* Tab Jenis: Semua / Saya Butuh / Saya Bisa */}
          <div className="nature-segmented-tabs" role="tablist" aria-label="Pilih Jenis Posting">
            <button
              type="button"
              role="tab"
              aria-selected={postType === "all"}
              className={`segmented-tab-btn tab-all ${postType === "all" ? "active" : ""}`}
              onClick={() => handleTypeSelect("all")}
            >
              <span className="tab-icon" aria-hidden="true">🗂️</span>
              <span className="tab-text">Semua</span>
              {postType === "all" && <span className="tab-active-check" aria-hidden="true">✓</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={postType === "butuh"}
              className={`segmented-tab-btn tab-butuh ${postType === "butuh" ? "active" : ""}`}
              onClick={() => handleTypeSelect("butuh")}
            >
              <span className="tab-icon" aria-hidden="true">✋</span>
              <span className="tab-text">Saya Butuh</span>
              {postType === "butuh" && <span className="tab-active-check" aria-hidden="true">✓</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={postType === "bisa"}
              className={`segmented-tab-btn tab-bisa ${postType === "bisa" ? "active" : ""}`}
              onClick={() => handleTypeSelect("bisa")}
            >
              <span className="tab-icon" aria-hidden="true">🤝</span>
              <span className="tab-text">Saya Bisa</span>
              {postType === "bisa" && <span className="tab-active-check" aria-hidden="true">✓</span>}
            </button>
          </div>

          {/* Baris 4 Kategori Utama */}
          <div className="category-selection-section">
            <span className="category-section-label">Kategori</span>
            <div className="category-cards-grid" role="group" aria-label="4 Kategori Utama">
              {categoriesData.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-select-card ${cat.theme} ${isSelected ? "selected" : ""}`}
                    onClick={() => handleCategorySelect(cat.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="cat-icon-circle" aria-hidden="true">
                      {cat.icon}
                    </div>
                    <span className="cat-card-name">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baris Filter Wilayah & Imbalan (Sejajar dengan Ikon Pin dan Dompet) */}
          <div className="filter-dropdowns-row">
            {/* Filter Wilayah */}
            <div className="filter-select-box-wrap">
              <div className="filter-box-icon" aria-hidden="true">📍</div>
              <div className="filter-box-content">
                <label htmlFor="select-region" className="filter-box-label">Wilayah</label>
                <select
                  id="select-region"
                  className="filter-native-select"
                  value={region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  aria-label="Pilih Wilayah"
                >
                  <option value="">Semua wilayah</option>
                  <option value="sleman">Sleman</option>
                  <option value="kota">Kota Yogyakarta</option>
                  <option value="bantul">Bantul</option>
                  <option value="kulonprogo">Kulon Progo</option>
                  <option value="gunungkidul">Gunungkidul</option>
                </select>
              </div>
              <span className="filter-box-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Filter Imbalan (Ikon DOMPET) */}
            <div className="filter-select-box-wrap">
              <div className="filter-box-icon icon-wallet" aria-hidden="true">👛</div>
              <div className="filter-box-content">
                <label htmlFor="select-compensation" className="filter-box-label">Imbalan</label>
                <select
                  id="select-compensation"
                  className="filter-native-select"
                  value={compensation}
                  onChange={(e) => handleCompensationChange(e.target.value)}
                  aria-label="Pilih Bentuk Imbalan"
                >
                  <option value="">Semua imbalan</option>
                  <option value="tarif">Tarif Pasti</option>
                  <option value="sukarela">Sukarela</option>
                  <option value="nego">Nego di Chat</option>
                  <option value="bayarsendiri">Bayar Sendiri-sendiri</option>
                  <option value="patungan">Patungan</option>
                  <option value="traktir">Traktir</option>
                </select>
              </div>
              <span className="filter-box-chevron" aria-hidden="true">▾</span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="filter-reset-action-btn"
                onClick={handleResetFilters}
                aria-label="Reset seluruh filter"
              >
                ✕ Reset filter
              </button>
            )}
          </div>
        </section>

        {/* 4. Baris Jumlah Hasil & Pengurutan (Dipisahkan dari filter) */}
        <div className="catalog-results-header-bar">
          <span className="results-count-text">
            <strong>{filteredAndSortedPosts.length} posting</strong> ditemukan
          </span>

          <div className="sort-control-right">
            <label htmlFor="catalog-sort-select" className="sort-label-text">
              Urutkan:
            </label>
            <select
              id="catalog-sort-select"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="catalog-sort-dropdown"
              aria-label="Urutkan postingan"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="deadline">Tenggat Terdekat</option>
            </select>
          </div>
        </div>

        {/* 5. Daftar Postingan Feed */}
        {loading && allPosts.length === 0 ? (
          <SkeletonList count={3} />
        ) : error && allPosts.length === 0 ? (
          <EmptyState
            icon="⚠️"
            title="Terjadi kesalahan"
            description={error}
            actionText="Muat Ulang"
            onAction={() => window.location.reload()}
          />
        ) : filteredAndSortedPosts.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="Tidak ada postingan yang sesuai"
            description="Coba ubah kata kunci pencarian, ganti filter wilayah atau kategori yang kamu pilih."
            actionText="Reset Filter"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="feed-posts-container" role="feed" aria-label="Daftar Postingan">
            {filteredAndSortedPosts.map((post) => (
              <CatalogCard key={post.id} post={post} backUrl="/katalog" />
            ))}
          </div>
        )}
      </div>
    </ThreeColumnLayout>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <ThreeColumnLayout>
          <div className="catalog-feed-page-wrapper">
            <div className="catalog-top-header">
              <div className="catalog-title-group">
                <h1 className="catalog-page-title">Feed &amp; Cari</h1>
                <p className="catalog-page-subtitle">Temukan bantuan yang sesuai kebutuhanmu.</p>
              </div>
            </div>
            <SkeletonList count={3} />
          </div>
        </ThreeColumnLayout>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
