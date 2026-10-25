"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getRateableActivity, saveRating } from "../../lib/data.js";
import { getAuthUser, readSession } from "../../lib/auth.js";
import { createClient } from "../../utils/supabase/client";
import { ThreeColumnLayout } from "../../components/ThreeColumnLayout";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

function RatingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const activityId = searchParams.get("id");
  const partnerIdParam = searchParams.get("partner");
  const partnerNameParam = searchParams.get("partnerName");

  const [currentUser, setCurrentUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [unrateableReason, setUnrateableReason] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadActivityForReview() {
      if (!activityId) {
        if (isMounted) {
          setUnrateableReason("missing");
          setLoading(false);
        }
        return;
      }

      const user = await getAuthUser().catch(() => null);
      if (user && isMounted) {
        setCurrentUser(user);
        try {
          const supabase = createClient();
          if (supabase) {
            const { data: act, error } = await supabase
              .from("activities")
              .select(`
                id,
                deal_id,
                post_id,
                requester_id,
                helper_id,
                status,
                completed_at,
                post:post_id(title),
                requester:requester_id(id, full_name),
                helper:helper_id(id, full_name)
              `)
              .eq("id", activityId)
              .single();

            if (!error && act && isMounted) {
              if (act.status !== "selesai") {
                setUnrateableReason("not-completed");
                setLoading(false);
                return;
              }

              // Cek apakah user adalah peserta yang sah
              if (act.requester_id !== user.id && act.helper_id !== user.id) {
                setUnrateableReason("not-participant");
                setLoading(false);
                return;
              }

              // Cek apakah sudah pernah memberi ulasan
              const { data: existingRev } = await supabase
                .from("reviews")
                .select("id")
                .eq("activity_id", activityId)
                .eq("reviewer_id", user.id)
                .single();

              if (existingRev && isMounted) {
                setUnrateableReason("already-reviewed");
                setLoading(false);
                return;
              }

              setActivity(act);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Error fetching Supabase activity for rating:", e);
        }
      }

      // Fallback lokal
      const local = readSession();
      if (local && isMounted) setCurrentUser(local);

      const { activity: foundAct, reason } = getRateableActivity(activityId);
      if (isMounted) {
        if (!foundAct) {
          setUnrateableReason(reason || "not-found");
        } else {
          setActivity(foundAct);
        }
        setLoading(false);
      }
    }

    loadActivityForReview();

    return () => { isMounted = false; };
  }, [activityId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      setErrorMsg("Komentar ulasan minimal 10 karakter agar bermanfaat bagi komunitas.");
      return;
    }
    if (trimmedComment.length > 500) {
      setErrorMsg("Komentar ulasan maksimal 500 karakter.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const supabase = createClient();
      if (supabase && currentUser && activity?.requester_id) {
        const isRequester = currentUser.id === activity.requester_id;
        const revieweeId = isRequester ? activity.helper_id : activity.requester_id;

        const { error } = await supabase.from("reviews").insert({
          activity_id: activity.id,
          reviewer_id: currentUser.id,
          reviewee_id: revieweeId,
          stars: Number(stars),
          comment: trimmedComment,
        });

        if (error) {
          if (error.code === "23505") {
            throw new Error("Kamu sudah pernah mengirim ulasan untuk kegiatan ini.");
          }
          throw new Error(error.message || "Gagal menyimpan ulasan.");
        }

        showToast("Ulasan berhasil dikirim! Reputasi mitra telah diperbarui.", "success");
        router.push("/aktivitas?rated=1");
        return;
      }

      // Fallback lokal
      saveRating(activity.id, {
        rating: Number(stars),
        comment: trimmedComment,
        at: new Date().toISOString(),
      });
      showToast("Penilaian berhasil disimpan (Mode Demo)!", "success");
      router.push("/aktivitas?rated=1");
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || "Gagal menyimpan ulasan.");
      showToast(err.message || "Gagal menyimpan ulasan.", "error");
    }
  };

  if (loading) {
    return (
      <ThreeColumnLayout>
        <div style={{ padding: "40px", background: "#fff", borderRadius: "12px" }}>
          <p>Memeriksa kelayakan pemberian ulasan...</p>
        </div>
      </ThreeColumnLayout>
    );
  }

  if (unrateableReason) {
    const errorMessages = {
      missing: "Pilih kegiatan yang telah selesai terlebih dahulu dari halaman Aktivitas.",
      "not-found": "Data kegiatan tidak ditemukan.",
      "not-completed": "Form penilaian hanya dapat diisi jika kegiatan sudah berstatus tuntas 'selesai' dari kedua belah pihak.",
      "not-participant": "Akses ditolak: Kamu bukan merupakan peserta dalam kegiatan ini.",
      "already-reviewed": "Kamu sudah mengirimkan ulasan untuk kegiatan ini (maksimal 1 ulasan per kegiatan).",
      cancelled: "Kegiatan yang dibatalkan tidak dapat diberi ulasan.",
    };

    return (
      <ThreeColumnLayout>
        <EmptyState
          icon="⭐"
          title="Tidak Dapat Memberikan Penilaian"
          description={errorMessages[unrateableReason] || "Kegiatan ini tidak memenuhi syarat untuk dinilai."}
          actionText="Buka Daftar Aktivitas"
          onAction={() => router.push("/aktivitas")}
        />
      </ThreeColumnLayout>
    );
  }

  const isSupabase = Boolean(activity?.requester_id);
  const isRequester = isSupabase ? currentUser?.id === activity.requester_id : true;
  const partnerName = isSupabase
    ? (isRequester ? activity.helper?.full_name : activity.requester?.full_name) || partnerNameParam || "Mitra Bantuan"
    : activity.partner || partnerNameParam || "Rekan Bantuan";

  const postTitle = isSupabase ? activity.post?.title : (activity.postId || "Aktivitas Bantuan");

  return (
    <ThreeColumnLayout>
      <header className="page-header-section" style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0" }}>
          Beri Penilaian & Ulasan Reputasi
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
          Ulasan jujurmu membantu membangun rasa saling percaya dalam komunitas mahasiswa NeedHelp di Jogja.
        </p>
      </header>

      <section className="feed-card" style={{ padding: "24px" }}>
        {/* Ringkasan Kegiatan yang Selesai */}
        <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--color-border-subtle)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--color-success)" }}>
                ✓ KEGIATAN TUNTAS SELESAI
              </span>
              <h2 style={{ fontSize: "16px", fontWeight: "700", margin: "4px 0" }}>
                {postTitle}
              </h2>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                Menilai mitra: <strong>{partnerName}</strong> ({isRequester ? "Sebagai Penolong" : "Sebagai Pemohon"})
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: "#fee2e2", border: "1px solid #ef4444", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Pilihan Bintang (1 - 5) */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
              Berapa bintang untuk pengalaman bantuan ini?
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStars(s)}
                  style={{
                    fontSize: "28px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    transform: s <= stars ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.15s ease",
                  }}
                  aria-label={`${s} Bintang`}
                >
                  {s <= stars ? "⭐" : "☆"}
                </button>
              ))}
              <span style={{ marginLeft: "8px", fontSize: "14px", fontWeight: "700", color: "var(--color-text-primary)" }}>
                {stars} dari 5 Bintang
              </span>
            </div>
          </div>

          {/* Komentar Ulasan */}
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="review-comment" style={{ display: "block", fontSize: "14px", fontWeight: "700", marginBottom: "6px" }}>
              Tulis ulasan pengalamanmu (10 - 500 karakter) <span style={{ color: "red" }}>*</span>
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan bagaimana komunikasi, ketepatan waktu, dan kesesuaian bantuan yang diberikan oleh mitra..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
              required
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              <span>Minimal 10 karakter</span>
              <span>{comment.length} / 500 karakter</span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Link href="/aktivitas" className="button button-outline">
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="button button-primary"
              style={{ padding: "10px 24px", fontWeight: "600" }}
            >
              {submitting ? "Menyimpan Ulasan..." : "⭐ Kirim Ulasan Resmi"}
            </button>
          </div>
        </form>
      </section>
    </ThreeColumnLayout>
  );
}

export default function RatingPage() {
  return (
    <Suspense fallback={<div className="skeleton-container" style={{ maxWidth: "800px", margin: "40px auto", padding: "0 16px" }}><p>Memuat formulir rating...</p></div>}>
      <RatingContent />
    </Suspense>
  );
}
