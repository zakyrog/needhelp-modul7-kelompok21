"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { readSession, clearSession, signOut } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const syncAuthAndNotifs = () => {
    setSession(readSession());
    const notifs = getNotifications();
    const unread = notifs.filter((n) => !n.read).length;
    setUnreadNotifCount(unread);
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

  // Handle escape key to close menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  const handleLogout = async (e) => {
    e.preventDefault();
    if (isSupabaseConfigured()) {
      await signOut();
    } else {
      clearSession();
    }
    setSession(null);
    setProfileMenuOpen(false);
    showToast("Berhasil keluar.", "info");
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

  const toggleProfileMenu = () => {
    setProfileMenuOpen((prev) => !prev);
  };

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-brand" aria-label="NeedHelp - Beranda" onClick={closeMenu}>
        <img
          src="/assets/images/logo.svg"
          alt="NeedHelp"
          width="160"
          height="40"
          style={{ height: "auto" }}
        />
      </Link>

      <button
        type="button"
        className="menu-toggle"
        aria-controls="main-nav"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {menuOpen ? "Tutup" : "Menu"}
      </button>

      <nav
        id="main-nav"
        className="site-nav"
        aria-label="Navigasi Utama"
        data-open={String(menuOpen)}
      >
        <ul>
          <li>
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              onClick={closeMenu}
            >
              Beranda
            </Link>
          </li>
          <li>
            <Link
              href="/katalog"
              aria-current={pathname === "/katalog" ? "page" : undefined}
              onClick={closeMenu}
            >
              Katalog
            </Link>
          </li>
          {/* Hanya tampilkan Aktivitas dan Pesan jika sudah login */}
          {session && (
            <>
              <li>
                <Link
                  href="/aktivitas"
                  aria-current={pathname === "/aktivitas" ? "page" : undefined}
                  onClick={closeMenu}
                >
                  Aktivitas
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  aria-current={pathname === "/chat" ? "page" : undefined}
                  onClick={closeMenu}
                >
                  Pesan
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="header-right-actions">
        <form
          className="search-box-wrapper"
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <img
            src="/assets/images/icon-search.svg"
            alt=""
            className="search-icon"
            width="16"
            height="16"
          />
          <input
            type="search"
            name="q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bantuan..."
            aria-label="Cari bantuan"
          />
        </form>

        {/* Icon chat hanya jika sudah login */}
        {session && (
          <Link href="/chat" className="icon-action-btn" aria-label="Pesan" onClick={closeMenu}>
            <img src="/assets/images/icon-chat.svg" alt="" width="18" height="18" />
          </Link>
        )}

        <Link
          href="/notifikasi"
          className="icon-action-btn"
          aria-label={
            unreadNotifCount > 0
              ? `Notifikasi (${unreadNotifCount} belum dibaca)`
              : "Notifikasi"
          }
          onClick={closeMenu}
          style={{ position: "relative" }}
        >
          <img src="/assets/images/icon-bell.svg" alt="" width="18" height="18" />
          {unreadNotifCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#e53e3e",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "bold",
                borderRadius: "999px",
                width: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {unreadNotifCount}
            </span>
          )}
        </Link>

        {/* Profile Badge dengan Dropdown Menu */}
        <div
          ref={profileMenuRef}
          style={{ position: "relative" }}
        >
          <button
            type="button"
            className="user-profile-badge"
            role="button"
            aria-label={session ? `Menu profil ${session.name}` : "Menu pengunjung"}
            aria-expanded={profileMenuOpen}
            aria-haspopup="true"
            title={session ? session.name : "Pengunjung"}
            onClick={toggleProfileMenu}
            style={{
              cursor: "pointer",
              border: "none",
              background: "transparent",
              padding: 0,
            }}
          >
            {session ? (
              session.name.charAt(0).toUpperCase()
            ) : (
              <img
                src="/assets/images/avatar-user.svg"
                alt="Pengunjung"
                width={28}
                height={28}
                style={{ borderRadius: "50%", display: "block" }}
              />
            )}
          </button>

          {/* Dropdown Menu */}
          {profileMenuOpen && (
            <div
              className="profile-dropdown-menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "#ffffff",
                border: "1px solid #cfdadc",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                minWidth: "180px",
                zIndex: 1001,
                overflow: "hidden",
              }}
            >
              {session ? (
                <>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #eef2f1",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#0f2e33",
                    }}
                  >
                    {session.name || "Pengguna Demo"}
                  </div>
                  <Link
                    href="/profil"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      closeMenu();
                    }}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#0f2e33",
                      textDecoration: "none",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#e6f9f8")}
                    onMouseLeave={(e) => (e.target.style.background = "transparent")}
                  >
                    Edit Profil
                  </Link>
                  <a
                    href="#logout"
                    onClick={handleLogout}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#e53e3e",
                      textDecoration: "none",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#fee2e2")}
                    onMouseLeave={(e) => (e.target.style.background = "transparent")}
                  >
                    Keluar
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      closeMenu();
                    }}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#4a9ba0",
                      textDecoration: "none",
                      fontWeight: "600",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#e6f9f8")}
                    onMouseLeave={(e) => (e.target.style.background = "transparent")}
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      closeMenu();
                    }}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#0f2e33",
                      textDecoration: "none",
                      fontWeight: "600",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#e6f9f8")}
                    onMouseLeave={(e) => (e.target.style.background = "transparent")}
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
