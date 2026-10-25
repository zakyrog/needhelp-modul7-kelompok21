"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getConversations,
  ensureConversation,
  saveMessage,
  getPerson,
  getActivities,
  formatMessageTime,
} from "../../lib/data.js";
import { readSession } from "../../lib/auth.js";
import { useToast } from "../../components/Toast";

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  // Proteksi halaman chat - harus login
  useEffect(() => {
    const session = readSession();
    if (!session) {
      showToast("Silakan masuk terlebih dahulu untuk mengakses pesan.", "info");
      router.replace("/login?next=/chat");
    }
  }, [router, showToast]);

  const [conversations, setConversations] = useState(() => getConversations());
  const [activeUserId, setActiveUserId] = useState(() => {
    const convs = getConversations();
    return Object.keys(convs)[0] || "budi-pratama";
  });
  const [topic, setTopic] = useState("Diskusi bantuan");
  const [inputText, setInputText] = useState("");
  const [searchContact, setSearchContact] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const convs = getConversations();
    const queryUser = searchParams.get("user");
    const queryTopic = searchParams.get("topic");

    const targetUser = queryUser || Object.keys(convs)[0] || "budi-pratama";
    if (queryUser && !convs[queryUser]) {
      ensureConversation(queryUser, queryTopic || "Diskusi bantuan");
    }

    const updatedConvs = getConversations();
    setConversations(updatedConvs);
    setActiveUserId(targetUser);
    if (queryTopic) {
      setTopic(queryTopic);
    } else if (updatedConvs[targetUser]?.topic) {
      setTopic(updatedConvs[targetUser].topic);
    }
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeUserId, conversations]);

  const activeConversation = conversations[activeUserId] || {
    userId: activeUserId,
    topic: topic,
    messages: [],
  };

  const activePerson = getPerson(activeUserId);

  const rateableActivity = getActivities().find(
    (item) =>
      item.partnerId === activeUserId &&
      ["berlangsung", "selesai"].includes(item.status) &&
      !item.review,
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      saveMessage(activeUserId, trimmed, topic);
      setConversations(getConversations());
      setInputText("");
    } catch {
      showToast("Gagal menyimpan pesan ke penyimpanan lokal.", "error");
    }
  };

  const contactList = Object.keys(conversations).filter((id) => {
    const person = getPerson(id);
    return person.name.toLowerCase().includes(searchContact.toLowerCase());
  });

  return (
    <main className="chat-main-container">
      {/* Kolom Kiri: Sidebar Daftar Pesan */}
      <aside className="chat-sidebar">
        <div className="sidebar-top-title">
          <h2>Pesan</h2>
          <span className="badge-unread-count">
            {Object.keys(conversations).length} obrolan
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

        <ul className="contacts-list">
          {contactList.map((userId) => {
            const item = conversations[userId];
            const person = getPerson(userId);
            const lastMsg = item?.messages?.at(-1);
            const isActive = userId === activeUserId;

            return (
              <li
                key={userId}
                className={`contact-item${isActive ? " active" : ""}`}
                onClick={() => {
                  setActiveUserId(userId);
                  if (item?.topic) setTopic(item.topic);
                }}
                style={{ cursor: "pointer" }}
              >
                <div
                  className={`contact-avatar ${person.avatarClass || "tosca-bg"}`}
                >
                  {person.initial}
                </div>
                <div className="contact-info">
                  <div className="contact-row-top">
                    <h3>{person.name}</h3>
                    <span className={isActive ? "time-active" : "time-inactive"}>
                      {lastMsg ? formatMessageTime(lastMsg.at) : "Baru saja"}
                    </span>
                  </div>
                  <p>
                    {lastMsg
                      ? `${lastMsg.from === "me" ? "Kamu: " : ""}${lastMsg.text}`
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
        {/* Header Partner Chat */}
        <div className="room-top-header">
          <div className="partner-profile">
            <div
              className={`contact-avatar ${activePerson.avatarClass || "tosca-bg"} lg`}
            >
              {activePerson.initial}
            </div>
            <div className="partner-meta">
              <h2>{activePerson.name}</h2>
              <p>
                <span className="green-status-dot" /> Online &bull;{" "}
                {activePerson.verification}
              </p>
            </div>
          </div>
          <div className="room-action-buttons">
            {rateableActivity && (
              <Link
                href={`/rating?id=${encodeURIComponent(rateableActivity.id)}`}
                className="btn-detail-outline"
                style={{ fontSize: "12px", padding: "6px 14px" }}
              >
                ⭐ Beri Ulasan
              </Link>
            )}
          </div>
        </div>

        {/* Banner Terkait Permintaan */}
        <div className="request-info-banner">
          <div className="banner-left-content">
            <span className="banner-icon-box">📦</span>
            <div className="banner-text">
              <span className="banner-label-sm">Topik Percakapan</span>
              <p>
                <strong>{topic || "Diskusi Bantuan"}</strong>
              </p>
            </div>
          </div>
          <Link href="/katalog" className="btn-lihat-detail">
            Feed Bantuan
          </Link>
        </div>

        {/* Area Riwayat Pesan */}
        <div className="messages-container">
          <div className="date-separator">
            <span>Hari ini</span>
          </div>

          {activeConversation.messages.length > 0 ? (
            activeConversation.messages.map((msg, idx) => {
              const isMe = msg.from === "me";
              return (
                <div
                  key={idx}
                  className={`msg-row ${isMe ? "outgoing" : "incoming"}`}
                >
                  {!isMe && (
                    <div
                      className={`msg-avatar-sm ${activePerson.avatarClass || "tosca-bg"}`}
                    >
                      {activePerson.initial}
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
          ) : (
            <p className="empty-state" style={{ textAlign: "center", margin: "40px 0" }}>
              Belum ada pesan. Mulai obrolan dengan {activePerson.name}!
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bilah Input Pesan Bawah */}
        <div className="chat-input-footer">
          <form className="chat-input-bar" onSubmit={handleSendMessage}>
            <input
              type="text"
              id="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Tulis pesan untuk ${activePerson.name}...`}
              autoComplete="off"
            />
            <button
              type="submit"
              className="send-plane-btn"
              aria-label="Kirim pesan"
            >
              ➤
            </button>
          </form>
        </div>
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
