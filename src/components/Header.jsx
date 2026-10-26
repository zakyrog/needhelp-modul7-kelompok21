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
              placeholder="Cari bantuan atau keahlian di Jogja..."
              aria-label="Cari bantuan"
            />
          </form>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="menu-toggle"
          aria-controls="main-nav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? "✕ Tutup" : "☰ Menu"}
        </button>

        {/* Main Navigation (LinkedIn-Style Vertical Icons & Text) */}
        <nav
          id="main-nav"
          className="site-nav"
          aria-label="Navigasi Utama"
          data-open={String(menuOpen)}
        >
          <ul className="nav-items-list">
            <li>
              <Link
                href="/"
                className={`nav-link-item ${pathname === "/" ? "active" : ""}`}
                aria-current={pathname === "/" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon">🏠</span>
                <span className="nav-label">Beranda</span>
              </Link>
            </li>

            <li>
              <Link
                href="/katalog"
                className={`nav-link-item ${pathname === "/katalog" ? "active" : ""}`}
                aria-current={pathname === "/katalog" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon">📋</span>
                <span className="nav-label">Feed & Cari</span>
              </Link>
            </li>

            <li>
              <Link
                href="/buat-postingan"
                className={`nav-link-item nav-btn-highlight ${pathname === "/buat-postingan" ? "active" : ""}`}
                aria-current={pathname === "/buat-postingan" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon">➕</span>
                <span className="nav-label">Buat Post</span>
              </Link>
            </li>

            <li>
              <Link
                href="/aktivitas"
                className={`nav-link-item ${pathname === "/aktivitas" ? "active" : ""}`}
                aria-current={pathname === "/aktivitas" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon">🤝</span>
                <span className="nav-label">Aktivitas</span>
              </Link>
            </li>

            <li>
              <Link
                href="/chat"
                className={`nav-link-item ${pathname === "/chat" ? "active" : ""}`}
                aria-current={pathname === "/chat" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon">💬</span>
                <span className="nav-label">Pesan</span>
              </Link>
            </li>

            <li>
              <Link
                href="/notifikasi"
                className={`nav-link-item ${pathname === "/notifikasi" ? "active" : ""}`}
                aria-current={pathname === "/notifikasi" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="nav-icon" style={{ position: "relative" }}>
                  🔔
                  {unreadNotifCount > 0 && (
                    <span className="badge-notif-count">{unreadNotifCount}</span>
                  )}
                </span>
                <span className="nav-label">Notif</span>
              </Link>
            </li>

            <li className="nav-profile-item" ref={profileDropdownRef}>
              {session ? (
                <div className="profile-dropdown-container">
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
                    <span className="profile-trigger-label">
                      <span className="profile-name-text">
                        {session.name ? session.name.split(" ")[0] : "Saya"}
                      </span>
                      <span className="profile-caret" aria-hidden="true">▾</span>
                    </span>
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
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
