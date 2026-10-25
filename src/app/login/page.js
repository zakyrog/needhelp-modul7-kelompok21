"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInUser,
  signUpUser,
  isSupabaseConfigured,
  writeSession,
} from "../../lib/auth.js";
import { CURRENT_USER } from "../../lib/data.js";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const nextParam = searchParams.get("next") || "/";

  // Tab mode: 'login' atau 'register'
  const [authMode, setAuthMode] = useState("login");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [modalContent, setModalContent] = useState(null);

  const supabaseReady = isSupabaseConfigured();

  const infoTexts = {
    forgot: {
      title: "Lupa Password",
      body: "Untuk mengatur ulang kata sandi, silakan hubungi administrator komunitas atau periksa email pemulihan jika fitur email aktif di proyek Supabase Anda.",
    },
    google: {
      title: "Login dengan Google",
      body: "Login OAuth Google dapat diaktifkan melalui Supabase Dashboard > Authentication > Providers > Google.",
    },
  };

  const handleOpenInfo = (type) => {
    if (infoTexts[type]) {
      setModalContent(infoTexts[type]);
    }
  };

  const validateForm = () => {
    const errs = {};

    if (!email || !email.trim()) {
      errs.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Format email tidak valid.";
    }

    if (!password) {
      errs.password = "Password wajib diisi.";
    } else if (password.length < 6) {
      errs.password = "Password minimal 6 karakter.";
    }

    if (authMode === "register") {
      if (!fullName || !fullName.trim()) {
        errs.fullName = "Nama lengkap wajib diisi.";
      } else if (fullName.trim().length < 3) {
        errs.fullName = "Nama lengkap minimal 3 karakter.";
      }

      if (password !== confirmPassword) {
        errs.confirmPassword = "Konfirmasi password tidak cocok.";
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      if (authMode === "login") {
        if (!supabaseReady) {
          // Fallback lokal jika environment variables belum diset
          if (email === "demo@needhelp.test" && password === "NeedHelp123!") {
            writeSession(rememberMe, {
              id: CURRENT_USER.id,
              email: CURRENT_USER.email,
              name: CURRENT_USER.name,
              at: new Date().toISOString(),
            });
            showToast("Berhasil masuk menggunakan akun demo lokal!", "info");
            const destination =
              nextParam.startsWith("/") && !nextParam.startsWith("//")
                ? nextParam
                : "/";
            router.push(destination);
            return;
          } else {
            setErrors({
              general:
                "Koneksi Supabase belum terkonfigurasi di .env.local. Anda dapat mencoba akun demo bawaan: demo@needhelp.test / NeedHelp123! atau mengisi .env.local dengan kredensial Supabase Anda.",
            });
            setSubmitting(false);
            return;
          }
        }

        const res = await signInUser(email.trim(), password);
        if (!res.success) {
          setErrors({
            general: res.error || "Email atau password salah. Silakan periksa kembali.",
          });
          setSubmitting(false);
          return;
        }

        showToast("Berhasil masuk ke akun Anda!", "success");
        const destination =
          nextParam.startsWith("/") && !nextParam.startsWith("//")
            ? nextParam
            : "/";
        router.push(destination);
      } else {
        // Register Mode
        if (!supabaseReady) {
          setErrors({
            general:
              "Pendaftaran akun multipengguna memerlukan koneksi Supabase. Silakan atur NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada .env.local terlebih dahulu.",
          });
          setSubmitting(false);
          return;
        }

        const res = await signUpUser(email.trim(), password, fullName.trim());
        if (!res.success) {
          setErrors({
            general: res.error || "Pendaftaran gagal. Silakan coba kembali.",
          });
          setSubmitting(false);
          return;
        }

        showToast("Pendaftaran berhasil! Akun dan profil Anda telah aktif.", "success");
        // Jika auto-confirm aktif di Supabase, langsung masuk atau alihkan ke login
        if (res.session) {
          const destination =
            nextParam.startsWith("/") && !nextParam.startsWith("//")
              ? nextParam
              : "/";
          router.push(destination);
        } else {
          setAuthMode("login");
          showToast("Silakan masuk menggunakan akun baru Anda.", "info");
        }
      }
    } catch (err) {
      setErrors({
        general: err.message || "Terjadi kesalahan sistem saat memproses autentikasi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setEmail("demo@needhelp.test");
    setPassword("NeedHelp123!");
    setAuthMode("login");
  };

  return (
    <main className="login-main">
      <aside className="login-banner">
        <div className="banner-content">
          <Link href="/">
            <img
              src="/assets/images/logo.svg"
              alt="NeedHelp - Beranda"
              width="160"
              height="40"
            />
          </Link>
          <div className="quote-icon">“</div>
          <h1>
            Platform yang mempertemukan niat baik dengan kebutuhan nyata — di
            sekitarmu.
          </h1>

          <div className="banner-stats">
            <div className="stat-item">
              <h3>2.1k+</h3>
              <p>Permintaan dibantu</p>
            </div>
            <div className="stat-item">
              <h3>850+</h3>
              <p>Relawan aktif</p>
            </div>
            <div className="stat-item">
              <h3>4.8★</h3>
              <p>Rating komunitas</p>
            </div>
          </div>
        </div>

        <div className="banner-decorations">
          <div className="circle-large" />
          <div className="circle-small" />
        </div>
      </aside>

      <section className="login-card" aria-labelledby="login-title">
        <header>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrors({});
              }}
              style={{
                background: "none",
                border: "none",
                padding: "8px 12px",
                fontSize: "15px",
                fontWeight: authMode === "login" ? "600" : "400",
                color: authMode === "login" ? "var(--color-primary, #4a9ba0)" : "var(--color-text-muted, #64748b)",
                borderBottom: authMode === "login" ? "2px solid var(--color-primary, #4a9ba0)" : "none",
                cursor: "pointer",
              }}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setErrors({});
              }}
              style={{
                background: "none",
                border: "none",
                padding: "8px 12px",
                fontSize: "15px",
                fontWeight: authMode === "register" ? "600" : "400",
                color: authMode === "register" ? "var(--color-primary, #4a9ba0)" : "var(--color-text-muted, #64748b)",
                borderBottom: authMode === "register" ? "2px solid var(--color-primary, #4a9ba0)" : "none",
                cursor: "pointer",
              }}
            >
              Daftar Akun Baru
            </button>
          </div>

          <h1 id="login-title">
            {authMode === "login" ? "Selamat datang kembali 👋" : "Bergabung ke NeedHelp Jogja 🤝"}
          </h1>
          <p>
            {authMode === "login"
              ? "Masuk untuk mulai meminta atau menawarkan bantuan."
              : "Buat akun untuk saling tolong-menolong bersama warga & mahasiswa Jogja."}
          </p>
        </header>

        {!supabaseReady && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#92400e",
              marginBottom: "16px",
              lineHeight: 1.4,
            }}
          >
            <strong>Informasi Integrasi:</strong> Kredensial Supabase belum terdeteksi di <code>.env.local</code>. Untuk pengujian multi-akun riil, salin <code>.env.example</code> ke <code>.env.local</code> dan isi URL serta Anon Key dari Dashboard Supabase Anda.
          </div>
        )}

        {errors.general && (
          <p className="error-banner" role="alert">
            {errors.general}
          </p>
        )}

        <form id="login-form" onSubmit={handleSubmit} noValidate>
          <div className="fields">
            {authMode === "register" && (
              <div className="field">
                <label htmlFor="user-fullname">Nama Lengkap</label>
                <input
                  id="user-fullname"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="Contoh: Rina Putri"
                  aria-invalid={Boolean(errors.fullName)}
                />
                {errors.fullName && (
                  <small className="field-error" role="alert">
                    {errors.fullName}
                  </small>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="user-email">Email</label>
              <input
                id="user-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="nama@email.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "user-email-error" : undefined}
              />
              {errors.email && (
                <small id="user-email-error" className="field-error" role="alert">
                  {errors.email}
                </small>
              )}
            </div>

            <div className="field">
              <label htmlFor="user-password">Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="user-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Minimal 6 karakter"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "user-password-error" : undefined}
                  style={{ width: "100%", paddingRight: "45px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-muted, #666)",
                    padding: "4px",
                  }}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <small id="user-password-error" className="field-error" role="alert">
                  {errors.password}
                </small>
              )}
            </div>

            {authMode === "register" && (
              <div className="field">
                <label htmlFor="user-confirm-password">Konfirmasi Password</label>
                <input
                  id="user-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Ulangi password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                {errors.confirmPassword && (
                  <small className="field-error" role="alert">
                    {errors.confirmPassword}
                  </small>
                )}
              </div>
            )}
          </div>

          {authMode === "login" && (
            <div className="meta-row">
              <label className="remember">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Ingat saya
              </label>
              <button
                className="text-button"
                type="button"
                onClick={() => handleOpenInfo("forgot")}
              >
                Lupa password?
              </button>
            </div>
          )}

          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : authMode === "login" ? "Masuk" : "Daftar Akun"}
          </button>

          <div className="divider">
            <span>atau</span>
          </div>

          <button
            className="button button-secondary"
            type="button"
            onClick={() => handleOpenInfo("google")}
          >
            Lanjutkan dengan Google
          </button>

          <p className="register">
            {authMode === "login" ? (
              <>
                Belum punya akun?{" "}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setErrors({});
                  }}
                >
                  Daftar sekarang
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrors({});
                  }}
                >
                  Masuk di sini
                </button>
              </>
            )}
          </p>

          {!supabaseReady && (
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={handleDemoFill}
                style={{
                  background: "none",
                  border: "1px dashed var(--border-subtle, #cbd5e1)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  color: "var(--color-text-muted, #64748b)",
                  cursor: "pointer",
                }}
              >
                💡 Isi Otomatis Akun Demo Lokal (demo@needhelp.test)
              </button>
            </div>
          )}
        </form>
      </section>

      <Modal
        isOpen={Boolean(modalContent)}
        onClose={() => setModalContent(null)}
        title={modalContent?.title || ""}
      >
        <p>{modalContent?.body}</p>
      </Modal>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-main"><p>Memuat formulir masuk...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
