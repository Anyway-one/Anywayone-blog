import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, RefreshCw, Rss } from "lucide-react";
import { parsePage, PublicPostRow } from "@/components/public-post-list";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { listPublicPosts } from "@/lib/public-posts";
import styles from "./posts.module.css";

export const metadata: Metadata = {
  title: "文章",
  description: "Anywayone 的技术文章与生活随笔。",
  alternates: { canonical: "/posts" },
};

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
                <PublicPostRow key={post.id} post={post} index={(currentPage - 1) * ready.meta.pageSize + index} />
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
      <PublicSiteFooter />
    </main>
  );
}
