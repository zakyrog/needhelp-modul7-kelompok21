"use client";

import React from "react";
import Link from "next/link";

export function QuickPostBox() {
  return (
    <section className="post-action-prompt-card" aria-label="Pilihan Buat Postingan">
      <h2 className="prompt-card-heading">Apa yang ingin kamu lakukan?</h2>
      <div className="prompt-options-grid">
        {/* Pilihan 1: Saya Butuh Bantuan */}
        <Link
          href="/buat-postingan?nature=butuh"
          className="prompt-option-item option-butuh"
          aria-label="Saya Butuh Bantuan - Minta bantuan dari komunitas"
        >
          <div className="option-info-group">
            <div className="option-icon-circle icon-butuh" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </div>
            <div className="option-text-cluster">
              <span className="option-title title-butuh">Saya Butuh Bantuan</span>
              <span className="option-desc desc-butuh">Minta bantuan dari komunitas</span>
            </div>
          </div>
          <div className="option-arrow-pill arrow-butuh" aria-hidden="true">
            &rarr;
          </div>
        </Link>

        {/* Pilihan 2: Saya Bisa Membantu */}
        <Link
          href="/buat-postingan?nature=bisa"
          className="prompt-option-item option-bisa"
          aria-label="Saya Bisa Membantu - Tawarkan waktu, keahlian, atau bantuan"
        >
          <div className="option-info-group">
            <div className="option-icon-circle icon-bisa" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="option-text-cluster">
              <span className="option-title title-bisa">Saya Bisa Membantu</span>
              <span className="option-desc desc-bisa">Tawarkan waktu, keahlian, atau bantuan</span>
            </div>
          </div>
          <div className="option-arrow-pill arrow-bisa" aria-hidden="true">
            &rarr;
          </div>
        </Link>
      </div>
    </section>
  );
}
