"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  getOrCreateConversation,
  markConversationRead,
  subscribeToConversationMessages,
  mergeIncomingMessage,
  CHAT_ERROR_CODES,
  MESSAGES_PAGE_SIZE,
} from "../../lib/chat.js";
import { fetchPostLifecycle } from "../../lib/data.js";
import { subscribeToPostChanges } from "../../lib/notification-realtime.js";
import { readSession } from "../../lib/auth.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";
import { useToast } from "../../components/Toast";

const LIFECYCLE_LABEL = {
  aktif: "Masih aktif",
  selesai: "Selesai",
  batal: "Dibatalkan",
  dihapus: "Postingan dihapus",
  tidakDikenal: "Status tidak diketahui",
};

// Logging diagnostik SEMENTARA (memudahkan menelusuri akar "Menghubungkan pesan
// baru..." tanpa mencetak token/password). Aktif hanya bila NEXT_PUBLIC_CHAT_DEBUG=1.
const CHAT_DEBUG =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_CHAT_DEBUG === "1";

function logChat(...args) {
  if (CHAT_DEBUG) console.log("[chat-page]", ...args);
}

// DIAGNOSTIK SEMENTARA, selalu tampil di console browser (tidak butuh env var).
// Mencatat id/status/panjang state — bukan token/password/isi pesan.
function diagPage(...args) {
  console.info("[chat-page][diagnostik]", ...args);
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso) {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Date.now() - time;
  if (diff < 60_000) return "Baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam`;
  return new Date(time).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const supabaseMode = isSupabaseConfigured();

  const [ready, setReady] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [pendingPartner, setPendingPartner] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [lifecycle, setLifecycle] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const myUserId = readSession()?.id ? String(readSession().id) : null;

  const messagesEndRef = useRef(null);
  const activeIdRef = useRef(null);

  activeIdRef.current = activeId;

  // --- Proteksi halaman ------------------------------------------------------
  useEffect(() => {
    const session = readSession();
    logChat("proteksi halaman: session =", session ? "ada (id=" + session.id + ")" : "tidak ada", "; supabase =", supabaseMode);
    if (!session) {
      showToast("Silakan masuk terlebih dahulu untuk mengakses pesan.", "info");
      router.replace("/login?next=/chat");
      return;
    }
    if (!supabaseMode) {
      // Mode demo lama tidak memakai chat nyata; arahkan ke login Supabase.
      setReady(true);
      setLoadingList(false);
      return;
    }
    setReady(true);
  }, [router, showToast, supabaseMode]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // --- Muat daftar percakapan ------------------------------------------------
  const loadConversations = useCallback(async () => {
    if (!supabaseMode) return [];
    try {
      setListError(null);
      const list = await fetchConversations();
      setConversations(list);
      return list;
    } catch (err) {
      setListError(err.message || "Gagal memuat percakapan.");
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [supabaseMode]);

  // --- Pilih/ tangani target dari URL (?c=<id> atau ?user=<uuid>&topic=) ----
  const resolveInitialTarget = useCallback(
    async (list) => {
      const queryId = searchParams.get("c");
      const queryUser = searchParams.get("user");

      if (queryId) {
        const found = list.find((c) => c.id === queryId);
        setActiveId(queryId);
        logChat("resolveInitialTarget: ?c =", queryId, found ? "ditemukan di daftar" : "TIDAK ditemukan di daftar (mungkin baru dibuat)");
        return found || null;
      }

      if (queryUser) {
        const queryPost = searchParams.get("post");
        // Bila tautan membawa post, pakai percakapan untuk post itu (satu post
        // punya paling banyak satu percakapan per pasangan pengguna).
        const existing = queryPost
          ? list.find((c) => c.otherUserId === queryUser && c.postId === queryPost)
          : list.find((c) => c.otherUserId === queryUser);
        if (existing) {
          setActiveId(existing.id);
          logChat("resolveInitialTarget: ?user =", queryUser, "ditemukan (conversation =", existing.id, ")");
          return existing;
        }

        // Belum ada percakapan. Bila post diketahui, server yang memutuskan
        // boleh/tidaknya (RPC 012 memeriksa hubungan dengan postingan).
        logChat("resolveInitialTarget: ?user =", queryUser, "belum ada percakapan -> pendingPartner (post =", queryPost ?? null, ")");
        setActiveId(null);
        setPendingPartner(queryUser);
        return null;
      }

      if (list.length > 0) {
        setActiveId(list[0].id);
        return list[0];
      }
      setActiveId(null);
      return null;
    },
    [searchParams],
  );

  useEffect(() => {
    if (!ready || !supabaseMode) return;
    let cancelled = false;
    (async () => {
      const list = await loadConversations();
      if (cancelled) return;
      await resolveInitialTarget(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, supabaseMode, loadConversations, resolveInitialTarget]);

  // --- Muat riwayat pesan aktif ---------------------------------------------
  const loadThread = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      return;
    }
    setLoadingThread(true);
    setThreadError(null);
    try {
      const { messages: rows, hasMore: more } = await fetchMessages(conversationId, {
        limit: MESSAGES_PAGE_SIZE,
      });
      if (activeIdRef.current !== conversationId) return;
      setMessages(rows);
      setHasMore(more);
      // Membuka percakapan = membaca pesannya; kegagalan tanda baca tidak
      // memblokir tampilan.
      markConversationRead(conversationId).catch(() => {});
    } catch (err) {
      if (activeIdRef.current !== conversationId) return;
      setMessages([]);
      setHasMore(false);
      setThreadError(err.message || "Gagal memuat pesan.");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    loadThread(activeId);
  }, [activeId, loadThread]);

  // --- Status postingan untuk kartu Topik Percakapan ------------------------
  // `lifecycleTick` dipakai untuk memicu muat ulang setelah event realtime.
  // Nilai di-reset ke null setiap kali percakapan aktif berganti sehingga judul
  // dan status TIDAK berasal dari state percakapan sebelumnya.
  const [lifecycleTick, setLifecycleTick] = useState(0);
  const activePostId = activeConversation?.postId || null;

  useEffect(() => {
    let cancelled = false;
    setLifecycle(null);
    if (!activePostId) return;
    fetchPostLifecycle(activePostId)
      .then((status) => {
        if (!cancelled) setLifecycle(status);
      })
      .catch(() => {
        if (!cancelled) setLifecycle("tidakDikenal");
      });
    return () => {
      cancelled = true;
    };
  }, [activePostId, lifecycleTick]);

  // Perubahan judul/status/penghapusan postingan: muat ulang status dan daftar
  // percakapan (judul & keberadaan post berasal dari daftar). Bila postingan
  // dihapus, migration 013 juga menghapus percakapannya sehingga barisnya hilang
  // dari daftar dan UI jatuh ke keadaan "belum ada percakapan".
  useEffect(() => {
    if (!activePostId) return undefined;
    return subscribeToPostChanges(activePostId, () => {
      setLifecycleTick((n) => n + 1);
      loadConversations();
    });
  }, [activePostId, loadConversations]);

  // --- Realtime: pesan baru (semua percakapan) ------------------------------
  // Satu langganan INSERT messages tanpa filter. RLS messages_select_participant
  // hanya mengirim baris percakapan yang diikuti pengguna. Bila pesan masuk ke
  // percakapan aktif, baris digabung; bila percakapan lain, daftar dimuat ulang
  // agar preview/urutan terbaru tanpa memuat ulang halaman.
  useEffect(() => {
    if (!supabaseMode) return undefined;
    let cancelled = false;

    // PENTING: argumen pertama WAJIB null (berlangganan semua percakapan) dan
    // handler pesan + handler status di posisi ke-2/ke-3. Kalau tertukar,
    // event INSERT tidak pernah masuk ke state pesan dan status terjebak di
    // "Menghubungkan pesan baru...".
    diagPage(
      "membuka langganan realtime semua percakapan",
      "| percakapan aktif saat berlangganan =", String(activeIdRef.current ?? null),
      "| myUserId =", String(myUserId ?? null),
    );
    const stop = subscribeToConversationMessages(
      null,
      (row) => {
        const conversationId = String(row.conversation_id);
        const isActive = conversationId === String(activeIdRef.current);
        // DIAGNOSTIK SEMENTARA: bukti langkah berikut sesudah event diterima.
        // (1) conversation yang sedang dibuka vs conversation dari event,
        // (2) apakah id pesan sudah ada di state -> mencegah duplikasi,
        // (3) apakah state benar-benar diperbarui setelah merge.
        diagPage(
          "realtime callback:",
          "percakapan aktif =", String(activeIdRef.current),
          "| conversation dari event =", conversationId,
          "| cocok dengan aktif =", isActive,
          "| message_id =", row.id,
          "| sender_id =", row.sender_id,
          "| myUserId =", myUserId,
        );
        if (isActive) {
          setMessages((prev) => {
            const alreadyExists = prev.some((m) => String(m.id) === String(row.id));
            const next = mergeIncomingMessage(
              prev,
              {
                id: row.id,
                conversationId,
                senderId: row.sender_id,
                body: row.body,
                createdAt: row.created_at,
              },
              myUserId,
            );
            // Bukti (2) & (3). Bila id sudah ada (echo pesan sendiri yang baru
            // dikirim), panjang tidak berubah — itu benar, bukan bug.
            diagPage(
              "realtime callback: merge pesan",
              "| id sudah ada di state =", alreadyExists,
              "| panjang state sebelum =", prev.length,
              "| panjang state sesudah =", next.length,
              "| berubah =", next.length !== prev.length,
            );
            return next;
          });
          // Pesan masuk saat percakapan sedang terbuka = sudah dibaca. Tandai
          // notifikasi chat-nya agar badge lonceng tidak bertambah untuk pesan
          // yang sudah terlihat. Kegagalan diabaikan (tidak memblokir obrolan).
          if (String(row.sender_id) !== myUserId) {
            markConversationRead(conversationId).catch(() => {});
          }
        }
        loadConversations();
      },
      (status) => {
        // Realtime hanyalah jalur terima; kegagalannya TIDAK boleh memblokir
        // pengiriman (RPC send_message tetap jalan). Di sini status hanya
        // mengubah label "Pesan baru muncul otomatis" pada header ruang obrolan.
        if (!cancelled) setRealtimeStatus(status);
      },
    );

    // Jangan biarkan "Menghubungkan pesan baru..." menggantung selamanya bila
    // realtime tidak memberi status akhir (SUBSCRIBED/CHANNEL_ERROR/TIMED_OUT).
    const fallback = setTimeout(() => {
      if (!cancelled) {
        setRealtimeStatus((prev) => (prev === "connecting" ? "TIMED_OUT" : prev));
      }
    }, 12_000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      stop();
    };
  }, [supabaseMode, loadConversations, myUserId]);

  // --- Scroll ke bawah saat pesan berubah ----------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  // --- Kirim pesan ----------------------------------------------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    logChat("kirim pesan: mulai (conversation =", activeId, ")");
    try {
      const sent = await sendMessage(activeId, text);
      logChat("kirim pesan: berhasil (message id =", sent.id, ")");
      setInputText("");
      // Merge dulu agar pesan langsung tampil; event realtime akan diabaikan
      // karena id-nya sudah ada (mergeIncomingMessage bersifat idempoten).
      setMessages((prev) =>
        mergeIncomingMessage(
          prev,
          {
            id: sent.id,
            conversationId: sent.conversationId,
            senderId: sent.senderId,
            body: sent.body,
            createdAt: sent.createdAt || new Date().toISOString(),
          },
          myUserId,
        ),
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, updatedAt: new Date().toISOString() } : c,
        ),
      );
    } catch (err) {
      console.warn("[chat-page] kirim pesan: gagal", err?.code ? `(${err.code})` : "", err?.message);
      showToast(err.message || "Gagal mengirim pesan.", "error");
      if (err.code === CHAT_ERROR_CODES.NOT_FOUND) {
        // Percakapan sudah dihapus (mis. post dihapus lewat migration 013).
        setThreadError(err.message);
        loadConversations();
      }
    } finally {
      setSending(false);
    }
  };

  // --- Mulai percakapan dari ?user= tanpa konteks percakapan ----------------
  // `post` WAJIB ikut pada tautan masuk (detail-postingan, aktivitas,
  // formbantuan). Server memakai post + partner untuk memvalidasi hubungan dan
  // RPC get_or_create_conversation bersifat idempoten: percakapan yang sudah ada
  // dikembalikan, bukan dibuat ganda.
  const [startingChat, setStartingChat] = useState(false);
  const [startError, setStartError] = useState(null);
  const queryPostId = searchParams.get("post");
  // Menyimpan kunci percobaan terakhir (partner + post), bukan sekadar boolean,
  // agar tautan berikutnya ke percakapan lain tetap bisa dibuka otomatis.
  const autoStartKeyRef = useRef(null);

  const handleStartWithPartner = useCallback(
    async (postId) => {
      if (!pendingPartner || !postId || startingChat) return;
      setStartingChat(true);
      setStartError(null);
      logChat("handleStartWithPartner: mulai (post =", postId, ", partner =", pendingPartner, ")");
      try {
        const conversationId = await getOrCreateConversation({
          postId,
          partnerId: pendingPartner,
        });
        logChat("handleStartWithPartner: conversation id =", conversationId);
        setPendingPartner(null);
        await loadConversations();
        setActiveId(conversationId);
        router.replace(`/chat?c=${encodeURIComponent(conversationId)}`);
      } catch (err) {
        console.warn("[chat-page] handleStartWithPartner: gagal", err?.code ? `(${err.code})` : "", err?.message);
        setStartError(err.message || "Tidak dapat memulai percakapan.");
      } finally {
        setStartingChat(false);
      }
    },
    [pendingPartner, startingChat, loadConversations, router],
  );

  // Tautan dengan ?post= langsung membuka percakapan tanpa klik tambahan.
  useEffect(() => {
    if (!ready || !supabaseMode || !pendingPartner || !queryPostId) return;
    const key = `${pendingPartner}:${queryPostId}`;
    if (autoStartKeyRef.current === key) return;
    autoStartKeyRef.current = key;
    handleStartWithPartner(queryPostId);
  }, [ready, supabaseMode, pendingPartner, queryPostId, handleStartWithPartner]);

  const handleSelectConversation = (conversationId) => {
    setActiveId(conversationId);
    router.replace(`/chat?c=${encodeURIComponent(conversationId)}`);
  };

  const filteredConversations = conversations.filter((c) =>
    (c.otherName || "").toLowerCase().includes(searchContact.toLowerCase()),
  );

  // Postingan yang dihapus membuat riwayat tidak punya topik yang bisa dibalas.
  // Bila postingan hanya selesai/dibatalkan, percakapan tetap boleh dipakai.
  const postClosedNotice =
    activeConversation && lifecycle === "dihapus"
      ? "Postingan untuk percakapan ini sudah dihapus. Riwayat pesan tetap dapat dibaca, tetapi pesan baru tidak dapat dikirim."
      : null;

  // --- Keadaan sebelum siap --------------------------------------------------
  if (!ready || (loadingList && supabaseMode)) {
    return (
      <main className="chat-main-container">
        <p style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
          Memuat percakapan...
        </p>
      </main>
    );
  }

  if (!supabaseMode) {
    return (
      <main className="chat-main-container">
        <p style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
          Fitur pesan membutuhkan koneksi Supabase. Periksa konfigurasi aplikasi.
        </p>
      </main>
    );
  }

  return (
    <main className="chat-main-container">
      {/* Kolom Kiri: Sidebar Daftar Pesan */}
      <aside className="chat-sidebar">
        <div className="sidebar-top-title">
          <h2>Pesan</h2>
          <span className="badge-unread-count">
            {conversations.length} obrolan
          </span>
        </div>

        <div className="sidebar-search-box">
          <img
            src="/assets/images/icon-search.svg"
            alt=""
            className="search-sm-icon"
            width={14}
            height={14}
          />
          <input
            type="text"
            value={searchContact}
            onChange={(e) => setSearchContact(e.target.value)}
            placeholder="Cari percakapan..."
          />
        </div>

        {listError && (
          <p className="empty-state" style={{ padding: "12px 16px" }}>
            {listError}
          </p>
        )}

        <ul className="contacts-list">
          {!listError && filteredConversations.length === 0 && (
            <li style={{ padding: "16px", color: "#5e7a80" }}>
              Belum ada percakapan. Mulai dari detail postingan yang aktif.
            </li>
          )}
          {filteredConversations.map((item) => {
            const isActive = item.id === activeId;
            const lastMsg = item.lastMessage;
            return (
              <li
                key={item.id}
                className={`contact-item${isActive ? " active" : ""}`}
                onClick={() => handleSelectConversation(item.id)}
                style={{ cursor: "pointer" }}
              >
                {item.otherAvatar && item.otherAvatar.startsWith("/") ? (
                  <img
                    src={item.otherAvatar}
                    alt=""
                    className="contact-avatar"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div className={`contact-avatar ${item.otherAvatarClass || "tosca-bg"}`}>
                    {item.otherInitial}
                  </div>
                )}
                <div className="contact-info">
                  <div className="contact-row-top">
                    <h3>{item.otherName}</h3>
                    <span className={isActive ? "time-active" : "time-inactive"}>
                      {formatRelative(item.lastMessageAt || item.updatedAt)}
                    </span>
                  </div>
                  <p>
                    {lastMsg
                      ? `${item.lastMessageIsMine ? "Kamu: " : ""}${lastMsg}`
                      : item.postTitle
                        ? `Topik: ${item.postTitle}`
                        : "Belum ada pesan."}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Kolom Kanan: Ruang Obrolan Aktif */}
      <section className="chat-room-pane">
        {pendingPartner && !activeConversation ? (
          <div style={{ padding: "32px" }}>
            <h2 style={{ marginBottom: "8px" }}>Mulai percakapan</h2>
            {queryPostId ? (
              <>
                <p style={{ color: "#5e7a80", marginBottom: "16px" }}>
                  {startingChat
                    ? "Membuka percakapan..."
                    : "Percakapan ini terkait postingan yang kamu buka. Server memeriksa hubungan kamu dengan postingan tersebut."}
                </p>
                {startError && (
                  <>
                    <p
                      role="alert"
                      style={{
                        color: "var(--color-error, #e53e3e)",
                        marginBottom: "16px",
                      }}
                    >
                      {startError}
                    </p>
                    <button
                      type="button"
                      className="btn-detail-outline"
                      onClick={() => {
                        autoStartKeyRef.current = null;
                        handleStartWithPartner(queryPostId);
                      }}
                      disabled={startingChat}
                    >
                      {startingChat ? "Mencoba..." : "Coba lagi"}
                    </button>
                  </>
                )}
                {!startError && !startingChat && (
                  <button
                    type="button"
                    className="btn-detail-outline"
                    onClick={() => handleStartWithPartner(queryPostId)}
                  >
                    Buka percakapan
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ color: "#5e7a80", marginBottom: "16px" }}>
                  Tautan ini tidak menyertakan postingan, sehingga percakapan tidak
                  dapat dimulai dari sini. Buka detail postingan yang aktif lalu
                  pilih &ldquo;Mulai Chat&rdquo;.
                </p>
                <Link href="/katalog" className="btn-detail-outline">
                  Buka Katalog
                </Link>
              </>
            )}
          </div>
        ) : !activeConversation ? (
          <div style={{ padding: "32px" }}>
            <p className="empty-state">
              Pilih percakapan di sebelah kiri. Belum punya percakapan? Mulai dari
              detail postingan yang masih aktif.
            </p>
          </div>
        ) : (
          <>
            {/* Header Partner Chat */}
            <div className="room-top-header">
              <div className="partner-profile">
                {activeConversation.otherAvatar &&
                activeConversation.otherAvatar.startsWith("/") ? (
                  <img
                    src={activeConversation.otherAvatar}
                    alt=""
                    className="contact-avatar lg"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className={`contact-avatar ${activeConversation.otherAvatarClass || "tosca-bg"} lg`}
                  >
                    {activeConversation.otherInitial}
                  </div>
                )}
                <div className="partner-meta">
                  <h2>{activeConversation.otherName}</h2>
                  <p>
                    {activeConversation.otherBio
                      ? activeConversation.otherBio
                      : realtimeStatus === "SUBSCRIBED"
                        ? "Pesan baru muncul otomatis"
                        : realtimeStatus === "TIMED_OUT" || realtimeStatus === "CHANNEL_ERROR" || realtimeStatus === "CLOSED"
                          ? "Pembaruan pesan tidak aktif; pesan tetap bisa dikirim"
                          : "Menghubungkan pesan baru..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Terkait Permintaan */}
            <div className="request-info-banner">
              <div className="banner-left-content">
                <span className="banner-icon-box">📦</span>
                <div className="banner-text">
                  <span className="banner-label-sm">Topik Percakapan</span>
                  <p>
                    <strong>
                      {activeConversation.postTitle || "Postingan tidak tersedia"}
                    </strong>
                  </p>
                  {activeConversation.postTitle ? (
                    <span className="banner-label-sm" style={{ display: "block", marginTop: "2px" }}>
                      Status: {LIFECYCLE_LABEL[lifecycle || "tidakDikenal"]}
                    </span>
                  ) : (
                    <span className="banner-label-sm" style={{ display: "block", marginTop: "2px" }}>
                      Postingan sudah dihapus; riwayat pesan tetap dapat dibaca.
                    </span>
                  )}
                </div>
              </div>
              {activeConversation.postExists ? (
                <Link
                  href={`/detail-postingan?id=${encodeURIComponent(activeConversation.postId)}`}
                  className="btn-lihat-detail"
                >
                  Lihat Postingan
                </Link>
              ) : (
                <span className="btn-lihat-detail" style={{ opacity: 0.6, cursor: "not-allowed" }}>
                  Postingan tidak tersedia
                </span>
              )}
            </div>

            {/* Area Riwayat Pesan */}
            <div className="messages-container">
              {hasMore && (
                <button
                  type="button"
                  className="btn-detail-outline"
                  style={{ display: "block", margin: "0 auto 12px" }}
                  onClick={async () => {
                    const first = messages[0];
                    if (!first) return;
                    try {
                      const { messages: older, hasMore: more } = await fetchMessages(activeId, {
                        before: { createdAt: first.createdAt, id: first.id },
                      });
                      setMessages((prev) => [...older, ...prev]);
                      setHasMore(more);
                    } catch (err) {
                      showToast(err.message || "Gagal memuat pesan lama.", "error");
                    }
                  }}
                >
                  Muat pesan sebelumnya
                </button>
              )}

              {loadingThread ? (
                <p style={{ textAlign: "center" }}>Memuat pesan...</p>
              ) : threadError ? (
                <p className="empty-state" style={{ textAlign: "center", margin: "40px 0" }}>
                  {threadError}
                </p>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`msg-row ${msg.isMine ? "outgoing" : "incoming"}`}
                  >
                    {!msg.isMine && (
                      <div
                        className={`msg-avatar-sm ${activeConversation.otherAvatarClass || "tosca-bg"}`}
                      >
                        {activeConversation.otherInitial}
                      </div>
                    )}
                    <div className="msg-bubble">
                      <p>{msg.body}</p>
                      <div className="msg-meta">
                        <span className="msg-time">{formatTime(msg.createdAt)}</span>
                        {msg.isMine && <span className="msg-ticks">✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p
                  className="empty-state"
                  style={{ textAlign: "center", margin: "40px 0" }}
                >
                  Belum ada pesan. Mulai obrolan dengan {activeConversation.otherName}!
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bilah Input Pesan Bawah */}
            <div className="chat-input-footer">
              {postClosedNotice ? (
                // Percakapan milik postingan yang sudah DIHAPUS: riwayat tetap
                // terbaca, tetapi tidak ada topik yang bisa dibalas. Postingan
                // selesai/dibatalkan TIDAK menutup obrolan — peserta masih perlu
                // berkoordinasi (mis. setelah aktivitas selesai).
                <p
                  className="empty-state"
                  style={{ margin: 0, textAlign: "center", padding: "12px 16px" }}
                  data-chat-closed
                >
                  {postClosedNotice}
                </p>
              ) : (
                <form className="chat-input-bar" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    id="chat-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Tulis pesan untuk ${activeConversation.otherName}...`}
                    autoComplete="off"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="send-plane-btn"
                    aria-label="Kirim pesan"
                    disabled={sending || !inputText.trim()}
                  >
                    ➤
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-main-container"><p>Memuat percakapan...</p></div>}>
      <ChatContent />
    </Suspense>
  );
}
