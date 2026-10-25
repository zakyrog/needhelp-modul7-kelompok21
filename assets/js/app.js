import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import {
  CATEGORY_LABELS,
  COMPENSATION_LABELS,
  CURRENT_USER,
  REGION_LABELS,
  cancelActivity,
  createPost,
  ensureConversation,
  escapeHtml,
  filterPosts,
  formatCompensation,
  formatDate,
  formatDateTime,
  formatMessageTime,
  formatTimeRange,
  getActivities,
  getActivity,
  getActivityStats,
  getConversation,
  getConversations,
  getNotifications,
  getPerson,
  getPost,
  getPostAuthor,
  getPublicPost,
  getPosts,
  getPublicPosts,
  getRateableActivity,
  getUserPosts,
  markAllNotificationsRead,
  markNotificationRead,
  saveMessage,
  saveRating,
  validatePost,
} from "./data.js";

const KEY = "needhelp.demo-session";
const privatePages = [
  "buat-postingan.html",
  "chat.html",
  "aktivitas.html",
  "rating.html",
  "notifikasi.html",
  "sukses-postingan.html",
];
const authReturnPages = [...privatePages, "detail-postingan.html"];
const page = location.pathname.split("/").pop() || "index.html";
const params = new URLSearchParams(location.search);

function readSession() {
  try {
    const session = JSON.parse(
      localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "null",
    );
    return session &&
      typeof session === "object" &&
      session.id === CURRENT_USER.id &&
      session.email === CURRENT_USER.email
      ? session
      : null;
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

function safeNext(value) {
  if (!value) return null;
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin) return null;
    const target = url.pathname.split("/").pop();
    return authReturnPages.includes(target) ? `${target}${url.search}` : null;
  } catch {
    return null;
  }
}

function safeBack(value) {
  if (!value) return "katalog.html";
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin) return "katalog.html";
    const target = url.pathname.split("/").pop();
    return target === "katalog.html" ? `${target}${url.search}` : "katalog.html";
  } catch {
    return "katalog.html";
  }
}

const session = readSession();
if (privatePages.includes(page) && !session) {
  const next = `${page}${location.search}`;
  location.replace(`login.html?next=${encodeURIComponent(next)}`);
}

