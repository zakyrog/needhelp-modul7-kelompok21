import INITIAL_POSTS from "../data/posts.js";

export const CURRENT_USER = {
  id: "demo-user",
  name: "Pengguna Demo",
  email: "demo@needhelp.test",
};

export const CATEGORY_LABELS = {
  ditemani: "Ditemani",
  bantuan: "Bantuan Fisik",
  pendampingan: "Pendampingan",
  explore: "Explore",
};

export const REGION_LABELS = {
  sleman: "Sleman",
  kota: "Kota Yogyakarta",
  bantul: "Bantul",
  kulonprogo: "Kulon Progo",
  gunungkidul: "Gunungkidul",
};

export const COMPENSATION_LABELS = {
  tarif: "Tarif Pasti",
  nego: "Nego di Chat",
  patungan: "Patungan",
  bayarsendiri: "Bayar Sendiri-sendiri",
  traktir: "Traktir",
  sukarela: "Sukarela",
};

export const PEOPLE = {
  "sari-wijaya": {
    id: "sari-wijaya",
    name: "Sari Wijaya",
    bio: "Mahasiswi perantau di Pogung, Sleman",
    avatar: "/assets/images/avatar-sari.svg",
    initial: "S",
    avatarClass: "avatar-teal",
    rating: "4.9 / 5.0 (dari 8 ulasan)",
    verification: "Identitas Kampus Terverifikasi",
  },
  "budi-pratama": {
    id: "budi-pratama",
    name: "Budi Pratama",
    bio: "Mahasiswa dan relawan bantuan fisik di Sleman",
    avatar: "/assets/images/avatar-budi.svg",
    initial: "B",
    avatarClass: "avatar-green",
    rating: "4.8 / 5.0 (dari 12 ulasan)",
    verification: "Identitas Kampus Terverifikasi",
  },
  "rina-putri": {
    id: "rina-putri",
    name: "Rina Putri",
    bio: "Mahasiswa dan partner belajar di Kota Yogyakarta",
    avatar: "/assets/images/avatar-rina.svg",
    initial: "R",
    avatarClass: "avatar-blue",
    rating: "4.9 / 5.0 (dari 10 ulasan)",
    verification: "Identitas Kampus Terverifikasi",
  },
};

// Seed posts diekspor untuk kompatibilitas mundur
export const DEMO_POSTS = INITIAL_POSTS;

let cachedSeedPosts = null;

export const DEMO_ACTIVITIES = [
  {
    id: "act-pindahan",
    postId: "post-pindahan",
    status: "berlangsung",
    partner: "Budi Pratama",
    partnerId: "budi-pratama",
    note: "Jadwal temu disepakati pada Sabtu, 24 Oktober 2026 pukul 09.00 WIB di Pogung Baru.",
  },
  {
    id: "act-ngopi",
    postId: "post-ngopi",
    status: "menunggu",
    note: "Postingan aktif di katalog publik dan menunggu calon partner yang cocok.",
  },
  {
    id: "act-belajar",
    postId: "post-belajar",
    status: "selesai",
    partner: "Rina Putri",
    partnerId: "rina-putri",
    note: "Aktivitas selesai pada 12 Oktober 2026.",
    review: {
      rating: 5,
      comment: "Sangat ramah, komunikatif, dan penjelasannya mudah dipahami!",
    },
  },
];

export const SEED_CONVERSATIONS = {
  "budi-pratama": {
    userId: "budi-pratama",
    topic: "Bantuan Pindahan Kos & Angkat Lemari",
    messages: [
      {
        from: "me",
        text: "Halo mas Budi, untuk pindahan kos hari Sabtu jam 09.00 apakah bisa bantu angkat lemari?",
        at: "2026-10-18T14:10:00+07:00",
      },
      {
        from: "them",
        text: "Halo! Bisa banget, kebetulan saya free dari pagi sampai siang. Lokasi titik kumpul tepatnya di mana?",
        at: "2026-10-18T14:12:00+07:00",
      },
      {
        from: "me",
        text: "Di Pogung Baru Blok D, pindahnya ke kos dekat Palagan. Nanti kompensasinya Rp50.000 plus makan siang ya mas.",
        at: "2026-10-18T14:15:00+07:00",
      },
      {
        from: "them",
        text: "Siap, sepakat ya. Sampai ketemu hari Sabtu pukul 09.00 pagi!",
        at: "2026-10-18T14:18:00+07:00",
      },
    ],
  },
  "rina-putri": {
    userId: "rina-putri",
    topic: "Diskusi tugas akhir",
    messages: [
      {
        from: "me",
        text: "Rina, masih sempat diskusi bab pembahasan minggu ini?",
        at: "2026-10-17T19:40:00+07:00",
      },
      {
        from: "them",
        text: "Sempat! Kita bisa ketemu sore di Cosan Palagan. Nanti aku kabari lagi ya.",
        at: "2026-10-17T19:44:00+07:00",
      },
    ],
  },
};

