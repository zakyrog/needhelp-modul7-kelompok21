"use client";

import React from "react";
import Link from "next/link";

export function CommunityTipsWidget() {
  return (
    <aside className="sidebar-card community-widget" aria-label="Informasi & Tips Keamanan">
      <div className="community-widget-header">
        <span className="widget-icon">🛡️</span>
        <h4 className="widget-title">Panduan Aman NeedHelp</h4>
      </div>

      <div className="community-widget-body">
        <ul className="safety-tips-list">
          <li>
            <strong>Titik Temu Publik:</strong> Prioritaskan bertemu di tempat umum yang ramai (kampus, kafe, minimarket terdekat).
          </li>
          <li>
            <strong>Resmikan via Kartu Chat:</strong> Ajukan kartu kesepakatan di ruang pesan agar jadwal dan imbalan terkunci transparan.
          </li>
          <li>
            <strong>Konfirmasi Bersama:</strong> Selesaikan kegiatan setelah bantuan benar-benar tuntas untuk saling memberikan rating.
          </li>
        </ul>

        <div className="region-coverage-box">
          <div className="region-header">
            <span>📍 Wilayah Layanan DIY:</span>
          </div>
          <div className="region-tags">
            <Link href="/katalog?location=sleman" className="region-tag">Sleman</Link>
            <Link href="/katalog?location=kota" className="region-tag">Kota Jogja</Link>
            <Link href="/katalog?location=bantul" className="region-tag">Bantul</Link>
            <Link href="/katalog?location=kulonprogo" className="region-tag">Kulon Progo</Link>
            <Link href="/katalog?location=gunungkidul" className="region-tag">Gunungkidul</Link>
          </div>
        </div>

        <div className="widget-footer-links">
          <Link href="/katalog?type=butuh" className="footer-micro-link">Saya Butuh</Link>
          <span>•</span>
          <Link href="/katalog?type=bisa" className="footer-micro-link">Saya Bisa</Link>
          <span>•</span>
          <Link href="/login" className="footer-micro-link">Bantuan Akun</Link>
        </div>
        <p className="copyright-note">
          &copy; 2026 NeedHelp Jogja • Modul 8
        </p>
      </div>
    </aside>
  );
}
