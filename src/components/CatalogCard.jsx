import React from "react";
import Link from "next/link";
import {
  getPostAuthor,
  REGION_LABELS,
  formatDate,
  formatTimeRange,
  formatCompensation,
} from "../lib/data.js";

export function CatalogCard({ post, backUrl = "/katalog" }) {
  const author = getPostAuthor(post);
  const detailUrl = `/detail-postingan?id=${encodeURIComponent(post.id)}&back=${encodeURIComponent(backUrl)}`;

  return (
    <article>
      <header>
        <img
          src={author.avatar || "/assets/images/avatar-user.svg"}
          alt={`Foto profil ${author.name}`}
          width={40}
          height={40}
        />
        <h3>{author.name}</h3>
        <p>
          <mark>{post.nature === "butuh" ? "Saya Butuh" : "Saya Bisa"}</mark>{" "}
          &bull; {REGION_LABELS[post.region] || post.region} &bull;{" "}
          {post.timeLabel || "Baru saja"}
        </p>
      </header>
      <h4>
        <Link href={detailUrl}>{post.title}</Link>
      </h4>
      <p>{post.summary}</p>
      <dl>
        <dt>Jadwal</dt>
        <dd>
          {formatDate(post.date)} - {formatTimeRange(post)}
        </dd>
        <dt>Imbalan</dt>
        <dd>{formatCompensation(post)}</dd>
      </dl>
      <p>
        <Link href={detailUrl}>Lihat Detail Lengkap</Link>
      </p>
    </article>
  );
}