const header = document.querySelector("body > header");
const nav = header?.querySelector("nav");
if (nav && page !== "login.html") {
  nav.id = "main-nav";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.textContent = "Menu";
  toggle.setAttribute("aria-controls", nav.id);
  toggle.setAttribute("aria-expanded", "false");
  function closeMenu() {
    nav.dataset.open = "false";
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", () => {
    const open = nav.dataset.open !== "true";
    nav.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  header.insertBefore(toggle, nav);
  document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();

    const dialog = document.getElementById("info-modal");
    if (dialog?.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
}

function logout() {
  clearSession();
  location.href = "index.html";
}


if (nav) {
  const authLink = document.createElement("a");
  authLink.href = session ? "index.html" : "login.html";
  authLink.textContent = session ? "Keluar" : "Masuk";
  if (session) {
    authLink.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  }
  const authItem = document.createElement("li");
  authItem.append(authLink);
  nav.querySelector("ul")?.append(authItem);
}


function setStatus(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.hidden = !message;
  if (isError) node.classList.add("is-error");
  else node.classList.remove("is-error");
}

function statusNode(form, selector) {
  let node = document.querySelector(selector);
  if (!node && form) {
    node = document.createElement("p");
    node.setAttribute("role", "status");
    node.hidden = true;
    form.prepend(node);
  }
  return node;
}

function postCard(post, index) {
  const author = getPostAuthor(post);
  return `
    <article class="request-card${index === 1 ? " highlight-card" : ""}">
      <header class="card-user">
        <div class="avatar ${escapeHtml(author.avatarClass)}">${escapeHtml(author.initial)}</div>
        <div class="user-info">
          <h3>${escapeHtml(author.name)}</h3>
          <p>${escapeHtml(post.timeLabel || "Baru saja")} &bull; ${escapeHtml(REGION_LABELS[post.region] || post.region)}</p>
        </div>
      </header>
      <h4><a href="detail-postingan.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></h4>
      <p>${escapeHtml(post.summary)}</p>
      <div class="tags">
        <span class="tag">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
        <span class="tag">${escapeHtml(COMPENSATION_LABELS[post.compensation] || post.compensation)}</span>
      </div>
    </article>`;
}

function catalogCard(post, backUrl = "katalog.html") {
  const author = getPostAuthor(post);
  const detailUrl = `detail-postingan.html?id=${encodeURIComponent(post.id)}&back=${encodeURIComponent(backUrl)}`;
  return `
    <article>
      <header>
        <img src="${escapeHtml(author.avatar)}" alt="Foto profil ${escapeHtml(author.name)}" width="40" height="40">
        <h3>${escapeHtml(author.name)}</h3>
        <p><mark>${post.nature === "butuh" ? "Saya Butuh" : "Saya Bisa"}</mark> &bull; ${escapeHtml(REGION_LABELS[post.region] || post.region)} &bull; ${escapeHtml(post.timeLabel || "Baru saja")}</p>
      </header>
      <h4><a href="${detailUrl}">${escapeHtml(post.title)}</a></h4>
      <p>${escapeHtml(post.summary)}</p>
      <dl>
        <dt>Jadwal</dt>
        <dd>${escapeHtml(formatDate(post.date))} - ${escapeHtml(formatTimeRange(post))}</dd>
        <dt>Imbalan</dt>
        <dd>${escapeHtml(formatCompensation(post))}</dd>
      </dl>
      <p><a href="${detailUrl}">Lihat Detail Lengkap</a></p>
    </article>`;
}

function setupHome() {
  const feed = document.querySelector("[data-home-feed]") || document.querySelector("body.home-page .cards-grid");
  if (feed) feed.innerHTML = getPublicPosts().slice(0, 3).map(postCard).join("");
}

function catalogFilters(form) {
  const data = new FormData(form);
  return {
    query: data.get("q") || "",
    type: data.get("post_type") || "all",
    categories: data.getAll("category"),
    location: data.get("location") || "",
    compensation: data.get("compensation") || "",
  };
}

function catalogUrl(filters, pageNumber = 1) {
  const query = new URLSearchParams();
  if (filters.query.trim()) query.set("q", filters.query.trim());
  if (filters.type && filters.type !== "all") query.set("type", filters.type);
  filters.categories.forEach((category) => query.append("category", category));
  if (filters.location) query.set("location", filters.location);
  if (filters.compensation) query.set("compensation", filters.compensation);
  if (filters.sort && filters.sort !== "terbaru") query.set("sort", filters.sort);
  if (pageNumber > 1) query.set("page", String(pageNumber));
  const value = query.toString();
  return `katalog.html${value ? `?${value}` : ""}`;
}

function sortCatalogPosts(posts, sort) {
  const sorted = [...posts];
  if (sort === "jadwal") {
    return sorted.sort((a, b) =>
      `${a.date || "9999-12-31"}T${a.time || "23:59"}`.localeCompare(
        `${b.date || "9999-12-31"}T${b.time || "23:59"}`,
      ),
    );
  }
  return sorted.sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
}

function setupCatalog() {
  const form = document.querySelector("[data-filter-form]") || document.querySelector("body.catalog-page aside form");
  const list = document.querySelector("[data-catalog-list]");
  const count = document.querySelector("[data-catalog-count]");
  const pagination = document.querySelector("[data-catalog-pagination]");
  const sortSelect = document.querySelector("[data-catalog-sort]");
  if (!form || !list) return;

  const typeTabs = document.querySelectorAll(".tab-btn");
  function syncTypeTabs(type) {
    typeTabs.forEach((tab) => {
      const active =
        new URL(tab.href, window.location.href).searchParams.get("type") === type;
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  const queryInput = form.querySelector('[name="q"]');
  if (queryInput) queryInput.value = params.get("q") || "";
  const sortOptions = ["terbaru", "jadwal"];
  const initialSort = sortOptions.includes(params.get("sort"))
    ? params.get("sort")
    : "terbaru";
  if (sortSelect) sortSelect.value = initialSort;
  const type = params.get("type");
  if (type) {
    const radio = form.querySelector(`[name="post_type"][value="${CSS.escape(type)}"]`);
    if (radio) radio.checked = true;
  }
  const categories = params.getAll("category");
  if (categories.length) {
    form.querySelectorAll('[name="category"]').forEach((input) => {
      input.checked = categories.includes(input.value);
    });
  }
  for (const name of ["location", "compensation"]) {
    const value = params.get(name);
    const select = form.querySelector(`[name="${name}"]`);
    if (value && select) select.value = value;
  }

  let requestedPage = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = 4;

  function render() {
    const filters = catalogFilters(form);
    if (sortSelect) filters.sort = sortOptions.includes(sortSelect.value)
      ? sortSelect.value
      : "terbaru";
    syncTypeTabs(filters.type);
    const results = sortCatalogPosts(filterPosts(getPublicPosts(), filters), filters.sort);
    const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
    requestedPage = Math.min(requestedPage, pageCount);
    const start = (requestedPage - 1) * pageSize;
    const visible = results.slice(start, start + pageSize);
    const backUrl = catalogUrl(filters, requestedPage);
    list.innerHTML = visible.length
      ? visible.map((post) => catalogCard(post, backUrl)).join("")
      : '<p class="empty-state">Tidak ada postingan yang cocok. Coba ubah kata kunci atau filter.</p>';
    if (count) {
      count.textContent = results.length
        ? `${results.length} postingan ditemukan`
        : "0 postingan ditemukan";
    }
    if (pagination) {
      if (results.length <= pageSize) {
        pagination.innerHTML = "";
        pagination.hidden = true;
      } else {
        pagination.hidden = false;
        const links = [];
        for (let index = 1; index <= pageCount; index += 1) {
          links.push(
            index === requestedPage
              ? `<li><span aria-current="page">${index}</span></li>`
              : `<li><a href="${catalogUrl(filters, index)}">${index}</a></li>`,
          );
        }
        pagination.innerHTML = `<ol>${links.join("")}</ol>`;
      }
    }
    history.replaceState(null, "", catalogUrl(filters, requestedPage));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    requestedPage = 1;
    render();
  });
  document.querySelector("[data-filter-reset]")?.addEventListener("click", () => {
    form.reset();
    if (sortSelect) sortSelect.value = "terbaru";
    requestedPage = 1;
    render();
  });
  sortSelect?.addEventListener("change", () => {
    requestedPage = 1;
    render();
  });
  render();
}

function writeSession(remember, value) {
  const serialized = JSON.stringify(value);
  if (remember) {
    try {
      localStorage.setItem(KEY, serialized);
      sessionStorage.removeItem(KEY);
      return;
    } catch {
      sessionStorage.setItem(KEY, serialized);
      return;
    }
  }
  sessionStorage.setItem(KEY, serialized);
  localStorage.removeItem(KEY);
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field-error[data-generated]").forEach((node) => {
    if (node.id) form.querySelector(`[aria-describedby~="${node.id}"]`)?.removeAttribute("aria-describedby");
    node.remove();
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute("aria-invalid"));
}

function showFieldError(field, message) {
  if (!field) return;
  field.setAttribute("aria-invalid", "true");
  let node = document.getElementById(`${field.id}-error`);
  if (!node) {
    node = document.createElement("small");
    node.className = "field-error";
    node.dataset.generated = "true";
    node.id = `${field.id}-error`;
    (field.closest("p") || field).insertAdjacentElement("afterend", node);
  }
  field.setAttribute("aria-describedby", node.id);
  node.textContent = message;
  node.hidden = false;
}

function textParagraphs(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function setupLogin() {
  const form = document.querySelector("#login-form");
  if (!form) return;
  const email = form.elements.email;
  const password = form.elements.password;
  const remember = form.elements["remember-me"];
  const status = document.querySelector("#login-status");

  function resetErrors() {
    for (const field of [email, password]) {
      field.removeAttribute("aria-invalid");
      const node = document.getElementById(`${field.id}-error`);
      if (node) {
        node.hidden = true;
        node.textContent = "";
      }
    }
    setStatus(status, "");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    resetErrors();
    const emailValue = email.value.trim().toLowerCase();
    const passwordValue = password.value;
    let firstInvalid = null;

    if (!emailValue) {
      showFieldError(email, "Email wajib diisi.");
      firstInvalid = firstInvalid || email;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      showFieldError(email, "Format email tidak valid.");
      firstInvalid = firstInvalid || email;
    }
    if (!passwordValue) {
      showFieldError(password, "Password wajib diisi.");
      firstInvalid = firstInvalid || password;
    } else if (passwordValue.length < 8) {
      showFieldError(password, "Password minimal 8 karakter.");
      firstInvalid = firstInvalid || password;
    }
    if (firstInvalid) {
      setStatus(status, "Periksa kembali email dan password.", true);
      firstInvalid.focus();
      return;
    }
    if (emailValue !== CURRENT_USER.email || passwordValue !== "NeedHelp123!") {
      setStatus(status, "Email atau password salah. Gunakan akun demo yang tersedia.", true);
      password.focus();
      return;
    }

    try {
      writeSession(Boolean(remember?.checked), {
        id: CURRENT_USER.id,
        email: CURRENT_USER.email,
        name: CURRENT_USER.name,
        at: new Date().toISOString(),
      });
    } catch {
      setStatus(status, "Sesi tidak dapat disimpan di browser ini.", true);
      return;
    }
    location.href = safeNext(params.get("next")) || "index.html";
  });

  for (const field of [email, password]) {
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      const node = document.getElementById(`${field.id}-error`);
      if (node) node.hidden = true;
    });
  }

  const modal = document.querySelector("#info-modal");
  const modalTitle = document.querySelector("#modal-title");
  const modalBody = document.querySelector("#modal-body");
  const info = {
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
  document.querySelectorAll("[data-info]").forEach((button) => {
    button.addEventListener("click", () => {
      const content = info[button.dataset.info];
      if (!content) return;
      if (modal?.showModal) {
        modalTitle.textContent = content.title;
        modalBody.textContent = content.body;
        modal.showModal();
      } else {
        setStatus(status, `${content.title}: ${content.body}`, false);
      }
    });
  });
}

function setupDetail() {
  const id = params.get("id");
  const backUrl = safeBack(params.get("back"));
  const back = document.querySelector("[data-detail-back]");
  if (back) back.href = backUrl;
  const storedPost = id ? getPost(id) : null;
  const post = id
    ? storedPost?.owned
      ? storedPost
      : getPublicPost(id)
    : null;
  if (!post) {
    document.title = "Postingan tidak ditemukan - NeedHelp";
    const setText = (selector, value) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    };
    const title = document.querySelector("[data-detail-title]");
    if (title) title.textContent = "Postingan tidak ditemukan";
    setText("[data-detail-crumb]", "Detail Postingan");
    setText("[data-detail-meta]", "Data tidak tersedia");
    setText("[data-detail-published]", "");
    setText("[data-detail-author]", "Tidak tersedia");
    setText("[data-detail-bio]", "");
    setText("[data-detail-rating]", "—");
    setText("[data-detail-category]", "Tidak tersedia");
    setText("[data-detail-compensation]", "Tidak tersedia");
    setText("[data-detail-time]", "Tidak tersedia");
    setText("[data-detail-location]", "Tidak tersedia");
    setText("[data-detail-sidebar-title]", "Postingan tidak tersedia");
    setText("[data-detail-sidebar-text]", "Kembali ke katalog untuk melihat postingan lain.");
    const avatar = document.querySelector("[data-detail-avatar]");
    if (avatar) {
      avatar.src = "./assets/images/avatar-user.svg";
      avatar.alt = "Foto profil tidak tersedia";
    }
    const description = document.querySelector("[data-detail-description]");
    if (description) {
      description.innerHTML = '<h2>Deskripsi Kebutuhan</h2><p>Postingan yang kamu cari tidak tersedia atau sudah dihapus.</p>';
    }
    const badges = document.querySelector("[data-detail-badges]");
    if (badges) badges.innerHTML = "";
    const chatLinks = document.querySelectorAll("[data-detail-chat-link]");
    chatLinks.forEach((link) => {
      link.href = backUrl;
    });
    const chat = document.querySelector("[data-detail-chat]");
    if (chat) {
      chat.textContent = "Kembali ke Katalog";
    }
    const secondaryChat = document.querySelector("[data-detail-chat-secondary]");
    if (secondaryChat) secondaryChat.hidden = true;
    const noteForm = document.querySelector("[data-detail-note-form]");
    if (noteForm) noteForm.hidden = true;
    const noteStatus = document.querySelector("[data-detail-note-status]");
    setStatus(noteStatus, "Kembali ke katalog untuk melihat postingan lain.", true);
    return;
  }

  const author = getPostAuthor(post);
  const typeLabel = post.nature === "butuh" ? "Saya Butuh" : "Saya Bisa";
  document.title = `${post.title} - NeedHelp`;
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  setText("[data-detail-crumb]", `Detail Postingan #${post.id}`);
  const meta = document.querySelector("[data-detail-meta]");
  if (meta) {
    meta.innerHTML = `<mark>${escapeHtml(typeLabel)}</mark> &bull; Kategori: ${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}`;
  }
  setText("[data-detail-title]", post.title);
  const published = document.querySelector("[data-detail-published]");
  if (published) {
    published.innerHTML = `Dipublikasikan oleh <strong>${escapeHtml(author.name)}</strong> pada <time datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatDateTime(post.createdAt))}</time>`;
  }

  const avatar = document.querySelector("[data-detail-avatar]");
  if (avatar) {
    avatar.src = author.avatar;
    avatar.alt = `Foto profil ${author.name}`;
  }
  setText("[data-detail-author]", author.name);
  setText("[data-detail-bio]", author.bio);
  setText("[data-detail-rating]", author.rating.split(" ")[0] || "—");
  const badges = document.querySelector("[data-detail-badges]");
  if (badges) {
    badges.innerHTML = `<li>Rating Pengguna: ${escapeHtml(author.rating)}</li><li>Status: ${escapeHtml(author.verification)}</li><li>Tingkat Keberhasilan Aktivitas: 100%</li>`;
  }

  const description = document.querySelector("[data-detail-description]");
  if (description) {
    const heading = post.nature === "butuh" ? "Deskripsi Kebutuhan" : "Deskripsi Penawaran";
    description.innerHTML = `<h2>${heading}</h2>${textParagraphs(post.description)}`;
  }

  setText("[data-detail-category]", CATEGORY_LABELS[post.category] || post.category);
  setText("[data-detail-compensation]", formatCompensation(post));
  setText("[data-detail-time]", `${formatDate(post.date)} (${formatTimeRange(post)})`);
  setText("[data-detail-location]", post.destination ? `${post.address} → ${post.destination}` : post.address);

  setText(
    "[data-detail-sidebar-title]",
    post.nature === "butuh" ? "Ajukan Penawaran Bantuan" : "Tertarik dengan Tawaran Ini?",
  );
  setText(
    "[data-detail-sidebar-text]",
    post.nature === "butuh"
      ? `Tertarik membantu ${author.name} menyelesaikan kebutuhan ini?`
      : `Hubungi ${author.name} untuk menanyakan detail penawaran bantuan ini.`,
  );
  const chatUrl = `chat.html?user=${encodeURIComponent(author.id)}&topic=${encodeURIComponent(post.title)}`;
  document.querySelectorAll("[data-detail-chat-link]").forEach((link) => {
    link.href = chatUrl;
  });
  const chat = document.querySelector("[data-detail-chat]");
  if (chat) {
    chat.textContent = post.nature === "butuh" ? "Mulai Chat & Tawarkan Bantuan" : "Mulai Chat & Tanyakan Detail";
  }

  const noteForm = document.querySelector("[data-detail-note-form]");
  const noteStatus = document.querySelector("[data-detail-note-status]");
  noteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!readSession()) {
      const next = `detail-postingan.html?id=${encodeURIComponent(post.id)}`;
      location.href = `login.html?next=${encodeURIComponent(next)}`;
      return;
    }
    const message = noteForm.elements.message?.value.trim() || "";
    if (!message) {
      setStatus(noteStatus, "Tulis catatan terlebih dahulu.", true);
      return;
    }
    try {
      saveMessage(author.id, message, post.title);
      location.href = `chat.html?user=${encodeURIComponent(author.id)}&topic=${encodeURIComponent(post.title)}`;
    } catch {
      setStatus(noteStatus, "Catatan belum dapat disimpan di browser ini.", true);
    }
  });
}

