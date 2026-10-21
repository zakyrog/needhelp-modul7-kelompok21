"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { writeSession, CURRENT_USER } from "../../lib/auth.js";
import { validateLogin } from "../../lib/validation.js";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const nextParam = searchParams.get("next") || "/";

  const [email, setEmail] = useState("demo@needhelp.test");
  const [password, setPassword] = useState("NeedHelp123!");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [modalContent, setModalContent] = useState(null);

  const infoTexts = {
    forgot: {
      title: "Lupa password",
      body: "Pemulihan password belum tersedia pada prototipe ini. Gunakan akun demo demo@needhelp.test dengan password NeedHelp123!.",
    },
    google: {
      title: "Login dengan Google",
      body: "Login Google belum diaktifkan karena prototipe hanya memakai sesi demo di browser. Silakan masuk dengan akun demo.",
    },
    register: {
      title: "Daftar akun",
      body: "Pendaftaran akun belum tersedia pada prototipe ini. Gunakan akun demo untuk mencoba alur utama.",
    },
  };

  const handleOpenInfo = (type) => {
    if (infoTexts[type]) {
      setModalContent(infoTexts[type]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateLogin(email, password);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    try {
      writeSession(rememberMe, {
        id: CURRENT_USER.id,
        email: CURRENT_USER.email,
        name: CURRENT_USER.name,
        at: new Date().toISOString(),
      });
      showToast("Berhasil masuk ke akun demo!", "success");
      const destination =
        nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/";
      router.push(destination);
    } catch {
      setErrors({
        general: "Gagal menyimpan sesi browser lokal.",
      });
    }
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
          <h1 id="login-title">Selamat datang kembali 👋</h1>
          <p>Masuk untuk mulai meminta atau menawarkan bantuan.</p>
        </header>

        {errors.general && (
          <p className="error-banner" role="alert">
            {errors.general}
          </p>
        )}

        <form id="login-form" onSubmit={handleSubmit} noValidate>
          <div className="fields">
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
                placeholder="demo@needhelp.test"
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
              <input
                id="user-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="••••••••••"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "user-password-error" : undefined
                }
              />
              {errors.password && (
                <small
                  id="user-password-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.password}
                </small>
              )}
            </div>
          </div>

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

          <button className="button button-primary" type="submit">
            Masuk
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
            Belum punya akun?{" "}
            <button
              className="text-button"
              type="button"
              onClick={() => handleOpenInfo("register")}
            >
              Daftar sekarang
            </button>
          </p>

          <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center" }}>
            💡 Mode Demo: Gunakan akun <code>demo@needhelp.test</code> / <code>NeedHelp123!</code>
          </p>
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
