"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchPublicPosts, getPublicPosts, DEMO_POSTS, computeCategoryCounts } from "../lib/data.js";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { PostCard } from "../components/PostCard";

// Data seed statis untuk initial state yang konsisten antara server dan client
// Hanya digunakan di mode demo; mode Supabase mulai dari kosong agar tidak flash data lama
const supabaseActive = isSupabaseConfigured();
const INITIAL_SEED_POSTS = supabaseActive ? [] : DEMO_POSTS.slice(0, 3);

// Ikon per kategori resmi, memakai aset yang sudah ada di /assets/images
const CATEGORY_ICONS = {
  ditemani: "/assets/images/icon-les-privat.svg",
  bantuan: "/assets/images/icon-kebersihan.svg",
  pendampingan: "/assets/images/icon-teknis.svg",
  explore: "/assets/images/icon-kurir.svg",
};

export default function HomePage() {
  // Initial state: kosong di mode Supabase (akan diisi async), demo posts di mode demo
  const [posts, setPosts] = useState(INITIAL_SEED_POSTS);
  // Daftar lengkap post aktif untuk menghitung kategori populer (bukan hanya 3 kartu)
  const [allActivePosts, setAllActivePosts] = useState(
    supabaseActive ? null : () => getPublicPosts(),
  );
  const [loading, setLoading] = useState(supabaseActive);
  const [feedError, setFeedError] = useState(null);

  // Kategori populer dihitung dari post aktif aktual; sebelum data Supabase siap
  // hasilnya null agar angka 0 tidak sempat tampil sebagai "data".
  const popularCategories = useMemo(
    () => (allActivePosts === null ? null : computeCategoryCounts(allActivePosts)),
    [allActivePosts],
  );

  useEffect(() => {
    let isCancelled = false;

    if (supabaseActive) {
      setLoading(true);
      setFeedError(null);
    }

    fetchPublicPosts()
      .then((data) => {
        if (!isCancelled) {
          setPosts(data.slice(0, 3));
          setAllActivePosts(data);
          setFeedError(null);
          if (supabaseActive) setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (supabaseActive) {
            // Supabase terkonfigurasi tapi gagal: tampilkan error, jangan fallback ke demo.
            // Kategori populer tidak bisa dihitung karena status aktivitas tak pasti.
            setFeedError(err.message || "Gagal memuat postingan dari server.");
            setPosts([]);
            setAllActivePosts(null);
            setLoading(false);
          } else {
            // Mode demo: fallback ke data sync
            const fallbackPosts = getPublicPosts();
            setPosts(fallbackPosts.slice(0, 3));
            setAllActivePosts(fallbackPosts);
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-decorations">
          <div className="circle-large" />
          <div className="circle-small" />
        </div>

        <div className="hero-content">
          <h1>Butuh bantuan atau teman hari ini?</h1>
          <p>
            Temukan orang di sekitar yang bisa membantu, atau tawarkan bantuanmu
            kepada mereka yang membutuhkan.
          </p>
          <div className="hero-actions">
            <Link href="/buat-postingan" className="button button-primary">
              Buat Permintaan
            </Link>
            <Link href="/katalog" className="button button-outline">
              Tawarkan Bantuan
            </Link>
          </div>
        </div>
      </section>

      <section className="container category-section">
        <h2>Kategori populer</h2>
        <div className="category-grid">
          {popularCategories === null ? (
            <p className="empty-state" style={{ color: "var(--color-text-muted)" }}>
              Memuat kategori...
            </p>
          ) : popularCategories.length > 0 ? (
            popularCategories.map((category) => (
              <Link
                key={category.key}
                href={`/katalog?category=${encodeURIComponent(category.key)}`}
                className="category-card"
              >
                <div className="category-icon">
                  <img
                    src={CATEGORY_ICONS[category.key] || "/assets/images/icon-lainnya.svg"}
                    alt=""
                    width="20"
                    height="20"
                  />
                </div>
                <h3>{category.label}</h3>
                <p>{category.count} aktif</p>
              </Link>
            ))
          ) : (
            <p className="empty-state">Belum ada postingan aktif saat ini.</p>
          )}
        </div>
      </section>

      <section className="container request-section">
        <div className="section-header">
          <h2>Permintaan terbaru di sekitar kamu</h2>
          <Link href="/katalog" className="see-all">
            Lihat semua &rarr;
          </Link>
        </div>

        <div className="cards-grid">
          {feedError ? (
            <p className="empty-state" role="alert" style={{ color: "#b91c1c" }}>
              ⚠️ {feedError}
            </p>
          ) : loading ? (
            <p className="empty-state" style={{ color: "var(--color-text-muted)" }}>
              Memuat postingan terbaru...
            </p>
          ) : posts.length > 0 ? (
            posts.map((post, idx) => (
              <PostCard key={post.id} post={post} index={idx} />
            ))
          ) : (
            <p className="empty-state">Belum ada postingan aktif saat ini.</p>
          )}
        </div>
      </section>

      <section className="container table-section" hidden>
        <h2>Statistik Komunitas NeedHelp</h2>
        <table>
          <caption>
            Ringkasan Capaian dan Aktivitas Komunitas Kota Yogyakarta
          </caption>
          <thead>
            <tr>
              <th scope="col">Indikator</th>
              <th scope="col">Capaian Saat Ini</th>
              <th scope="col">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Permintaan Dibantu</th>
              <td>2.100+</td>
              <td>Kebutuhan terselesaikan</td>
            </tr>
            <tr>
              <th scope="row">Relawan Aktif</th>
              <td>850+</td>
              <td>Mahasiswa dan pekerja muda</td>
            </tr>
            <tr>
              <th scope="row">Rating Komunitas</th>
              <td>4.8 / 5.0</td>
              <td>Tingkat kepuasan interaksi</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
