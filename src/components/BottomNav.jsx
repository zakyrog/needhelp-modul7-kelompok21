"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const isActive = (path) => pathname === path;

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi Bawah Ponsel">
      <Link
        href="/"
        className={`bottom-nav-item ${isActive("/") ? "active" : ""}`}
        aria-current={isActive("/") ? "page" : undefined}
      >
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Beranda</span>
      </Link>

      <Link
        href="/katalog"
        className={`bottom-nav-item ${isActive("/katalog") ? "active" : ""}`}
        aria-current={isActive("/katalog") ? "page" : undefined}
      >
        <span className="bottom-nav-icon">🔍</span>
        <span className="bottom-nav-label">Eksplor</span>
      </Link>

      <Link
        href="/buat-postingan"
        className="bottom-nav-item bottom-nav-post-btn"
        aria-label="Buat Postingan Baru"
      >
        <span className="post-plus-icon">+</span>
      </Link>

      <Link
        href="/chat"
        className={`bottom-nav-item ${isActive("/chat") ? "active" : ""}`}
        aria-current={isActive("/chat") ? "page" : undefined}
      >
        <span className="bottom-nav-icon">💬</span>
        <span className="bottom-nav-label">Pesan</span>
      </Link>

      <Link
        href="/aktivitas"
        className={`bottom-nav-item ${isActive("/aktivitas") ? "active" : ""}`}
        aria-current={isActive("/aktivitas") ? "page" : undefined}
      >
        <span className="bottom-nav-icon">📋</span>
        <span className="bottom-nav-label">Aktivitas</span>
      </Link>
    </nav>
  );
}
