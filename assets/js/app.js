const KEY = "needhelp.demo-session";
const privatePages = [
  "buat-postingan.html",
  "chat.html",
  "aktivitas.html",
  "rating.html",
  "sukses-postingan.html",
];

const page = location.pathname.split("/").pop() || "index.html";

function readSession() {
  try {
    return JSON.parse(
      localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "null"
    );
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {}
}

if (privatePages.includes(page) && !readSession()) {
  location.replace(`login.html?next=${encodeURIComponent(page)}`);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const dialog = document.getElementById("info-modal");
    if (dialog && typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    }
  }
});

// --- TOMBOL KELUAR (LOGOUT) & NAVIGASI RAPI ---
document.addEventListener("DOMContentLoaded", () => {
  const headerEl = document.querySelector("header");
  const navEl = headerEl ? headerEl.querySelector("nav") : null;
  const navList = navEl ? navEl.querySelector("ul") : null;

  if (headerEl && navEl) {
    let menuToggle = headerEl.querySelector(".menu-toggle");
    if (!menuToggle && window.innerWidth <= 768) {
      menuToggle = document.createElement("button");
      menuToggle.type = "button";
      menuToggle.className = "menu-toggle";
      menuToggle.textContent = "Menu";
      menuToggle.setAttribute("aria-expanded", "false");
      headerEl.insertBefore(menuToggle, navEl);
    }

    if (menuToggle && navList) {
      menuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        navList.classList.toggle("active");
        const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      });
    }

    document.addEventListener("click", (e) => {
      if (menuToggle && navList && !menuToggle.contains(e.target) && !navEl.contains(e.target)) {
        navList.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Menambahkan tombol Keluar / Masuk di ujung navbar secara rapi
  if (navList) {
    const isLogin = readSession();
    const existingLi = document.getElementById("auth-li-item");
    if (existingLi) existingLi.remove();

    const authLink = document.createElement("a");
    authLink.style.display = "inline-block";
    authLink.style.padding = "6px 16px";
    authLink.style.borderRadius = "20px";
    authLink.style.textDecoration = "none";
    authLink.style.fontSize = "0.9rem";
    authLink.style.fontWeight = "600";

    if (isLogin) {
      authLink.textContent = "Keluar";
      authLink.style.backgroundColor = "#ef4444";
      authLink.style.color = "#ffffff";
      authLink.href = "#";
      authLink.addEventListener("click", (e) => {
        e.preventDefault();
        clearSession();
        alert("Berhasil keluar dari akun.");
        location.href = "index.html";
      });
    } else {
      authLink.textContent = "Masuk";
      authLink.style.backgroundColor = "#0d9488";
      authLink.style.color = "#ffffff";
      authLink.href = "login.html";
    }

    const liWrapper = document.createElement("li");
    liWrapper.id = "auth-li-item";
    liWrapper.style.display = "inline-flex";
    liWrapper.style.alignItems = "center";
    liWrapper.style.marginLeft = "10px";
    liWrapper.appendChild(authLink);

    navList.appendChild(liWrapper);
  }
});

// --- LOGIKA FORM LOGIN ---
const form = document.getElementById("login-form");
if (form) {
  const email = document.getElementById("user-email");
  const password = document.getElementById("user-password");
  const status = document.getElementById("login-status");

  [email, password].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        const erorrNode = document.getElementById(`${input.name}-error`);
        if (erorrNode) {
          erorrNode.textContent = "";
          erorrNode.hidden = true;
        }
        input.removeAttribute("aria-invalid");
        if (status) status.hidden = true;
      });
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errors = {};

    if (!email || !email.value.trim()) {
      errors.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.email = "Masukkan format email yang benar.";
    }

    if (!password || !password.value) {
      errors.password = "Password wajib diisi.";
    } else if (password.value.length < 8) {
      errors.password = "Password minimal 8 karakter.";
    }

    for (const [name, input] of [
      ["email", email],
      ["password", password],
    ]) {
      if (!input) continue;
      const node = document.getElementById(`${name}-error`);
      if (node) {
        node.textContent = errors[name] || "";
        node.hidden = !errors[name];
      }
      input.setAttribute("aria-invalid", String(Boolean(errors[name])));
    }

    const isDemoEmail =
      email.value.trim() === "demo@needhelp.test" ||
      email.value.trim() === "patungin@email.com";
    const isDemoPassword =
      password.value === "NeedHelp123!" || password.value.length >= 8;
    const wrong =
      !Object.keys(errors).length && (!isDemoEmail || !isDemoPassword);

    if (Object.keys(errors).length || wrong) {
      if (status) {
        status.textContent = wrong
          ? "Email atau password demo tidak sesuai."
          : "Periksa kembali email dan password.";
        status.hidden = false;
      }
      if (errors.email) email.focus();
      else if (errors.password) password.focus();
      return;
    }

    try {
      clearSession();
      const rememberMe = document.getElementById("remember-me");
      const storage =
        rememberMe && rememberMe.checked ? localStorage : sessionStorage;
      storage.setItem(KEY, JSON.stringify({ email: email.value.trim() }));
    } catch {
      if (status) {
        status.textContent =
          "Penyimpanan browser diblokir. Aktifkan penyimpanan untuk mencoba sesi demo.";
        status.hidden = false;
      }
      return;
    }

    alert("Login Berhasil!");
    const next = new URLSearchParams(location.search).get("next");
    location.href = privatePages.includes(next) ? next : "katalog.html";
  });
}