export const DEMO_NOTIFICATIONS = [
  {
    id: "notif-kebersihan",
    type: "post",
    title: "Permintaan bantuan baru di dekatmu",
    message: "Rina mencari bantuan antar barang di Seturan untuk besok.",
    href: "/detail-postingan?id=post-antar",
    timeLabel: "5 menit lalu",
    at: "2026-10-18T09:15:00+07:00",
    icon: "/assets/images/icon-kebersihan.svg",
  },
  {
    id: "notif-chat",
    type: "chat",
    title: "Pesan baru dari Budi Pratama",
    message: "Budi mengonfirmasi jadwal pindahan Sabtu pukul 09.00.",
    href: "/chat?user=budi-pratama",
    timeLabel: "1 jam lalu",
    at: "2026-10-18T08:20:00+07:00",
    icon: "/assets/images/icon-kurir.svg",
  },
  {
    id: "notif-rating",
    type: "rating",
    title: "Beri rating untuk bantuan yang selesai",
    message: "Bantuan belajar bersama Rina sudah selesai. Bagikan pengalamanmu.",
    href: "/rating?id=act-belajar",
    timeLabel: "Kemarin",
    at: "2026-10-17T19:40:00+07:00",
    icon: "/assets/images/icon-quote.svg",
  },
  {
    id: "notif-post",
    type: "post",
    title: "Tawaran bantuanmu diterima",
    message: "Budi menerima tawaran bantuan kurirmu. Cek detail aktivitas.",
    href: "/aktivitas",
    timeLabel: "Kemarin",
    at: "2026-10-17T10:00:00+07:00",
    icon: "/assets/images/icon-kurir.svg",
  },
];

export const POSTS_KEY = "needhelp.demo-posts.v1";
export const CHATS_KEY = "needhelp.demo-chats.v1";
export const NOTIFICATIONS_KEY = "needhelp.demo-read-notifications.v1";
export const ACTIVITY_STATE_KEY = "needhelp.demo-activity-state.v1";

export function readJson(key, fallback) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Penyimpanan browser tidak tersedia.");
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getPerson(id) {
  return (
    PEOPLE[id] || {
      id,
      name: "Pengguna NeedHelp",
      bio: "Pengguna komunitas NeedHelp",
      avatar: "/assets/images/avatar-user.svg",
      initial: "N",
      avatarClass: "avatar-blue",
      rating: "Belum ada rating",
      verification: "Belum diverifikasi",
    }
  );
}

export function getPostAuthor(post) {
  const person = getPerson(post.authorId);
  return {
    ...person,
    name: post.authorName || person.name,
    bio: post.authorBio || person.bio,
    avatar: post.authorAvatar || person.avatar,
    initial: post.authorInitial || person.initial,
    avatarClass: post.avatarClass || person.avatarClass,
  };
}

export function getUserPosts() {
  const posts = readJson(POSTS_KEY, []);
  return Array.isArray(posts) ? posts : [];
}

/**
 * Mengambil data awal seed dari /data/posts.json secara dinamis di browser.
 * Jika berkas JSON diubah di public/data/posts.json, perubahan langsung terbaca.
 */
