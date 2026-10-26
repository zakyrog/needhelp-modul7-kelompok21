"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { CATEGORY_LABELS, REGION_LABELS, COMPENSATION_LABELS, formatRupiah, formatDate } from "../../lib/data";
import { validatePost, sanitizeString } from "../../lib/validation";
import { useToast } from "../../components/Toast";
import { CatalogCard } from "../../components/CatalogCard";
import { EXAMPLE_POSTS_FIXTURE } from "../../data/examplePostsFixture";

function DevPreviewContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const isEnabled = searchParams.get("enable") === "1";
  const view = searchParams.get("view") || "buat-postingan";

  // State untuk Preview: Buat Postingan
  const [formNature, setFormNature] = useState("butuh");
  const [formData, setFormData] = useState({
    title: "",
    category: "bantuan",
    description: "",
    date: new Date().toLocaleDateString("en-CA"),
    time: "09:00",
    region: "sleman",
    address: "Jl. Kaliurang KM 5, Pogung Dalangan",
    destination: "",
    compensation: "bayarsendiri",
    amount: "0",
    compensationNote: "",
    quota: 1,
    terms: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // State untuk Preview: Aktivitas
  const [activityFilter, setActivityFilter] = useState("all");
  const [sampleActivities, setSampleActivities] = useState([
    {
      id: "act-demo-1",
      title: "Bantu Angkat Meja Belajar & Kasur Kos",
      partnerName: "Budi Pratama",
      role: "Sebagai Pemohon",
      status: "terjadwal",
      location: "Pogung Baru Blok B-14, Sleman",
      compensation: "Bayar Sendiri-sendiri / Sukarela",
      myConfirmed: false,
      partnerConfirmed: false,
    },
    {
      id: "act-demo-2",
      title: "Teman Diskusi Tugas & Partner Ngopi di Bento Kopi",
      partnerName: "Sari Wijaya",
      role: "Sebagai Penolong",
      status: "selesai",
      location: "Bento Kopi Nologaten, Sleman",
      compensation: "Traktir Kopi",
      myConfirmed: true,
      partnerConfirmed: true,
    },
    {
      id: "act-demo-3",
      title: "Antar Belanja Kebutuhan Kos di Mirota Kampus",
      partnerName: "Rian Hidayat",
      role: "Sebagai Pemohon",
      status: "batal",
      location: "Mirota Kampus Terban, Kota Yogyakarta",
      compensation: "Rp25.000 (Tarif Pasti)",
      myConfirmed: false,
      partnerConfirmed: false,
    },
  ]);

  // State untuk Preview: Rating
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Jika preview nonaktif
  if (!isEnabled) {
    return (
      <ThreeColumnLayout>
        <section className="feed-card" style={{ padding: "32px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>🔒</span>
          <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px" }}>
            Mode Pratinjau UI Nonaktif Secara Default
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", maxWidth: "480px", margin: "0 auto 20px" }}>
            Sesuai spesifikasi keamanan, evaluasi visual halaman privat memerlukan otorisasi parameter pengujian eksplisit.
          </p>
          <Link
            href="/dev-preview?enable=1&view=buat-postingan"
            className="button button-primary"
            style={{ display: "inline-block", padding: "10px 20px", textDecoration: "none" }}
          >
            Aktifkan Pratinjau Visual Lokal &rarr;
          </Link>
        </section>
      </ThreeColumnLayout>
    );
  }

  // Handler Submit Form Buat Postingan (Simulasi Aman Tanpa DB)
  const handlePreviewPostSubmit = (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      nature: formNature,
      title: sanitizeString(formData.title),
      description: sanitizeString(formData.description),
      address: sanitizeString(formData.address),
    };
    const errs = validatePost(cleanData);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      showToast("Terdapat kesalahan isian formulir. Harap periksa tanda merah.", "error");
      return;
    }
    setFormErrors({});
    showToast("✅ [PRATINJAU] Validasi berhasil! Formulir siap terbit. (Data tidak dikirim ke database)", "success");
  };

  // Handler Konfirmasi Selesai (Simulasi Lokal)
  const handlePreviewConfirmDone = (actId) => {
    setSampleActivities((prev) =>
      prev.map((a) => {
        if (a.id === actId) {
          const nextMy = true;
          const nextStatus = a.partnerConfirmed ? "selesai" : "terjadwal";
          return { ...a, myConfirmed: nextMy, status: nextStatus };
        }
        return a;
      })
    );
    showToast("✅ [PRATINJAU] Konfirmasi kamu dicatat. Menunggu konfirmasi mitra.", "info");
  };

  // Handler Submit Rating (Simulasi Lokal)
  const handlePreviewRatingSubmit = (e) => {
    e.preventDefault();
    if (ratingComment.trim().length < 10) {
      showToast("Ulasan minimal 10 karakter.", "error");
      return;
    }
    setRatingSubmitted(true);
    showToast("⭐ [PRATINJAU] Ulasan reputasi berhasil dikirim! (Data tidak dikirim ke database)", "success");
  };

  return (
    <ThreeColumnLayout>
      {/* 1. Banner Berlabel Wajib Sesuai Spesifikasi */}
      <aside className="dev-preview-notice-bar" role="alert" aria-label="Label Mode Pratinjau Lokal">
        <div className="preview-badge-pill">⚠️ PRATINJAU UI LOKAL BERLABEL</div>
        <p className="preview-desc">
          Mode evaluasi tampilan privat non-database. Seluruh mutasi hanya berjalan di memori peramban tanpa koneksi tulis ke Supabase.
        </p>
        <nav className="preview-tabs-nav" aria-label="Pilih Halaman Privat yang Ditinjau">
          <Link
            href="/dev-preview?enable=1&view=buat-postingan"
            className={`preview-nav-tab ${view === "buat-postingan" ? "active" : ""}`}
          >
            📝 Form Postingan
          </Link>
          <Link
            href="/dev-preview?enable=1&view=aktivitas"
            className={`preview-nav-tab ${view === "aktivitas" ? "active" : ""}`}
          >
            📋 Aktivitas ({sampleActivities.length})
          </Link>
          <Link
            href="/dev-preview?enable=1&view=rating"
            className={`preview-nav-tab ${view === "rating" ? "active" : ""}`}
          >
            ⭐ Rating & Ulasan
          </Link>
          <Link
            href="/dev-preview?enable=1&view=feed-examples"
            className={`preview-nav-tab ${view === "feed-examples" ? "active" : ""}`}
          >
            🌟 Contoh Feed (12 Post)
          </Link>
        </nav>
      </aside>

      {/* 2. VIEW: Buat Postingan */}
      {view === "buat-postingan" && (
        <article className="feed-card" style={{ padding: "24px" }}>
          <header style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 6px" }}>
              Buat Postingan Baru di DIY
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
              Sampaikan permohonan bantuan atau tawarkan keahlianmu kepada warga dan mahasiswa di sekitarmu.
            </p>
          </header>

          {/* Dua Pintu Setara */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setFormNature("butuh")}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: formNature === "butuh" ? "2px solid #ef4444" : "1px solid var(--color-border-subtle)",
                background: formNature === "butuh" ? "#fef2f2" : "#ffffff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong style={{ display: "block", color: "#b91c1c", fontSize: "14px", marginBottom: "2px" }}>
                🆘 Saya Butuh Bantuan
              </strong>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                Cari mitra pindahan kos, teman nongkrong, atau les.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFormNature("bisa")}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: formNature === "bisa" ? "2px solid #10b981" : "1px solid var(--color-border-subtle)",
                background: formNature === "bisa" ? "#f0fdf4" : "#ffffff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong style={{ display: "block", color: "#15803d", fontSize: "14px", marginBottom: "2px" }}>
                ✨ Saya Bisa Membantu
              </strong>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                Tawarkan kemampuan, tenaga, atau waktu luangmu.
              </span>
            </button>
          </div>

          <form onSubmit={handlePreviewPostSubmit}>
            {/* Judul */}
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="preview-title" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                Judul Postingan (5-100 Karakter) *
              </label>
              <input
                id="preview-title"
                type="text"
                placeholder={formNature === "butuh" ? "Contoh: Butuh bantuan angkat kasur kos lantai 2" : "Contoh: Bisa bantu instalasi laptop atau teman belajar kalkulus"}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: formErrors.title ? "1px solid #ef4444" : "1px solid var(--color-border-default)" }}
              />
              {formErrors.title && <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0" }}>{formErrors.title}</p>}
            </div>

            {/* Kategori Utama & Wilayah DIY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label htmlFor="preview-cat" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  4 Kategori Utama *
                </label>
                <select
                  id="preview-cat"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="preview-region" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Wilayah DIY *
                </label>
                <select
                  id="preview-region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                >
                  {Object.entries(REGION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Deskripsi */}
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="preview-desc" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                Deskripsi Lengkap (20-1000 Karakter) *
              </label>
              <textarea
                id="preview-desc"
                rows={3}
                placeholder="Jelaskan kebutuhanmu secara spesifik dan sopan..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: formErrors.description ? "1px solid #ef4444" : "1px solid var(--color-border-default)", resize: "vertical" }}
              />
              {formErrors.description && <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0" }}>{formErrors.description}</p>}
            </div>

            {/* Jadwal & Titik Temu */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label htmlFor="preview-date" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Tanggal Rencana *
                </label>
                <input
                  id="preview-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                />
              </div>

              <div>
                <label htmlFor="preview-address" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Titik Patokan / Area Umum *
                </label>
                <input
                  id="preview-address"
                  type="text"
                  placeholder="Contoh: Depan Mirota Kampus UGM"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: formErrors.address ? "1px solid #ef4444" : "1px solid var(--color-border-default)" }}
                />
              </div>
            </div>

            {/* Imbalan & Kuota */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label htmlFor="preview-comp" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Jenis Imbalan (6 Opsi Resmi) *
                </label>
                <select
                  id="preview-comp"
                  value={formData.compensation}
                  onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                >
                  {Object.entries(COMPENSATION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {formNature === "butuh" && (
                <div>
                  <label htmlFor="preview-quota" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                    Jumlah Partner yang Dibutuhkan *
                  </label>
                  <input
                    id="preview-quota"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="button button-primary"
              style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "700" }}
            >
              🚀 Terbitkan {formNature === "butuh" ? "Permohonan Bantuan" : "Penawaran Bantuan"} (Pratinjau)
            </button>
          </form>
        </article>
      )}

      {/* 3. VIEW: Aktivitas */}
      {view === "aktivitas" && (
        <section className="feed-card" style={{ padding: "24px" }}>
          <header style={{ marginBottom: "16px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 4px" }}>
              Aktivitas & Kegiatan Saya (Pratinjau)
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
              Simulasi alur konfirmasi ganda penyelesaian kegiatan dan pembagian peran.
            </p>
          </header>

          {/* Filter Status */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            {["all", "terjadwal", "selesai", "batal"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActivityFilter(s)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: activityFilter === s ? "1px solid var(--color-action-primary)" : "1px solid var(--color-border-subtle)",
                  background: activityFilter === s ? "var(--color-action-primary-light)" : "#fff",
                  color: activityFilter === s ? "var(--color-action-primary)" : "var(--color-text-secondary)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {s === "all" ? "Semua" : s === "terjadwal" ? "Terjadwal" : s === "selesai" ? "Tuntas Selesai" : "Dibatalkan"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sampleActivities
              .filter((a) => activityFilter === "all" || a.status === activityFilter)
              .map((act) => (
                <article
                  key={act.id}
                  style={{
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 2px" }}>{act.title}</h3>
                      <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                        Mitra: <strong>{act.partnerName}</strong> • {act.role}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "700",
                        background: act.status === "selesai" ? "#dcfce7" : act.status === "terjadwal" ? "#fef3c7" : "#fee2e2",
                        color: act.status === "selesai" ? "#15803d" : act.status === "terjadwal" ? "#b45309" : "#b91c1c",
                      }}
                    >
                      {act.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", marginBottom: "10px" }}>
                    📍 Titik Temu: {act.location} • 💰 Imbalan: {act.compensation}
                  </div>

                  {act.status === "terjadwal" && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#b45309" }}>
                        Konfirmasi Kamu: <strong>{act.myConfirmed ? "✓ Sudah" : "Belum"}</strong> | Mitra: <strong>{act.partnerConfirmed ? "✓ Sudah" : "Belum"}</strong>
                      </span>
                      {!act.myConfirmed && (
                        <button
                          type="button"
                          onClick={() => handlePreviewConfirmDone(act.id)}
                          className="button button-sm button-primary"
                        >
                          ✓ Konfirmasi Selesai
                        </button>
                      )}
                    </div>
                  )}

                  {act.status === "selesai" && (
                    <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                      <Link
                        href="/dev-preview?enable=1&view=rating"
                        className="button button-sm button-primary"
                        style={{ textDecoration: "none" }}
                      >
                        ⭐ Beri Ulasan Reputasi Mitra
                      </Link>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}

      {/* 4. VIEW: Rating */}
      {view === "rating" && (
        <article className="feed-card" style={{ padding: "24px" }}>
          <header style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 6px" }}>
              Beri Ulasan Reputasi Mitra (Pratinjau)
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
              Kegiatan telah tuntas dikonfirmasi kedua pihak. Ulasan ini akan memperbarui skor bintang profil mitra secara transparan.
            </p>
          </header>

          <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid var(--color-border-subtle)", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 4px" }}>
              Teman Diskusi Tugas & Partner Ngopi di Bento Kopi
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>
              Mitra yang dinilai: <strong>Sari Wijaya</strong> (Sebagai Pemohon)
            </p>
          </div>

          {ratingSubmitted ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🎉</span>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#166534", margin: "0 0 4px" }}>
                Ulasan Reputasi Berhasil Dicatat!
              </h3>
              <p style={{ fontSize: "13px", color: "#15803d", margin: 0 }}>
                Skor rating rata-rata Sari Wijaya kini diperbarui otomatis via database trigger.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePreviewRatingSubmit}>
              {/* Bintang */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                  Skor Penilaian (1-5 Bintang) *
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "32px",
                        cursor: "pointer",
                        color: star <= ratingStars ? "#f59e0b" : "#cbd5e1",
                        transition: "transform 0.1s ease",
                      }}
                      aria-label={`${star} Bintang`}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#b45309", marginLeft: "8px" }}>
                    {ratingStars === 5 ? "Sangat Memuaskan! (5/5)" : `${ratingStars}/5 Bintang`}
                  </span>
                </div>
              </div>

              {/* Komentar */}
              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="preview-comment" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Ulasan Pengalaman Kerja Sama (10-500 Karakter) *
                </label>
                <textarea
                  id="preview-comment"
                  rows={4}
                  placeholder="Ceritakan pengalamanmu bekerja sama secara jujur dan membangun..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)", resize: "vertical" }}
                />
                <span style={{ fontSize: "11px", color: ratingComment.trim().length >= 10 ? "var(--color-text-muted)" : "#ef4444" }}>
                  {ratingComment.trim().length} / 500 karakter {ratingComment.trim().length < 10 && "(minimal 10 karakter)"}
                </span>
              </div>

              <button
                type="submit"
                className="button button-primary"
                style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "700" }}
              >
                ⭐ Kirim Ulasan Reputasi (Pratinjau)
              </button>
            </form>
          )}
        </article>
      )}

      {/* 5. VIEW: Contoh Feed 12 Postingan Yogyakarta */}
      {view === "feed-examples" && (
        <div>
          <article className="feed-card" style={{ padding: "20px 24px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 6px" }}>
                  12 Contoh Postingan Komunitas Yogyakarta
                </h1>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "580px" }}>
                  Sesuai PRD dan arahan desain NeedHelp: 4 kategori utama (Bantuan Fisik, Ditemani, Pendampingan, Explore), dua jenis postingan (Saya Butuh & Saya Bisa), dengan variasi imbalan dan catatan khusus yang aman.
                </p>
              </div>
              <Link
                href="/?preview=1"
                className="button button-outline"
                style={{ fontSize: "13px", padding: "8px 14px", textDecoration: "none" }}
              >
                Buka di Beranda Utama &rarr;
              </Link>
            </div>
          </article>

          <div className="feed-posts-container" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {EXAMPLE_POSTS_FIXTURE.map((post) => (
              <CatalogCard key={post.id} post={post} backUrl="/dev-preview?enable=1&view=feed-examples" />
            ))}
          </div>
        </div>
      )}
    </ThreeColumnLayout>
  );
}

export default function DevPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Memuat pratinjau...</div>}>
      <DevPreviewContent />
    </Suspense>
  );
}