const dialog = document.getElementById("info-modal");
const copy = {
  forgot: [
    "Lupa password?",
    "Pemulihan email belum terhubung. Akun demo: demo@needhelp.test / NeedHelp123!",
  ],
  google: [
    "Lanjutkan dengan Google",
    "Login Google belum tersedia dalam paket awal. Gunakan akun demo untuk mencoba alur.",
  ],
  register: [
    "Daftar sekarang",
    "Pendaftaran disebut dalam user flow, tetapi belum memiliki layar tersendiri di Final UI.",
  ],
};

document.querySelectorAll("[data-info]").forEach((button) =>
  button.addEventListener("click", () => {
    const info = copy[button.dataset.info];
    if (info && dialog) {
      const [title, body] = info;
      const titleEl = document.getElementById("modal-title");
      const bodyEl = document.getElementById("modal-body");
      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = body;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    }
  }),
);

if (dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

// --- FILTER KATALOG YANG AKURAT (KEMBALI UTUH) ---
const katalogPage = location.pathname.includes("katalog.html");
if (katalogPage) {
  document.querySelectorAll(".daftar-permintaan a, .card a").forEach((link, index) => {
    if (link.textContent.includes("Lihat Detail Lengkap")) {
      link.addEventListener("click", () => {
        sessionStorage.setItem("selected_post_index", String(index + 1));
      });
      link.href = `detail-postingan.html?id=${index + 1}`;
    }
  });

  document.addEventListener("click", (e) => {
    const targetEl = e.target;
    if (targetEl && (targetEl.textContent.includes("Terapkan Filter") || targetEl.value?.includes("Terapkan Filter"))) {
      e.preventDefault();

      const cards = document.querySelectorAll(".daftar-permintaan > div, article, .card");

      const checkedCategories = [];
      const allCheckboxes = document.querySelectorAll("input[type='checkbox']");
      
      allCheckboxes.forEach((cb, idx) => {
        if (cb.checked && idx < 5) {
          const labelEl = cb.closest("label") || cb.parentElement;
          if (labelEl) {
            checkedCategories.push(labelEl.textContent.toLowerCase().trim());
          }
        }
      });

      if (checkedCategories.length === 0) {
        alert("Mohon centang setidaknya satu kategori utama terlebih dahulu!");
        cards.forEach(card => card.style.display = "none");
        return;
      }

      const keywordMap = {
        "les privat": ["les", "privat", "matematika", "belajar", "mentor", "tugas", "mahasiswa", "sekolah"],
        "jasa kebersihan": ["kebersihan", "bersih", "kos", "sapu", "pel"],
        "kurir / titip": ["kurir", "titip", "antar", "barang", "belanja", "delta plaza", "gubeng", "kampus"],
        "teknis": ["teknis", "teknisi", "ac", "listrik", "perbaikan", "bocor", "freon", "paggilan", "pasang"],
        "lainnya": ["lainnya", "olahraga", "lari", "partner"]
      };

      let activeKeywords = [];
      checkedCategories.forEach(cat => {
        for (const [key, words] of Object.entries(keywordMap)) {
          if (cat.includes(key) || key.includes(cat)) {
            activeKeywords = activeKeywords.concat(words);
          }
        }
      });

      let matchCount = 0;

      cards.forEach((card) => {
        const textCard = card.innerText.toLowerCase();
        let show = false;

        for (const word of activeKeywords) {
          if (textCard.includes(word)) {
            show = true;
            break;
          }
        }

        if (show) {
          card.style.display = "";
          matchCount++;
        } else {
          card.style.display = "none";
        }
      });

      if (matchCount === 0) {
        alert("Tidak ada postingan yang sesuai dengan kategori tersebut.");
      } else {
        alert(`Filter diterapkan! Menemukan ${matchCount} postingan.`);
      }
    }

    if (
      e.target &&
      (e.target.textContent.includes("Reset") ||
        e.target.textContent.includes("Atur Ulang") ||
        e.target.textContent.includes("Bersihkan"))
    ) {
      const cards = document.querySelectorAll(
        ".daftar-permintaan > div, .card, article",
      );
      cards.forEach((card) => {
        card.style.display = "";
      });
      document.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
      alert("Filter direset ke awal.");
    }
  });
}

// --- FORM POSTINGAN & DETAIL (KEMBALI UTUH) ---
const buatpostinganPage = location.pathname.includes("buat-postingan.html");
if (buatpostinganPage) {
  const postForm = document.querySelector("form");
  if (postForm) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const judulInput = document.querySelector("input[name='judul'], #judul-posting, input[type='text']");
      const descInput = document.querySelector("textarea");

      const judul = judulInput ? judulInput.value.trim() : "Bantuan Baru";
      const deskripsi = descInput ? descInput.value.trim() : "";
      
      const newPost = {
        id: Date.now(),
        judul: judul || "Bantuan Baru",
        deskripsi: deskripsi,
        tanggal: new Date().toLocaleDateString("id-ID"), 
        status: "aktif",
      };

      try {
        const existingPosts = JSON.parse(localStorage.getItem("needhelp_user_posts") || "[]");
        existingPosts.push(newPost);
        localStorage.setItem("needhelp_user_posts", JSON.stringify(existingPosts));
        localStorage.setItem("activePost", JSON.stringify(newPost));
      } catch (err) {
        console.error("gagal menyimpan postingan:", err);
      }

      alert("Postingan berhasil dibuat!");
      location.href = "sukses-postingan.html";
    });
  }
}

