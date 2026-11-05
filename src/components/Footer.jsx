import React from "react";
import Link from "next/link";
import { SvgIcon } from "./Icons.jsx";

export function Footer() {
  return (
    <footer>
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-logo">NeedHelp</span>
          <p>
            Platform bantuan &amp; teman situasional untuk komunitas
            Kota Yogyakarta.
          </p>
        </div>

        <div className="site-footer-col">
          <h4>Jelajahi</h4>
          <Link href="/katalog">Katalog Bantuan</Link>
          <Link href="/aktivitas">Aktivitas</Link>
          <Link href="/chat">Pesan</Link>
        </div>

        <div className="site-footer-col">
          <h4>Berkontribusi</h4>
          <Link href="/buat-postingan">Buat Permintaan</Link>
          <Link href="/register">Daftar Relawan</Link>
          <Link href="/notifikasi">Notifikasi</Link>
        </div>

        <div className="site-footer-col">
          <h4>Akun</h4>
          <Link href="/login">Masuk</Link>
          <Link href="/register">Daftar</Link>
          <Link href="/profil">Profil</Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>&copy; 2026 NeedHelp — Need-Based Companion &amp; Help</span>
        <span className="site-footer-love">
          <SvgIcon name="wave" size={14} strokeWidth={2} /> Dibuat untuk Yogyakarta
        </span>
      </div>
    </footer>
  );
}