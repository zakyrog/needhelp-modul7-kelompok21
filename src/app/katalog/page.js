"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchPublicPosts,
  filterPosts,
  CATEGORY_LABELS,
  REGION_LABELS,
  COMPENSATION_LABELS,
} from "../../lib/data.js";
import { CatalogCard } from "../../components/CatalogCard";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonList } from "../../components/Skeleton";
import { SvgIcon } from "../../components/Icons.jsx";

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
const REGION_KEYS = Object.keys(REGION_LABELS);
const COMPENSATION_KEYS = Object.keys(COMPENSATION_LABELS);
const TYPE_LABELS = { butuh: "Saya Butuh", bisa: "Saya Bisa" };

// Filter yang aktif saat ini, digunakan untuk chip "hapus filter" dan empty state.
function buildActiveFilters({ query, postType, categories, location, compensation }) {
  const filters = [];
  if (query.trim()) {
    filters.push({ key: "query", type: "text", label: `"${query.trim()}"`, clear: "query" });
  }
  if (postType !== "all") {
    filters.push({ key: "type", type: "type", label: TYPE_LABELS[postType] || postType, clear: "type" });
  }
  categories.forEach((c) => {
    filters.push({ key: `cat-${c}`, type: "category", label: CATEGORY_LABELS[c] || c, clear: c });
  });
  if (location) {
    filters.push({ key: "location", type: "location", label: REGION_LABELS[location] || location, clear: "location" });
  }
  if (compensation) {
    filters.push({ key: "compensation", type: "compensation", label: COMPENSATION_LABELS[compensation] || compensation, clear: "compensation" });
  }
  return filters;
}

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Membaca parameter awal dari URL
  const initialQ = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";
  const initialLocation = searchParams.get("location") || "";
  const initialCompensation = searchParams.get("compensation") || "";
  const initialSort = searchParams.get("sort") || "terbaru";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialCategories = searchParams.getAll("category");

  const [query, setQuery] = useState(initialQ);
  const [postType, setPostType] = useState(initialType);
  const [categories, setCategories] = useState(initialCategories);
  const [location, setLocation] = useState(initialLocation);
  const [compensation, setCompensation] = useState(initialCompensation);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  // Panel filter mobile (bottom sheet / drawer)
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Status pemuatan data dinamis
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Mengambil data secara dinamis dari sumber JSON / API dan localStorage
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchPublicPosts()
      .then((data) => {
        if (!isCancelled) {
          setAllPosts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(
            err.message ||
              "Gagal memuat data dari sumber JSON/API. Silakan periksa koneksi atau coba lagi.",
          );
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [retryTrigger, searchParams]);

  // Sinkronisasi state ketika URL query params berubah
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setPostType(searchParams.get("type") || "all");
    setCategories(searchParams.getAll("category"));
    setLocation(searchParams.get("location") || "");
    setCompensation(searchParams.get("compensation") || "");
    setSort(searchParams.get("sort") || "terbaru");
    setPage(Math.max(1, Number(searchParams.get("page")) || 1));
  }, [searchParams]);

  // Handler retry jika terjadi error saat memuat data
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.__SIMULATE_FETCH_ERROR__ = false;
      const url = new URL(window.location.href);
      if (url.searchParams.has("simulate_error") || url.searchParams.has("error")) {
        url.searchParams.delete("simulate_error");
        url.searchParams.delete("error");
        router.replace(url.pathname + (url.search ? url.search : ""));
      }
    }
    setRetryTrigger((prev) => prev + 1);
  };

  const handleCategoryToggle = (cat) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setPage(1);
  };

  const handleTypeSelect = (type) => {
    setPostType(type);
    setPage(1);
  };

  // Menghapus satu filter aktif
  const removeFilter = (clearKey) => {
    if (clearKey === "query") setQuery("");
    else if (clearKey === "type") setPostType("all");
    else if (clearKey === "location") setLocation("");
    else if (clearKey === "compensation") setCompensation("");
    else setCategories((prev) => prev.filter((c) => c !== clearKey));
    setPage(1);
  };

  // Mengembalikan semua filter ke kondisi awal
  const handleReset = () => {
    setQuery("");
    setPostType("all");
    setCategories([]);
    setLocation("");
    setCompensation("");
    setSort("terbaru");
    setPage(1);
    setFiltersOpen(false);
    router.replace("/katalog");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltersOpen(false);
  };

  // Filter dan pengurutan postingan
  const filteredAndSortedPosts = useMemo(() => {
    if (loading || error) return [];

    const filtered = filterPosts(allPosts, {
      query,
      type: postType,
      categories,
      location,
      compensation,
    });

    const sorted = [...filtered];

    if (sort === "jadwal") {
      sorted.sort((a, b) =>
        `${a.date || "9999-12-31"}T${a.time || "23:59"}`.localeCompare(
          `${b.date || "9999-12-31"}T${b.time || "23:59"}`,
        ),
      );
    } else {
      sorted.sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      );
    }

    return sorted;
  }, [
    loading,
    error,
    allPosts,
    query,
    postType,
    categories,
    location,
    compensation,
    sort,
  ]);

  const activeFilters = buildActiveFilters({
    query,
    postType,
    categories,
    location,
    compensation,
  });

  // Pagination
  const pageSize = 4;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredAndSortedPosts.length / pageSize),
  );

  // Mencegah halaman kosong jika filter mengubah jumlah total halaman
  const activePage = Math.min(page, pageCount);
  const startIndex = (activePage - 1) * pageSize;
  const visiblePosts = filteredAndSortedPosts.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <main>
      {/* ===== Header editorial ===== */}
      <header className="catalog-header">
        <p className="catalog-eyebrow">
          <span className="dot" aria-hidden="true" /> Jelajahi komunitas
        </p>
        <h1>Katalog Bantuan</h1>
        <p className="catalog-subtitle">
          Temukan orang di sekitar yang sedang membutuhkan bantuan atau menawarkan
          keahliannya — dan jadilah bagian dari kebaikan hari ini.
        </p>

        {/* Pencarian menonjol */}
        <form
          className="catalog-search"
          role="search"
          onSubmit={handleSubmit}
          aria-label="Pencarian bantuan"
        >
          <SvgIcon name="search" size={20} strokeWidth={2} className="catalog-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari judul, deskripsi, nama, atau keahlian..."
            aria-label="Cari bantuan"
          />
        </form>

        {/* Toggle jenis postingan + urutan */}
        <div className="catalog-actions-bar">
          <div className="catalog-tabs" role="group" aria-label="Jenis postingan">
            <button
              type="button"
              className={`tab-btn${postType === "butuh" ? " active" : ""}`}
              onClick={() => handleTypeSelect(postType === "butuh" ? "all" : "butuh")}
              aria-pressed={postType === "butuh"}
            >
              <SvgIcon name="hand" size={16} strokeWidth={2} /> Saya Butuh
            </button>
            <button
              type="button"
              className={`tab-btn tab-btn-bisa${postType === "bisa" ? " active" : ""}`}
              onClick={() => handleTypeSelect(postType === "bisa" ? "all" : "bisa")}
              aria-pressed={postType === "bisa"}
            >
              <SvgIcon name="wave" size={16} strokeWidth={2} /> Saya Bisa
            </button>
          </div>

          <div className="catalog-sort">
            <label htmlFor="catalog-sort">Urutkan</label>
            <select
              id="catalog-sort"
              data-catalog-sort
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="terbaru">Terbaru</option>
              <option value="jadwal">Jadwal terdekat</option>
            </select>
          </div>
        </div>

        {/* Filter aktif (chip) */}
        {activeFilters.length > 0 && (
          <div className="active-filters" aria-label="Filter aktif">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="filter-chip active"
                onClick={() => removeFilter(f.clear)}
                aria-label={`Hapus filter ${f.label}`}
              >
                {f.label}
                <SvgIcon name="cross" size={12} strokeWidth={2.5} />
              </button>
            ))}
            <button
              type="button"
              className="active-filters-clear"
              onClick={handleReset}
            >
              Bersihkan semua
            </button>
          </div>
        )}
      </header>

      {/* ===== Panel filter (sidebar desktop + drawer mobile) ===== */}
      <aside
        id="catalog-filter-panel"
        aria-label="Penyaring Pencarian"
        className="catalog-filter-panel"
        data-open={String(filtersOpen)}
      >
        <div className="catalog-filter-head">
          <h2>Filter</h2>
          <button
            type="button"
            className="catalog-filter-close"
            onClick={() => setFiltersOpen(false)}
            aria-label="Tutup filter"
          >
            <SvgIcon name="cross" size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} data-filter-form>
          {/* Kategori — chip yang bisa dipilih */}
          <fieldset className="filter-group">
            <legend>Kategori</legend>
            <div className="category-chip-grid">
              {CATEGORY_KEYS.map((key) => (
                <label
                  key={key}
                  className={`category-chip${categories.includes(key) ? " active" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="category"
                    value={key}
                    checked={categories.includes(key)}
                    onChange={() => handleCategoryToggle(key)}
                  />
                  <SvgIcon name="tag" size={14} strokeWidth={2} />
                  {CATEGORY_LABELS[key]}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Lokasi */}
          <div className="filter-group">
            <label htmlFor="catalog-location">Lokasi</label>
            <div className="filter-select-wrap">
              <SvgIcon name="pin" size={16} strokeWidth={2} />
              <select
                id="catalog-location"
                name="location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua lokasi</option>
                {REGION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {REGION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kompensasi */}
          <div className="filter-group">
            <label htmlFor="catalog-compensation">Sistem Kompensasi</label>
            <div className="filter-select-wrap">
              <SvgIcon name="wallet" size={16} strokeWidth={2} />
              <select
                id="catalog-compensation"
                name="compensation"
                value={compensation}
                onChange={(e) => {
                  setCompensation(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua kompensasi</option>
                {COMPENSATION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {COMPENSATION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="button button-primary filter-apply">
            Terapkan Filter
          </button>
          <button
            type="button"
            data-filter-reset
            onClick={handleReset}
            className="filter-reset-link"
          >
            Bersihkan semua filter
          </button>
        </form>
      </aside>

      {/* ===== Daftar postingan ===== */}
      <section className="catalog-results">
        <div className="catalog-results-bar">
          <h2 className="catalog-results-title">
            {postType === "butuh"
              ? "Orang yang butuh bantuan"
              : postType === "bisa"
                ? "Keahlian yang ditawarkan"
                : "Permintaan & penawaran terbaru"}
          </h2>
          <button
            type="button"
            className="catalog-filter-toggle"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel"
          >
            <SvgIcon name="filter" size={16} strokeWidth={2} />
            Filter
            {activeFilters.length > 0 && (
              <span className="catalog-filter-count">{activeFilters.length}</span>
            )}
          </button>
          <p data-catalog-count aria-live="polite">
            {loading
              ? "Memuat postingan..."
              : error
                ? "Gagal memuat data"
                : `${filteredAndSortedPosts.length} postingan ditemukan`}
          </p>
        </div>

        <div data-catalog-list>
          {loading ? (
            <SkeletonList count={4} />
          ) : error ? (
            <ErrorState
              title="Gagal Memuat Data Postingan"
              message={error}
              onRetry={handleRetry}
            />
          ) : visiblePosts.length > 0 ? (
            visiblePosts.map((post) => (
              <CatalogCard key={post.id} post={post} backUrl="/katalog" />
            ))
          ) : (
            <EmptyState
              icon="🔍"
              title="Tidak ada postingan yang cocok"
              description={
                activeFilters.length > 0
                  ? "Tidak ada hasil untuk kombinasi filter ini. Coba longgarkan kata kunci atau hapus beberapa filter."
                  : "Belum ada postingan aktif saat ini. Jadilah yang pertama membagikan kebutuhan atau tawaran bantuanmu."
              }
              actionText={activeFilters.length > 0 ? "Bersihkan Filter" : undefined}
              onAction={activeFilters.length > 0 ? handleReset : undefined}
            />
          )}
        </div>

        {/* Navigasi halaman */}
        {!loading && !error && pageCount > 1 && (
          <nav data-catalog-pagination aria-label="Navigasi Halaman Katalog">
            <ol>
              {Array.from({ length: pageCount }).map((_, index) => {
                const pageNumber = index + 1;
                const isCurrent = pageNumber === activePage;

                return (
                  <li key={pageNumber}>
                    {isCurrent ? (
                      <span aria-current="page">{pageNumber}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "inherit",
                          font: "inherit",
                          padding: 0,
                        }}
                      >
                        {pageNumber}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </section>

      {/* Overlay untuk drawer mobile */}
      {filtersOpen && (
        <button
          type="button"
          className="catalog-filter-scrim"
          aria-label="Tutup filter"
          onClick={() => setFiltersOpen(false)}
        />
      )}
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <main className="catalog-loading" aria-busy="true">
          <h1>Katalog Bantuan</h1>
          <p className="sr-only">Memuat katalog...</p>
          <SkeletonList count={4} />
        </main>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}