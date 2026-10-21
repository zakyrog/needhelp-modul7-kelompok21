"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getPost, getPublicPost, getPostAuthor, saveMessage } from "../../lib/data";
import { validateHelpProposal } from "../../lib/validation";
import { FormField } from "../../components/FormField";
import { useToast } from "../../components/Toast";
import { SimulationBanner } from "../../components/SimulationBanner";

function FormBantuanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const postId = searchParams.get("id") || "post-pindahan";
  const post = getPost(postId) || getPublicPost(postId);
  const author = post ? getPostAuthor(post) : { name: "Sari Wijaya", initial: "S" };

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    helper_name: "Patungin Hadi",
    helper_whatsapp: "0812-3456-7890",
    helper_message: `Halo ${author.name}, aku siap membantu. Punya kendaraan dan waktu luang.`,
    helper_time: "Sabtu, 10.00 – 13.00",
    helper_note: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNextToReview = (e) => {
    e.preventDefault();
    const valErrors = validateHelpProposal(formData);
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      showToast("Terdapat kesalahan isian formulir. Mohon periksa kembali.", "error");
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleFinalSubmit = () => {
    try {
      if (post && post.authorId) {
        saveMessage(
          post.authorId,
          `[Penawaran Bantuan Baru] ${formData.helper_message} (Kontak: ${formData.helper_whatsapp}, Waktu: ${formData.helper_time})`,
          post.title,
        );
      }
      setStep(3);
      showToast("Tawaran bantuan berhasil dikirimkan!", "success");
    } catch {
      showToast("Gagal menyimpan tawaran bantuan.", "error");
    }
  };

  return (
    <main className="form-page-wrapper">
      <div className="form-container-box">
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-item${step >= 1 ? " active" : ""}`}>
            <span className="step-num">1</span>
            <span>Isi Form</span>
          </div>
          <span className="step-line" />
          <div className={`step-item${step >= 2 ? " active" : ""}`}>
            <span className="step-num">2</span>
            <span>Review</span>
          </div>
          <span className="step-line" />
          <div className={`step-item${step >= 3 ? " active" : ""}`}>
            <span className="step-num">3</span>
            <span>Konfirmasi</span>
          </div>
        </div>

        {/* Target Request Info */}
        <div className="target-request-info">
          <span className="requester-avatar-sm">{author.initial || "S"}</span>
          <div className="target-text">
            <small>Membantu permintaan dari</small>
            <strong>
              {author.name} &bull; {post ? post.title : "Butuh bantuan"}
            </strong>
          </div>
        </div>

        <SimulationBanner text="Formulir bantuan ini terhubung dengan alur obrolan dan pencatatan aktivitas." />

        {/* STEP 1: FORM INPUT */}
        {step === 1 && (
          <form onSubmit={handleNextToReview} className="bantu-form" noValidate>
            <FormField
              id="helper-name"
              label="Nama Lengkap"
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
                placeholder="0812-xxxx-xxxx"
                aria-invalid={Boolean(errors.helper_whatsapp)}
              />
            </FormField>

            <FormField
              id="helper-message"
              label={`Pesan untuk ${author.name}`}
              required
              error={errors.helper_message}
            >
              <textarea
                id="helper-message"
                name="helper_message"
                rows={3}
                value={formData.helper_message}
                onChange={handleChange}
                placeholder="Tulis pesan yang ramah dan jelaskan bantuan yang kamu tawarkan..."
                aria-invalid={Boolean(errors.helper_message)}
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
                placeholder="Contoh: Sabtu, 10.00 – 13.00"
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
                placeholder="Catatan khusus atau alat yang kamu bawa..."
              />
            </FormField>

            <div className="form-actions" style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Link
                href={`/detail-postingan?id=${encodeURIComponent(postId)}`}
                className="button button-outline"
              >
                Batal
              </Link>
              <button type="submit" className="button button-primary">
                Lanjut ke Review &rarr;
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: REVIEW */}
        {step === 2 && (
          <div className="review-section" style={{ padding: "16px 0" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 16px 0" }}>
              Tinjau Pengajuan Bantuan
            </h2>
            <div
              style={{
                background: "var(--color-bg-default)",
                padding: "20px",
                borderRadius: "10px",
                lineHeight: "1.8",
                fontSize: "14px",
              }}
            >
              <p>
                <strong>Nama Relawan:</strong> {formData.helper_name}
              </p>
              <p>
                <strong>Kontak WhatsApp:</strong> {formData.helper_whatsapp}
              </p>
              <p>
                <strong>Waktu Tersedia:</strong> {formData.helper_time}
              </p>
              <p>
                <strong>Pesan untuk Pemohon:</strong> {formData.helper_message}
              </p>
              {formData.helper_note && (
                <p>
                  <strong>Catatan Tambahan:</strong> {formData.helper_note}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setStep(1)}
              >
                &larr; Ubah Isian
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleFinalSubmit}
              >
                Kirim Pengajuan Sekarang ✓
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--color-bg-subtle)",
                color: "var(--color-action-primary)",
                fontSize: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>
              Tawaran Bantuan Terkirim!
            </h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 24px auto" }}>
              {author.name} akan menerima tawaran bantuanmu. Kamu dapat melanjutkan obrolan langsung untuk menyepakati titik kumpul.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href={`/chat?user=${encodeURIComponent(post?.authorId || "sari-wijaya")}&topic=${encodeURIComponent(post?.title || "")}`}
                className="button button-primary"
              >
                Buka Obrolan dengan {author.name}
              </Link>
              <Link href="/katalog" className="button button-outline">
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function FormBantuanPage() {
  return (
    <Suspense fallback={<div className="form-page-wrapper"><p>Memuat formulir bantuan...</p></div>}>
      <FormBantuanContent />
    </Suspense>
  );
}
