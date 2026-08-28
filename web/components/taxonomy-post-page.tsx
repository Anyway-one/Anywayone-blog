import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, RefreshCw } from "lucide-react";
import { PublicPostRow } from "@/components/public-post-list";
import { PublicSiteFooter } from "@/components/public-site-footer";
import type { PublicApiResult, PublicPostListItem, PublicTaxonomy, TaxonomyKind } from "@/lib/public-posts";
import type { PageMeta } from "@/lib/public-posts";
import styles from "@/app/posts/posts.module.css";

type TaxonomyPostResult = PublicApiResult<{ data: PublicPostListItem[]; meta: PageMeta }>;

export function TaxonomyPostPage({
  kind,
  taxonomy,
  result,
  currentPage,
}: {
  kind: TaxonomyKind;
  taxonomy: PublicTaxonomy;
  result: TaxonomyPostResult;
  currentPage: number;
}) {
  const segment = kind === "category" ? "categories" : "tags";
  const label = kind === "category" ? "分类" : "标签";
  const basePath = `/${segment}/${taxonomy.slug}`;

  if (result.status === "ready" && result.data.meta.totalPages > 0 && currentPage > result.data.meta.totalPages) {
    redirect(result.data.meta.totalPages === 1 ? basePath : `${basePath}?page=${result.data.meta.totalPages}`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Link className={styles.backLink} href="/posts"><ArrowLeft aria-hidden="true" />全部文章</Link>
        <header className={`${styles.heading} ${styles.taxonomyHeading}`}>
          <div>
            <p>{kind === "category" ? "CATEGORY" : "TAG"} / {label}</p>
            <h1>{taxonomy.name}<span>。</span></h1>
            {taxonomy.description && <div className={styles.taxonomyDescription}>{taxonomy.description}</div>}
            <div className={styles.rule} aria-hidden="true" />
          </div>
          <p className={styles.postCount}>{taxonomy.postCount} 篇文章</p>
        </header>

        {result.status !== "ready" ? (
          <section className={styles.empty}>
            <RefreshCw aria-hidden="true" />
            <p className={styles.index}>SERVICE / RETRY</p>
            <h2>内容暂时无法加载</h2>
            <p>内容服务当前没有响应，稍后重试即可。</p>
            <Link href={basePath}><RefreshCw aria-hidden="true" />重新加载</Link>
          </section>
        ) : result.data.data.length ? (
          <>
            <ol className={styles.postList}>
              {result.data.data.map((post, index) => (
                <PublicPostRow
                  key={post.id}
                  post={post}
                  index={(currentPage - 1) * result.data.meta.pageSize + index}
                />
              ))}
            </ol>
            <nav className={styles.pagination} aria-label={`${label}文章分页`}>
              {currentPage > 1 ? (
                <Link href={currentPage === 2 ? basePath : `${basePath}?page=${currentPage - 1}`}>
                  <ArrowLeft aria-hidden="true" />上一页
                </Link>
              ) : <span />}
              <p>PAGE {currentPage} / {Math.max(result.data.meta.totalPages, 1)}</p>
              {currentPage < result.data.meta.totalPages ? (
                <Link href={`${basePath}?page=${currentPage + 1}`}>
                  下一页<ArrowRight aria-hidden="true" />
                </Link>
              ) : <span />}
            </nav>
          </>
        ) : (
          <section className={styles.empty}>
            <FileText aria-hidden="true" />
            <p className={styles.index}>CONTENT / EMPTY</p>
            <h2>这里还没有文章</h2>
            <p>文章归入此{label}并发布后，会出现在这里。</p>
            <Link href="/posts"><ArrowLeft aria-hidden="true" />返回全部文章</Link>
          </section>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
