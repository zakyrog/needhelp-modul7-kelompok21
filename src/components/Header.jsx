"use client";

import React, { useState, useEffect } from "react";
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
  const [session, setSession] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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

    const handleStorageChange = () => {
      syncAuthAndNotifs();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

            <li className="nav-profile-item">
              {session ? (
                <div className="profile-dropdown-wrapper">
                  <Link href="/profil" className="profile-chip-link" onClick={closeMenu}>
                    <span className="user-profile-avatar" title={`Akun: ${session.name}`}>
                      {userInitial}
                    </span>
                    <span className="profile-name-text">
                      {session.name ? session.name.split(" ")[0] : "Akun"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="logout-text-btn"
                    title="Keluar dari akun"
                  >
                    Keluar
                  </button>
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