const detailPage = location.pathname.includes("detail-postingan.html");
if (detailPage) {
  try {
    const activePost = JSON.parse(localStorage.getItem("activePost"));
    if (activePost) {
      const titleEl = document.querySelector("h1, h2, .detail-judul");
      const descEl = document.querySelector(".detail-deskripsi, p");
      if (titleEl && activePost.judul) titleEl.textContent = activePost.judul;
      if (descEl && activePost.deskripsi) descEl.textContent = activePost.deskripsi;
    }
  } catch (e) {
    console.error("Gagal memuat detail postingan", e);
  }
}

// --- FITUR CHAT SEDERHANA (HANYA KOSONGKAN INPUT & TAMPILKAN NOTIFIKASI) ---
const chatPage = location.pathname.includes("chat.html");
if (chatPage) {
  function kirimPesan() {
    const inputPesan = document.getElementById("chat-input");
    const isiPesan = inputPesan ? inputPesan.value.trim() : "";

    if (!isiPesan) {
      alert("Pesan tidak boleh kosong!");
      if (inputPesan) inputPesan.focus();
      return;
    }

    // Kosongkan kembali kotak input (pesan terkirim/hilang dari kotak)
    inputPesan.value = "";
    
    // Tampilkan notifikasi bahwa pesan sudah terkirim
    alert("Pesan berhasil dikirim!");
  }

  // Tangkap klik pada tombol panah kirim (.send-plane-btn)[cite: 3, 4]
  document.addEventListener("click", (e) => {
    const sendBtn = e.target.closest(".send-plane-btn");
    if (sendBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      kirimPesan();
    }
  });

  // Tangkap tombol Enter pada keyboard saat mengetik di #chat-input[cite: 3, 4]
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const activeInput = document.activeElement;
      if (activeInput && activeInput.id === "chat-input") {
        e.preventDefault();
        kirimPesan();
      }
    }
  });
}

