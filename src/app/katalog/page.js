"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPublicPosts, filterPosts, REGION_LABELS, CATEGORY_LABELS } from "../../lib/data.js";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { QuickPostBox } from "../../components/QuickPostBox";
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
  const initialSort = searchParams.get("sort") || "terbaru";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialCategories = searchParams.getAll("category");

  const [query, setQuery] = useState(initialQ);
  const [postType, setPostType] = useState(initialType);
  const [categories, setCategories] = useState(initialCategories);
  const [region, setRegion] = useState(initialRegion);
  const [compensation, setCompensation] = useState(initialCompensation);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Mengambil data dari API / database
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchPublicPosts()
      .then((data) => {
        if (!isCancelled) {
          setAllPosts(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || "Gagal memuat postingan.");
          setLoading(false);
        }
      });

    return () => { isCancelled = true; };
  }, []);

  // 3. Sinkronisasi state ketika URL searchParams berubah
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setPostType(searchParams.get("type") || "all");
    setCategories(searchParams.getAll("category"));
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
    const regVal = overrides.region !== undefined ? overrides.region : region;
    const compVal = overrides.compensation !== undefined ? overrides.compensation : compensation;
    const sortVal = overrides.sort !== undefined ? overrides.sort : sort;
    const pageVal = overrides.page !== undefined ? overrides.page : page;
    const catVals = overrides.categories !== undefined ? overrides.categories : categories;

    if (qVal) params.set("q", qVal);
    if (typeVal && typeVal !== "all") params.set("type", typeVal);
    if (regVal) params.set("region", regVal);
    if (compVal) params.set("compensation", compVal);
    if (sortVal && sortVal !== "terbaru") params.set("sort", sortVal);
    if (pageVal > 1) params.set("page", String(pageVal));
    catVals.forEach((c) => params.append("category", c));

    const qs = params.toString();
    router.replace(`/katalog${qs ? `?${qs}` : ""}`);
  };

  const handleTypeSelect = (type) => {
    setPostType(type);
    setPage(1);
    updateURL({ postType: type, page: 1 });
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    setPage(1);
    updateURL({ region: newRegion, page: 1 });
  };

  const handleCategoryToggle = (cat) => {
    const next = categories.includes(cat)
      ? categories.filter((c) => c !== cat)
      : [...categories, cat];
    setCategories(next);
    setPage(1);
    updateURL({ categories: next, page: 1 });
  };

  const handleCompensationChange = (newComp) => {
    setCompensation(newComp);
    setPage(1);
    updateURL({ compensation: newComp, page: 1 });
  };

  const handleReset = () => {
    setQuery("");
    setPostType("all");
    setCategories([]);
    setRegion("");
    setCompensation("");
    setSort("terbaru");
    setPage(1);
    router.replace("/katalog");
  };

  // 5. Filter & Sorting
  const filteredAndSortedPosts = useMemo(() => {
    if (loading || error) return [];

    const filtered = filterPosts(allPosts, {
      query,
      type: postType,
      categories,
      location: region,
      compensation,
    });

    const sorted = [...filtered];
    if (sort === "jadwal") {
      sorted.sort((a, b) =>
        `${a.date || a.planned_date || "9999-12-31"}T${a.time || a.start_time || "23:59"}`.localeCompare(
          `${b.date || b.planned_date || "9999-12-31"}T${b.time || b.start_time || "23:59"}`
        )
      );
    } else {
      sorted.sort((a, b) =>
        (b.created_at || b.createdAt || "").localeCompare(a.created_at || a.createdAt || "")
      );
    }

    return sorted;
  }, [loading, error, allPosts, query, postType, categories, region, compensation, sort]);

  // Pagination (6 postingan per halaman)
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filteredAndSortedPosts.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const startIndex = (activePage - 1) * pageSize;
  const visiblePosts = filteredAndSortedPosts.slice(startIndex, startIndex + pageSize);

  const hasActiveFilters = Boolean(
    query || postType !== "all" || region || compensation || categories.length > 0
  );

  return (
    <ThreeColumnLayout>
      {/* 1. Quick Post Box di puncak feed */}
      <QuickPostBox />

      {/* 2. Filter & Navigation Header */}
      <section className="catalog-control-panel-card" aria-label="Panel Kontrol Feed">
        <div className="panel-top-row">
          <div className="feed-filter-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={postType === "all"}
              className={`filter-tab-btn ${postType === "all" ? "active" : ""}`}
              onClick={() => handleTypeSelect("all")}
            >
              Semua
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={postType === "butuh"}
              className={`filter-tab-btn tab-butuh ${postType === "butuh" ? "active" : ""}`}
              onClick={() => handleTypeSelect("butuh")}
            >
              🆘 Saya Butuh
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={postType === "bisa"}
              className={`filter-tab-btn tab-bisa ${postType === "bisa" ? "active" : ""}`}
              onClick={() => handleTypeSelect("bisa")}
            >
              ✨ Saya Bisa
            </button>
          </div>

          <div className="sort-box">
            <label htmlFor="catalog-sort" className="sort-label">Urutan:</label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
                updateURL({ sort: e.target.value, page: 1 });
              }}
              className="sort-select"
            >
              <option value="terbaru">Terbaru Diunggah</option>
              <option value="jadwal">Jadwal Terdekat</option>
            </select>
          </div>
        </div>

        {/* Baris Filter Dropdown & Kategori */}
        <div className="panel-filter-row">
          <div className="filter-dropdown-group">
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              aria-label="Pilih Wilayah DIY"
              className="filter-select"
            >
              <option value="">📍 Semua 5 Wilayah DIY</option>
              <option value="sleman">Sleman</option>
              <option value="kota">Kota Yogyakarta</option>
              <option value="bantul">Bantul</option>
              <option value="kulonprogo">Kulon Progo</option>
              <option value="gunungkidul">Gunungkidul</option>
            </select>

            <select
              value={compensation}
              onChange={(e) => handleCompensationChange(e.target.value)}
              aria-label="Pilih Jenis Imbalan"
              className="filter-select"
            >
              <option value="">💰 Semua Jenis Imbalan</option>
              <option value="tarif">Tarif Pasti</option>
              <option value="nego">Nego di Chat</option>
              <option value="patungan">Patungan Biaya</option>
              <option value="bayarsendiri">Bayar Sendiri-sendiri</option>
              <option value="traktir">Traktir Makan/Minum</option>
              <option value="sukarela">Sukarela (Tanpa Imbalan)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="btn-reset-filters"
            >
              ✕ Reset Filter
            </button>
          )}
        </div>

        {/* Kategori Utama (4 Kategori Sah Sesuai Spesifikasi) */}
        <div className="panel-categories-row" role="group" aria-label="Filter 4 Kategori Aktivitas">
          <span className="panel-categories-label" id="cat-filter-label">Kategori Utama:</span>
          <div className="panel-categories-chips">
            {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
              const isSelected = categories.includes(catKey);
              return (
                <button
                  key={catKey}
                  type="button"
                  className={`cat-chip-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => handleCategoryToggle(catKey)}
                  aria-pressed={isSelected}
                  aria-describedby="cat-filter-label"
                >
                  {isSelected ? "✓ " : ""}{catLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Hasil Pencarian */}
        <div className="panel-results-summary">
          <div className="results-count-wrap">
            <span className="results-count-text">
              Ditemukan <strong>{filteredAndSortedPosts.length}</strong> postingan aktif
              {region ? ` di wilayah ${REGION_LABELS[region] || region}` : ""}
              {query ? ` untuk kata kunci "${query}"` : ""}
            </span>
          </div>

          {hasActiveFilters && (
            <div className="active-filter-chips">
              {postType !== "all" && (
                <span className="filter-badge-pill">
                  {postType === "butuh" ? "🆘 Butuh" : "✨ Bisa"}
                </span>
              )}
              {region && (
                <span className="filter-badge-pill">
                  📍 {REGION_LABELS[region] || region}
                </span>
              )}
              {compensation && (
                <span className="filter-badge-pill">
                  💰 {compensation}
                </span>
              )}
              {categories.map((c) => (
                <span key={c} className="filter-badge-pill">
                  🏷️ {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Feed List */}
      <section className="feed-stream" aria-label="Daftar Postingan Bantuan">
        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <div className="feed-error-card">
            <p>Terjadi kesalahan saat memuat data: {error}</p>
            <button
              type="button"
              className="button button-sm button-primary"
              onClick={() => window.location.reload()}
            >
              Coba Lagi
            </button>
          </div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map((post) => (
            <CatalogCard key={post.id} post={post} backUrl="/katalog" />
          ))
        ) : (
          <EmptyState
            icon="📍"
            title={region ? `Belum ada postingan di ${REGION_LABELS[region] || region}` : "Tidak ada postingan yang sesuai"}
            description={
              region
                ? `Wilayah ${REGION_LABELS[region] || region} belum memiliki permohonan atau penawaran aktif. Jadilah yang pertama membuat postingan di sini!`
                : "Coba sesuaikan kata kunci atau bersihkan filter untuk melihat postingan lainnya."
            }
            actionText={region ? `+ Buat Postingan di ${REGION_LABELS[region] || region}` : "Reset Seluruh Filter"}
            onAction={region ? () => router.push(`/buat-postingan?region=${region}`) : handleReset}
          />
        )}
      </section>

      {/* 4. Pagination */}
      {pageCount > 1 && (
        <nav className="pagination-bar" aria-label="Navigasi Halaman Postingan">
          <button
            type="button"
            className="pagination-btn"
            disabled={activePage <= 1}
            onClick={() => {
              const prev = activePage - 1;
              setPage(prev);
              updateURL({ page: prev });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            &larr; Sebelumnya
          </button>
          <span className="pagination-info">
            Halaman {activePage} dari {pageCount}
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={activePage >= pageCount}
            onClick={() => {
              const next = activePage + 1;
              setPage(next);
              updateURL({ page: next });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Berikutnya &rarr;
          </button>
        </nav>
      )}
    </ThreeColumnLayout>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 16px" }}><SkeletonList count={4} /></div>}>
      <CatalogContent />
    </Suspense>
  );
}
