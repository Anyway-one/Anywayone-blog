import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Rss } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import styles from "./posts.module.css";

export const metadata: Metadata = {
  title: "文章",
  description: "Anywayone 的技术文章与生活随笔。",
};

export default function PostsPage() {
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

        <section className={styles.empty} aria-labelledby="posts-empty-title">
          <FileText aria-hidden="true" />
          <p className={styles.index}>01 / CONTENT</p>
          <h2 id="posts-empty-title">文章尚未发布</h2>
          <p>第一篇文章发布后，这里会以分隔线式编辑布局展示标题、摘要和时间，不使用虚构内容填充页面。</p>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            返回首页
          </Link>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
