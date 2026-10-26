"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { readSession, getAuthUser, getUserProfile } from "../lib/auth";

export function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);

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
        console.warn("Gagal memuat profil sidebar:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Warga Jogja";
  const initial = displayName.charAt(0).toUpperCase();
  const subtitle = profile?.bio || "Warga Yogyakarta";

  const navItems = [
    {
      href: "/",
      label: "Beranda",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      exact: true,
    },
    {
      href: "/katalog",
      label: "Feed & Cari",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      exact: false,
    },
    {
      href: "/aktivitas",
      label: "Aktivitas",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      exact: false,
    },
    {
      href: "/chat",
      label: "Pesan",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      exact: false,
    },
    {
      href: "/profil",
      label: "Profil Saya",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      exact: false,
    },
  ];

  const isItemActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="app-sidebar" aria-label="Sidebar Navigasi & Profil">
      {/* 1. Kartu Profil & Navigasi Utama */}
      <div className="sidebar-main-card">
        {/* Ringkasan Profil */}
        <div className="sidebar-profile-header">
          {loading ? (
            <div className="sidebar-profile-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-text-wrap">
                <div className="skeleton-line line-name" />
                <div className="skeleton-line line-sub" />
              </div>
            </div>
          ) : user ? (
            <Link href="/profil" className="sidebar-profile-link" title="Buka Profil Saya">
              <div className="sidebar-avatar-circle" aria-hidden="true">
                {initial}
              </div>
              <div className="sidebar-user-info">
                <h3 className="sidebar-user-name" title={displayName}>
                  {displayName}
                </h3>
                <p className="sidebar-user-sub">{subtitle}</p>
              </div>
            </Link>
          ) : (
            <Link href="/login" className="sidebar-profile-link" title="Masuk atau Daftar Akun">
              <div className="sidebar-avatar-circle guest-avatar" aria-hidden="true">
                🤝
              </div>
              <div className="sidebar-user-info">
                <h3 className="sidebar-user-name">NeedHelp Jogja</h3>
                <p className="sidebar-user-sub">Masuk untuk saling bantu</p>
              </div>
            </Link>
          )}
        </div>

        {/* Daftar Navigasi Utama */}
        <nav className="sidebar-nav-list" aria-label="Navigasi Menu Utama">
          {navItems.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Kartu Terpisah: Bantu dengan Aman (Jarak 16px) */}
      <div className="sidebar-safety-card">
        <div className="safety-card-header">
          <div className="safety-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h4 className="safety-card-title">Bantu dengan aman</h4>
        </div>
        <p className="safety-card-desc">
          Pilih tempat umum untuk bertemu. Gunakan kesepakatan di chat.
        </p>
        <button
          type="button"
          className="safety-card-link-btn"
          onClick={() => setSafetyModalOpen(true)}
        >
          <span>Lihat panduan</span>
          <span className="arrow-icon" aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* 3. Tautan Footer Ringkas */}
      <div className="sidebar-footer-links">
        <Link href="/katalog" className="sidebar-footer-link">Bantuan</Link>
        <span className="footer-dot">•</span>
        <span className="sidebar-footer-text">Privasi</span>
        <span className="footer-dot">•</span>
        <span className="sidebar-footer-text">Ketentuan</span>
      </div>

      {/* Modal Panduan Keamanan */}
      {safetyModalOpen && (
        <div
          className="safety-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-modal-title"
          onClick={() => setSafetyModalOpen(false)}
        >
          <div
            className="safety-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="safety-modal-header">
              <div className="safety-modal-icon-title">
                <span className="safety-modal-icon" aria-hidden="true">🛡️</span>
                <h3 id="safety-modal-title" className="safety-modal-heading">Panduan Aman Berinteraksi</h3>
              </div>
              <button
                type="button"
                className="safety-modal-close"
                onClick={() => setSafetyModalOpen(false)}
                aria-label="Tutup panduan keamanan"
              >
                ✕
              </button>
            </div>
            <div className="safety-modal-body">
              <div className="safety-point">
                <strong>1. Titik Temu Publik</strong>
                <p>Prioritaskan selalu bertemu di tempat umum yang ramai di Yogyakarta, seperti kampus, perpustakaan, kafe, atau minimarket terdekat.</p>
              </div>
              <div className="safety-point">
                <strong>2. Resmikan via Kartu Chat</strong>
                <p>Ajukan kesepakatan resmi melalui ruang chat NeedHelp agar rincian jadwal, lokasi titik temu, dan imbalan terkunci transparan dan sah di sistem.</p>
              </div>
              <div className="safety-point">
                <strong>3. Konfirmasi Bersama</strong>
                <p>Setelah kegiatan selesai dikerjakan, lakukan konfirmasi penyelesaian bersama agar reputasi dan ulasan saling tercatat dengan jujur.</p>
              </div>
            </div>
            <div className="safety-modal-footer">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setSafetyModalOpen(false)}
                style={{ width: "100%", padding: "10px 16px" }}
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