function setupPosting() {
  const form = document.querySelector("[data-post-form]") || document.querySelector("body.form-page main > form");
  if (!form) return;
  const status = document.querySelector("[data-form-status]") || statusNode(form, "[data-form-status]");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const values = {
      nature: data.get("post_nature") || "",
      title: data.get("title") || "",
      category: data.get("category") || "",
      description: data.get("description") || "",
      date: data.get("activity_date") || "",
      time: data.get("activity_time") || "",
      region: data.get("region") || "",
      address: data.get("address") || "",
      compensation: data.get("compensation_type") || "",
      amount: data.get("amount") || "",
      compensationNote: "",
      terms: Boolean(form.elements.terms?.checked),
    };
    const errors = validatePost(values);
    clearFieldErrors(form);
    const fields = {
      nature: form.querySelector('[name="post_nature"]'),
      title: form.elements.title,
      category: form.elements.category,
      description: form.elements.description,
      date: form.elements.activity_date,
      time: form.elements.activity_time,
      region: form.elements.region,
      address: form.elements.address,
      compensation: form.querySelector('[name="compensation_type"]'),
      amount: form.elements.amount,
      terms: form.elements.terms,
    };
    const order = ["nature", "title", "category", "description", "date", "time", "region", "address", "compensation", "amount", "terms"];
    for (const key of order) {
      if (errors[key] && fields[key]) showFieldError(fields[key], errors[key]);
    }
    const firstError = order.find((key) => errors[key]);
    if (firstError) {
      setStatus(status, errors[firstError], true);
      const firstField = fields[firstError];
      if (firstField) firstField.focus();
      return;
    }

    try {
      const user = { ...CURRENT_USER, name: session?.name || CURRENT_USER.name };
      const post = createPost(values, user);
      location.href = `sukses-postingan.html?id=${encodeURIComponent(post.id)}`;
    } catch {
      setStatus(status, "Postingan belum dapat disimpan karena penyimpanan browser tidak tersedia.", true);
    }
  });
}

