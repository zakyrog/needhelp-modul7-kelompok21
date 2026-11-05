"use client";

import React from "react";

/**
 * Ikon SVG inline yang menggantikan emoji sebagai ikon primer.
 * Setiap ikon memakai stroke konsisten 1.75 dan warna currentColor,
 * jadi mengikuti warna kelas induknya (mis. .tosca-icon, .green-icon).
 */
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l9.5 16.5H2.5L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
    </>
  ),
  star: (
    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5z" />
  ),
  starFilled: (
    <path
      d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  shield: (
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M17.5 14c2.3.7 3.5 2.4 3.5 6" />
    </>
  ),
  package: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  idea: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6h4c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3z" />
    </>
  ),
  wave: (
    <path d="M3 10c2-3 3-3 5 0s3 3 5 0 3-3 5 0M3 15c2-3 3-3 5 0s3 3 5 0 3-3 5 0" />
  ),
  hourglass: (
    <>
      <path d="M6 3h12M6 21h12M7 3v4c0 1.5 1 2.5 2 3l1 2-1 2c-1 .5-2 1.5-2 3v4M17 3v4c0 1.5-1 2.5-2 3l-1 2 1 2c1 .5 2 1.5 2 3v4" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  reply: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 5 5v6" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: (
    <>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </>
  ),
  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  hand: (
    <>
      <path d="M7 11V6a1.5 1.5 0 0 1 3 0v4" />
      <path d="M10 11V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M13 11V6.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M16 11v-1.5a1.5 1.5 0 0 1 3 0V14" />
      <path d="M3 13.5c1.5-4 3-4 4.5-4H12c2.5 0 4.5 1.5 5.5 3.5L19 15H7.5C5 15 4 14 3 12z" />
    </>
  ),
  filter: <path d="M4 5h16M7 12h10M10 19h4" />,
};

// Memetakan emoji yang masih dipakai di markup lama ke nama ikon SVG.
const EMOJI_MAP = {
  "🔍": "search",
  "🔎": "search",
  "⚠️": "warning",
  "⚠": "warning",
  "🔒": "lock",
  "🔐": "lock",
  "📋": "clipboard",
  "📨": "mail",
  "📩": "mail",
  "💬": "chat",
  "🔔": "bell",
  "⭐": "star",
  "🗑️": "trash",
  "🛡️": "shield",
  "🙋": "person",
  "📦": "package",
  "💡": "idea",
  "👋": "wave",
  "⏳": "hourglass",
  "✓": "check",
  "✗": "cross",
  "↩": "reply",
  "➤": "arrowRight",
};

/**
 * Menerjemahkan kunci emoji menjadi nama ikon SVG, atau null bila tak dikenal.
 */
export function resolveIcon(key) {
  if (!key) return null;
  const trimmed = key.trim();
  return EMOJI_MAP[trimmed] || null;
}

export function SvgIcon({ name, size = 22, className = "", strokeWidth = 1.75, title }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role={title ? "img" : undefined}
      style={{ verticalAlign: "-0.125em", flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}

/**
 * Ikut dari emoji lama: render SVG bila dikenal, else render teks emoji apa adanya.
 */
export function EmojiIcon({ emoji, size = 22, className = "", title }) {
  const name = resolveIcon(emoji);
  if (name) return <SvgIcon name={name} size={size} className={className} title={title} />;
  return <span aria-hidden="true">{emoji}</span>;
}