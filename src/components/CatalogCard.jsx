import React from "react";
import Link from "next/link";
import {
  getPostAuthor,
  CATEGORY_LABELS,
  REGION_LABELS,
  formatDate,
  formatTimeRange,
  formatCompensation,
} from "../lib/data.js";
import { SvgIcon } from "./Icons.jsx";
import { resolveAvatarSrc } from "../lib/avatars.js";

export function CatalogCard({ post, backUrl = "/katalog" }) {
  const author = getPostAuthor(post);
  const isNeed = post.nature === "butuh";
  const detailUrl = `/detail-postingan?id=${encodeURIComponent(post.id)}&back=${encodeURIComponent(backUrl)}`;
  const authorAvatar = resolveAvatarSrc({ key: author.avatarKey, url: author.avatar });
  const authorInitial = (author.initial || author.name || "N").charAt(0).toUpperCase();

  return (
    <article className={`catalog-card${isNeed ? " catalog-card-need" : " catalog-card-offer"}`}>
      <div className="catalog-card-accent" aria-hidden="true" />

      <header className="catalog-card-head">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt=""
            width={40}
            height={40}
          />
        ) : (
          <span className="catalog-card-avatar-initial" aria-hidden="true">
            {authorInitial}
          </span>
        )}
        <div className="catalog-card-author">
          <h3>{author.name}</h3>
          <p>
            {REGION_LABELS[post.region] || post.region} &bull; {post.timeLabel || "Baru saja"}
          </p>
        </div>
        <span className={`nature-badge nature-badge-${post.nature}`}>
          <SvgIcon name={isNeed ? "hand" : "wave"} size={13} strokeWidth={2.2} />
          {isNeed ? "Butuh" : "Bisa"}
        </span>
      </header>

      <h4 className="catalog-card-title">
        <Link href={detailUrl}>{post.title}</Link>
      </h4>

      <p className="catalog-card-summary">{post.summary}</p>

      <ul className="catalog-card-facts" aria-label="Ringkasan informasi">
        <li>
          <SvgIcon name="tag" size={14} strokeWidth={2} />
          <span>{CATEGORY_LABELS[post.category] || post.category}</span>
        </li>
        <li>
          <SvgIcon name="pin" size={14} strokeWidth={2} />
          <span>
            {[REGION_LABELS[post.region] || post.region, post.address]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </li>
        <li>
          <SvgIcon name="calendar" size={14} strokeWidth={2} />
          <span>
            {formatDate(post.date)} &middot; {formatTimeRange(post)}
          </span>
        </li>
        <li>
          <SvgIcon name="wallet" size={14} strokeWidth={2} />
          <span>{formatCompensation(post)}</span>
        </li>
      </ul>

      <footer className="catalog-card-foot">
        <Link href={detailUrl} className="btn-lihat-detail">
          Lihat Detail
          <SvgIcon name="arrowRight" size={15} strokeWidth={2.2} />
        </Link>
      </footer>
    </article>
  );
}