function setupSuccess() {
  const post = getPost(params.get("id"));
  const message = document.querySelector("[data-success-message]");
  if (!post || !post.owned) {
    const summary = document.querySelector("[data-success-summary]");
    if (summary) summary.hidden = true;
    setStatus(message, "Data postingan demo tidak ditemukan. Silakan kembali ke aktivitas atau katalog.", true);
    return;
  }
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  setText("[data-success-id]", `#${post.id}`);
  setText("[data-success-type]", post.nature === "butuh" ? "Saya Butuh (Pencarian Teman/Bantuan)" : "Saya Bisa (Penawaran Bantuan)");
  setText(
    "[data-success-status]",
    post.nature === "butuh"
      ? "Menunggu Penawaran Relawan"
      : "Menunggu Respon Peminta Bantuan",
  );
  const time = document.querySelector("[data-success-time]");
  if (time) {
    time.textContent = formatDateTime(post.createdAt);
    time.setAttribute("datetime", post.createdAt);
  }
}

const ACTIVITY_LABELS = {
  berlangsung: "Sedang Berlangsung",
  menunggu: "Menunggu Respon",
  selesai: "Selesai",
  batal: "Dibatalkan",
};

function activityCard(activity) {
  const post = getPost(activity.postId);
  const label = ACTIVITY_LABELS[activity.status] || activity.status;
  const category = post ? CATEGORY_LABELS[post.category] || post.category : "Aktivitas";
  const partnerLine = activity.partner
    ? `<p>Partner Relawan: <strong>${escapeHtml(activity.partner)}</strong></p>`
    : post
      ? `<p>Dipasang: <time datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatDateTime(post.createdAt))}</time></p>`
      : "";
  const canOpenPost = Boolean(post && (post.owned || activity.status !== "batal"));
  const links = [];
  if (canOpenPost) links.push(`<a href="detail-postingan.html?id=${encodeURIComponent(post.id)}">Lihat Detail</a>`);
  if (activity.status === "berlangsung" && activity.partnerId) {
    links.push(`<a href="chat.html?user=${encodeURIComponent(activity.partnerId)}">Buka Obrolan Chat</a>`);
    links.push(`<a href="rating.html?id=${encodeURIComponent(activity.id)}">Selesaikan &amp; Beri Ulasan</a>`);
  }
  if (activity.status === "selesai" && !activity.review) {
    links.push(`<a href="rating.html?id=${encodeURIComponent(activity.id)}">Beri Ulasan</a>`);
  }
  if (activity.status === "menunggu") {
    links.push(`<button type="button" class="link-button" data-cancel-activity="${escapeHtml(activity.id)}">Batalkan Postingan</button>`);
  }
  if (activity.status === "batal") links.push("<span>Postingan dibatalkan.</span>");
  const review = activity.review
    ? `<p>Ulasan kamu: <em>&ldquo;${escapeHtml(activity.review.comment)}&rdquo;</em> (${escapeHtml(String(activity.review.rating))}.0 / 5.0 &#9733;)</p>`
    : "";
  return `
    <article>
      <header>
        <p><mark>${escapeHtml(label)}</mark> &bull; Kategori: ${escapeHtml(category)}</p>
        <h3>${canOpenPost ? `<a href="detail-postingan.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a>` : post ? escapeHtml(post.title) : "Postingan tidak tersedia"}</h3>
        ${partnerLine}
      </header>
      <p>${escapeHtml(activity.note)}</p>
      ${review}
      <p>${links.join(" ")}</p>
    </article>`;
}

function setupActivity() {
  const stats = document.querySelector("[data-activity-stats]");
  const list = document.querySelector("[data-activity-list]");
  const status = document.querySelector("[data-activity-status]");
  if (!list) return;

  function render() {
    const activities = getActivities();
    const summary = getActivityStats(activities);
    if (stats) {
      stats.innerHTML = `
        <tr><th scope="row">Total Aktivitas</th><td>${summary.total}</td><td>Keseluruhan riwayat partisipasi</td></tr>
        <tr><th scope="row">Sedang Berlangsung</th><td>${summary.berlangsung}</td><td>Membutuhkan tindak lanjut atau pelaksanaan</td></tr>
        <tr><th scope="row">Selesai</th><td>${summary.selesai}</td><td>Telah ditutup dan diberi ulasan</td></tr>
        <tr><th scope="row">Dibatalkan</th><td>${summary.batal}</td><td>Tidak mencapai kesepakatan</td></tr>`;
    }
    list.innerHTML = activities.length
      ? activities.map(activityCard).join("")
      : '<p class="empty-state">Belum ada aktivitas. Mulai dari katalog atau buat postingan baru.</p>';
    if (params.get("rated") === "1") {
      setStatus(status, "Terima kasih! Ulasanmu sudah disimpan.", false);
    }
  }

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cancel-activity]");
    if (!button) return;
    if (!confirm("Batalkan aktivitas ini?")) return;
    try {
      cancelActivity(button.dataset.cancelActivity);
      render();
    } catch {
      setStatus(status, "Status aktivitas belum dapat disimpan di browser ini.", true);
    }
  });
  render();
}

function chatContact(conversation, active) {
  const person = getPerson(conversation.userId);
  const last = conversation.messages.at(-1);
  const preview = last
    ? `${last.from === "me" ? "Kamu" : person.name.split(" ")[0]}: ${last.text}`
    : "Belum ada pesan.";
  return `
    <li>
      <article>
        <header>
          <img src="${escapeHtml(person.avatar)}" alt="Avatar ${escapeHtml(person.name)}" width="32" height="32">
          <h3><a href="chat.html?user=${encodeURIComponent(conversation.userId)}&topic=${encodeURIComponent(conversation.topic || "")}">${escapeHtml(person.name)}</a></h3>
          <p><small>${active ? "Aktif sekarang" : escapeHtml(formatMessageTime(last?.at) || "Baru saja")}</small></p>
        </header>
        <p><strong>${last?.from === "me" ? "Kamu" : escapeHtml(person.name.split(" ")[0])}:</strong> <em>${escapeHtml(preview.replace(/^[^:]+:\s*/, ""))}</em></p>
      </article>
    </li>`;
}

function chatMessage(message, person) {
  const mine = message.from === "me";
  return `
    <li data-sender="${mine ? "me" : "them"}">
      <article>
        <header>
          <h4>${mine ? "Kamu" : escapeHtml(person.name)}</h4>
          <p><time datetime="${escapeHtml(message.at)}">${escapeHtml(formatMessageTime(message.at))}</time></p>
        </header>
        <p>${escapeHtml(message.text)}</p>
      </article>
    </li>`;
}

function setupChat() {
  const contacts = document.querySelector("[data-chat-contacts]");
  const messages = document.querySelector("[data-chat-messages]");
  const form = document.querySelector("[data-chat-form]") || document.querySelector("body.chat-page main > section > form");
  const status = document.querySelector("[data-chat-status]");
  if (!messages) return;

  const conversations = getConversations();
  let userId = params.get("user") || Object.keys(conversations)[0] || "budi-pratama";
  let topic = params.get("topic") || "";
  let conversation = conversations[userId] || null;
  if (!conversation) {
    try {
      conversation = ensureConversation(userId, topic);
      conversations[userId] = conversation;
    } catch {
      conversation = {
        userId,
        topic: topic || "Diskusi bantuan",
        messages: [],
      };
      setStatus(status, "Penyimpanan browser tidak tersedia; pesan baru tidak dapat disimpan.", true);
    }
  }
  topic = topic || conversation.topic || "Diskusi bantuan";

  function render() {
    const person = getPerson(userId);
    if (contacts) {
      const ids = [userId, ...Object.keys(conversations).filter((id) => id !== userId)];
      contacts.innerHTML = ids
        .map((id) => {
          const item = id === userId ? conversation : conversations[id];
          return item ? chatContact(item, id === userId) : "";
        })
        .join("");
    }
    const title = document.querySelector("[data-chat-title]");
    if (title) title.textContent = `Percakapan dengan ${person.name}`;
    const topicNode = document.querySelector("[data-chat-topic]");
    if (topicNode) topicNode.textContent = topic;
    const ratingLink = document.querySelector("[data-chat-rating]");
    if (ratingLink) {
      const activity = getActivities().find(
        (item) =>
          item.partnerId === userId &&
          ["berlangsung", "selesai"].includes(item.status) &&
          !item.review,
      );
      ratingLink.hidden = !activity;
      if (activity) {
        ratingLink.href = `rating.html?id=${encodeURIComponent(activity.id)}`;
      }
    }
    messages.innerHTML = conversation.messages.length
      ? conversation.messages.map((message) => chatMessage(message, person)).join("")
      : '<li><p class="empty-state">Belum ada pesan. Mulai percakapan dari sini.</p></li>';
    const box = messages.closest("section");
    if (box) box.scrollTop = box.scrollHeight;
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.chat_message;
    const text = input?.value.trim() || "";
    if (!text) {
      setStatus(status, "Tulis pesan terlebih dahulu.", true);
      input?.focus();
      return;
    }
    try {
      conversation = saveMessage(userId, text, topic);
      conversations[userId] = conversation;
      input.value = "";
      setStatus(status, "");
      render();
    } catch {
      setStatus(status, "Pesan belum dapat disimpan karena penyimpanan browser tidak tersedia.", true);
    }
  });
  render();
}

function setupRating() {
  const form = document.querySelector("[data-rating-form]") || document.querySelector("body.rating-page main > form");
  if (!form) return;
  const status = document.querySelector("[data-rating-status]") || statusNode(form, "[data-rating-status]");
  const id = params.get("id");
  const { activity, reason } = getRateableActivity(id);
  if (!activity) {
    const messages = {
      missing: "Pilih aktivitas dari halaman Aktivitas sebelum memberi ulasan.",
      "not-found": "Aktivitas yang akan dinilai tidak ditemukan.",
      pending: "Aktivitas ini belum berlangsung, jadi belum dapat dinilai.",
      cancelled: "Aktivitas yang dibatalkan tidak dapat dinilai.",
    };
    setStatus(status, messages[reason] || "Aktivitas tidak dapat dinilai.", true);
    document.querySelector("[data-rating-summary]")?.setAttribute("hidden", "");
    form.querySelectorAll("input, textarea, select, button").forEach((node) => {
      node.disabled = true;
    });
    return;
  }
  const post = getPost(activity.postId);
  const partner = activity.partner || "Rekan Bantuan";
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  setText("[data-rating-title]", post?.title || "Aktivitas NeedHelp");
  setText("[data-rating-partner]", partner);
  setText("[data-rating-date]", post ? formatDate(post.date) : activity.note);
  setText(
    "[data-rating-location]",
    post ? `${post.address}${post.destination ? ` ke ${post.destination}` : ""}` : "Lokasi sesuai kesepakatan",
  );
  setText("[data-rating-status-label]", activity.status === "selesai" ? "Aktivitas Selesai" : "Aktivitas Akan Diselesaikan");
  setText("[data-rating-badge-legend]", `Apa yang Paling Kamu Apresiasi dari ${partner}?`);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const review = String(data.get("review") || "").trim();
    if (review.length < 10) {
      setStatus(status, "Ulasan minimal 10 karakter.", true);
      form.elements.review?.focus();
      return;
    }
    const stars = Number(data.get("star_rating"));
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      setStatus(status, "Pilih rating 1 sampai 5.", true);
      return;
    }
    try {
      saveRating(activity.id, {
        rating: stars,
        comment: review,
        badges: data.getAll("badges"),
        recommend: data.get("recommend") || "yes",
        at: new Date().toISOString(),
      });
      location.href = "aktivitas.html?rated=1";
    } catch {
      setStatus(status, "Ulasan belum dapat disimpan. Kembali ke Aktivitas lalu coba lagi.", true);
    }
  });
}

function notificationCard(item) {
  return `
    <li>
      <a class="notification-card${item.read ? "" : " is-unread"}" href="${escapeHtml(item.href)}" data-notification-id="${escapeHtml(item.id)}">
        <span class="notification-icon">
          <img src="${escapeHtml(item.icon)}" alt="" width="24" height="24">
        </span>
        <span class="notification-body">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="notification-message">${escapeHtml(item.message)}</span>
        </span>
        <time datetime="${escapeHtml(item.at)}">${escapeHtml(item.timeLabel)}</time>
        ${item.read ? "" : '<span class="notification-dot" role="img" aria-label="Belum dibaca"></span>'}
      </a>
    </li>`;
}

function setupNotifications() {
  const list = document.querySelector("[data-notification-list]");
  const count = document.querySelector("[data-notification-count]");
  const readAll = document.querySelector("[data-notif-read-all]");
  const filters = document.querySelectorAll("[data-notif-filter]");
  if (!list) return;
  let filter = "all";

  function render() {
    const notifications = getNotifications();
    const unread = notifications.filter((item) => !item.read).length;
    const visible = filter === "all" ? notifications : notifications.filter((item) => item.type === filter);
    list.innerHTML = visible.length
      ? visible.map(notificationCard).join("")
      : '<li><p class="empty-state">Tidak ada notifikasi untuk filter ini.</p></li>';
    if (count) count.textContent = `${unread} belum dibaca dari ${notifications.length} notifikasi`;
    filters.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.notifFilter === filter));
    });
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.notifFilter;
      render();
    });
  });
  list.addEventListener("click", (event) => {
    const link = event.target.closest("[data-notification-id]");
    if (!link) return;
    try {
      markNotificationRead(link.dataset.notificationId);
    } catch {}
  });
  readAll?.addEventListener("click", () => {
    try {
      markAllNotificationsRead();
      render();
    } catch {}
  });
  render();
}

const setups = {
  "index.html": setupHome,
  "katalog.html": setupCatalog,
  "detail-postingan.html": setupDetail,
  "buat-postingan.html": setupPosting,
  "sukses-postingan.html": setupSuccess,
  "aktivitas.html": setupActivity,
  "chat.html": setupChat,
  "rating.html": setupRating,
  "notifikasi.html": setupNotifications,
  "login.html": setupLogin,
};

if (!privatePages.includes(page) || session) {
  setups[page]?.();
}
