"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthUser, readSession, getUserProfile, updateUserProfile } from "../../lib/auth.js";
import { fetchPublicPosts } from "../../lib/data.js";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { CatalogCard } from "../../components/CatalogCard";
import { useToast } from "../../components/Toast";

export default function ProfilPage() {
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // User posts
  const [myPosts, setMyPosts] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const authUser = await getAuthUser();
        if (authUser && isMounted) {
          setUser(authUser);
          const prof = await getUserProfile(authUser.id);
          if (prof && isMounted) {
            setProfile(prof);
            setFullName(prof.full_name || "");
            setBio(prof.bio || "");
          }
        } else {
          const localSess = readSession();
          if (localSess && isMounted) {
            setUser({ id: localSess.id || "local-user", email: localSess.email });
            setProfile({
              full_name: localSess.name,
              bio: "Mahasiswa / Warga Yogyakarta",
              rating_average: 0.0,
              rating_count: 0,
            });
            setFullName(localSess.name || "");
            setBio("Mahasiswa / Warga Yogyakarta");
          }
        }

        // Ambil postingan pengguna
        const allPosts = await fetchPublicPosts();
        if (isMounted && allPosts) {
          const currentId = authUser?.id || "demo-user";
          setMyPosts(allPosts.filter((p) => p.author_id === currentId || p.authorId === currentId));
        }
      } catch (err) {
        console.warn("Error loading profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => { isMounted = false; };
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast("Nama lengkap tidak boleh kosong.", "error");
      return;
    }

    setSaving(true);
    try {
      if (user?.id) {
        await updateUserProfile(user.id, {
          full_name: fullName.trim(),
          bio: bio.trim(),
        });
      }
      setProfile((prev) => ({
        ...prev,
        full_name: fullName.trim(),
        bio: bio.trim(),
      }));
      setIsEditing(false);
      showToast("Profil berhasil diperbarui!", "success");
    } catch (err) {
      showToast(err.message || "Gagal memperbarui profil.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThreeColumnLayout>
        <div style={{ padding: "40px", background: "#fff", borderRadius: "12px" }}>
          <div style={{ height: "30px", width: "40%", background: "#e2e8f0", marginBottom: "16px", borderRadius: "4px" }} />
          <div style={{ height: "16px", width: "60%", background: "#e2e8f0", borderRadius: "4px" }} />
        </div>
      </ThreeColumnLayout>
    );
  }

  if (!user) {
    return (
      <ThreeColumnLayout>
        <div style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "40px 20px", textAlign: "center" }}>
          <span style={{ fontSize: "40px" }}>👤</span>
          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "12px 0 6px" }}>
            Masuk untuk Melihat Profil
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 20px" }}>
            Kelola profil, pantau reputasi rating, dan lihat seluruh postingan yang telah kamu pasang di NeedHelp Jogja.
          </p>
          <Link href="/login" className="button button-primary" style={{ padding: "10px 28px" }}>
            Masuk ke Akun
          </Link>
        </div>
      </ThreeColumnLayout>
    );
  }

  const displayName = profile?.full_name || fullName || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();
  const ratingAvg = Number(profile?.rating_average || 0).toFixed(1);
  const ratingCount = profile?.rating_count || 0;

  return (
    <ThreeColumnLayout>
      {/* 1. Profil Card */}
      <section className="feed-card" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "var(--color-action-primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "700",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 4px" }}>
              {displayName}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 8px" }}>
              {profile?.bio || "Mahasiswa / Warga Yogyakarta"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              {ratingCount > 0 ? (
                <span className="profile-rating-badge">
                  ⭐ <strong>{ratingAvg}</strong> ({ratingCount} ulasan tuntas)
                </span>
              ) : (
                <span className="profile-rating-badge rating-badge-new">
                  ⭐ <strong>Anggota Baru</strong> (Belum ada ulasan)
                </span>
              )}
              <span style={{ color: "var(--color-text-light)" }}>•</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                UID: {user.id ? `${user.id.slice(0, 8)}...` : "Demo"}
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Batal Edit" : "✏️ Edit Profil"}
            </button>
          </div>
        </div>

        {/* 2. Form Edit Profil */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--color-border-subtle)", marginTop: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 12px" }}>
              Perbarui Informasi Profil Publik
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="edit-name" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                id="edit-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="edit-bio" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                Bio Singkat (Status Mahasiswa / Wilayah)
              </label>
              <input
                type="text"
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Contoh: Mahasiswi Fakultas Teknik UGM / Domisili Pogung Baru"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button button-sm button-outline"
                onClick={() => setIsEditing(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="button button-sm button-primary"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 3. Daftar Postingan Pengguna */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
            Postingan yang Saya Pasang ({myPosts.length})
          </h2>
          <Link href="/buat-postingan" className="button button-sm button-primary">
            + Buat Postingan Baru
          </Link>
        </div>

        {myPosts.length > 0 ? (
          myPosts.map((post) => (
            <CatalogCard key={post.id} post={post} backUrl="/profil" />
          ))
        ) : (
          <div style={{ background: "#fff", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "0 0 16px" }}>
              Kamu belum memasang postingan aktif. Butuh bantuan atau ingin menawarkan keahlian?
            </p>
            <Link href="/buat-postingan" className="button button-sm button-outline">
              Pasang Postingan Pertama
            </Link>
          </div>
        )}
      </section>
    </ThreeColumnLayout>
  );
}
