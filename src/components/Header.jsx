"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { readSession, clearSession, signOutUser, getAuthUser } from "../lib/auth";
import { getNotifications } from "../lib/data";
import { useToast } from "./Toast";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const profileDropdownRef = useRef(null);

  const syncAuthAndNotifs = () => {
    const localSess = readSession();
    if (localSess) setSession(localSess);

    getAuthUser()
      .then((user) => {
        if (user) {
          setSession({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna",
          });
        } else if (!localSess) {
          setSession(null);
        }
      })
      .catch(() => {});

    try {
      const notifs = getNotifications();
      const unread = notifs.filter((n) => !n.read).length;
      setUnreadNotifCount(unread);
    } catch {
      setUnreadNotifCount(0);
    }
  };

  useEffect(() => {
    syncAuthAndNotifs();
    setMenuOpen(false);
    setProfileDropdownOpen(false);

    const handleStorageChange = () => {
      syncAuthAndNotifs();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOutUser();
    clearSession();
    setSession(null);
    showToast("Berhasil keluar dari akun.", "info");
    router.push("/");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/katalog?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/katalog");
    }
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  if (pathname === "/login") {
    return null;
  }

  const userInitial = session?.name ? session.name.charAt(0).toUpperCase() : "P";
  const userShortName = session?.name ? session.name.split(" ")[0] : "Saya";

  return (
    <header className="site-header sticky-header">
      <div className="header-inner-container">
        {/* Brand Logo & Global Search */}
        <div className="header-left-cluster">
          <Link href="/" className="site-brand" aria-label="NeedHelp Jogja - Beranda" onClick={closeMenu}>
            <img
              src="/assets/images/logo.svg"
              alt="NeedHelp Jogja"
              width="140"
              height="36"
              style={{ height: "auto" }}
            />
          </Link>

          <form className="global-search-bar" onSubmit={handleSearchSubmit} role="search">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              name="q"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bantuan atau keahlian di Yogyakarta..."
              aria-label="Cari bantuan atau keahlian di Yogyakarta"
            />
          </form>
        </div>

        {/* Desktop Quick Action Icons & Profile (Mengikuti Gambar Referensi) */}
        <div className="header-right-actions">
          {/* Chat Icon Link */}
          <Link
            href="/chat"
            className={`header-icon-btn ${pathname === "/chat" ? "active" : ""}`}
            aria-label="Kotak Masuk Pesan"
            title="Pesan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Link>

          {/* Notifikasi Bell Link */}
          <Link
            href="/notifikasi"
            className={`header-icon-btn ${pathname === "/notifikasi" ? "active" : ""}`}
            aria-label="Pemberitahuan & Notifikasi"
            title="Notifikasi"
          >
            <span className="notif-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifCount > 0 && <span className="header-notif-dot" aria-label={`${unreadNotifCount} notifikasi baru`} />}
            </span>
          </Link>

          {/* Account Profile Trigger & Dropdown */}
          {session ? (
            <div className="profile-dropdown-container" ref={profileDropdownRef}>
              <button
                type="button"
                className={`profile-nav-trigger-btn ${profileDropdownOpen ? "active" : ""}`}
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                aria-label={`Menu Akun: ${session.name || "Pengguna"}`}
              >
                <span className="user-profile-avatar" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="profile-name-text" title={session.name}>
                  {userShortName}
                </span>
                <span className="profile-caret" aria-hidden="true">▾</span>
              </button>

              {profileDropdownOpen && (
                <div className="profile-menu-popover" role="menu" aria-label="Menu Pengguna">
                  <div className="profile-popover-header">
                    <div className="popover-avatar-circle" aria-hidden="true">
                      {userInitial}
                    </div>
                    <div className="popover-user-details">
                      <div className="popover-user-name" title={session.name}>
                        {session.name || "Pengguna"}
                      </div>
                      {session.email && (
                        <div className="popover-user-email" title={session.email}>
                          {session.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="popover-divider" />

                  <Link
                    href="/profil"
                    className="popover-menu-link"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      closeMenu();
                    }}
                  >
                    <span className="popover-link-icon" aria-hidden="true">👤</span>
                    <span className="popover-link-label">Lihat Profil Saya</span>
                  </Link>

                  <Link
                    href="/aktivitas"
                    className="popover-menu-link"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      closeMenu();
                    }}
                  >
                    <span className="popover-link-icon" aria-hidden="true">🤝</span>
                    <span className="popover-link-label">Aktivitas & Kesepakatan</span>
                  </Link>

                  <div className="popover-divider" />

                  <button
                    type="button"
                    onClick={(e) => {
                      setProfileDropdownOpen(false);
                      closeMenu();
                      handleLogout(e);
                    }}
                    className="popover-logout-btn"
                    role="menuitem"
                  >
                    <span className="popover-link-icon" aria-hidden="true">🚪</span>
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="login-pill-btn" onClick={closeMenu}>
              Masuk
            </Link>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="menu-toggle"
            aria-controls="mobile-nav"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Tutup Menu" : "Buka Menu Navigasi"}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Navigation Drawer (Hanya aktif di ponsel saat hamburger diklik) */}
        {menuOpen && (
          <nav
            id="mobile-nav"
            className="mobile-dropdown-drawer"
            aria-label="Navigasi Seluler"
          >
            <ul className="mobile-nav-list">
              <li>
                <Link href="/" className={pathname === "/" ? "active" : ""} onClick={closeMenu}>
                  🏠 Beranda
                </Link>
              </li>
              <li>
                <Link href="/katalog" className={pathname === "/katalog" ? "active" : ""} onClick={closeMenu}>
                  📋 Feed & Cari
                </Link>
              </li>
              <li>
                <Link href="/buat-postingan" className={pathname === "/buat-postingan" ? "active" : ""} onClick={closeMenu}>
                  ➕ Buat Postingan Baru
                </Link>
              </li>
              <li>
                <Link href="/aktivitas" className={pathname === "/aktivitas" ? "active" : ""} onClick={closeMenu}>
                  🤝 Aktivitas & Kegiatan
                </Link>
              </li>
              <li>
                <Link href="/chat" className={pathname === "/chat" ? "active" : ""} onClick={closeMenu}>
                  💬 Kotak Masuk Pesan
                </Link>
              </li>
              <li>
                <Link href="/notifikasi" className={pathname === "/notifikasi" ? "active" : ""} onClick={closeMenu}>
                  🔔 Notifikasi {unreadNotifCount > 0 && `(${unreadNotifCount})`}
                </Link>
              </li>
              <li>
                <Link href="/profil" className={pathname === "/profil" ? "active" : ""} onClick={closeMenu}>
                  👤 Profil Saya
                </Link>
              </li>
              {session && (
                <li className="mobile-logout-item">
                  <button type="button" onClick={handleLogout} className="mobile-logout-btn">
                    🚪 Keluar ({session.name ? session.name.split(" ")[0] : "Akun"})
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
