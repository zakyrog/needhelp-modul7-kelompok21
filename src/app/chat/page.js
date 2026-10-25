"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getConversations,
  ensureConversation,
  saveMessage,
  getPerson,
  formatMessageTime,
  getPost,
} from "../../lib/data.js";
import { getAuthUser, readSession } from "../../lib/auth.js";
import { createClient } from "../../utils/supabase/client";
import { DealCard } from "../../components/DealCard";
import { useToast } from "../../components/Toast";

function ChatContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeDeal, setActiveDeal] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [partnerUser, setPartnerUser] = useState(null);

  const [inputText, setInputText] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [showProposeDealModal, setShowProposeDealModal] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    scheduled_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    scheduled_time: "10:00",
    meetup_location: "",
    compensation_type: "tarif",
    compensation_value: "Rp 50.000",
  });

  // Local fallback state
  const [localConversations, setLocalConversations] = useState(() => getConversations());
  const [localActiveUserId, setLocalActiveUserId] = useState("budi-pratama");

  const messagesEndRef = useRef(null);

  const postIdParam = searchParams.get("postId");
  const authorIdParam = searchParams.get("authorId");
  const queryUser = searchParams.get("user");
  const queryTopic = searchParams.get("topic");

  // 1. Inisialisasi Autentikasi & Muat Data
  useEffect(() => {
    let isMounted = true;

    async function initChat() {
      const user = await getAuthUser().catch(() => null);
      if (user && isMounted) {
        setCurrentUser(user);
        await loadSupabaseThreads(user);
      } else {
        const local = readSession();
        if (local && isMounted) setCurrentUser({ id: local.id || "local-user", name: local.name });
        // Fallback local conversations
        const convs = getConversations();
        if (queryUser && !convs[queryUser]) {
          ensureConversation(queryUser, queryTopic || "Diskusi bantuan");
        }
        setLocalConversations(getConversations());
        if (queryUser) setLocalActiveUserId(queryUser);
      }
    }

    initChat();

    return () => { isMounted = false; };
  }, [postIdParam, authorIdParam, queryUser]);

  // Muat threads dari Supabase
  const loadSupabaseThreads = async (user) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data: threadList, error } = await supabase
        .from("chat_threads")
        .select(`
          id,
          post_id,
          user1_id,
          user2_id,
          created_at,
          post:post_id(id, title, nature, author_id),
          user1:user1_id(id, full_name, bio, avatar_url, rating_average),
          user2:user2_id(id, full_name, bio, avatar_url, rating_average)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      let currentThreads = threadList || [];

      // Jika ada param postId & authorId, cari atau buat thread baru
      if (postIdParam && authorIdParam && authorIdParam !== user.id) {
        let existing = currentThreads.find(
          (t) => t.post_id === postIdParam && (t.user1_id === authorIdParam || t.user2_id === authorIdParam)
        );

        if (!existing) {
          const { data: newThread, error: createErr } = await supabase
            .from("chat_threads")
            .insert({
              post_id: postIdParam,
              user1_id: user.id,
              user2_id: authorIdParam,
            })
            .select(`
              id,
              post_id,
              user1_id,
              user2_id,
              created_at,
              post:post_id(id, title, nature, author_id),
              user1:user1_id(id, full_name, bio, avatar_url, rating_average),
              user2:user2_id(id, full_name, bio, avatar_url, rating_average)
            `)
            .single();

          if (!createErr && newThread) {
            currentThreads = [newThread, ...currentThreads];
            existing = newThread;
          }
        }

        if (existing) {
          setActiveThreadId(existing.id);
        }
      } else if (currentThreads.length > 0 && !activeThreadId) {
        setActiveThreadId(currentThreads[0].id);
      }

      setThreads(currentThreads);
    } catch (e) {
      console.warn("Gagal memuat thread Supabase:", e.message);
    }
  };

  // Muat pesan & deal saat activeThreadId berubah
  useEffect(() => {
    if (!activeThreadId || !currentUser) return;
    let isMounted = true;
    const supabase = createClient();
    if (!supabase) return;

    async function loadThreadDetails() {
      // 1. Pesan
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", activeThreadId)
        .order("created_at", { ascending: true });

      if (isMounted && msgs) setMessages(msgs);

      // 2. Deal Aktif
      const { data: deals } = await supabase
        .from("deals")
        .select("*")
        .eq("thread_id", activeThreadId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (isMounted && deals && deals.length > 0) {
        setActiveDeal(deals[0]);
      } else if (isMounted) {
        setActiveDeal(null);
      }

      // 3. Konteks thread & partner
      const curThread = threads.find((t) => t.id === activeThreadId);
      if (curThread && isMounted) {
        setActivePost(curThread.post);
        const partner = curThread.user1_id === currentUser.id ? curThread.user2 : curThread.user1;
        setPartnerUser(partner);
      }
    }

    loadThreadDetails();

    // 4. Realtime subscription
    const channel = supabase
      .channel(`chat-thread-${activeThreadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${activeThreadId}` },
        (payload) => {
          if (isMounted) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `thread_id=eq.${activeThreadId}` },
        () => {
          loadThreadDetails();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeThreadId, threads, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, localConversations, activeThreadId]);

  // Kirim Pesan Teks
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (activeThreadId && currentUser) {
      try {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.from("chat_messages").insert({
            thread_id: activeThreadId,
            sender_id: currentUser.id,
            message_type: "text",
            content: trimmed,
          });
          if (error) throw error;
          setInputText("");
          return;
        }
      } catch (err) {
        showToast("Gagal mengirim pesan: " + err.message, "error");
      }
    }

    // Fallback lokal
    try {
      saveMessage(localActiveUserId, trimmed, queryTopic || "Diskusi bantuan");
      setLocalConversations(getConversations());
      setInputText("");
    } catch {
      showToast("Gagal menyimpan pesan.", "error");
    }
  };

  // Ajukan Kesepakatan Baru (Deal Card v1)
  const handleProposeDealSubmit = async (e) => {
    e.preventDefault();
    if (!activeThreadId || !currentUser || !activePost || !partnerUser) {
      showToast("Informasi kesepakatan belum lengkap.", "error");
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) return;

      const isPostAuthor = activePost.author_id === currentUser.id;
      const isNatureNeed = activePost.nature === "butuh";

      const requesterId = isNatureNeed
        ? (isPostAuthor ? currentUser.id : partnerUser.id)
        : (isPostAuthor ? partnerUser.id : currentUser.id);

      const helperId = isNatureNeed
        ? (isPostAuthor ? partnerUser.id : currentUser.id)
        : (isPostAuthor ? currentUser.id : partnerUser.id);

      const dealPayload = {
        post_id: activePost.id,
        thread_id: activeThreadId,
        requester_id: requesterId,
        helper_id: helperId,
        scheduled_date: proposeForm.scheduled_date,
        scheduled_time: proposeForm.scheduled_time.length === 5 ? `${proposeForm.scheduled_time}:00` : proposeForm.scheduled_time,
        meetup_location: proposeForm.meetup_location.trim(),
        compensation_type: proposeForm.compensation_type,
        compensation_value: proposeForm.compensation_value.trim(),
        requester_agreed: currentUser.id === requesterId,
        helper_agreed: currentUser.id === helperId,
        deal_version: 1,
        status: "diajukan",
      };

      const { data, error } = await supabase.from("deals").insert(dealPayload).select().single();
      if (error) throw error;

      setActiveDeal(data);
      setShowProposeDealModal(false);
      showToast("Kartu kesepakatan resmi berhasil diajukan!", "success");
    } catch (err) {
      showToast(err.message || "Gagal mengajukan kesepakatan.", "error");
    }
  };

  // Setujui Kesepakatan (RPC agree_to_deal)
  const handleAgreeDeal = async (dealId, version) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.rpc("agree_to_deal", {
        p_deal_id: dealId,
        p_target_version: version,
      });

      if (error) throw error;

      if (data?.status === "disepakati") {
        showToast("🎉 Kesepakatan resmi disetujui kedua belah pihak!", "success");
      } else {
        showToast("Persetujuan dicatat. Menunggu persetujuan mitra.", "info");
      }
    } catch (err) {
      showToast(err.message || "Gagal menyetujui kesepakatan.", "error");
    }
  };

  // Revisi Kesepakatan (RPC revise_deal)
  const handleReviseDeal = async (dealId, version, newValues) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.rpc("revise_deal", {
        p_deal_id: dealId,
        p_target_version: version,
        p_scheduled_date: newValues.scheduled_date,
        p_scheduled_time: newValues.scheduled_time,
        p_meetup_location: newValues.meetup_location,
        p_compensation_type: newValues.compensation_type,
        p_compensation_value: newValues.compensation_value,
      });

      if (error) throw error;
      showToast(`Revisi kesepakatan (Versi ${data.version}) berhasil dikirim!`, "info");
    } catch (err) {
      showToast(err.message || "Gagal merevisi kesepakatan.", "error");
    }
  };

  // Batalkan Kesepakatan (RPC cancel_deal)
  const handleCancelDeal = async (dealId, reason) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase.rpc("cancel_deal", {
        p_deal_id: dealId,
        p_cancellation_reason: reason,
      });

      if (error) throw error;
      showToast("Kesepakatan bantuan telah dibatalkan.", "info");
    } catch (err) {
      showToast(err.message || "Gagal membatalkan kesepakatan.", "error");
    }
  };

  // Tampilan jika mode lokal
  const isSupabaseMode = Boolean(currentUser && threads.length > 0 && activeThreadId);

  return (
    <main className="chat-main-container">
      {/* Kolom Kiri: Daftar Thread Obrolan */}
      <aside className="chat-sidebar" aria-label="Daftar Percakapan">
        <div className="sidebar-top-title">
          <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0 }}>Pesan Langsung</h2>
          <span className="badge-unread-count">
            {isSupabaseMode ? threads.length : Object.keys(localConversations).length} obrolan
          </span>
        </div>

        <div className="sidebar-search-box">
          <span className="search-sm-icon">🔍</span>
          <input
            type="text"
            value={searchContact}
            onChange={(e) => setSearchContact(e.target.value)}
            placeholder="Cari percakapan..."
          />
        </div>

        <ul className="contacts-list" role="list">
          {isSupabaseMode ? (
            threads.map((t) => {
              const partner = t.user1_id === currentUser.id ? t.user2 : t.user1;
              const pName = partner?.full_name || "Mitra Bantuan";
              const pInitial = pName.charAt(0).toUpperCase();
              const isActive = t.id === activeThreadId;

              return (
                <li
                  key={t.id}
                  className={`contact-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveThreadId(t.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="contact-avatar tosca-bg">{pInitial}</div>
                  <div className="contact-info">
                    <div className="contact-row-top">
                      <h3>{pName}</h3>
                    </div>
                    <p>{t.post?.title || "Diskusi Bantuan"}</p>
                  </div>
                </li>
              );
            })
          ) : (
            Object.keys(localConversations).map((userId) => {
              const item = localConversations[userId];
              const person = getPerson(userId);
              const lastMsg = item?.messages?.at(-1);
              const isActive = userId === localActiveUserId;

              return (
                <li
                  key={userId}
                  className={`contact-item ${isActive ? "active" : ""}`}
                  onClick={() => setLocalActiveUserId(userId)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={`contact-avatar ${person.avatarClass || "tosca-bg"}`}>
                    {person.initial}
                  </div>
                  <div className="contact-info">
                    <div className="contact-row-top">
                      <h3>{person.name}</h3>
                      <span className={isActive ? "time-active" : "time-inactive"}>
                        {lastMsg ? formatMessageTime(lastMsg.at) : "Baru saja"}
                      </span>
                    </div>
                    <p>{lastMsg ? `${lastMsg.from === "me" ? "Kamu: " : ""}${lastMsg.text}` : item.topic}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Kolom Kanan: Ruang Obrolan Aktif & Kartu Kesepakatan */}
      <section className="chat-room-pane" aria-label="Ruang Obrolan Aktif">
        {/* Header Ruang Chat */}
        <div className="room-top-header">
          <div className="partner-profile">
            <div className="contact-avatar tosca-bg lg">
              {isSupabaseMode ? (partnerUser?.full_name?.charAt(0) || "M") : getPerson(localActiveUserId).initial}
            </div>
            <div className="partner-meta">
              <h2>{isSupabaseMode ? (partnerUser?.full_name || "Mitra Bantuan") : getPerson(localActiveUserId).name}</h2>
              <p>
                <span className="green-status-dot" /> Online • Terverifikasi Komunitas
              </p>
            </div>
          </div>

          <div className="room-action-buttons">
            {isSupabaseMode && activePost && !activeDeal && (
              <button
                type="button"
                onClick={() => setShowProposeDealModal(true)}
                className="button button-sm button-primary"
              >
                🤝 Ajukan Kesepakatan Resmi
              </button>
            )}

            {activeDeal && activeDeal.status === "disepakati" && (
              <Link href="/aktivitas" className="button button-sm button-outline">
                📋 Cek di Aktivitas
              </Link>
            )}
          </div>
        </div>

        {/* Banner Konteks Postingan */}
        <div className="request-info-banner">
          <div className="banner-left-content">
            <span className="banner-icon-box">📦</span>
            <div className="banner-text">
              <span className="banner-label-sm">Konteks Postingan:</span>
              <p>
                <strong>{isSupabaseMode ? (activePost?.title || "Bantuan") : (localConversations[localActiveUserId]?.topic || "Diskusi Bantuan")}</strong>
              </p>
            </div>
          </div>
          <Link href="/katalog" className="btn-lihat-detail">
            Feed Bantuan &rarr;
          </Link>
        </div>

        {/* Area Pesan & Kartu Kesepakatan */}
        <div className="messages-container" aria-live="polite">
          {/* Kartu Kesepakatan Resmi (In-Chat Deal Card) */}
          {isSupabaseMode && activeDeal && (
            <div style={{ margin: "16px 0" }}>
              <DealCard
                deal={activeDeal}
                currentUserId={currentUser?.id}
                onAgree={handleAgreeDeal}
                onRevise={handleReviseDeal}
                onCancel={handleCancelDeal}
                postTitle={activePost?.title || "Kegiatan Bantuan"}
                requesterName={activeDeal.requester_id === currentUser?.id ? (currentUser?.user_metadata?.full_name || "Kamu") : (partnerUser?.full_name || "Mitra")}
                helperName={activeDeal.helper_id === currentUser?.id ? (currentUser?.user_metadata?.full_name || "Kamu") : (partnerUser?.full_name || "Mitra")}
              />
            </div>
          )}

          {/* Pesan-Pesan Obrolan */}
          {isSupabaseMode ? (
            messages.length > 0 ? (
              messages.map((msg) => {
                if (msg.message_type === "system_event") {
                  return (
                    <div key={msg.id} className="system-event-message" style={{ textAlign: "center", margin: "12px auto", padding: "6px 14px", background: "#f1f5f9", borderRadius: "999px", fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "80%" }}>
                      🔔 {msg.content}
                    </div>
                  );
                }

                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`msg-row ${isMe ? "outgoing" : "incoming"}`}>
                    {!isMe && (
                      <div className="msg-avatar-sm tosca-bg">
                        {partnerUser?.full_name?.charAt(0) || "M"}
                      </div>
                    )}
                    <div className="msg-bubble">
                      <p>{msg.content}</p>
                      <div className="msg-meta">
                        <span className="msg-time">{formatMessageTime(msg.created_at)}</span>
                        {isMe && <span className="msg-ticks">✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-state" style={{ textAlign: "center", margin: "40px 0" }}>
                Belum ada pesan. Sapa mitra bantuanmu untuk mulai berdiskusi!
              </p>
            )
          ) : (
            // Fallback pesan lokal
            (localConversations[localActiveUserId]?.messages || []).map((msg, idx) => {
              const isMe = msg.from === "me";
              return (
                <div key={idx} className={`msg-row ${isMe ? "outgoing" : "incoming"}`}>
                  {!isMe && (
                    <div className="msg-avatar-sm tosca-bg">
                      {getPerson(localActiveUserId).initial}
                    </div>
                  )}
                  <div className="msg-bubble">
                    <p>{msg.text}</p>
                    <div className="msg-meta">
                      <span className="msg-time">{formatMessageTime(msg.at)}</span>
                      {isMe && <span className="msg-ticks">✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Pesan */}
        <div className="chat-input-footer">
          <form className="chat-input-bar" onSubmit={handleSendMessage}>
            <input
              type="text"
              id="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis pesan kesepakatan..."
              autoComplete="off"
            />
            <button type="submit" className="send-plane-btn" aria-label="Kirim pesan">
              ➤
            </button>
          </form>
        </div>
      </section>

      {/* Modal Ajukan Kesepakatan Baru */}
      {showProposeDealModal && (
        <div className="deal-modal-backdrop">
          <div className="deal-modal-content" style={{ maxWidth: "440px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 6px" }}>
              🤝 Ajukan Kartu Kesepakatan Resmi
            </h3>
            <p className="text-muted" style={{ fontSize: "12px", margin: "0 0 16px" }}>
              Rincian ini akan diajukan ke ruang obrolan dan memerlukan persetujuan kedua pihak sebelum jadwal dikunci.
            </p>

            <form onSubmit={handleProposeDealSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Tanggal Temu
                </label>
                <input
                  type="date"
                  value={proposeForm.scheduled_date}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={(e) => setProposeForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Jam Temu
                </label>
                <input
                  type="time"
                  value={proposeForm.scheduled_time}
                  onChange={(e) => setProposeForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Titik Temu Spesifik
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Gerbang Utama FT UGM / Kos Pogung Baru Blok D"
                  value={proposeForm.meetup_location}
                  onChange={(e) => setProposeForm((p) => ({ ...p, meetup_location: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Bentuk Imbalan / Nominal
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tarif Rp50.000 / Traktir makan siang / Patungan bensin"
                  value={proposeForm.compensation_value}
                  onChange={(e) => setProposeForm((p) => ({ ...p, compensation_value: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--color-border-default)" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowProposeDealModal(false)}
                  className="button button-sm button-outline"
                >
                  Batal
                </button>
                <button type="submit" className="button button-sm button-primary">
                  Terbitkan Kartu Kesepakatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-main-container"><p style={{ padding: "40px" }}>Memuat ruang obrolan...</p></div>}>
      <ChatContent />
    </Suspense>
  );
}
