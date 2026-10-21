"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { readSession, clearSession } from "../lib/auth";
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

  // Handle escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    clearSession();
    setSession(null);
    showToast("Berhasil keluar dari akun demo.", "info");
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
          <li>
            {session ? (
              <a href="#logout" onClick={handleLogout}>
                Keluar ({session.name ? session.name.split(" ")[0] : "Demo"})
              </a>
            ) : (
              <Link href="/login" onClick={closeMenu}>
                Masuk
              </Link>
            )}
          </li>
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

        <Link href="/chat" className="icon-action-btn" aria-label="Pesan" onClick={closeMenu}>
          <img src="/assets/images/icon-chat.svg" alt="" width="18" height="18" />
        </Link>

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

        <span
          className="user-profile-badge"
          role="img"
          aria-label={session ? `Profil ${session.name}` : "Profil tamu"}
          title={session ? session.name : "Tamu demo"}
        >
          {session ? session.name.charAt(0).toUpperCase() : "P"}
        </span>
      </div>
    </header>
  );
}