// --- LOGIKA RATING (KEMBALI UTUH) ---
document.addEventListener("DOMContentLoaded", () => {
  const semuaInput = document.querySelectorAll("input[type='radio'], input[type='checkbox']");
  semuaInput.forEach(input => {
    input.checked = false;
  });

  const semuaTextarea = document.querySelectorAll("textarea");
  semuaTextarea.forEach(txt => {
    txt.value = "";
  });

  const tombolKirimUlasan = Array.from(document.querySelectorAll("button, a, input[type='submit']"))
    .find(el => {
      const text = (el.textContent || el.value || "").toLowerCase();
      return text.includes("kirim penilaian");
    });

  if (tombolKirimUlasan) {
    tombolKirimUlasan.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();

      const ratingTerpilih = document.querySelector("input[type='radio']:checked");

      if (!ratingTerpilih) {
        alert("Mohon pilih rating penilaian (1 - 5) terlebih dahulu!");
        return;
      }

      const nilaiBintang = ratingTerpilih.value;
      const inputTestimoni = document.querySelector("textarea");
      const isiCatatan = inputTestimoni ? inputTestimoni.value.trim() : "";

      const apresiasiTerpilih = [];
      document.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
        const label = cb.closest("label") || cb.parentElement;
        if (label) apresiasiTerpilih.push(label.textContent.trim());
      });

      let areaRiwayatUlasan = document.getElementById("riwayat-ulasan-lokal");
      const formUtama = document.querySelector("form") || document.querySelector("main");

      if (!areaRiwayatUlasan && formUtama) {
        areaRiwayatUlasan = document.createElement("div");
        areaRiwayatUlasan.id = "riwayat-ulasan-lokal";
        areaRiwayatUlasan.style.marginTop = "2rem";
        formUtama.after(areaRiwayatUlasan);
      }

      if (areaRiwayatUlasan) {
        const kartuBaru = document.createElement("div");
        kartuBaru.style.border = "1px solid #10B981";
        kartuBaru.style.backgroundColor = "#ECFDF5";
        kartuBaru.style.borderRadius = "8px";
        kartuBaru.style.padding = "1.25rem";
        kartuBaru.style.marginBottom = "1rem";

        kartuBaru.innerHTML = `
          <h4 style="margin: 0 0 0.5rem 0; color: #065F46;">✔ Penilaian Berhasil Disimpan</h4>
          <p style="margin: 0.25rem 0;"><strong>Rating Terpilih:</strong> Bintang ${nilaiBintang}</p>
          ${apresiasiTerpilih.length > 0 ? `<p style="margin: 0.25rem 0;"><strong>Apresiasi:</strong> ${apresiasiTerpilih.join(", ")}</p>` : ""}
          <p style="margin: 0.25rem 0;"><strong>Catatan Pengalaman:</strong> ${isiCatatan || "<em>(Dilewati / Kosong)</em>"}</p>
        `;

        areaRiwayatUlasan.prepend(kartuBaru);
      }

      alert("Terima kasih! Penilaian berhasil dikirim dan ulasan telah masuk ke sistem lokal.");

    }, true);
  }
});

// --- LOGIKA NOTIFIKASI (KEMBALI UTUH) ---
document.addEventListener("DOMContentLoaded", () => {
  if (location.pathname.includes("notifikasi")) {
    const tombolTandaiSemua = Array.from(document.querySelectorAll("button, a"))
      .find(el => el.textContent.trim().toLowerCase().includes("tandai semua terbaca"));

    if (tombolTandaiSemua) {
      tombolTandaiSemua.addEventListener("click", (e) => {
        e.preventDefault();
        const semuaKartuNotif = document.querySelectorAll("div, .notifikasi-item, .card");

        semuaKartuNotif.forEach(kartu => {
          if (kartu.innerHTML.includes("●")) {
            kartu.innerHTML = kartu.innerHTML.replace(/●/g, "");
            kartu.style.backgroundColor = "#ffffff";
          }
        });

        document.querySelectorAll(".unread").forEach(el => el.classList.remove("unread"));

        const teksHeader = document.body;
        if (teksHeader) {
          teksHeader.innerHTML = teksHeader.innerHTML.replace(/\d+\s+notifikasi baru/gi, "0 notifikasi baru");
        }

        alert("Semua notifikasi telah ditandai sebagai dibaca!");
      });
    }

    document.addEventListener("click", (e) => {
      const kartuDiklik = e.target.closest("div, .notifikasi-item, .card");
      if (kartuDiklik) {
        kartuDiklik.classList.remove("unread");
        kartuDiklik.style.backgroundColor = "#ffffff";
        const dot = kartuDiklik.querySelector(".unread-dot, .dot");
        if (dot) dot.remove();
        if (kartuDiklik.innerHTML.includes("●")) {
          kartuDiklik.innerHTML = kartuDiklik.innerHTML.replace(/●/g, "");
        }
      }
    });
  }
});