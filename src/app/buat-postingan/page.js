"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost, CATEGORY_LABELS, REGION_LABELS, COMPENSATION_LABELS } from "../../lib/data.js";
import { readSession, getAuthUser } from "../../lib/auth.js";
import { validatePost, sanitizeString } from "../../lib/validation.js";
import { createClient } from "../../utils/supabase/client";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { useToast } from "../../components/Toast";

function BuatPostinganContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  const initialNature = searchParams.get("nature") === "bisa" ? "bisa" : "butuh";
  const initialRegion = searchParams.get("region") || "";

  const [formData, setFormData] = useState({
    nature: initialNature,
    title: "",
    category: "",
    description: "",
    date: new Date().toLocaleDateString("en-CA"),
    time: "09:00",
    region: initialRegion,
    address: "",
    destination: "",
    compensation: "tarif",
    amount: "50000",
    compensationNote: "",
    quota: 1,
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const user = await getAuthUser();
        if (user && isMounted) {
          setAuthUser(user);
          setSession({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna",
          });
          return;
        }
      } catch (e) {
        console.warn("Auth check error:", e);
      }

      const localSess = readSession();
      if (localSess && isMounted) {
        setSession(localSess);
      } else if (isMounted) {
        showToast("Silakan masuk atau buat akun untuk menerbitkan postingan.", "info");
        router.replace("/login?next=/buat-postingan");
      }
    }

    checkAuth();

    return () => { isMounted = false; };
  }, [router, showToast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNatureSelect = (nature) => {
    setFormData((prev) => ({ ...prev, nature }));
    if (errors.nature) {
      setErrors((prev) => ({ ...prev, nature: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const sanitizedData = {
      ...formData,
      title: sanitizeString(formData.title),
      description: formData.description.trim(),
      address: sanitizeString(formData.address),
      destination: sanitizeString(formData.destination),
      amount: String(formData.amount).trim(),
      compensationNote: sanitizeString(formData.compensationNote),
    };

    const validationErrors = validatePost(sanitizedData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Terdapat kolom yang belum valid. Mohon periksa kembali isian Anda.", "error");
      const firstField = Object.keys(validationErrors)[0];
      const elem = document.querySelector(`[name="${firstField}"]`);
      if (elem) elem.focus();
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      let createdPostId = null;

      // 1. Jika terautentikasi di Supabase, simpan ke database riil
      if (authUser) {
        const supabase = createClient();
        if (supabase) {
          const quotaVal = formData.nature === "butuh" ? Math.max(1, Number(formData.quota) || 1) : 1;
          const { data, error } = await supabase.from("posts").insert({
            author_id: authUser.id,
            nature: formData.nature,
            title: sanitizedData.title,
            category: formData.category,
            description: sanitizedData.description,
            planned_date: formData.date,
            start_time: formData.time.length === 5 ? `${formData.time}:00` : formData.time,
            region: formData.region,
            address_general: sanitizedData.address,
            compensation_type: formData.compensation,
            amount: formData.compensation === "tarif" ? Number(formData.amount) : 0,
            compensation_note: sanitizedData.compensationNote || "",
            quota: quotaVal,
            remaining_quota: quotaVal,
            status: "aktif",
          }).select().single();

          if (error) {
            console.error("Supabase post error:", error);
            throw new Error(error.message || "Gagal menyimpan postingan ke basis data.");
          }
          if (data && data.id) {
            createdPostId = data.id;
          }
        }
      }

      // 2. Fallback penyimpanan lokal
      if (!createdPostId) {
        const localPost = createPost(sanitizedData, session || { id: "local-user", name: "Pengguna" });
        if (!localPost || !localPost.id) {
          throw new Error("Gagal menyimpan postingan.");
        }
        createdPostId = localPost.id;
      }

      showToast("Postingan berhasil diterbitkan!", "success");
      router.push(`/sukses-postingan?id=${encodeURIComponent(createdPostId)}`);
    } catch (err) {
      setSubmitting(false);
      const msg = err.message || "Gagal menerbitkan postingan. Coba lagi.";
      setErrors({ general: msg });
      showToast(msg, "error");
    }
  };

  const isNeed = formData.nature === "butuh";

  return (
    <ThreeColumnLayout>
      <div className="form-page-container">
        <header className="form-header-box" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0" }}>
            Buat Postingan Baru di NeedHelp
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Pilih apakah kamu sedang butuh bantuan atau ingin menawarkan keahlian kepada sesama warga di Yogyakarta.
          </p>
        </header>

        {errors.general && (
          <div className="alert alert-error" style={{ background: "#fee2e2", border: "1px solid #ef4444", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
            ⚠️ {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="post-creator-form">
          {/* Pilihan Dua Pintu (SAYA BUTUH vs SAYA BISA) */}
          <section className="form-step-card" style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 12px 0" }}>
              1. Tentukan Jenis Postingan
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                type="button"
                onClick={() => handleNatureSelect("butuh")}
                className={`nature-selector-btn ${isNeed ? "selected-butuh" : ""}`}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: isNeed ? "2px solid var(--color-nature-butuh)" : "1px solid var(--color-border-default)",
                  background: isNeed ? "var(--color-nature-butuh-bg)" : "#f8fafc",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>🆘</div>
                <strong style={{ display: "block", color: isNeed ? "var(--color-nature-butuh)" : "var(--color-text-primary)", fontSize: "15px" }}>
                  SAYA BUTUH
                </strong>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Kamu memerlukan bantuan fisik, teman pendamping, atau rekan belajar.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNatureSelect("bisa")}
                className={`nature-selector-btn ${!isNeed ? "selected-bisa" : ""}`}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: !isNeed ? "2px solid var(--color-nature-bisa)" : "1px solid var(--color-border-default)",
                  background: !isNeed ? "var(--color-nature-bisa-bg)" : "#f8fafc",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>✨</div>
                <strong style={{ display: "block", color: !isNeed ? "var(--color-nature-bisa)" : "var(--color-text-primary)", fontSize: "15px" }}>
                  SAYA BISA
                </strong>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Kamu memiliki keahlian, waktu luang, atau tenaga untuk membantu orang lain.
                </span>
              </button>
            </div>
          </section>

          {/* Rincian Kebutuhan / Keahlian */}
          <section className="form-step-card" style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 16px 0" }}>
              2. Rincian Postingan
            </h2>

            {/* Judul */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-title" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Judul Postingan (5 - 100 karakter) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                id="post-title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={isNeed ? "Contoh: Butuh bantuan angkut lemari pindahan kos Pogung" : "Contoh: Bersedia bantu les privat kalkulus / fisika teknik"}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.title ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
              />
              {errors.title && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.title}</p>}
            </div>

            {/* Kategori */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-category" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Kategori Aktivitas <span style={{ color: "red" }}>*</span>
              </label>
              <select
                id="post-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.category ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
              >
                <option value="">-- Pilih Kategori --</option>
                <option value="bantuan">Bantuan Fisik / Tenaga</option>
                <option value="pendampingan">Pendampingan & Belajar</option>
                <option value="ditemani">Ditemani (Ngopi / Makan / Teman Situasional)</option>
                <option value="explore">Explore Jogja / Jalan-jalan</option>
              </select>
              {errors.category && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.category}</p>}
            </div>

            {/* Deskripsi */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-description" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Deskripsi Lengkap (20 - 1000 karakter) <span style={{ color: "red" }}>*</span>
              </label>
              <textarea
                id="post-description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Jelaskan kebutuhanmu atau tawaran keahlianmu secara rinci, termasuk ekspektasi dan kondisi lapangan..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.description ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                <span>Minimal 20 karakter</span>
                <span>{formData.description.length} / 1000 karakter</span>
              </div>
              {errors.description && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.description}</p>}
            </div>
          </section>

          {/* Lokasi & Waktu */}
          <section className="form-step-card" style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 16px 0" }}>
              3. Jadwal & Titik Temu di DIY
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label htmlFor="post-date" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Tanggal Rencana <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="date"
                  id="post-date"
                  name="date"
                  value={formData.date}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.date ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
                />
                {errors.date && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.date}</p>}
              </div>

              <div>
                <label htmlFor="post-time" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Jam Mulai <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="time"
                  id="post-time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.time ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
                />
                {errors.time && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.time}</p>}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-region" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Kabupaten / Kota DIY <span style={{ color: "red" }}>*</span>
              </label>
              <select
                id="post-region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.region ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
              >
                <option value="">-- Pilih Wilayah DIY --</option>
                <option value="sleman">Sleman</option>
                <option value="kota">Kota Yogyakarta</option>
                <option value="bantul">Bantul</option>
                <option value="kulonprogo">Kulon Progo</option>
                <option value="gunungkidul">Gunungkidul</option>
              </select>
              {errors.region && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.region}</p>}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-address" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Titik Temu Umum / Patokan Lokasi (5 - 150 karakter) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                id="post-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Contoh: Depan Mirota Kampus UGM, Pogung Baru Blok D, atau Kafe Kopi Nuri"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: errors.address ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
              />
              <small style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>
                🔒 Catatan Keamanan: Gunakan patokan umum untuk postingan publik. Nomor kamar kos atau alamat privat dibagikan di ruang pesan privat.
              </small>
              {errors.address && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.address}</p>}
            </div>
          </section>

          {/* Imbalan & Kuota */}
          <section className="form-step-card" style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 16px 0" }}>
              4. Sistem Imbalan & Kuota
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-compensation" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Bentuk Imbalan / Kompensasi <span style={{ color: "red" }}>*</span>
              </label>
              <select
                id="post-compensation"
                name="compensation"
                value={formData.compensation}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
              >
                <option value="tarif">Tarif Pasti (Nominal Uang)</option>
                <option value="nego">Nego di Chat (Sesuai Kesepakatan)</option>
                <option value="patungan">Patungan Biaya (Bensin / Tiket / Pesanan)</option>
                <option value="bayarsendiri">Bayar Sendiri-sendiri (Contoh: Nongkrong / Makan)</option>
                <option value="traktir">Traktir Makan / Minum</option>
                <option value="sukarela">Sukarela (Tanpa Imbalan Finansial)</option>
              </select>
            </div>

            {formData.compensation === "tarif" && (
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="post-amount" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Nominal Tarif (Rupiah) <span style={{ color: "red" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ padding: "10px 12px", background: "#f1f5f9", border: "1px solid var(--color-border-default)", borderRight: "none", borderRadius: "6px 0 0 6px", fontSize: "14px", fontWeight: "600" }}>Rp</span>
                  <input
                    type="number"
                    id="post-amount"
                    name="amount"
                    value={formData.amount}
                    min="1000"
                    step="5000"
                    onChange={handleChange}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: "0 6px 6px 0", border: errors.amount ? "1px solid var(--color-error)" : "1px solid var(--color-border-default)" }}
                  />
                </div>
                {errors.amount && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "4px 0 0" }}>{errors.amount}</p>}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="post-comp-note" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Catatan Imbalan Tambahan (Opsional)
              </label>
              <input
                type="text"
                id="post-comp-note"
                name="compensationNote"
                value={formData.compensationNote}
                onChange={handleChange}
                placeholder="Contoh: Ditambah uang bensin Rp15.000 atau traktiran es teh"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
              />
            </div>

            {isNeed && (
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="post-quota" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Jumlah Orang / Partner yang Dibutuhkan (Kuota)
                </label>
                <input
                  type="number"
                  id="post-quota"
                  name="quota"
                  value={formData.quota}
                  min="1"
                  max="10"
                  onChange={handleChange}
                  style={{ width: "120px", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                />
                <small style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", marginTop: "4px" }}>
                  Postingan akan otomatis tertutup jika seluruh kuota telah resmi disepakati di chat.
                </small>
              </div>
            )}
          </section>

          {/* Persetujuan Syarat */}
          <section className="form-step-card" style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                style={{ marginTop: "3px" }}
              />
              <span style={{ fontSize: "13px", lineHeight: "1.4", color: "var(--color-text-secondary)" }}>
                Saya menyatakan informasi ini benar, menjunjung kesopanan, dan menyetujui pedoman saling percaya komunitas NeedHelp Jogja.
              </span>
            </label>
            {errors.terms && <p style={{ color: "var(--color-error)", fontSize: "12px", margin: "6px 0 0 24px" }}>{errors.terms}</p>}
          </section>

          {/* Tombol Aksi */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Link href="/katalog" className="button button-outline" style={{ padding: "10px 20px" }}>
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="button button-primary"
              style={{ padding: "10px 28px", fontWeight: "600" }}
            >
              {submitting ? "Menerbitkan..." : "🚀 Terbitkan Postingan"}
            </button>
          </div>
        </form>
      </div>
    </ThreeColumnLayout>
  );
}

export default function BuatPostinganPage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "800px", margin: "40px auto", padding: "0 16px" }}><div style={{ height: "400px", background: "#fff", borderRadius: "12px" }} /></div>}>
      <BuatPostinganContent />
    </Suspense>
  );
}
