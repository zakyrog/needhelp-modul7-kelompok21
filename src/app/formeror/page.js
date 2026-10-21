"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FormField } from "../../components/FormField";
import { useToast } from "../../components/Toast";

export default function FormErrorPage() {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    helper_name: "",
    helper_whatsapp: "",
    helper_message: "Halo Sari, aku siap bantu.",
    helper_time: "",
    helper_note: "",
  });

  const [errors, setErrors] = useState({
    helper_name: "Nama wajib diisi.",
    helper_whatsapp: "Nomor kontak wajib diisi.",
    helper_time: "Waktu bantuan wajib dipilih.",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (value.trim()) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleValidate = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.helper_name.trim()) newErrors.helper_name = "Nama wajib diisi.";
    if (!formData.helper_whatsapp.trim()) newErrors.helper_whatsapp = "Nomor kontak wajib diisi.";
    if (!formData.helper_time.trim()) newErrors.helper_time = "Waktu bantuan wajib dipilih.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      showToast("Semua field telah valid!", "success");
    } else {
      showToast("Masih ada kesalahan isian form.", "error");
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="form-page-wrapper">
      <div className="form-container-box">
        <div className="step-indicator">
          <div className="step-item active">
            <span className="step-num">1</span>
            <span>Isi Form</span>
          </div>
          <span className="step-line" />
          <div className="step-item">
            <span className="step-num">2</span>
            <span>Review</span>
          </div>
          <span className="step-line" />
          <div className="step-item">
            <span className="step-num">3</span>
            <span>Konfirmasi</span>
          </div>
        </div>

        <div className="target-request-info">
          <span className="requester-avatar-sm">S</span>
          <div className="target-text">
            <small>Membantu permintaan dari</small>
            <strong>Sari Wijaya &bull; Butuh bantuan pindahan kos</strong>
          </div>
        </div>

        {hasErrors && (
          <div className="error-summary-box" role="alert">
            <span className="error-icon">⚠</span>
            <p>Beberapa field belum diisi dengan benar.</p>
          </div>
        )}

        <form onSubmit={handleValidate} className="bantu-form" noValidate>
          <FormField
            id="helper-name"
            label="Nama"
            required
            error={errors.helper_name}
          >
            <input
              type="text"
              id="helper-name"
              name="helper_name"
              value={formData.helper_name}
              onChange={handleChange}
              placeholder="Nama lengkapmu"
              aria-invalid={Boolean(errors.helper_name)}
            />
          </FormField>

          <FormField
            id="helper-whatsapp"
            label="Nomor WhatsApp"
            required
            error={errors.helper_whatsapp}
          >
            <input
              type="text"
              id="helper-whatsapp"
              name="helper_whatsapp"
              value={formData.helper_whatsapp}
              onChange={handleChange}
              placeholder="08xx-xxxx-xxxx"
              aria-invalid={Boolean(errors.helper_whatsapp)}
            />
          </FormField>

          <FormField
            id="helper-message"
            label="Pesan untuk Sari"
            required
          >
            <textarea
              id="helper-message"
              name="helper_message"
              rows={3}
              value={formData.helper_message}
              onChange={handleChange}
            />
          </FormField>

          <FormField
            id="helper-time"
            label="Waktu kamu bisa membantu"
            required
            error={errors.helper_time}
          >
            <input
              type="text"
              id="helper-time"
              name="helper_time"
              value={formData.helper_time}
              onChange={handleChange}
              placeholder="Pilih waktu..."
              aria-invalid={Boolean(errors.helper_time)}
            />
          </FormField>

          <FormField
            id="helper-note"
            label="Catatan tambahan (opsional)"
          >
            <input
              type="text"
              id="helper-note"
              name="helper_note"
              value={formData.helper_note}
              onChange={handleChange}
              placeholder="Catatan khusus..."
            />
          </FormField>

          <div className="form-actions">
            <Link href="/detail-postingan?id=post-pindahan" className="btn-cancel">
              Batal
            </Link>
            <button type="submit" className="btn-submit">
              Kirim Permintaan Bantuan
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
