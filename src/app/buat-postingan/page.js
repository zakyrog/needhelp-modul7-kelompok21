"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost } from "../../lib/data";
import { readSession } from "../../lib/auth";
import { validatePost } from "../../lib/validation";
import { FormField } from "../../components/FormField";
import { useToast } from "../../components/Toast";
import { SimulationBanner } from "../../components/SimulationBanner";

export default function BuatPostinganPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [formData, setFormData] = useState({
    nature: "butuh",
    title: "",
    category: "",
    description: "",
    date: "",
    time: "",
    region: "",
    address: "",
    destination: "",
    compensation: "tarif",
    amount: "50000",
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentSession = readSession();
    if (!currentSession) {
      showToast("Silakan masuk dengan akun demo untuk membuat postingan.", "info");
      router.replace("/login?next=/buat-postingan");
    } else {
      setSession(currentSession);
      setCheckingAuth(false);
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validatePost(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Terdapat kesalahan isian formulir. Mohon periksa kembali.", "error");
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const newPost = createPost(formData, session);
      if (!newPost || !newPost.id) {
        throw new Error("Gagal menyimpan postingan ke penyimpanan lokal.");
      }
      showToast("Postingan berhasil diterbitkan!", "success");
      router.push(`/sukses-postingan?id=${encodeURIComponent(newPost.id)}`);
    } catch (err) {
      setSubmitting(false);
      setErrors({
        general: err.message || "Gagal menyimpan postingan ke penyimpanan browser.",
      });
      showToast("Gagal menyimpan postingan.", "error");
    }
  };

  if (checkingAuth) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <p>Memeriksa sesi demo...</p>
      </main>
    );
  }

  return (
    <main className="form-page">
      <header>
        <h1>Formulir Pasang Postingan Baru</h1>
        <p>
          Publikasikan permintaan bantuan yang kamu butuhkan atau tawarkan waktu
          dan keahlianmu kepada orang sekitar.
        </p>
      </header>

      <SimulationBanner text="Postingan yang kamu buat akan tersimpan di penyimpanan browser lokal dan langsung muncul di Katalog & Aktivitas." />

      {errors.general && (
        <div className="error-banner" role="alert" style={{ marginBottom: "20px" }}>
          ⚠ {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* 1. Jenis Pintu Masuk Postingan */}
        <fieldset>
          <legend>1. Pilih Jenis Pintu Masuk Postingan</legend>
          <p>
            <input
              type="radio"
              id="post-need"
              name="nature"
              value="butuh"
              checked={formData.nature === "butuh"}
              onChange={handleChange}
            />
            <label htmlFor="post-need">
              <strong>Saya Butuh</strong> &mdash; Saya membutuhkan bantuan atau
              teman pendamping
            </label>
          </p>
          <p>
            <input
              type="radio"
              id="post-can"
              name="nature"
              value="bisa"
              checked={formData.nature === "bisa"}
              onChange={handleChange}
            />
            <label htmlFor="post-can">
              <strong>Saya Bisa</strong> &mdash; Saya memiliki keahlian atau
              waktu luang untuk membantu
            </label>
          </p>
          {errors.nature && (
            <small className="field-error" role="alert">
              ⚠ {errors.nature}
            </small>
          )}
        </fieldset>

        {/* 2. Informasi Utama Kebutuhan */}
        <fieldset>
          <legend>2. Detail Informasi Aktivitas</legend>

          <FormField
            id="post-title"
            label="Judul Singkat Postingan"
            required
            error={errors.title}
          >
            <input
              type="text"
              id="post-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Contoh: Butuh teman ngopi santai di Palagan"
              maxLength={100}
              aria-invalid={Boolean(errors.title)}
            />
          </FormField>

          <FormField
            id="post-category"
            label="Kategori Aktivitas"
            required
            error={errors.category}
          >
            <select
              id="post-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              aria-invalid={Boolean(errors.category)}
            >
              <option value="">-- Pilih Kategori --</option>
              <option value="ditemani">
                Ditemani (Gym, Ngopi, Nonton, Mancing)
              </option>
              <option value="bantuan">
                Bantuan Fisik (Pindahan kos, Angkat barang, Bersih-bersih)
              </option>
              <option value="pendampingan">
                Pendampingan (Diskusi tugas, Beli barang elektronik)
              </option>
              <option value="explore">
                Explore (Wisata, Kuliner murah, Hidden gem)
              </option>
            </select>
          </FormField>

          <FormField
            id="post-description"
            label="Deskripsi Lengkap Kebutuhan / Keahlian"
            required
            error={errors.description}
          >
            <textarea
              id="post-description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              placeholder="Jelaskan kebutuhan secara spesifik, barang yang dibawa, titik temu, atau keahlian yang kamu tawarkan (minimal 20 karakter)..."
              aria-invalid={Boolean(errors.description)}
            />
          </FormField>
        </fieldset>

        {/* 3. Waktu & Lokasi Pelaksanaan */}
        <fieldset>
          <legend>3. Waktu &amp; Lokasi Pelaksanaan</legend>

          <FormField
            id="post-date"
            label="Tanggal Rencana"
            required
            error={errors.date}
          >
            <input
              type="date"
              id="post-date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              aria-invalid={Boolean(errors.date)}
            />
          </FormField>

          <FormField
            id="post-time"
            label="Waktu / Jam Mulai"
            required
            error={errors.time}
          >
            <input
              type="time"
              id="post-time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              aria-invalid={Boolean(errors.time)}
            />
          </FormField>

          <FormField
            id="post-region"
            label="Wilayah Kabupaten/Kota"
            required
            error={errors.region}
          >
            <select
              id="post-region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              aria-invalid={Boolean(errors.region)}
            >
              <option value="">-- Pilih Wilayah --</option>
              <option value="sleman">Kabupaten Sleman</option>
              <option value="kota">Kota Yogyakarta</option>
              <option value="bantul">Kabupaten Bantul</option>
              <option value="kulonprogo">Kabupaten Kulon Progo</option>
              <option value="gunungkidul">Kabupaten Gunungkidul</option>
            </select>
          </FormField>

          <FormField
            id="post-address"
            label="Titik Lokasi / Tempat Bertemu"
            required
            error={errors.address}
          >
            <input
              type="text"
              id="post-address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Contoh: Cosan Palagan / Pogung Baru Blok D"
              aria-invalid={Boolean(errors.address)}
            />
          </FormField>

          <FormField
            id="post-destination"
            label="Titik Tujuan (Opsional, untuk pindahan / antar barang)"
          >
            <input
              type="text"
              id="post-destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Contoh: Kos Baru di Jl. Palagan KM 8"
            />
          </FormField>
        </fieldset>

        {/* 4. Sistem Kompensasi / Imbalan */}
        <fieldset>
          <legend>4. Sistem Kompensasi / Imbalan</legend>
          <p>
            <input
              type="radio"
              id="comp-fixed"
              name="compensation"
              value="tarif"
              checked={formData.compensation === "tarif"}
              onChange={handleChange}
            />
            <label htmlFor="comp-fixed">Tarif Pasti (Nominal Uang)</label>
          </p>

          {formData.compensation === "tarif" && (
            <FormField
              id="comp-amount"
              label="Nominal Tarif (Rp)"
              required
              error={errors.amount}
            >
              <input
                type="number"
                id="comp-amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="5000"
                placeholder="50000"
                aria-invalid={Boolean(errors.amount)}
              />
            </FormField>
          )}

          <p>
            <input
              type="radio"
              id="comp-nego"
              name="compensation"
              value="nego"
              checked={formData.compensation === "nego"}
              onChange={handleChange}
            />
            <label htmlFor="comp-nego">Nego di Chat (Saling berdiskusi)</label>
          </p>
          <p>
            <input
              type="radio"
              id="comp-split"
              name="compensation"
              value="patungan"
              checked={formData.compensation === "patungan"}
              onChange={handleChange}
            />
            <label htmlFor="comp-split">
              Patungan Transport / Tiket (Split-Bill)
            </label>
          </p>
          <p>
            <input
              type="radio"
              id="comp-treat"
              name="compensation"
              value="traktir"
              checked={formData.compensation === "traktir"}
              onChange={handleChange}
            />
            <label htmlFor="comp-treat">Traktir Makan / Minum Ngopi</label>
          </p>
          <p>
            <input
              type="radio"
              id="comp-free"
              name="compensation"
              value="sukarela"
              checked={formData.compensation === "sukarela"}
              onChange={handleChange}
            />
            <label htmlFor="comp-free">Sukarela / Gratis</label>
          </p>
          {errors.compensation && (
            <small className="field-error" role="alert">
              ⚠ {errors.compensation}
            </small>
          )}
        </fieldset>

        {/* 5. Persetujuan Komunitas */}
        <fieldset>
          <legend>5. Persetujuan Komunitas</legend>
          <p>
            <input
              type="checkbox"
              id="terms-agree"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              aria-invalid={Boolean(errors.terms)}
            />
            <label htmlFor="terms-agree">
              Saya menyetujui pedoman keamanan dan kesopanan komunitas NeedHelp
            </label>
          </p>
          {errors.terms && (
            <small className="field-error" role="alert">
              ⚠ {errors.terms}
            </small>
          )}

          <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={submitting}
            >
              {submitting ? "Menerbitkan..." : "Terbitkan Postingan Sekarang"}
            </button>
            <Link href="/katalog" className="button button-outline">
              Batal
            </Link>
          </div>
        </fieldset>
      </form>
    </main>
  );
}
