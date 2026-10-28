"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchPublicPosts, getPublicPosts, DEMO_POSTS } from "../lib/data.js";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { PostCard } from "../components/PostCard";

// Data seed statis untuk initial state yang konsisten antara server dan client
// Hanya digunakan di mode demo; mode Supabase mulai dari kosong agar tidak flash data lama
const supabaseActive = isSupabaseConfigured();
const INITIAL_SEED_POSTS = supabaseActive ? [] : DEMO_POSTS.slice(0, 3);

export default function HomePage() {
  // Initial state: kosong di mode Supabase (akan diisi async), demo posts di mode demo
  const [posts, setPosts] = useState(INITIAL_SEED_POSTS);
  const [loading, setLoading] = useState(supabaseActive);
  const [feedError, setFeedError] = useState(null);

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
          setFeedError(null);
          if (supabaseActive) setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (supabaseActive) {
            // Supabase terkonfigurasi tapi gagal: tampilkan error, jangan fallback ke demo
            setFeedError(err.message || "Gagal memuat postingan dari server.");
            setPosts([]);
            setLoading(false);
          } else {
            // Mode demo: fallback ke data sync
            setPosts(getPublicPosts().slice(0, 3));
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
          <div className="online-badge">
            <span className="dot" />
            128 orang online sedang mencari bantuan
          </div>
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
          <Link href="/katalog?category=pendampingan" className="category-card">
            <div className="category-icon">
              <img
                src="/assets/images/icon-les-privat.svg"
                alt=""
                width="20"
                height="20"
              />
            </div>
            <h3>Les Privat</h3>
            <p>48 aktif</p>
          </Link>

          <Link href="/katalog?category=bantuan" className="category-card">
            <div className="category-icon">
              <img
                src="/assets/images/icon-kebersihan.svg"
                alt=""
                width="20"
                height="20"
              />
            </div>
            <h3>Jasa Kebersihan</h3>
            <p>22 aktif</p>
          </Link>

          <Link href="/katalog?category=bantuan" className="category-card">
            <div className="category-icon">
              <img
                src="/assets/images/icon-kurir.svg"
                alt=""
                width="20"
                height="20"
              />
            </div>
            <h3>Kurir / Titip</h3>
            <p>35 aktif</p>
          </Link>

          <Link href="/katalog?category=bantuan" className="category-card">
            <div className="category-icon">
              <img
                src="/assets/images/icon-teknis.svg"
                alt=""
                width="20"
                height="20"
              />
            </div>
            <h3>Teknis</h3>
            <p>18 aktif</p>
          </Link>

          <Link href="/katalog" className="category-card">
            <div className="category-icon">
              <img
                src="/assets/images/icon-lainnya.svg"
                alt=""
                width="20"
                height="20"
              />
            </div>
            <h3>Lainnya</h3>
            <p>15 aktif</p>
          </Link>
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
