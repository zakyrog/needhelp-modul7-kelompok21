
"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPublicPosts, filterPosts } from "../../lib/data.js";
import { CatalogCard } from "../../components/CatalogCard";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonList } from "../../components/Skeleton";

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

  // Mencegah pembacaan localStorage sebelum hydration selesai
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Menyinkronkan state ketika parameter URL berubah
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setPostType(searchParams.get("type") || "all");
    setCategories(searchParams.getAll("category"));
    setLocation(searchParams.get("location") || "");
    setCompensation(searchParams.get("compensation") || "");
    setSort(searchParams.get("sort") || "terbaru");
    setPage(Math.max(1, Number(searchParams.get("page")) || 1));
  }, [searchParams]);

  const handleCategoryToggle = (cat) => {
    setCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat]
    );
    setPage(1);
  };

  const handleTypeSelect = (type) => {
    setPostType(type);
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
    router.replace("/katalog");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  // Data baru dibaca setelah komponen selesai di-mount
  const filteredAndSortedPosts = useMemo(() => {
    if (!isMounted) return [];

    const allPublic = getPublicPosts();

    const filtered = filterPosts(allPublic, {
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
          `${b.date || "9999-12-31"}T${b.time || "23:59"}`
        )
      );
    } else {
      sorted.sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
      );
    }

    return sorted;
  }, [
    isMounted,
    query,
    postType,
    categories,
    location,
    compensation,
    sort,
  ]);

  // Pagination
  const pageSize = 4;

  const pageCount = Math.max(
    1,
    Math.ceil(filteredAndSortedPosts.length / pageSize)
  );

  const activePage = Math.min(page, pageCount);
  const startIndex = (activePage - 1) * pageSize;

  const visiblePosts = filteredAndSortedPosts.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <main>
      <header>
        <h1>Feed Bantuan</h1>
        <p>
          Temukan orang di sekitar yang sedang membutuhkan bantuan.
        </p>

        {/* Tab jenis postingan dan opsi pengurutan */}
        <div className="catalog-actions-bar">
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`tab-btn${postType === "butuh" ? " active" : ""}`}
              onClick={() =>
                handleTypeSelect(postType === "butuh" ? "all" : "butuh")
              }
              aria-current={postType === "butuh" ? "page" : undefined}
            >
              Saya Butuh
            </button>

            <button
              type="button"
              className={`tab-btn${postType === "bisa" ? " active" : ""}`}
              onClick={() =>
                handleTypeSelect(postType === "bisa" ? "all" : "bisa")
              }
              aria-current={postType === "bisa" ? "page" : undefined}
            >
              Saya Bisa
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--color-text-muted)",
            }}
          >
            <label htmlFor="catalog-sort">Urutkan:</label>

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
      </header>

      {/* Panel filter */}
      <aside aria-label="Penyaring Pencarian">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "15px" }}>Filter</h2>

          <button
            type="button"
            data-filter-reset
            onClick={handleReset}
            style={{
              fontSize: "12px",
              color: "var(--color-action-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Bersihkan
          </button>
        </div>

        <form onSubmit={handleSubmit} data-filter-form>
          {/* Pencarian */}
          <div>
            <label htmlFor="catalog-search">Cari bantuan</label>

            <input
              type="search"
              id="catalog-search"
              name="q"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari judul atau deskripsi..."
            />
          </div>

          {/* Jenis postingan */}
          <fieldset>
            <legend>Jenis Postingan</legend>

            <p>
              <input
                type="radio"
                id="type-all"
                name="post_type"
                value="all"
                checked={postType === "all"}
                onChange={() => handleTypeSelect("all")}
              />
              <label htmlFor="type-all">Semua</label>
            </p>

            <p>
              <input
                type="radio"
                id="type-butuh"
                name="post_type"
                value="butuh"
                checked={postType === "butuh"}
                onChange={() => handleTypeSelect("butuh")}
              />
              <label htmlFor="type-butuh">Saya Butuh</label>
            </p>

            <p>
              <input
                type="radio"
                id="type-bisa"
                name="post_type"
                value="bisa"
                checked={postType === "bisa"}
                onChange={() => handleTypeSelect("bisa")}
              />
              <label htmlFor="type-bisa">Saya Bisa</label>
            </p>
          </fieldset>

          {/* Kategori */}
          <fieldset>
            <legend>Kategori</legend>

            <p>
              <input
                type="checkbox"
                id="cat-ditemani"
                name="category"
                value="ditemani"
                checked={categories.includes("ditemani")}
                onChange={() => handleCategoryToggle("ditemani")}
              />
              <label htmlFor="cat-ditemani">Ditemani</label>
            </p>

            <p>
              <input
                type="checkbox"
                id="cat-bantuan"
                name="category"
                value="bantuan"
                checked={categories.includes("bantuan")}
                onChange={() => handleCategoryToggle("bantuan")}
              />
              <label htmlFor="cat-bantuan">Bantuan Fisik</label>
            </p>

            <p>
              <input
                type="checkbox"
                id="cat-pendampingan"
                name="category"
                value="pendampingan"
                checked={categories.includes("pendampingan")}
                onChange={() => handleCategoryToggle("pendampingan")}
              />
              <label htmlFor="cat-pendampingan">Pendampingan</label>
            </p>

            <p>
              <input
                type="checkbox"
                id="cat-explore"
                name="category"
                value="explore"
                checked={categories.includes("explore")}
                onChange={() => handleCategoryToggle("explore")}
              />
              <label htmlFor="cat-explore">Explore</label>
            </p>
          </fieldset>

          {/* Lokasi */}
          <div>
            <label htmlFor="catalog-location">Lokasi</label>

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
              <option value="sleman">Sleman</option>
              <option value="kota">Kota Yogyakarta</option>
              <option value="bantul">Bantul</option>
              <option value="kulonprogo">Kulon Progo</option>
              <option value="gunungkidul">Gunungkidul</option>
            </select>
          </div>

          {/* Kompensasi */}
          <div>
            <label htmlFor="catalog-compensation">
              Sistem Kompensasi
            </label>

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
              <option value="tarif">Tarif Pasti</option>
              <option value="nego">Bisa Negosiasi</option>
              <option value="patungan">Patungan</option>
              <option value="traktir">Traktir</option>
              <option value="sukarela">Sukarela</option>
            </select>
          </div>
        </form>
      </aside>

      {/* Daftar postingan */}
      <section>
        <h2>Daftar Permintaan &amp; Penawaran Aktif</h2>

        <p data-catalog-count aria-live="polite">
          {!isMounted
            ? "Memuat postingan..."
            : `${filteredAndSortedPosts.length} postingan ditemukan`}
        </p>

        <div data-catalog-list>
          {!isMounted ? (
            <SkeletonList count={3} />
          ) : visiblePosts.length > 0 ? (
            visiblePosts.map((post) => (
              <CatalogCard
                key={post.id}
                post={post}
                backUrl="/katalog"
              />
            ))
          ) : (
            <EmptyState
              icon="🔍"
              title="Tidak ada postingan yang cocok"
              description="Coba ubah kata kunci pencarian atau bersihkan filter di samping."
              actionText="Bersihkan Filter"
              onAction={handleReset}
            />
          )}
        </div>

        {/* Navigasi halaman */}
        {isMounted && pageCount > 1 && (
          <nav
            data-catalog-pagination
            aria-label="Navigasi Halaman Katalog"
          >
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
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <main className="catalog-loading" aria-busy="true">
          <h1>Feed Bantuan</h1>
          <p className="sr-only">Memuat katalog...</p>
          <SkeletonList count={3} />
        </main>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
