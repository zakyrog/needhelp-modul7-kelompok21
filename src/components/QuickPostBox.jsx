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
          aria-label="Saya Butuh Bantuan - Ceritakan kebutuhanmu"
        >
          <div className="option-info-group">
            <div className="option-icon-circle icon-butuh" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </div>
            <div className="option-text-cluster">
              <span className="option-title title-butuh">Saya Butuh Bantuan</span>
              <span className="option-desc desc-butuh">Ceritakan kebutuhanmu</span>
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
          aria-label="Saya Bisa Membantu - Tawarkan kemampuanmu"
        >
          <div className="option-info-group">
            <div className="option-icon-circle icon-bisa" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
                <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
                <path d="m2 15 6 6" />
                <path d="M19.5 8.5c.7-.7 1.8-.7 2.5 0s.7 1.8 0 2.5l-2.5 2.5" />
              </svg>
            </div>
            <div className="option-text-cluster">
              <span className="option-title title-bisa">Saya Bisa Membantu</span>
              <span className="option-desc desc-bisa">Tawarkan kemampuanmu</span>
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
