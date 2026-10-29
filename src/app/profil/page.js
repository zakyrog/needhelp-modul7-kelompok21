"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readSession, getSupabaseUser } from "../../lib/auth.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";
import { fetchCurrentProfile, updateProfile } from "../../lib/data.js";
import { validateProfile } from "../../lib/validation.js";
import { useToast } from "../../components/Toast";

export default function ProfilPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("/assets/images/avatar-user.svg");
  const [errors, setErrors] = useState({});
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Cek autentikasi dan load profil
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      const session = readSession();
      if (!session) {
        showToast("Silakan masuk terlebih dahulu untuk mengakses profil.", "info");
        router.replace("/login?next=/profil");
        return;
      }

      if (isSupabaseConfigured()) {
        // Verifikasi token masih valid
        const user = await getSupabaseUser();
        if (!user) {
          if (!isCancelled) {
            showToast("Sesi Anda telah berakhir. Silakan masuk kembali.", "error");
            router.replace("/login?next=/profil");
          }
          return;
        }

        // Ambil profil dari Supabase
        const profile = await fetchCurrentProfile();
        if (!isCancelled) {
          if (profile) {
            setName(profile.name || "");
            setBio(profile.bio || "");
            setAvatarUrl(profile.avatar_url || "/assets/images/avatar-user.svg");
          }
          setProfileLoaded(true);
          setLoading(false);
        }
      } else {
        // Mode demo: gunakan data sesi
        if (!isCancelled) {
          setName(session.name || "Pengguna Demo");
          setBio("");
          setProfileLoaded(true);
          setLoading(false);
        }
      }
    }

    init();
    return () => { isCancelled = true; };
  }, [router, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const validationErrors = validateProfile(name, bio);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Terdapat kesalahan isian. Mohon periksa kembali.", "error");
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      if (!isSupabaseConfigured()) {
        showToast("Edit profil hanya tersedia saat Supabase terkonfigurasi.", "info");
        setSaving(false);
        return;
      }

      const trimmedName = name.trim();
      const trimmedBio = bio.trim();
      const newInitial = trimmedName ? trimmedName.charAt(0).toUpperCase() : "N";

      const { data, error } = await updateProfile({
        name: trimmedName,
        bio: trimmedBio,
        initial: newInitial,
      });

      if (error || !data) {
        setErrors({ general: error || "Gagal menyimpan perubahan profil." });
        showToast(error || "Gagal menyimpan perubahan profil.", "error");
        setSaving(false);
        return;
      }

      // Perbarui cache sesi Supabase agar Header langsung terupdate
      try {
        const supabaseCacheKey = "needhelp.supabase-session";
        const raw = window.localStorage.getItem(supabaseCacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          cached.name = trimmedName;
          window.localStorage.setItem(supabaseCacheKey, JSON.stringify(cached));
          // Trigger storage event agar Header re-sync
          window.dispatchEvent(new Event("storage"));
        }
      } catch {}

      showToast("Profil berhasil diperbarui!", "success");
      setSaving(false);
    } catch (err) {
      setErrors({ general: err.message || "Terjadi kesalahan saat menyimpan." });
      showToast(err.message || "Terjadi kesalahan saat menyimpan.", "error");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="form-page-wrapper">
        <div style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <p>Memuat profil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="form-page-wrapper">
      <div className="form-container-box">
        <header style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>
            Edit Profil
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Perbarui informasi profil Anda yang ditampilkan kepada pengguna lain.
          </p>
        </header>

        {errors.general && (
          <div
            role="alert"
            style={{
              background: "#fee2e2",
              border: "1px solid #ef4444",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: 500,
            }}
          >
            ⚠ {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Avatar Preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <img
              src={avatarUrl}
              alt="Foto profil"
              width={64}
              height={64}
              style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px 0" }}>
                Foto Profil
              </p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                Unggah foto profil akan tersedia setelah Supabase Storage dikonfigurasi.
              </p>
            </div>
          </div>

          <div className="fields">
            {/* Nama */}
            <div className="field">
              <label htmlFor="profile-name">Nama Lengkap</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Nama tampilan Anda"
                maxLength={60}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "profile-name-error" : undefined}
                disabled={saving}
              />
              {errors.name && (
                <small id="profile-name-error" className="field-error" role="alert">
                  {errors.name}
                </small>
              )}
            </div>

            {/* Bio */}
            <div className="field">
              <label htmlFor="profile-bio">Bio Singkat</label>
              <textarea
                id="profile-bio"
                name="bio"
                rows={3}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  if (errors.bio) setErrors((prev) => ({ ...prev, bio: undefined }));
                }}
                placeholder="Ceritakan sedikit tentang diri Anda..."
                maxLength={200}
                aria-invalid={Boolean(errors.bio)}
                aria-describedby={errors.bio ? "profile-bio-error" : undefined}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--spacing-md)",
                  fontSize: "14px",
                  resize: "vertical",
                  minHeight: "80px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {errors.bio ? (
                  <small id="profile-bio-error" className="field-error" role="alert">
                    {errors.bio}
                  </small>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  {bio.length}/200
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <Link href="/" className="button button-outline">
              Batal
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
