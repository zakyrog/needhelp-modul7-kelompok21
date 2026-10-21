"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost } from "../../lib/data.js";
import { readSession } from "../../lib/auth.js";
import { validatePost } from "../../lib/validation.js";
import { useToast } from "../../components/Toast";

export default function BuatPostinganPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);

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

  return (
    <main>
      <header>
        <h1>Formulir Pasang Postingan Baru</h1>
        <p>
          Publikasikan permintaan bantuan yang kamu butuhkan atau tawarkan waktu
          dan keahlianmu kepada orang sekitar.
        </p>
      </header>

      {errors.general && (
        <p className="error-banner" role="alert">
          {errors.general}
        </p>
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
              {errors.nature}
            </small>
          )}
        </fieldset>

        {/* 2. Informasi Utama Kebutuhan */}
        <fieldset>
          <legend>2. Detail Informasi Aktivitas</legend>
          <p>
            <label htmlFor="post-title">Judul Singkat Postingan:</label>
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
            {errors.title && (
              <small className="field-error" role="alert">
                {errors.title}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-category">Kategori Aktivitas:</label>
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
            {errors.category && (
              <small className="field-error" role="alert">
                {errors.category}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-description">
              Deskripsi Lengkap Kebutuhan / Keahlian:
            </label>
            <textarea
              id="post-description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              placeholder="Jelaskan kebutuhan secara spesifik, barang yang dibawa, titik temu, atau keahlian yang kamu tawarkan..."
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description && (
              <small className="field-error" role="alert">
                {errors.description}
              </small>
            )}
          </p>
        </fieldset>

        {/* 3. Waktu & Lokasi Pelaksanaan */}
        <fieldset>
          <legend>3. Waktu &amp; Lokasi Pelaksanaan</legend>
          <p>
            <label htmlFor="post-date">Tanggal Rencana:</label>
            <input
              type="date"
              id="post-date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date && (
              <small className="field-error" role="alert">
                {errors.date}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-time">Waktu / Jam Mulai:</label>
            <input
              type="time"
              id="post-time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              aria-invalid={Boolean(errors.time)}
            />
            {errors.time && (
              <small className="field-error" role="alert">
                {errors.time}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-region">Wilayah Kabupaten/Kota:</label>
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
            {errors.region && (
              <small className="field-error" role="alert">
                {errors.region}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-address">Titik Lokasi / Tempat Bertemu:</label>
            <input
              type="text"
              id="post-address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Contoh: Cosan Palagan / Pogung Baru Blok D"
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && (
              <small className="field-error" role="alert">
                {errors.address}
              </small>
            )}
          </p>

          <p>
            <label htmlFor="post-destination">Titik Tujuan (Opsional):</label>
            <input
              type="text"
              id="post-destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Contoh: Kos Baru di Jl. Palagan KM 8"
            />
          </p>
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
            <p>
              <label htmlFor="comp-amount">Nominal Tarif (Rp):</label>
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
              {errors.amount && (
                <small className="field-error" role="alert">
                  {errors.amount}
                </small>
              )}
            </p>
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
              {errors.compensation}
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
              {errors.terms}
            </small>
          )}

          <p style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
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
          </p>
        </fieldset>
      </form>
    </main>
  );
}
