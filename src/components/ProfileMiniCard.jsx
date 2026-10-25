"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { readSession, getAuthUser, getUserProfile } from "../lib/auth";

export function ProfileMiniCard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const authUser = await getAuthUser();
        if (authUser && isMounted) {
          setUser(authUser);
          const prof = await getUserProfile(authUser.id);
          if (prof && isMounted) {
            setProfile(prof);
          }
        } else {
          const localSess = readSession();
          if (localSess && isMounted) {
            setUser({
              id: localSess.id || "local-user",
              email: localSess.email,
              user_metadata: { full_name: localSess.name },
            });
            setProfile({
              full_name: localSess.name,
              rating_average: 0.0,
              rating_count: 0,
            });
          }
        }
      } catch (err) {
        console.warn("Gagal memuat profil mini:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <aside className="sidebar-card profile-mini-card skeleton-loading" aria-label="Profil Singkat">
        <div style={{ height: "48px", width: "48px", borderRadius: "50%", background: "#e2e8f0", margin: "0 auto 12px" }} />
        <div style={{ height: "16px", width: "70%", background: "#e2e8f0", margin: "0 auto 8px", borderRadius: "4px" }} />
        <div style={{ height: "12px", width: "50%", background: "#e2e8f0", margin: "0 auto", borderRadius: "4px" }} />
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className="sidebar-card profile-mini-card guest-card" aria-label="Selamat Datang">
        <div className="card-top-pattern" />
        <div className="profile-mini-content text-center">
          <div className="guest-avatar-icon">🤝</div>
          <h3 className="profile-mini-name">NeedHelp Jogja</h3>
          <p className="profile-mini-bio text-muted">
            Komunitas saling bantu & cari teman situasional untuk mahasiswa dan pekerja muda di DIY.
          </p>
          <div className="guest-actions">
            <Link href="/login" className="button button-primary button-sm" style={{ width: "100%", textAlign: "center" }}>
              Masuk / Daftar
            </Link>
          </div>
          <div className="profile-quick-stats">
            <div className="stat-item">
              <span className="stat-label">Cakupan Wilayah</span>
              <span className="stat-value">5 Kab/Kota DIY</span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();
  const ratingAvg = Number(profile?.rating_average || 0).toFixed(1);
  const ratingCount = profile?.rating_count || 0;

  return (
    <aside className="sidebar-card profile-mini-card" aria-label="Profil Singkat Pengguna">
      <div className="card-top-pattern" />
      <div className="profile-mini-content">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-initial" aria-hidden="true">{initial}</div>
        </div>

        <h3 className="profile-mini-name">
          <Link href="/profil">{displayName}</Link>
        </h3>
        <p className="profile-mini-bio text-muted">
          {profile?.bio || "Mahasiswa / Warga Yogyakarta"}
        </p>

        {ratingCount > 0 ? (
          <div className="profile-rating-badge">
            <span className="rating-star">⭐</span>
            <span className="rating-score">{ratingAvg}</span>
            <span className="rating-count">({ratingCount} ulasan)</span>
          </div>
        ) : (
          <div className="profile-rating-badge rating-badge-new">
            <span className="rating-star">⭐</span>
            <span className="rating-score">Anggota Baru</span>
          </div>
        )}

        <hr className="profile-divider" />

        <ul className="profile-quick-menu">
          <li>
            <Link href="/profil" className="quick-menu-link">
              <span>👤 Profil Saya</span>
            </Link>
          </li>
          <li>
            <Link href="/aktivitas" className="quick-menu-link">
              <span>📋 Aktivitas & Kegiatan</span>
            </Link>
          </li>
          <li>
            <Link href="/chat" className="quick-menu-link">
              <span>💬 Kotak Masuk Pesan</span>
            </Link>
          </li>
          <li>
            <Link href="/katalog?type=butuh" className="quick-menu-link">
              <span>🆘 Permintaan Bantuan</span>
            </Link>
          </li>
          <li>
            <Link href="/katalog?type=bisa" className="quick-menu-link">
              <span>✨ Penawaran Keahlian</span>
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
