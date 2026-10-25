"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthUser, readSession } from "../lib/auth";

export function QuickPostBox() {
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
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.name || "Teman";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <section className="quick-post-box-card" aria-label="Kotak Buat Postingan Cepat">
      <div className="quick-post-top">
        <div className="quick-post-avatar" aria-hidden="true">
          {user ? initial : "🤝"}
        </div>
        <Link
          href="/buat-postingan"
          className="quick-post-input-trigger"
          aria-label="Buka form buat permohonan atau penawaran"
        >
          <span>Butuh bantuan apa atau keahlian apa yang ingin kamu bagikan hari ini?</span>
        </Link>
      </div>

      <div className="quick-post-actions">
        <Link
          href="/buat-postingan?nature=butuh"
          className="quick-post-btn btn-butuh"
        >
          <span className="btn-icon">🆘</span>
          <span className="btn-text">+ Saya Butuh Bantuan</span>
        </Link>

        <Link
          href="/buat-postingan?nature=bisa"
          className="quick-post-btn btn-bisa"
        >
          <span className="btn-icon">✨</span>
          <span className="btn-text">+ Saya Bisa Membantu</span>
        </Link>
      </div>
    </section>
  );
}