export async function fetchSeedPosts() {
  if (typeof window === "undefined") {
    return INITIAL_POSTS;
  }

  try {
    const res = await fetch(`/data/posts.json?_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Gagal memuat sumber JSON (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      cachedSeedPosts = data;
      return data;
    }
    return INITIAL_POSTS;
  } catch (err) {
    if (cachedSeedPosts) return cachedSeedPosts;
    console.warn("Gagal fetch /data/posts.json, menggunakan fallback data lokal:", err);
    return INITIAL_POSTS;
  }
}

export function getSeedPosts() {
  return cachedSeedPosts || INITIAL_POSTS;
}

/**
 * Mengambil seluruh postingan (localStorage user + sumber JSON).
 * Mendukung simulasi error terkontrol untuk QA-06 via param URL atau window.__SIMULATE_FETCH_ERROR__.
 */
export async function fetchPosts({ simulateError = false } = {}) {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const hasSimulateParam =
      urlParams.get("simulate_error") === "1" || urlParams.get("error") === "1";
    if (simulateError || hasSimulateParam || window.__SIMULATE_FETCH_ERROR__) {
      throw new Error(
        "Simulasi error: Gagal mengambil data dari sumber JSON/API. Silakan periksa koneksi atau klik 'Coba Lagi'.",
      );
    }
  }

  const seed = await fetchSeedPosts();
  return [...getUserPosts(), ...seed];
}

export function getPosts() {
  return [...getUserPosts(), ...getSeedPosts()];
}

export function getPublicPosts() {
  const cancelledPostIds = new Set(
    getActivities()
      .filter((activity) => activity.status === "batal")
      .map((activity) => activity.postId),
  );
  return getPosts().filter((post) => !cancelledPostIds.has(post.id));
}

export async function fetchPublicPosts(options) {
  const posts = await fetchPosts(options);
  const cancelledPostIds = new Set(
    getActivities()
      .filter((activity) => activity.status === "batal")
      .map((activity) => activity.postId),
  );
  return posts.filter((post) => !cancelledPostIds.has(post.id));
}

export function getPost(id) {
  return getPosts().find((post) => post.id === id) || null;
}

export function getPublicPost(id) {
  return getPublicPosts().find((post) => post.id === id) || null;
}

export function savePost(post) {
  const posts = getUserPosts();
  posts.unshift(post);
  writeJson(POSTS_KEY, posts);
  return post;
}

export function createPost(values, user = CURRENT_USER, { simulateError = false } = {}) {
  if (typeof window !== "undefined") {
    const isSimulateTitle =
      typeof values?.title === "string" && values.title.includes("[simulasi-gagal]");
    if (simulateError || window.__SIMULATE_SAVE_ERROR__ || isSimulateTitle) {
      throw new Error(
        "Simulasi error: Gagal menyimpan data postingan ke penyimpanan lokal. Silakan coba lagi.",
      );
    }
  }

  const createdAt = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const uniqueId = `post-${Date.now()}-${randomSuffix}`;

  return savePost({
    id: uniqueId,
    nature: values.nature,
    title: values.title.trim(),
    summary: values.description.trim().slice(0, 150),
    description: values.description.trim(),
    category: values.category,
    region: values.region,
    address: values.address.trim(),
    destination: values.destination?.trim() || "",
    date: values.date,
    time: values.time,
    endTime: "",
    compensation: values.compensation,
    amount: values.compensation === "tarif" ? Number(values.amount) : null,
    compensationNote: values.compensationNote?.trim() || "",
    authorId: user.id,
    authorName: user.name,
    authorBio: "Pengguna demo NeedHelp",
    authorAvatar: "/assets/images/avatar-user.svg",
    authorInitial: (user.name || "P").charAt(0).toUpperCase(),
    avatarClass: "avatar-blue",
    createdAt,
    timeLabel: "Baru saja",
    owned: true,
  });
}

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  if (!year || !month || !day) return isoDate;
  return `${day} ${months[month - 1]} ${year}`;
}

export function formatTimeRange(post) {
  return post.endTime
    ? `${post.time} - ${post.endTime} WIB`
    : `${post.time} WIB`;
}

export function formatRupiah(amount) {
  return `Rp${Number(amount || 0).toLocaleString("id-ID")}`;
}

export function formatCompensation(post) {
  const base = COMPENSATION_LABELS[post.compensation] || post.compensation;
  if (post.compensation === "tarif") {
    return `${formatRupiah(post.amount)}${post.compensationNote ? ` + ${post.compensationNote}` : ""}`;
  }
  return post.compensationNote ? `${base} (${post.compensationNote})` : base;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")} WIB`;
}

export function filterPosts(posts, filters = {}) {
  const query = (filters.query || "").trim().toLowerCase();
  const categories = Array.isArray(filters.categories)
    ? filters.categories
    : filters.categories
      ? [filters.categories]
      : [];
  return posts.filter((post) => {
    const author = getPostAuthor(post);
    const haystack = [
      post.title,
      post.summary,
      post.description,
      author.name,
      CATEGORY_LABELS[post.category],
      REGION_LABELS[post.region],
      COMPENSATION_LABELS[post.compensation],
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (filters.type && filters.type !== "all" && post.nature !== filters.type)
      return false;
    if (categories.length && !categories.includes(post.category)) return false;
    if (filters.location && post.region !== filters.location) return false;
    if (filters.compensation && post.compensation !== filters.compensation)
      return false;
    return true;
  });
}

export function getActivityState() {
  const state = readJson(ACTIVITY_STATE_KEY, {});
  return state && typeof state === "object" ? state : {};
}

export function setActivityState(id, patch) {
  const state = getActivityState();
  state[id] = { ...(state[id] || {}), ...patch };
  writeJson(ACTIVITY_STATE_KEY, state);
}

export function getActivities() {
  const userActivities = getUserPosts().map((post) => ({
    id: post.id,
    postId: post.id,
    status: "menunggu",
    note: "Postingan aktif di katalog publik dan menunggu calon partner.",
    owned: true,
  }));
  const state = getActivityState();
  return [...userActivities, ...DEMO_ACTIVITIES].map((activity) => ({
    ...activity,
    ...(state[activity.id] || {}),
  }));
}

export function getActivity(id) {
  return getActivities().find((activity) => activity.id === id) || null;
}

export function getActivityStats(activities = getActivities()) {
  return {
    total: activities.length,
    berlangsung: activities.filter((item) => item.status === "berlangsung")
      .length,
    selesai: activities.filter((item) => item.status === "selesai").length,
    batal: activities.filter((item) => item.status === "batal").length,
  };
}

export function getRateableActivity(id) {
  if (!id) return { activity: null, reason: "missing" };
  const activity = getActivity(id);
  if (!activity) return { activity: null, reason: "not-found" };
  if (activity.status === "menunggu")
    return { activity: null, reason: "pending" };
  if (activity.status === "batal")
    return { activity: null, reason: "cancelled" };
  if (!["berlangsung", "selesai"].includes(activity.status))
    return { activity: null, reason: "invalid-status" };
  return { activity, reason: null };
}

export function saveRating(activityId, rating) {
  const { activity, reason } = getRateableActivity(activityId);
  if (!activity) {
    throw new Error(`Aktivitas tidak dapat dinilai (${reason}).`);
  }
  const stars = Number(rating?.rating);
  const comment = String(rating?.comment || "").trim();
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error("Rating harus berupa bilangan bulat 1 sampai 5.");
  }
  if (comment.length < 10) {
    throw new Error("Ulasan minimal 10 karakter.");
  }
  setActivityState(activity.id, {
    status: "selesai",
    review: { ...rating, rating: stars, comment },
  });
}

export function cancelActivity(activityId) {
  setActivityState(activityId, { status: "batal" });
}

export function getConversations() {
  const stored = readJson(CHATS_KEY, {});
  const merged = { ...SEED_CONVERSATIONS };
  if (stored && typeof stored === "object") {
    for (const [userId, conversation] of Object.entries(stored)) {
      merged[userId] = conversation;
    }
  }
  return merged;
}

export function getConversation(userId) {
  return getConversations()[userId] || null;
}

export function ensureConversation(userId, topic) {
  const conversations = getConversations();
  if (conversations[userId]) return conversations[userId];
  const person = getPerson(userId);
  const conversation = {
    userId,
    topic: topic || "Diskusi bantuan",
    messages: [
      {
        from: "them",
        text: `Halo! Saya ${person.name}. Ada yang bisa saya bantu terkait postingan ini?`,
        at: new Date().toISOString(),
      },
    ],
  };
  conversations[userId] = conversation;
  writeJson(CHATS_KEY, conversations);
  return conversation;
}

export function saveMessage(userId, text, topic) {
  const conversations = getConversations();
  const conversation =
    conversations[userId] || ensureConversation(userId, topic);
  conversation.messages.push({
    from: "me",
    text: text.trim(),
    at: new Date().toISOString(),
  });
  if (topic) conversation.topic = topic;
  conversations[userId] = conversation;
  writeJson(CHATS_KEY, conversations);
  return conversation;
}

export function getNotifications() {
  const read = readJson(NOTIFICATIONS_KEY, []);
  const readIds = Array.isArray(read) ? read : [];
  return DEMO_NOTIFICATIONS.map((notification) => ({
    ...notification,
    read: readIds.includes(notification.id),
  }));
}

export function markNotificationRead(id) {
  const stored = readJson(NOTIFICATIONS_KEY, []);
  const read = new Set(Array.isArray(stored) ? stored : []);
  read.add(id);
  writeJson(NOTIFICATIONS_KEY, [...read]);
}

export function markAllNotificationsRead() {
  writeJson(
    NOTIFICATIONS_KEY,
    DEMO_NOTIFICATIONS.map((notification) => notification.id),
  );
}

