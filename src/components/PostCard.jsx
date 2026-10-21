import React from "react";
import Link from "next/link";
import {
  getPostAuthor,
  CATEGORY_LABELS,
  REGION_LABELS,
  COMPENSATION_LABELS,
} from "../lib/data";

export function PostCard({ post, index }) {
  const author = getPostAuthor(post);
  const isHighlight = index === 1;

  return (
    <article className={`request-card${isHighlight ? " highlight-card" : ""}`}>
      <header className="card-user">
        <div className={`avatar ${author.avatarClass || "avatar-blue"}`}>
          {author.initial}
        </div>
        <div className="user-info">
          <h3>{author.name}</h3>
          <p>
            {post.timeLabel || "Baru saja"} &bull;{" "}
            {REGION_LABELS[post.region] || post.region}
          </p>
        </div>
      </header>
      <h4>
        <Link href={`/detail-postingan?id=${encodeURIComponent(post.id)}`}>
          {post.title}
        </Link>
      </h4>
      <p>{post.summary}</p>
      <div className="tags">
        <span className="tag">
          {CATEGORY_LABELS[post.category] || post.category}
        </span>
        <span className="tag">
          {COMPENSATION_LABELS[post.compensation] || post.compensation}
        </span>
      </div>
    </article>
  );
}
