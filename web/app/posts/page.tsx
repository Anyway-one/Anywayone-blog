import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, FileText, RefreshCw, Rss } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { listPublicPosts, type PublicPostListItem } from "@/lib/public-posts";
import styles from "./posts.module.css";

export const metadata: Metadata = {
  title: "文章",
  description: "Anywayone 的技术文章与生活随笔。",
  alternates: { canonical: "/posts" },
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Shanghai",
});

function parsePage(value: string | string[] | undefined) {
  const input = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(input ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function PostRow({ post, index }: { post: PublicPostListItem; index: number }) {
  return (
    <li className={styles.postRow}>
      <p className={styles.postIndex}>{String(index + 1).padStart(2, "0")}</p>
      <article>
        <div className={styles.postMeta}>
          <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
          <span><Clock3 aria-hidden="true" />{post.readingTimeMinutes} 分钟阅读</span>
        </div>
        <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
      </article>
      <Link className={styles.readLink} href={`/posts/${post.slug}`} aria-label={`阅读《${post.title}》`}>
        <ArrowRight aria-hidden="true" />
      </Link>
    </li>
  );
}

function EmptyPosts() {
  return (
    <section className={styles.empty} aria-labelledby="posts-empty-title">
      <FileText aria-hidden="true" />
      <p className={styles.index}>01 / CONTENT</p>
      <h2 id="posts-empty-title">文章尚未发布</h2>
      <p>第一篇文章发布后，这里会展示标题、摘要、发布时间和阅读时长。</p>
      <Link href="/">
        <ArrowLeft aria-hidden="true" />
        返回首页
      </Link>
    </section>
  );
}

function UnavailablePosts() {
  return (
    <section className={styles.empty} aria-labelledby="posts-error-title">
      <RefreshCw aria-hidden="true" />
      <p className={styles.index}>SERVICE / RETRY</p>
      <h2 id="posts-error-title">文章暂时无法加载</h2>
      <p>内容服务当前没有响应，稍后重试即可。</p>
      <Link href="/posts">
        <RefreshCw aria-hidden="true" />
        重新加载
      </Link>
    </section>
  );
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const currentPage = parsePage((await searchParams).page);
  const result = await listPublicPosts(currentPage);
  const ready = result.status === "ready" ? result.data : null;
  if (ready && ready.meta.totalPages > 0 && currentPage > ready.meta.totalPages) {
    redirect(ready.meta.totalPages === 1 ? "/posts" : `/posts?page=${ready.meta.totalPages}`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.heading}>
          <div>
            <p>WRITING / 文章</p>
            <h1>所思，所写<span>。</span></h1>
            <div className={styles.rule} aria-hidden="true" />
          </div>
          <Link className={styles.rssLink} href="/rss.xml">
            <Rss aria-hidden="true" />
            RSS
          </Link>
        </header>

        {result.status === "unavailable" || result.status === "not-found" ? (
          <UnavailablePosts />
        ) : ready?.data.length ? (
          <>
            <ol className={styles.postList}>
              {ready.data.map((post, index) => (
                <PostRow key={post.id} post={post} index={(currentPage - 1) * ready.meta.pageSize + index} />
              ))}
            </ol>
            <nav className={styles.pagination} aria-label="文章分页">
              {currentPage > 1 ? (
                <Link href={currentPage === 2 ? "/posts" : `/posts?page=${currentPage - 1}`}>
                  <ArrowLeft aria-hidden="true" />上一页
                </Link>
              ) : <span />}
              <p>PAGE {currentPage} / {Math.max(ready.meta.totalPages, 1)}</p>
              {currentPage < ready.meta.totalPages ? (
                <Link href={`/posts?page=${currentPage + 1}`}>
                  下一页<ArrowRight aria-hidden="true" />
                </Link>
              ) : <span />}
            </nav>
          </>
        ) : (
          <EmptyPosts />
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
