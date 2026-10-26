"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAuthUser, readSession } from "../lib/auth";

export function DockedChatDrawer() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getAuthUser().then((u) => {
      if (u && isMounted) {
        setUser(u);
      } else {
        const local = readSession();
        if (local && isMounted) setUser(local);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [pathname]);

  // Sembunyikan jika sedang berada di halaman chat penuh atau login
  if (pathname === "/chat" || pathname === "/login") return null;

  return (
    <div className={`docked-chat-drawer ${isOpen ? "open" : "collapsed"}`} aria-label="Kotak Obrolan Mengambang">
      <button
        type="button"
        className="docked-chat-header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className="docked-header-left">
          <span className="docked-icon">💬</span>
          <span className="docked-title">Obrolan Cepat</span>
        </div>
        <div className="docked-header-right">
          <span className="toggle-symbol">{isOpen ? "▾" : "▴"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="docked-chat-body">
          {user ? (
            <div className="docked-thread-list">
              <p className="docked-hint text-muted">
                Ruang obrolan aktif dengan mitra bantuan:
              </p>
              <div className="docked-items">
                <Link href="/chat" className="docked-thread-item">
                  <div className="thread-avatar">B</div>
                  <div className="thread-info">
                    <span className="thread-name">Budi Pratama</span>
                    <span className="thread-preview text-muted">Sepakat, sampai ketemu hari Sabtu...</span>
                  </div>
                </Link>
                <Link href="/chat" className="docked-thread-item">
                  <div className="thread-avatar">R</div>
                  <div className="thread-info">
                    <span className="thread-name">Rina Putri</span>
                    <span className="thread-preview text-muted">Bisa ketemu sore di Cosan Palagan...</span>
                  </div>
                </Link>
              </div>
              <div className="docked-footer">
                <Link href="/chat" className="button button-sm button-outline" style={{ width: "100%", textAlign: "center" }}>
                  Buka Seluruh Pesan &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="docked-empty-state">
              <p className="text-muted" style={{ fontSize: "13px", margin: "12px 0" }}>
                Masuk untuk mengirim pesan dan menyepakati bantuan secara langsung.
              </p>
              <Link href="/login" className="button button-sm button-primary" style={{ width: "100%", textAlign: "center" }}>
                Masuk Sekarang
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
