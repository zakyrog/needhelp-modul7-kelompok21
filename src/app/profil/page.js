"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readSession, getSupabaseUser } from "../../lib/auth.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";
import { fetchCurrentProfile, updateProfile } from "../../lib/data.js";
import { validateProfile } from "../../lib/validation.js";
import {
  getAvatarOptions,
  resolveAvatarSrc,
  DEMO_PROFILE_KEY,
} from "../../lib/avatars.js";
import { useToast } from "../../components/Toast";
import { SvgIcon } from "../../components/Icons.jsx";

const AVATAR_OPTIONS = getAvatarOptions();

export default function ProfilPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarKey, setAvatarKey] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [errors, setErrors] = useState({});

  // Cek autentikasi dan load profil (logika tidak diubah)
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      const activeSession = readSession();
      if (!activeSession) {
        showToast("Silakan masuk terlebih dahulu untuk mengakses profil.", "info");
        router.replace("/login?next=/profil");
        return;
      }
      setSession(activeSession);

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
            setAvatarKey(profile.avatar_key || null);
            setAvatarUrl(profile.avatar_url || null);
          }
          setLoading(false);
        }
      } else {
        // Mode demo: nama dari sesi, avatar pilihan dari cache lokal.
        if (!isCancelled) {
          let demoProfile = null;
          try {
            const raw = window.localStorage.getItem(DEMO_PROFILE_KEY);
            if (raw) demoProfile = JSON.parse(raw);
          } catch {
            demoProfile = null;
          }
          setName(demoProfile?.name || activeSession.name || "Pengguna Demo");
          setBio(demoProfile?.bio || "");
          setAvatarKey(demoProfile?.avatarKey || null);
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

    const validationErrors = validateProfile(name, bio, avatarKey);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Terdapat kesalahan isian. Mohon periksa kembali.", "error");
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const trimmedName = name.trim();
      const trimmedBio = bio.trim();
      const newInitial = trimmedName ? trimmedName.charAt(0).toUpperCase() : "N";

      // Mode demo: simpan ke cache lokal agar pilihan avatar (dan nama/bio)
      // tetap ada setelah reload. Tidak ada data palsu — hanya menyimpan apa
      // yang benar-benar diketik/dipilih pengguna.
      if (!isSupabaseConfigured()) {
        try {
          window.localStorage.setItem(
            DEMO_PROFILE_KEY,
            JSON.stringify({ name: trimmedName, bio: trimmedBio, avatarKey }),
          );
          // setItem di tab yang sama tidak memicu event "storage"; kirim sinyal
          // agar Header memuat ulang avatar tanpa perlu refresh halaman.
          window.dispatchEvent(new Event("storage"));
        } catch {}
        showToast("Profil demo tersimpan di perangkat ini.", "info");
        setSaving(false);
        return;
      }

      const { data, error, avatarKeySkipped } = await updateProfile({
        name: trimmedName,
        bio: trimmedBio,
        initial: newInitial,
        avatar_key: avatarKey,
      });

      if (error || !data) {
        setErrors({ general: error || "Gagal menyimpan perubahan profil." });
        showToast(error || "Gagal menyimpan perubahan profil.", "error");
        setSaving(false);
        return;
      }

      if (avatarKeySkipped) {
        // DB belum punya kolom avatar_key; nama/bio tersimpan tetapi avatar tidak.
        showToast(
          "Nama dan bio tersimpan, tetapi avatar belum dapat disimpan. Hubungi admin untuk menjalankan migration 015.",
          "error",
        );
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
      <main className="profile-page">
        <p className="profile-loading" role="status">
          <SvgIcon name="hourglass" size={18} strokeWidth={2} />
          Memuat profil...
        </p>
      </main>
    );
  }

  const resolvedAvatar = resolveAvatarSrc({ key: avatarKey, url: avatarUrl });
  const displayName = (name || "").trim() || (session?.name || "Pengguna").trim() || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();
  const email = session?.email || "";

  return (
    <main className="profile-page">
      {/* ===== Header editorial ===== */}
      <header className="profile-hero-header">
        <p className="profile-eyebrow">
          <SvgIcon name="person" size={14} strokeWidth={2} />
          Profil &amp; Akun
        </p>
        <h1>Profil Saya</h1>
        <p className="profile-lede">
          Kelola identitas yang tampil kepada komunitas saat kamu meminta atau
          menawarkan bantuan di sekitar Yogyakarta.
        </p>
      </header>

      <div className="profile-shell">
        {/* ===== Kartu identitas (info yang benar-benar tersedia) ===== */}
        <section className="profile-identity" aria-label="Identitas profil">
          <div className="profile-identity-top">
            <span className="profile-identity-avatar" aria-hidden="true">
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt="" width={72} height={72} />
              ) : (
                <span className="profile-identity-initial">{initial}</span>
              )}
            </span>
            <div className="profile-identity-body">
              <h2>{displayName}</h2>
              {email && (
                <p className="profile-identity-email">
                  <SvgIcon name="mail" size={14} strokeWidth={2} />
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="profile-identity-bio">
            {bio.trim() ? (
              <p>&ldquo;{bio.trim()}&rdquo;</p>
            ) : (
              <p className="profile-identity-bio-empty">
                Belum ada bio. Tambahkan sedikit cerita tentang dirimu di bawah.
              </p>
            )}
          </div>
        </section>

        {/* ===== Form edit (hanya nama + bio — tidak ada lokasi/upload) ===== */}
        <section className="profile-edit-card" aria-labelledby="profile-edit-title">
          <header className="profile-edit-header">
            <h2 id="profile-edit-title">Perbarui Profil</h2>
            <p className="profile-edit-sub">
              Perbarui informasi yang ditampilkan kepada pengguna lain.
            </p>
          </header>

          {errors.general && (
            <p className="error-banner" role="alert">
              <SvgIcon name="warning" size={16} strokeWidth={2} />
              {errors.general}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Avatar ilustrasi — pilih salah satu, atau pakai inisial nama */}
            <div className="profile-avatar-picker">
              <div className="profile-avatar-preview">
                <span className="profile-avatar-static" aria-hidden="true">
                  {resolvedAvatar ? (
                    <img src={resolvedAvatar} alt="" width={56} height={56} />
                  ) : (
                    <span className="profile-avatar-static-initial">{initial}</span>
                  )}
                </span>
                <div>
                  <p className="profile-avatar-label">Avatar Profil</p>
                  <p className="profile-avatar-note">
                    {avatarKey
                      ? "Pilihan avatar ini akan tampil di Header dan identitasmu."
                      : "Saat ini memakai inisial nama sebagai avatar default."}
                  </p>
                </div>
              </div>

              <div
                className="profile-avatar-options"
                role="radiogroup"
                aria-label="Pilih avatar profil"
              >
                <label
                  className={`profile-avatar-option${avatarKey === null ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="avatar_key"
                    value=""
                    checked={avatarKey === null}
                    onChange={() => setAvatarKey(null)}
                    disabled={saving}
                  />
                  <span className="profile-avatar-option-medium profile-avatar-option-none">
                    <span className="profile-avatar-option-none-initial" aria-hidden="true">
                      {initial}
                    </span>
                  </span>
                  <span className="profile-avatar-option-label">Inisial</span>
                  {avatarKey === null && (
                    <span className="profile-avatar-option-check" aria-hidden="true">
                      <SvgIcon name="check" size={14} strokeWidth={2.4} />
                    </span>
                  )}
                </label>

                {AVATAR_OPTIONS.map((option) => {
                  const selected = avatarKey === option.key;
                  return (
                    <label
                      key={option.key}
                      className={`profile-avatar-option${selected ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="avatar_key"
                        value={option.key}
                        checked={selected}
                        onChange={() => setAvatarKey(option.key)}
                        disabled={saving}
                      />
                      <span className="profile-avatar-option-medium" aria-hidden="true">
                        <img src={option.src} alt="" width={48} height={48} loading="lazy" />
                      </span>
                      <span className="profile-avatar-option-label">{option.label}</span>
                      {selected && (
                        <span className="profile-avatar-option-check" aria-hidden="true">
                          <SvgIcon name="check" size={14} strokeWidth={2.4} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {errors.avatarKey && (
                <p className="field-error" role="alert">{errors.avatarKey}</p>
              )}
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
                  rows={4}
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    if (errors.bio) setErrors((prev) => ({ ...prev, bio: undefined }));
                  }}
                  placeholder="Ceritakan sedikit tentang diri Anda..."
                  maxLength={200}
                  aria-invalid={Boolean(errors.bio)}
                  aria-describedby={errors.bio ? "profile-bio-error" : "profile-bio-count"}
                  disabled={saving}
                />
                <div className="profile-bio-meta">
                  {errors.bio ? (
                    <small id="profile-bio-error" className="field-error" role="alert">
                      {errors.bio}
                    </small>
                  ) : (
                    <span />
                  )}
                  <span id="profile-bio-count" className="profile-bio-count">
                    {bio.length}/200
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <Link href="/" className="button button-outline">
                Batal
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}