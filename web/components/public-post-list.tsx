import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { PublicPostListItem } from "@/lib/public-posts";
import styles from "@/app/posts/posts.module.css";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Shanghai",
});

export function parsePage(value: string | string[] | undefined) {
  const input = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(input ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function PublicPostRow({ post, index }: { post: PublicPostListItem; index: number }) {
  return (
    <li className={`${styles.postRow} ${post.coverMedia ? styles.postRowWithCover : ""}`}>
      <p className={styles.postIndex}>{String(index + 1).padStart(2, "0")}</p>
      {post.coverMedia && (
        <Link className={styles.postCover} href={`/posts/${post.slug}`} tabIndex={-1} aria-hidden="true">
          <Image
            src={post.coverMedia.publicUrl}
            alt=""
            width={post.coverMedia.width}
            height={post.coverMedia.height}
            sizes="(max-width: 767px) calc(100vw - 72px), 220px"
          />
        </Link>
      )}
      <article>
        <div className={styles.postMeta}>
          <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
          <span><Clock3 aria-hidden="true" />{post.readingTimeMinutes} 分钟阅读</span>
        </div>
        <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        {(post.category || post.tags.length > 0) && (
          <div className={styles.taxonomyLinks} aria-label="文章分类与标签">
            {post.category && (
              <Link className={styles.categoryLink} href={`/categories/${post.category.slug}`}>
                {post.category.name}
              </Link>
            )}
            {post.tags.map((tag) => (
              <Link key={tag.id} href={`/tags/${tag.slug}`}>#{tag.name}</Link>
            ))}
          </div>
        )}
      </article>
      <Link className={styles.readLink} href={`/posts/${post.slug}`} aria-label={`阅读《${post.title}》`}>
        <ArrowRight aria-hidden="true" />
      </Link>
    </li>
  );
}
